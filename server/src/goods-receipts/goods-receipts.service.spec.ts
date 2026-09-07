import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { GoodsReceiptsService } from './goods-receipts.service';

/**
 * Recording a delivery, deciding it, and what deciding it does to stock.
 *
 * Update Record only ever writes a draft (the item's pending* fields) — no
 * stock moves until Accept & Update Stock folds that draft into the
 * cumulative totals and posts it. That split, and the approver gate in
 * front of Accept, are what this file is really about.
 */

interface Fixtures {
    grn?: any;
    material?: any;
    storeItem?: any;
    workflow?: any;
}

function makeService(fx: Fixtures = {}) {
    const grn = {
        id: 'grn-1',
        reference: 'GRN-0001',
        purchaseOrderId: 'po-1',
        poRef: 'PO-0031',
        mrRef: 'MR-0007',
        supplierName: 'Dangote Cement',
        storeId: 'store-1',
        storeName: 'Lekki Central Store',
        receivedBy: 'Chukwudi Eze',
        deliveryNote: null,
        status: 'pending',
        stockPostedAt: null,
        notes: null,
        purchaseOrder: { id: 'po-1', mrRef: 'MR-0007', supplier: { name: 'Dangote Cement' } },
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
                pendingReceived: null,
                pendingAccepted: null,
                pendingRejected: null,
                pendingReason: null,
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
            // A material must already exist in the catalogue for accept() to post
            // to it — defaults to one matching the fixture GRN's line so most
            // tests exercise the update path; pass fx.material: null to test the
            // no-match rejection.
            findFirst: jest.fn(() =>
                Promise.resolve(
                    fx.material !== undefined
                        ? fx.material
                        : { id: 'mat-1', name: 'OPC Cement', category: 'Cement', totalQty: 0, availableQty: 0, unitCost: 8000 },
                ),
            ),
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
            findMany: jest.fn(() => Promise.resolve([{ material: 'OPC Cement', unitCost: 8500 }])),
            updateMany: jest.fn(() => Promise.resolve({ count: 1 })),
        },
        goodsReceipt: {
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
        store: {
            findUnique: jest.fn(() =>
                Promise.resolve({ id: 'store-1', name: 'Lekki Central Store', projectName: 'Lekki Towers', projectId: 'prj-1' }),
            ),
            findFirst: jest.fn(() => Promise.resolve(null)),
        },
    };

    const prisma: any = {
        goodsReceipt: {
            findUnique: jest.fn(() => Promise.resolve(grn)),
            findUniqueOrThrow: jest.fn(() => Promise.resolve(grn)),
            findFirst: jest.fn(() => Promise.resolve(null)),
            findMany: jest.fn(() => Promise.resolve([grn])),
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
                    items: [{ material: 'OPC Cement', qty: 500, unit: 'bags', unitCost: 8500 }],
                }),
            ),
            update: jest.fn((args: any) => {
                writes.purchaseOrder.push(args.data);
                return Promise.resolve(args.data);
            }),
        },
        pOItem: {
            findMany: jest.fn(() => Promise.resolve([{ material: 'OPC Cement', unitCost: 8500 }])),
        },
        purchaseInvoice: {
            create: jest.fn((args: any) => Promise.resolve({ id: 'inv-1', ...args.data })),
        },
        goodsReceiptItem: {
            update: jest.fn(({ data }: any) => {
                writes.goodsReceiptItem.push(data);
                return Promise.resolve(data);
            }),
        },
        systemSetting: {
            findUnique: jest.fn(() =>
                Promise.resolve(
                    fx.workflow === undefined
                        ? { value: { processWorkflows: [] } }
                        : { value: { processWorkflows: [fx.workflow] } },
                ),
            ),
        },
        user: {
            findUnique: jest.fn(() => Promise.resolve(null)),
        },
        // Supports both the callback form (accept()) and the array form
        // (updateRecord()'s batch of independent item writes).
        $transaction: jest.fn((arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(tx))),
    };

    const numbering: any = {
        allocate: jest.fn(() => Promise.resolve({ reference: 'GRN-0002' })),
    };
    const notifications: any = { dispatch: jest.fn(() => Promise.resolve()) };
    const mailQueue: any = { enqueueEmail: jest.fn(() => Promise.resolve({ queued: true })) };
    const permissions: any = {
        can: jest.fn(() => Promise.resolve(false)),
        resolveForUser: jest.fn(() => Promise.resolve({ isSuper: false })),
    };

    const service = new GoodsReceiptsService(prisma, numbering, notifications, mailQueue, permissions);
    return { service, prisma, tx, writes, numbering, mailQueue, permissions };
}

const draft = {
    storeId: 'store-1',
    storeName: 'Lekki Central Store',
    deliveryNote: 'DN-4471',
    receivedBy: 'Chukwudi Eze',
    items: [{ material: 'OPC Cement', unit: 'bags', received: 500, accepted: 500, rejected: 0 }],
};

