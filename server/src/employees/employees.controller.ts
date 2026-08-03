import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { RequiresProcess } from '../permissions/require-permission.decorator';

@Controller('employees')
export class EmployeesController {
    constructor(private readonly employeesService: EmployeesService) { }

    @Get()
    findAll(@Query('status') status?: string, @Query('departmentId') departmentId?: string) {
        return this.employeesService.findAll(status, departmentId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.employeesService.findOne(id);
    }

    @Post()
    create(@Body() body: any) {
        return this.employeesService.create(body);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any) {
        return this.employeesService.update(id, body);
    }

    @Delete(':id')
    @RequiresProcess('p_employees', 'delete')
    remove(@Param('id') id: string) {
        return this.employeesService.remove(id);
    }
}
