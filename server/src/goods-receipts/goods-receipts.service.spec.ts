import { BadRequestException } from '@nestjs/common';
import { GoodsReceiptsService } from './goods-receipts.service';

/**
 * Receiving goods, and what it does to stock.
 *
 * This is the step the module never had. "Accept & Update Stock" set a status
 * in React state: no receipt was stored, no stock movement was written, no
 * material quantity changed, and the storefront never saw the delivery. So what
 * matters here is not the receipt row — it is that accepting one moves the three
 * places a quantity lives (the movement log, the store shelf, the material
 * catalogue) and that it moves them *together*.
 */

interface Fixtures {
    grn?: any;
    material?: any;
    storeItem?: any;
}

function makeService(fx: Fixtures = {}) {
    const grn = {
        id: 'grn-1',
        reference: 'GRN-0001',
        purchaseOrderId: 'po-1',
        poRef: 'PO-0031',
        mrRef: 'MR-0007',
        supplierName: 'Dangote Cement',
        storeName: '',
        receivedBy: '',
        status: 'pending',
        stockPostedAt: null,
        deliveryNote: null,
        notes: null,
        purchaseOrder: { id: 'po-1', mrRef: 'MR-0007' },
        items: [
            {
                id: 'gri-1',
                material: 'OPC Cement',
                unit: 'bags',
                ordered: 500,
                received: 0,
                accepted: 0,
                rejected: 0,
                reason: null,
            },
        ],
        ...fx.grn,
    };

    const writes: Record<string, any[]> = {
        stockMovement: [],
        storeItemUpdate: [],
        storeItemCreate: [],
        materialUpdate: [],
        materialCreate: [],
        purchaseOrder: [],
        goodsReceiptItem: [],
        materialRequest: [],
    };

    const tx: any = {
        goodsReceiptItem: {
            update: jest.fn(({ data }: any) => {
                writes.goodsReceiptItem.push(data);
                return Promise.resolve(data);
            }),
        },
        stockMovement: {
            create: jest.fn(({ data }: any) => {
                writes.stockMovement.push(data);
                return Promise.resolve(data);
            }),
        },
        storeItem: {
            findFirst: jest.fn(() => Promise.resolve(fx.storeItem ?? null)),
            update: jest.fn(({ data }: any) => {
                writes.storeItemUpdate.push(data);
                return Promise.resolve(data);
            }),
            create: jest.fn(({ data }: any) => {
                writes.storeItemCreate.push(data);
                return Promise.resolve(data);
            }),
        },
        material: {
            findFirst: jest.fn(() => Promise.resolve(fx.material ?? null)),
            update: jest.fn(({ data }: any) => {
                writes.materialUpdate.push(data);
                return Promise.resolve(data);
            }),
            create: jest.fn(({ data }: any) => {
                writes.materialCreate.push(data);
                return Promise.resolve(data);
            }),
        },
        pOItem: {
            findFirst: jest.fn(() => Promise.resolve({ unitCost: 8500 })),
            findMany: jest.fn(() =>
                Promise.resolve([{ material: 'OPC Cement', unitCost: 8500 }]),
            ),
            updateMany: jest.fn(() => Promise.resolve({ count: 1 })),
        },
        goodsReceipt: {
            findMany: jest.fn(() => Promise.resolve([])),
            update: jest.fn(({ data }: any) => Promise.resolve({ ...grn, ...data })),
        },
        purchaseOrder: {
            update: jest.fn(({ data }: any) => {
                writes.purchaseOrder.push(data);
                return Promise.resolve(data);
            }),
        },
        materialRequest: {
            updateMany: jest.fn((args: any) => {
                writes.materialRequest.push(args);
                return Promise.resolve({ count: 1 });
            }),
        },
    };

    const prisma: any = {
        goodsReceipt: {
            findUnique: jest.fn(() => Promise.resolve(grn)),
            findFirst: jest.fn(() => Promise.resolve(null)),
            create: jest.fn(({ data }: any) => Promise.resolve({ id: 'grn-new', ...data })),
            update: jest.fn(({ data }: any) => Promise.resolve({ ...grn, ...data })),
        },
        purchaseOrder: {
            findUnique: jest.fn(() =>
                Promise.resolve({
                    id: 'po-1',
                    poRef: 'PO-0031',
                    mrRef: 'MR-0007',
                    supplier: { name: 'Dangote Cement' },
                    items: [
                        { material: 'OPC Cement', qty: 500, unit: 'bags', unitCost: 8500 },
                    ],
                }),
            ),
        },
        store: {
            findUnique: jest.fn(() =>
                Promise.resolve({
                    id: 'store-1',
                    name: 'Lekki Central Store',
                    projectName: 'Lekki Towers',
                    projectId: 'prj-1',
                }),
            ),
            findFirst: jest.fn(() => Promise.resolve(null)),
        },
        $transaction: jest.fn((fn: any) => fn(tx)),
    };

    const numbering: any = {
        allocate: jest.fn(() => Promise.resolve({ reference: 'GRN-0002' })),
    };
    const notifications: any = { dispatch: jest.fn(() => Promise.resolve()) };

    const service = new GoodsReceiptsService(prisma, numbering, notifications);
    return { service, prisma, tx, writes, numbering };
}

