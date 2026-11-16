import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { RequiresProcess } from '../permissions/require-permission.decorator';

@Controller('projects')
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) { }

    @Get()
    findAll(@Query('status') status?: string, @Query('type') type?: string, @Req() req?: any) {
        return this.projectsService.findAll(status, type, this.userId(req));
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Req() req?: any) {
        return this.projectsService.findOne(id, this.userId(req));
    }

    @Post()
    create(@Body() body: any, @Req() req?: any) {
        return this.projectsService.create(body, this.userId(req));
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any, @Req() req?: any) {
        return this.projectsService.update(id, body, this.userId(req));
    }

    @Delete(':id')
    @RequiresProcess('p_projects', 'delete')
    remove(@Param('id') id: string, @Req() req?: any) {
        return this.projectsService.remove(id, this.userId(req));
    }

    private userId(req?: any) { return String(req?.user?.sub ?? req?.user?.id ?? ''); }
}
