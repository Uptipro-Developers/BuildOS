import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ResourcePlanningService } from './resource-planning.service';
import { RequiresProcess } from '../permissions/require-permission.decorator';

@Controller()
export class ResourcePlanningController {
    constructor(private readonly svc: ResourcePlanningService) { }

    @Get('resource-planning')
    getAll(@Query('projectId') projectId?: string) { return this.svc.findAll(projectId); }

    @Get('resource-planning/:id')
    getOne(@Param('id') id: string) { return this.svc.findOne(id); }

    @Post('resource-planning')
    create(@Body() body: any) { return this.svc.create(body); }

    @Put('resource-planning/:id')
    update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }

    @Delete('resource-planning/:id')
    @RequiresProcess('p_resources', 'delete')
    remove(@Param('id') id: string) { return this.svc.remove(id); }
}
