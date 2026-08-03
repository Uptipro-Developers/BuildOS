import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { RequiresProcess } from '../permissions/require-permission.decorator';

@Controller('budgets')
export class BudgetsController {
    constructor(private readonly budgetsService: BudgetsService) { }

    @Get()
    findAll(@Query('status') status?: string, @Query('scope') scope?: string) {
        return this.budgetsService.findAll(status, scope);
    }

    @Get('breakdown')
    breakdown(@Query('projectId') projectId?: string) {
        return this.budgetsService.breakdown(projectId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.budgetsService.findOne(id);
    }

    @Post()
    create(@Body() body: any) {
        return this.budgetsService.create(body);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any) {
        return this.budgetsService.update(id, body);
    }

    @Delete(':id')
    @RequiresProcess('p_budgets', 'delete')
    remove(@Param('id') id: string) {
        return this.budgetsService.remove(id);
    }
}
