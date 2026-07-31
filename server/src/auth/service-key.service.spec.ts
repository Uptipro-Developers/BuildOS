import {
    ServiceKeyService,
    generateServiceKey,
    hashServiceKey,
    serviceKeyPreview,
    type ServiceKeyRecord,
} from './service-key.service';
import type { PrismaService } from '../prisma/prisma.service';

function makePrisma(apiKeys: ServiceKeyRecord[] | Error) {
    const findUnique = jest.fn(async () => {
        if (apiKeys instanceof Error) throw apiKeys;
        return { key: 'admin-settings', value: { apiKeys }, updatedAt: new Date() };
    });
    const update = jest.fn(async () => ({}));
    return {
        prisma: { systemSetting: { findUnique, update } } as unknown as PrismaService,
        findUnique,
        update,
    };
}

function activeKey(plaintext: string, overrides: Partial<ServiceKeyRecord> = {}): ServiceKeyRecord {
    return {
        id: 'key-1',
        name: 'SabiQuot',
        keyHash: hashServiceKey(plaintext),
        keyPrefix: 'sk_live',
        keyLast4: plaintext.slice(-4),
        status: 'active',
        ...overrides,
    };
}

describe('ServiceKeyService', () => {
    it('resolves a key whose hash matches a stored record', async () => {
        const plaintext = 'sk_live_abc123';
        const { prisma } = makePrisma([activeKey(plaintext)]);
        const service = new ServiceKeyService(prisma);

        await expect(service.verify(plaintext)).resolves.toMatchObject({
            id: 'key-1',
            name: 'SabiQuot',
        });
    });

    it('rejects a key that does not match', async () => {
        const { prisma } = makePrisma([activeKey('sk_live_abc123')]);
        const service = new ServiceKeyService(prisma);

        await expect(service.verify('sk_live_wrong')).resolves.toBeNull();
    });

    it.each([['', 'empty string'], [undefined, 'undefined'], [null, 'null']])(
        'rejects %s (%s) without consulting the store',
        async (candidate) => {
            const { prisma, findUnique } = makePrisma([activeKey('sk_live_abc123')]);
            const service = new ServiceKeyService(prisma);

            await expect(service.verify(candidate as string | undefined | null)).resolves.toBeNull();
            expect(findUnique).not.toHaveBeenCalled();
        },
    );

    it('rejects a key whose record is not active', async () => {
        const plaintext = 'sk_live_abc123';
        const { prisma } = makePrisma([activeKey(plaintext, { status: 'revoked' })]);
        const service = new ServiceKeyService(prisma);

        await expect(service.verify(plaintext)).resolves.toBeNull();
    });

    it('still accepts legacy records that stored the plaintext', async () => {
        // Rows created before hashing landed carry `key` and no `keyHash`.
        const plaintext = 'sk_live_legacy999';
        const { prisma } = makePrisma([
            { id: 'key-legacy', name: 'Old', key: plaintext, status: 'active' },
        ]);
        const service = new ServiceKeyService(prisma);

        await expect(service.verify(plaintext)).resolves.toMatchObject({ id: 'key-legacy' });
    });

    it('fails closed when the settings read throws', async () => {
        const { prisma } = makePrisma(new Error('database unavailable'));
        const service = new ServiceKeyService(prisma);

        await expect(service.verify('sk_live_anything')).resolves.toBeNull();
    });

    it('does not cache a failed read', async () => {
        const { prisma, findUnique } = makePrisma(new Error('database unavailable'));
        const service = new ServiceKeyService(prisma);

        await service.verify('sk_live_anything');
        await service.verify('sk_live_anything');

        expect(findUnique).toHaveBeenCalledTimes(2);
    });

    it('serves repeat verifications from cache', async () => {
        const { prisma, findUnique } = makePrisma([activeKey('sk_live_abc123')]);
        const service = new ServiceKeyService(prisma);

        // Both miss, so no lastUsed write perturbs the read count.
        await service.verify('sk_live_wrong');
        await service.verify('sk_live_wrong');

        expect(findUnique).toHaveBeenCalledTimes(1);
    });

    it('re-reads the store after invalidate()', async () => {
        const { prisma, findUnique } = makePrisma([activeKey('sk_live_abc123')]);
        const service = new ServiceKeyService(prisma);

        await service.verify('sk_live_wrong');
        service.invalidate();
        await service.verify('sk_live_wrong');

        expect(findUnique).toHaveBeenCalledTimes(2);
    });

    it('tolerates a settings document with no apiKeys array', async () => {
        const { prisma } = makePrisma([] as ServiceKeyRecord[]);
        const service = new ServiceKeyService(prisma);

        await expect(service.verify('sk_live_abc123')).resolves.toBeNull();
    });
});

describe('generateServiceKey', () => {
    it('produces a prefixed 36-hex-character key', () => {
        expect(generateServiceKey()).toMatch(/^sk_live_[0-9a-f]{36}$/);
    });

    it('does not repeat', () => {
        const keys = new Set(Array.from({ length: 50 }, () => generateServiceKey()));
        expect(keys.size).toBe(50);
    });
});

describe('serviceKeyPreview', () => {
    it('shows the prefix and last four characters', () => {
        expect(serviceKeyPreview({ keyPrefix: 'sk_live', keyLast4: '3f9c' })).toBe('sk_live_…3f9c');
    });

    it('omits the suffix when it is unknown', () => {
        expect(serviceKeyPreview({})).toBe('sk_live_…');
    });

    it('never leaks the full key', () => {
        const plaintext = generateServiceKey();
        const preview = serviceKeyPreview({ keyPrefix: 'sk_live', keyLast4: plaintext.slice(-4) });
        expect(preview).not.toContain(plaintext);
    });
});
