import {
    Controller, Get, Post, Patch, Delete, Param, Body, Query,
} from '@nestjs/common';
import { AccrualsService } from './accruals.service';

@Controller()
export class AccrualsController {
    constructor(private readonly svc: AccrualsService) { }

    // ── Accrual type configuration ──
    // Declared before 'accruals/:id' so "types" is not captured as an id.
    @Get('accruals/types')
    getTypes() { return this.svc.findTypes(); }

    @Post('accruals/types')
    createType(@Body() body: any) { return this.svc.createType(body); }

    @Patch('accruals/types/:id')
    updateType(@Param('id') id: string, @Body() body: any) { return this.svc.updateType(id, body); }

    @Delete('accruals/types/:id')
    removeType(@Param('id') id: string) { return this.svc.removeType(id); }

    // ── Accruals ──
    @Get('accruals')
    getAll(
        @Query('status') status?: string,
        @Query('fiscalYearId') fiscalYearId?: string,
    ) { return this.svc.findAll(status, fiscalYearId); }

    @Get('accruals/:id')
    getOne(@Param('id') id: string) { return this.svc.findOne(id); }

    @Post('accruals')
    create(@Body() body: any) { return this.svc.create(body); }

    @Patch('accruals/:id')
    update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }

    @Delete('accruals/:id')
    remove(@Param('id') id: string) { return this.svc.remove(id); }

    @Post('accruals/:id/reverse')
    reverse(
        @Param('id') id: string,
        @Body() body: { amount?: number; reversedAt?: string },
    ) { return this.svc.reverse(id, body?.amount, body?.reversedAt); }

    @Post('accruals/:id/approve')
    approve(
        @Param('id') id: string,
        @Body() body: { actedBy?: string; comment?: string },
    ) { return this.svc.decide(id, 'approved', body?.actedBy, body?.comment); }

    @Post('accruals/:id/reject')
    reject(
        @Param('id') id: string,
        @Body() body: { actedBy?: string; comment?: string },
    ) { return this.svc.decide(id, 'rejected', body?.actedBy, body?.comment); }
}
