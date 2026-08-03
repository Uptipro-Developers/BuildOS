import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { IncomeService } from './income.service';
import { RequiresProcess } from '../permissions/require-permission.decorator';

@Controller('income')
export class IncomeController {
    constructor(private readonly incomeService: IncomeService) { }

    @Get()
    findAll(@Query('status') status?: string, @Query('projectId') projectId?: string) {
        return this.incomeService.findAll(status, projectId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.incomeService.findOne(id);
    }

    @Post()
    create(@Body() body: any) {
        return this.incomeService.create(body);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any) {
        return this.incomeService.update(id, body);
    }

    @Delete(':id')
    @RequiresProcess('p_income', 'delete')
    remove(@Param('id') id: string) {
        return this.incomeService.remove(id);
    }
}
