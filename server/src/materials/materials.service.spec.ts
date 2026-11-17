import { MaterialsService } from './materials.service';

describe('MaterialsService store-item thresholds and ledger controls', () => {
    function makeService() {
        const prisma: any = {
            storeItem: {
                findMany: jest.fn(),
                findUniqueOrThrow: jest.fn(),
                findFirst: jest.fn().mockResolvedValue(null),
                create: jest.fn(),
                update: jest.fn(({ data }: any) => Promise.resolve({ id: 'store-item-1', ...data })),
            },
            store: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue({ name: 'Main Store' }) },
            stockMovement: { create: jest.fn(({ data }: any) => Promise.resolve({ id: 'movement-1', ...data })) },
            stockTransfer: {
                findFirst: jest.fn(),
                findUniqueOrThrow: jest.fn(),
                findMany: jest.fn().mockResolvedValue([]),
                updateMany: jest.fn().mockResolvedValue({ count: 1 }),
                update: jest.fn(({ data }: any) => Promise.resolve({ id: 'transfer-1', ...data })),
            },
            materialRequest: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
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

    it('removes transfer-only fields from non-transfer ledger writes', async () => {
        const { prisma, service } = makeService();
        prisma.storeItem.findFirst.mockResolvedValue({
            id: 'store-item-1', materialName: 'Cement', unit: 'bag', qty: 10,
            reservedQty: 0, storeId: 'store-1', category: 'Cement', unitCost: 10,
        });
        prisma.materialAmendment.create.mockResolvedValue({ id: 'amendment-1' });

        await service.createMovement({
            type: 'adjustment', direction: 'increase', materialName: 'Cement', unit: 'bag', qty: 2,
            storeId: 'store-1', storeName: 'Main Store', toStoreId: 'store-2', toStoreName: 'Site Store',
        });

        const persisted = prisma.stockMovement.create.mock.calls[0][0].data;
        expect(persisted).not.toHaveProperty('toStoreId');
        expect(persisted).not.toHaveProperty('toStoreName');
        expect(persisted.type).toBe('adjustment_in');
    });

    it('prevents an issue from consuming stock reserved for approved requests', async () => {
        const { prisma, service } = makeService();
        prisma.storeItem.findFirst.mockResolvedValue({
            id: 'store-item-1', materialName: 'Switch', unit: 'pcs', qty: 10,
            reservedQty: 8, storeId: 'store-1', category: 'Electrical', unitCost: 5,
        });

        await expect(service.createMovement({
            type: 'issue', materialName: 'Switch', unit: 'pcs', qty: 5,
            storeId: 'store-1', storeName: 'Main Store',
        })).rejects.toThrow('Only 2 unreserved pcs is available');
        expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    });

    it('keeps completedBy as audit context instead of writing it to StockTransfer', async () => {
        const { prisma, service } = makeService();
        prisma.stockTransfer.findFirst.mockResolvedValue({
            id: 'transfer-1', reference: 'TRF-1', fromStoreId: 'store-1', fromStoreName: 'Main Store',
            toStoreId: 'store-2', toStoreName: 'Site Store', items: [], status: 'Pending',
            requestedBy: 'Requester', approvedBy: null, completedAt: null,
        });

        await service.updateTransfer('transfer-1', { status: 'Completed', completedBy: 'Ada' });

        expect(prisma.stockTransfer.update).toHaveBeenCalledWith({
            where: { id: 'transfer-1' },
            data: expect.not.objectContaining({ completedBy: expect.anything() }),
        });
        expect(prisma.stockTransfer.update.mock.calls[0][0].data.status).toBe('Completed');
    });

    it('does not post a transfer when another completion already claimed it', async () => {
        const { prisma, service } = makeService();
        prisma.stockTransfer.findFirst.mockResolvedValue({
            id: 'transfer-1', reference: 'TRF-1', fromStoreId: 'store-1', fromStoreName: 'Main Store',
            toStoreId: 'store-2', toStoreName: 'Site Store',
            items: [{ materialName: 'Switch', unit: 'pcs', qty: 2 }], status: 'Pending',
            requestedBy: 'Requester', approvedBy: null, completedAt: null,
        });
        prisma.stockTransfer.updateMany.mockResolvedValue({ count: 0 });
        prisma.stockTransfer.findUniqueOrThrow.mockResolvedValue({ id: 'transfer-1', status: 'Completed' });

        await expect(service.updateTransfer('transfer-1', { status: 'Completed' }))
            .resolves.toEqual(expect.objectContaining({ status: 'Completed' }));
        expect(prisma.storeItem.update).not.toHaveBeenCalled();
        expect(prisma.stockMovement.create).not.toHaveBeenCalled();
        expect(prisma.stockTransfer.update).not.toHaveBeenCalled();
    });

    it('prevents an unrelated transfer from consuming reserved stock', async () => {
        const { prisma, service } = makeService();
        prisma.stockTransfer.findFirst.mockResolvedValue({
            id: 'transfer-1', reference: 'TRF-1', fromStoreId: 'store-1', fromStoreName: 'Main Store',
            toStoreId: 'store-2', toStoreName: 'Site Store',
            items: [{ materialName: 'Switch', unit: 'pcs', qty: 5 }], status: 'Pending',
            requestedBy: 'Requester', approvedBy: null, completedAt: null,
        });
        prisma.storeItem.findFirst.mockResolvedValue({
            id: 'store-item-1', materialName: 'Switch', unit: 'pcs', qty: 10,
            reservedQty: 8, storeId: 'store-1', category: 'Electrical', unitCost: 5,
        });

        await expect(service.updateTransfer('transfer-1', { status: 'Completed' }))
            .rejects.toThrow('Only 2 unreserved pcs is available');
        expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    });
});
