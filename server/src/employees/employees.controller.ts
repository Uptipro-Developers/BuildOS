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

    /**
     * Probation, notice period and retirement dates for this employee, worked
     * out from the policy configured in HR › General Setup.
     */
    @Get(':id/employment-terms')
    employmentTerms(@Param('id') id: string) {
        return this.employeesService.employmentTerms(id);
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

    @Get(':id/documents')
    documents(@Param('id') id: string) { return this.employeesService.listDocuments(id); }

    @Post(':id/documents')
    addDocument(@Param('id') id: string, @Body() body: any) { return this.employeesService.addDocument(id, body); }

    @Patch(':id/documents/:documentId')
    updateDocument(
        @Param('id') id: string,
        @Param('documentId') documentId: string,
        @Body() body: any,
    ) {
        return this.employeesService.updateDocument(id, documentId, body);
    }

    @Delete(':id/documents/:documentId')
    deleteDocument(@Param('id') id: string, @Param('documentId') documentId: string) {
        return this.employeesService.deleteDocument(id, documentId);
    }
}
