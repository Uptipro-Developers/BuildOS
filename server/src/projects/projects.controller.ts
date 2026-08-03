import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { RequiresProcess } from '../permissions/require-permission.decorator';

@Controller('projects')
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) { }

    @Get()
    findAll(@Query('status') status?: string, @Query('type') type?: string) {
        return this.projectsService.findAll(status, type);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.projectsService.findOne(id);
    }

    @Post()
    create(@Body() body: any) {
        return this.projectsService.create(body);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any) {
        return this.projectsService.update(id, body);
    }

    @Delete(':id')
    @RequiresProcess('p_projects', 'delete')
    remove(@Param('id') id: string) {
        return this.projectsService.remove(id);
    }
}
