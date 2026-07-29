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
  Request,
} from '@nestjs/common';
import { Roles } from '../auth/decorators';
import { RolesGuard } from '../auth/roles.guard';
import { LeaveBalanceService } from './leave-balance.service';
import { LeaveRequestsService } from './leave-requests.service';

@Controller('leave-requests')
@UseGuards(RolesGuard)
export class LeaveRequestsController {
  constructor(
    private leaveBalanceService: LeaveBalanceService,
    private leaveRequestsService: LeaveRequestsService,
  ) {}

  // ── Leave Balance Endpoints ──
  @Get('balance/:employeeId')
  @Roles('admin', 'hr-manager', 'employee')
  async getLeaveBalance(
    @Param('employeeId') employeeId: string,
    @Query('leaveTypeId') leaveTypeId?: string,
  ) {
    if (leaveTypeId) {
      const balance = await this.leaveBalanceService.getLeaveBalance(employeeId, leaveTypeId);
      return { success: true, data: balance };
    }

    const balances = await this.leaveBalanceService.getAllLeaveBalances(employeeId);
    return { success: true, data: balances };
  }

  @Get('history/:employeeId')
  @Roles('admin', 'hr-manager', 'employee')
  async getLeaveHistory(
    @Param('employeeId') employeeId: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const result = await this.leaveBalanceService.getLeaveHistory(
      employeeId,
      limit ? parseInt(limit) : 50,
      skip ? parseInt(skip) : 0,
    );
    return { success: true, ...result };
  }

  @Get('pending-approvals')
  @Roles('admin', 'manager')
  async getPendingApprovals(@Request() req: any) {
    const result = await this.leaveBalanceService.getPendingApprovals(req.user.sub ?? req.user.id);
    return { success: true, ...result };
  }

  // ── Leave Request CRUD ──
  @Post()
  @Roles('admin', 'employee')
  async create(@Body() createDto: any, @Request() req: any) {
    const result = await this.leaveRequestsService.create({
      ...createDto,
      employeeId: createDto.employeeId || req.user.employeeId,
    });
    return { success: true, data: result, message: 'Leave request submitted' };
  }

  @Get()
  @Roles('admin', 'hr-manager', 'employee')
  async findAll(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const requests = await this.leaveRequestsService.findAll(status, employeeId);
    return { success: true, data: requests };
  }

  @Get(':id')
  @Roles('admin', 'hr-manager', 'employee')
  async findOne(@Param('id') id: string) {
    const request = await this.leaveRequestsService.findOne(id);
    return { success: true, data: request };
  }

  @Put(':id')
  @Roles('admin', 'employee')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    const request = await this.leaveRequestsService.update(id, updateDto);
    return { success: true, data: request, message: 'Leave request updated' };
  }

  // PATCH alias so the frontend's PATCH update reaches the same handler.
  @Patch(':id')
  @Roles('admin', 'employee')
  async patch(@Param('id') id: string, @Body() updateDto: any) {
    return this.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('admin', 'employee')
  async delete(@Param('id') id: string) {
    await this.leaveRequestsService.remove(id);
    return { success: true, message: 'Leave request deleted' };
  }

  // ── Leave Approval ──
  @Post(':id/approve')
  @Roles('admin', 'hr-manager', 'manager')
  async approve(
    @Param('id') id: string,
    @Body('comments') comments: string,
    @Request() req: any,
  ) {
    // Routed through the service so the configured approval workflow is honoured:
    // the request is only released once every required step has approved.
    const result = await this.leaveRequestsService.approve(id, req.user.sub ?? req.user.id, comments);
    const progress = await this.leaveRequestsService.getApprovalProgress(id);
    const complete = result.status === 'approved';
    return {
      success: true,
      data: result,
      approvals: progress,
      message: complete
        ? 'Leave request approved'
        : `Approval recorded (${progress.approved} of ${progress.required})`,
    };
  }

  @Post(':id/reject')
  @Roles('admin', 'hr-manager', 'manager')
  async reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    const result = await this.leaveRequestsService.reject(id, req.user.sub ?? req.user.id, reason);
    return { success: true, data: result, message: 'Leave request rejected' };
  }
}
