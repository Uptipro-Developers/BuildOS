import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { DelaysService } from './delays.service';
import { RequiresProcess } from '../permissions/require-permission.decorator';

@Controller('delays')
export class DelaysController {
    constructor(private readonly service: DelaysService) { }

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
    @RequiresProcess('p_delays', 'delete')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
