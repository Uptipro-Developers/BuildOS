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

    @Delete(':id')
    @RequiresProcess('p_purchase_orders', 'delete')
    remove(@Param('id') id: string) {
        return this.purchaseOrdersService.remove(id);
    }
}
