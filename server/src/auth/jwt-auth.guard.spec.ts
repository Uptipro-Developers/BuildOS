import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import { JwtAuthGuard } from './jwt-auth.guard';

const SECRET = 'test-secret';

interface MockMeta {
    isPublic?: boolean;
    isServiceAuth?: boolean;
    roles?: string[];
    permissions?: string[];
    requiredApps?: string[];
    requiredProcessPermission?: { processId: string; action: string };
}

function makeContext(meta: MockMeta, headers: Record<string, string> = {}): {
    context: ExecutionContext;
    request: { headers: Record<string, string>; user?: unknown };
} {
    const request: { headers: Record<string, string>; user?: unknown } = { headers };
    const context = {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: () => () => undefined,
        getClass: () => class {},
    } as unknown as ExecutionContext;
    return { context, request };
}

function makeReflector(meta: MockMeta) {
    return {
        getAllAndOverride: (key: string) => (meta as Record<string, unknown>)[key],
    } as unknown as ConstructorParameters<typeof JwtAuthGuard>[0];
}

function makeRedis(overrides: Partial<{ isEnabled: boolean; revokedAt: string | null }> = {}) {
    return {
        isEnabled: overrides.isEnabled ?? false,
        getRaw: jest.fn().mockResolvedValue(overrides.revokedAt ?? null),
    } as unknown as ConstructorParameters<typeof JwtAuthGuard>[1];
}

/**
 * Stub ServiceKeyService. `validKey` is the only credential that resolves;
 * anything else (including undefined) is rejected, mirroring the real
 * fail-closed behaviour.
 */
function makeServiceKeys(validKey?: string) {
    return {
        verify: jest.fn(async (presented?: string | null) =>
            validKey && presented === validKey
                ? { id: 'key-1', name: 'SabiQuot' }
                : null,
        ),
        invalidate: jest.fn(),
    } as unknown as ConstructorParameters<typeof JwtAuthGuard>[2];
}

/**
 * Stub PrismaService backing the configured-role fallback. Defaults to no
 * configured roles, so `@Roles()` behaves exactly as the static list dictates
 * unless a test supplies roles of its own.
 */
function makePrisma(
    roles: { name: string; isSuper?: boolean; appScope?: string[] }[] = [],
    opts: { isEmployee?: boolean } = {},
) {
    return {
        // Presence tracking touches this on every authenticated request.
        user: { update: jest.fn().mockResolvedValue({}) },
        appRole: {
            findMany: jest.fn().mockResolvedValue(
                roles.map((r) => ({
                    name: r.name,
                    isSuper: r.isSuper ?? false,
                    appScope: r.appScope ?? [],
                })),
            ),
        },
        // Backs the employee-tag fallback for tokens issued before the tag existed.
        employee: {
            findFirst: jest
                .fn()
                .mockResolvedValue(opts.isEmployee ? { id: 'emp-1' } : null),
        },
    } as unknown as ConstructorParameters<typeof JwtAuthGuard>[3];
}

/**
 * Stub PermissionsService backing the Layer 3 fallback. `sources` mirrors the real
 * `processSources` map — a process/action absent from it resolves as unconfigured,
 * which must NOT satisfy a role gate.
 */
function makePermissions(
    sources: Record<string, Record<string, string>> = {},
    permissions: Record<string, Record<string, boolean>> = {},
) {
    return {
        resolveForUser: jest.fn().mockResolvedValue({
            processSources: sources,
            processPermissions: permissions,
        }),
        can: jest.fn().mockResolvedValue(true),
    } as unknown as ConstructorParameters<typeof JwtAuthGuard>[4];
}

function makeGuard(
    meta: MockMeta,
    opts: {
        redis?: ConstructorParameters<typeof JwtAuthGuard>[1];
        serviceKeys?: ConstructorParameters<typeof JwtAuthGuard>[2];
        prisma?: ConstructorParameters<typeof JwtAuthGuard>[3];
        permissions?: ConstructorParameters<typeof JwtAuthGuard>[4];
    } = {},
) {
    return new JwtAuthGuard(
        makeReflector(meta),
        opts.redis ?? makeRedis(),
        opts.serviceKeys ?? makeServiceKeys(),
        opts.prisma ?? makePrisma(),
        opts.permissions ?? makePermissions(),
    );
}

function token(payload: Record<string, unknown>): string {
    return sign(payload, SECRET);
}

