import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ProjectBoqService } from './project-boq.service';
@Controller('project-boq')
export class ProjectBoqController {
  constructor(private service: ProjectBoqService) {}
  @Get() list(@Query('projectId') projectId: string) { return this.service.list(projectId); }
  @Post('levels') createLevel(@Body() body: any) { return this.service.createLevel(body); }
  @Patch('levels/:id') updateLevel(@Param('id') id: string, @Body() body: any) { return this.service.updateLevel(id, body); }
  @Delete('levels/:id') deleteLevel(@Param('id') id: string) { return this.service.deleteLevel(id); }
  @Post('levels/:id/items') createItem(@Param('id') id: string, @Body() body: any) { return this.service.createItem(id, body); }
  @Patch('items/:id') updateItem(@Param('id') id: string, @Body() body: any) { return this.service.updateItem(id, body); }
  @Delete('items/:id') deleteItem(@Param('id') id: string) { return this.service.deleteItem(id); }
}
