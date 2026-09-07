import { apiFetch } from './client';

export interface AppUser {
    id: string; name: string; email: string; role: string;
    userId?: string;
    department?: string; position?: string; status: string;
    phone?: string;
    assignedApps?: string[];
    /**
     * How many process permissions this user has explicitly granted or revoked on
     * top of their role. Supplied by the list endpoint so the Active Overrides
     * column can report it without resolving every user's full permission set.
     */
    overrideCount?: number;
    lastLogin?: string; createdAt: string;
}
export interface AppRole {
    id: string; name: string; description?: string;
    permissions: string[] | Record<string, unknown>;
    isSystem?: boolean;
    isSuper?: boolean;
    createdAt: string;
}
export interface AdminSystemSummary {
    users: number;
    roles: number;
    activeSessions: number;
    pendingApprovals: number;
    openTickets?: number;
    usersThisMonth: number;
    pendingInvites: number;
    healthPercent: number;
    health: { status: string; uptimeSeconds: number; checkedAt: string };
}
export interface AdminActivity {
    id: string;
    actor: string;
    action: string;
    subject: string;
    status: string;
    date: string;
}

export interface IssueTypeConfig {
    id: string;
    name: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    color: string;
    slaHours: number;
    active: boolean;
}

export interface ChangeCategoryConfig {
    id: string;
    name: string;
    description: string;
}

export interface UnitOfMeasurement {
    id: string;
    name: string;
    abbreviation: string;
    category: string;
    baseUnit?: string;
    conversionFactor?: number;
}

export interface MaterialCatalogDimensionInput {
    kind: string;
    value?: number | string | null;
    unit?: string | null;
}

/**
 * A material item under a Material — e.g. "Deformed Bar" under "Iron Rod".
 * There is no row of its own any more: on save, each of its dimensions
 * becomes its own flat Material row (see MaterialCatalogRowRecord below), so
 * an item needs at least one dimension or it has nothing to save.
 */
export interface MaterialCatalogItemInput {
    name: string;
    sku?: string | null;
    dimensions: MaterialCatalogDimensionInput[];
}

export interface MaterialCatalogMaterialInput {
    name: string;
    classification: 'Consumable' | 'Reusable';
    items: MaterialCatalogItemInput[];
}

export interface MaterialCategoryInput {
    name: string;
    description?: string;
    color?: string;
    materials?: MaterialCatalogMaterialInput[];
}

/**
 * One flat Material row produced by the catalogue builder — a specific
 * dimension of a specific item under a Material Name. This is a real
 * Material row (the same table Goods Receipt/Stock Movement use), not a
 * disposable catalog-only record; `materialGroupName`/`itemName` are the
 * pre-concatenation names, kept only so the builder can regroup flat rows
 * back into a Material -> item -> dimension tree when reopened for edit.
 */
export interface MaterialCatalogRowRecord {
    id: string;
    name: string;
    classification: 'Consumable' | 'Reusable';
    materialGroupName: string | null;
    itemName: string | null;
    sku: string | null;
    /** Weight | Length | Width | Breadth | Thickness | Area | Volume | Custom */
    kind: string | null;
    value: number | null;
    unit: string | null;
    totalQty: number;
    availableQty: number;
    reservedQty: number;
    unitCost: number;
}

export interface MaterialCategoryRecord {
    id: string;
    name: string;
    description: string | null;
    color: string;
    materials: MaterialCatalogRowRecord[];
}

export interface EmailTemplateConfig {
    id: string;
    name: string;
    subject: string;
    trigger: string;
}

export interface NotificationRuleConfig {
    id: string;
    name: string;
    event: string;
    recipients: string;
    channels: string[];
    enabled: boolean;
}

export interface ProcessCatalogItem {
    id: string;
    label: string;
    app: string;
    description: string;
    /**
     * The permissions this process supports. A process is a major activity
     * ("Expenses") and these are the verbs under it; anything absent has no
     * workflow behind it and is omitted from the permission matrices rather than
     * shown as an unticked box. Older payloads may omit it — treat that as the
     * full set.
     */
    actions?: PermissionAction[];
    requiresApproval: boolean;
}

export type ApprovalType = 'single' | 'group' | 'tier';

export interface ProcessWorkflowTierLevel {
    level: number;
    approver: string;
    condition: string;
}

