import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminExtrasService } from '../admin-extras/admin-extras.service';

export const DELEGATED_APPS = ['construction', 'storefront', 'procurement', 'finance', 'hr'] as const;
export type DelegatedApp = typeof DELEGATED_APPS[number];

const APP_SCOPE_TYPES: Record<DelegatedApp, string[]> = {
    construction: ['application', 'project'],
    storefront: ['application', 'store', 'project'],
    procurement: ['application', 'project', 'store'],
    finance: ['application', 'project', 'department'],
    hr: ['application', 'project', 'department'],
};

const PROCESS_SCOPE_TYPES: Record<string, string[]> = {
    p_projects: ['application', 'project'],
    p_daily_reports: ['application', 'project'], p_site_issues: ['application', 'project'],
    p_change_requests: ['application', 'project'], p_delays: ['application', 'project'],
    p_quality_ncrs: ['application', 'project'], p_hse_records: ['application', 'project'],
    p_documents: ['application', 'project'], p_project_funding: ['application', 'project'],
    p_resources: ['application', 'project'], p_stakeholders: ['application', 'project'],
    p_construction_tasks: ['application', 'project'],
    p_materials: ['application', 'store', 'project'],
    p_storefront_material_requests: ['application', 'store', 'project'],
    p_stock_movements: ['application', 'store', 'project'], p_storefront_tasks: ['application', 'store', 'project'],
    p_material_requests: ['application', 'project', 'store'], p_purchase_requests: ['application', 'project', 'store'],
    p_purchase_orders: ['application', 'project', 'store'], p_goods_receipt: ['application', 'project', 'store'],
    p_procurement_tasks: ['application', 'project'],
    p_expenses: ['application', 'project', 'department'], p_budgets: ['application', 'project', 'department'],
    p_claims: ['application', 'project', 'department'], p_finance_tasks: ['application', 'project', 'department'],
    p_employees: ['application', 'department'], p_departments: ['application', 'department'],
    p_leave_requests: ['application', 'department'], p_attendance: ['application', 'project', 'department'],
    p_payroll: ['application', 'project', 'department'], p_workforce_allocation: ['application', 'project', 'department'],
    p_appraisals: ['application', 'department'], p_hr_tasks: ['application', 'project', 'department'],
};

type Actor = { userId: string; name?: string; email?: string };
const ADMIN_ROLE_NAMES = new Set(['admin', 'administrator', 'superadmin']);
const canonicalRole = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');

@Injectable()
export class ResponsibilitiesService {
    constructor(private readonly prisma: PrismaService, private readonly adminExtras: AdminExtrasService) {}

    private normalizeApp(app: string): DelegatedApp {
        const value = String(app ?? '').trim().toLowerCase();
        if (!DELEGATED_APPS.includes(value as DelegatedApp)) {
            throw new BadRequestException('Responsibilities can only be configured for Projects, Storefront, Procurement, Finance, or HR');
        }
        return value as DelegatedApp;
    }

