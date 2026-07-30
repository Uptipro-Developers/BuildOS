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
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly redis: RedisService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
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

        if (!payload || !payload.sub) {
            throw new UnauthorizedException('Authentication required');
        }

        await this.assertNotRevoked(payload);
        this.assertRoles(context, payload);
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

    private assertRoles(context: ExecutionContext, payload: AuthTokenPayload): void {
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
        if (!needed.some((role) => userRoles.includes(role))) {
            throw new ForbiddenException(
                `User does not have required role(s): ${requiredRoles.join(', ')}`,
            );
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
