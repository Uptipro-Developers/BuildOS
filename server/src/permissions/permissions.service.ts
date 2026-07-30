import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_PROCESS_CATALOG } from '../common/process-catalog';

/** Must match the key AdminExtrasService writes its settings row under. */
const ADMIN_SETTINGS_KEY = 'admin-settings';

export type PermissionAction = 'view' | 'create' | 'edit' | 'approve' | 'delete';

export const PERMISSION_ACTIONS: PermissionAction[] = [
    'view',
    'create',
    'edit',
    'approve',
    'delete',
];

/** Tri-state used by the Admin → User Permissions matrix. */
export type OverrideState = 'inherit' | 'allow' | 'deny';

/**
 * Why a permission resolved the way it did — drives the legend in the UI.
 *  - `role`  granted by the user's role
 *  - `allow` explicitly granted on the user, on top of the role
 *  - `deny`  explicitly revoked on the user, overriding the role
 *  - `open`  no configuration exists for this app, so it is not restricted
 */
export type PermissionSource = 'role' | 'allow' | 'deny' | 'open';

export type ProcessPermissionMap = Record<string, Record<PermissionAction, boolean>>;
export type ProcessSourceMap = Record<string, Record<PermissionAction, PermissionSource>>;

export interface EffectivePermissions {
    userId: string;
    role: string;
    isSuper: boolean;
    /** Apps the user may open. The user record is authoritative, not the role. */
    appAccess: string[];
    /** Nav ids (route hrefs) the user may see, per app. */
    navAccess: Record<string, string[]>;
    /** Apps whose nav is unrestricted because no nav config applies to them. */
    navUnrestrictedApps: string[];
    /** Every catalog process the user has app access to → allowed actions. */
    processPermissions: ProcessPermissionMap;
    /**
     * What the role alone grants, before any per-user override.
     *
     * The UI needs this to show an overridden cell's underlying inherited value —
     * `processSources` only records that a cell *was* overridden, not what it
     * would otherwise have resolved to.
     */
    roleProcessPermissions: ProcessPermissionMap;
    /** Where each of those decisions came from. */
    processSources: ProcessSourceMap;
    /** Apps whose processes are unrestricted because no process config applies. */
    processUnrestrictedApps: string[];
    /** Provenance summary, so the UI can label inherited vs. extended grants. */
    inherited: { navIds: string[]; processIds: string[] };
    extended: { navIds: string[]; processIds: string[]; deniedProcessIds: string[] };
}

/**
 * Resolves the permissions that actually apply to a user.
 *
 * Roles already stored three layers of configuration — app access, navigation and
 * per-process VCEAD — but nothing ever read them, so none of it had any effect.
 * This service is the single place that turns that stored configuration, plus any
 * per-user override, into a decision, so the API guards and the UI agree on one
 * answer instead of each inventing their own.
 *
 * Precedence, highest first: a user-level deny, a user-level allow, the role's
 * configuration, then the unconfigured default.
 *
 * Unconfigured layers fail OPEN, deliberately and per app. Only one of the eleven
 * roles had navigation or process configuration stored, so treating
 * "unconfigured" as "denied" would have stripped every other role of all
 * navigation and every action the moment enforcement shipped. Failing open
 * preserves the previous behaviour exactly and makes each layer bite only where an
 * admin has actually configured it; `seedRoleProcessDefaults` then gives roles a
 * real starting point to tighten from.
 *
 * Per-app granularity matters for the extension case: a user an admin extended
 * into Finance cannot be governed by a role that only ever configured HR, so
 * Finance falls open for that user rather than resolving to nothing.
 */
@Injectable()
export class PermissionsService {
    private readonly logger = new Logger(PermissionsService.name);

    constructor(private prisma: PrismaService) {}

    /**
     * A permission map covering only the actions a process supports.
     *
     * Unsupported verbs are absent rather than false, so the matrices can omit the
     * cell entirely instead of rendering a box an admin could tick to no effect.
     */
    private supportedOnly<T>(
        actions: PermissionAction[] | undefined,
        value: T,
    ): Record<PermissionAction, T> {
        const supported = actions?.length ? actions : PERMISSION_ACTIONS;
        return Object.fromEntries(supported.map((a) => [a, value])) as Record<
            PermissionAction,
            T
        >;
    }

    private blankActions<T>(value: T): Record<PermissionAction, T> {
        return Object.fromEntries(PERMISSION_ACTIONS.map((a) => [a, value])) as Record<
            PermissionAction,
            T
        >;
    }