describe('JwtAuthGuard', () => {
    beforeEach(() => {
        process.env.JWT_SECRET = SECRET;
        // The role table is cached across requests by design; each test supplies its
        // own role fixture, so the cache must not carry over between them.
        (JwtAuthGuard as unknown as { roleCache: unknown }).roleCache = null;
    });

    it('allows public routes with no token', async () => {
        const guard = makeGuard({ isPublic: true });
        const { context } = makeContext({ isPublic: true });
        await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('rejects protected routes with no token (401)', async () => {
        const guard = makeGuard({});
        const { context } = makeContext({});
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects protected routes with an invalid token (401)', async () => {
        const guard = makeGuard({});
        const { context } = makeContext({}, { authorization: 'Bearer not-a-real-token' });
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('allows a valid token when no roles are required and sets request.user', async () => {
        const guard = makeGuard({});
        const { context, request } = makeContext(
            {},
            { authorization: `Bearer ${token({ sub: 'u1', email: 'a@b.c', role: 'staff' })}` },
        );
        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect((request.user as { sub: string }).sub).toBe('u1');
    });

    it('enforces required roles (403 when missing)', async () => {
        const meta = { roles: ['admin'] };
        const guard = makeGuard(meta);
        const { context } = makeContext(meta, {
            authorization: `Bearer ${token({ sub: 'u1', role: 'staff' })}`,
        });
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows when the user has the required role (case-insensitive)', async () => {
        const meta = { roles: ['Admin'] };
        const guard = makeGuard(meta);
        const { context } = makeContext(meta, {
            authorization: `Bearer ${token({ sub: 'u1', role: 'admin' })}`,
        });
        await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('satisfies an @Roles(employee) gate via the token employee tag, whatever the role', async () => {
        // A Project Manager who is also an employee must be able to raise their own
        // requests even though "project manager" is not named on the gate.
        const meta = { roles: ['admin', 'employee'] };
        const guard = makeGuard(meta);
        const { context } = makeContext(meta, {
            authorization: `Bearer ${token({
                sub: 'u1',
                role: 'Project Manager',
                employeeId: 'emp-1',
                isEmployee: true,
            })}`,
        });
        await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('satisfies an @Roles(employee) gate for a legacy token via the employee lookup', async () => {
        // Token predates the tag; the guard resolves the Employee record directly.
        const meta = { roles: ['admin', 'employee'] };
        const guard = makeGuard(meta, {
            prisma: makePrisma([], { isEmployee: true }),
        });
        const { context } = makeContext(meta, {
            authorization: `Bearer ${token({ sub: 'u1', role: 'Project Manager' })}`,
        });
        await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('still denies an @Roles(employee) gate for a non-employee (403)', async () => {
        const meta = { roles: ['admin', 'employee'] };
        const guard = makeGuard(meta, { prisma: makePrisma([], { isEmployee: false }) });
        const { context } = makeContext(meta, {
            authorization: `Bearer ${token({ sub: 'u1', role: 'contractor' })}`,
        });
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a token issued before a revocation marker (401)', async () => {
        const guard = makeGuard({}, { redis: makeRedis({ isEnabled: true, revokedAt: '9999999999' }) });
        const { context } = makeContext({}, {
            authorization: `Bearer ${token({ sub: 'u1', role: 'staff' })}`,
        });
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('allows a token issued after the revocation marker', async () => {
        const guard = makeGuard({}, { redis: makeRedis({ isEnabled: true, revokedAt: '1' }) });
        const { context } = makeContext({}, {
            authorization: `Bearer ${token({ sub: 'u1', role: 'staff' })}`,
        });
        await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('allows when the user has a required app', async () => {
        const meta = { requiredApps: ['hr'] };
        const guard = makeGuard(meta);
        const { context } = makeContext(meta, {
            authorization: `Bearer ${token({ sub: 'u1', role: 'staff', assignedApps: ['hr', 'ess'] })}`,
        });
        await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('denies when the user lacks the required app (403)', async () => {
        const meta = { requiredApps: ['hr'] };
        const guard = makeGuard(meta);
        const { context } = makeContext(meta, {
            authorization: `Bearer ${token({ sub: 'u1', role: 'staff', assignedApps: ['construction'] })}`,
        });
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lets admins bypass app restrictions', async () => {
        const meta = { requiredApps: ['hr'] };
        const guard = makeGuard(meta);
        const { context } = makeContext(meta, {
            authorization: `Bearer ${token({ sub: 'u1', role: 'admin', assignedApps: [] })}`,
        });
        await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('lets a super role satisfy a @Roles() gate it is not named in', async () => {
        const meta = { roles: ['admin'] };
        const guard = makeGuard(meta, {
            prisma: makePrisma([{ name: 'Managing Director', isSuper: true }]),
        });
        const { context } = makeContext(meta, {
            authorization: `Bearer ${token({ sub: 'u1', role: 'Managing Director' })}`,
        });
        await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('lets an admin-created role reach a module its app scope covers', async () => {
        const meta = { roles: ['admin'], requiredApps: ['procurement'] };
        const guard = makeGuard(meta, {
            prisma: makePrisma([{ name: 'Procurement Officer', appScope: ['procurement'] }]),
        });
        const { context } = makeContext(meta, {
            authorization: `Bearer ${token({
                sub: 'u1',
                role: 'Procurement Officer',
                assignedApps: ['procurement'],
            })}`,
        });
        await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('still denies a configured role outside the route’s app scope (403)', async () => {
        const meta = { roles: ['admin'], requiredApps: ['finance'] };
        const guard = makeGuard(meta, {
            prisma: makePrisma([{ name: 'Procurement Officer', appScope: ['procurement'] }]),
        });
        const { context } = makeContext(meta, {
            authorization: `Bearer ${token({
                sub: 'u1',
                role: 'Procurement Officer',
                assignedApps: ['procurement'],
            })}`,
        });
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    });

    /**
     * The escalation this fallback exists for: a Project Manager an admin extended
     * into an application was still met with "does not have required role(s): admin"
     * on every endpoint of it.
     */
    it('lets a user extended into an app reach a @Roles(admin) route for that app', async () => {
        const meta = { roles: ['admin'], requiredApps: ['admin'] };
        const guard = makeGuard(meta, {
            // The role itself is NOT scoped to the admin app — the extension lives on
            // the user record, which is the authoritative source for app access.
            prisma: makePrisma([{ name: 'Project Manager', appScope: ['construction'] }]),
        });
        const { context } = makeContext(meta, {
            authorization: `Bearer ${token({
                sub: 'u1',
                role: 'Project Manager',
                assignedApps: ['construction', 'admin', 'ess'],
            })}`,
        });
        await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('denies an app assignment whose role is not configured at all (403)', async () => {
        // Role drift — a `role` string naming no configured role, such as the
        // deprecated `viewer` default. The app assignment alone is not a grant.
        const meta = { roles: ['admin'], requiredApps: ['admin'] };
        const guard = makeGuard(meta, {
            prisma: makePrisma([{ name: 'Project Manager', appScope: ['construction'] }]),
        });
        const { context } = makeContext(meta, {
            authorization: `Bearer ${token({
                sub: 'u1',
                role: 'viewer',
                assignedApps: ['admin', 'ess'],
            })}`,
        });
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('still denies a role gate when neither an app nor a process is declared', async () => {
        // Nothing to resolve against, so the static list stays authoritative — this
        // is what keeps genuinely admin-only endpoints closed.
        const meta = { roles: ['admin'] };
        const guard = makeGuard(meta, {
            prisma: makePrisma([{ name: 'Project Manager', appScope: ['construction'] }]),
        });
        const { context } = makeContext(meta, {
            authorization: `Bearer ${token({
                sub: 'u1',
                role: 'Project Manager',
                assignedApps: ['construction', 'admin'],
            })}`,
        });
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lets an explicitly granted process permission satisfy a @Roles() gate', async () => {
        const meta = {
            roles: ['admin'],
            requiredProcessPermission: { processId: 'p_purchase_orders', action: 'approve' },
        };
        const guard = makeGuard(meta, {
            prisma: makePrisma([{ name: 'Project Manager', appScope: ['construction'] }]),
            permissions: makePermissions(
                { p_purchase_orders: { approve: 'allow' } },
                { p_purchase_orders: { approve: true } },
            ),
        });
        const { context } = makeContext(meta, {
            authorization: `Bearer ${token({ sub: 'u1', role: 'Project Manager' })}`,
        });
        await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('does not let an unconfigured ("open") process satisfy a @Roles() gate (403)', async () => {
        // PermissionsService resolves unconfigured processes as open by design. That
        // must never be what unlocks a role-gated endpoint.
        const meta = {
            roles: ['admin'],
            requiredProcessPermission: { processId: 'p_purchase_orders', action: 'approve' },
        };
        const guard = makeGuard(meta, {
            prisma: makePrisma([{ name: 'Project Manager', appScope: ['construction'] }]),
            permissions: makePermissions(
                { p_purchase_orders: { approve: 'open' } },
                { p_purchase_orders: { approve: true } },
            ),
        });
        const { context } = makeContext(meta, {
            authorization: `Bearer ${token({ sub: 'u1', role: 'Project Manager' })}`,
        });
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lets a super role bypass app restrictions under its own name', async () => {
        const meta = { requiredApps: ['hr'] };
        const guard = makeGuard(meta, {
            prisma: makePrisma([{ name: 'Managing Director', isSuper: true }]),
        });
        const { context } = makeContext(meta, {
            authorization: `Bearer ${token({
                sub: 'u1',
                role: 'Managing Director',
                assignedApps: [],
            })}`,
        });
        await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('resolves @Permissions() through configuration rather than a JWT claim', async () => {
        // The `permissions` claim is never issued, so this used to 403 everyone.
        const meta = { permissions: ['p_purchase_orders:approve'] };
        const permissions = makePermissions();
        const guard = makeGuard(meta, { permissions });
        const { context } = makeContext(meta, {
            authorization: `Bearer ${token({ sub: 'u1', role: 'Project Manager' })}`,
        });
        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect((permissions as any).can).toHaveBeenCalledWith(
            'u1',
            'p_purchase_orders',
            'approve',
        );
    });

    it('denies @Permissions() when the configuration does not grant it (403)', async () => {
        const meta = { permissions: ['p_purchase_orders:approve'] };
        const permissions = makePermissions();
        (permissions as any).can = jest.fn().mockResolvedValue(false);
        const guard = makeGuard(meta, { permissions });
        const { context } = makeContext(meta, {
            authorization: `Bearer ${token({ sub: 'u1', role: 'Project Manager' })}`,
        });
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('records presence for the authenticated user', async () => {
        const prisma = makePrisma();
        const guard = makeGuard({}, { prisma });
        const { context } = makeContext({}, {
            authorization: `Bearer ${token({ sub: 'presence-user-1', role: 'staff' })}`,
        });
        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect((prisma as any).user.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'presence-user-1' } }),
        );
    });

    it('does not fail the request when the presence write throws', async () => {
        // Presence is a metric; it must never take down the request it observes.
        const prisma = makePrisma();
        (prisma as any).user.update = jest.fn(() => {
            throw new Error('db down');
        });
        const guard = makeGuard({}, { prisma });
        const { context } = makeContext({}, {
            authorization: `Bearer ${token({ sub: 'presence-user-2', role: 'staff' })}`,
        });
        await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('allows legacy tokens without an assignedApps claim (backward compat)', async () => {
        const meta = { requiredApps: ['hr'] };
        const guard = makeGuard(meta);
        const { context } = makeContext(meta, {
            authorization: `Bearer ${token({ sub: 'u1', role: 'staff' })}`,
        });
        await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    describe('service auth (@ServiceAuth)', () => {
        it('allows a valid X-Api-Key and records the service client', async () => {
            const meta = { isServiceAuth: true };
            const guard = makeGuard(meta, { serviceKeys: makeServiceKeys('sk_live_good'), prisma: makePrisma() });
            const { context, request } = makeContext(meta, { 'x-api-key': 'sk_live_good' });
            await expect(guard.canActivate(context)).resolves.toBe(true);
            expect((request as { serviceClient?: { name: string } }).serviceClient?.name).toBe(
                'SabiQuot',
            );
        });

        it('accepts the key via "Authorization: ApiKey <key>"', async () => {
            const meta = { isServiceAuth: true };
            const guard = makeGuard(meta, { serviceKeys: makeServiceKeys('sk_live_good'), prisma: makePrisma() });
            const { context } = makeContext(meta, { authorization: 'ApiKey sk_live_good' });
            await expect(guard.canActivate(context)).resolves.toBe(true);
        });

        it('rejects an unknown key (401)', async () => {
            const meta = { isServiceAuth: true };
            const guard = makeGuard(meta, { serviceKeys: makeServiceKeys('sk_live_good'), prisma: makePrisma() });
            const { context } = makeContext(meta, { 'x-api-key': 'sk_live_wrong' });
            await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('rejects a service route with no credential at all (401)', async () => {
            const meta = { isServiceAuth: true };
            const guard = makeGuard(meta, { serviceKeys: makeServiceKeys('sk_live_good'), prisma: makePrisma() });
            const { context } = makeContext(meta);
            await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('does not let a service key satisfy a route that is not @ServiceAuth (401)', async () => {
            const guard = makeGuard({}, { serviceKeys: makeServiceKeys('sk_live_good'), prisma: makePrisma() });
            const { context } = makeContext({}, { 'x-api-key': 'sk_live_good' });
            await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('still enforces roles for a user JWT on a service route (403)', async () => {
            const meta = { isServiceAuth: true, roles: ['admin'] };
            const guard = makeGuard(meta, { serviceKeys: makeServiceKeys('sk_live_good'), prisma: makePrisma() });
            const { context } = makeContext(meta, {
                authorization: `Bearer ${token({ sub: 'u1', role: 'staff' })}`,
            });
            await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
        });

        it('lets a service key bypass role requirements', async () => {
            const meta = { isServiceAuth: true, roles: ['admin'] };
            const guard = makeGuard(meta, { serviceKeys: makeServiceKeys('sk_live_good'), prisma: makePrisma() });
            const { context } = makeContext(meta, { 'x-api-key': 'sk_live_good' });
            await expect(guard.canActivate(context)).resolves.toBe(true);
        });
    });
});
