import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WebhookDeliveryQueue } from './webhook-delivery.queue';
import { WebhookProcessor } from './webhook.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { WEBHOOK_QUEUE } from '../queue/queue.constants';
import { isRedisEnabled } from '../redis/redis.config';

// BullModule.forRoot is registered globally by QueueModule; only the named
// queue and its worker are conditional here, matching that module's pattern so
// the app still boots (delivering inline) without Redis.
const redisEnabled = isRedisEnabled();

@Module({
  imports: [
    PrismaModule,
    ...(redisEnabled ? [BullModule.registerQueue({ name: WEBHOOK_QUEUE })] : []),
  ],
  controllers: [WebhookController],
  providers: [
    WebhookService,
    WebhookDeliveryQueue,
    ...(redisEnabled ? [WebhookProcessor] : []),
  ],
  exports: [WebhookService],
})
export class IntegrationsModule {}
