import { MaterialsService } from './materials.service';

describe('MaterialsService store-item thresholds and ledger controls', () => {
    function makeService() {
        const prisma: any = {
            storeItem: {
                findMany: jest.fn(),
                findUniqueOrThrow: jest.fn(),
                findFirst: jest.fn().mockResolvedValue(null),
                create: jest.fn(),
            },
            store: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue({ name: 'Main Store' }) },
            stockMovement: { create: jest.fn() },
            material: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() },
            systemSetting: { findUnique: jest.fn().mockResolvedValue(null) },
            materialAmendment: { create: jest.fn() },
            auditLog: { create: jest.fn() },
        };
        prisma.$transaction = jest.fn((callback) => callback(prisma));
        return {
            prisma,
            service: new MaterialsService(prisma as any, {} as any, { dispatch: jest.fn() } as any),
        };
    }

    it('uses a StoreItem-specific threshold instead of the catalogue threshold', async () => {
        const { prisma, service } = makeService();
        prisma.storeItem.findMany.mockResolvedValue([{
            id: 'store-item-1', materialName: 'Cement', unit: 'bag', qty: 4,
            reorderLevel: 12, lowStockThreshold: 8, outOfStockThreshold: 1,
            storeId: 'store-1',
        }]);

        await expect(service.findAllStoreItems()).resolves.toEqual([
            expect.objectContaining({
                id: 'store-item-1', reorderLevel: 8, outOfStockLevel: 1,
                thresholdSource: 'item',
            }),
        ]);
    });

    it('persists low and out-of-stock overrides when stocking a store', async () => {
        const { prisma, service } = makeService();
        prisma.storeItem.create.mockResolvedValue({
            id: 'store-item-1', materialName: 'Cement', unit: 'bag', qty: 3,
            reorderLevel: 8, lowStockThreshold: 8, outOfStockThreshold: 1,
            storeId: 'store-1',
        });

        await service.createStoreItem({
            materialName: 'Cement', unit: 'bag', qty: 3, storeId: 'store-1',
            reorderLevel: 8, outOfStockThreshold: 1,
        });

        expect(prisma.storeItem.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                reorderLevel: 8, lowStockThreshold: 8, outOfStockThreshold: 1,
            }),
        });
    });

    it('rejects a store balance when the material has no unit of measure', async () => {
        const { service } = makeService();
        await expect(service.createStoreItem({
            materialName: 'Switch', unit: null, qty: 10, storeId: 'store-1',
        })).rejects.toThrow('Set a unit of measure for Switch');
    });

    it('rejects direct quantity edits on established store items', async () => {
        const { prisma, service } = makeService();
        prisma.storeItem.findUniqueOrThrow.mockResolvedValue({
            id: 'store-item-1', materialName: 'Cement', qty: 10, storeId: 'store-1',
        });
        await expect(service.updateStoreItem('store-item-1', { qty: 9 })).rejects.toThrow(
            'Quantity is ledger-controlled',
        );
    });
});