    /**
     * Decodes the stored entry format.
     *
     * `nav:<navId>`                     — navigation grant
     * `proc:<processId>:<action>`       — process grant
     * `deny:<processId>:<action>`       — process revocation (user level only)
     *
     * Roles only ever hold the first two; `deny` exists because the User
     * Permissions matrix is a tri-state (inherit / allow / deny) and a revocation
     * cannot be expressed by simply omitting a grant.
     */
    private decodeEntries(entries: unknown) {
        const navIds: string[] = [];
        const allowed: ProcessPermissionMap = {};
        const denied: ProcessPermissionMap = {};

        for (const raw of Array.isArray(entries) ? entries : []) {
            const entry = String(raw ?? '');

            if (entry.startsWith('nav:')) {
                const navId = entry.slice(4);
                if (navId) navIds.push(navId);
                continue;
            }

            const isDeny = entry.startsWith('deny:');
            if (!isDeny && !entry.startsWith('proc:')) continue;

            // Process ids never contain ':', so a 3-part split is safe.
            const [, processId, action] = entry.split(':');
            if (!processId || !PERMISSION_ACTIONS.includes(action as PermissionAction)) continue;

            const target = isDeny ? denied : allowed;
            const current = target[processId] ?? this.blankActions(false);
            current[action as PermissionAction] = true;
            target[processId] = current;
        }

        return { navIds, allowed, denied };
    }

    /**
     * The process catalog as app → process ids.
     *
     * Mirrors how Admin serves it: the module-derived defaults with any
     * admin-created custom processes merged over them by id, so the User
     * Permissions matrix lists exactly the processes Process Configuration shows.
     * Read straight from the settings row rather than through AdminExtrasService,
     * which would make the dependency circular.
     */
    private async loadCatalog(): Promise<
        { byApp: Record<string, string[]>; actionsOf: Record<string, PermissionAction[]> }
    > {
        const byId = new Map<string, { app: string; actions: PermissionAction[] }>();
        for (const proc of DEFAULT_PROCESS_CATALOG) {
            byId.set(proc.id, {
                app: String(proc.app ?? '').trim().toLowerCase(),
                actions: proc.actions as PermissionAction[],
            });
        }

        try {
            const row = await this.prisma.systemSetting.findUnique({
                where: { key: ADMIN_SETTINGS_KEY },
            });
            const value = row?.value as Record<string, any> | undefined;
            const custom = Array.isArray(value?.processCatalog) ? value!.processCatalog : [];
            for (const item of custom) {
                const id = String(item?.id ?? '').trim();
                const app = String(item?.app ?? '').trim().toLowerCase();
                if (!id || !app) continue;
                // An admin-created process without an explicit action list supports
                // the full set; anything listed is filtered to the known verbs.
                const declared = Array.isArray(item?.actions)
                    ? (item.actions as unknown[])
                          .map((a) => String(a).trim().toLowerCase())
                          .filter((a): a is PermissionAction =>
                              PERMISSION_ACTIONS.includes(a as PermissionAction),
                          )
                    : PERMISSION_ACTIONS;
                byId.set(id, { app, actions: declared.length > 0 ? declared : PERMISSION_ACTIONS });
            }
        } catch (error) {
            this.logger.warn(
                `Could not read custom process catalog; using module defaults only: ${(error as Error).message}`,
            );
        }

        const byApp: Record<string, string[]> = {};
        const actionsOf: Record<string, PermissionAction[]> = {};
        for (const [id, meta] of byId) {
            if (!meta.app) continue;
            (byApp[meta.app] ??= []).push(id);
            actionsOf[id] = meta.actions;
        }
        return { byApp, actionsOf };
    }

