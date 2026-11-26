import { BadRequestException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';

function makeService(existing: any | null) {
    const prisma: any = {
        supplier: {
            findUnique: jest.fn(({ where }: any) => {
                if (where.sabiquotProfileId) return Promise.resolve(null);
                if (where.id) return Promise.resolve(existing);
                return Promise.resolve(null);
            }),
            findMany: jest.fn(() => Promise.resolve([])),
            update: jest.fn(({ data }: any) => Promise.resolve({ ...existing, ...data })),
            upsert: jest.fn(({ create }: any) => Promise.resolve({ id: 'new-supplier', ...create })),
        },
    };
    return { service: new SuppliersService(prisma), prisma };
}

describe('SabiQuote supplier company-name reconciliation', () => {
    const existing = {
        id: 'supplier-1',
        name: 'BuildOS Company Ltd',
        email: 'vendor@example.com',
        sabiquotProfileId: null,
    };

    it('uses the SabiQuote company name when it is present', async () => {
        const { service, prisma } = makeService(existing);

        await service.syncFromPortal({
            sabiquotProfileId: 'profile-1',
            supplierId: existing.id,
            companyName: 'SabiQuote Company Ltd',
        });

        expect(prisma.supplier.update).toHaveBeenCalledWith({
            where: { id: existing.id },
            data: expect.objectContaining({
                name: 'SabiQuote Company Ltd',
                sabiquotProfileId: 'profile-1',
            }),
        });
    });

    it('keeps the BuildOS company name when SabiQuote company is empty', async () => {
        const { service, prisma } = makeService(existing);

        const result = await service.syncFromPortal({
            sabiquotProfileId: 'profile-1',
            supplierId: existing.id,
            companyName: '   ',
        });

        const update = prisma.supplier.update.mock.calls[0][0];
        expect(update.data).not.toHaveProperty('name');
        expect(result.name).toBe('BuildOS Company Ltd');
    });

    it('does not substitute a username when no existing supplier or company name exists', async () => {
        const { service, prisma } = makeService(null);

        await expect(
            service.syncFromPortal({
                sabiquotProfileId: 'profile-1',
                companyName: '',
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.supplier.upsert).not.toHaveBeenCalled();
    });
});
