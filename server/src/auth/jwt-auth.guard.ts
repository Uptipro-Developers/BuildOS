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
@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly redis: RedisService,
        private readonly serviceKeys: ServiceKeyService,
        private readonly prisma: PrismaService,
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
        this.assertPermissions(context, payload);
        this.assertApps(context, payload);
        return true;
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
        // Compared ignoring case AND separators. Roles are stored in display form
        // ("HR Manager") while the decorators use slugs ("hr-manager");
        // lowercasing alone left "hr manager" !== "hr-manager", so as the global
        // guard this closed every @Roles('hr-manager') endpoint to actual HR
        // Managers. Matches RolesGuard and PermissionsService.
        const canonical = (role: unknown) =>
            String(role ?? '')
                .trim()
                .toLowerCase()
                .replace(/[\s_-]+/g, '');

        const rawRoles = payload.role ?? payload.roles ?? [];
        const userRoles = (Array.isArray(rawRoles) ? rawRoles : [rawRoles]).map(canonical);
        const needed = requiredRoles.map(canonical);
        if (needed.some((role) => userRoles.includes(role))) {
            return;
        }

        // The `@Roles()` lists name a fixed set of built-in slugs, so a role an
        // admin created ("Procurement Officer") could never satisfy one no matter
        // what it had been granted — every such user got
        // "does not have required role(s): admin". Fall back to the configured
        // role table: a role flagged `isSuper` clears any role gate, and any role
        // whose app scope covers this route's app is treated as satisfying it,
        // leaving the fine-grained decision to the VCEAD checks that follow.
        if (await this.roleSatisfiesByConfig(userRoles, context)) {
            return;
        }

        throw new ForbiddenException(
            `User does not have required role(s): ${requiredRoles.join(', ')}`,
        );
    }

    /**
     * Whether the caller's configured role clears a `@Roles()` gate.
     *
     * Deliberately coarse: it only decides that the role is *entitled to reach*
     * the module. What the role may actually do there is enforced by
     * `@RequiresProcess()` / the permission matrix, which reads the same
     * configuration an admin edits in Admin › Roles.
     */
    private async roleSatisfiesByConfig(
        userRoles: string[],
        context: ExecutionContext,
    ): Promise<boolean> {
        if (userRoles.length === 0) return false;
        try {
            const canonical = (value: unknown) =>
                String(value ?? '')
                    .trim()
                    .toLowerCase()
                    .replace(/[\s_-]+/g, '');

            const roles = await this.prisma.appRole.findMany({
                select: { name: true, isSuper: true, appScope: true },
            });
            const match = roles.find((r) => userRoles.includes(canonical(r.name)));
            if (!match) return false;
            if (match.isSuper) return true;

            const requiredApps = this.reflector.getAllAndOverride<string[]>('requiredApps', [
                context.getHandler(),
                context.getClass(),
            ]);
            // Without a declared app there is nothing to scope against, so the
            // static list stays authoritative.
            if (!requiredApps || requiredApps.length === 0) return false;

            const scope = (Array.isArray(match.appScope) ? match.appScope : []).map(canonical);
            return requiredApps.map(canonical).some((app) => scope.includes(app));
        } catch {
            // A lookup failure must not turn into a spurious denial for a user the
            // static list would otherwise have rejected; keep the original outcome.
            return false;
        }
    }

    private assertPermissions(context: ExecutionContext, payload: AuthTokenPayload): void {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return;
        }
        const userPermissions = Array.isArray(payload.permissions) ? payload.permissions : [];
        const missing = requiredPermissions.filter((perm) => !userPermissions.includes(perm));
        if (missing.length > 0) {
            throw new ForbiddenException(`User missing permissions: ${missing.join(', ')}`);
        }
    }

    private assertApps(context: ExecutionContext, payload: AuthTokenPayload): void {
        const requiredApps = this.reflector.getAllAndOverride<string[]>('requiredApps', [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredApps || requiredApps.length === 0) {
            return;
        }
        // Privileged admins bypass module-level app restrictions.
        const role = String(payload.role ?? '').trim().toLowerCase();
        if (role === 'admin' || role === 'super-admin' || role === 'superadmin') {
            return;
        }
        const assignedApps = payload.assignedApps;
        // Backward compatibility: tokens issued before `assignedApps` existed do not
        // carry the claim — allow them through until they are refreshed.
        if (!Array.isArray(assignedApps)) {
            return;
        }
        if (!requiredApps.some((app) => assignedApps.includes(app))) {
            throw new ForbiddenException(
                `Access to this module requires one of: ${requiredApps.join(', ')}`,
            );
        }
    }
}
