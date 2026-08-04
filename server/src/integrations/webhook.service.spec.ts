import { AxiosError } from 'axios';
import { WebhookService } from './webhook.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { WebhookDeliveryQueue } from './webhook-delivery.queue';

/**
 * A webhook row plus spies on the two writes `deliverWebhook` can make, so a
 * test can assert what the endpoint's failure accounting did.
 */
function makeHarness(overrides: Record<string, unknown> = {}) {
    const webhook = {
        id: 'wh-1',
        url: 'https://portal.test/api/buildos-webhook',
        event: '*',
        secret: 'shhh',
        headers: null,
        isActive: true,
        retryCount: 0,
        maxRetries: 5,
        ...overrides,
    };

    // Typed args so `mock.calls[0][0].data` is reachable rather than a 0-tuple.
    type UpdateArgs = { where: { id: string }; data: Record<string, unknown> };
    const update = jest.fn<Promise<typeof webhook>, [UpdateArgs]>(async () => webhook);
    const prisma = {
        webhook: {
            findUnique: jest.fn(async () => webhook),
            update,
        },
        webhookDelivery: { create: jest.fn(async () => ({})) },
    } as unknown as PrismaService;

    const queue = { enqueue: jest.fn(async () => ({ queued: false })) } as unknown as WebhookDeliveryQueue;
    const service = new WebhookService(prisma, queue);
    return { service, update, webhook };
}

/** An axios rejection carrying a response status, as a failed POST produces. */
function httpError(status: number): AxiosError {
    const error = new AxiosError(`Request failed with status code ${status}`);
    error.response = { status } as AxiosError['response'];
    return error;
}

/** Forces `sendWebhookRequest` to fail the way a real delivery would. */
function failWith(service: WebhookService, error: unknown) {
    jest
        .spyOn(service as unknown as { sendWebhookRequest: () => Promise<void> }, 'sendWebhookRequest')
        .mockRejectedValue(error);
}

const FINAL = { attempt: 5, isFinalAttempt: true };

describe('WebhookService delivery failure accounting', () => {
    it('does not spend the endpoint allowance when the receiver rejects one payload', async () => {
        // The exact case that killed the SabiQuot endpoint: a receiver bug
        // rejecting the delivery. The endpoint is fine; the next event may work.
        const { service, update } = makeHarness({ retryCount: 3 });
        failWith(service, httpError(422));

        await expect(
            service.deliverWebhook('wh-1', 'purchase-order.created', {}, FINAL),
        ).rejects.toThrow();

        expect(update).toHaveBeenCalledTimes(1);
        const written = update.mock.calls[0][0].data;
        expect(written).not.toHaveProperty('retryCount');
        expect(written).not.toHaveProperty('isActive');
        expect(written.lastError).toContain('422');
    });

    it.each([400, 409, 422, 429])('treats %i as a payload rejection', async (status) => {
        const { service, update } = makeHarness({ retryCount: 4 });
        failWith(service, httpError(status));

        await expect(service.deliverWebhook('wh-1', 'rfq.sent', {}, FINAL)).rejects.toThrow();
        expect(update.mock.calls[0][0].data).not.toHaveProperty('isActive');
    });

    it.each([401, 403, 404, 405, 410])(
        'counts %i toward deactivation, because the endpoint itself is wrong',
        async (status) => {
            const { service, update } = makeHarness({ retryCount: 4, maxRetries: 5 });
            failWith(service, httpError(status));

            await expect(service.deliverWebhook('wh-1', 'rfq.sent', {}, FINAL)).rejects.toThrow();

            const written = update.mock.calls[0][0].data;
            expect(written.retryCount).toBe(5);
            expect(written.isActive).toBe(false);
        },
    );

    it('still counts a 5xx, which is worth retrying but may mean a dead endpoint', async () => {
        const { service, update } = makeHarness({ retryCount: 1 });
        failWith(service, httpError(503));

        await expect(service.deliverWebhook('wh-1', 'rfq.sent', {}, FINAL)).rejects.toThrow();

        const written = update.mock.calls[0][0].data;
        expect(written.retryCount).toBe(2);
        expect(written.isActive).toBe(true);
    });

    it('counts a transport failure, which carries no response at all', async () => {
        const { service, update } = makeHarness({ retryCount: 0 });
        failWith(service, new Error('connect ECONNREFUSED 127.0.0.1:4000'));

        await expect(service.deliverWebhook('wh-1', 'rfq.sent', {}, FINAL)).rejects.toThrow();
        expect(update.mock.calls[0][0].data.retryCount).toBe(1);
    });

    it('does not touch the endpoint on a non-final attempt', async () => {
        const { service, update } = makeHarness({ retryCount: 0 });
        failWith(service, httpError(503));

        await expect(
            service.deliverWebhook('wh-1', 'rfq.sent', {}, { attempt: 1, isFinalAttempt: false }),
        ).rejects.toThrow();

        expect(update).not.toHaveBeenCalled();
    });

    it('clears the failure state and reactivates on a success', async () => {
        const { service, update } = makeHarness({ retryCount: 4, isActive: false });
        jest
            .spyOn(
                service as unknown as { sendWebhookRequest: () => Promise<void> },
                'sendWebhookRequest',
            )
            .mockResolvedValue(undefined);

        await service.deliverWebhook('wh-1', 'rfq.sent', {}, FINAL);

        expect(update.mock.calls[0][0].data).toEqual({
            retryCount: 0,
            isActive: true,
            lastError: null,
        });
    });
});
