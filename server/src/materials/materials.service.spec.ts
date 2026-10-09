import { MaterialsService } from './materials.service';

describe('MaterialsService material-level reorder thresholds', () => {
    function makeService() {
        const prisma = {
            storeItem: {
                findMany: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
            material: {
                findMany: jest.fn(),
            },
        };
        return {
            prisma,
            service: new MaterialsService(prisma as any, {} as any),
        };
    }

    it('hydrates store items from the matching Material threshold', async () => {
        const { prisma, service } = makeService();
        prisma.storeItem.findMany.mockResolvedValue([
            {
                id: 'store-item-1',
                materialName: 'Cement — Portland (50kg)',
                unit: 'kg',
                qty: 4,
                reorderLevel: 999,
                storeId: 'store-1',
            },
        ]);
        prisma.material.findMany.mockResolvedValue([
            {
                name: 'Cement — Portland (50kg)',
                unit: 'kg',
                reorderLevel: 12,
            },
        ]);

        await expect(service.findAllStoreItems()).resolves.toEqual([
            expect.objectContaining({ id: 'store-item-1', reorderLevel: 12 }),
        ]);
    });

    it('does not persist a StoreItem-specific reorder level', async () => {
        const { prisma, service } = makeService();
        prisma.storeItem.create.mockResolvedValue({
            id: 'store-item-1',
            materialName: 'Cement',
            unit: 'Bag',
            qty: 3,
            reorderLevel: 0,
            storeId: 'store-1',
        });
        prisma.material.findMany.mockResolvedValue([
            { name: 'Cement', unit: 'Bag', reorderLevel: 8 },
        ]);

        await service.createStoreItem({
            materialName: 'Cement',
            unit: 'Bag',
            qty: 3,
            storeId: 'store-1',
            reorderLevel: 50,
        });

        expect(prisma.storeItem.create).toHaveBeenCalledWith({
            data: {
                materialName: 'Cement',
                unit: 'Bag',
                qty: 3,
                storeId: 'store-1',
            },
        });
    });
});
