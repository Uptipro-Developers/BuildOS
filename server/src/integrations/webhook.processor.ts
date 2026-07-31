import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { WEBHOOK_QUEUE } from '../queue/queue.constants';
import { WebhookService } from './webhook.service';
import type { WebhookDeliveryJob } from './webhook-delivery.queue';

/**
 * BullMQ worker that delivers queued webhooks. Only registered when Redis is
 * configured (see IntegrationsModule). Failures are rethrown so BullMQ applies
 * the configured retry/backoff policy.
 */
@Processor(WEBHOOK_QUEUE)
export class WebhookProcessor extends WorkerHost {
    private readonly logger = new Logger(WebhookProcessor.name);

    constructor(private readonly webhookService: WebhookService) {
        super();
    }

    async process(job: Job<WebhookDeliveryJob>): Promise<void> {
        const { webhookId, event, data } = job.data;

        // attemptsMade counts *completed* attempts, so the run starting now is
        // attemptsMade + 1. Knowing whether this is the last attempt lets the
        // service decide when to record terminal failure on the webhook row.
        const attempt = job.attemptsMade + 1;
        const maxAttempts = job.opts.attempts ?? 1;

        this.logger.log(
            `Delivering webhook ${webhookId} (${event}) — attempt ${attempt}/${maxAttempts}`,
        );

        await this.webhookService.deliverWebhook(webhookId, event, data, {
            attempt,
            isFinalAttempt: attempt >= maxAttempts,
        });
    }
}