    async resolveForUser(userId: string): Promise<EffectivePermissions> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, assignedApps: true, permissionOverrides: true },
        });
        if (!user) throw new Error(`User ${userId} not found`);

        const roleName = String(user.role ?? '').trim();
        const canonical = roleName.toLowerCase().replace(/[\s_-]+/g, '');
        const roles = await this.prisma.appRole.findMany({
            select: { name: true, isSuper: true, appScope: true, inheritedRoles: true },
        });
        const role = roles.find(
            (r) => String(r.name ?? '').toLowerCase().replace(/[\s_-]+/g, '') === canonical,
        );

        // ESS is every user's baseline, matching the Users UI which pins it on.
        const appAccess = Array.from(
            new Set([
                'ess',
                ...(Array.isArray(user.assignedApps) ? user.assignedApps : []).map((a) =>
                    String(a).trim().toLowerCase(),
                ),
            ]),
        ).filter(Boolean);

        const { byApp: processApps, actionsOf } = await this.loadCatalog();
        const appOfProcess: Record<string, string> = {};
        for (const [app, ids] of Object.entries(processApps)) {
            for (const id of ids) appOfProcess[id] = app;
        }

        const fromRole = this.decodeEntries(role?.inheritedRoles);
        const fromUser = this.decodeEntries(user.permissionOverrides);

        if (role?.isSuper) {
            // A super role is unconditional; enumerate everything so the UI shows
            // it as granted rather than as "unconfigured".
            const permissions: ProcessPermissionMap = {};
            const sources: ProcessSourceMap = {};
            for (const ids of Object.values(processApps)) {
                for (const id of ids) {
                    // Only the actions this process supports — an unsupported verb
                    // must not appear even for a super role.
                    permissions[id] = this.supportedOnly(actionsOf[id], true);
                    sources[id] = this.supportedOnly<PermissionSource>(actionsOf[id], 'role');
                }
            }
            return {
                userId: user.id,
                role: roleName,
                isSuper: true,
                appAccess,
                navAccess: {},
                navUnrestrictedApps: appAccess,
                processPermissions: permissions,
                roleProcessPermissions: permissions,
                processSources: sources,
                processUnrestrictedApps: appAccess,
                inherited: { navIds: [], processIds: Object.keys(permissions) },
                extended: { navIds: [], processIds: [], deniedProcessIds: [] },
            };
        }

        // ── Navigation, per app ──
        // A nav id is its route href, so the owning app is read off the path.
        const appOfNav = (navId: string) => {
            const match = /^\/apps\/([^/]+)/.exec(navId);
            return match ? match[1].toLowerCase() : '';
        };
        const groupByApp = (ids: string[]) => {
            const grouped: Record<string, string[]> = {};
            for (const id of ids) {
                const app = appOfNav(id);
                if (app) (grouped[app] ??= []).push(id);
            }
            return grouped;
        };
        const roleNavByApp = groupByApp(fromRole.navIds);
        const userNavByApp = groupByApp(fromUser.navIds);

        const navAccess: Record<string, string[]> = {};
        const navUnrestrictedApps: string[] = [];
        for (const app of appAccess) {
            const configured = roleNavByApp[app] ?? [];
            if (configured.length === 0) {
                navUnrestrictedApps.push(app);
                continue;
            }
            navAccess[app] = Array.from(new Set([...configured, ...(userNavByApp[app] ?? [])]));
        }

        // ── Processes, per app ──
        const roleConfiguredApps = new Set(
            Object.keys(fromRole.allowed)
                .map((id) => appOfProcess[id])
                .filter(Boolean),
        );

        const processPermissions: ProcessPermissionMap = {};
        const processSources: ProcessSourceMap = {};
        const processUnrestrictedApps: string[] = [];

        // Baseline: every catalog process in an app the user can reach. Apps the
        // role never configured start fully open; configured apps start closed and
        // are opened by the role's grants below.
        for (const app of appAccess) {
            const open = !roleConfiguredApps.has(app);
            if (open) processUnrestrictedApps.push(app);
            for (const id of processApps[app] ?? []) {
                processPermissions[id] = this.supportedOnly(actionsOf[id], open);
                processSources[id] = this.supportedOnly<PermissionSource>(
                    actionsOf[id],
                    open ? 'open' : 'role',
                );
            }
        }

        // Role grants. Actions the process does not support are dropped, so a
        // stored grant for a verb that was later removed from the catalog is inert.
        for (const [id, perms] of Object.entries(fromRole.allowed)) {
            const app = appOfProcess[id];
            if (app && !appAccess.includes(app)) continue; // no app access ⇒ no process
            if (!actionsOf[id]) continue; // not in the catalog at all
            processPermissions[id] ??= this.supportedOnly(actionsOf[id], false);
            processSources[id] ??= this.supportedOnly<PermissionSource>(actionsOf[id], 'role');
            for (const action of actionsOf[id]) {
                if (!perms[action]) continue;
                processPermissions[id][action] = true;
                processSources[id][action] = 'role';
            }
        }

        // Snapshot what the role alone decided, before user overrides are applied,
        // so the UI can show an overridden cell's underlying inherited value.
        const roleProcessPermissions: ProcessPermissionMap = Object.fromEntries(
            Object.entries(processPermissions).map(([id, actions]) => [id, { ...actions }]),
        );

        // User-level allows, then denies — deny wins.
        for (const [id, perms] of Object.entries(fromUser.allowed)) {
            const app = appOfProcess[id];
            if (app && !appAccess.includes(app)) continue;
            if (!actionsOf[id]) continue;
            processPermissions[id] ??= this.supportedOnly(actionsOf[id], false);
            processSources[id] ??= this.supportedOnly<PermissionSource>(actionsOf[id], 'role');
            for (const action of actionsOf[id]) {
                if (!perms[action]) continue;
                processPermissions[id][action] = true;
                processSources[id][action] = 'allow';
            }
        }
        for (const [id, perms] of Object.entries(fromUser.denied)) {
            const app = appOfProcess[id];
            if (app && !appAccess.includes(app)) continue;
            if (!actionsOf[id]) continue;
            processPermissions[id] ??= this.supportedOnly(actionsOf[id], false);
            processSources[id] ??= this.supportedOnly<PermissionSource>(actionsOf[id], 'role');
            for (const action of actionsOf[id]) {
                if (!perms[action]) continue;
                processPermissions[id][action] = false;
                processSources[id][action] = 'deny';
            }
        }

        return {
            userId: user.id,
            role: roleName,
            isSuper: false,
            appAccess,
            navAccess,
            navUnrestrictedApps,
            processPermissions,
            roleProcessPermissions,
            processSources,
            processUnrestrictedApps,
            inherited: { navIds: fromRole.navIds, processIds: Object.keys(fromRole.allowed) },
            extended: {
                navIds: fromUser.navIds,
                processIds: Object.keys(fromUser.allowed),
                deniedProcessIds: Object.keys(fromUser.denied),
            },
        };
    }

    /**
     * Whether a user may perform an action on a process. Used by the API guards.
     *
     * Anything left unconfigured resolves to allowed, so a guard can be added to
     * an endpoint without changing behaviour until an admin actually restricts the
     * role — except where the admin has set an explicit deny, which always bites.
     */
    async can(userId: string, processId: string, action: PermissionAction): Promise<boolean> {
        try {
            const effective = await this.resolveForUser(userId);
            if (effective.isSuper) return true;

            const source = effective.processSources[processId]?.[action];
            // An explicit deny always bites.
            if (source === 'deny') return false;
            if (source !== undefined) {
                return Boolean(effective.processPermissions[processId]?.[action]);
            }

            // Nothing resolved for this process/action. Distinguish the two causes:
            // a process the catalog does not define (a guard naming a retired or
            // mistyped id) must not lock everyone out of a working endpoint, so it
            // is allowed and logged loudly. A process that exists but does not
            // support this action, or sits outside the user's app access, is a real
            // denial.
            const { actionsOf } = await this.loadCatalog();
            const supported = actionsOf[processId];
            if (!supported) {
                this.logger.warn(
                    `Guard references process "${processId}", which is not in the catalog — allowing. ` +
                        `Update the guard or add the process to DEFAULT_PROCESS_CATALOG.`,
                );
                return true;
            }
            if (!supported.includes(action)) {
                this.logger.warn(
                    `Guard requires "${action}" on "${processId}", which does not support it — allowing. ` +
                        `Add "${action}" to that process's actions if it now has a workflow.`,
                );
                return true;
            }
            return false;
        } catch (error) {
            // A resolution failure must not silently deny a legitimate request;
            // log it loudly and fall back to the pre-enforcement behaviour.
            this.logger.error(
                `Permission resolution failed for user ${userId} (${processId}:${action})`,
                error as Error,
            );
            return true;
        }
    }

    /**
     * Replaces a user's permission overrides.
     *
     * `inherit` stores nothing, which is what makes a later change to the role
     * flow through to the user; only explicit allows and denies are persisted.
     */
    async setUserOverrides(
        userId: string,
        input: {
            navIds?: string[];
            processOverrides?: Record<string, Record<string, OverrideState>>;
            /** Accepted for convenience: a plain boolean map means "allow these". */
            processPermissions?: Record<string, Record<string, boolean>>;
        },
    ) {
        const entries: string[] = [];

        for (const navId of input.navIds ?? []) {
            const clean = String(navId ?? '').trim();
            if (clean) entries.push(`nav:${clean}`);
        }

        for (const [processId, actions] of Object.entries(input.processOverrides ?? {})) {
            const clean = String(processId ?? '').trim();
            if (!clean) continue;
            for (const action of PERMISSION_ACTIONS) {
                const state = (actions as any)?.[action];
                if (state === 'allow') entries.push(`proc:${clean}:${action}`);
                else if (state === 'deny') entries.push(`deny:${clean}:${action}`);
            }
        }

        for (const [processId, perms] of Object.entries(input.processPermissions ?? {})) {
            const clean = String(processId ?? '').trim();
            if (!clean) continue;
            for (const action of PERMISSION_ACTIONS) {
                if ((perms as any)?.[action]) entries.push(`proc:${clean}:${action}`);
            }
        }

        await this.prisma.user.update({
            where: { id: userId },
            data: { permissionOverrides: Array.from(new Set(entries)) },
        });

        return this.resolveForUser(userId);
    }

    /**
     * Gives every non-super role a real Layer 3 starting point.
     *
     * Idempotent, and only ever touches roles with NO process configuration at
     * all — a role an admin has already configured is left exactly as it is.
     * Authority actions (approve, delete) are withheld unless the role name
     * indicates a supervisory role, so the seeded defaults are a floor to tighten
     * rather than a blanket grant.
     */
    async seedRoleProcessDefaults(): Promise<{ seeded: string[] }> {
        const roles = await this.prisma.appRole.findMany({
            select: { id: true, name: true, isSuper: true, appScope: true, inheritedRoles: true },
        });
        const { byApp: processApps, actionsOf } = await this.loadCatalog();
        if (Object.keys(processApps).length === 0) return { seeded: [] };

        const AUTHORITY = /manager|lead|head|director|officer|approver|supervisor|admin/i;
        const seeded: string[] = [];

        for (const role of roles) {
            if (role.isSuper) continue;
            const existing = Array.isArray(role.inheritedRoles) ? role.inheritedRoles : [];

            // "Already configured" means configured against processes that still
            // exist. A role whose every grant names a retired process id is
            // effectively unconfigured: those grants resolve to nothing, and a
            // plain `.startsWith('proc:')` check would treat them as configuration
            // and skip the role forever. This happened in practice when the catalog
            // moved from action-grained ids ("p_approve_lv") to entity-grained ones
            // ("p_leave_requests"), leaving every role holding dead grants.
            const procEntries = existing.filter((e) => String(e).startsWith('proc:'));
            const liveGrants = procEntries.filter((e) => {
                const [, processId] = String(e).split(':');
                return processId ? Boolean(actionsOf[processId]) : false;
            });
            const deadGrants = procEntries.length - liveGrants.length;

            // Reseed when most of a role's grants are dead. A handful of live ones
            // among many dead is residue from a catalog restructure, not
            // configuration: when the catalog moved to entity-grained ids, a few
            // ids (p_goods_receipt, p_supplier_compliance) happened to survive
            // unchanged, leaving roles "configured" on two of nine procurement
            // processes. Because an app counts as configured the moment it has one
            // live grant, that would have *restricted* Procurement Managers to
            // exactly those two and silently removed the rest.
            //
            // A genuinely configured role has no dead grants and is left untouched.
            if (liveGrants.length > 0 && liveGrants.length >= deadGrants) continue;

            // Drop the dead grants rather than accumulating them alongside the
            // fresh ones.
            // Keep nav grants and any still-valid process grants; only the dead
            // ones are discarded.
            const retained = [
                ...existing.filter((e) => !String(e).startsWith('proc:')),
                ...liveGrants,
            ];

            const actions: PermissionAction[] = AUTHORITY.test(String(role.name ?? ''))
                ? ['view', 'create', 'edit', 'approve', 'delete']
                : ['view', 'create', 'edit'];

            const additions: string[] = [];
            for (const app of Array.isArray(role.appScope) ? role.appScope : []) {
                for (const processId of processApps[String(app).trim().toLowerCase()] ?? []) {
                    // Never seed a verb the process does not support.
                    const supported = actionsOf[processId] ?? PERMISSION_ACTIONS;
                    for (const action of actions) {
                        if (supported.includes(action)) additions.push(`proc:${processId}:${action}`);
                    }
                }
            }
            if (additions.length === 0) continue;

            await this.prisma.appRole.update({
                where: { id: role.id },
                data: { inheritedRoles: Array.from(new Set([...retained, ...additions])) },
            });
            seeded.push(
                deadGrants > 0
                    ? `${role.name} (cleared ${deadGrants} stale grants)`
                    : role.name,
            );
        }

        if (seeded.length > 0) {
            this.logger.log(`Seeded default process permissions for: ${seeded.join(', ')}`);
        }
        return { seeded };
    }
}
