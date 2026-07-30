import { Injectable, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailQueueService } from '../queue/mail-queue.service';
import type { EmailPayload } from '../email/email.service';
import { DEFAULT_PROCESS_CATALOG } from '../common/process-catalog';

const ADMIN_SETTINGS_KEY = 'admin-settings';

/**
 * Maps each email trigger to the Prisma model whose fields are exposed as
 * template variables ("the concerned table"), plus context-only variables
 * that exist at send time but not on the table (links, company name, …).
 */
const EMAIL_TRIGGER_SOURCES: Record<string, { model?: string; extras?: string[] }> = {
    // HR
    'Leave Request Submitted': { model: 'LeaveRequest' },
    'Leave Request Approved': { model: 'LeaveRequest' },
    'Leave Request Rejected': { model: 'LeaveRequest' },
    'Payroll Processed': { model: 'PayrollRun' },
    'Appraisal Cycle Opened': { model: 'Appraisal' },
    'Employee Onboarding Initiated': { model: 'Employee' },
    'Salary Advance Requested': { model: 'Claim' },
    // Procurement
    'Purchase Request Submitted': { model: 'PurchaseRequest' },
    'Purchase Request Approved': { model: 'PurchaseRequest' },
    'Purchase Order Approved': { model: 'PurchaseOrder' },
    'Send RFQ to Supplier': { model: 'SentRFQ', extras: ['supplier_name', 'supplier_email'] },
    'Send PO to Supplier': { model: 'PurchaseOrder', extras: ['supplier_name', 'supplier_email'] },
    'Invoice Received': { model: 'PurchaseInvoice' },
    'Invoice Overdue': { model: 'PurchaseInvoice' },
    'Material Request Approved': { model: 'MaterialRequest' },
    'Request Payment Confirmation': { model: 'Payment' },
    // Finance
    'Payment Processed': { model: 'Payment' },
    'Budget Exceeded': { model: 'Budget' },
    'Journal Entry Approved': { model: 'JournalEntry' },
    'Approval Notifications': { model: 'ApprovalRequest' },
    'WHT Certificate Generated': { model: 'Payment' },
    // Projects
    'Project Created': { model: 'Project' },
    'Milestone Completed': { model: 'Timeline' },
    'Project Delayed': { model: 'ProjectDelay' },
    'Resource Assigned': { model: 'ResourceAllocation' },
    'Contract Signed': { model: 'Contractor' },
    // ESS
    'Expense Claim Submitted': { model: 'Claim' },
    'Expense Claim Approved': { model: 'Claim' },
    'Travel Advance Requested': { model: 'Claim' },
    'Reimbursement Processed': { model: 'Claim' },
    // Admin
    'New User Created': { model: 'User', extras: ['activation_link', 'company_name'] },
    'Role Changed': { model: 'User', extras: ['role_name', 'company_name'] },
    'System Alert': { extras: ['system_message', 'action_date', 'company_name'] },
    'Login Failure (Threshold)': { model: 'User', extras: ['action_date', 'company_name'] },
    'Password Reset Requested': { model: 'User', extras: ['reset_link', 'company_name'] },
    // Storefront
    'Material Transferred': { model: 'StockTransfer' },
    'Low Stock Alert': { model: 'StoreItem', extras: ['material_name', 'store_name'] },
    'Stock Adjustment Made': { model: 'StockMovement' },
    'Procurement Request Sent': { model: 'MaterialRequest' },
};

/** Fields that make no sense as email variables. */
const EXCLUDED_VARIABLE_FIELDS = new Set(['password']);

