import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';

/**
 * Which catalog process governs each entity a workflow can route.
 *
 * The generic approval endpoints approve whatever node they are given, so a fixed
 * `@RequiresProcess` on the controller would be wrong — the process depends on
 * what is being approved. Enforcement therefore happens here, where the workflow
 * instance's entityType is known.
 *
 * An entity absent from this map is not blocked: it resolves to no process, and
 * the approval proceeds under the coarse @Roles check alone rather than failing
 * closed on an entity nobody has mapped yet.
 */
const PROCESS_BY_ENTITY: Record<string, string> = {
  LeaveRequest: 'p_leave_requests',
  Expense: 'p_expenses',
  Accrual: 'p_accruals',
  PurchaseRequest: 'p_purchase_requests',
  PurchaseOrder: 'p_purchase_orders',
  MaterialRequest: 'p_material_requests',
  PurchaseInvoice: 'p_purchase_invoices',
  Payment: 'p_payments',
  Claim: 'p_claims',
  JournalEntry: 'p_journal_entries',
  Budget: 'p_budgets',
  ChangeRequest: 'p_change_requests',
  DailyReport: 'p_daily_reports',
  QualityNcr: 'p_quality_ncrs',
  HseRecord: 'p_hse_records',
  ProjectDocument: 'p_documents',
  FundingRelease: 'p_project_funding',
  StockMovement: 'p_stock_movements',
  MaterialReturn: 'p_store_requests',
  Appraisal: 'p_appraisals',
  AttendanceRecord: 'p_attendance',
};

@Injectable()
export class WorkflowEngineService {
  constructor(
    private prisma: PrismaService,
    private permissions: PermissionsService,
  ) {}

  /**
   * Refuses the approval if the acting user's configured permissions revoke
   * Approve on the process this entity belongs to.
   */
  private async assertMayApprove(entityType: string, approverId: string) {
    const processId = PROCESS_BY_ENTITY[String(entityType ?? '')];
    if (!processId || !approverId) return;

    const allowed = await this.permissions.can(approverId, processId, 'approve');
    if (!allowed) {
      throw new ForbiddenException(
        `Your role does not permit "approve" on this process.`,
      );
    }
  }

  /**
   * Create approval workflow instance
   */
  async createWorkflowInstance(
    workflowId: string,
    entityType: string,
    entityId: string,
    initiatedBy: string,
    context?: any,
  ) {
    const workflow = await this.prisma.approvalWorkflow.findUnique({
      where: { id: workflowId },
      include: { nodes: { orderBy: { sequence: 'asc' } } },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    // Create workflow instance
    const instance = await this.prisma.workflowInstance.create({
      data: {
        workflowId,
        entityType,
        entityId,
        initiatedBy,
        status: 'in_progress',
        context: context || {},
        currentNodeSeq: 1,
      },
    });

    // Create first approval request
    if (workflow.nodes.length > 0) {
      const firstNode = workflow.nodes[0];
      await this.createApprovalRequest(instance.id, firstNode, initiatedBy, context);
    }

    return instance;
  }

  /**
   * Get workflow instance
   */
  async getWorkflowInstance(instanceId: string) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: { approvalRequests: { orderBy: { nodeSequence: 'asc' } } },
    });

    if (!instance) {
      throw new NotFoundException(`Workflow instance ${instanceId} not found`);
    }