describe('updating a record', () => {
    it('writes a draft and moves to pending_approval without touching stock', async () => {
        const { service, prisma, writes } = makeService();
        await service.updateRecord('grn-1', draft);

        expect(writes.stockMovement).toHaveLength(0);
        expect(prisma.goodsReceipt.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: 'pending_approval' }) }),
        );
    });

    it('refuses a record with nowhere to put the goods', async () => {
        const { service } = makeService();
        await expect(
            service.updateRecord('grn-1', { ...draft, storeId: '', storeName: '' }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses quantities that add up to more than turned up', async () => {
        const { service } = makeService();
        await expect(
            service.updateRecord('grn-1', {
                ...draft,
                items: [{ material: 'OPC Cement', unit: 'bags', received: 100, accepted: 100, rejected: 50 }],
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('requires a reason for a rejected quantity', async () => {
        const { service } = makeService();
        await expect(
            service.updateRecord('grn-1', {
                ...draft,
                items: [{ material: 'OPC Cement', unit: 'bags', received: 500, accepted: 460, rejected: 40 }],
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('cannot record over a delivery that has already been fully received', async () => {
        const { service } = makeService({
            grn: {
                status: 'fully_received',
                items: [
                    {
                        id: 'gri-1',
                        material: 'OPC Cement',
                        unit: 'bags',
                        ordered: 500,
                        received: 500,
                        accepted: 500,
                        rejected: 0,
                        reason: null,
                        pendingReceived: null,
                        pendingAccepted: null,
                        pendingRejected: null,
                        pendingReason: null,
                    },
                ],
            },
        });
        await expect(service.updateRecord('grn-1', draft)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('cannot record over a delivery that was rejected outright', async () => {
        const { service } = makeService({ grn: { status: 'rejected' } });
        await expect(service.updateRecord('grn-1', draft)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows Record Remaining Delivery on a decided but incomplete delivery', async () => {
        const { service } = makeService({
            grn: {
                status: 'under_supply',
                items: [
                    {
                        id: 'gri-1',
                        material: 'OPC Cement',
                        unit: 'bags',
                        ordered: 500,
                        received: 300,
                        accepted: 300,
                        rejected: 0,
                        reason: null,
                        pendingReceived: null,
                        pendingAccepted: null,
                        pendingRejected: null,
                        pendingReason: null,
                    },
                ],
            },
        });
        const result = await service.updateRecord('grn-1', {
            ...draft,
            items: [{ material: 'OPC Cement', unit: 'bags', received: 200, accepted: 200, rejected: 0 }],
        });
        expect(result.status).toBe('pending_approval');
    });
});

describe('accepting a record', () => {
    function pendingGrn(overrides: any = {}) {
        return {
            status: 'pending_approval',
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
                    pendingReceived: 500,
                    pendingAccepted: 500,
                    pendingRejected: 0,
                    pendingReason: null,
                    ...overrides.item,
                },
            ],
            ...overrides.grn,
        };
    }

    it('refuses to accept a record with no decision pending', async () => {
        const { service } = makeService({ grn: { status: 'pending' } });
        await expect(service.accept('grn-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses to post a line whose material is not already in the catalogue, rather than inventing a new one', async () => {
        const { service, writes } = makeService({ grn: pendingGrn(), material: null });
        await expect(service.accept('grn-1')).rejects.toBeInstanceOf(BadRequestException);
        expect(writes.materialCreate).toHaveLength(0);
    });

    it('posts the newly accepted quantity to stock and folds it into the cumulative totals', async () => {
        const { service, writes } = makeService({ grn: pendingGrn() });
        await service.accept('grn-1');

        expect(writes.stockMovement).toHaveLength(1);
        expect(writes.stockMovement[0]).toMatchObject({ qty: 500, storeId: 'store-1' });
        expect(writes.goodsReceiptItem[0]).toMatchObject({
            received: 500,
            accepted: 500,
            rejected: 0,
            pendingReceived: null,
            pendingAccepted: null,
            pendingRejected: null,
        });
    });

    it('classifies a clean, complete delivery as fully received and closes the order', async () => {
        const { service, writes } = makeService({ grn: pendingGrn() });
        const result = await service.accept('grn-1');

        expect(result.status).toBe('fully_received');
        expect(writes.purchaseOrder[0]).toMatchObject({ status: 'goods_received' });
    });

    it('classifies any rejection as partial delivery, even a short one', async () => {
        const { service, writes } = makeService({
            grn: pendingGrn({ item: { pendingReceived: 500, pendingAccepted: 460, pendingRejected: 40 } }),
        });
        const result = await service.accept('grn-1');

        expect(result.status).toBe('partial_delivery');
        // Still short of the order, so the PO is not closed off.
        expect(writes.purchaseOrder[0].status).toBeUndefined();
    });

    it('classifies more than ordered as over supply', async () => {
        const { service } = makeService({
            grn: pendingGrn({ item: { pendingReceived: 520, pendingAccepted: 520, pendingRejected: 0 } }),
        });
        const result = await service.accept('grn-1');

        expect(result.status).toBe('over_supply');
    });

    it('classifies less than ordered, with nothing rejected, as under supply', async () => {
        const { service } = makeService({
            grn: pendingGrn({ item: { pendingReceived: 300, pendingAccepted: 300, pendingRejected: 0 } }),
        });
        const result = await service.accept('grn-1');

        expect(result.status).toBe('under_supply');
    });

    it('does not add rejected goods to stock', async () => {
        const { service, writes } = makeService({
            grn: pendingGrn({ item: { pendingReceived: 500, pendingAccepted: 460, pendingRejected: 40, pendingReason: 'Torn bags' } }),
        });
        await service.accept('grn-1');

        expect(writes.stockMovement[0].qty).toBe(460);
    });

    it('adds a second accepted pass onto the first, not over it', async () => {
        const { service, writes } = makeService({
            grn: pendingGrn({
                item: {
                    // 300 already accepted on a prior pass; this pass adds 200 more.
                    received: 300,
                    accepted: 300,
                    rejected: 0,
                    pendingReceived: 200,
                    pendingAccepted: 200,
                    pendingRejected: 0,
                },
            }),
        });
        const result = await service.accept('grn-1');

        expect(writes.stockMovement[0].qty).toBe(200);
        expect(writes.goodsReceiptItem[0]).toMatchObject({ received: 500, accepted: 500 });
        expect(result.status).toBe('fully_received');
    });

    it('lets the named approver accept', async () => {
        const { service } = makeService({
            grn: pendingGrn(),
            workflow: { processId: 'p_goods_receipt', workflowType: 'single', approver: 'Finance Manager' },
        });
        await expect(
            service.accept('grn-1', { userId: 'u-1', name: 'Finance Manager' }),
        ).resolves.toMatchObject({ status: 'fully_received' });
    });

    it('refuses anyone who is not the configured approver', async () => {
        const { service } = makeService({
            grn: pendingGrn(),
            workflow: { processId: 'p_goods_receipt', workflowType: 'single', approver: 'Finance Manager' },
        });
        await expect(
            service.accept('grn-1', { userId: 'u-2', name: 'Someone Else' }),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses the person who recorded the delivery from also accepting it', async () => {
        const { service } = makeService({
            grn: pendingGrn({ grn: { receivedBy: 'Finance Manager' } }),
            workflow: { processId: 'p_goods_receipt', workflowType: 'single', approver: 'Finance Manager' },
        });
        await expect(
            service.accept('grn-1', { userId: 'u-1', name: 'Finance Manager' }),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });
});

describe('canDecide stamping', () => {
    it('flags the named approver as able to decide a pending record', async () => {
        const { service } = makeService({
            grn: { status: 'pending_approval' },
            workflow: { processId: 'p_goods_receipt', workflowType: 'single', approver: 'Finance Manager' },
        });
        const [row] = await service.findAll(undefined, { userId: 'u-1', name: 'Finance Manager' });
        expect(row.canDecide).toBe(true);
    });

    it('flags anyone who is not the configured approver as unable to decide', async () => {
        const { service } = makeService({
            grn: { status: 'pending_approval' },
            workflow: { processId: 'p_goods_receipt', workflowType: 'single', approver: 'Finance Manager' },
        });
        const [row] = await service.findAll(undefined, { userId: 'u-2', name: 'Someone Else' });
        expect(row.canDecide).toBe(false);
    });

    it('flags canDecide false when there is no signed-in identity to check', async () => {
        const { service } = makeService({
            grn: { status: 'pending_approval' },
            workflow: { processId: 'p_goods_receipt', workflowType: 'single', approver: 'Finance Manager' },
        });
        const [row] = await service.findAll();
        expect(row.canDecide).toBe(false);
    });

    it('flags the person who recorded the delivery as unable to decide their own record', async () => {
        const { service } = makeService({
            grn: { status: 'pending_approval', receivedBy: 'Finance Manager' },
            workflow: { processId: 'p_goods_receipt', workflowType: 'single', approver: 'Finance Manager' },
        });
        const row = await service.findOne('grn-1', { userId: 'u-1', name: 'Finance Manager' });
        expect(row.canDecide).toBe(false);
    });

    it('lets a super user decide even a record they themselves recorded', async () => {
        const { service, permissions } = makeService({
            grn: { status: 'pending_approval', receivedBy: 'Finance Manager' },
            workflow: { processId: 'p_goods_receipt', workflowType: 'single', approver: 'Finance Manager' },
        });
        permissions.resolveForUser.mockResolvedValueOnce({ isSuper: true });
        const row = await service.findOne('grn-1', { userId: 'u-1', name: 'Finance Manager' });
        expect(row.canDecide).toBe(true);
    });
});

describe('raising a rejection note', () => {
    it('sends the record back to pending, keeping the draft for correction', async () => {
        const { service, prisma } = makeService({ grn: { status: 'pending_approval' } });
        await service.raiseRejectionNote('grn-1', 'Quantities look wrong', undefined);

        expect(prisma.goodsReceipt.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ status: 'pending', notes: expect.stringContaining('Quantities look wrong') }),
            }),
        );
    });

    it('refuses a note on a record with nothing pending', async () => {
        const { service } = makeService({ grn: { status: 'fully_received' } });
        await expect(service.raiseRejectionNote('grn-1', 'x', undefined)).rejects.toBeInstanceOf(BadRequestException);
    });
});

describe('rejecting outright', () => {
    it('posts nothing to stock', async () => {
        const { service, writes } = makeService();
        await service.reject('grn-1', 'Wrong grade of cement');

        expect(writes.stockMovement).toHaveLength(0);
    });

    it('cannot reject outright once something has been recorded', async () => {
        const { service } = makeService({ grn: { status: 'pending_approval' } });
        await expect(service.reject('grn-1', 'x')).rejects.toBeInstanceOf(BadRequestException);
    });
});

describe('sending to Finance', () => {
    const acceptedGrn = {
        status: 'fully_received',
        purchaseOrder: {
            id: 'po-1',
            poRef: 'PO-0031',
            supplier: { name: 'Dangote Cement' },
            supplierId: 'sup-1',
            expectedDate: new Date('2026-08-01'),
            sentToFinance: false,
            deliverySplit: 'post_delivery',
            paymentTermSnapshot: { tranches: [{ title: 'Full payment', percent: 100, timing: 'on_delivery' }] },
        },
        items: [{ id: 'gri-1', material: 'OPC Cement', unit: 'bags', ordered: 500, received: 500, accepted: 500, rejected: 0 }],
    };

    it('raises an invoice for what has been accepted and hands the order to Finance', async () => {
        const { service, prisma } = makeService({ grn: acceptedGrn });
        await service.sendToFinance('grn-1');

        expect(prisma.purchaseInvoice.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ total: 500 * 8500, poRef: 'PO-0031' }),
            }),
        );
    });

    it('refuses when the payment term is settled before delivery', async () => {
        const { service } = makeService({
            grn: {
                ...acceptedGrn,
                purchaseOrder: {
                    ...acceptedGrn.purchaseOrder,
                    paymentTermSnapshot: { tranches: [{ title: 'Full payment', percent: 100, timing: 'on_po_approval' }] },
                },
            },
        });
        await expect(service.sendToFinance('grn-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a record that has not been accepted yet', async () => {
        const { service } = makeService({ grn: { status: 'pending_approval' } });
        await expect(service.sendToFinance('grn-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses an order already sent to Finance', async () => {
        const { service } = makeService({
            grn: { ...acceptedGrn, purchaseOrder: { ...acceptedGrn.purchaseOrder, sentToFinance: true } },
        });
        await expect(service.sendToFinance('grn-1')).rejects.toBeInstanceOf(BadRequestException);
    });
});

describe('notifying the supplier', () => {
    it('emails the supplier and notes it on the record', async () => {
        const { service, mailQueue, prisma } = makeService({ grn: { status: 'over_supply' } });
        await service.notifySupplier('grn-1', {
            email: 'procurement@supplier.ng',
            message: 'You delivered 20 more than ordered.',
        });

        expect(mailQueue.enqueueEmail).toHaveBeenCalledWith(
            expect.objectContaining({ to: 'procurement@supplier.ng' }),
        );
        expect(prisma.goodsReceipt.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ notes: expect.stringContaining('Over Supply') }) }),
        );
    });

    it('requires an email address', async () => {
        const { service } = makeService();
        await expect(
            service.notifySupplier('grn-1', { message: 'x' }),
        ).rejects.toBeInstanceOf(BadRequestException);
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
                            { material: 'OPC Cement', unit: 'bags', ordered: 500, received: 0, accepted: 0, rejected: 0 },
                        ],
                    },
                }),
            }),
        );
    });

    it('does not open a second receipt for an order that already has one', async () => {
        const { service, prisma } = makeService();
        prisma.goodsReceipt.findFirst = jest.fn(() => Promise.resolve({ id: 'grn-1', items: [] }));

        await service.openForOrder('po-1');
        expect(prisma.goodsReceipt.create).not.toHaveBeenCalled();
    });
});
