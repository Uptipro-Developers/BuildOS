import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminExtrasService } from './admin-extras.service';

/**
 * Material Categories: Category → Material → Type. `Material` is the same
 * table Goods Receipt/Stock Movement already use — a Material created here
 * is real inventory, not disposable catalog-only data. Type is its own
 * MaterialType row (stock + dimensions live there); Material's own
 * totalQty/availableQty/reservedQty/unitCost are a rollup recomputed from
 * its Types on every insert/update.
 */

function makeService() {
    const category = {
        id: 'cat-1',
        name: 'Concrete & Cement',
        description: 'Cement, aggregates and blocks',
        color: 'teal',
    };

    let materialSeq = 0;

    const prisma: any = {
        materialCategory: {
            findMany: jest.fn(() => Promise.resolve([category])),
            findUnique: jest.fn(() => Promise.resolve(category)),
            findUniqueOrThrow: jest.fn(() => Promise.resolve(category)),
            create: jest.fn(({ data }: any) => Promise.resolve({ id: 'cat-new', ...data })),
            update: jest.fn(({ data }: any) => Promise.resolve({ ...category, ...data })),
            delete: jest.fn(() => Promise.resolve(category)),
        },
        material: {
            create: jest.fn(({ data }: any) => {
                materialSeq += 1;
                return Promise.resolve({ id: `mat-${materialSeq}`, totalQty: 0, availableQty: 0, reservedQty: 0, unitCost: 0, ...data });
            }),
            deleteMany: jest.fn(() => Promise.resolve({ count: 0 })),
            update: jest.fn(({ data }: any) => Promise.resolve({ id: 'mat-1', ...data })),
        },
        materialType: {
            findMany: jest.fn(() => Promise.resolve([])),
        },
        $transaction: jest.fn((fn: any) => fn(prisma)),
    };

    const service = new AdminExtrasService(
        prisma,
        {} as any, // mailQueue
        {} as any, // serviceKeys
        {} as any, // permissions
        {} as any, // emailTemplates
        {} as any, // webhooks
        {} as any, // goodsReceipts
    );
    return { service, prisma };
}

