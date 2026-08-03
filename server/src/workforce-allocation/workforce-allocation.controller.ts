import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { WorkforceAllocationService } from './workforce-allocation.service';
import { RequiresProcess } from '../permissions/require-permission.decorator';

@Controller()
export class WorkforceAllocationController {
    constructor(private readonly svc: WorkforceAllocationService) { }

    @Get('workforce-allocation')
    getAll(
        @Query('employeeId') employeeId?: string,
        @Query('projectId') projectId?: string,
    ) { return this.svc.findAll(employeeId, projectId); }

    @Get('workforce-allocation/:id')
    getOne(@Param('id') id: string) { return this.svc.findOne(id); }

    @Post('workforce-allocation')
    create(@Body() body: any) { return this.svc.create(body); }

    @Put('workforce-allocation/:id')
    update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }

    @Delete('workforce-allocation/:id')
    @RequiresProcess('p_workforce_allocation', 'delete')
    remove(@Param('id') id: string) { return this.svc.remove(id); }
}