const fullDelivery = {
    storeId: 'store-1',
    storeName: 'Lekki Central Store',
    deliveryNote: 'DN-4471',
    receivedBy: 'Chukwudi Eze',
    items: [
        {
            material: 'OPC Cement',
            unit: 'bags',
            ordered: 500,
            received: 500,
            accepted: 500,
            rejected: 0,
        },
    ],
};

describe('receiving a delivery into stock', () => {
    it('records an incoming stock movement carrying where it came from', async () => {
        const { service, writes } = makeService();
        await service.receive('grn-1', fullDelivery);

        expect(writes.stockMovement).toHaveLength(1);
        expect(writes.stockMovement[0]).toMatchObject({
            type: 'incoming',
            materialName: 'OPC Cement',
            unit: 'bags',
            qty: 500,
            storeName: 'Lekki Central Store',
            storeId: 'store-1',
            // The receipt and the order behind it, so a movement can always be
            // traced back to what bought it.
            reference: 'GRN-0001 · PO-0031',
            projectName: 'Lekki Towers',
            createdBy: 'Chukwudi Eze',
        });
        expect(writes.stockMovement[0].notes).toContain('DN-4471');
    });

    it('adds the delivery to the receiving store', async () => {
        const { service, writes } = makeService({
            storeItem: { id: 'si-1', qty: 120, unitCost: 8000 },
        });
        await service.receive('grn-1', fullDelivery);

        expect(writes.storeItemUpdate[0]).toMatchObject({ qty: 620, unitCost: 8500 });
    });

    it('opens a shelf for a material the store has never held', async () => {
        const { service, writes } = makeService({
            material: { id: 'm-1', category: 'Cement', reorderLevel: 50, totalQty: 0, availableQty: 0, unitCost: 0 },
        });
        await service.receive('grn-1', fullDelivery);

        expect(writes.storeItemCreate[0]).toMatchObject({
            storeId: 'store-1',
            materialName: 'OPC Cement',
            qty: 500,
            category: 'Cement',
        });
    });

    it('makes the material available in inventory, which is what the storefront reads', async () => {
        const { service, writes } = makeService({
            material: {
                id: 'm-1',
                category: 'Cement',
                totalQty: 200,
                availableQty: 150,
                unitCost: 8000,
                reorderLevel: 50,
            },
        });
        await service.receive('grn-1', fullDelivery);

        expect(writes.materialUpdate[0]).toMatchObject({
            totalQty: 700,
            availableQty: 650,
            unitCost: 8500,
            allocationStatus: 'Available',
        });
    });

    it('catalogues a material that was bought but never catalogued', async () => {
        // Otherwise the stock exists in a store and nowhere else.
        const { service, writes } = makeService();
        await service.receive('grn-1', fullDelivery);

        expect(writes.materialCreate[0]).toMatchObject({
            name: 'OPC Cement',
            unit: 'bags',
            totalQty: 500,
            availableQty: 500,
        });
    });

    it('completes the purchase order once everything ordered has arrived', async () => {
        const { service, writes } = makeService();
        await service.receive('grn-1', fullDelivery);

        expect(writes.purchaseOrder[0]).toMatchObject({ status: 'goods_received' });
    });

    it('fulfils the material request that started the chain', async () => {
        const { service, writes } = makeService();
        await service.receive('grn-1', fullDelivery);

        expect(writes.materialRequest[0]).toMatchObject({
            data: { status: 'fulfilled' },
        });
    });
});