export interface ProcessWorkflow {
    id: string;
    processId: string;
    process: string;
    app: string;
    workflowType: ApprovalType;
    approver?: string;
    groupApprovers?: string[];
    /** For group workflows: whether ANY one approver (OR) or ALL approvers (AND) are required. */
    groupApprovalMode?: 'any' | 'all';
    tierLevels?: ProcessWorkflowTierLevel[];
}

export interface CurrencyOptionConfig {
    label: string;
    value: string;
    meta?: string;
}

export interface GeneralSettingsConfig {
    currency: string;
    currencySymbol: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    numberFormat: string;
    fiscalYearStart: string;
    language: string;
}

export interface AdminGeneralSettingsPayload {
    generalSettings: GeneralSettingsConfig;
    currencyOptions: CurrencyOptionConfig[];
}

export const getAdminSystemSummary = () =>
    apiFetch<AdminSystemSummary>('/admin/system-summary');
export const getAdminActivityLog = () =>
    apiFetch<AdminActivity[]>('/admin/activity-log');
export const getAuditLogs = async (params?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', params.limit.toString());
    if (params?.offset) qs.set('skip', params.offset.toString());
    const query = qs.toString() ? `?${qs}` : '';
    const res = await apiFetch<any>(`/audit-logs${query}`);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.data)) return res.data;
    return [];
};
export const inviteUser = (data: { email: string; name: string; role: string; assignedApps?: string[]; department?: string }) =>
    apiFetch<{
        id: string;
        email: string;
        status: string;
        assignedApps: string[];
        inviteToken: string;
        activationLink: string;
        inviteEmailSent: boolean;
    }>(
        '/admin/users/invite', { method: 'POST', body: JSON.stringify(data) }
    );
export const resendInvite = (id: string) =>
    apiFetch<{
        id: string;
        email: string;
        status: string;
        activationLink: string;
        inviteEmailSent: boolean;
    }>(`/admin/users/${id}/resend-invite`, { method: 'POST' });

// Users
export const getUsers = (search?: string) =>
    apiFetch<AppUser[]>(search ? `/admin/users?search=${encodeURIComponent(search)}` : '/admin/users');
/**
 * Users whose own `department`/`role` columns match both filters exactly.
 * For Procurement Settings › Signatories' Name select — narrows the list
 * server-side instead of pulling every user in the company into the browser
 * to filter client-side.
 */
export const getUsersByDeptRole = (department: string, role: string) =>
    apiFetch<AppUser[]>(
        `/admin/users?department=${encodeURIComponent(department)}&role=${encodeURIComponent(role)}`,
    );
export const getUser = (id: string) => apiFetch<AppUser>(`/admin/users/${id}`);
export const createUser = (data: Partial<AppUser> & { password?: string }) =>
    apiFetch<AppUser>('/admin/users', { method: 'POST', body: JSON.stringify(data) });
export const updateUser = (id: string, data: Partial<AppUser> & { password?: string }) =>
    apiFetch<AppUser>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteUser = (id: string) =>
    apiFetch<void>(`/admin/users/${id}`, { method: 'DELETE' });
export const activateUser = (id: string) =>
    apiFetch<AppUser>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'Active' }) });
export const deactivateUser = (id: string) =>
    apiFetch<AppUser>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'Inactive' }) });

// Employee → User sync (Admin › Users › Pending Sync from HR)
export interface PendingSyncEmployee {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    email: string;
    jobTitle: string;
    department: string;
    departmentId: string | null;
    dateHired: string;
    phone: string;
    syncStatus: 'unsynced';
}
export const getPendingSyncEmployees = () =>
    apiFetch<PendingSyncEmployee[]>('/admin/users/pending-sync');
