import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { GoodsReceiptsService } from './goods-receipts.service';
import { RequiresProcess } from '../permissions/require-permission.decorator';

@Controller('goods-receipts')
export class GoodsReceiptsController {
    constructor(private readonly goodsReceipts: GoodsReceiptsService) { }

    @Get()
    findAll(@Query('status') status?: string) {
        return this.goodsReceipts.findAll(status);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.goodsReceipts.findOne(id);
    }

    /**
     * Opens a receipt against an order by hand.
     *
     * Confirming an order opens one automatically; this exists for the orders
     * that were already confirmed before receipts were stored at all.
     */
    @Post()
    @RequiresProcess('p_goods_receipt', 'create')
    open(@Body() body: any) {
        return this.goodsReceipts.openForOrder(body?.purchaseOrderId);
    }

    @Post(':id/receive')
    @RequiresProcess('p_goods_receipt', 'edit')
    receive(@Param('id') id: string, @Body() body: any) {
        return this.goodsReceipts.receive(id, body ?? {});
    }

    @Post(':id/reject')
    @RequiresProcess('p_goods_receipt', 'edit')
    reject(@Param('id') id: string, @Body() body: any) {
        return this.goodsReceipts.reject(id, body?.reason);
    }
}