    return {
      ...instance,
      context: JSON.parse(instance.context as string),
    };
  }

  /**
   * Get pending approvals for user
   */
  async getPendingApprovals(approverId: string, limit = 20, skip = 0) {
    const [requests, total] = await Promise.all([
      this.prisma.approvalRequest.findMany({
        where: {
          approverId,
          status: 'pending',
        },
        include: { workflowInstance: true },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip,
      }),
      this.prisma.approvalRequest.count({
        where: { approverId, status: 'pending' },
      }),
    ]);

    return {
      requests,
      pagination: { total, limit, skip },
    };
  }

  /**
   * Approve workflow node
   */
  async approveNode(
    approvalRequestId: string,
    approverId: string,
    comments?: string,
  ) {
    const approvalRequest = await this.prisma.approvalRequest.findUnique({
      where: { id: approvalRequestId },
      include: { workflowInstance: { include: { approvalWorkflow: { include: { nodes: true } } } } },
    });

    if (!approvalRequest) {
      throw new NotFoundException(`Approval request ${approvalRequestId} not found`);
    }

    if (approvalRequest.status !== 'pending') {
      throw new BadRequestException('Approval request is not pending');
    }

    await this.assertMayApprove(
      approvalRequest.workflowInstance.entityType,
      approverId,
    );

    // Update approval request
    await this.prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: {
        status: 'approved',
        approverId,
        comments,
        approvedAt: new Date(),
      },
    });

    // Get next node
    const currentSequence = approvalRequest.nodeSequence;
    const nextNode = approvalRequest.workflowInstance.approvalWorkflow.nodes.find(
      (n) => n.sequence === currentSequence + 1,
    );

    if (nextNode) {
      // Create approval request for next node
      const instance = approvalRequest.workflowInstance;
      await this.createApprovalRequest(instance.id, nextNode, approverId, {});

      // Update instance current node
      await this.prisma.workflowInstance.update({
        where: { id: instance.id },
        data: { currentNodeSeq: nextNode.sequence },
      });
    } else {
      // All approvals completed - mark workflow as completed
      await this.prisma.workflowInstance.update({
        where: { id: approvalRequest.workflowInstanceId },
        data: { status: 'completed', updatedAt: new Date() },
      });
    }

    return approvalRequest;
  }

  /**
   * Reject workflow node
   */
  async rejectNode(
    approvalRequestId: string,
    approverId: string,
    reason: string,
  ) {
    const approvalRequest = await this.prisma.approvalRequest.findUnique({
      where: { id: approvalRequestId },
      include: { workflowInstance: { select: { entityType: true } } },
    });

    if (!approvalRequest) {
      throw new NotFoundException(`Approval request ${approvalRequestId} not found`);
    }

    // Rejecting is the same authority as approving.
    await this.assertMayApprove(
      approvalRequest.workflowInstance?.entityType ?? '',
      approverId,
    );

    // Update approval request
    const updated = await this.prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: {
        status: 'rejected',
        approverId,
        comments: reason,
        updatedAt: new Date(),
      },
    });

    // Mark workflow as rejected
    await this.prisma.workflowInstance.update({
      where: { id: approvalRequest.workflowInstanceId },
      data: { status: 'rejected', updatedAt: new Date() },
    });

    return updated;
  }

  /**
   * Delegate approval
   */
  async delegateApproval(
    approvalRequestId: string,
    delegateTo: string,
    delegatedFrom: string,
  ) {
    const approvalRequest = await this.prisma.approvalRequest.findUnique({
      where: { id: approvalRequestId },
    });

    if (!approvalRequest) {
      throw new NotFoundException(`Approval request ${approvalRequestId} not found`);
    }

    return this.prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: {
        approverId: delegateTo,
        delegatedFrom,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Handle node escalation
   */
  async handleEscalation(approvalRequestId: string, escalatedTo: string) {
    const approvalRequest = await this.prisma.approvalRequest.findUnique({
      where: { id: approvalRequestId },
      include: { workflowInstance: { include: { approvalWorkflow: { include: { nodes: true } } } } },
    });

    if (!approvalRequest) {
      throw new NotFoundException(`Approval request ${approvalRequestId} not found`);
    }

    // Mark current as pending escalation
    await this.prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: { status: 'escalated' },
    });

    // Create new approval request for escalated approver
    const node = approvalRequest.workflowInstance.approvalWorkflow.nodes.find(
      (n) => n.sequence === approvalRequest.nodeSequence,
    );

    if (node) {
      return this.prisma.approvalRequest.create({
        data: {
          workflowInstanceId: approvalRequest.workflowInstanceId,
          nodeSequence: node.sequence,
          approverId: escalatedTo,
          status: 'pending',
          delegatedFrom: approvalRequest.approverId,
        },
      });
    }
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats(workflowId: string) {
    const [total, completed, rejected, inProgress] = await Promise.all([
      this.prisma.workflowInstance.count({ where: { workflowId } }),
      this.prisma.workflowInstance.count({
        where: { workflowId, status: 'completed' },
      }),
      this.prisma.workflowInstance.count({
        where: { workflowId, status: 'rejected' },
      }),
      this.prisma.workflowInstance.count({
        where: { workflowId, status: 'in_progress' },
      }),
    ]);

    // Calculate average completion time
    const completedInstances = await this.prisma.workflowInstance.findMany({
      where: { workflowId, status: 'completed' },
      select: { createdAt: true, updatedAt: true },
    });

    const avgCompletionMs =
      completedInstances.length > 0
        ? completedInstances.reduce((sum, inst) => {
            const time = (inst.updatedAt.getTime() - inst.createdAt.getTime()) / 1000 / 60; // minutes
            return sum + time;
          }, 0) / completedInstances.length
        : 0;

    return {
      workflowId,
      total,
      completed,
      rejected,
      inProgress,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      averageCompletionTimeMinutes: Math.round(avgCompletionMs),
    };
  }

  /**
   * Get overdue approvals
   */
  async getOverdueApprovals(hoursOverdue = 24) {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursOverdue);

    return this.prisma.approvalRequest.findMany({
      where: {
        status: 'pending',
        createdAt: { lt: cutoffTime },
      },
      include: { workflowInstance: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Helper Methods ──

  private async createApprovalRequest(
    workflowInstanceId: string,
    node: any,
    initiatedBy: string,
    context: any,
  ) {
    const approverId = await this.resolveApprover(node, initiatedBy);

    return this.prisma.approvalRequest.create({
      data: {
        workflowInstanceId,
        nodeSequence: node.sequence,
        approverId,
        status: 'pending',
      },
    });
  }

  /**
   * Resolves a node's configured approver to a real User id.
   *
   * ApprovalRequest.approverId is NOT NULL, and this previously assigned
   * `node.approverEmail` directly — an email, not an id, and null on any node
   * configured by role alone. That made every such create fail, which is why no
   * module had a working approval trail.
   *
   * Resolution order: the node's explicit approverEmail, then any active user
   * holding the node's approverRole, then an admin as a catch-all so the step is
   * still actionable rather than lost.
   */
  private async resolveApprover(node: any, initiatedBy: string): Promise<string> {
    const email = String(node?.approverEmail ?? '').trim().toLowerCase();
    if (email) {
      const named = await this.prisma.user.findUnique({ where: { email } });
      if (named) return named.id;
    }

    const role = String(node?.approverRole ?? '').trim();
    if (role) {
      // Role names are compared case- and separator-insensitively, matching
      // RolesGuard ("hr-manager" and "HR Manager" are the same role).
      const canonical = role.toLowerCase().replace(/[\s_-]+/g, '');
      const candidates = await this.prisma.user.findMany({
        where: { status: { notIn: ['Inactive', 'inactive'] } },
        select: { id: true, role: true },
      });
      const match = candidates.find(
        (u) => String(u.role ?? '').toLowerCase().replace(/[\s_-]+/g, '') === canonical,
      );
      if (match) return match.id;
    }

    const admin = await this.prisma.user.findFirst({
      where: { role: { in: ['admin', 'Admin'] } },
      select: { id: true },
    });
    if (admin) return admin.id;

    // Nothing better available — route it back to the initiator so the request
    // is visible to someone rather than orphaned.
    return initiatedBy;
  }
}
