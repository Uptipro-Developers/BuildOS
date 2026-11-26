import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LeaveBalanceService } from './leave-balance.service';
import { WorkflowEngineService } from '../workflows/workflow-engine.service';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { MailQueueService } from '../queue/mail-queue.service';

const ADMIN_SETTINGS_KEY = 'admin-settings';

/**
 * Columns a client may set. Everything else is dropped — the request body used to
 * be handed straight to Prisma, so a single unexpected field (the ESS form sends
 * `reason`, the column is `notes`) failed the whole create with a 500.
 */
const LEAVE_REQUEST_FIELDS = [
    'refId', 'days', 'startDate', 'endDate', 'status', 'notes',
    'employeeId', 'leaveTypeId',
    'handoverEmployeeId', 'handoverEmployeeName',
] as const;

const DATE_FIELDS = new Set(['startDate', 'endDate']);

/** Aliases the UI uses for columns that are named differently in the schema. */
const FIELD_ALIASES: Record<string, string> = {
    reason: 'notes',
    comment: 'notes',
    comments: 'notes',
};

function sanitizeLeaveRequestInput(data: any): Record<string, any> {
    const merged: Record<string, any> = { ...(data ?? {}) };
    for (const [alias, column] of Object.entries(FIELD_ALIASES)) {
        if (merged[alias] !== undefined && merged[column] === undefined) {
            merged[column] = merged[alias];
        }
    }

    const out: Record<string, any> = {};
    for (const key of LEAVE_REQUEST_FIELDS) {
        if (merged[key] === undefined) continue;
        if (DATE_FIELDS.has(key)) {
            out[key] = merged[key] ? new Date(merged[key]) : undefined;
        } else {
            out[key] = merged[key];
        }
    }
    return out;
}

@Injectable()
export class LeaveRequestsService {
    private readonly logger = new Logger(LeaveRequestsService.name);

    constructor(
        private prisma: PrismaService,
        private leaveBalance: LeaveBalanceService,
        private workflowEngine: WorkflowEngineService,
        private notifications: NotificationDispatchService,
        private mailQueue: MailQueueService,
    ) { }

