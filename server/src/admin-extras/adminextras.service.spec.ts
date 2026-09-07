import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AdminExtrasService } from './admin-extras.service';

/**
 * Material Categories: Category → Material. `Material` is the same table
 * Goods Receipt/Stock Movement already use — a row created here is real
 * inventory, not disposable catalog-only data. There is no Type table
 * underneath any more: the builder groups input as Material Name → item →
 * dimensions, but every dimension of every item becomes its own flat
 * Material row on save, named "<Material Name> — <item name> (<value+unit>)".
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
            findFirst: jest.fn(() => Promise.resolve(null)),
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
            update: jest.fn(({ where, data }: any) => Promise.resolve({ id: where.id, ...data })),
            findMany: jest.fn(() => Promise.resolve([{ id: 'mat-1' }, { id: 'mat-2' }])),
        },
        $transaction: jest.fn((arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(prisma))),
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

    it('flattens each dimension of each item into its own Material row, concatenating the name', async () => {
        const { service, prisma } = makeService();
        await service.createMaterialCategory({
            name: ' Concrete & Cement ',
            description: ' Cement and blocks ',
            color: 'teal',
            materials: [
                {
                    name: 'Iron Rod',
                    classification: 'Consumable',
                    items: [
                        {
                            name: 'Deformed Bar',
                            sku: 'IR-DB',
                            dimensions: [
                                { kind: 'Length', value: 12, unit: 'mm' },
                                { kind: 'Length', value: 16, unit: 'mm' },
                            ],
                        },
                    ],
                },
                // No name — the whole material is dropped.
                { name: '  ', classification: 'Reusable', items: [] },
            ],
        });

        expect(prisma.materialCategory.create).toHaveBeenCalledWith({
            data: { name: 'Concrete & Cement', description: 'Cement and blocks', color: 'teal' },
        });
        expect(prisma.material.create).toHaveBeenCalledTimes(2);
        expect(prisma.material.create).toHaveBeenCalledWith({
            data: {
                categoryId: 'cat-new',
                category: 'Concrete & Cement',
                materialType: 'Consumable',
                name: 'Iron Rod — Deformed Bar (12mm)',
                materialGroupName: 'Iron Rod',
                itemName: 'Deformed Bar',
                sku: 'IR-DB',
                kind: 'Length',
                value: 12,
                unit: 'mm',
            },
        });
        expect(prisma.material.create).toHaveBeenCalledWith({
            data: {
                categoryId: 'cat-new',
                category: 'Concrete & Cement',
                materialType: 'Consumable',
                name: 'Iron Rod — Deformed Bar (16mm)',
                materialGroupName: 'Iron Rod',
                itemName: 'Deformed Bar',
                sku: 'IR-DB',
                kind: 'Length',
                value: 16,
                unit: 'mm',
            },
        });
    });

    it('refuses an item that has a name but no dimensions', async () => {
        const { service } = makeService();
        await expect(
            service.createMaterialCategory({
                name: 'Timber',
                materials: [
                    { name: 'Plywood', classification: 'Consumable', items: [{ name: 'Sheet', dimensions: [] }] },
                ],
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses an item with no name, even if it has dimensions', async () => {
        const { service } = makeService();
        await expect(
            service.createMaterialCategory({
                name: 'Timber',
                materials: [
                    {
                        name: 'Plywood',
                        classification: 'Consumable',
                        items: [{ name: '  ', dimensions: [{ kind: 'Length', value: 8, unit: 'ft' }] }],
                    },
                ],
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a named material with no items', async () => {
        const { service } = makeService();
        await expect(
            service.createMaterialCategory({
                name: 'Timber',
                materials: [{ name: 'Plywood', classification: 'Consumable', items: [] }],
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a material with items but no name', async () => {
        const { service } = makeService();
        await expect(
            service.createMaterialCategory({
                name: 'Timber',
                materials: [
                    {
                        name: '  ',
                        classification: 'Consumable',
                        items: [{ name: 'Sheet', dimensions: [{ kind: 'Length', value: 8, unit: 'ft' }] }],
                    },
                ],
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('silently skips a fully blank material row (no name, no items)', async () => {
        const { service, prisma } = makeService();
        await service.createMaterialCategory({
            name: 'Timber',
            materials: [{ name: '   ', classification: 'Reusable', items: [] }],
        });
        expect(prisma.material.create).not.toHaveBeenCalled();
    });

    it('defaults a missing/unrecognised classification to Consumable', async () => {
        const { service, prisma } = makeService();
        await service.createMaterialCategory({
            name: 'Timber',
            materials: [{ name: 'Plywood', items: [{ name: 'Sheet', dimensions: [{ kind: 'Length', value: 8, unit: 'ft' }] }] }],
        });
        const data = prisma.material.create.mock.calls[0][0].data;
        expect(data.materialType).toBe('Consumable');
    });

    it('refuses a dimension that has neither a value nor a unit', async () => {
        const { service } = makeService();
        await expect(
            service.createMaterialCategory({
                name: 'Fixings',
                materials: [
                    {
                        name: 'Bolt',
                        items: [{ name: 'Hex Bolt', dimensions: [{ kind: 'Custom', value: null, unit: null }] }],
                    },
                ],
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses to create a category with a name that already exists (case-insensitive)', async () => {
        const { service, prisma } = makeService();
        prisma.materialCategory.findFirst.mockResolvedValueOnce({ id: 'cat-1', name: 'Concrete & Cement' });
        await expect(
            service.createMaterialCategory({ name: 'concrete & cement' }),
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it('refuses to update a category to a name that already exists on another category', async () => {
        const { service, prisma } = makeService();
        prisma.materialCategory.findFirst.mockResolvedValueOnce({ id: 'cat-2', name: 'Timber' });
        await expect(
            service.updateMaterialCategory('cat-1', { name: 'Timber' }),
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it('allows updating a category while keeping its own name (case-insensitive, no self-conflict)', async () => {
        const { service, prisma } = makeService();
        await service.updateMaterialCategory('cat-1', { name: 'concrete & cement', color: 'blue' });
        expect(prisma.materialCategory.findFirst).not.toHaveBeenCalled();
        expect(prisma.materialCategory.update).toHaveBeenCalledWith({
            where: { id: 'cat-1' },
            data: { name: 'concrete & cement', color: 'blue' },
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
                    items: [{ name: 'Solid Block', sku: 'BLK-SLD-9', dimensions: [{ kind: 'Weight', value: 9, unit: 'kg' }] }],
                },
            ],
        });

        expect(prisma.material.deleteMany).toHaveBeenCalledWith({ where: { categoryId: 'cat-1' } });
        expect(prisma.material.create).toHaveBeenCalledTimes(1);
        expect(prisma.material.create).toHaveBeenCalledWith({
            data: {
                categoryId: 'cat-1',
                // No name in the patch, so the existing category's name is used.
                category: 'Concrete & Cement',
                materialType: 'Consumable',
                name: 'Concrete Block — Solid Block (9kg)',
                materialGroupName: 'Concrete Block',
                itemName: 'Solid Block',
                sku: 'BLK-SLD-9',
                kind: 'Weight',
                value: 9,
                unit: 'kg',
            },
        });
    });

    it('uses the new name for the denormalised Material.category when both name and materials change together', async () => {
        const { service, prisma } = makeService();
        await service.updateMaterialCategory('cat-1', {
            name: 'Concrete & Cement (renamed)',
            materials: [
                { name: 'Concrete Block', classification: 'Consumable', items: [{ name: 'Solid', dimensions: [{ kind: 'Weight', value: 9, unit: 'kg' }] }] },
            ],
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

    it('adds new materials under an existing category without touching what is already there', async () => {
        const { service, prisma } = makeService();
        await service.addMaterialsToCategory('cat-1', {
            materials: [
                {
                    name: 'Iron Rod',
                    classification: 'Consumable',
                    items: [{ name: 'Deformed Bar', sku: 'IR-DB', dimensions: [{ kind: 'Length', value: 12, unit: 'mm' }] }],
                },
            ],
        });

        expect(prisma.material.deleteMany).not.toHaveBeenCalled();
        expect(prisma.material.create).toHaveBeenCalledTimes(1);
        expect(prisma.material.create).toHaveBeenCalledWith({
            data: {
                categoryId: 'cat-1',
                category: 'Concrete & Cement',
                materialType: 'Consumable',
                name: 'Iron Rod — Deformed Bar (12mm)',
                materialGroupName: 'Iron Rod',
                itemName: 'Deformed Bar',
                sku: 'IR-DB',
                kind: 'Length',
                value: 12,
                unit: 'mm',
            },
        });
    });

    it('refuses to add materials to a category that does not exist', async () => {
        const { service, prisma } = makeService();
        prisma.materialCategory.findUnique.mockResolvedValueOnce(null);
        await expect(
            service.addMaterialsToCategory('missing', {
                materials: [{ name: 'Iron Rod', items: [{ name: 'Bar', dimensions: [{ kind: 'Length', value: 1, unit: 'm' }] }] }],
            }),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses when no valid material rows are submitted', async () => {
        const { service } = makeService();
        await expect(service.addMaterialsToCategory('cat-1', { materials: [] })).rejects.toBeInstanceOf(BadRequestException);
    });
});

describe('All Materials — catalogue-aware stock entry', () => {
    it('searches Material rows by name, group name or item name', async () => {
        const { service, prisma } = makeService();
        await service.searchMaterials('cem');
        expect(prisma.material.findMany).toHaveBeenCalledWith({
            where: {
                OR: [
                    { name: { contains: 'cem', mode: 'insensitive' } },
                    { materialGroupName: { contains: 'cem', mode: 'insensitive' } },
                    { itemName: { contains: 'cem', mode: 'insensitive' } },
                ],
            },
            orderBy: { name: 'asc' },
            take: 20,
        });
    });

    it('does not query for a blank search', async () => {
        const { service, prisma } = makeService();
        const result = await service.searchMaterials('   ');
        expect(result).toEqual([]);
        expect(prisma.material.findMany).not.toHaveBeenCalled();
    });

    it('refuses a stock update with no materials', async () => {
        const { service } = makeService();
        await expect(service.applyMaterialStockUpdate({ materials: [] })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses an entry with no id', async () => {
        const { service } = makeService();
        await expect(
            service.applyMaterialStockUpdate({ materials: [{ totalQty: 10 }] }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a material id that does not exist', async () => {
        const { service, prisma } = makeService();
        prisma.material.findMany.mockResolvedValueOnce([{ id: 'mat-1' }]);
        await expect(
            service.applyMaterialStockUpdate({
                materials: [
                    { id: 'mat-1', totalQty: 10, availableQty: 10, reservedQty: 0, unitCost: 100 },
                    { id: 'mat-missing', totalQty: 5, availableQty: 5, reservedQty: 0, unitCost: 50 },
                ],
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('applies stock directly to each Material row, optionally patching its own reorderLevel', async () => {
        const { service, prisma } = makeService();
        await service.applyMaterialStockUpdate({
            materials: [
                { id: 'mat-1', totalQty: 300, availableQty: 300, reservedQty: 0, unitCost: 8000, reorderLevel: 25 },
                { id: 'mat-2', totalQty: 200, availableQty: 150, reservedQty: 50, unitCost: 8500 },
            ],
        });

        expect(prisma.material.update).toHaveBeenCalledWith({
            where: { id: 'mat-1' },
            data: { totalQty: 300, availableQty: 300, reservedQty: 0, unitCost: 8000, reorderLevel: 25 },
        });
        expect(prisma.material.update).toHaveBeenCalledWith({
            where: { id: 'mat-2' },
            data: { totalQty: 200, availableQty: 150, reservedQty: 50, unitCost: 8500 },
        });
    });

    it('leaves reorderLevel untouched when it is not submitted', async () => {
        const { service, prisma } = makeService();
        await service.applyMaterialStockUpdate({
            materials: [{ id: 'mat-1', totalQty: 10, availableQty: 10, reservedQty: 0, unitCost: 100 }],
        });
        for (const call of prisma.material.update.mock.calls) {
            expect(call[0].data).not.toHaveProperty('reorderLevel');
        }
    });
});