    private async isAdmin(userId: string) {
        if (!userId) return false;
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, roles: { include: { role: { select: { name: true, isSuper: true } } } } },
        });
        if (!user) return false;
        if (ADMIN_ROLE_NAMES.has(canonicalRole(user.role))) return true;
        return user.roles.some((entry) => entry.role.isSuper || ADMIN_ROLE_NAMES.has(canonicalRole(entry.role.name)));
    }

    private activeWhere(now = new Date()) {
        return {
            active: true,
            validFrom: { lte: now },
            OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        };
    }

    private assignmentActiveWhere(now = new Date()) {
        return {
            status: 'active',
            validFrom: { lte: now },
            OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        };
    }

    async mayManage(appInput: string, actor: Actor, capability: 'configure' | 'assign' = 'assign') {
        const app = this.normalizeApp(appInput);
        if (await this.isAdmin(actor.userId)) return true;
        const owner = await this.prisma.applicationOwner.findFirst({
            where: { app, userId: actor.userId, ...this.activeWhere() },
        });
        return Boolean(owner && (capability === 'configure' ? owner.canConfigure : owner.canAssign));
    }

    private async assertMayManage(app: string, actor: Actor, capability: 'configure' | 'assign' = 'assign') {
        if (!(await this.mayManage(app, actor, capability))) {
            throw new ForbiddenException(`You are not authorised to manage ${app} responsibilities`);
        }
    }

    private async assertAdmin(actor: Actor) {
        if (!(await this.isAdmin(actor.userId))) {
            throw new ForbiddenException('Only an administrator can appoint application point persons');
        }
    }

    listApps() {
        return DELEGATED_APPS.map((app) => ({ app, scopeTypes: APP_SCOPE_TYPES[app] }));
    }

    async listAssignableUsers(appInput: string, actor: Actor) {
        const app = this.normalizeApp(appInput);
        await this.assertMayManage(app, actor, 'assign');
        return this.prisma.user.findMany({
            where: { status: { in: ['active', 'Active'] } },
            select: { id: true, name: true, email: true, role: true, assignedApps: true, status: true },
            orderBy: { name: 'asc' },
        });
    }

    async listProcesses(appInput: string, actor: Actor) {
        const app = this.normalizeApp(appInput);
        await this.assertMayManage(app, actor, 'assign');
        const catalog = await this.adminExtras.findProcessCatalog();
        return catalog
            .filter((process: any) => String(process.app).toLowerCase() === app)
            .map((process: any) => ({
                id: process.id,
                label: process.label,
                description: process.description,
                actions: Array.isArray(process.actions) ? process.actions : [],
                scopeTypes: PROCESS_SCOPE_TYPES[process.id] ?? ['application'],
            }));
    }

    async listResources(appInput: string, scopeTypeInput: string, actor: Actor) {
        const app = this.normalizeApp(appInput);
        await this.assertMayManage(app, actor, 'assign');
        const scopeType = String(scopeTypeInput ?? '').trim().toLowerCase();
        if (!APP_SCOPE_TYPES[app].includes(scopeType) || scopeType === 'application') {
            throw new BadRequestException('Choose a valid resource scope');
        }
        if (scopeType === 'project') {
            return this.prisma.project.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
        }
        if (scopeType === 'store') {
            return this.prisma.store.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
        }
        if (scopeType === 'department') {
            return this.prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
        }
        return [];
    }

    async listOwners(appInput: string) {
        const app = this.normalizeApp(appInput);
        return this.prisma.applicationOwner.findMany({
            where: { app },
            include: {
                user: { select: { id: true, name: true, email: true, role: true, assignedApps: true, status: true } },
                appointedBy: { select: { id: true, name: true, email: true } },
            },
            orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
        });
    }

    async appointOwner(appInput: string, data: any, actor: Actor) {
        const app = this.normalizeApp(appInput);
        await this.assertAdmin(actor);
        const userId = String(data?.userId ?? '').trim();
        if (!userId) throw new BadRequestException('Choose a point person');
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('Selected user no longer exists');
        // Each module has one accountable point person. Re-appointment transfers
        // that responsibility rather than creating a parallel ownership track.
        const owner = await this.prisma.$transaction(async (tx) => {
            await tx.applicationOwner.updateMany({
                where: { app, active: true, userId: { not: userId } },
                data: { active: false, validUntil: new Date() },
            });
            const appointed = await tx.applicationOwner.upsert({
                where: { app_userId: { app, userId } },
                create: {
                    app, userId, appointedById: actor.userId || null,
                    canConfigure: data?.canConfigure !== false, canAssign: data?.canAssign !== false,
                    validFrom: data?.validFrom ? new Date(data.validFrom) : new Date(),
                    validUntil: data?.validUntil ? new Date(data.validUntil) : null, active: true,
                },
                update: {
                    appointedById: actor.userId || null, canConfigure: data?.canConfigure !== false,
                    canAssign: data?.canAssign !== false,
                    ...(data?.validFrom ? { validFrom: new Date(data.validFrom) } : {}),
                    validUntil: data?.validUntil ? new Date(data.validUntil) : null, active: true,
                },
                include: { user: { select: { id: true, name: true, email: true, role: true, assignedApps: true, status: true } } },
            });
            if (!user.assignedApps.includes(app)) {
                await tx.user.update({ where: { id: userId }, data: { assignedApps: { push: app } } });
            }
            return appointed;
        });
        await this.audit(actor, 'APPLICATION_OWNER_APPOINTED', owner.id, null, { app, userId });
        return owner;
    }

    async revokeOwner(id: string, actor: Actor) {
        await this.assertAdmin(actor);
        const existing = await this.prisma.applicationOwner.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Application point person not found');
        const updated = await this.prisma.applicationOwner.update({ where: { id }, data: { active: false, validUntil: new Date() } });
        await this.audit(actor, 'APPLICATION_OWNER_REVOKED', id, existing, updated);
        return updated;
    }

    async listAssignments(appInput: string, actor: Actor) {
        const app = this.normalizeApp(appInput);
        const mayManage = await this.mayManage(app, actor);
        return this.prisma.applicationAssignment.findMany({
            where: { app, ...(mayManage ? {} : { userId: actor.userId }) },
            include: {
                user: { select: { id: true, name: true, email: true, role: true, assignedApps: true, status: true } },
                assignedBy: { select: { id: true, name: true, email: true } },
            },
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        });
    }

    async createAssignment(appInput: string, data: any, actor: Actor) {
        const app = this.normalizeApp(appInput);
        await this.assertMayManage(app, actor, 'assign');
        const userId = String(data?.userId ?? '').trim();
        const processId = String(data?.processId ?? '').trim();
        const scopeType = String(data?.scopeType ?? '').trim().toLowerCase();
        const scopeId = String(data?.scopeId ?? '').trim() || null;
        if (!userId) throw new BadRequestException('Choose a user');
        if (!processId) throw new BadRequestException('Choose a process');
        const process = (await this.listProcesses(app, actor)).find((entry: any) => entry.id === processId);
        if (!process) throw new BadRequestException('Choose a process that belongs to this application');
        if (!process.scopeTypes.includes(scopeType)) throw new BadRequestException(`The selected scope is not available for ${process.label}`);
        if (scopeType !== 'application' && !scopeId) throw new BadRequestException(`Choose the ${scopeType} being assigned`);
        if (scopeType === 'application' && scopeId) throw new BadRequestException('Application-wide assignments cannot include a resource ID');
        if (scopeId && ['project', 'store', 'department'].includes(scopeType)) {
            const exists = scopeType === 'project'
                ? await this.prisma.project.findUnique({ where: { id: scopeId }, select: { id: true } })
                : scopeType === 'store'
                    ? await this.prisma.store.findUnique({ where: { id: scopeId }, select: { id: true } })
                    : await this.prisma.department.findUnique({ where: { id: scopeId }, select: { id: true } });
            if (!exists) throw new BadRequestException(`The selected ${scopeType} no longer exists`);
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('Selected user no longer exists');
        const duplicate = await this.prisma.applicationAssignment.findFirst({
            where: { app, userId, processId, scopeType, scopeId, status: 'active' },
        });
        if (duplicate) throw new BadRequestException('This user already has that process and scope assignment');
        const requestedPermissions = Array.isArray(data?.permissions) ? data.permissions.map(String) : [];
        if (!requestedPermissions.length) throw new BadRequestException('Choose at least one permitted action');
        if (requestedPermissions.some((action: string) => !process.actions.includes(action))) {
            throw new BadRequestException('One or more selected actions are not supported by this process');
        }
        const assignment = await this.prisma.applicationAssignment.create({
            data: {
                app, userId, processId, processName: process.label, scopeType, scopeId,
                scopeName: String(data?.scopeName ?? '').trim() || null,
                responsibility: String(data?.responsibility ?? '').trim() || null,
                permissions: requestedPermissions,
                assignedById: actor.userId || null,
                validFrom: data?.validFrom ? new Date(data.validFrom) : new Date(),
                validUntil: data?.validUntil ? new Date(data.validUntil) : null,
            },
            include: {
                user: { select: { id: true, name: true, email: true, role: true, assignedApps: true, status: true } },
                assignedBy: { select: { id: true, name: true, email: true } },
            },
        });
        if (!user.assignedApps.includes(app)) {
            await this.prisma.user.update({ where: { id: userId }, data: { assignedApps: { push: app } } });
        }
        await this.audit(actor, 'APPLICATION_ASSIGNMENT_CREATED', assignment.id, null, assignment);
        return assignment;
    }

    async updateAssignment(id: string, data: any, actor: Actor) {
        const existing = await this.prisma.applicationAssignment.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Responsibility assignment not found');
        await this.assertMayManage(existing.app, actor, 'assign');
        const updated = await this.prisma.applicationAssignment.update({
            where: { id },
            data: {
                ...(data?.responsibility !== undefined ? { responsibility: String(data.responsibility).trim() || null } : {}),
                ...(data?.permissions !== undefined ? { permissions: Array.isArray(data.permissions) ? data.permissions.map(String) : [] } : {}),
                ...(data?.validUntil !== undefined ? { validUntil: data.validUntil ? new Date(data.validUntil) : null } : {}),
                ...(data?.status !== undefined ? { status: String(data.status) } : {}),
            },
            include: { user: { select: { id: true, name: true, email: true, role: true, assignedApps: true, status: true } } },
        });
        await this.audit(actor, 'APPLICATION_ASSIGNMENT_UPDATED', id, existing, updated);
        return updated;
    }

    async revokeAssignment(id: string, actor: Actor) {
        return this.updateAssignment(id, { status: 'revoked', validUntil: new Date().toISOString() }, actor);
    }

    async accessForUser(userId: string) {
        const admin = await this.isAdmin(userId);
        const now = new Date();
        const [owners, assignments, configured] = await Promise.all([
            this.prisma.applicationOwner.findMany({ where: { userId, ...this.activeWhere(now) } }),
            this.prisma.applicationAssignment.findMany({ where: { userId, ...this.assignmentActiveWhere(now) } }),
            // Once responsibility control has been enabled for an application,
            // revoking its owner must not silently restore unrestricted access.
            // Admin can appoint a replacement while existing delegated scopes
            // remain enforced.
            this.prisma.applicationOwner.findMany({
                select: { app: true },
                distinct: ['app'],
            }),
        ]);
        const configuredApps = new Set(configured.map((row) => row.app));
        return DELEGATED_APPS.map((app) => {
            const owner = owners.find((row) => row.app === app);
            const appAssignments = assignments.filter((row) => row.app === app);
            const unrestricted = admin || Boolean(owner) || !configuredApps.has(app)
                // Legacy application-wide assignments (created before process
                // delegation) retain their behaviour. A process assignment with
                // "all records" must not unlock unrelated processes.
                || appAssignments.some((row) => !row.processId && row.scopeType === 'application');
            return {
                app, configured: configuredApps.has(app), unrestricted,
                isOwner: Boolean(owner), canConfigure: admin || Boolean(owner?.canConfigure),
                canAssign: admin || Boolean(owner?.canAssign),
                assignments: appAssignments,
            };
        });
    }

    async allowedScopeIds(userId: string, appInput: string, scopeType: string, processId?: string): Promise<string[] | null> {
        const app = this.normalizeApp(appInput);
        const access = (await this.accessForUser(userId)).find((entry) => entry.app === app)!;
        if (access.unrestricted) return null;
        const relevant = access.assignments.filter((entry) => !processId || !entry.processId || entry.processId === processId);
        if (processId && relevant.some((entry) => entry.processId === processId && entry.scopeType === 'application')) return null;
        const direct = relevant
            .filter((entry) => entry.scopeType === scopeType && entry.scopeId)
            .map((entry) => entry.scopeId as string);
        // A Storefront project responsibility includes the store belonging to
        // that project, so users do not need a duplicate store assignment.
        if ((app === 'storefront' || app === 'procurement') && scopeType === 'store') {
            const projectIds = relevant
                .filter((entry) => entry.scopeType === 'project' && entry.scopeId)
                .map((entry) => entry.scopeId as string);
            if (projectIds.length) {
                const stores = await this.prisma.store.findMany({
                    where: { projectId: { in: projectIds } },
                    select: { id: true },
                });
                return [...new Set([...direct, ...stores.map((store) => store.id)])];
            }
        }
        return direct;
    }

    async assertScope(userId: string, appInput: string, scopeType: string, scopeId: string, processId?: string) {
        const allowed = await this.allowedScopeIds(userId, appInput, scopeType, processId);
        if (allowed !== null && !allowed.includes(scopeId)) {
            throw new ForbiddenException(`You are not assigned to this ${scopeType}`);
        }
    }

    async assertProcessAction(
        userId: string,
        appInput: string,
        processId: string,
        action: string,
        scopeType?: string,
        scopeId?: string,
    ) {
        const app = this.normalizeApp(appInput);
        const access = (await this.accessForUser(userId)).find((entry) => entry.app === app)!;
        if (access.unrestricted) return;
        const candidates = access.assignments.filter((entry) =>
            (!entry.processId || entry.processId === processId)
            && (!entry.processId || entry.permissions.includes(action)),
        );
        const allowed = candidates.some((entry) => {
            if (entry.scopeType === 'application') return true;
            return Boolean(scopeType && scopeId && entry.scopeType === scopeType && entry.scopeId === scopeId);
        });
        if (!allowed) throw new ForbiddenException(`You have not been delegated "${action}" responsibility for this process and scope`);
    }

    private audit(actor: Actor, action: string, entityId: string, oldValue: any, newValue: any) {
        return this.prisma.auditLog.create({ data: {
            userId: actor.userId || null, entity: 'ApplicationResponsibility', entityId, action,
            oldValue: oldValue as any, newValue: newValue as any,
            description: `${action.replace(/_/g, ' ')} by ${actor.name || actor.email || actor.userId}`,
        }});
    }
}
