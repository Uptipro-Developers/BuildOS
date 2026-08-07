import { Module } from '@nestjs/common';
import { GoodsReceiptsController } from './goods-receipts.controller';
import { GoodsReceiptsService } from './goods-receipts.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [GoodsReceiptsController],
    providers: [GoodsReceiptsService],
    // Exported so PurchaseOrdersModule can open a receipt the moment an order is
    // confirmed, rather than waiting for someone to remember to raise one.
    exports: [GoodsReceiptsService],
})
export class GoodsReceiptsModule { }
