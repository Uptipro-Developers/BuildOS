import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { DocumentFilesService } from './document-files.service';
import { RequiresProcess } from '../permissions/require-permission.decorator';

@Controller('document-files')
export class DocumentFilesController {
    constructor(private readonly service: DocumentFilesService) { }

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
    @RequiresProcess('p_documents', 'delete')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
