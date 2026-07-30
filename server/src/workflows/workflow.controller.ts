import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Roles } from '../auth/decorators';
import { RolesGuard } from '../auth/roles.guard';
import { WorkflowEngineService } from './workflow-engine.service';

@Controller('workflows')
@UseGuards(RolesGuard)
export class WorkflowController {
  constructor(private workflowEngine: WorkflowEngineService) {}

  // ── Workflow Instance Management ──
  @Post('instances')
  @Roles('admin', 'project-manager', 'hr-manager')
  async createWorkflowInstance(
    @Body()
    body: {
      workflowId: string;
      entityType: string;
      entityId: string;
      context?: any;
    },
    @Request() req: any,
  ) {
    const instance = await this.workflowEngine.createWorkflowInstance(
      body.workflowId,
      body.entityType,
      body.entityId,
      (req.user.sub ?? req.user.id),
      body.context,
    );
    return { success: true, data: instance, message: 'Workflow instance created' };
  }

  @Get('instances/:id')
  @Roles('admin', 'project-manager', 'hr-manager')
  async getWorkflowInstance(@Param('id') id: string) {
    const instance = await this.workflowEngine.getWorkflowInstance(id);
    return { success: true, data: instance };
  }

  // ── Approvals ──
  @Get('approvals/pending')
  @Roles('admin', 'manager', 'approver')
  async getPendingApprovals(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const result = await this.workflowEngine.getPendingApprovals(
      (req.user.sub ?? req.user.id),
      limit ? parseInt(limit) : 20,
      skip ? parseInt(skip) : 0,
    );
    return { success: true, ...result };
  }

  @Post('approvals/:id/approve')
  @Roles('admin', 'manager', 'approver')
  async approveNode(
    @Param('id') id: string,
    @Request() req: any,
    @Body('comments') comments?: string,
  ) {
    const result = await this.workflowEngine.approveNode(id, (req.user.sub ?? req.user.id), comments);
    return { success: true, data: result, message: 'Node approved' };
  }

  @Post('approvals/:id/reject')
  @Roles('admin', 'manager', 'approver')
  async rejectNode(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    const result = await this.workflowEngine.rejectNode(id, (req.user.sub ?? req.user.id), reason);
    return { success: true, data: result, message: 'Node rejected' };
  }

  // ── Delegation & Escalation ──
  @Post('approvals/:id/delegate')
  @Roles('admin', 'manager', 'approver')
  async delegateApproval(
    @Param('id') id: string,
    @Body('delegateTo') delegateTo: string,
    @Request() req: any,
  ) {
    const result = await this.workflowEngine.delegateApproval(id, delegateTo, (req.user.sub ?? req.user.id));
    return { success: true, data: result, message: 'Approval delegated' };
  }

  @Post('approvals/:id/escalate')
  @Roles('admin', 'manager', 'approver')
  async escalateApproval(
    @Param('id') id: string,
    @Body('escalatedTo') escalatedTo: string,
  ) {
    const result = await this.workflowEngine.handleEscalation(id, escalatedTo);
    return { success: true, data: result, message: 'Approval escalated' };
  }

  // ── Statistics & Monitoring ──
  @Get('stats/:workflowId')
  @Roles('admin', 'manager')
  async getWorkflowStats(@Param('workflowId') workflowId: string) {
    const stats = await this.workflowEngine.getWorkflowStats(workflowId);
    return { success: true, data: stats };
  }

  @Get('overdue-approvals')
  @Roles('admin', 'manager')
  async getOverdueApprovals(@Query('hoursOverdue') hoursOverdue?: string) {
    const approvals = await this.workflowEngine.getOverdueApprovals(
      hoursOverdue ? parseInt(hoursOverdue) : 24,
    );
    return { success: true, data: approvals, count: approvals.length };
  }
}
