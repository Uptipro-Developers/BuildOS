import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { WEBHOOK_JOB_DELIVER, WEBHOOK_QUEUE } from '../queue/queue.constants';

export interface WebhookDeliveryJob {
    webhookId: string;
    event: string;
    data: unknown;
}

/**
 * Producer for outbound webhook delivery.
 *
 * Mirrors MailQueueService: when BullMQ (Redis) is available deliveries are
 * enqueued with retry/backoff, and when it is not the queue provider is absent
 * so WebhookService falls back to delivering inline.
 *
 * This exists because webhook delivery was previously fire-and-forget — the
 * only call sites do `triggerWebhook(...).catch(() => {})`, so a supplier-facing
 * RFQ notification that failed on a transient network blip was lost silently,
 * and five such blips deactivated the webhook permanently.
 */
@Injectable()
export class WebhookDeliveryQueue {
    private readonly logger = new Logger(WebhookDeliveryQueue.name);

    constructor(@Optional() @InjectQueue(WEBHOOK_QUEUE) private readonly queue?: Queue) {}

    get isEnabled(): boolean {
        return Boolean(this.queue);
    }

    /**
     * Enqueue one delivery. `attempts` comes from the webhook's own maxRetries
     * so per-endpoint tolerance is respected by the worker.
     */
    async enqueue(job: WebhookDeliveryJob, attempts: number): Promise<{ queued: boolean }> {
        if (!this.queue) return { queued: false };

        try {
            await this.queue.add(WEBHOOK_JOB_DELIVER, job, {
                attempts: Math.max(1, attempts),
                backoff: { type: 'exponential', delay: 10_000 },
                removeOnComplete: 100,
                removeOnFail: 500,
            });
            return { queued: true };
        } catch (error) {
            this.logger.warn(
                `Failed to enqueue webhook ${job.webhookId} (${job.event}), delivering inline: ${
                    (error as Error).message
                }`,
            );
            return { queued: false };
        }
    }
}