describe('material categories', () => {
    it('lists categories from the relational table, not the settings blob', async () => {
        const { service, prisma } = makeService();
        const result = await service.findMaterialCategories();
        expect(prisma.materialCategory.findMany).toHaveBeenCalled();
        expect(result).toEqual([
            expect.objectContaining({ id: 'cat-1', name: 'Concrete & Cement' }),
        ]);
    });

    it('refuses to create a category with no name', async () => {
        const { service } = makeService();
        await expect(service.createMaterialCategory({})).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates a category, then creates one Material per material row with its Types nested, dropping blank rows', async () => {
        const { service, prisma } = makeService();
        await service.createMaterialCategory({
            name: ' Concrete & Cement ',
            description: ' Cement and blocks ',
            color: 'teal',
            materials: [
                {
                    name: 'Cement (50kg bag)',
                    classification: 'Consumable',
                    types: [
                        {
                            name: 'Ordinary Portland Cement',
                            sku: 'CEM-OPC-50',
                            dimensions: [{ kind: 'Weight', value: 50, unit: 'kg' }],
                        },
                        // No name — dropped.
                        { name: '', sku: 'ignored', dimensions: [] },
                    ],
                },
                // No name — the whole material is dropped.
                { name: '  ', classification: 'Reusable', types: [] },
            ],
        });

        expect(prisma.materialCategory.create).toHaveBeenCalledWith({
            data: { name: 'Concrete & Cement', description: 'Cement and blocks', color: 'teal' },
        });
        expect(prisma.material.create).toHaveBeenCalledTimes(1);
        expect(prisma.material.create).toHaveBeenCalledWith({
            data: {
                categoryId: 'cat-new',
                name: 'Cement (50kg bag)',
                category: 'Concrete & Cement',
                materialType: 'Consumable',
                types: {
                    create: [
                        {
                            name: 'Ordinary Portland Cement',
                            sku: 'CEM-OPC-50',
                            dimensions: [{ kind: 'Weight', value: 50, unit: 'kg' }],
                        },
                    ],
                },
            },
        });
    });

    it('defaults a missing/unrecognised classification to Consumable', async () => {
        const { service, prisma } = makeService();
        await service.createMaterialCategory({
            name: 'Timber',
            materials: [{ name: 'Plywood', types: [{ name: 'Sheet', dimensions: [] }] }],
        });
        const data = prisma.material.create.mock.calls[0][0].data;
        expect(data.materialType).toBe('Consumable');
    });

    it('rolls up totalQty/availableQty/reservedQty as sums and unitCost as a quantity-weighted average', async () => {
        const { service, prisma } = makeService();
        prisma.materialType.findMany.mockResolvedValueOnce([
            { totalQty: 300, availableQty: 300, reservedQty: 0, unitCost: 8000 },
            { totalQty: 200, availableQty: 150, reservedQty: 50, unitCost: 8500 },
        ]);
        await service.createMaterialCategory({
            name: 'Concrete & Cement',
            materials: [
                { name: 'Cement (50kg bag)', classification: 'Consumable', types: [{ name: 'OPC', dimensions: [] }] },
            ],
        });

        expect(prisma.material.update).toHaveBeenCalledWith({
            where: { id: 'mat-1' },
            data: { totalQty: 500, availableQty: 450, reservedQty: 50, unitCost: 8200 },
        });
    });

    it('rolls up to zero when a material has no Types with any stock yet', async () => {
        const { service, prisma } = makeService();
        await service.createMaterialCategory({
            name: 'Timber',
            materials: [{ name: 'Plywood', types: [{ name: 'Sheet', dimensions: [] }] }],
        });
        expect(prisma.material.update).toHaveBeenCalledWith({
            where: { id: 'mat-1' },
            data: { totalQty: 0, availableQty: 0, reservedQty: 0, unitCost: 0 },
        });
    });

    it('refuses to update a category that does not exist', async () => {
        const { service, prisma } = makeService();
        prisma.materialCategory.findUnique.mockResolvedValueOnce(null);
        await expect(
            service.updateMaterialCategory('missing', { name: 'X' }),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses to blank out a category name on update', async () => {
        const { service } = makeService();
        await expect(
            service.updateMaterialCategory('cat-1', { name: '   ' }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('replaces the whole materials subtree when materials are submitted on update', async () => {
        const { service, prisma } = makeService();
        await service.updateMaterialCategory('cat-1', {
            materials: [
                {
                    name: 'Concrete Block',
                    classification: 'Consumable',
                    types: [{ name: 'Solid Block', sku: 'BLK-SLD-9', dimensions: [] }],
                },
            ],
        });

        expect(prisma.material.deleteMany).toHaveBeenCalledWith({ where: { categoryId: 'cat-1' } });
        expect(prisma.material.create).toHaveBeenCalledTimes(1);
        expect(prisma.material.create).toHaveBeenCalledWith({
            data: {
                categoryId: 'cat-1',
                name: 'Concrete Block',
                // No name in the patch, so the existing category's name is used.
                category: 'Concrete & Cement',
                materialType: 'Consumable',
                types: {
                    create: [{ name: 'Solid Block', sku: 'BLK-SLD-9', dimensions: [] }],
                },
            },
        });
    });

    it('uses the new name for the denormalised Material.category when both name and materials change together', async () => {
        const { service, prisma } = makeService();
        await service.updateMaterialCategory('cat-1', {
            name: 'Concrete & Cement (renamed)',
            materials: [{ name: 'Concrete Block', classification: 'Consumable', types: [] }],
        });
        const data = prisma.material.create.mock.calls[0][0].data;
        expect(data.category).toBe('Concrete & Cement (renamed)');
    });

    it('leaves the materials subtree untouched when the update omits materials entirely', async () => {
        const { service, prisma } = makeService();
        await service.updateMaterialCategory('cat-1', { color: 'blue' });

        expect(prisma.material.deleteMany).not.toHaveBeenCalled();
        expect(prisma.material.create).not.toHaveBeenCalled();
        expect(prisma.materialCategory.update).toHaveBeenCalledWith({
            where: { id: 'cat-1' },
            data: { color: 'blue' },
        });
    });

    it('deletes a category', async () => {
        const { service, prisma } = makeService();
        const result = await service.deleteMaterialCategory('cat-1');
        expect(prisma.materialCategory.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
        expect(result).toEqual({ id: 'cat-1', deleted: true });
    });

    it('reports a category that no longer exists as not found rather than a raw Prisma error', async () => {
        const { service, prisma } = makeService();
        prisma.materialCategory.delete.mockRejectedValueOnce(new Error('Record to delete does not exist.'));
        await expect(service.deleteMaterialCategory('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
});