export const syncEmployeeToUser = (
    employeeId: string,
    data: { email?: string; role?: string; assignedApps?: string[] },
) =>
    apiFetch<AppUser>(`/admin/employees/${employeeId}/sync`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

// App Roles
export const getAppRoles = () => apiFetch<AppRole[]>('/admin/roles');
export const getAppRole = (id: string) => apiFetch<AppRole>(`/admin/roles/${id}`);
export const createAppRole = (data: Partial<AppRole>) =>
    apiFetch<AppRole>('/admin/roles', { method: 'POST', body: JSON.stringify(data) });
export const updateAppRole = (id: string, data: Partial<AppRole>) =>
    apiFetch<AppRole>(`/admin/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteAppRole = (id: string) =>
    apiFetch<void>(`/admin/roles/${id}`, { method: 'DELETE' });

// Issue Types
export const getIssueTypes = () => apiFetch<IssueTypeConfig[]>('/admin/issue-types');
// Public read for non-admin apps (e.g. ESS Log Issues) to load configured types.
export const getPublicIssueTypes = () => apiFetch<IssueTypeConfig[]>('/admin/issue-types/public');
export const createIssueType = (data: Omit<IssueTypeConfig, 'id'>) =>
    apiFetch<IssueTypeConfig>('/admin/issue-types', { method: 'POST', body: JSON.stringify(data) });
export const updateIssueType = (id: string, data: Partial<Omit<IssueTypeConfig, 'id'>>) =>
    apiFetch<IssueTypeConfig>(`/admin/issue-types/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteIssueType = (id: string) =>
    apiFetch<{ ok: boolean }>(`/admin/issue-types/${id}`, { method: 'DELETE' });

// Change Categories
export const getChangeCategories = () => apiFetch<ChangeCategoryConfig[]>('/admin/change-categories');
// Public read for non-admin apps (e.g. ESS change requests) to load configured categories.
export const getPublicChangeCategories = () => apiFetch<ChangeCategoryConfig[]>('/admin/change-categories/public');
export const createChangeCategory = (data: Omit<ChangeCategoryConfig, 'id'>) =>
    apiFetch<ChangeCategoryConfig>('/admin/change-categories', { method: 'POST', body: JSON.stringify(data) });
export const updateChangeCategory = (id: string, data: Partial<Omit<ChangeCategoryConfig, 'id'>>) =>
    apiFetch<ChangeCategoryConfig>(`/admin/change-categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteChangeCategory = (id: string) =>
    apiFetch<{ ok: boolean }>(`/admin/change-categories/${id}`, { method: 'DELETE' });

// Process Catalog
export const getProcessCatalog = () =>
    apiFetch<ProcessCatalogItem[]>('/admin/process-catalog');
export const createProcessCatalogItem = (data: Omit<ProcessCatalogItem, 'id'> & { id?: string }) =>
    apiFetch<ProcessCatalogItem>('/admin/process-catalog', { method: 'POST', body: JSON.stringify(data) });
export const updateProcessCatalogItem = (id: string, data: Partial<Omit<ProcessCatalogItem, 'id'>>) =>
    apiFetch<ProcessCatalogItem>(`/admin/process-catalog/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteProcessCatalogItem = (id: string) =>
    apiFetch<{ ok: boolean }>(`/admin/process-catalog/${id}`, { method: 'DELETE' });

// Process Workflows
export const getProcessWorkflows = () =>
    apiFetch<ProcessWorkflow[]>('/admin/process-workflows');
export const createProcessWorkflow = (data: Omit<ProcessWorkflow, 'id'> & { id?: string }) =>
    apiFetch<ProcessWorkflow>('/admin/process-workflows', { method: 'POST', body: JSON.stringify(data) });
export const updateProcessWorkflow = (id: string, data: Partial<Omit<ProcessWorkflow, 'id'>>) =>
    apiFetch<ProcessWorkflow>(`/admin/process-workflows/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteProcessWorkflow = (id: string) =>
    apiFetch<{ ok: boolean }>(`/admin/process-workflows/${id}`, { method: 'DELETE' });

// General Settings
export const getAdminGeneralSettings = () =>
    apiFetch<AdminGeneralSettingsPayload>('/admin/general-settings');
// Public, read-only settings used to hydrate display preferences for every
// user (any role, even before sign-in) so the configured currency, formats,
// timezone and language take effect across all apps.
export const getPublicGeneralSettings = () =>
    apiFetch<AdminGeneralSettingsPayload>('/admin/general-settings/public');
export const updateAdminGeneralSettings = (data: AdminGeneralSettingsPayload) =>
    apiFetch<AdminGeneralSettingsPayload>('/admin/general-settings', {
        method: 'PUT',
        body: JSON.stringify(data),
    });

// Store Levels
export interface StoreLevelConfigRecord {
    level: 1 | 2 | 3;
    name: string;
    description: string;
    color: string;
    maxCount?: number | null;
}
export const getStoreLevels = () => apiFetch<StoreLevelConfigRecord[]>('/admin/store-levels');
export const updateStoreLevels = (storeLevels: StoreLevelConfigRecord[]) =>
    apiFetch<StoreLevelConfigRecord[]>('/admin/store-levels', {
        method: 'PUT',
        body: JSON.stringify({ storeLevels }),
    });

// Store Thresholds
export interface StoreThresholdRecord {
    id: string;
    storeName: string;
    storeType: 'General' | 'Project';
    lowStockQty: number;
    outOfStockQty: number;
    unit: string;
}
export const getStoreThresholds = () => apiFetch<StoreThresholdRecord[]>('/admin/store-thresholds');
export const updateStoreThresholds = (storeThresholds: StoreThresholdRecord[]) =>
    apiFetch<StoreThresholdRecord[]>('/admin/store-thresholds', {
        method: 'PUT',
        body: JSON.stringify({ storeThresholds }),
    });

// Units of Measurement
export const getUnits = () => apiFetch<UnitOfMeasurement[]>('/admin/units');
export const createUnit = (data: Omit<UnitOfMeasurement, 'id'>) =>
    apiFetch<UnitOfMeasurement>('/admin/units', { method: 'POST', body: JSON.stringify(data) });
export const updateUnit = (id: string, data: Partial<Omit<UnitOfMeasurement, 'id'>>) =>
    apiFetch<UnitOfMeasurement>(`/admin/units/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteUnit = (id: string) =>
    apiFetch<{ ok: boolean }>(`/admin/units/${id}`, { method: 'DELETE' });

// Material Categories — Category → Material → Type → Dimension
export const getMaterialCategories = () =>
    apiFetch<MaterialCategoryRecord[]>('/admin/material-categories');
export const createMaterialCategory = (data: MaterialCategoryInput) =>
    apiFetch<MaterialCategoryRecord>('/admin/material-categories', { method: 'POST', body: JSON.stringify(data) });
export const updateMaterialCategory = (id: string, data: Partial<MaterialCategoryInput>) =>
    apiFetch<MaterialCategoryRecord>(`/admin/material-categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteMaterialCategory = (id: string) =>
    apiFetch<{ ok: boolean }>(`/admin/material-categories/${id}`, { method: 'DELETE' });
/** Adds new materials under an existing category — everything already there is left untouched. */
export const addMaterialsToCategory = (id: string, data: { materials: MaterialCatalogMaterialInput[] }) =>
    apiFetch<MaterialCategoryRecord>(`/admin/material-categories/${id}/materials`, { method: 'POST', body: JSON.stringify(data) });

// Notifications & Templates
export const getEmailTemplates = () =>
    apiFetch<EmailTemplateConfig[]>('/admin/email-templates');
export const getNotificationRules = () =>
    apiFetch<NotificationRuleConfig[]>('/admin/notification-rules');

/**
 * The events a notification rule can fire on.
 *
 * The rule editor took the event as free text, which could never match
 * anything the system emits; rules are now attached to one of these.
 */
export interface NotificationEventDef {
    key: string;
    label: string;
    app: string;
    description: string;
}
export const getNotificationEvents = () =>
    apiFetch<NotificationEventDef[]>('/admin/notification-events');

// Email Config
export interface EmailConfigRecord {
    id: string;
    name: string;
    module: string;
    trigger: string;
    subject: string;
    body: string;
    recipients: string;
    cc: string;
    enabled: boolean;
}
export const getEmailConfigs = () =>
    apiFetch<EmailConfigRecord[]>('/admin/email-config');
export const createEmailConfig = (data: Omit<EmailConfigRecord, 'id'>) =>
    apiFetch<EmailConfigRecord>('/admin/email-config', { method: 'POST', body: JSON.stringify(data) });
export const updateEmailConfig = (id: string, data: Partial<Omit<EmailConfigRecord, 'id'>>) =>
    apiFetch<EmailConfigRecord>(`/admin/email-config/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteEmailConfig = (id: string) =>
    apiFetch<{ id: string; deleted: boolean }>(`/admin/email-config/${id}`, { method: 'DELETE' });

// Integrations — API Keys & Webhooks
export interface ApiKeyRecord {
    id: string;
    name: string;
    /** Non-secret fragment, e.g. "sk_live_…3f9c". Keys are stored hashed. */
    keyPreview: string;
    status?: string;
    created?: string;
    lastUsed?: string | null;
    /** Created before keys were hashed at rest; should be rotated. */
    isLegacyPlaintext?: boolean;
}

/** createApiKey response — `key` is the plaintext, returned only on creation. */
export interface ApiKeyCreated extends ApiKeyRecord {
    key: string;
    plaintextShownOnce: true;
}
export interface WebhookRecord {
    id: string;
    name: string;
    url: string;
    events: string[];
    status?: string;
}
export const getApiKeys = () => apiFetch<ApiKeyRecord[]>('/admin/api-keys');
export const createApiKey = (data: { name: string }) =>
    apiFetch<ApiKeyCreated>('/admin/api-keys', { method: 'POST', body: JSON.stringify(data) });
export const deleteApiKey = (id: string) =>
    apiFetch<{ id: string; deleted: boolean }>(`/admin/api-keys/${id}`, { method: 'DELETE' });
export const getWebhooks = () => apiFetch<WebhookRecord[]>('/admin/webhooks');
export const createWebhook = (data: { name: string; url: string; events: string[] }) =>
    apiFetch<WebhookRecord>('/admin/webhooks', { method: 'POST', body: JSON.stringify(data) });
export const deleteWebhook = (id: string) =>
    apiFetch<{ id: string; deleted: boolean }>(`/admin/webhooks/${id}`, { method: 'DELETE' });

// Report Templates
export const getReportTemplates = <T = any>() =>
    apiFetch<T[]>('/admin/report-templates');
export const createReportTemplate = <T = any>(data: T) =>
    apiFetch<T>('/admin/report-templates', { method: 'POST', body: JSON.stringify(data) });
export const updateReportTemplate = <T = any>(id: string, data: T) =>
    apiFetch<T>(`/admin/report-templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteReportTemplate = (id: string) =>
    apiFetch<{ id: string; deleted: boolean }>(`/admin/report-templates/${id}`, { method: 'DELETE' });

// Company Profile
export interface CompanyProfile {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    logoUrl?: string | null;
    updatedAt?: string;
}
export const getCompanyProfile = () => apiFetch<CompanyProfile>('/company-profile');
export const updateCompanyProfile = (data: Partial<CompanyProfile>) =>
    apiFetch<CompanyProfile>('/company-profile', { method: 'PUT', body: JSON.stringify(data) });

// Directors
export interface Director {
    id: string;
    firstName: string;
    middleName: string;
    lastName: string;
    designation: string;
    sequence: number;
    createdAt?: string;
    updatedAt?: string;
}
export const getDirectors = () => apiFetch<Director[]>('/admin/directors');
export const createDirector = (data: Omit<Director, 'id' | 'createdAt' | 'updatedAt'>) =>
    apiFetch<Director>('/admin/directors', { method: 'POST', body: JSON.stringify(data) });
export const updateDirector = (id: string, data: Partial<Director>) =>
    apiFetch<Director>(`/admin/directors/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const reorderDirectors = (items: Array<{ id: string; sequence: number }>) =>
    apiFetch<Director[]>('/admin/directors/reorder', { method: 'PATCH', body: JSON.stringify({ items }) });
export const deleteDirector = (id: string) =>
    apiFetch<void>(`/admin/directors/${id}`, { method: 'DELETE' });
// ── Effective permissions (role config + per-user overrides) ──────────────────
/** Why a permission resolved as it did — drives the legend in the UI. */
export type PermissionSource = 'role' | 'allow' | 'deny' | 'open';
export type PermissionAction = 'view' | 'create' | 'edit' | 'approve' | 'delete';
/** Tri-state used by the User Permissions matrix. */
export type OverrideState = 'inherit' | 'allow' | 'deny';

export interface EffectivePermissions {
    userId: string;
    role: string;
    isSuper: boolean;
    /** Apps the user may open. */
    appAccess: string[];
    /** Nav ids (route hrefs) the user may see, per app. */
    navAccess: Record<string, string[]>;
    /** Apps whose nav is unrestricted because no nav config applies. */
    navUnrestrictedApps: string[];
    processPermissions: Record<string, Record<PermissionAction, boolean>>;
    /** What the role alone grants, before any per-user override. */
    roleProcessPermissions: Record<string, Record<PermissionAction, boolean>>;
    processSources: Record<string, Record<PermissionAction, PermissionSource>>;
    processUnrestrictedApps: string[];
    inherited: { navIds: string[]; processIds: string[] };
    extended: { navIds: string[]; processIds: string[]; deniedProcessIds: string[] };
}

/** The caller's own effective permissions. Available to any signed-in user. */
export const getMyPermissions = () => apiFetch<EffectivePermissions>('/me/permissions');
export const getUserPermissions = (userId: string) =>
    apiFetch<EffectivePermissions>(`/admin/users/${userId}/permissions`);
/** Replaces a user's overrides. `inherit` is simply omitted, so the role keeps flowing through. */
export const setUserPermissions = (
    userId: string,
    body: {
        navIds?: string[];
        processOverrides?: Record<string, Partial<Record<PermissionAction, OverrideState>>>;
    },
) =>
    apiFetch<EffectivePermissions>(`/admin/users/${userId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify(body),
    });

// ── Per-user activity & requests (Admin → Users sidebar tabs) ────────────────
export interface UserActivityEntry {
    id: string;
    action: string;
    module: string;
    app: string;
    date: string;
}
export interface UserRequestEntry {
    id: string;
    label: string;
    module: string;
    app: string;
    type: 'submitted' | 'approved' | 'rejected';
    status: string;
    date: string;
}
export const getUserActivity = (userId: string, limit = 50) =>
    apiFetch<UserActivityEntry[]>(`/admin/users/${userId}/activity?limit=${limit}`);
export const getUserRequests = (userId: string) =>
    apiFetch<UserRequestEntry[]>(`/admin/users/${userId}/requests`);

// ── Report Builder query execution ───────────────────────────────────────────
/**
 * The builder's sources and fields come from the backend registry rather than a
 * hardcoded frontend list, so the picker can only offer fields that exist as
 * columns. The old hardcoded list offered several that did not.
 */
export interface ReportSourceField {
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'status';
    /** Derived fields are computed after loading and cannot be filtered or sorted. */
    queryable: boolean;
}
export interface ReportSourceDef {
    value: string;
    label: string;
    module: string;
    app: string;
    fields: ReportSourceField[];
}
export interface ReportRunResult {
    source: string;
    columns: Array<{ key: string; label: string; type: string }>;
    rows: Array<Record<string, string | number | null>>;
    rowCount: number;
    total: number;
    truncated: boolean;
    generatedAt: string;
}

/**
 * A template deployed from Report Builder, as an app's Reports module sees it.
 * Only the configuration needed to run and label the report.
 */
export interface DeployedReportTemplate {
    id: string;
    name: string;
    description: string;
    application: string;
    /** Comma-joined source list; multi-source templates carry several. */
    dataSource: string;
    vizType?: string;
    selectedFields: Array<{ key: string; displayLabel: string; aggregation?: string }>;
    filters: Array<{
        field: string;
        operator: string;
        value: string;
        valueTo?: string;
    }>;
    sortRules: Array<{ field: string; direction: 'asc' | 'desc' }>;
    rowLimit: number;
}

/** Deployed templates for one application's Reports module. */
export const getDeployedReportTemplates = (app?: string) =>
    apiFetch<DeployedReportTemplate[]>(
        `/report-templates/deployed${app ? `?app=${encodeURIComponent(app)}` : ''}`,
    );

export const getReportSources = () =>
    apiFetch<{ success: boolean; data: ReportSourceDef[] }>('/reports/sources').then((r) => r.data);

export const runReport = (body: {
    /** Single-source form. Prefer `sources`; kept for existing callers. */
    source?: string;
    /**
     * Multi-source form. With more than one source, field/filter/sort keys are
     * namespaced `<source>:<fieldKey>` so a column name shared by two tables
     * stays unambiguous, and rows carry a `__source` column.
     */
    sources?: string[];
    fields?: string[];
    filters?: Array<{ field: string; operator: string; value?: string; valueTo?: string }>;
    sort?: Array<{ field: string; direction?: 'asc' | 'desc' }>;
    limit?: number;
}) =>
    apiFetch<{ success: boolean; data: ReportRunResult }>('/reports/run', {
        method: 'POST',
        body: JSON.stringify(body),
    }).then((r) => r.data);
