import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators';
import { ResourceAllocationService } from './resource-allocation.service';
import { RequiresProcess } from '../permissions/require-permission.decorator';

@Controller('resource-allocations')
export class ResourceAllocationController {
  constructor(private resourceAllocationService: ResourceAllocationService) {}

  // ── CRUD Operations ──
  @Post()
  @RequiresProcess('p_resources', 'create')
  @Roles('admin', 'project-manager', 'resource-manager')
  async create(@Body() createDto: any) {
    const allocation = await this.resourceAllocationService.create(createDto);
    return { success: true, data: allocation, message: 'Resource allocated' };
  }

  @Get()
  @Roles('admin', 'project-manager', 'resource-manager')
  async findAll(
    @Query('projectId') projectId?: string,
    @Query('workerId') workerId?: string,
    @Query('status') status?: string,
  ) {
    const allocations = await this.resourceAllocationService.findAll({
      projectId,
      workerId,
      status,
    });
    return { success: true, data: allocations };
  }

  @Get(':id')
  @Roles('admin', 'project-manager', 'resource-manager')
  async findOne(@Param('id') id: string) {
    const allocation = await this.resourceAllocationService.findOne(id);
    return { success: true, data: allocation };
  }

  @Put(':id')
  @RequiresProcess('p_resources', 'edit')
  @Roles('admin', 'project-manager', 'resource-manager')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    const allocation = await this.resourceAllocationService.update(id, updateDto);
    return { success: true, data: allocation, message: 'Allocation updated' };
  }

  @Delete(':id')
  @RequiresProcess('p_resources', 'delete')
  @Roles('admin', 'project-manager', 'resource-manager')
  async delete(@Param('id') id: string) {
    await this.resourceAllocationService.delete(id);
    return { success: true, message: 'Allocation deleted' };
  }

  // ── Conflict Detection ──
  @Get('conflicts/:workerId')
  @Roles('admin', 'project-manager', 'resource-manager')
  async checkConflicts(
    @Param('workerId') workerId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const conflict = await this.resourceAllocationService.checkConflict(
      workerId,
      startDate,
      endDate,
    );
    return { success: true, data: conflict };
  }

  // ── Resource Availability ──
  @Get('availability/:workerId')
  @Roles('admin', 'project-manager', 'resource-manager')
  async getAvailability(
    @Param('workerId') workerId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const availability = await this.resourceAllocationService.getResourceAvailability(
      workerId,
      startDate,
      endDate,
    );
    return { success: true, data: availability };
  }

  // ── Project Utilization ──
  @Get('project-utilization/:projectId')
  @Roles('admin', 'project-manager')
  async getProjectUtilization(@Param('projectId') projectId: string) {
    const utilization = await this.resourceAllocationService.getProjectUtilization(projectId);
    return { success: true, data: utilization };
  }

  // ── Bulk Operations ──
  @Post('bulk-allocate')
  @Roles('admin', 'project-manager', 'resource-manager')
  async bulkAllocate(@Body() body: { allocations: any[] }) {
    const results = await this.resourceAllocationService.bulkAllocate(body.allocations);
    return { success: true, data: results, message: 'Bulk allocation processed' };
  }

  // ── Completion ──
  @Put(':id/complete')
  @Roles('admin', 'project-manager', 'resource-manager')
  async completeAllocation(@Param('id') id: string) {
    const allocation = await this.resourceAllocationService.completeAllocation(id);
    return { success: true, data: allocation, message: 'Allocation completed' };
  }
}
