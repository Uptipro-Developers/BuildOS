import { NotificationDispatchService } from './notification-dispatch.service';

describe('NotificationDispatchService email routing', () => {
    const makeService = (composed: any) => {
        const prisma: any = {
            systemSetting: { findUnique: jest.fn().mockResolvedValue({ value: { notificationRules: [] } }) },
            notification: { createMany: jest.fn() },
        };
        const mailQueue = { enqueueEmail: jest.fn().mockResolvedValue({ queued: false }) };
        const templates = { compose: jest.fn().mockResolvedValue(composed) };
        const hrSetup = { read: jest.fn().mockResolvedValue(null) };
        return {
            service: new NotificationDispatchService(prisma, mailQueue as any, templates as any, hrSetup as any),
            mailQueue,
            templates,
        };
    };

    it('sends to recipients configured in Email Configuration without a notification rule', async () => {
        const { service, mailQueue, templates } = makeService({
            to: ['buyer@example.com'], subject: 'New PR', text: 'Review it', html: '<p>Review it</p>', cc: [], hasLink: false,
        });

        await service.dispatch('purchase-request.created', {
            title: 'Purchase request raised',
            message: 'PR-1',
            vars: { reference: 'PR-1' },
        });

        expect(templates.compose).toHaveBeenCalledWith(
            'Purchase Request Submitted',
            expect.objectContaining({ reference: 'PR-1' }),
        );
        expect(mailQueue.enqueueEmail).toHaveBeenCalledWith(
            expect.objectContaining({ to: ['buyer@example.com'], subject: 'New PR' }),
        );
    });

    it('allows a domain workflow to suppress generic email while retaining dispatch', async () => {
        const { service, mailQueue, templates } = makeService({
            to: ['configured@example.com'], subject: 'Generic', text: 'Generic', html: '', cc: [], hasLink: false,
        });

        await service.dispatch('leave-request.submitted', {
            title: 'Leave request submitted',
            message: 'LR-1',
            suppressEmail: true,
        });

        expect(templates.compose).not.toHaveBeenCalled();
        expect(mailQueue.enqueueEmail).not.toHaveBeenCalled();
    });
});
