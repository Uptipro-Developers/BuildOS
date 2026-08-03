import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Roles, Public } from '../auth/decorators';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @Roles('admin', 'project-manager', 'team-lead', 'employee')
  async getAll(
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const result = await this.tasksService.findAll(
      status,
      projectId,
      assignedTo,
      limit ? parseInt(limit, 10) : 50,
      skip ? parseInt(skip, 10) : 0,
    );
    return { success: true, ...result };
  }

  @Get('overdue')
  @Roles('admin', 'project-manager')
  async getOverdue() {
    const tasks = await this.tasksService.getOverdueTasks();
    return { success: true, data: tasks };
  }

  @Get('project/:projectId')
  @Roles('admin', 'project-manager', 'team-lead')
  async getByProject(@Param('projectId') projectId: string) {
    const tasks = await this.tasksService.getTasksByProject(projectId);
    return { success: true, data: tasks };
  }

  @Get('assignee/:assigneeId')
  @Roles('admin', 'project-manager', 'team-lead', 'employee')
  async getByAssignee(@Param('assigneeId') assigneeId: string) {
    const tasks = await this.tasksService.getTasksByAssignee(assigneeId);
    return { success: true, data: tasks };
  }

  @Get(':id')
  @Roles('admin', 'project-manager', 'team-lead', 'employee')
  async getOne(@Param('id') id: string) {
    const task = await this.tasksService.findOne(id);
    return { success: true, data: task };
  }

  @Post()
  @Roles('admin', 'project-manager', 'team-lead', 'employee')
  async create(@Body() createTaskDto: any) {
    const task = await this.tasksService.create(createTaskDto);
    return { success: true, data: task, message: 'Task created successfully' };
  }

  @Put(':id')
  @Roles('admin', 'project-manager', 'team-lead', 'employee')
  async update(@Param('id') id: string, @Body() updateTaskDto: any) {
    const task = await this.tasksService.update(id, updateTaskDto);
    return { success: true, data: task, message: 'Task updated successfully' };
  }

  @Patch(':id/status')
  @Roles('admin', 'project-manager', 'team-lead', 'employee')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    const task = await this.tasksService.updateStatus(id, status);
    return { success: true, data: task, message: 'Task status updated' };
  }

  @Delete(':id')
  @Roles('admin', 'project-manager', 'team-lead', 'employee')
  async remove(@Param('id') id: string) {
    const task = await this.tasksService.remove(id);
    return { success: true, data: task, message: 'Task deleted successfully' };
  }
}
