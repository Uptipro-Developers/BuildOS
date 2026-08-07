import { Global, Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationDispatchService } from './notification-dispatch.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Global so any module can dispatch an event without importing this one, the
 * same way the email and queue infrastructure is shared.
 */
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationDispatchService],
  exports: [NotificationService, NotificationDispatchService],
})
export class NotificationsModule {}
