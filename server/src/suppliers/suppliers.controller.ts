import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ServiceAuth } from '../auth/decorators';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
export class SuppliersController {
    constructor(private readonly suppliersService: SuppliersService) { }

    @Get()
    findAll() {
        return this.suppliersService.findAll();
    }

    // Service-accessible: the SabiQuot supplier portal pushes a profile here on
    // registration/login so it appears in Procurement's supplier list instead of
    // only ever existing on the portal side.
    @Post('sync-from-portal')
    @ServiceAuth()
    syncFromPortal(@Body() body: any) {
        return this.suppliersService.syncFromPortal(body);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.suppliersService.findOne(id);
    }

    @Post()
    create(@Body() body: any) {
        return this.suppliersService.create(body);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any) {
        return this.suppliersService.update(id, body);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.suppliersService.remove(id);
    }
}
