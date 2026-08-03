import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { verify, type JwtPayload } from 'jsonwebtoken';
import { RedisService } from '../redis/redis.service';
import { RedisKeys } from '../redis/redis.constants';
import { ServiceKeyService } from './service-key.service';
import { PrismaService } from '../prisma/prisma.service';
import {
    PERMISSION_ACTIONS,
    PermissionAction,
    PermissionsService,
} from '../permissions/permissions.service';

interface AuthTokenPayload extends JwtPayload {
    sub?: string;
    email?: string;
    role?: string | string[];
    roles?: string | string[];
    permissions?: string[];
    assignedApps?: string[];
}

/**
 * Global authentication + authorization guard.
 *
 * Security posture: every route requires a valid JWT UNLESS explicitly marked
 * with `@Public()`. This replaces the previous behaviour where any route
 * without a `@Roles()` decorator was open to anonymous callers.
 *
 *  - Missing/invalid token on a protected route  → 401 (lets the client refresh)
 *  - Authenticated but lacking role/permission    → 403
 *  - Token issued before a revocation marker      → 401 (Redis-backed, optional)
 *
 * Routes marked `@ServiceAuth()` additionally accept a machine credential in
 * `X-Api-Key`. That check lives here rather than in a separate route-level
 * guard because this guard is registered globally (APP_GUARD) and therefore
 * runs first — a route-scoped guard would never see the request.
 */
/** How often a given user's presence is written back. */
const TOUCH_INTERVAL_MS = 2 * 60 * 1000;

/** Ceiling on the throttle map before stale entries are swept. */
const MAX_TRACKED_USERS = 5000;

/** How long the role table is reused before it is read again. */
const ROLE_CACHE_TTL_MS = 30 * 1000;

/** Every user reaches ESS regardless of what has been assigned. */
const BASELINE_APP = 'ess';

interface ConfiguredRole {
    name: string;
    isSuper: boolean;
    appScope: string[];
}

/**
 * Role and app names are compared ignoring case AND separators. Roles are stored
 * in display form ("HR Manager") while the decorators use slugs ("hr-manager");
 * lowercasing alone left "hr manager" !== "hr-manager". Matches PermissionsService.
 */
const canonical = (value: unknown): string =>
    String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, '');

@Injectable()
export class JwtAuthGuard implements CanActivate {
    /**
     * Last time each user's presence was written, shared across guard instances
     * so the throttle holds regardless of how Nest resolves this provider.
     */
    private static readonly lastTouched = new Map<string, number>();

    /**
     * The configured role table, cached briefly.
     *
     * The authorisation fallback below reads this on every request that the static
     * `@Roles()` list does not satisfy — which, for a non-admin, is most of them.
     * Role configuration changes rarely, so a short TTL keeps the guard off the hot
     * path without letting an admin's edit take meaningfully long to apply.
     */
    private static roleCache: { at: number; roles: ConfiguredRole[] } | null = null;

