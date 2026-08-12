import { Module } from '@nestjs/common';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { GoodsReceiptsModule } from '../goods-receipts/goods-receipts.module';

@Module({
    // GoodsReceiptsModule supplies GoodsReceiptsService, used to open a receipt
    // as soon as an order's payment is confirmed.
    imports: [PrismaModule, IntegrationsModule, GoodsReceiptsModule],
    controllers: [PurchaseOrdersController],
    providers: [PurchaseOrdersService],
})
export class PurchaseOrdersModule { }
