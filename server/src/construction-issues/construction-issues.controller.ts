import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ConstructionIssuesService } from './construction-issues.service';
import { RequiresProcess } from '../permissions/require-permission.decorator';

@Controller('construction-issues')
export class ConstructionIssuesController {
    constructor(private readonly service: ConstructionIssuesService) { }

    @Get()
    findAll(@Query('projectId') projectId?: string) {
        return this.service.findAll(projectId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Post()
    create(@Body() body: any) {
        return this.service.create(body);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any) {
        return this.service.update(id, body);
    }

    @Delete(':id')
    @RequiresProcess('p_site_issues', 'delete')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
