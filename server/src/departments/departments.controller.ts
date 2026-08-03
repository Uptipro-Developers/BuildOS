import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { RequiresProcess } from '../permissions/require-permission.decorator';

@Controller('departments')
export class DepartmentsController {
    constructor(private readonly departmentsService: DepartmentsService) { }

    @Get()
    findAll() {
        return this.departmentsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.departmentsService.findOne(id);
    }

    @Post()
    create(@Body() body: any) {
        return this.departmentsService.create(body);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any) {
        return this.departmentsService.update(id, body);
    }

    @Delete(':id')
    @RequiresProcess('p_departments', 'delete')
    remove(@Param('id') id: string) {
        return this.departmentsService.remove(id);
    }
}
