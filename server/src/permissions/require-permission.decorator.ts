import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    SetMetadata,
    UseGuards,
    applyDecorators,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PermissionAction, PermissionsService } from './permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_PROCESS_CATALOG } from '../common/process-catalog';

const PERMISSION_KEY = 'requiredProcessPermission';

interface RequiredPermission {
    processId: string;
    action: PermissionAction;
}

/**
 * Enforces a configured process permission on an endpoint.
 *
 * Applied to the approval and deletion paths — the operations where bypassing the
 * UI actually matters — so a role or user whose `approve`/`delete` has been
 * revoked cannot simply call the API directly.
 *
 * This is additive to the global JwtAuthGuard rather than a replacement: that
 * guard checks the coarse `@Roles()` list, and this checks the fine-grained VCEAD
 * configuration on top. Anything an admin has not configured resolves to allowed,
 * so adding this to an endpoint changes nothing until a permission is actually
 * restricted.
 *
 * Declaring a process here also gives the role gate something to resolve against:
 * JwtAuthGuard reads the same metadata, so a role an admin has explicitly granted
 * this process satisfies a `@Roles()` list it is not named on.
 */
@Injectable()
export class ProcessPermissionGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly permissions: PermissionsService,
        private readonly prisma: PrismaService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const required = this.reflector.getAllAndOverride<RequiredPermission>(
            PERMISSION_KEY,
            [context.getHandler(), context.getClass()],
        );
        if (!required) return true;

        const request = context.switchToHttp().getRequest<Request>();
        const user = request.user as any;
        // JwtAuthGuard runs first and populates request.user from the JWT (`sub`).
        // With no identity there is nothing to resolve, so leave the decision to
        // the authentication guards rather than inventing a denial here.
        const userId = String(user?.sub ?? user?.id ?? '');
        if (!userId) return true;

        const allowed = await this.permissions.can(
            userId,
            required.processId,
            required.action,
        );
        if (!allowed) {
            throw new ForbiddenException(
                `Your role does not permit "${required.action}" on this process.`,
            );
        }
        await this.assertDelegated(userId, required);
        return true;
    }

    private async assertDelegated(userId: string, required: RequiredPermission) {
        const process = DEFAULT_PROCESS_CATALOG.find((item) => item.id === required.processId);
        if (!process || !['construction', 'storefront', 'procurement', 'finance', 'hr'].includes(process.app)) return;
        const configured = await this.prisma.applicationOwner.findFirst({ where: { app: process.app } });
        if (!configured) return;
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, roles: { include: { role: { select: { name: true, isSuper: true } } } } },
        });
        const admin = /admin|super/i.test(String(user?.role ?? ''))
            || Boolean(user?.roles.some((entry) => entry.role.isSuper || /admin|super/i.test(entry.role.name)));
        if (admin) return;
        const now = new Date();
        const owner = await this.prisma.applicationOwner.findFirst({
            where: { app: process.app, userId, active: true, validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gt: now } }] },
        });
        if (owner) return;
        const assignment = await this.prisma.applicationAssignment.findFirst({
            where: {
                app: process.app, userId, status: 'active', validFrom: { lte: now },
                OR: [{ validUntil: null }, { validUntil: { gt: now } }],
                AND: [{ OR: [
                    { processId: required.processId, permissions: { has: required.action } },
                    { processId: null, scopeType: 'application' },
                ] }],
            },
        });
        if (!assignment) {
            throw new ForbiddenException(`You have not been delegated "${required.action}" responsibility for this process.`);
        }
    }
}

/** Requires a VCEAD permission on a process for this endpoint. */
export function RequiresProcess(processId: string, action: PermissionAction) {
    return applyDecorators(
        SetMetadata(PERMISSION_KEY, { processId, action }),
        UseGuards(ProcessPermissionGuard),
    );
}
