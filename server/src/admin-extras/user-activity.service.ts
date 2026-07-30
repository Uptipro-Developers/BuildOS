import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UserActivityEntry {
    id: string;
    action: string;
    module: string;
    app: string;
    date: Date;
}

export interface UserRequestEntry {
    id: string;
    label: string;
    module: string;
    app: string;
    /** Normalised for the UI's three status buckets. */
    type: 'submitted' | 'approved' | 'rejected';
    /** The status as stored, so the UI can show the real wording. */
    status: string;
    date: Date;
}

/**
 * Feeds the Activity and Requests tabs on Admin → Users.
 *
 * Both tabs already had complete rendering code but were handed hardcoded empty
 * arrays, so they always read "No activity recorded" / "No request history".
 *
 * Activity comes from AuditLog, which a global middleware already writes for
 * every successful non-GET request, keyed on the acting user from the JWT. Its raw
 * shape is HTTP-flavoured ("POST /api/expenses", and for a DELETE the "entity" is
 * the record id), so it is humanised here rather than in the UI.
 *
 * Requests are matched by name and email because every request table stores its
 * creator as free text (`requestedBy`, `reportedBy`, `raisedBy`) rather than a
 * foreign key; leave is the exception and joins through the linked employee. The
 * match is intentionally strict — a blank identity matches nothing rather than
 * everything, so one user is never shown another's requests.
 */
@Injectable()
export class UserActivityService {
    private readonly logger = new Logger(UserActivityService.name);

    constructor(private prisma: PrismaService) {}

    /** Maps an API path segment onto the app that owns it. */
    private appForPath(path: string): { app: string; module: string } {
        const segments = path.replace(/^\/?api\/?/, '').split('/').filter(Boolean);
        const head = (segments[0] ?? '').toLowerCase();

        const MODULES: Record<string, { app: string; module: string }> = {
            'leave-requests': { app: 'hr', module: 'Leave' },
            'leave-types': { app: 'hr', module: 'Leave' },
            employees: { app: 'hr', module: 'Employees' },
            departments: { app: 'hr', module: 'Departments' },
            attendance: { app: 'hr', module: 'Attendance' },
            payroll: { app: 'hr', module: 'Payroll' },
            payslips: { app: 'hr', module: 'Payroll' },
            expenses: { app: 'finance', module: 'Expenses' },
            accruals: { app: 'finance', module: 'Accruals' },
            income: { app: 'finance', module: 'Income' },
            'journal-entries': { app: 'finance', module: 'Journals' },
            budgets: { app: 'finance', module: 'Budgets' },
            materials: { app: 'procurement', module: 'Materials' },
            'material-requests': { app: 'procurement', module: 'Material Requests' },
            'purchase-requests': { app: 'procurement', module: 'Purchase Requests' },
            'purchase-orders': { app: 'procurement', module: 'Purchase Orders' },
            suppliers: { app: 'procurement', module: 'Suppliers' },
            projects: { app: 'construction', module: 'Projects' },
            tasks: { app: 'construction', module: 'Tasks' },
            issues: { app: 'construction', module: 'Issues' },
            'change-requests': { app: 'construction', module: 'Change Requests' },
            admin: { app: 'admin', module: 'Administration' },
            users: { app: 'admin', module: 'Users' },
            roles: { app: 'admin', module: 'Roles' },
            auth: { app: 'admin', module: 'Authentication' },
        };

        if (MODULES[head]) return MODULES[head];
        const label = head
            ? head.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
            : 'System';
        return { app: 'admin', module: label };
    }

    async findUserActivity(userId: string, limit = 50): Promise<UserActivityEntry[]> {
        const logs = await this.prisma.auditLog.findMany({
            where: { userId },
            orderBy: { timestamp: 'desc' },
            take: Math.min(Math.max(Number(limit) || 50, 1), 200),
            select: {
                id: true,
                action: true,
                entity: true,
                description: true,
                timestamp: true,
            },
        });

        const VERBS: Record<string, string> = {
            CREATE: 'Created',
            UPDATE: 'Updated',
            DELETE: 'Deleted',
            APPROVE: 'Approved',
            REJECT: 'Rejected',
        };

        return logs.map((log) => {
            // The middleware records `description` as "METHOD /api/path", which is
            // the only reliable place to recover what was actually touched: for a
            // DELETE the `entity` column holds the record id, not a type name.
            const path = String(log.description ?? '').split(' ').pop() ?? '';
            const { app, module } = this.appForPath(path);
            const verb = VERBS[String(log.action ?? '').toUpperCase()] ?? 'Changed';

            return {
                id: log.id,
                action: `${verb} ${module.toLowerCase()} record`,
                module,
                app,
                date: log.timestamp,
            };
        });
    }