describe('deliveries that are not what was ordered', () => {
    it('keeps a short delivery open rather than completing the order', async () => {
        const { service, writes } = makeService();
        await service.receive('grn-1', {
            ...fullDelivery,
            items: [
                {
                    material: 'OPC Cement',
                    unit: 'bags',
                    ordered: 500,
                    received: 300,
                    accepted: 300,
                    rejected: 0,
                },
            ],
        });

        expect(writes.purchaseOrder[0].status).toBeUndefined();
        expect(writes.purchaseOrder[0].receivedValue).toBeDefined();
    });

    it('does not add rejected goods to stock', async () => {
        // Adding them is how a store ends up holding material it has already
        // sent back to the supplier.
        const { service, writes } = makeService();
        await service.receive('grn-1', {
            ...fullDelivery,
            items: [
                {
                    material: 'OPC Cement',
                    unit: 'bags',
                    ordered: 500,
                    received: 500,
                    accepted: 460,
                    rejected: 40,
                    reason: 'Torn bags',
                },
            ],
        });

        expect(writes.stockMovement[0].qty).toBe(460);
        expect(writes.stockMovement[0].notes).toContain('40 bags rejected');
    });

    it('refuses quantities that add up to more than turned up', async () => {
        const { service } = makeService();
        await expect(
            service.receive('grn-1', {
                ...fullDelivery,
                items: [
                    {
                        material: 'OPC Cement',
                        unit: 'bags',
                        ordered: 500,
                        received: 100,
                        accepted: 100,
                        rejected: 50,
                    },
                ],
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a receipt with nowhere to put the goods', async () => {
        const { service } = makeService();
        await expect(
            service.receive('grn-1', { ...fullDelivery, storeId: '', storeName: '' }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('will not post the same delivery to stock twice', async () => {
        const { service } = makeService({
            grn: { stockPostedAt: new Date('2026-08-01') },
        });
        await expect(service.receive('grn-1', fullDelivery)).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });

    it('posts nothing to stock when the delivery is rejected outright', async () => {
        const { service, writes } = makeService();
        await service.reject('grn-1', 'Wrong grade of cement');

        expect(writes.stockMovement).toHaveLength(0);
        expect(writes.materialUpdate).toHaveLength(0);
    });
});

describe('opening a receipt', () => {
    it('lists what the order says is due, with nothing received yet', async () => {
        const { service, prisma } = makeService();
        await service.openForOrder('po-1');

        expect(prisma.goodsReceipt.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    reference: 'GRN-0002',
                    poRef: 'PO-0031',
                    supplierName: 'Dangote Cement',
                    items: {
                        create: [
                            {
                                material: 'OPC Cement',
                                unit: 'bags',
                                ordered: 500,
                                received: 0,
                                accepted: 0,
                                rejected: 0,
                            },
                        ],
                    },
                }),
            }),
        );
    });

    it('does not open a second receipt for an order that already has one', async () => {
        const { service, prisma } = makeService();
        prisma.goodsReceipt.findFirst = jest.fn(() =>
            Promise.resolve({ id: 'grn-1', items: [] }),
        );

        await service.openForOrder('po-1');
        expect(prisma.goodsReceipt.create).not.toHaveBeenCalled();
    });
});
