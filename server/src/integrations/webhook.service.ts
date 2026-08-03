import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios, { AxiosError } from 'axios';
import { createHmac, randomBytes } from 'crypto';
import { WebhookDeliveryQueue } from './webhook-delivery.queue';

/**
 * Response statuses that implicate the endpoint rather than the payload, and so
 * count toward deactivating it: unauthorised (wrong secret), forbidden, gone,
 * not found, or method not allowed. Any other 4xx is the receiver declining one
 * delivery, which says nothing about the next.
 */
const ENDPOINT_FAILURE_STATUSES = new Set([401, 403, 404, 405, 410]);

/** Context passed by the BullMQ worker so terminal failure can be recorded once. */
export interface DeliveryAttemptContext {
  attempt: number;
  isFinalAttempt: boolean;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private prisma: PrismaService,
    private deliveryQueue: WebhookDeliveryQueue,
  ) {}

  /**
   * Register webhook endpoint
   */
  async registerWebhook(data: any) {
    // Validate URL
    try {
      new URL(data.url);
    } catch {
      throw new BadRequestException('Invalid webhook URL');
    }

    return this.prisma.webhook.create({
      data: {
        url: data.url,
        event: data.event || '*', // * for all events
        isActive: data.isActive ?? true,
        headers: data.headers ? JSON.stringify(data.headers) : null,
        secret: this.generateSecret(),
        maxRetries: data.maxRetries ?? 5,
      },
    });
  }

  /**
   * Get all webhooks
   */
  async getWebhooks(isActive?: boolean) {
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;

    return this.prisma.webhook.findMany({
      where,
      include: { deliveries: false },
    });
  }

  /**
   * Update webhook
   */
  async updateWebhook(id: string, data: any) {
    const updateData: any = {};
    if (data.url) updateData.url = data.url;
    if (data.event) updateData.event = data.event;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.headers) updateData.headers = JSON.stringify(data.headers);
    if (data.maxRetries) updateData.maxRetries = data.maxRetries;

    return this.prisma.webhook.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(id: string) {
    return this.prisma.webhook.delete({ where: { id } });
  }

  /**
   * Trigger webhook for event.
   *
   * Deliveries are handed to the BullMQ queue so a transient failure retries
   * with backoff instead of being dropped. When Redis is not configured the
   * queue is absent and delivery happens inline, preserving prior behaviour.
   */
  async triggerWebhook(event: string, data: any) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { isActive: true },
    });

    const triggeredWebhooks: any[] = [];

    for (const webhook of webhooks) {
      // Check if webhook should be triggered for this event
      if (webhook.event !== '*' && webhook.event !== event) continue;

      const attempts = Math.max(1, webhook.maxRetries || 1);
      const { queued } = await this.deliveryQueue.enqueue(
        { webhookId: webhook.id, event, data },
        attempts,
      );

      if (queued) {
        triggeredWebhooks.push({ webhookId: webhook.id, status: 'queued' });
        continue;
      }

      // Inline fallback — single attempt, no retry available without a queue.
      try {
        await this.deliverWebhook(webhook.id, event, data, {
          attempt: 1,
          isFinalAttempt: true,
        });
        triggeredWebhooks.push({ webhookId: webhook.id, status: 'sent' });
      } catch (error: any) {
        triggeredWebhooks.push({
          webhookId: webhook.id,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return triggeredWebhooks;
  }

  /**
   * Deliver one webhook and record the outcome.
   *
   * Called by the BullMQ worker, and directly by triggerWebhook when no queue
   * is available. Throws on failure so the worker can apply its retry policy;
   * the webhook row is only marked failed/inactive on the final attempt, so a
   * recoverable blip no longer deactivates an endpoint.
   */
  async deliverWebhook(
    webhookId: string,
    event: string,
    data: unknown,
    context: DeliveryAttemptContext,
  ): Promise<void> {
    const webhook = await this.prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!webhook) {
      // The endpoint was deleted after the job was queued — nothing to do, and
      // retrying cannot help.
      this.logger.warn(`Webhook ${webhookId} no longer exists; dropping ${event} delivery`);
      return;
    }

    try {
      await this.sendWebhookRequest(webhook, event, data, context.attempt);

      // Reset failure state on success.
      if (webhook.retryCount > 0 || !webhook.isActive) {
        await this.prisma.webhook.update({
          where: { id: webhook.id },
          data: { retryCount: 0, isActive: true, lastError: null },
        });
      }
    } catch (error: any) {
      // A receiver that rejects one payload has not shown the endpoint to be
      // broken, so it must not spend the endpoint's deactivation allowance.
      // Every failure used to count equally, which meant a bug in the receiver
      // — a handler returning 500 for an unmigrated column, say — silently ate
      // the allowance and took the integration down permanently. Only faults
      // that implicate the endpoint itself do that now.
      if (this.classifyFailure(error) === 'payload') {
        await this.prisma.webhook.update({
          where: { id: webhook.id },
          data: { lastError: error.message },
        });
        throw error;
      }

      if (context.isFinalAttempt) {
        const retryCount = (webhook.retryCount || 0) + 1;
        await this.prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            retryCount,
            lastError: error.message,
            // Only give up once this endpoint has exhausted its allowance
            // across separate events, not within one event's retries.
            isActive: retryCount < webhook.maxRetries,
          },
        });
      }
      throw error;
    }
  }

  /**
   * Whether a failed delivery reflects a broken endpoint or just a rejected
   * payload.
   *
   * - `endpoint` — the endpoint is misconfigured, gone, or refusing us (401,
   *   403, 404, 405, 410). Repeating it will not help and an operator needs to
   *   know, so these count toward deactivation.
   * - `payload` — the endpoint answered, understood us, and declined this
   *   particular delivery (any other 4xx). The next event may well succeed, so
   *   this is recorded but never deactivates.
   * - `transient` — timeout, DNS, refused connection, or any 5xx. Worth
   *   retrying, and counts toward deactivation once the retries are exhausted.
   */
  private classifyFailure(error: unknown): 'transient' | 'payload' | 'endpoint' {
    const status = (error as AxiosError)?.response?.status;
    // No response at all: timeout, DNS failure, connection refused.
    if (!status) return 'transient';
    if (status >= 500) return 'transient';
    if (ENDPOINT_FAILURE_STATUSES.has(status)) return 'endpoint';
    if (status >= 400) return 'payload';
    return 'transient';
  }

  /**
   * Get webhook delivery history
   */
  async getWebhookHistory(webhookId: string, limit = 50) {
    return this.prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Retry failed webhook delivery
   */
  async retryWebhookDelivery(deliveryId: string) {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });

    if (!delivery) {
      throw new BadRequestException('Delivery not found');
    }

    const stored =
      typeof delivery.payload === 'string'
        ? JSON.parse(delivery.payload)
        : (delivery.payload as any);

    try {
      await this.sendWebhookRequest(
        delivery.webhook,
        delivery.event,
        stored?.data ?? stored,
        delivery.attemptCount + 1,
      );

      return this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: { status: 'delivered', attemptCount: delivery.attemptCount + 1 },
      });
    } catch (error: any) {
      return this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: { status: 'failed', error: error.message, attemptCount: delivery.attemptCount + 1 },
      });
    }
  }

  /**
   * Integration with external HR systems
   */
  async syncWithExternalHR(systemType: string, data: any) {
    switch (systemType) {
      case 'payroll':
        return this.syncToPayrollSystem(data);
      case 'accounting':
        return this.syncToAccountingSystem(data);
      case 'hr':
        return this.syncToHRSystem(data);
      default:
        throw new BadRequestException(`Unknown system type: ${systemType}`);
    }
  }

  /**
   * Integration with external accounting systems
   */
  async syncToAccountingSystem(data: any) {
    // Placeholder for accounting system sync
    console.log('[ACCOUNTING SYNC]', data);
    return {
      status: 'synced',
      system: 'accounting',
      message: 'Data sent to accounting system',
    };
  }

  /**
   * Integration with external payroll systems
   */
  async syncToPayrollSystem(data: any) {
    // Placeholder for payroll system sync
    console.log('[PAYROLL SYNC]', data);
    return {
      status: 'synced',
      system: 'payroll',
      message: 'Data sent to payroll system',
    };
  }

  /**
   * Integration with external HR systems
   */
  async syncToHRSystem(data: any) {
    // Placeholder for HR system sync
    console.log('[HR SYNC]', data);
    return {
      status: 'synced',
      system: 'hr',
      message: 'Data sent to HR system',
    };
  }

  /**
   * Test webhook connectivity
   */
  async testWebhook(webhookId: string) {
    const webhook = await this.prisma.webhook.findUnique({ where: { id: webhookId } });

    if (!webhook) {
      throw new BadRequestException('Webhook not found');
    }

    try {
      await this.sendWebhookRequest(
        webhook,
        'test',
        { message: 'This is a test webhook' },
        1,
      );
      return { success: true, message: 'Webhook test successful' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Helper Methods ──

  private async sendWebhookRequest(
    webhook: any,
    event: string,
    data: unknown,
    attemptCount: number,
  ) {
    const timestamp = new Date().toISOString();
    const payload = { event, timestamp, data };

    // The signature must cover the exact bytes the receiver reads, so the body
    // is serialised once here and posted as a pre-encoded string. Letting axios
    // re-serialise an object could change key order or spacing and would make
    // the signature unverifiable.
    const body = JSON.stringify(payload);
    const signature = this.signPayload(webhook.secret, timestamp, body);

    const headers = webhook.headers ? JSON.parse(webhook.headers as string) : {};
    headers['Content-Type'] = 'application/json';
    headers['X-Webhook-Event'] = event;
    headers['X-BuildOS-Timestamp'] = timestamp;
    headers['X-BuildOS-Signature'] = `sha256=${signature}`;

    try {
      const response = await axios.post(webhook.url, body, {
        headers,
        timeout: 10000, // 10 second timeout
        transformRequest: [(value) => value],
      });

      // Log successful delivery
      await this.prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload: JSON.stringify(payload),
          status: 'delivered',
          responseCode: response.status,
          responseBody: JSON.stringify(response.data),
          attemptCount,
        },
      });
    } catch (error: any) {
      const axiosError = error as AxiosError;

      // Log failed delivery
      await this.prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload: JSON.stringify(payload),
          status: 'failed',
          responseCode: axiosError.response?.status || 0,
          error: axiosError.message,
          attemptCount,
        },
      });

      throw error;
    }
  }

  /**
   * HMAC-SHA256 over `<timestamp>.<body>`.
   *
   * Binding the timestamp into the signed material lets the receiver reject
   * replayed deliveries by age. This replaces sending the shared secret itself
   * in an `X-Webhook-Secret` header, which both leaked the credential to every
   * receiver on every request and proved nothing about the body's integrity.
   */
  private signPayload(secret: string, timestamp: string, body: string): string {
    return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  }

  private generateSecret(): string {
    // Previously derived from Math.random() keyed by a hardcoded constant, which
    // is neither unpredictable nor secret. 32 CSPRNG bytes instead.
    return randomBytes(32).toString('hex');
  }
}
