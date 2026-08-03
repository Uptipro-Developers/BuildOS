import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { RequiresProcess } from '../permissions/require-permission.decorator';

@Controller('purchase-orders')
export class PurchaseOrdersController {
    constructor(private readonly purchaseOrdersService: PurchaseOrdersService) { }

    @Get()
    findAll(@Query('status') status?: string, @Query('supplierId') supplierId?: string) {
        return this.purchaseOrdersService.findAll(status, supplierId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.purchaseOrdersService.findOne(id);
    }

    @Post()
    create(@Body() body: any) {
        return this.purchaseOrdersService.create(body);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any) {
        return this.purchaseOrdersService.update(id, body);
    }

    @Delete(':id')
    @RequiresProcess('p_purchase_orders', 'delete')
    remove(@Param('id') id: string) {
        return this.purchaseOrdersService.remove(id);
    }
}
