import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { ServiceAuth } from '../auth/decorators';
import { RequiresProcess } from '../permissions/require-permission.decorator';

@Controller('purchase-orders')
export class PurchaseOrdersController {
    constructor(private readonly purchaseOrdersService: PurchaseOrdersService) { }

    /**
     * Deliberately NOT service-accessible: this returns every purchase order for
     * every supplier, so a portal key reading it would expose one supplier's
     * orders to another. The portal fetches by id instead.
     */
    @Get()
    findAll(@Query('status') status?: string, @Query('supplierId') supplierId?: string) {
        return this.purchaseOrdersService.findAll(status, supplierId);
    }

    // Service-accessible: creating a PO emails the supplier a "View on Supplier
    // Portal" link, so the portal has to be able to read the order it is being
    // asked to display. Without this the link landed on a page that could not
    // fetch its own subject.
    @Get(':id')
    @ServiceAuth()
    findOne(@Param('id') id: string) {
        return this.purchaseOrdersService.findOne(id);
    }

    @Post()
    create(@Body() body: any) {
        return this.purchaseOrdersService.create(body);
    }

    // Service-accessible: the portal mirrors a supplier's accept/decline of the
    // order back onto the ERP record — the other half of the flow the emailed
    // link starts.
    @Patch(':id')
    @ServiceAuth()
    update(@Param('id') id: string, @Body() body: any) {
        return this.purchaseOrdersService.update(id, body);
    }

    /**
     * The workflow transitions, each as its own endpoint.
     *
     * These used to be `setState` calls on the Purchase Orders page — the order
     * moved in the browser and nothing was written, so a refresh undid it and
     * Finance never heard about any of it. Making them endpoints is also what
     * lets the server refuse an out-of-order move.
     */
    @Post(':id/send-to-finance')
    @RequiresProcess('p_purchase_orders', 'edit')
    sendToFinance(@Param('id') id: string, @Body() body: any) {
        return this.purchaseOrdersService.sendToFinance(id, body?.actor);
    }

    @Post(':id/request-payment-confirmation')
    @RequiresProcess('p_purchase_orders', 'edit')
    requestPaymentConfirmation(@Param('id') id: string) {
        return this.purchaseOrdersService.requestPaymentConfirmation(id);
    }

    // Service-accessible: the supplier portal confirms the payment landed, which
    // is the half of this step that does not happen inside BuildOS.
    @Post(':id/confirm-payment')
    @ServiceAuth()
    confirmPayment(@Param('id') id: string) {
        return this.purchaseOrdersService.confirmPayment(id);
    }

    /**
     * Cancels the order rather than deleting it.
     *
     * Deleting a purchase order takes its history with it — the quote it was
     * awarded from, the invoice Finance raised against it, the payment. A
     * cancellation leaves the trail intact and is what the workflow needs.
     */
    @Post(':id/cancel')
    @RequiresProcess('p_purchase_orders', 'edit')
    cancel(@Param('id') id: string, @Body() body: any) {
        return this.purchaseOrdersService.cancel(id, body?.reason);
    }

    @Delete(':id')
    @RequiresProcess('p_purchase_orders', 'delete')
    remove(@Param('id') id: string) {
        return this.purchaseOrdersService.remove(id);
    }
}
