import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { GoodsReceiptsService } from './goods-receipts.service';
import { RequiresProcess } from '../permissions/require-permission.decorator';

@Controller('goods-receipts')
export class GoodsReceiptsController {
    constructor(private readonly goodsReceipts: GoodsReceiptsService) { }

    private identity(req: Request) {
        const user = req.user as any;
        if (!user?.sub && !user?.id) return undefined;
        return {
            userId: String(user?.sub ?? user?.id ?? ''),
            name: user?.name,
            email: user?.email,
            role: user?.role,
        };
    }

    @Get()
    findAll(@Query('status') status: string | undefined, @Req() req: Request) {
        return this.goodsReceipts.findAll(status, this.identity(req));
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Req() req: Request) {
        return this.goodsReceipts.findOne(id, this.identity(req));
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

    // Update Record / Edit Record / Record Remaining Delivery all post here —
    // it only ever writes a draft, so the same endpoint serves all three.
    @Post(':id/update-record')
    @RequiresProcess('p_goods_receipt', 'edit')
    updateRecord(@Param('id') id: string, @Body() body: any) {
        return this.goodsReceipts.updateRecord(id, body ?? {});
    }

    // Accept & Update Stock — gated inside the service to the Goods Receipt
    // workflow's configured approver.
    @Post(':id/accept')
    @RequiresProcess('p_goods_receipt', 'approve')
    accept(@Param('id') id: string, @Req() req: Request) {
        return this.goodsReceipts.accept(id, this.identity(req));
    }

    @Post(':id/raise-rejection-note')
    @RequiresProcess('p_goods_receipt', 'approve')
    raiseRejectionNote(@Param('id') id: string, @Body() body: any, @Req() req: Request) {
        return this.goodsReceipts.raiseRejectionNote(id, body?.reason, this.identity(req));
    }

    @Post(':id/reject')
    @RequiresProcess('p_goods_receipt', 'edit')
    reject(@Param('id') id: string, @Body() body: any) {
        return this.goodsReceipts.reject(id, body?.reason);
    }

    @Post(':id/send-to-finance')
    @RequiresProcess('p_goods_receipt', 'edit')
    sendToFinance(@Param('id') id: string) {
        return this.goodsReceipts.sendToFinance(id);
    }

    @Post(':id/notify-supplier')
    @RequiresProcess('p_goods_receipt', 'edit')
    notifySupplier(@Param('id') id: string, @Body() body: any) {
        return this.goodsReceipts.notifySupplier(id, body ?? {});
    }
}
