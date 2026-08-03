import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { RequiresProcess } from '../permissions/require-permission.decorator';

@Controller('expenses')
export class ExpensesController {
    constructor(private readonly expensesService: ExpensesService) { }

    @Get()
    findAll(@Query('status') status?: string, @Query('projectId') projectId?: string) {
        return this.expensesService.findAll(status, projectId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.expensesService.findOne(id);
    }

    @Post()
    create(@Body() body: any) {
        return this.expensesService.create(body);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any) {
        return this.expensesService.update(id, body);
    }

    @Delete(':id')
    @RequiresProcess('p_expenses', 'delete')
    remove(@Param('id') id: string) {
        return this.expensesService.remove(id);
    }
}