    constructor(
        private readonly reflector: Reflector,
        private readonly redis: RedisService,
        private readonly serviceKeys: ServiceKeyService,
        private readonly prisma: PrismaService,
        private readonly permissions: PermissionsService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
            context.getHandler(),
            context.getClass(),
        ]);
        const isServiceAuth = this.reflector.getAllAndOverride<boolean>('isServiceAuth', [
            context.getHandler(),
            context.getClass(),
        ]);

        const request = context.switchToHttp().getRequest<Request>();
        const payload = this.extractAndVerify(request);
        if (payload) {
            request.user = payload;
        }

        if (isPublic) {
            return true;
        }

        // Machine callers on a @ServiceAuth() route authenticate with a key and
        // bypass the role/permission/app decorators, which describe human
        // authorisation. A user JWT on the same route still gets the full
        // checks below, so the UI keeps working unchanged.
        if (isServiceAuth && !payload) {
            const record = await this.serviceKeys.verify(this.extractServiceKey(request));
            if (record) {
                (request as any).serviceClient = { id: record.id, name: record.name };
                return true;
            }
        }

        if (!payload || !payload.sub) {
            throw new UnauthorizedException(
                isServiceAuth
                    ? 'Authentication required: supply a bearer token or a valid X-Api-Key'
                    : 'Authentication required',
            );
        }

        await this.assertNotRevoked(payload);
        await this.assertRoles(context, payload);
        await this.assertPermissions(context, payload);
        await this.assertApps(context, payload);
        this.touchPresence(payload.sub);
        return true;
    }

    /**
     * Records that this user is currently using the app, for the Active Sessions
     * metric.
     *
     * Throttled through an in-process map so an active user costs one write per
     * TOUCH_INTERVAL_MS rather than one per request, and deliberately not awaited
     * — presence is a metric, and it must not add latency to, or fail, the
     * request it is observing.
     */
    private touchPresence(userId?: string): void {
        if (!userId) return;
        const now = Date.now();
        const last = JwtAuthGuard.lastTouched.get(userId) ?? 0;
        if (now - last < TOUCH_INTERVAL_MS) return;
        JwtAuthGuard.lastTouched.set(userId, now);

        // Bound the map: without this a long-running process accumulates an entry
        // for every user that ever signed in.
        if (JwtAuthGuard.lastTouched.size > MAX_TRACKED_USERS) {
            for (const [key, at] of JwtAuthGuard.lastTouched) {
                if (now - at > TOUCH_INTERVAL_MS) JwtAuthGuard.lastTouched.delete(key);
            }
        }

        // Wrapped as well as `.catch`ed: presence is a metric, and neither a
        // rejected write nor a synchronous failure may surface on the request
        // that happened to trigger it.
        try {
            void this.prisma.user
                ?.update({ where: { id: userId }, data: { lastSeenAt: new Date() } })
                ?.catch(() => undefined);
        } catch {
            /* ignore */
        }
    }

    private extractAndVerify(request: Request): AuthTokenPayload | null {
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return null;
        }
        const token = authHeader.slice(7).trim();
        if (!token) {
            return null;
        }
        try {
            const secret = process.env.JWT_SECRET || 'buildos_jwt_secret_change_in_production';
            const decoded = verify(token, secret);
            return typeof decoded === 'string' ? null : (decoded as AuthTokenPayload);
        } catch {
            return null;
        }
    }

    /**
     * Pull the service credential off the request. `X-Api-Key` is canonical;
     * `Authorization: ApiKey <key>` is accepted for clients that can only set
     * an Authorization header.
     */
    private extractServiceKey(request: Request): string | null {
        const header = request.headers['x-api-key'];
        const fromHeader = Array.isArray(header) ? header[0] : header;
        if (fromHeader && String(fromHeader).trim()) {
            return String(fromHeader).trim();
        }

        const authHeader = request.headers.authorization;
        if (authHeader?.startsWith('ApiKey ')) {
            const value = authHeader.slice(7).trim();
            if (value) return value;
        }

        return null;
    }

    private async assertNotRevoked(payload: AuthTokenPayload): Promise<void> {
        if (!this.redis.isEnabled || !payload.sub || !payload.iat) {
            return;
        }
        const revokedAtRaw = await this.redis.getRaw(RedisKeys.userRevokedAt(payload.sub));
        if (!revokedAtRaw) {
            return;
        }
        const revokedAt = Number(revokedAtRaw);
        if (Number.isFinite(revokedAt) && payload.iat < revokedAt) {
            throw new UnauthorizedException('Session has been revoked. Please log in again.');
        }
    }

    private async assertRoles(
        context: ExecutionContext,
        payload: AuthTokenPayload,
    ): Promise<void> {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles || requiredRoles.length === 0) {
            return;
        }

        const rawRoles = payload.role ?? payload.roles ?? [];
        const userRoles = (Array.isArray(rawRoles) ? rawRoles : [rawRoles]).map(canonical);
        const needed = requiredRoles.map(canonical);
        if (needed.some((role) => userRoles.includes(role))) {
            return;
        }

        // The `@Roles()` lists name a fixed set of built-in slugs, so a role an
        // admin created ("Procurement Officer"), or a built-in one simply not named
        // on the endpoint, could never satisfy one no matter what had been granted —
        // every such user got "does not have required role(s): admin". Fall back to
        // the configuration an admin actually edits.
        if (await this.roleSatisfiesByConfig(userRoles, context, payload)) {
            return;
        }

        throw new ForbiddenException(
            `User does not have required role(s): ${requiredRoles.join(', ')}`,
        );
    }

    /**
     * Whether the caller's configured access clears a `@Roles()` gate.
     *
     * `@Roles()` names built-in slugs and is therefore only ever a hint about who an
     * endpoint is for — it is not the permission model. The model has three layers,
     * and this consults them in order:
     *
     *  0. The caller's role must resolve to a configured role at all. An app
     *     assignment alone is not a grant — see the `!match` branch below.
     *  1. A role flagged `isSuper` clears any gate.
     *  2. App access — the route's declared app against the caller's assigned apps.
     *     The *user* record is authoritative here, not the role, so an admin who
     *     extends one user into an extra application is honoured; the role's own
     *     `appScope` is accepted as well, since that is how access is granted in
     *     bulk.
     *  3. The process permission the route declares via `@RequiresProcess()`, but
     *     only where an admin has actually granted it. `PermissionsService` resolves
     *     unconfigured processes as open by design, and an "open" result must not be
     *     what unlocks a role-gated endpoint — so only an explicit `role` or `allow`
     *     grant counts here.
     *
     * A route that declares neither an app nor a process has nothing to resolve
     * against, so the static list stays authoritative and the caller is denied.
     */
    private async roleSatisfiesByConfig(
        userRoles: string[],
        context: ExecutionContext,
        payload: AuthTokenPayload,
    ): Promise<boolean> {
        try {
            const match = await this.findConfiguredRole(userRoles);
            // No configured role means there is no grant to honour, only an app
            // assignment sitting on the user record. That combination is drift — a
            // role string that no longer names a real role, such as the deprecated
            // `viewer` default on User.role — and it must not be what opens a
            // role-gated endpoint. A real role an admin created always resolves here.
            if (!match) return false;
            if (match.isSuper) return true;

            // ── Layer 1: app access ──
            const requiredApps = this.reflector.getAllAndOverride<string[]>('requiredApps', [
                context.getHandler(),
                context.getClass(),
            ]);
            if (requiredApps?.length) {
                const reachable = this.appAccessOf(payload, match);
                if (requiredApps.map(canonical).some((app) => reachable.has(app))) {
                    return true;
                }
            }

            // ── Layer 3: the process this route declares ──
            const process = this.reflector.getAllAndOverride<{
                processId: string;
                action: PermissionAction;
            }>('requiredProcessPermission', [context.getHandler(), context.getClass()]);
            if (process?.processId && payload.sub) {
                const effective = await this.permissions.resolveForUser(payload.sub);
                const source = effective.processSources[process.processId]?.[process.action];
                if (source === 'role' || source === 'allow') {
                    return Boolean(
                        effective.processPermissions[process.processId]?.[process.action],
                    );
                }
            }

            return false;
        } catch {
            // A lookup failure must not turn into a spurious denial for a user the
            // static list would otherwise have rejected; keep the original outcome.
            return false;
        }
    }

    /** The configured role row matching any of the caller's role names. */
    private async findConfiguredRole(userRoles: string[]): Promise<ConfiguredRole | undefined> {
        if (userRoles.length === 0) return undefined;
        const roles = await this.loadRoles();
        return roles.find((role) => userRoles.includes(canonical(role.name)));
    }

    private async loadRoles(): Promise<ConfiguredRole[]> {
        const cached = JwtAuthGuard.roleCache;
        if (cached && Date.now() - cached.at < ROLE_CACHE_TTL_MS) {
            return cached.roles;
        }
        const rows = await this.prisma.appRole.findMany({
            select: { name: true, isSuper: true, appScope: true },
        });
        const roles: ConfiguredRole[] = rows.map((row) => ({
            name: String(row.name ?? ''),
            isSuper: Boolean(row.isSuper),
            appScope: Array.isArray(row.appScope) ? row.appScope.map(String) : [],
        }));
        JwtAuthGuard.roleCache = { at: Date.now(), roles };
        return roles;
    }

    /**
     * Every app the caller can reach: the per-user assignment (authoritative, and
     * what an admin extends), plus whatever the role grants in bulk.
     */
    private appAccessOf(payload: AuthTokenPayload, role?: ConfiguredRole): Set<string> {
        const apps = new Set<string>([BASELINE_APP]);
        for (const app of Array.isArray(payload.assignedApps) ? payload.assignedApps : []) {
            apps.add(canonical(app));
        }
        for (const app of role?.appScope ?? []) {
            apps.add(canonical(app));
        }
        return apps;
    }

    /**
     * Enforces `@Permissions('<processId>:<action>')`.
     *
     * This previously compared against a `permissions` claim on the JWT — a claim
     * `issueTokenPair` has never issued, so every listed permission read as missing
     * and any endpoint carrying this decorator would have 403'd every user,
     * including admins. Resolved through the permission configuration instead, which
     * is where the answer actually lives.
     */
    private async assertPermissions(
        context: ExecutionContext,
        payload: AuthTokenPayload,
    ): Promise<void> {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return;
        }

        // A claim, where one is present, is still honoured so a token carrying
        // pre-resolved permissions keeps working.
        const claimed = Array.isArray(payload.permissions) ? payload.permissions : [];
        const unclaimed = requiredPermissions.filter((perm) => !claimed.includes(perm));
        if (unclaimed.length === 0 || !payload.sub) {
            if (unclaimed.length > 0) {
                throw new ForbiddenException(`User missing permissions: ${unclaimed.join(', ')}`);
            }
            return;
        }

        const missing: string[] = [];
        for (const perm of unclaimed) {
            const [processId, action] = String(perm).split(':');
            if (!processId || !PERMISSION_ACTIONS.includes(action as PermissionAction)) {
                // Not in `<processId>:<action>` form, so there is nothing to resolve
                // it against and the claim check above is the only answer available.
                missing.push(perm);
                continue;
            }
            const allowed = await this.permissions.can(
                payload.sub,
                processId,
                action as PermissionAction,
            );
            if (!allowed) missing.push(perm);
        }

        if (missing.length > 0) {
            throw new ForbiddenException(`User missing permissions: ${missing.join(', ')}`);
        }
    }

    private async assertApps(
        context: ExecutionContext,
        payload: AuthTokenPayload,
    ): Promise<void> {
        const requiredApps = this.reflector.getAllAndOverride<string[]>('requiredApps', [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredApps || requiredApps.length === 0) {
            return;
        }

        const assignedApps = payload.assignedApps;
        // Backward compatibility: tokens issued before `assignedApps` existed do not
        // carry the claim — allow them through until they are refreshed.
        if (!Array.isArray(assignedApps)) {
            return;
        }

        const needed = requiredApps.map(canonical);
        const rawRoles = payload.role ?? payload.roles ?? [];
        const userRoles = (Array.isArray(rawRoles) ? rawRoles : [rawRoles]).map(canonical);

        // The built-in slugs are kept as a bypass so a deployment whose role table is
        // unreachable still lets its administrators in, but the real signal is the
        // `isSuper` flag: a super role an admin named something else ("Managing
        // Director") clears role gates and must clear app gates too, or it is
        // unrestricted right up until the first module that declares an app.
        if (userRoles.some((role) => role === 'admin' || role === 'superadmin')) {
            return;
        }

        const match = await this.findConfiguredRole(userRoles).catch(() => undefined);
        if (match?.isSuper) {
            return;
        }

        const reachable = this.appAccessOf(payload, match);
        if (!needed.some((app) => reachable.has(app))) {
            throw new ForbiddenException(
                `Access to this module requires one of: ${requiredApps.join(', ')}`,
            );
        }
    }
}
