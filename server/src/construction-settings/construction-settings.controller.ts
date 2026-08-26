import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ConstructionSettingsService } from './construction-settings.service';

@Controller('construction-settings')
export class ConstructionSettingsController {
    constructor(private readonly service: ConstructionSettingsService) { }

    // Registered before ':id' so 'project-sectors' isn't swallowed by that route.
    @Get('project-sectors')
    findProjectSectors() {
        return this.service.findProjectSectors();
    }
    @Post('project-sectors')
    createProjectSector(@Body() body: any) {
        return this.service.createProjectSector(body);
    }
    @Delete('project-sectors/:id')
    removeProjectSector(@Param('id') id: string) {
        return this.service.removeProjectSector(id);
    }
    @Post('project-sectors/:sectorId/categories')
    createProjectCategory(@Param('sectorId') sectorId: string, @Body() body: any) {
        return this.service.createProjectCategory(sectorId, body);
    }
    @Delete('project-categories/:id')
    removeProjectCategory(@Param('id') id: string) {
        return this.service.removeProjectCategory(id);
    }
    @Patch('project-categories/:id')
    updateProjectCategory(@Param('id') id: string, @Body() body: any) {
        return this.service.updateProjectCategory(id, body);
    }

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
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