    findAll(status?: string, employeeId?: string) {
        return this.prisma.leaveRequest.findMany({
            where: {
                ...(status ? { status: status as any } : {}),
                ...(employeeId ? { employeeId } : {}),
            },
            include: { employee: true, leaveType: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    findOne(id: string) {
        return this.prisma.leaveRequest.findUniqueOrThrow({
            where: { id },
            include: { employee: true, leaveType: true },
        });
    }

    /**
     * Submits a leave request. Beyond persisting the row this:
     *  - validates the employee has enough entitlement left,
     *  - rejects dates overlapping an existing pending/approved request,
     *  - records the balance at submission time for audit,
     *  - and opens an approval workflow instance so the request follows the
     *    configured process instead of sitting in an inert "pending" state.
     */
    async create(data: any) {
        const clean = sanitizeLeaveRequestInput(data);

        if (!clean.employeeId) throw new BadRequestException('An employee is required');
        if (!clean.leaveTypeId) throw new BadRequestException('A leave type is required');
        if (!clean.handoverEmployeeId) throw new BadRequestException('Select the employee receiving the handover');
        if (!clean.startDate || !clean.endDate) {
            throw new BadRequestException('Start and end dates are required');
        }
        if (clean.startDate > clean.endDate) {
            throw new BadRequestException('The start date must be on or before the end date');
        }

        const leaveType = await this.prisma.leaveType.findUnique({
            where: { id: clean.leaveTypeId },
        });
        if (!leaveType) throw new BadRequestException('That leave type no longer exists');
        if (clean.handoverEmployeeId === clean.employeeId) {
            throw new BadRequestException('You cannot hand over leave responsibilities to yourself');
        }
        const handoverEmployee = await this.prisma.employee.findFirst({
            where: { id: clean.handoverEmployeeId, status: 'active' },
            select: { firstName: true, lastName: true, email: true },
        });
        if (!handoverEmployee) throw new BadRequestException('The selected handover employee is not active');
        clean.handoverEmployeeName = `${handoverEmployee.firstName} ${handoverEmployee.lastName}`.trim();

        // Fall back to the working-day count when the client does not send one.
        const days = Number(clean.days) > 0
            ? Number(clean.days)
            : this.leaveBalance.calculateWorkingDays(clean.startDate, clean.endDate);
        if (days <= 0) {
            throw new BadRequestException('The request must cover at least one working day');
        }
        clean.days = days;

        // Overlapping dates are a data error — always refuse them.
        const { hasConflict, conflictingRequests } = await this.leaveBalance.checkLeaveConflict(
            clean.employeeId,
            clean.startDate,
            clean.endDate,
        );
        if (hasConflict) {
            const clash = conflictingRequests[0];
            throw new ConflictException(
                'These dates overlap an existing ' + clash.status + ' request (' +
                clash.startDate.toISOString().slice(0, 10) + ' to ' +
                clash.endDate.toISOString().slice(0, 10) + ')',
            );
        }

        // Refuse requests beyond the remaining entitlement so the balances HR
        // reports stay meaningful.
        const balanceCheck = await this.leaveBalance.validateLeaveBalance(
            clean.employeeId,
            clean.leaveTypeId,
            days,
        );
        if (!balanceCheck.valid) {
            throw new BadRequestException(balanceCheck.reason ?? 'Insufficient leave balance');
        }

        const balance = await this.leaveBalance.getLeaveBalance(clean.employeeId, clean.leaveTypeId);
        clean.balanceBefore = balance.availableDays;
        clean.status = 'pending';
        clean.refId = String(clean.refId ?? '').trim() || `LR-${Date.now()}-${randomUUID().slice(0, 6)}`;

        let request;
        try {
            request = await this.prisma.leaveRequest.create({
                data: clean as any,
                include: { employee: true, leaveType: true },
            });
        } catch (error: any) {
            if (error?.code === 'P2002') {
                throw new ConflictException(`Leave reference "${clean.refId}" is already in use`);
            }
            throw error;
        }

        // Open the approval process. A failure here must not lose the request, so
        // it degrades to a warning the UI can surface.
        let workflowWarning: string | undefined;
        let workflowInstanceId: string | undefined;
        try {
            const instance = await this.openApprovalProcess(request.id, request.employeeId, leaveType);
            workflowInstanceId = instance.id;
        } catch (error) {
            workflowWarning = 'Request submitted, but the approval process could not be started: ' +
                (error instanceof Error ? error.message : 'unknown error');
            this.logger.warn(workflowWarning);
        }

        // Leave submission uses two purpose-built messages rather than the
        // generic Email Configuration template. The handover recipient needs an
        // operational notice; the approver needs an actionable approval notice.
        // They are deliberately separate messages, even when both roles happen
        // to resolve to the same address.
        void this.sendSubmissionEmails(request, handoverEmployee, workflowInstanceId).catch((error) => {
            this.logger.warn(
                `Leave submission email routing failed for ${request.refId}: ` +
                (error instanceof Error ? error.message : String(error)),
            );
        });

        void this.notifications.dispatch('leave-request.submitted', {
            title: 'Leave request submitted',
            message:
                `${request.employee?.firstName ?? ''} ${request.employee?.lastName ?? ''}`.trim() +
                ` requested ${request.leaveType?.name ?? 'leave'} (${request.refId})`,
            actionUrl: '/apps/hr/leave-requests',
            relatedId: request.id,
            relatedType: 'LeaveRequest',
            suppressEmail: true,
            vars: {
                reference: request.refId,
                leaveType: request.leaveType?.name ?? '',
                startDate: request.startDate,
                endDate: request.endDate,
            },
        });

        return workflowWarning ? { ...request, workflowWarning } : request;
    }

    /**
     * Starts the approval trail for a leave request.
     *
     * The Admin app's configured workflow wins: an active ApprovalWorkflow with
     * processType "leave" defines the ordered approver nodes, and the shared
     * workflow engine drives it.
     *
     * When no workflow is configured, one is provisioned from the leave type's own
     * `approvalsRequired` count. Every request therefore runs through the same
     * engine and gets a real per-step audit trail, and the generated workflow is a
     * normal row an admin can edit afterwards in Admin › Process Workflows.
     */
    private async openApprovalProcess(
        requestId: string,
        employeeId: string,
        leaveType: { id: string; name: string; approvalsRequired: number },
    ) {
        const workflow = await this.resolveLeaveWorkflow(leaveType);
        return this.workflowEngine.createWorkflowInstance(
            workflow.id,
            'LeaveRequest',
            requestId,
            employeeId,
            { leaveType: leaveType.name },
        );
    }

    private async sendSubmissionEmails(
        request: any,
        handoverEmployee: { firstName: string; lastName: string; email: string },
        workflowInstanceId?: string,
    ): Promise<void> {
        const requesterName = `${request.employee?.firstName ?? ''} ${request.employee?.lastName ?? ''}`.trim();
        const leaveName = request.leaveType?.name ?? 'Leave';
        const date = (value: Date | string) => new Date(value).toISOString().slice(0, 10);
        const summary =
            `Reference: ${request.refId}\n` +
            `Employee: ${requesterName}\n` +
            `Leave type: ${leaveName}\n` +
            `Period: ${date(request.startDate)} to ${date(request.endDate)}\n` +
            `Working days: ${request.days}`;
        const appBaseUrl = String(
            process.env.FRONTEND_URL || process.env.APP_WEB_URL || process.env.WEB_URL ||
            (process.env.NODE_ENV === 'production'
                ? 'https://build-os-delta.vercel.app'
                : 'http://localhost:5173'),
        ).replace(/\/$/, '');

        const jobs: Promise<unknown>[] = [];
        if (handoverEmployee.email) {
            const handoverName = `${handoverEmployee.firstName} ${handoverEmployee.lastName}`.trim();
            jobs.push(this.mailQueue.enqueueEmail({
                to: handoverEmployee.email,
                subject: `Leave handover assigned — ${request.refId}`,
                text:
                    `Hello ${handoverName},\n\n` +
                    `${requesterName} selected you as the handover employee for this leave request.\n\n` +
                    `${summary}\n\nPlease coordinate the handover arrangements with ${requesterName}.`,
            }));
        }

        const approvers = await this.resolveLeaveEmailApprovers(workflowInstanceId);
        for (const approver of approvers) {
            if (approver.email) {
                jobs.push(this.mailQueue.enqueueEmail({
                    to: approver.email,
                    subject: `Leave request awaiting your approval — ${request.refId}`,
                    text:
                        `Hello ${approver.name},\n\n` +
                        `${requesterName} submitted a leave request that requires your approval.\n\n` +
                        `${summary}\n\nReview it in BuildOS: ${appBaseUrl}/apps/hr/leave-requests`,
                }));
            }
        }

        const results = await Promise.allSettled(jobs);
        results.forEach((result) => {
            if (result.status === 'rejected') {
                this.logger.warn(`Leave submission email failed: ${String(result.reason)}`);
            }
        });
    }

    /**
     * The Process Workflow configured at Admin › Project Configuration is the
     * authority for who approves Leave Requests. Group workflows notify every
     * configured member; tier workflows notify the first level only. The engine's
     * pending ApprovalRequest remains a compatibility fallback for installations
     * that have not configured p_leave_requests yet.
     */
    private async resolveLeaveEmailApprovers(
        workflowInstanceId?: string,
    ): Promise<Array<{ id: string; email: string; name: string }>> {
        const settingsRow = await this.prisma.systemSetting.findUnique({
            where: { key: ADMIN_SETTINGS_KEY },
        }).catch(() => null);
        const settings = (settingsRow?.value ?? {}) as Record<string, any>;
        const workflow = (Array.isArray(settings.processWorkflows)
            ? settings.processWorkflows
            : []).find((item: any) => String(item?.processId ?? '') === 'p_leave_requests');

        let configured: string[] = [];
        if (workflow?.workflowType === 'single' && workflow.approver) {
            configured = [String(workflow.approver)];
        } else if (workflow?.workflowType === 'group') {
            configured = Array.isArray(workflow.groupApprovers)
                ? workflow.groupApprovers.map(String)
                : [];
        } else if (workflow?.workflowType === 'tier' && Array.isArray(workflow.tierLevels)) {
            const first = [...workflow.tierLevels]
                .sort((a: any, b: any) => Number(a?.level ?? 0) - Number(b?.level ?? 0))[0];
            if (first?.approver) configured = [String(first.approver)];
        }

        if (configured.length > 0) {
            const wanted = new Set(
                configured.map((value) => value.trim().toLowerCase()).filter(Boolean),
            );
            const users = await this.prisma.user.findMany({
                where: { status: { notIn: ['Inactive', 'inactive'] } },
                select: { id: true, email: true, name: true, role: true },
            });
            const matched = users.filter((user) =>
                [user.id, user.email, user.name, user.role]
                    .some((value) => wanted.has(String(value ?? '').trim().toLowerCase())),
            );
            if (matched.length > 0) {
                return matched.map(({ id, email, name }) => ({ id, email, name }));
            }
            this.logger.warn(
                `Leave approver configuration did not resolve to an active user: ${configured.join(', ')}`,
            );
        }

        if (!workflowInstanceId) return [];
        const pending = await this.prisma.approvalRequest.findFirst({
            where: { workflowInstanceId, status: 'pending' },
            orderBy: { nodeSequence: 'asc' },
            select: { approverId: true },
        });
        if (!pending) return [];
        const fallback = await this.prisma.user.findUnique({
            where: { id: pending.approverId },
            select: { id: true, email: true, name: true },
        });
        return fallback ? [fallback] : [];
    }

    /** The configured 'leave' workflow, provisioning a default one if absent. */
    private async resolveLeaveWorkflow(leaveType: {
        id: string; name: string; approvalsRequired: number;
    }) {
        const configured = await this.prisma.approvalWorkflow.findFirst({
            where: { processType: 'leave', isActive: true },
            include: { nodes: true },
        });
        if (configured && configured.nodes.length > 0) return configured;

        const steps = Math.max(1, leaveType.approvalsRequired ?? 1);
        // Per-leave-type, because approvalsRequired differs between types
        // (e.g. Annual needs 1 approval, Maternity needs 2).
        const name = `${leaveType.name} Approval`;
        const existing = await this.prisma.approvalWorkflow.findFirst({
            where: { name },
            include: { nodes: true },
        });
        if (existing && existing.nodes.length >= steps) return existing;

        this.logger.log(
            `Provisioning a default '${name}' workflow with ${steps} step(s) from ` +
            `LeaveType.approvalsRequired; edit it in Admin › Process Workflows.`,
        );

        // Two approval levels is the common shape; anything deeper repeats the
        // second level rather than inventing role names.
        const roleFor = (sequence: number) =>
            sequence === 1 ? 'manager' : 'hr-manager';

        return this.prisma.approvalWorkflow.upsert({
            where: { name },
            create: {
                name,
                processType: 'leave',
                description: `Auto-generated from ${leaveType.name}.approvalsRequired`,
                isActive: true,
                nodes: {
                    create: Array.from({ length: steps }, (_, i) => ({
                        sequence: i + 1,
                        name: `Level ${i + 1} Approval`,
                        approverRole: roleFor(i + 1),
                    })),
                },
            },
            update: {},
            include: { nodes: true },
        });
    }

    /**
     * How many approvals this request needs and how many it has.
     * Mirrors openApprovalProcess: configured workflow first, leave type second.
     */
    async getApprovalProgress(id: string) {
        const request = await this.prisma.leaveRequest.findUniqueOrThrow({
            where: { id },
            include: { leaveType: true },
        });

        const instance = await this.prisma.workflowInstance.findFirst({
            where: { entityType: 'LeaveRequest', entityId: id },
            orderBy: { createdAt: 'desc' },
            include: {
                approvalWorkflow: { include: { nodes: true } },
                approvalRequests: true,
            },
        });

        if (instance) {
            return {
                source: 'workflow' as const,
                instance,
                required: instance.approvalWorkflow.nodes.length || 1,
                approved: instance.approvalRequests.filter((r) => r.status === 'approved').length,
            };
        }

        const required = Math.max(1, request.leaveType.approvalsRequired ?? 1);
        // Without a workflow instance the recorded signals are the final approval
        // (status approved) or an intermediate approver stamped on a still-pending
        // request.
        const approved = request.status === 'approved'
            ? required
            : request.approvedBy
                ? 1
                : 0;
        return { source: 'leaveType' as const, instance: null, required, approved };
    }

    /**
     * Records one approval. The request is only marked approved — and only then
     * counted against the employee's balance — once every required step is in.
     */
    async approve(id: string, approverId: string, comments?: string) {
        const request = await this.prisma.leaveRequest.findUniqueOrThrow({
            where: { id },
            include: { leaveType: true },
        });
        if (request.status === 'approved') {
            throw new ConflictException('This request has already been approved');
        }
        if (request.status === 'rejected') {
            throw new ConflictException('This request was rejected and cannot be approved');
        }

        const progress = await this.getApprovalProgress(id);

        if (progress.instance) {
            const open = progress.instance.approvalRequests
                .filter((r) => r.status === 'pending')
                .sort((a, b) => a.nodeSequence - b.nodeSequence)[0];
            if (!open) {
                throw new ConflictException('There is no approval step awaiting a decision');
            }
            // The engine closes this step and opens the next one, or completes the
            // instance when this was the last node.
            await this.workflowEngine.approveNode(open.id, approverId, comments);

            const after = await this.getApprovalProgress(id);
            if (after.approved < after.required) {
                // Outstanding steps remain — the request stays pending, and the
                // latest approver is recorded so the trail shows who has signed.
                return this.prisma.leaveRequest.update({
                    where: { id },
                    data: { approvedBy: approverId },
                    include: { employee: true, leaveType: true },
                });
            }
        }

        // Final approval — the request now counts against the balance, so capture
        // what the employee has left afterwards for the audit trail.
        const balance = await this.leaveBalance.getLeaveBalance(
            request.employeeId,
            request.leaveTypeId,
        );
        const approved = await this.prisma.leaveRequest.update({
            where: { id },
            data: {
                status: 'approved',
                approvedBy: approverId,
                approvedAt: new Date(),
                balanceAfter: balance.availableDays - request.days,
                ...(comments ? { notes: comments } : {}),
            },
            include: { employee: true, leaveType: true },
        });
        void this.notifications.dispatch('leave-request.decided', {
            title: 'Leave request approved',
            message: `${approved.refId} — ${approved.leaveType?.name ?? 'leave'} approved`,
            actionUrl: '/apps/ess/my-requests',
            relatedId: approved.id,
            relatedType: 'LeaveRequest',
            vars: { reference: approved.refId, decision: 'approved' },
        });
        return approved;
    }

    /** Rejects a request and closes any open workflow instance behind it. */
    async reject(id: string, approverId: string, reason?: string) {
        const request = await this.prisma.leaveRequest.findUniqueOrThrow({ where: { id } });
        if (request.status === 'approved') {
            throw new ConflictException('This request has already been approved');
        }

        const instance = await this.prisma.workflowInstance.findFirst({
            where: { entityType: 'LeaveRequest', entityId: id, status: 'in_progress' },
            include: { approvalRequests: true },
        });
        if (instance) {
            const open = instance.approvalRequests.find((r) => r.status === 'pending');
            if (open) {
                await this.workflowEngine.rejectNode(open.id, approverId, reason ?? 'Rejected');
            }
        }

        const rejected = await this.prisma.leaveRequest.update({
            where: { id },
            data: {
                status: 'rejected',
                approvedBy: approverId,
                approvedAt: new Date(),
                ...(reason ? { notes: reason } : {}),
            },
            include: { employee: true, leaveType: true },
        });
        void this.notifications.dispatch('leave-request.decided', {
            title: 'Leave request rejected',
            message:
                `${rejected.refId} — ${rejected.leaveType?.name ?? 'leave'} rejected` +
                (reason ? `: ${reason}` : ''),
            actionUrl: '/apps/ess/my-requests',
            relatedId: rejected.id,
            relatedType: 'LeaveRequest',
            vars: { reference: rejected.refId, decision: 'rejected', reason: reason ?? '' },
        });
        return rejected;
    }

    update(id: string, data: any) {
        return this.prisma.leaveRequest.update({
            where: { id },
            data: sanitizeLeaveRequestInput(data) as any,
            include: { employee: true, leaveType: true },
        });
    }

    remove(id: string) {
        return this.prisma.leaveRequest.delete({ where: { id } });
    }
}