function toSnakeCase(name: string): string {
    return name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

@Injectable()
export class AdminExtrasService {
    private readonly logger = new Logger(AdminExtrasService.name);

    constructor(
        private prisma: PrismaService,
        private mailQueue: MailQueueService,
    ) { }

    private settingsFilePath = path.join(process.cwd(), 'data', 'admin-settings.json');

    private readonly pendingInviteStatuses = ['pending_invite', 'invited', 'pending invite'];

    private allApps = ['construction', 'finance', 'hr', 'procurement', 'admin', 'ess', 'storefront'];

    /**
     * Non-admin roles the backend's @Roles(...) decorators already enforce.
     * Seeded on demand by ensureBaseRoles() so role dropdowns and guards agree.
     */
    private static readonly BASE_ROLES: { name: string; description: string; appScope: string[] }[] = [
        { name: 'Employee', description: 'Standard employee with self-service access', appScope: ['ess'] },
        { name: 'Manager', description: 'Line manager who approves their team\'s requests', appScope: ['ess', 'hr'] },
        { name: 'Team Lead', description: 'Team lead with task and resource assignment rights', appScope: ['ess', 'construction'] },
        { name: 'Approver', description: 'Reviews and approves submitted requests', appScope: ['ess'] },
        { name: 'HR Manager', description: 'Manages employees, payroll, leave and HR setup', appScope: ['ess', 'hr'] },
        { name: 'Finance Manager', description: 'Manages accounting, budgets and payments', appScope: ['ess', 'finance'] },
        { name: 'Procurement Manager', description: 'Manages suppliers, RFQs and purchase orders', appScope: ['ess', 'procurement'] },
        { name: 'Project Manager', description: 'Manages construction projects and delivery', appScope: ['ess', 'construction'] },
        { name: 'Resource Manager', description: 'Plans and allocates labour, plant and materials', appScope: ['ess', 'construction'] },
        { name: 'Compliance Officer', description: 'Reviews compliance documents and supplier vetting', appScope: ['ess', 'procurement'] },
    ];
    private readonly rolePermissionKeys = ['view', 'create', 'edit', 'approve', 'delete'];

    // Single source of truth for the system process catalog, shared with
    // PermissionsService so role configuration and enforcement read one list.
    private readonly defaultProcessCatalog = DEFAULT_PROCESS_CATALOG;

    // Nigerian defaults: BuildOS is deployed for a Nigerian construction group.
    // Only the fallback for a fresh install — Admin → General Settings overrides
    // them and is what every formatter actually reads.
    private readonly defaultGeneralSettings = {
        currency: 'NGN',
        currencySymbol: '₦',
        timezone: 'Africa/Lagos',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24',
        numberFormat: '1,234.56',
        fiscalYearStart: '01',
        language: 'en',
    };

    private readonly defaultStoreLevels = [
        { level: 1, name: 'Central Store', description: 'Primary warehouse — controls inventory distribution company-wide', color: 'teal', maxCount: 2 },
        { level: 2, name: 'Regional Hub', description: 'Non-project stores serving multiple projects (regions, zones, departments)', color: 'blue', maxCount: 5 },
        { level: 3, name: 'Project Store', description: 'Assigned to a specific project, receives materials from Level 1 or 2', color: 'purple', maxCount: null },
    ];

    private readonly defaultCurrencyOptions = [
        { label: 'US Dollar', value: 'USD', meta: '$' },
        { label: 'Euro', value: 'EUR', meta: '€' },
        { label: 'British Pound', value: 'GBP', meta: '£' },
        { label: 'Japanese Yen', value: 'JPY', meta: '¥' },
        { label: 'Chinese Yuan', value: 'CNY', meta: '¥' },
        { label: 'Indian Rupee', value: 'INR', meta: '₹' },
        { label: 'Nigerian Naira', value: 'NGN', meta: '₦' },
        { label: 'UAE Dirham', value: 'AED', meta: 'د.إ' },
        { label: 'Saudi Riyal', value: 'SAR', meta: '﷼' },
        { label: 'South African Rand', value: 'ZAR', meta: 'R' },
    ];

    private buildFullAdminPermissions(processCatalog: any[]) {
        const processPermissions = Object.fromEntries(
            (Array.isArray(processCatalog) ? processCatalog : []).map((proc: any) => [
                String(proc?.id ?? ''),
                {
                    view: true,
                    create: true,
                    edit: true,
                    approve: true,
                    delete: true,
                },
            ]),
        );

        const appAccess = Object.fromEntries(this.allApps.map((app) => [app, true]));

        return {
            processPermissions,
            appAccess,
            navAccess: {},
        };
    }

    private normalizeRolePermissionState(
        input: any,
        fallback?: {
            processPermissions?: Record<string, any>;
            appAccess?: Record<string, boolean>;
            navAccess?: Record<string, boolean>;
        },
    ) {
        const source = input && typeof input === 'object' ? input : fallback ?? {};

        const processPermissionsSource =
            source?.processPermissions && typeof source.processPermissions === 'object'
                ? source.processPermissions
                : {};
        const appAccessSource = source?.appAccess && typeof source.appAccess === 'object' ? source.appAccess : {};
        const navAccessSource = source?.navAccess && typeof source.navAccess === 'object' ? source.navAccess : {};

        const processPermissions: Record<string, Record<string, boolean>> = {};
        for (const [processId, processPerms] of Object.entries(processPermissionsSource)) {
            if (!processId) continue;
            const normalizedPerms = Object.fromEntries(
                this.rolePermissionKeys.map((key) => [key, Boolean((processPerms as any)?.[key])]),
            );
            processPermissions[processId] = normalizedPerms;
        }

        const appAccess = Object.fromEntries(
            this.allApps.map((app) => [app, Boolean((appAccessSource as any)?.[app])]),
        ) as Record<string, boolean>;

        const navAccess: Record<string, boolean> = {};
        for (const [navId, allowed] of Object.entries(navAccessSource)) {
            if (!navId) continue;
            navAccess[navId] = Boolean(allowed);
        }

        return { processPermissions, appAccess, navAccess };
    }

    private encodeRolePermissionState(state: {
        processPermissions: Record<string, Record<string, boolean>>;
        appAccess: Record<string, boolean>;
        navAccess: Record<string, boolean>;
    }) {
        const appScope = this.allApps.filter((app) => Boolean(state.appAccess?.[app]));
        const inheritedRoles: string[] = [];

        for (const [processId, processPerms] of Object.entries(state.processPermissions ?? {})) {
            for (const key of this.rolePermissionKeys) {
                if ((processPerms as any)?.[key]) {
                    inheritedRoles.push(`proc:${processId}:${key}`);
                }
            }
        }

        for (const [navId, allowed] of Object.entries(state.navAccess ?? {})) {
            if (allowed) {
                inheritedRoles.push(`nav:${navId}`);
            }
        }

        return {
            appScope,
            inheritedRoles: Array.from(new Set(inheritedRoles)),
        };
    }

    private decodeRolePermissionState(role: any) {
        const appAccess = Object.fromEntries(this.allApps.map((app) => [app, false])) as Record<string, boolean>;
        for (const app of Array.isArray(role?.appScope) ? role.appScope : []) {
            const normalized = String(app || '').trim().toLowerCase();
            if (this.allApps.includes(normalized)) {
                appAccess[normalized] = true;
            }
        }

        const processPermissions: Record<string, Record<string, boolean>> = {};
        const navAccess: Record<string, boolean> = {};

        for (const entry of Array.isArray(role?.inheritedRoles) ? role.inheritedRoles : []) {
            const raw = String(entry || '');
            if (raw.startsWith('proc:')) {
                const [, processId, key] = raw.split(':');
                if (!processId || !key || !this.rolePermissionKeys.includes(key)) continue;
                const current = processPermissions[processId] || Object.fromEntries(this.rolePermissionKeys.map((k) => [k, false]));
                current[key] = true;
                processPermissions[processId] = current;
            } else if (raw.startsWith('nav:')) {
                const navId = raw.slice(4);
                if (!navId) continue;
                navAccess[navId] = true;
            }
        }

        return {
            processPermissions,
            appAccess,
            navAccess,
        };
    }

    private normalizeBaseUrl(value: string): string {
        return String(value || '').trim().replace(/\/$/, '');
    }

    private normalizeStatus(status: unknown): string {
        const raw = String(status ?? '').trim().toLowerCase();
        if (raw === 'active') return 'Active';
        if (raw === 'inactive') return 'Inactive';
        if (this.pendingInviteStatuses.includes(raw)) return 'pending_invite';
        return String(status ?? '').trim();
    }

    private isPendingInviteStatus(status: unknown): boolean {
        const raw = String(status ?? '').trim().toLowerCase();
        return this.pendingInviteStatuses.includes(raw);
    }

    private async resolveCompanyUserIdPrefix(): Promise<string> {
        const profile = await this.prisma.companyProfile
            .findUnique({ where: { id: 'singleton' }, select: { name: true } })
            .catch(() => null);

        const words = String(profile?.name ?? 'BuildOS')
            .replace(/[^a-zA-Z0-9\s]/g, ' ')
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        const prefix = words.length > 1
            ? words.map((word) => word[0]).join('')
            : String(words[0] ?? 'BOS').slice(0, 3);

        return prefix.toUpperCase().slice(0, 4) || 'BOS';
    }

    private formatBusinessUserId(user: { id: string; createdAt?: Date | string }, prefix: string): string {
        const created = user.createdAt ? new Date(user.createdAt) : new Date();
        const yymm = `${String(created.getUTCFullYear()).slice(-2)}${String(created.getUTCMonth() + 1).padStart(2, '0')}`;
        const suffix = user.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase().padStart(6, '0');
        return `${prefix}-${yymm}-${suffix}`;
    }

    private async ensureUserId(
        user: { id: string; createdAt?: Date | string; userId?: string | null },
        prefix: string,
    ): Promise<string> {
        const existing = String(user.userId ?? '').trim();
        if (existing) {
            return existing;
        }

        const generated = this.formatBusinessUserId(user, prefix);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { userId: generated },
        });
        return generated;
    }

    private shapeUserResponse(
        user: {
            id: string;
            userId?: string | null;
            name: string;
            email: string;
            role: string;
            department: string | null;
            phone: string | null;
            status: string;
            lastLogin?: Date | null;
            assignedApps: string[];
            createdAt: Date;
        },
        prefix: string,
    ) {
        return {
            ...user,
            status: this.normalizeStatus(user.status),
            userId: String(user.userId ?? '').trim() || this.formatBusinessUserId(user, prefix),
        };
    }

    private formatRoleResponse(role: any) {
        return {
            ...role,
            permissions: this.decodeRolePermissionState(role),
        };
    }

    private async ensureAdminRole() {
        const settings = await this.readAdminSettings();
        const fullPermissions = this.buildFullAdminPermissions(
            this.mergeProcessCatalog(settings.processCatalog),
        );
        const encoded = this.encodeRolePermissionState(this.normalizeRolePermissionState(fullPermissions));

        await this.prisma.appRole.upsert({
            where: { name: 'Admin' },
            create: {
                name: 'Admin',
                description: 'System administrator with unrestricted access',
                isSuper: true,
                appScope: encoded.appScope,
                inheritedRoles: encoded.inheritedRoles,
            },
            update: {
                description: 'System administrator with unrestricted access',
                isSuper: true,
                appScope: encoded.appScope,
                inheritedRoles: encoded.inheritedRoles,
            },
        });

        await this.ensureBaseRoles();
    }

    /**
     * The backend's @Roles(...) guards reference role names that had no matching
     * AppRole row, so the Admin → Roles list and every role dropdown only ever
     * offered "Admin". That left callers inventing unbacked strings (employee
     * onboarding used to hard-code role: 'employee'). These upserts give every
     * guard-referenced role a real row; appScope mirrors the modules each role
     * is expected to reach. Role matching is case-insensitive in RolesGuard, so
     * "Employee" here satisfies @Roles('employee').
     */
    private async ensureBaseRoles() {
        for (const role of AdminExtrasService.BASE_ROLES) {
            await this.prisma.appRole.upsert({
                where: { name: role.name },
                create: { name: role.name, description: role.description, appScope: role.appScope },
                // Only backfill the description/scope of a role nobody has customised;
                // an admin editing permissions in the UI must not be overwritten here.
                update: {},
            });
        }
    }

    /**
     * Resolves a caller-supplied role string to the canonical AppRole.name, so a
     * user can never be created against a role that does not exist. Matching is
     * case- and separator-insensitive ("hr-manager", "HR Manager", "hr manager"
     * all resolve to "HR Manager") because RolesGuard compares case-insensitively
     * and callers historically passed kebab-case guard strings.
     */
    private async resolveRoleName(role: string): Promise<string> {
        await this.ensureAdminRole();
        const canonical = (value: string) => value.trim().toLowerCase().replace(/[\s_-]+/g, '');
        const target = canonical(role);
        const roles = await this.prisma.appRole.findMany({ select: { name: true } });
        const match = roles.find((r) => canonical(r.name) === target);
        if (!match) {
            const available = roles.map((r) => r.name).sort().join(', ');
            throw new BadRequestException(
                `Unknown role "${role}". Available roles: ${available}`,
            );
        }
        return match.name;
    }

    private async loadRawAdminSettings(): Promise<Record<string, any>> {
        // Primary store: database (survives restarts/redeploys, shared across instances).
        try {
            const row = await this.prisma.systemSetting.findUnique({ where: { key: ADMIN_SETTINGS_KEY } });
            if (row && row.value && typeof row.value === 'object' && !Array.isArray(row.value)) {
                return row.value as Record<string, any>;
            }
        } catch (error) {
            this.logger.warn(`Could not read admin settings from database: ${(error as Error).message}`);
        }

        // Legacy fallback: migrate the on-disk JSON file into the database once.
        try {
            const raw = await fs.readFile(this.settingsFilePath, 'utf-8');
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                await this.prisma.systemSetting
                    .upsert({
                        where: { key: ADMIN_SETTINGS_KEY },
                        create: { key: ADMIN_SETTINGS_KEY, value: parsed },
                        update: {},
                    })
                    .catch(() => undefined);
                return parsed;
            }
        } catch {
            // No legacy file — fall through to defaults.
        }

        return {};
    }

    private async readAdminSettings() {
        const parsed = await this.loadRawAdminSettings();
        return {
            issueTypes: Array.isArray(parsed.issueTypes) ? parsed.issueTypes : [],
            changeCategories: Array.isArray(parsed.changeCategories) ? parsed.changeCategories : [],
            processCatalog: Array.isArray(parsed.processCatalog) ? parsed.processCatalog : [],
            processWorkflows: Array.isArray(parsed.processWorkflows) ? parsed.processWorkflows : [],
            emailConfigs: Array.isArray(parsed.emailConfigs) ? parsed.emailConfigs : [],
            apiKeys: Array.isArray(parsed.apiKeys) ? parsed.apiKeys : [],
            webhooks: Array.isArray(parsed.webhooks) ? parsed.webhooks : [],
            reportTemplates: Array.isArray(parsed.reportTemplates) ? parsed.reportTemplates : [],
            emailTemplates: Array.isArray(parsed.emailTemplates) ? parsed.emailTemplates : [],
            notificationRules: Array.isArray(parsed.notificationRules) ? parsed.notificationRules : [],
            reportSchedules: Array.isArray(parsed.reportSchedules) ? parsed.reportSchedules : [],
            generalSettings: parsed?.generalSettings && typeof parsed.generalSettings === 'object'
                ? { ...this.defaultGeneralSettings, ...parsed.generalSettings }
                : { ...this.defaultGeneralSettings },
            currencyOptions: Array.isArray(parsed?.currencyOptions)
                ? parsed.currencyOptions
                    .map((item: any) => ({
                        label: String(item?.label ?? '').trim(),
                        value: String(item?.value ?? '').trim().toUpperCase(),
                        meta: String(item?.meta ?? '').trim(),
                    }))
                    .filter((item: any) => item.label && item.value)
                : [...this.defaultCurrencyOptions],
            storeLevels: Array.isArray(parsed?.storeLevels) && parsed.storeLevels.length
                ? parsed.storeLevels
                : [...this.defaultStoreLevels],
            storeThresholds: Array.isArray(parsed?.storeThresholds) ? parsed.storeThresholds : [],
            units: Array.isArray(parsed?.units) ? parsed.units : [],
            materialCategories: Array.isArray(parsed?.materialCategories) ? parsed.materialCategories : [],
        };
    }

    private async writeAdminSettings(data: {
        issueTypes: any[];
        changeCategories: any[];
        processCatalog: any[];
        processWorkflows: any[];
        emailConfigs?: any[];
        apiKeys?: any[];
        webhooks?: any[];
        reportTemplates?: any[];
        generalSettings: any;
        currencyOptions: any[];
        storeLevels?: any[];
        storeThresholds?: any[];
        units?: any[];
        materialCategories?: any[];
        emailTemplates?: any[];
        notificationRules?: any[];
        reportSchedules?: any[];
    }) {
        // Persist as a single JSON document in the database. JSON round-trip
        // strips any `undefined` values which Prisma's Json input rejects.
        const value = JSON.parse(JSON.stringify(data));
        await this.prisma.systemSetting.upsert({
            where: { key: ADMIN_SETTINGS_KEY },
            create: { key: ADMIN_SETTINGS_KEY, value },
            update: { value },
        });
    }

    async getStoreLevels() {
        const settings = await this.readAdminSettings();
        return settings.storeLevels;
    }

    async updateStoreLevels(levels: any[]) {
        if (!Array.isArray(levels)) throw new BadRequestException('Store levels must be an array');
        const normalized = levels.map((l: any) => ({
            level: Number(l?.level),
            name: String(l?.name ?? '').trim(),
            description: String(l?.description ?? '').trim(),
            color: String(l?.color ?? 'teal').trim() || 'teal',
            maxCount:
                l?.maxCount === null || l?.maxCount === undefined || l?.maxCount === ''
                    ? null
                    : Number(l.maxCount),
        }));
        if (normalized.some((l) => !l.level || !l.name)) {
            throw new BadRequestException('Each store level requires a level number and name');
        }
        const settings = await this.readAdminSettings();
        settings.storeLevels = normalized;
        await this.writeAdminSettings(settings);
        return settings.storeLevels;
    }

    async getStoreThresholds() {
        const settings = await this.readAdminSettings();
        return settings.storeThresholds;
    }

    async updateStoreThresholds(thresholds: any[]) {
        if (!Array.isArray(thresholds)) throw new BadRequestException('Store thresholds must be an array');
        const normalized = thresholds.map((t: any) => ({
            id: String(t?.id ?? '').trim() || crypto.randomUUID(),
            storeName: String(t?.storeName ?? '').trim(),
            storeType: t?.storeType === 'Project' ? 'Project' : 'General',
            lowStockQty: Number(t?.lowStockQty ?? 0),
            outOfStockQty: Number(t?.outOfStockQty ?? 0),
            unit: String(t?.unit ?? '%').trim() || '%',
        }));
        if (normalized.some((t) => !t.storeName)) {
            throw new BadRequestException('Each store threshold requires a store name');
        }
        const settings = await this.readAdminSettings();
        settings.storeThresholds = normalized;
        await this.writeAdminSettings(settings);
        return settings.storeThresholds;
    }

    async getGeneralSettings() {
        const settings = await this.readAdminSettings();
        return {
            generalSettings: settings.generalSettings,
            currencyOptions: settings.currencyOptions,
        };
    }

    async updateGeneralSettings(data: any) {
        const settings = await this.readAdminSettings();
        const nextGeneralSettings = {
            ...this.defaultGeneralSettings,
            ...(data?.generalSettings ?? {}),
        };

        const rawCurrencyOptions = Array.isArray(data?.currencyOptions)
            ? data.currencyOptions
            : settings.currencyOptions;
        const normalizedCurrencyOptions = rawCurrencyOptions
            .map((item: any) => ({
                label: String(item?.label ?? '').trim(),
                value: String(item?.value ?? '').trim().toUpperCase(),
                meta: String(item?.meta ?? '').trim(),
            }))
            .filter((item: any) => item.label && item.value);

        if (!nextGeneralSettings.currency) {
            throw new BadRequestException('Default currency is required');
        }
        if (!normalizedCurrencyOptions.some((item: any) => item.value === nextGeneralSettings.currency)) {
            throw new BadRequestException('Default currency must exist in currency options');
        }

        settings.generalSettings = nextGeneralSettings;
        settings.currencyOptions = normalizedCurrencyOptions;
        await this.writeAdminSettings(settings);

        return {
            generalSettings: settings.generalSettings,
            currencyOptions: settings.currencyOptions,
        };
    }

    private normalizeProcessCatalogItem(input: any) {
        const id = String(input?.id ?? '').trim() || crypto.randomUUID();
        const label = String(input?.label ?? '').trim();
        const app = String(input?.app ?? '').trim();
        const description = String(input?.description ?? '').trim();

        if (!label) throw new BadRequestException('Process label is required');
        if (!app) throw new BadRequestException('Process app is required');

        // `actions` is the set of permissions this process supports. Anything not
        // listed is omitted from the permission matrices rather than shown as an
        // unticked box, so a verb with no workflow behind it cannot be granted.
        // An omitted list means the full lifecycle.
        const known = ['view', 'create', 'edit', 'approve', 'delete'];
        const actions = Array.isArray(input?.actions)
            ? (input.actions as unknown[])
                  .map((a) => String(a).trim().toLowerCase())
                  .filter((a) => known.includes(a))
            : known;
        if (actions.length === 0) {
            throw new BadRequestException('A process must support at least one permission');
        }

        // Kept consistent rather than independently settable: a process requires
        // approval exactly when it exposes the Approve permission.
        const requiresApproval = actions.includes('approve');

        return {
            id,
            label,
            app,
            description,
            actions,
            requiresApproval,
        };
    }

    // Merge the module-derived default catalog with any persisted custom items.
    // Persisted entries override defaults by id, so the developed module
    // processes are always present while custom additions and edits are kept.
    private mergeProcessCatalog(persisted: any[]) {
        const byId = new Map<string, any>();
        for (const item of this.defaultProcessCatalog) {
            byId.set(item.id, item);
        }
        for (const item of Array.isArray(persisted) ? persisted : []) {
            const id = String(item?.id ?? '').trim();
            if (id) byId.set(id, item);
        }
        return Array.from(byId.values());
    }

    async findProcessCatalog() {
        const settings = await this.readAdminSettings();
        return this.mergeProcessCatalog(settings.processCatalog);
    }

    async createProcessCatalogItem(data: any) {
        const settings = await this.readAdminSettings();
        const next = this.normalizeProcessCatalogItem(data);

        if (this.mergeProcessCatalog(settings.processCatalog).some((item: any) => item.id === next.id)) {
            throw new ConflictException('Process id already exists');
        }

        settings.processCatalog.push(next);
        await this.writeAdminSettings(settings);
        await this.ensureAdminRole();
        return next;
    }

    async updateProcessCatalogItem(id: string, data: any) {
        const settings = await this.readAdminSettings();
        const idx = settings.processCatalog.findIndex((item: any) => item.id === id);

        if (idx >= 0) {
            const merged = {
                ...settings.processCatalog[idx],
                ...data,
                id,
            };
            settings.processCatalog[idx] = this.normalizeProcessCatalogItem(merged);
        } else {
            // Editing a default (module-derived) process — persist an override
            // so the change is saved without losing the rest of the catalog.
            const fallback = this.defaultProcessCatalog.find((item: any) => item.id === id);
            if (!fallback) throw new BadRequestException('Process not found');
            const merged = {
                ...fallback,
                ...data,
                id,
            };
            settings.processCatalog.push(this.normalizeProcessCatalogItem(merged));
        }

        await this.writeAdminSettings(settings);
        await this.ensureAdminRole();
        return settings.processCatalog.find((item: any) => item.id === id);
    }

    async deleteProcessCatalogItem(id: string) {
        const settings = await this.readAdminSettings();
        settings.processCatalog = settings.processCatalog.filter((item: any) => item.id !== id);
        settings.processWorkflows = settings.processWorkflows.filter((item: any) => item.processId !== id);
        await this.writeAdminSettings(settings);
        await this.ensureAdminRole();
        return { ok: true };
    }

    private normalizeProcessWorkflowItem(input: any) {
        const id = String(input?.id ?? '').trim() || crypto.randomUUID();
        const processId = String(input?.processId ?? '').trim();
        const process = String(input?.process ?? '').trim();
        const app = String(input?.app ?? '').trim();
        const workflowType = String(input?.workflowType ?? '').trim().toLowerCase();

        if (!processId) throw new BadRequestException('Workflow processId is required');
        if (!process) throw new BadRequestException('Workflow process is required');
        if (!app) throw new BadRequestException('Workflow app is required');
        if (!['single', 'group', 'tier'].includes(workflowType)) {
            throw new BadRequestException('Workflow type must be one of single, group, or tier');
        }

        const approver = input?.approver ? String(input.approver).trim() : undefined;
        const groupApprovers = Array.isArray(input?.groupApprovers)
            ? input.groupApprovers.map((item: any) => String(item).trim()).filter(Boolean)
            : undefined;
        // Group approval mode: 'any' (OR \u2014 a single approver suffices) or
        // 'all' (AND \u2014 every listed approver must approve). Defaults to 'all'
        // so workflows persisted before this field existed keep their stricter
        // behaviour. Only meaningful for group workflows.
        const groupApprovalModeRaw = String(input?.groupApprovalMode ?? '').trim().toLowerCase();
        const groupApprovalMode =
            workflowType === 'group'
                ? (groupApprovalModeRaw === 'any' ? 'any' : 'all')
                : undefined;
        const tierLevels = Array.isArray(input?.tierLevels)
            ? input.tierLevels.map((item: any, index: number) => ({
                level: Number(item?.level ?? index + 1),
                approver: String(item?.approver ?? '').trim(),
                condition: String(item?.condition ?? '').trim(),
            }))
            : undefined;

        return {
            id,
            processId,
            process,
            app,
            workflowType,
            approver,
            groupApprovers,
            groupApprovalMode,
            tierLevels,
        };
    }

    async findProcessWorkflows() {
        const settings = await this.readAdminSettings();
        return settings.processWorkflows;
    }

    async createProcessWorkflow(data: any) {
        const settings = await this.readAdminSettings();
        const next = this.normalizeProcessWorkflowItem(data);

        if (settings.processWorkflows.some((item: any) => item.id === next.id)) {
            throw new ConflictException('Workflow id already exists');
        }
        if (settings.processWorkflows.some((item: any) => item.processId === next.processId)) {
            throw new ConflictException('A workflow is already configured for this process');
        }

        settings.processWorkflows.push(next);
        await this.writeAdminSettings(settings);
        return next;
    }

    async updateProcessWorkflow(id: string, data: any) {
        const settings = await this.readAdminSettings();
        const idx = settings.processWorkflows.findIndex((item: any) => item.id === id);
        if (idx < 0) throw new BadRequestException('Workflow not found');

        const merged = {
            ...settings.processWorkflows[idx],
            ...data,
            id,
        };
        const normalized = this.normalizeProcessWorkflowItem(merged);
        if (settings.processWorkflows.some((item: any, i: number) => i !== idx && item.processId === normalized.processId)) {
            throw new ConflictException('A workflow is already configured for this process');
        }
        settings.processWorkflows[idx] = normalized;
        await this.writeAdminSettings(settings);
        return settings.processWorkflows[idx];
    }

    async deleteProcessWorkflow(id: string) {
        const settings = await this.readAdminSettings();
        settings.processWorkflows = settings.processWorkflows.filter((item: any) => item.id !== id);
        await this.writeAdminSettings(settings);
        return { ok: true };
    }

    private async sendInviteEmail(email: string, name: string, activationLink: string): Promise<void> {
                const companyProfile = await this.prisma.companyProfile.findUnique({ where: { id: 'singleton' } }).catch(() => null);
                const companyName = String(companyProfile?.name ?? '').trim() || 'BuildOS';

                // Admin-configured template ("New User Created") takes
                // precedence over the built-in invite email.
                try {
                    const userRecord = await this.prisma.user
                        .findUnique({ where: { email } })
                        .catch(() => null);
                    const vars = {
                        ...this.toTemplateVars(userRecord as any),
                        name,
                        user_name: name,
                        email,
                        user_email: email,
                        activation_link: activationLink,
                        company_name: companyName,
                    };
                    const templated = await this.composeTemplatedEmail('New User Created', vars);
                    if (templated) {
                        await this.mailQueue.enqueueEmail({
                            to: email,
                            subject: templated.subject || `Activate your ${companyName} account`,
                            text: `${templated.text}\n\nActivate your account: ${activationLink}`,
                            html: `${templated.html}<p style="margin:16px 0 0;font-family:Segoe UI,Arial,sans-serif;"><a href="${this.escapeHtml(activationLink)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:10px;">Activate Account</a></p>`,
                            ...(templated.cc.length > 0 ? { cc: templated.cc } : {}),
                        });
                        return;
                    }
                } catch (error) {
                    this.logger.warn(
                        `Falling back to default invite email; template failed: ${(error as Error).message}`,
                    );
                }

                const logo = this.resolveInviteLogo(companyProfile?.logoUrl);
                const escapedName = this.escapeHtml(name);
                const escapedCompanyName = this.escapeHtml(companyName);
                const escapedActivationLink = this.escapeHtml(activationLink);

                const payload: EmailPayload = {
                    to: email,
                    subject: `Activate your ${companyName} account`,
                    text: `Hi ${name},\n\nYou have been invited to ${companyName}. Activate your account here: ${activationLink}\n\nThis link expires in 7 days.`,
                    html: `
<!doctype html>
<html lang="en">
    <body style="margin:0;padding:0;background:#f3f8ff;font-family:Segoe UI,Arial,sans-serif;color:#1f2937;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px;">
            <tr>
                <td align="center">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dbeafe;border-radius:18px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,0.08);">
                        <tr>
                            <td style="background:linear-gradient(135deg,#1d4ed8,#2563eb);padding:28px 28px 20px;color:#ffffff;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td style="vertical-align:middle;">
                                            <img src="${this.escapeHtml(logo.src)}" alt="${escapedCompanyName} logo" width="36" height="36" style="display:inline-block;border-radius:8px;background:#ffffff;padding:4px;vertical-align:middle;" />
                                            <span style="display:inline-block;margin-left:10px;font-size:22px;font-weight:700;vertical-align:middle;letter-spacing:0.2px;">${escapedCompanyName}</span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:28px;">
                                <p style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111827;">Activate your account</p>
                                <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151;">Hi ${escapedName},</p>
                                <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#374151;">You have been invited to join <strong>${escapedCompanyName}</strong> on BuildOS. Click the button below to activate your account and set your password.</p>
                                <p style="margin:0 0 24px;">
                                    <a href="${escapedActivationLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:10px;">Activate Account</a>
                                </p>
                                <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6;">If the button does not work, use this link:</p>
                                <p style="margin:0 0 18px;font-size:13px;word-break:break-all;"><a href="${escapedActivationLink}" style="color:#2563eb;text-decoration:underline;">${escapedActivationLink}</a></p>
                                <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">This activation link expires in 7 days.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
</html>`,
        };

        if (logo.attachments.length > 0) {
            payload.attachments = logo.attachments;
        }

        await this.mailQueue.enqueueEmail(payload);
    }

    private resolveInviteLogo(
        logoUrl: string | null | undefined,
    ): {
        src: string;
        attachments: Array<{ filename: string; content: string; content_id: string }>;
    } {
        const raw = String(logoUrl ?? '').trim();
        const cid = 'buildos-logo';

        const dataMatch = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i);
        if (dataMatch?.[1] && dataMatch?.[2]) {
            const mime = dataMatch[1].toLowerCase();
            const base64 = dataMatch[2].replace(/\s+/g, '');
            const ext =
                mime === 'image/png'
                    ? 'png'
                    : mime === 'image/webp'
                        ? 'webp'
                        : mime === 'image/gif'
                            ? 'gif'
                            : mime === 'image/svg+xml'
                                ? 'svg'
                                : 'jpg';

            return {
                src: `cid:${cid}`,
                attachments: [
                    {
                        filename: `logo.${ext}`,
                        content: base64,
                        content_id: cid,
                    },
                ],
            };
        }

        if (/^https?:\/\//i.test(raw)) {
            return { src: raw, attachments: [] };
        }

        if (raw.startsWith('/')) {
            return {
                src: `${this.getFrontendBaseUrl()}${raw}`,
                attachments: [],
            };
        }

        const defaultLogoDataUrl = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSI+CiAgPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNiIgZmlsbD0iIzBmMTcyYSIvPgogIDxwYXRoIGQ9Ik02IDI2VjE0bDEwLTggMTAgOHYxMkg2eiIgZmlsbD0iI2Y5NzMxNiIgb3BhY2l0eT0iMC4xNSIvPgogIDxwYXRoIGQ9Ik02IDI2VjE0bDEwLTggMTAgOHYxMiIgc3Ryb2tlPSIjZjk3MzE2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KICA8cmVjdCB4PSIxMyIgeT0iMTgiIHdpZHRoPSI2IiBoZWlnaHQ9IjgiIHJ4PSIxIiBmaWxsPSIjZjk3MzE2Ii8+CiAgPHJlY3QgeD0iOSIgeT0iMTYiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIHJ4PSIwLjUiIGZpbGw9IiNmOTczMTYiIG9wYWNpdHk9IjAuNyIvPgogIDxyZWN0IHg9IjE5IiB5PSIxNiIgd2lkdGg9IjQiIGhlaWdodD0iNCIgcng9IjAuNSIgZmlsbD0iI2Y5NzMxNiIgb3BhY2l0eT0iMC43Ii8+Cjwvc3ZnPgo=';

        return {
            src: defaultLogoDataUrl,
            attachments: [],
        };
    }

    private getFrontendBaseUrl(): string {
        const configured = this.normalizeBaseUrl(process.env.FRONTEND_URL || process.env.APP_WEB_URL || '');
        if (configured) return configured;

        const appUrl = this.normalizeBaseUrl(process.env.APP_URL || '');
        if (appUrl) {
            this.logger.warn(`FRONTEND_URL not configured. Falling back to APP_URL for links: ${appUrl}`);
            return appUrl;
        }

        const fallbackUrl = process.env.NODE_ENV === 'production'
            ? 'https://build-os-delta.vercel.app'
            : 'http://localhost:5173';
        this.logger.warn(`FRONTEND_URL not configured. Using fallback: ${fallbackUrl}.`);
        return fallbackUrl;
    }

        private buildActivationLink(token: string): string {
                return `${this.getFrontendBaseUrl()}/auth/activate?token=${encodeURIComponent(token)}`;
        }

        private escapeHtml(value: string): string {
                return String(value)
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;');
        }

    private normalizeApprovalStatus(status: string) {
        const s = String(status || '').toLowerCase();
        if (s.includes('reject')) return 'rejected';
        if (s.includes('approve') || s.includes('paid') || s.includes('complete')) return 'approved';
        return 'pending';
    }

    private normalizeAssignedApps(input: unknown, role?: string): string[] {
        const normalizedRole = String(role ?? '').trim().toLowerCase();
        const defaultApps = ['ess'];
        
        // For admin role, only return all apps if no specific apps were provided
        if (normalizedRole.includes('admin')) {
            const hasSpecificApps = Array.isArray(input) && input.length > 0;
            if (!hasSpecificApps) return this.allApps;
            // Otherwise fall through to normalize the provided apps
        }

        if (!Array.isArray(input)) return defaultApps;

        const allowed = new Set(this.allApps);
        const normalized = Array.from(
            new Set(
                input
                    .map((item) => String(item || '').trim().toLowerCase())
                    .filter((item) => allowed.has(item)),
            ),
        );

        if (!normalized.includes('ess')) normalized.unshift('ess');
        return normalized.length > 0 ? normalized : defaultApps;
    }

    /**
     * Maps an approval row `type` to the admin process-catalog id whose
     * configured ProcessWorkflow defines its approval flow.
     */
    private approvalProcessIdForType(type: string): string | null {
        switch (type) {
            case 'Leave Request':
                return 'p_ess_leave_request';
            case 'Expense Claim':
                return 'p_ess_expense_claim';
            case 'Purchase Request':
                return 'p_ess_submit_request';
            default:
                return null;
        }
    }

    /**
     * Resolves a configured ProcessWorkflow into a flat, UI-friendly approval
     * flow (ordered list of approver stages). Returns null when no workflow is
     * configured for the process.
     */
    private resolveApprovalFlow(workflow: any): {
        workflowType: 'single' | 'group' | 'tier';
        approvers: string[];
        tierLevels?: { level: number; approver: string; condition: string }[];
    } | null {
        if (!workflow) return null;
        const workflowType = workflow.workflowType as 'single' | 'group' | 'tier';
        if (workflowType === 'single') {
            return { workflowType, approvers: workflow.approver ? [workflow.approver] : [] };
        }
        if (workflowType === 'group') {
            return { workflowType, approvers: Array.isArray(workflow.groupApprovers) ? workflow.groupApprovers : [] };
        }
        if (workflowType === 'tier') {
            const tierLevels = Array.isArray(workflow.tierLevels)
                ? [...workflow.tierLevels].sort((a, b) => Number(a.level) - Number(b.level))
                : [];
            return {
                workflowType,
                approvers: tierLevels.map((t) => t.approver).filter(Boolean),
                tierLevels,
            };
        }
        return null;
    }

    async findApprovals(module?: string) {
        const target = String(module || 'all').toLowerCase();
        const rows: any[] = [];

        // Load admin-configured process workflows once and index by processId so
        // each approval row can advertise the approval flow defined by the admin.
        const settings = await this.readAdminSettings();
        const workflowByProcessId = new Map<string, any>(
            (Array.isArray(settings.processWorkflows) ? settings.processWorkflows : []).map(
                (w: any) => [w.processId, w],
            ),
        );
        const flowForType = (type: string) => {
            const processId = this.approvalProcessIdForType(type);
            if (!processId) return null;
            return this.resolveApprovalFlow(workflowByProcessId.get(processId));
        };

        if (target === 'all' || target === 'hr' || target === 'ess') {
            const leaveRequests = await this.prisma.leaveRequest.findMany({
                include: { employee: { include: { department: true } }, leaveType: true },
                orderBy: { submittedAt: 'desc' },
            });
            rows.push(...leaveRequests.map((r) => ({
                id: r.id,
                module: target === 'ess' ? 'ess' : 'hr',
                type: 'Leave Request',
                title: `${r.employee.firstName} ${r.employee.lastName} — ${r.leaveType.name}`,
                project: r.employee.department?.name ?? 'HR',
                requestedBy: `${r.employee.firstName} ${r.employee.lastName}`,
                date: r.submittedAt,
                status: this.normalizeApprovalStatus(r.status),
                urgency: r.days > 10 ? 'urgent' : 'normal',
                description: r.notes ?? `${r.days} day leave request`,
                approvalFlow: flowForType('Leave Request'),
            })));
        }

        if (target === 'all' || target === 'finance' || target === 'ess') {
            const claims = await this.prisma.claim.findMany({
                include: { employee: { include: { department: true } }, claimType: true },
                orderBy: { createdAt: 'desc' },
            });
            rows.push(...claims.map((c) => ({
                id: c.id,
                module: target === 'ess' ? 'ess' : 'finance',
                type: 'Expense Claim',
                title: c.claimType.name,
                project: c.employee.department?.name ?? 'Finance',
                requestedBy: `${c.employee.firstName} ${c.employee.lastName}`,
                date: c.date,
                amount: c.amount,
                status: this.normalizeApprovalStatus(c.status),
                urgency: c.amount >= 1000000 ? 'urgent' : 'normal',
                description: c.description,
                approvalFlow: flowForType('Expense Claim'),
            })));
        }

        if (target === 'all' || target === 'finance') {
            const expenses = await this.prisma.expense.findMany({
                include: { project: true },
                orderBy: { createdAt: 'desc' },
            });
            rows.push(...expenses.map((e) => ({
                id: e.id,
                module: 'finance',
                type: 'Expense Claim',
                title: e.category,
                project: e.project?.name ?? 'General',
                requestedBy: e.createdBy,
                date: e.date,
                amount: e.amount,
                status: this.normalizeApprovalStatus(e.status),
                urgency: e.amount >= 1000000 ? 'urgent' : 'normal',
                description: e.description,
                approvalFlow: flowForType('Expense Claim'),
            })));
        }

        if (target === 'all' || target === 'procurement') {
            const [materialRequests, purchaseRequests, purchaseOrders] = await Promise.all([
                this.prisma.materialRequest.findMany({ orderBy: { createdAt: 'desc' } }),
                this.prisma.purchaseRequest.findMany({ orderBy: { createdAt: 'desc' } }),
                this.prisma.purchaseOrder.findMany({
                    include: { supplier: true },
                    orderBy: { createdAt: 'desc' },
                }),
            ]);
            rows.push(...materialRequests.map((r) => ({
                id: r.id,
                module: 'procurement',
                type: 'Material Request',
                title: `${r.materialName} — ${r.qty} ${r.unit}`,
                project: r.projectName ?? r.storeName,
                requestedBy: r.requestedBy,
                date: r.requestDate,
                status: this.normalizeApprovalStatus(r.status),
                urgency: String(r.priority).toLowerCase().includes('urgent') ? 'urgent' : 'normal',
                description: r.purpose ?? r.notes ?? '',
            })));
            rows.push(...purchaseRequests.map((r) => ({
                id: r.id,
                module: 'procurement',
                type: 'Purchase Request',
                title: r.title,
                project: r.projectName ?? 'Procurement',
                requestedBy: r.requestedBy,
                date: r.createdAt,
                status: this.normalizeApprovalStatus(r.status),
                urgency: String(r.priority).toLowerCase().includes('urgent') ? 'urgent' : 'normal',
                description: r.notes ?? '',
                approvalFlow: flowForType('Purchase Request'),
            })));
            rows.push(...purchaseOrders.map((o) => ({
                id: o.id,
                module: 'procurement',
                type: 'Purchase Order',
                title: `${o.supplier.name} — ${o.prRef ?? o.id}`,
                project: o.mrRef ?? o.prRef ?? 'Procurement',
                requestedBy: o.createdBy,
                date: o.createdDate,
                amount: o.totalValue,
                status: this.normalizeApprovalStatus(o.status),
                urgency: 'normal',
                description: `Expected ${o.expectedDate.toISOString().slice(0, 10)}`,
            })));
        }

        if (target === 'all' || target === 'admin') {
            const pendingUsers = await this.prisma.user.findMany({
                where: { status: { contains: 'Pending', mode: 'insensitive' } },
                orderBy: { createdAt: 'desc' },
            });
            rows.push(...pendingUsers.map((u) => ({
                id: u.id,
                module: 'admin',
                type: 'User Creation',
                title: `User account — ${u.name}`,
                project: u.department ?? 'Admin',
                requestedBy: u.name,
                date: u.createdAt,
                status: 'pending',
                urgency: 'normal',
                description: `Pending account for ${u.email}`,
            })));
        }

        return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    async referenceData() {
        const [
            projects,
            suppliers,
            materials,
            stores,
            departments,
            claimTypes,
            leaveTypes,
            chartAccounts,
        ] = await Promise.all([
            this.prisma.project.findMany({ orderBy: { name: 'asc' } }),
            this.prisma.supplier.findMany({ orderBy: { name: 'asc' } }),
            this.prisma.material.findMany({ orderBy: { name: 'asc' } }),
            this.prisma.store.findMany({ orderBy: { name: 'asc' } }),
            this.prisma.department.findMany({ orderBy: { name: 'asc' } }),
            this.prisma.claimType.findMany({ orderBy: { name: 'asc' } }),
            this.prisma.leaveType.findMany({ orderBy: { name: 'asc' } }),
            this.prisma.chartAccount.findMany({ orderBy: { code: 'asc' } }),
        ]);

        return {
            projects: projects.map((p) => ({ id: p.id, name: p.name, status: p.status, type: p.type })),
            suppliers: suppliers.map((s) => ({ id: s.id, name: s.name, categories: s.categories })),
            materials: materials.map((m) => ({ id: m.id, name: m.name, category: m.category, unit: m.unit })),
            stores: stores.map((s) => ({ id: s.id, name: s.name, type: s.type, projectName: s.projectName })),
            departments: departments.map((d) => ({ id: d.id, name: d.name })),
            claimTypes: claimTypes.map((c) => ({ id: c.id, name: c.name })),
            leaveTypes: leaveTypes.map((l) => ({ id: l.id, name: l.name })),
            chartAccounts: chartAccounts.map((a) => ({ id: a.id, code: a.code, name: a.name, type: a.type })),
        };
    }

    async systemSummary() {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const [users, roles, pendingApprovals, usersThisMonth, pendingInvites, recentSessions] =
            await Promise.all([
                this.prisma.user.count(),
                this.prisma.appRole.count(),
                this.findApprovals('all').then((rows) => rows.filter((r) => r.status === 'pending').length),
                this.prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
                this.prisma.user.count({ where: { status: { in: ['pending_invite', 'invited', 'PENDING_INVITE'] } } }),
                this.prisma.user.count({ where: { lastLogin: { gte: since24h } } }),
            ]);

        // Health: verify DB is reachable; returns 100% for a healthy monolith
        let healthPercent = 100;
        try {
            await this.prisma.$queryRaw`SELECT 1`;
        } catch {
            healthPercent = 0;
        }

        return {
            users,
            roles,
            activeSessions: Math.max(recentSessions, 1), // at least 1 (caller is active)
            pendingApprovals,
            usersThisMonth,
            pendingInvites,
            healthPercent,
            health: {
                status: healthPercent === 100 ? 'healthy' : 'degraded',
                uptimeSeconds: Math.round(process.uptime()),
                checkedAt: new Date(),
            },
        };
    }

    async activityLog() {
        const users = await this.prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: { id: true, name: true, email: true, status: true, createdAt: true },
        });
        return users.map((u) => ({
            id: u.id,
            actor: u.name,
            action: 'User account updated',
            subject: u.email,
            status: u.status,
            date: u.createdAt,
        }));
    }

    async getAuditLogs(limit: number = 100, offset: number = 0) {
        try {
            const logs = await this.prisma.activityRecord.findMany({
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            });
            return logs.map((log: any) => ({
                id: log.id,
                timestamp: log.createdAt,
                user: log.userName || 'System',
                action: log.action || 'Unknown',
                module: log.module || 'System',
                details: log.description || '',
                userId: log.userId,
                createdAt: log.createdAt,
            }));
        } catch (err) {
            this.logger.warn('ActivityHistory table not available, returning empty logs');
            return [];
        }
    }

    async updateApproval(id: string, data: { status?: string; notes?: string; reason?: string }) {
        const status = String(data?.status ?? '').toLowerCase();
        
        // Try to find and update in leave-requests
        const leaveReq = await this.prisma.leaveRequest.findUnique({ where: { id } }).catch(() => null);
        if (leaveReq) {
            return this.prisma.leaveRequest.update({
                where: { id },
                data: {
                    status: status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending',
                    approvedAt: status === 'approved' ? new Date() : undefined,
                    notes: data?.notes,
                },
            });
        }

        // Try to find and update in claims
        const claim = await this.prisma.claim.findUnique({ where: { id } }).catch(() => null);
        if (claim) {
            return this.prisma.claim.update({
                where: { id },
                data: {
                    status: status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Submitted',
                    reviewedAt: status !== 'submitted' ? new Date() : undefined,
                    rejectionReason: data?.reason,
                },
            });
        }

        // Try to find and update in expenses
        const expense = await this.prisma.expense.findUnique({ where: { id } }).catch(() => null);
        if (expense) {
            return this.prisma.expense.update({
                where: { id },
                data: {
                    status: status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Submitted',
                    approvedAt: status === 'approved' ? new Date() : undefined,
                },
            });
        }

        throw new BadRequestException(`Approval with ID ${id} not found`);
    }

    // ── Users ──
    async inviteUser(data: { email: string; name: string; role?: string; assignedApps?: string[]; department?: string }) {
        const name = String(data?.name ?? '').trim();
        const role = String(data?.role ?? '').trim();
        const department = String(data?.department ?? '').trim();
        const normalizedEmail = String(data?.email ?? '').trim().toLowerCase();
        const assignedApps = this.normalizeAssignedApps(data?.assignedApps, role);

        if (!name) throw new BadRequestException('Name is required');
        if (!normalizedEmail) throw new BadRequestException('Email is required');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            throw new BadRequestException('Invalid email address');
        }
        if (!role) throw new BadRequestException('Role is required');
        const resolvedRole = await this.resolveRoleName(role);

        const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existing) throw new ConflictException('Email already registered');

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        // Placeholder password — cannot be used to log in; replaced on activation
        const placeholder = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);

        const user = await this.prisma.user.create({
            data: {
                email: normalizedEmail,
                name,
                role: resolvedRole,
                department: department || null,
                assignedApps,
                password: placeholder,
                status: 'pending_invite',
                inviteToken: token,
                inviteExpiresAt: expiresAt,
            },
        });

        const userIdPrefix = await this.resolveCompanyUserIdPrefix();
        const persistedUserId = await this.ensureUserId(user, userIdPrefix);

        const activationLink = this.buildActivationLink(token);

        try {
            await this.sendInviteEmail(normalizedEmail, name, activationLink);
        } catch (error) {
            await this.prisma.user.delete({ where: { id: user.id } }).catch(() => null);
            const reason = error instanceof Error ? error.message : 'unknown error';
            this.logger.warn(`Invite email failed for ${normalizedEmail}: ${reason}`);
            throw new BadRequestException(`Invite email failed: ${reason}`);
        }

        return {
            id: user.id,
            userId: persistedUserId,
            email: user.email,
            status: user.status,
            assignedApps: user.assignedApps,
            inviteToken: token,
            activationLink,
            inviteEmailSent: true,
        };
    }

    async resendInvite(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new BadRequestException('User not found');

        const currentStatus = String(user.status || '').toLowerCase();
        if (currentStatus === 'active') {
            throw new BadRequestException('User is already active');
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: {
                status: 'pending_invite',
                inviteToken: token,
                inviteExpiresAt: expiresAt,
            },
        });

        const userIdPrefix = await this.resolveCompanyUserIdPrefix();
        const persistedUserId = await this.ensureUserId(updated, userIdPrefix);

        const activationLink = this.buildActivationLink(token);

        await this.sendInviteEmail(updated.email, updated.name, activationLink);

        return {
            id: updated.id,
            userId: persistedUserId,
            email: updated.email,
            status: updated.status,
            activationLink,
            inviteEmailSent: true,
        };
    }

    async activateInvite(token: string, password: string) {
        if (!token) throw new BadRequestException('Invite token is required');
        if (!password || password.length < 8) throw new BadRequestException('Password must be at least 8 characters');

        const user = await this.prisma.user.findFirst({ where: { inviteToken: token } });
        if (!user) throw new BadRequestException('Invalid or expired invite token');
        if (user.inviteExpiresAt && user.inviteExpiresAt < new Date()) {
            throw new BadRequestException('Invite token has expired');
        }

        const hashed = await bcrypt.hash(password, 10);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { password: hashed, status: 'Active', inviteToken: null, inviteExpiresAt: null },
        });

        return { message: 'Account activated. You can now log in.' };
    }

    async findAllUsers(search?: string) {
        const users = await this.prisma.user.findMany({
            where: search
                ? {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } },
                    ],
                }
                : {},
            select: {
                id: true, userId: true, name: true, email: true, role: true,
                department: true, phone: true, status: true, lastLogin: true,
                assignedApps: true,
                createdAt: true,
            },
            orderBy: { name: 'asc' },
        });

        const userIdPrefix = await this.resolveCompanyUserIdPrefix();
        const usersWithIds = await Promise.all(
            users.map(async (user) => {
                const userId = await this.ensureUserId(user, userIdPrefix);
                return { ...user, userId };
            }),
        );
        return usersWithIds.map((user) => this.shapeUserResponse(user, userIdPrefix));
    }

    async findUser(id: string) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id },
            select: {
                id: true, userId: true, name: true, email: true, role: true,
                department: true, phone: true, status: true, lastLogin: true,
                assignedApps: true,
                createdAt: true,
            },
        });

        const userIdPrefix = await this.resolveCompanyUserIdPrefix();
        const userId = await this.ensureUserId(user, userIdPrefix);
        return this.shapeUserResponse({ ...user, userId }, userIdPrefix);
    }

    async createUser(data: any) {
        const normalizedEmail = String(data?.email ?? '').trim().toLowerCase();
        const name = String(data?.name ?? '').trim();
        if (!name) throw new BadRequestException('Name is required');
        if (!normalizedEmail) throw new BadRequestException('Email is required');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            throw new BadRequestException('Invalid email address');
        }

        const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existing) throw new ConflictException('Email already registered');

        const hashed = await bcrypt.hash(data.password || 'BuildOS@2025', 10);
        const role = String(data?.role ?? '').trim();
        const assignedApps = this.normalizeAssignedApps(data?.assignedApps, role);
        const created = await this.prisma.user.create({
            data: { ...data, email: normalizedEmail, name, assignedApps, password: hashed },
            select: {
                id: true, userId: true, name: true, email: true, role: true,
                department: true, phone: true, status: true, assignedApps: true, createdAt: true,
            },
        });

        const userIdPrefix = await this.resolveCompanyUserIdPrefix();
        const userId = await this.ensureUserId(created, userIdPrefix);

        // Provision a matching Employee record (linked by email) so the user
        // appears in staff dropdowns, payroll, leave, and claims flows. The
        // auth layer resolves user->employee by email at login.
        try {
            const [firstName, ...restName] = name.split(/\s+/);
            await this.prisma.employee.upsert({
                where: { email: normalizedEmail },
                update: {},
                create: {
                    firstName: firstName || name,
                    lastName: restName.join(' ') || '',
                    email: normalizedEmail,
                    phone: String(data?.phone ?? ''),
                    dateHired: new Date(),
                    status: 'active',
                },
            });
        } catch (err) {
            // Employee provisioning is best-effort; the user account itself
            // was created successfully.
            this.logger?.warn?.(`Employee upsert failed for ${normalizedEmail}: ${err}`);
        }

        return this.shapeUserResponse({ ...created, userId }, userIdPrefix);
    }

    async updateUser(id: string, data: any) {
        const { password, ...rest } = data;
        const update: any = { ...rest };
        if (typeof data?.email === 'string') {
            const normalizedEmail = data.email.trim().toLowerCase();
            if (!normalizedEmail) throw new BadRequestException('Email is required');
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
                throw new BadRequestException('Invalid email address');
            }
            const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
            if (existing && existing.id !== id) {
                throw new ConflictException('Email already registered');
            }
            update.email = normalizedEmail;
        }

        if ('status' in data) {
            const normalized = this.normalizeStatus(data.status);
            if (!['Active', 'Inactive', 'pending_invite'].includes(normalized)) {
                throw new BadRequestException('Unsupported user status');
            }
            update.status = normalized;
        }

        if ('assignedApps' in data) {
            update.assignedApps = this.normalizeAssignedApps(data.assignedApps, data?.role);
        } else if (typeof data?.role === 'string' && data.role.trim().toLowerCase().includes('admin')) {
            update.assignedApps = this.normalizeAssignedApps([], data.role);
        } else if (typeof data?.role === 'string') {
            update.assignedApps = this.normalizeAssignedApps([], data.role);
        }

        if (password) update.password = await bcrypt.hash(password, 10);
        const updated = await this.prisma.user.update({
            where: { id },
            data: update,
            select: {
                id: true, userId: true, name: true, email: true, role: true,
                department: true, phone: true, status: true, lastLogin: true, assignedApps: true, createdAt: true,
            },
        });

        const userIdPrefix = await this.resolveCompanyUserIdPrefix();
        const userId = await this.ensureUserId(updated, userIdPrefix);
        return this.shapeUserResponse({ ...updated, userId }, userIdPrefix);
    }

    async deleteUser(id: string) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new BadRequestException('User not found');
        }

        if (!this.isPendingInviteStatus(user.status)) {
            throw new BadRequestException('Only users with pending invites can be deleted');
        }

        return this.prisma.user.delete({ where: { id } });
    }

    // ── App Roles ──
    async findAllRoles() {
        await this.ensureAdminRole();
        const roles = await this.prisma.appRole.findMany({ orderBy: { name: 'asc' } });
        return roles.map((role) => this.formatRoleResponse(role));
    }
    async findRole(id: string) {
        await this.ensureAdminRole();
        const role = await this.prisma.appRole.findUniqueOrThrow({ where: { id } });
        return this.formatRoleResponse(role);
    }
    async createRole(data: any) {
        const requestedName = String(data?.name ?? '').trim();
        if (!requestedName) {
            throw new BadRequestException('Role name is required');
        }

        const isAdminName = requestedName.toLowerCase() === 'admin';
        if (isAdminName || data?.isSuper) {
            await this.ensureAdminRole();
            const adminRole = await this.prisma.appRole.findUniqueOrThrow({ where: { name: 'Admin' } });
            return this.formatRoleResponse(adminRole);
        }

        const existingRole = await this.prisma.appRole.findFirst({
            where: {
                name: {
                    equals: requestedName,
                    mode: 'insensitive',
                },
            },
        });
        if (existingRole) {
            throw new ConflictException(`Role with name '${requestedName}' already exists`);
        }

        const permissionState = this.normalizeRolePermissionState(data?.permissions);
        const encoded = this.encodeRolePermissionState(permissionState);

        const payload = {
            name: requestedName,
            description: String(data?.description ?? '').trim() || null,
            isSuper: Boolean(data?.isSuper),
            appScope: encoded.appScope,
            inheritedRoles: encoded.inheritedRoles,
        };

        try {
            const created = await this.prisma.appRole.create({ data: payload });
            return this.formatRoleResponse(created);
        } catch (error: any) {
            if (error?.code === 'P2002' && error?.meta?.target?.includes('name')) {
                throw new ConflictException(`Role with name '${requestedName}' already exists`);
            }
            throw error;
        }
    }
    async updateRole(id: string, data: any) {
        const current = await this.prisma.appRole.findUnique({ where: { id } });
        if (!current) throw new BadRequestException('Role not found');
        
        const isCurrentAdminRole = String(current.name ?? '').trim().toLowerCase() === 'admin';
        const requestedName =
            typeof data?.name === 'string' ? data.name.trim() : String(current.name ?? '').trim();
        const isAttemptingAdminName = requestedName.toLowerCase() === 'admin';

        // Prevent renaming roles to 'admin' or making non-admin roles super
        if (isAttemptingAdminName || (data?.isSuper && !isCurrentAdminRole)) {
            throw new BadRequestException('Cannot rename roles to "Admin" or make non-admin roles super');
        }

        // Allow updating admin role metadata
        if (isCurrentAdminRole) {
            await this.ensureAdminRole();
            const adminRole = await this.prisma.appRole.findUniqueOrThrow({ where: { name: 'Admin' } });
            return this.formatRoleResponse(adminRole);
        }

        if (!requestedName) {
            throw new BadRequestException('Role name is required');
        }

        const duplicate = await this.prisma.appRole.findFirst({
            where: {
                id: { not: id },
                name: {
                    equals: requestedName,
                    mode: 'insensitive',
                },
            },
        });
        if (duplicate) {
            throw new ConflictException(`Role with name '${requestedName}' already exists`);
        }

        const decodedCurrentState = this.decodeRolePermissionState(current);
        const nextPermissionState = this.normalizeRolePermissionState(data?.permissions, decodedCurrentState);
        const encoded = this.encodeRolePermissionState(nextPermissionState);

        const payload = {
            name: requestedName,
            description:
                typeof data?.description === 'string'
                    ? data.description.trim() || null
                    : current.description,
            isSuper: Boolean(data?.isSuper),
            appScope: encoded.appScope,
            inheritedRoles: encoded.inheritedRoles,
        };

        try {
            const [, updatedRole] = await this.prisma.$transaction([
                this.prisma.user.updateMany({
                    where: { role: current.name },
                    data: { role: requestedName },
                }),
                this.prisma.appRole.update({ where: { id }, data: payload }),
            ]);
            return this.formatRoleResponse(updatedRole);
        } catch (error: any) {
            if (error?.code === 'P2002' && error?.meta?.target?.includes('name')) {
                throw new ConflictException(`Role with name '${requestedName}' already exists`);
            }
            throw error;
        }
    }
    async deleteRole(id: string) {
        const current = await this.prisma.appRole.findUnique({ where: { id } });
        if (String(current?.name ?? '').trim().toLowerCase() === 'admin') {
            throw new BadRequestException('Admin role cannot be deleted');
        }
        return this.prisma.appRole.deleteMany({ where: { id } });
    }

    // ── Issue Types ──
    async findAllIssueTypes() {
        const settings = await this.readAdminSettings();
        return settings.issueTypes;
    }

    async createIssueType(data: any) {
        const settings = await this.readAdminSettings();
        const name = String(data?.name ?? '').trim();
        if (!name) throw new BadRequestException('Issue type name is required');
        
        const exists = settings.issueTypes.some((t: any) => t.name.toLowerCase() === name.toLowerCase());
        if (exists) throw new ConflictException(`Issue type '${name}' already exists`);
        
        const next = {
            id: crypto.randomUUID(),
            name,
            description: data.description ?? '',
            priority: data.priority ?? 'medium',
            color: data.color ?? 'bg-red-100 text-red-700',
            slaHours: Number(data.slaHours ?? 24),
            active: data.active !== false,
        };
        settings.issueTypes.push(next);
        await this.writeAdminSettings(settings);
        return next;
    }

    async updateIssueType(id: string, data: any) {
        const settings = await this.readAdminSettings();
        const idx = settings.issueTypes.findIndex((item: any) => item.id === id);
        if (idx < 0) throw new BadRequestException('Issue type not found');
        settings.issueTypes[idx] = {
            ...settings.issueTypes[idx],
            ...data,
            id,
        };
        await this.writeAdminSettings(settings);
        return settings.issueTypes[idx];
    }

    async deleteIssueType(id: string) {
        const settings = await this.readAdminSettings();
        settings.issueTypes = settings.issueTypes.filter((item: any) => item.id !== id);
        await this.writeAdminSettings(settings);
        return { ok: true };
    }

    // ── Change Categories ──
    async findAllChangeCategories() {
        const settings = await this.readAdminSettings();
        return settings.changeCategories;
    }

    async createChangeCategory(data: any) {
        const settings = await this.readAdminSettings();
        const name = String(data?.name ?? '').trim();
        if (!name) throw new BadRequestException('Category name is required');
        
        const exists = settings.changeCategories.some((c: any) => c.name.toLowerCase() === name.toLowerCase());
        if (exists) throw new ConflictException(`Category '${name}' already exists`);
        
        const next = {
            id: crypto.randomUUID(),
            name,
            description: data.description ?? '',
        };
        settings.changeCategories.push(next);
        await this.writeAdminSettings(settings);
        return next;
    }

    async updateChangeCategory(id: string, data: any) {
        const settings = await this.readAdminSettings();
        const idx = settings.changeCategories.findIndex((item: any) => item.id === id);
        if (idx < 0) throw new BadRequestException('Change category not found');
        settings.changeCategories[idx] = {
            ...settings.changeCategories[idx],
            ...data,
            id,
        };
        await this.writeAdminSettings(settings);
        return settings.changeCategories[idx];
    }

    async deleteChangeCategory(id: string) {
        const settings = await this.readAdminSettings();
        settings.changeCategories = settings.changeCategories.filter((item: any) => item.id !== id);
        await this.writeAdminSettings(settings);
        return { ok: true };
    }

    // ── Company Profile ──
    async getCompanyProfile() {
        const profile = await this.prisma.companyProfile.findUnique({ where: { id: 'singleton' } });
        if (!profile) {
            return this.prisma.companyProfile.create({ data: { id: 'singleton' } });
        }
        return profile;
    }

    updateCompanyProfile(data: any) {
        const requiredFields = [
            { key: 'name', label: 'Company name' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone number' },
            { key: 'address', label: 'Address' },
            { key: 'city', label: 'City' },
            { key: 'state', label: 'State / Province' },
            { key: 'country', label: 'Country' },
        ] as const;

        const missing = requiredFields
            .filter(({ key }) => !String(data?.[key] ?? '').trim())
            .map(({ label }) => label);

        if (missing.length > 0) {
            throw new BadRequestException(`Missing required fields: ${missing.join(', ')}`);
        }

        const email = String(data.email).trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new BadRequestException('Invalid email address');
        }

        const sanitized = {
            ...data,
            name: String(data.name).trim(),
            email,
            phone: String(data.phone).trim(),
            address: String(data.address).trim(),
            city: String(data.city).trim(),
            state: String(data.state).trim(),
            zipCode: String(data.zipCode ?? '').trim(),
            country: String(data.country ?? '').trim(),
        };

        const { id, updatedAt, ...rest } = sanitized;
        return this.prisma.companyProfile.upsert({
            where: { id: 'singleton' },
            create: { id: 'singleton', ...rest },
            update: rest,
        });
    }

    // ── Directors ──
    findAllDirectors() {
        return this.prisma.director.findMany({ orderBy: { sequence: 'asc' } });
    }

    async createDirector(data: any) {
        const firstName = String(data?.firstName ?? '').trim();
        const lastName = String(data?.lastName ?? '').trim();
        const designation = String(data?.designation ?? '').trim();
        const middleName = String(data?.middleName ?? '').trim();

        if (!firstName || !lastName || !designation) {
            throw new BadRequestException('First name, last name, and designation are required');
        }

        const highestSequence = await this.prisma.director.findFirst({
            orderBy: { sequence: 'desc' },
            select: { sequence: true },
        });
        const nextSequence = (highestSequence?.sequence ?? 0) + 1;

        return this.prisma.director.create({
            data: {
                firstName,
                middleName,
                lastName,
                designation,
                sequence: nextSequence,
            },
        });
    }

    updateDirector(id: string, data: any) {
        const { id: _id, createdAt, updatedAt, sequence, ...rest } = data;
        return this.prisma.director.update({ where: { id }, data: rest });
    }

    async reorderDirectors(items: Array<{ id: string; sequence: number }>) {
        if (!Array.isArray(items) || items.length === 0) {
            throw new BadRequestException('At least one director reorder item is required');
        }

        const normalized = items.map((item) => ({
            id: String(item?.id ?? '').trim(),
            sequence: Number(item?.sequence),
        }));

        if (normalized.some((item) => !item.id || !Number.isInteger(item.sequence) || item.sequence < 1)) {
            throw new BadRequestException('Each reorder item must include a valid id and a positive integer sequence');
        }

        const uniqueIds = new Set(normalized.map((item) => item.id));
        if (uniqueIds.size !== normalized.length) {
            throw new BadRequestException('Duplicate director ids are not allowed in reorder payload');
        }

        const existing = await this.prisma.director.findMany({ select: { id: true } });
        const existingIds = new Set(existing.map((director) => director.id));
        if (normalized.some((item) => !existingIds.has(item.id))) {
            throw new BadRequestException('Reorder payload contains unknown director id(s)');
        }

        await this.prisma.$transaction(
            normalized.map((item) =>
                this.prisma.director.update({
                    where: { id: item.id },
                    data: { sequence: item.sequence },
                }),
            ),
        );

        return this.findAllDirectors();
    }

    async deleteDirector(id: string) {
        await this.prisma.director.delete({ where: { id } });
        const directors = await this.prisma.director.findMany({ orderBy: { sequence: 'asc' } });

        await this.prisma.$transaction(
            directors.map((director, index) =>
                this.prisma.director.update({ where: { id: director.id }, data: { sequence: index + 1 } }),
            ),
        );

        return { ok: true };
    }

    // ── Email Config ──
    async findEmailConfigs() {
        const settings = await this.readAdminSettings();
        return settings.emailConfigs;
    }
    /**
     * One configuration per trigger event.
     *
     * Two templates on the same event would make which one fires arbitrary. The UI
     * disables events that are already configured; this enforces it server-side so
     * the rule holds regardless of how the request arrives.
     */
    private assertTriggerAvailable(configs: any[], trigger: unknown, exceptId?: string) {
        const wanted = String(trigger ?? '').trim().toLowerCase();
        if (!wanted) return;
        const clash = configs.find(
            (item: any) =>
                item?.id !== exceptId &&
                String(item?.trigger ?? '').trim().toLowerCase() === wanted,
        );
        if (clash) {
            throw new ConflictException(
                `"${clash.trigger}" already has an email configuration. Edit the existing one instead.`,
            );
        }
    }

    async createEmailConfig(data: any) {
        const settings = await this.readAdminSettings();
        this.assertTriggerAvailable(settings.emailConfigs, data?.trigger);
        const created = { id: `EC-${Date.now()}`, ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        settings.emailConfigs.push(created);
        await this.writeAdminSettings(settings);
        return created;
    }
    async updateEmailConfig(id: string, data: any) {
        const settings = await this.readAdminSettings();
        // Re-pointing a config at an event another config already owns is the same
        // clash as creating a duplicate.
        this.assertTriggerAvailable(settings.emailConfigs, data?.trigger, id);
        settings.emailConfigs = settings.emailConfigs.map((item: any) =>
            item.id === id ? { ...item, ...data, id, updatedAt: new Date().toISOString() } : item,
        );
        await this.writeAdminSettings(settings);
        return settings.emailConfigs.find((item: any) => item.id === id) ?? { id, ...data };
    }
    async deleteEmailConfig(id: string) {
        const settings = await this.readAdminSettings();
        settings.emailConfigs = settings.emailConfigs.filter((item: any) => item.id !== id);
        await this.writeAdminSettings(settings);
        return { id, deleted: true };
    }

    /**
     * Template variables per trigger, derived from the Prisma schema so the
     * palette always lists every field of the concerned table.
     */
    getEmailTemplateVariables(): Record<string, string[]> {
        const modelFields = new Map<string, string[]>();
        for (const model of Prisma.dmmf.datamodel.models) {
            const fields = model.fields
                .filter((f) => f.kind === 'scalar' || f.kind === 'enum')
                .map((f) => toSnakeCase(f.name))
                .filter((f) => !EXCLUDED_VARIABLE_FIELDS.has(f));
            modelFields.set(model.name, fields);
        }
        const result: Record<string, string[]> = {};
        for (const [trigger, source] of Object.entries(EMAIL_TRIGGER_SOURCES)) {
            const fields = source.model ? (modelFields.get(source.model) ?? []) : [];
            result[trigger] = [...new Set([...(source.extras ?? []), ...fields])];
        }
        return result;
    }

    /** Replaces {{ variable }} tokens (case-insensitive, optional spaces). */
    private renderEmailTemplate(template: string, vars: Record<string, unknown>): string {
        return String(template ?? '').replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, key) => {
            const normalized = toSnakeCase(String(key));
            const value = vars[normalized] ?? vars[String(key)];
            if (value === undefined || value === null) return match;
            if (value instanceof Date) return value.toISOString().slice(0, 10);
            return String(value);
        });
    }

    /** Snake-cases every scalar property of a record into template vars. */
    private toTemplateVars(record: Record<string, unknown> | null | undefined): Record<string, unknown> {
        const vars: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(record ?? {})) {
            if (value === null || value === undefined) continue;
            if (typeof value === 'object' && !(value instanceof Date)) continue;
            const snake = toSnakeCase(key);
            if (EXCLUDED_VARIABLE_FIELDS.has(snake)) continue;
            vars[snake] = value;
        }
        return vars;
    }

    /**
     * Resolves the enabled admin template for a trigger and renders subject,
     * plain-text body, a simple HTML body, and CC list. Returns null when no
     * enabled template is configured, so callers keep their built-in default.
     */
    async composeTemplatedEmail(
        trigger: string,
        vars: Record<string, unknown>,
    ): Promise<{ subject: string; text: string; html: string; cc: string[] } | null> {
        const settings = await this.readAdminSettings();
        const config = settings.emailConfigs.find(
            (c: any) => c?.enabled !== false && String(c?.trigger ?? '') === trigger,
        );
        if (!config || (!String(config.subject ?? '').trim() && !String(config.body ?? '').trim())) {
            return null;
        }
        const subject = this.renderEmailTemplate(String(config.subject ?? ''), vars).trim();
        const text = this.renderEmailTemplate(String(config.body ?? ''), vars);
        const html = `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;white-space:pre-wrap;">${this.escapeHtml(text)}</div>`;
        const cc = this.renderEmailTemplate(String(config.cc ?? ''), vars)
            .split(/[,;]/)
            .map((s: string) => s.trim())
            .filter((s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
        return { subject, text, html, cc };
    }

    /**
     * Welcome email sent when HR onboards an employee — before any login account
     * exists. Uses the admin-configured "Employee Onboarding Initiated" template
     * (Admin → Email Configuration → HR), whose variables are derived from the
     * Employee model, and falls back to a built-in message when no template is
     * enabled. Deliberately contains no activation link: the User account is only
     * created later, when an admin syncs the employee from Admin → Users.
     */
    async sendEmployeeWelcomeEmail(employee: {
        firstName: string;
        lastName: string;
        email: string;
        role?: string | null;
        department?: { name?: string | null } | null;
    }): Promise<void> {
        const email = String(employee?.email ?? '').trim().toLowerCase();
        if (!email) return;

        const companyProfile = await this.prisma.companyProfile
            .findUnique({ where: { id: 'singleton' } })
            .catch(() => null);
        const companyName = String(companyProfile?.name ?? '').trim() || 'BuildOS';
        const fullName = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim();

        const vars = {
            ...this.toTemplateVars(employee as any),
            name: fullName,
            employee_name: fullName,
            employee_email: email,
            email,
            job_title: employee.role ?? '',
            department: employee.department?.name ?? '',
            company_name: companyName,
        };

        const templated = await this.composeTemplatedEmail('Employee Onboarding Initiated', vars);
        if (templated) {
            await this.mailQueue.enqueueEmail({
                to: email,
                subject: templated.subject || `Welcome to ${companyName}`,
                text: templated.text,
                html: templated.html,
                ...(templated.cc.length > 0 ? { cc: templated.cc } : {}),
            });
            return;
        }

        await this.mailQueue.enqueueEmail({
            to: email,
            subject: `Welcome to ${companyName}, ${fullName}`,
            text:
                `Hi ${fullName},\n\nWelcome to ${companyName}. Your employee record has been created` +
                `${vars.department ? ` in the ${vars.department} department` : ''}.\n\n` +
                `Your system access will be set up shortly and you will receive a separate email to activate your account.`,
            html:
                `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;">` +
                `<p>Hi ${this.escapeHtml(fullName)},</p>` +
                `<p>Welcome to ${this.escapeHtml(companyName)}. Your employee record has been created` +
                `${vars.department ? ` in the ${this.escapeHtml(String(vars.department))} department` : ''}.</p>` +
                `<p>Your system access will be set up shortly and you will receive a separate email to activate your account.</p>` +
                `</div>`,
        });
    }

    /**
     * Creates the login account for an already-onboarded employee (Admin → Users
     * → Pending Sync → Sync). Reuses inviteUser() so the account, activation
     * token and "New User Created" email all follow the normal invite path, then
     * links the new user back onto the Employee row.
     */
    async syncEmployeeToUser(
        employeeId: string,
        data: { email?: string; role?: string; assignedApps?: string[] },
    ) {
        const employee = await this.prisma.employee.findUniqueOrThrow({
            where: { id: employeeId },
            include: { department: true },
        });
        if (employee.userId) {
            throw new ConflictException('This employee is already synced to a user account');
        }

        const email = String(data?.email ?? employee.email ?? '').trim().toLowerCase();
        const invited = await this.inviteUser({
            email,
            name: `${employee.firstName} ${employee.lastName}`.trim(),
            role: String(data?.role ?? '').trim() || 'Employee',
            assignedApps: data?.assignedApps?.length ? data.assignedApps : ['ess'],
            department: employee.department?.name ?? undefined,
        });

        await this.prisma.employee.update({
            where: { id: employee.id },
            data: { userId: invited.id, ...(email !== employee.email ? { email } : {}) },
        });

        return invited;
    }

    /** Employees onboarded in HR that do not yet have a linked login account. */
    async findPendingSyncEmployees() {
        const employees = await this.prisma.employee.findMany({
            where: { userId: null, status: 'active' },
            include: { department: true },
            orderBy: { createdAt: 'desc' },
        });
        return employees.map((e) => ({
            id: e.id,
            firstName: e.firstName,
            lastName: e.lastName,
            name: `${e.firstName} ${e.lastName}`.trim(),
            email: e.email,
            jobTitle: e.role ?? '',
            department: e.department?.name ?? '',
            departmentId: e.departmentId,
            dateHired: e.dateHired,
            phone: e.phone,
            syncStatus: 'unsynced' as const,
        }));
    }

    // ── Units ──
    async findUnits() {
        const settings = await this.readAdminSettings();
        return settings.units;
    }
    async createUnit(data: any) {
        const settings = await this.readAdminSettings();
        const created = {
            id: `u-${Date.now()}`,
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        settings.units = [...settings.units, created];
        await this.writeAdminSettings(settings);
        return created;
    }
    async updateUnit(id: string, data: any) {
        const settings = await this.readAdminSettings();
        settings.units = settings.units.map((item: any) =>
            item.id === id ? { ...item, ...data, id, updatedAt: new Date().toISOString() } : item,
        );
        await this.writeAdminSettings(settings);
        return settings.units.find((item: any) => item.id === id) ?? { id, ...data };
    }
    async deleteUnit(id: string) {
        const settings = await this.readAdminSettings();
        settings.units = settings.units.filter((item: any) => item.id !== id);
        await this.writeAdminSettings(settings);
        return { id, deleted: true };
    }

    // ── Material Categories ──
    async findMaterialCategories() {
        const settings = await this.readAdminSettings();
        return settings.materialCategories;
    }
    async createMaterialCategory(data: any) {
        const name = String(data?.name ?? '').trim();
        if (!name) throw new BadRequestException('Category name is required');
        const settings = await this.readAdminSettings();
        const created = {
            id: `mc-${Date.now()}`,
            name,
            description: String(data?.description ?? '').trim(),
            color: String(data?.color ?? 'teal').trim() || 'teal',
        };
        settings.materialCategories = [...settings.materialCategories, created];
        await this.writeAdminSettings(settings);
        return created;
    }
    async updateMaterialCategory(id: string, data: any) {
        const settings = await this.readAdminSettings();
        settings.materialCategories = settings.materialCategories.map((item: any) =>
            item.id === id ? { ...item, ...data, id } : item,
        );
        await this.writeAdminSettings(settings);
        return settings.materialCategories.find((item: any) => item.id === id) ?? { id, ...data };
    }
    async deleteMaterialCategory(id: string) {
        const settings = await this.readAdminSettings();
        settings.materialCategories = settings.materialCategories.filter((item: any) => item.id !== id);
        await this.writeAdminSettings(settings);
        return { id, deleted: true };
    }

    // ── API Keys ──
    async findApiKeys() {
        const settings = await this.readAdminSettings();
        return settings.apiKeys;
    }
    async createApiKey(data: any) {
        const settings = await this.readAdminSettings();
        const created = {
            id: `key-${Date.now()}`,
            name: String(data?.name ?? '').trim() || 'New API Key',
            key: data?.key || `sk_live_${crypto.randomBytes(18).toString('hex')}`,
            status: 'active',
            created: new Date().toISOString(),
            lastUsed: null,
        };
        settings.apiKeys.unshift(created);
        await this.writeAdminSettings(settings);
        return created;
    }
    async deleteApiKey(id: string) {
        const settings = await this.readAdminSettings();
        settings.apiKeys = settings.apiKeys.filter((item: any) => item.id !== id);
        await this.writeAdminSettings(settings);
        return { id, deleted: true };
    }

    // ── Webhooks ──
    async findWebhooks() {
        const settings = await this.readAdminSettings();
        return settings.webhooks;
    }
    async createWebhook(data: any) {
        const settings = await this.readAdminSettings();
        const created = {
            id: `wh-${Date.now()}`,
            name: String(data?.name ?? '').trim() || 'New Webhook',
            url: String(data?.url ?? '').trim(),
            events: Array.isArray(data?.events) ? data.events : [],
            status: 'active',
            createdAt: new Date().toISOString(),
        };
        settings.webhooks.unshift(created);
        await this.writeAdminSettings(settings);
        return created;
    }
    async deleteWebhook(id: string) {
        const settings = await this.readAdminSettings();
        settings.webhooks = settings.webhooks.filter((item: any) => item.id !== id);
        await this.writeAdminSettings(settings);
        return { id, deleted: true };
    }

    // ── Email Templates ──
    async findEmailTemplates() {
        const settings = await this.readAdminSettings();
        return settings.emailTemplates;
    }

    async createEmailTemplate(data: any) {
        const settings = await this.readAdminSettings();
        const created = { id: `et-${Date.now()}`, ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        settings.emailTemplates.unshift(created);
        await this.writeAdminSettings(settings);
        return created;
    }

    async updateEmailTemplate(id: string, data: any) {
        const settings = await this.readAdminSettings();
        settings.emailTemplates = settings.emailTemplates.map((item: any) =>
            item.id === id ? { ...item, ...data, id, updatedAt: new Date().toISOString() } : item,
        );
        await this.writeAdminSettings(settings);
        return settings.emailTemplates.find((item: any) => item.id === id) ?? { id, ...data };
    }

    async deleteEmailTemplate(id: string) {
        const settings = await this.readAdminSettings();
        settings.emailTemplates = settings.emailTemplates.filter((item: any) => item.id !== id);
        await this.writeAdminSettings(settings);
        return { id, deleted: true };
    }

    // ── Notification Rules ──
    async findNotificationRules() {
        const settings = await this.readAdminSettings();
        return settings.notificationRules;
    }

    async createNotificationRule(data: any) {
        const settings = await this.readAdminSettings();
        const created = { id: `nr-${Date.now()}`, ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        settings.notificationRules.unshift(created);
        await this.writeAdminSettings(settings);
        return created;
    }

    async updateNotificationRule(id: string, data: any) {
        const settings = await this.readAdminSettings();
        settings.notificationRules = settings.notificationRules.map((item: any) =>
            item.id === id ? { ...item, ...data, id, updatedAt: new Date().toISOString() } : item,
        );
        await this.writeAdminSettings(settings);
        return settings.notificationRules.find((item: any) => item.id === id) ?? { id, ...data };
    }

    async deleteNotificationRule(id: string) {
        const settings = await this.readAdminSettings();
        settings.notificationRules = settings.notificationRules.filter((item: any) => item.id !== id);
        await this.writeAdminSettings(settings);
        return { id, deleted: true };
    }

    // ── Report Schedules ──
    async findReportSchedules() {
        const settings = await this.readAdminSettings();
        return settings.reportSchedules;
    }

    // ── Report Templates ──
    async findReportTemplates() {
        const settings = await this.readAdminSettings();
        return settings.reportTemplates;
    }
    async createReportTemplate(data: any) {
        const settings = await this.readAdminSettings();
        const created = {
            ...data,
            id: String(data?.id ?? '').trim() || `rt-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        settings.reportTemplates.push(created);
        await this.writeAdminSettings(settings);
        return created;
    }
    async updateReportTemplate(id: string, data: any) {
        const settings = await this.readAdminSettings();
        const idx = settings.reportTemplates.findIndex((item: any) => item.id === id);
        if (idx < 0) {
            const created = { ...data, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
            settings.reportTemplates.push(created);
            await this.writeAdminSettings(settings);
            return created;
        }
        settings.reportTemplates[idx] = { ...settings.reportTemplates[idx], ...data, id, updatedAt: new Date().toISOString() };
        await this.writeAdminSettings(settings);
        return settings.reportTemplates[idx];
    }
    async deleteReportTemplate(id: string) {
        const settings = await this.readAdminSettings();
        settings.reportTemplates = settings.reportTemplates.filter((item: any) => item.id !== id);
        await this.writeAdminSettings(settings);
        return { id, deleted: true };
    }
}