    async findUserRequests(userId: string): Promise<UserRequestEntry[]> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, employee: { select: { id: true } } },
        });
        if (!user) return [];

        // Blank identities must match nothing, otherwise a user with no name would
        // be shown every request in the system.
        const identities = [user.name, user.email]
            .map((v) => String(v ?? '').trim())
            .filter(Boolean);
        const employeeId = user.employee?.id;
        if (identities.length === 0 && !employeeId) return [];

        const byCreator = identities.length > 0 ? { in: identities } : undefined;

        const settle = (
            status: string,
            approved: string[],
            rejected: string[],
        ): UserRequestEntry['type'] => {
            const value = status.trim().toLowerCase();
            if (approved.includes(value)) return 'approved';
            if (rejected.includes(value)) return 'rejected';
            return 'submitted';
        };

        const results: UserRequestEntry[] = [];

        const collect = async (label: string, run: () => Promise<UserRequestEntry[]>) => {
            try {
                results.push(...(await run()));
            } catch (error) {
                // One unavailable table must not blank the whole tab.
                this.logger.warn(`Could not load ${label} for user ${userId}: ${(error as Error).message}`);
            }
        };

        await Promise.all([
            employeeId
                ? collect('leave requests', async () =>
                      (
                          await this.prisma.leaveRequest.findMany({
                              where: { employeeId },
                              orderBy: { createdAt: 'desc' },
                              select: {
                                  id: true,
                                  refId: true,
                                  status: true,
                                  days: true,
                                  createdAt: true,
                                  leaveType: { select: { name: true } },
                              },
                          })
                      ).map((r) => ({
                          id: r.id,
                          label: `${r.leaveType?.name ?? 'Leave'} — ${r.days} day(s) (${r.refId})`,
                          module: 'Leave Request',
                          app: 'ess',
                          type: settle(String(r.status), ['approved'], ['rejected', 'cancelled']),
                          status: String(r.status),
                          date: r.createdAt,
                      })),
                  )
                : Promise.resolve(),

            byCreator &&
                collect('material requests', async () =>
                    (
                        await this.prisma.materialRequest.findMany({
                            where: { requestedBy: byCreator },
                            orderBy: { createdAt: 'desc' },
                            select: { id: true, reference: true, status: true, createdAt: true },
                        })
                    ).map((r) => ({
                        id: r.id,
                        label: `Material request ${r.reference}`,
                        module: 'Material Request',
                        app: 'procurement',
                        type: settle(
                            String(r.status),
                            ['approved', 'fulfilled', 'issued', 'completed'],
                            ['rejected', 'cancelled', 'declined'],
                        ),
                        status: String(r.status),
                        date: r.createdAt,
                    })),
                ),

            byCreator &&
                collect('purchase requests', async () =>
                    (
                        await this.prisma.purchaseRequest.findMany({
                            where: { requestedBy: byCreator },
                            orderBy: { createdAt: 'desc' },
                            select: { id: true, title: true, status: true, createdAt: true },
                        })
                    ).map((r) => ({
                        id: r.id,
                        label: `Purchase request: ${r.title}`,
                        module: 'Purchase Request',
                        app: 'procurement',
                        type: settle(
                            String(r.status),
                            ['approved', 'ordered', 'completed'],
                            ['rejected', 'cancelled', 'declined'],
                        ),
                        status: String(r.status),
                        date: r.createdAt,
                    })),
                ),

            byCreator &&
                collect('issues', async () =>
                    (
                        await this.prisma.issue.findMany({
                            where: { reportedBy: byCreator },
                            orderBy: { createdAt: 'desc' },
                            select: { id: true, title: true, status: true, createdAt: true },
                        })
                    ).map((r) => ({
                        id: r.id,
                        label: `Issue: ${r.title}`,
                        module: 'Issue',
                        app: 'construction',
                        type: settle(
                            String(r.status),
                            ['resolved', 'closed', 'approved'],
                            ['rejected', 'cancelled'],
                        ),
                        status: String(r.status),
                        date: r.createdAt,
                    })),
                ),

            byCreator &&
                collect('change requests', async () =>
                    (
                        await this.prisma.changeRequest.findMany({
                            where: { raisedBy: byCreator },
                            orderBy: { createdAt: 'desc' },
                            select: {
                                id: true,
                                crNumber: true,
                                description: true,
                                status: true,
                                createdAt: true,
                            },
                        })
                    ).map((r) => ({
                        id: r.id,
                        label: `Change request ${r.crNumber}: ${r.description}`.slice(0, 140),
                        module: 'Change Request',
                        app: 'construction',
                        type: settle(
                            String(r.status),
                            ['approved', 'implemented', 'closed'],
                            ['rejected', 'cancelled', 'declined'],
                        ),
                        status: String(r.status),
                        date: r.createdAt,
                    })),
                ),
        ]);

        return results.sort((a, b) => b.date.getTime() - a.date.getTime());
    }
}
