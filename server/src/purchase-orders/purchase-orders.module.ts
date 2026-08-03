import { Module } from '@nestjs/common';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { QueueModule } from '../queue/queue.module';

@Module({
    imports: [PrismaModule, IntegrationsModule, QueueModule],
    controllers: [PurchaseOrdersController],
    providers: [PurchaseOrdersService],
})
export class PurchaseOrdersModule { }
