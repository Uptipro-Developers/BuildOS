import { ProcurementRequestsService } from './procurement-requests.service';

/**
 * The links that hold the procurement chain together.
 *
 * Every write in this service builds its Prisma payload from an explicit
 * whitelist, and each stage of Material Request → Purchase Request → RFQ →
 * Quote → Purchase Order is joined to the previous one by a reference carried in
 * that payload. A field left off a whitelist does not fail loudly — it is
 * dropped in silence, and the record is stored detached from everything around
 * it. That is exactly how `prRef` went missing from RFQs and quotes: the UI
 * collected it, the server discarded it, and quote comparison had nothing left
 * to group on.
 *
 * So these assert on the payload that reaches Prisma rather than on a round
 * trip. Where a reference is dropped, that is the whole defect.
 */

function makeService() {
    const created: Record<string, any[]> = {
        purchaseRequest: [],
        sentRFQ: [],
        receivedQuote: [],
    };
    const materialRequestUpdates: any[] = [];

    const record = (model: string) => ({
        create: jest.fn(({ data }: any) => {
            created[model].push(data);
            return Promise.resolve({ id: `${model}-1`, ...data });
        }),
    });

    const purchaseOrders: any[] = [];
    const purchaseOrderUpdates: any[] = [];
    const purchaseRequestUpdates: any[] = [];
    const quoteUpdates: any[] = [];

    const prisma: any = {
        purchaseRequest: {
            ...record('purchaseRequest'),
            findUnique: jest.fn(() =>
                Promise.resolve({ prRef: 'PR-0019', mrRef: 'MR-0007', daysToDeliver: 10 }),
            ),
            updateMany: jest.fn((args: any) => {
                purchaseRequestUpdates.push(args);
                return Promise.resolve({ count: 1 });
            }),
        },
        sentRFQ: record('sentRFQ'),
        receivedQuote: {
            ...record('receivedQuote'),
            update: jest.fn(({ where, data }: any) => {
                quoteUpdates.push({ where, data });
                return Promise.resolve({ ...quoteRow, ...data });
            }),
            updateMany: jest.fn((args: any) => {
                quoteUpdates.push(args);
                return Promise.resolve({ count: 1 });
            }),
            findUniqueOrThrow: jest.fn(() =>
                Promise.resolve({ ...quoteRow, status: 'po_created' }),
            ),
        },
        purchaseOrder: {
            findFirst: jest.fn(() => Promise.resolve(null)),
            create: jest.fn(({ data }: any) => {
                purchaseOrders.push(data);
                return Promise.resolve({
                    id: 'po-1',
                    ...data,
                    supplier: { name: 'Dangote Cement' },
                    items: [],
                });
            }),
            updateMany: jest.fn((args: any) => {
                purchaseOrderUpdates.push(args);
                return Promise.resolve({ count: 1 });
            }),
        },
        purchaseInvoice: {
            create: jest.fn(({ data }: any) => Promise.resolve({ id: 'inv-1', ...data })),
            update: jest.fn(({ data }: any) =>
                Promise.resolve({ id: 'inv-1', invoiceNo: 'PI-004', poRef: 'PO-0031', supplierName: 'Dangote Cement', ...data }),
            ),
            findUnique: jest.fn(() =>
                Promise.resolve({ id: 'inv-1', invoiceNo: 'PI-004', poRef: 'PO-0031', status: 'accepted', notes: null }),
            ),
        },
        materialRequest: {
            updateMany: jest.fn((args: any) => {
                materialRequestUpdates.push(args);
                return Promise.resolve({ count: 1 });
            }),
        },
        supplier: {
            findUnique: jest.fn(() => Promise.resolve(null)),
            findFirst: jest.fn(() => Promise.resolve({ id: 'sup-1' })),
        },
    };

    const webhooks: any = { triggerWebhook: jest.fn(() => Promise.resolve()) };
    const mailQueue: any = { enqueueEmail: jest.fn(() => Promise.resolve()) };
    const numbering: any = {
        allocate: jest.fn((seq: string) =>
            Promise.resolve({
                reference:
                    seq === 'RFQ'
                        ? 'RFQ-0011'
                        : seq === 'PurchaseOrder'
                          ? 'PO-0032'
                          : seq === 'PurchaseInvoice'
                            ? 'PI-004'
                            : 'PR-0019',
            }),
        ),
    };

    // Notification dispatch is fire-and-forget and swallows its own failures,
    // so the double only has to exist.
    const notifications: any = { dispatch: jest.fn(() => Promise.resolve()) };

    const service = new ProcurementRequestsService(
        prisma,
        webhooks,
        mailQueue,
        numbering,
        notifications,
    );
    return {
        service,
        created,
        materialRequestUpdates,
        numbering,
        notifications,
        purchaseOrders,
        purchaseOrderUpdates,
        purchaseRequestUpdates,
        quoteUpdates,
        prisma,
    };
}

/** The quote every award test starts from. */
const quoteRow = {
    id: 'quote-1',
    prRef: 'PR-0019',
    supplierId: 'sup-1',
    supplierName: 'Dangote Cement',
    totalValue: 4_250_000,
    validUntil: null,
    items: [
        { material: 'OPC Cement', qty: 500, unit: 'bags', unitPrice: 8500 },
    ],
};

describe('creating a purchase request', () => {
    it('stores the material request it was raised from', async () => {
        const { service, created } = makeService();

        await service.createPR({
            title: 'Ikeja — MR-0007',
            requestedBy: 'Amaka Osei',
            mrRef: 'MR-0007',
            items: [],
        });

        expect(created.purchaseRequest[0].mrRef).toBe('MR-0007');
    });

    it('stores the sourcing decision and the suppliers chosen with it', async () => {
        const { service, created } = makeService();

        await service.createPR({
            title: 'Ikeja',
            requestedBy: 'Amaka Osei',
            procurementType: 'direct',
            suppliers: [{ supplier: 'CemCo', supplierId: 'sup-1', status: 'not_sent' }],
            items: [],
        });

        expect(created.purchaseRequest[0].procurementType).toBe('direct');
        expect(created.purchaseRequest[0].suppliers).toEqual([
            { supplier: 'CemCo', supplierId: 'sup-1', status: 'not_sent' },
        ]);
    });

    it('defaults to competing the request when no type is given', async () => {
        const { service, created } = makeService();

        await service.createPR({ title: 'Ikeja', requestedBy: 'Amaka Osei', items: [] });

        expect(created.purchaseRequest[0].procurementType).toBe('rfq');
        expect(created.purchaseRequest[0].suppliers).toEqual([]);
    });

    it('points the material request back at the request it became', async () => {
        const { service, materialRequestUpdates } = makeService();

        await service.createPR({
            title: 'Ikeja',
            requestedBy: 'Amaka Osei',
            mrRef: 'MR-0007',
            items: [],
        });

        expect(materialRequestUpdates).toEqual([
            { where: { reference: 'MR-0007' }, data: { prRef: 'PR-0019' } },
        ]);
    });

    it('leaves material requests alone when it was raised standalone', async () => {
        const { service, materialRequestUpdates } = makeService();

        await service.createPR({ title: 'Ikeja', requestedBy: 'Amaka Osei', items: [] });

        expect(materialRequestUpdates).toEqual([]);
    });
});

describe('creating an RFQ', () => {
    it('stores the purchase request being competed', async () => {
        const { service, created } = makeService();

        await service.createRFQ({ supplierName: 'CemCo', prRef: 'PR-0019', items: [] });

        expect(created.sentRFQ[0].prRef).toBe('PR-0019');
    });

    it('allocates its own reference rather than taking one from the caller', async () => {
        const { service, created } = makeService();

        // The UI used to pass the purchase-request reference as `rfqRef`.
        await service.createRFQ({ supplierName: 'CemCo', rfqRef: 'PR-0019', items: [] });

        expect(created.sentRFQ[0].rfqRef).toBe('RFQ-0011');
    });

    it('accepts a request with no purchase request behind it', async () => {
        const { service, created } = makeService();

        await service.createRFQ({ supplierName: 'CemCo', items: [] });

        expect(created.sentRFQ[0].prRef).toBeNull();
    });
});

describe('recording a supplier quote', () => {
    it('stores what the quote is for, so it can be compared', async () => {
        const { service, created } = makeService();

        await service.createQuote({
            supplierName: 'CemCo',
            rfqRef: 'RFQ-0011',
            prRef: 'PR-0019',
            totalValue: 250000,
            items: [],
        });

        expect(created.receivedQuote[0]).toMatchObject({
            rfqRef: 'RFQ-0011',
            prRef: 'PR-0019',
            totalValue: 250000,
        });
    });

    it('carries the delivery destination through from the quote', async () => {
        const { service, created } = makeService();

        await service.createQuote({
            supplierName: 'CemCo',
            projectName: 'Ikeja Heights',
            destinationStore: 'Ikeja Site Store',
            storeLevel: 'project',
            items: [],
        });

        expect(created.receivedQuote[0]).toMatchObject({
            projectName: 'Ikeja Heights',
            destinationStore: 'Ikeja Site Store',
            storeLevel: 'project',
        });
    });

    it('ignores fields the portal sends that are not columns here', async () => {
        const { service, created } = makeService();

        // This endpoint is service-accessible and SabiQuot posts to it, so an
        // unrecognised key must not take the whole write down with it.
        await service.createQuote({
            supplierName: 'CemCo',
            items: [],
            sabiquotSubmissionId: 'abc-123',
        });

        expect(created.receivedQuote[0]).not.toHaveProperty('sabiquotSubmissionId');
        expect(created.receivedQuote[0].supplierName).toBe('CemCo');
    });

    it('defaults a missing total to zero rather than storing NaN', async () => {
        const { service, created } = makeService();

        await service.createQuote({ supplierName: 'CemCo', items: [] });

        expect(created.receivedQuote[0].totalValue).toBe(0);
    });
});


/**
 * Approving a quote *is* raising the order.
 *
 * "Create PO" was a separate button on Received Quotes, so a quote could sit
 * approved with no order behind it — or be turned into an order without ever
 * being approved. The two lists then disagreed about what had actually been
 * bought.
 */
describe('approving a supplier quote', () => {
    it('raises the purchase order the quote won', async () => {
        const { service, purchaseOrders } = makeService();
        await service.updateQuote('quote-1', { status: 'approved' });

        expect(purchaseOrders).toHaveLength(1);
        expect(purchaseOrders[0]).toMatchObject({
            poRef: 'PO-0032',
            prRef: 'PR-0019',
            quoteRef: 'quote-1',
            supplierId: 'sup-1',
            status: 'draft',
            totalValue: 4_250_000,
        });
    });

    it('orders what was quoted, at the price that was quoted', async () => {
        const { service, purchaseOrders } = makeService();
        await service.updateQuote('quote-1', { status: 'approved' });

        expect(purchaseOrders[0].items).toEqual({
            create: [
                { material: 'OPC Cement', qty: 500, unit: 'bags', unitCost: 8500 },
            ],
        });
    });

    it('carries the material request through, so the chain stays joined end to end', async () => {
        const { service, purchaseOrders } = makeService();
        await service.updateQuote('quote-1', { status: 'approved' });

        expect(purchaseOrders[0].mrRef).toBe('MR-0007');
    });

    it('closes the losing quotes for the same request', async () => {
        // Otherwise the list keeps offering an approval for something already
        // bought — and a second click raises a second order.
        const { service, quoteUpdates } = makeService();
        await service.updateQuote('quote-1', { status: 'approved' });

        expect(quoteUpdates).toContainEqual(
            expect.objectContaining({
                where: expect.objectContaining({
                    prRef: 'PR-0019',
                    id: { not: 'quote-1' },
                    status: 'pending_review',
                }),
                data: { status: 'rejected' },
            }),
        );
    });

    it('will not raise a second order for a quote that already has one', async () => {
        const { service, prisma, purchaseOrders } = makeService();
        prisma.purchaseOrder.findFirst = jest.fn(() => Promise.resolve({ id: 'po-1' }));

        await service.updateQuote('quote-1', { status: 'approved' });
        expect(purchaseOrders).toHaveLength(0);
    });

    it('raises nothing when the supplier is not on the supplier list', async () => {
        // There is nobody to owe the money to. The quote stays approved and the
        // buyer is told to add the supplier.
        const { service, prisma, purchaseOrders } = makeService();
        prisma.supplier.findFirst = jest.fn(() => Promise.resolve(null));
        prisma.receivedQuote.update = jest.fn(({ data }: any) =>
            Promise.resolve({ ...quoteRow, supplierId: null, ...data }),
        );

        await service.updateQuote('quote-1', { status: 'approved' });
        expect(purchaseOrders).toHaveLength(0);
    });

    it('leaves the order alone when a quote is rejected', async () => {
        const { service, purchaseOrders } = makeService();
        await service.updateQuote('quote-1', { status: 'rejected' });

        expect(purchaseOrders).toHaveLength(0);
    });
});

/**
 * Finance's decision has to reach back to Procurement.
 *
 * The two modules were lists that happened to mention the same PO reference:
 * Finance could approve and pay an invoice and the order in Procurement still
 * read "Unpaid" forever, because nothing joined them.
 */
describe('recording a decision on a purchase invoice', () => {
    it('accepts the order in Procurement when Finance accepts the invoice', async () => {
        const { service, purchaseOrderUpdates } = makeService();
        await service.updateInvoice('inv-1', { status: 'accepted' });

        expect(purchaseOrderUpdates[0].data).toMatchObject({
            status: 'finance_accepted',
        });
        expect(purchaseOrderUpdates[0].data.financeDecidedAt).toBeInstanceOf(Date);
    });

    it('marks the order paid, which is what Procurement was waiting to see', async () => {
        const { service, purchaseOrderUpdates } = makeService();
        await service.updateInvoice('inv-1', { status: 'paid' });

        expect(purchaseOrderUpdates[0].data).toMatchObject({ status: 'paid' });
        expect(purchaseOrderUpdates[0].data.paidAt).toBeInstanceOf(Date);
    });

    it('sends the reason back with a decline, so the buyer knows what to fix', async () => {
        const { service, purchaseOrderUpdates } = makeService();
        await service.updateInvoice('inv-1', {
            status: 'declined',
            notes: 'Budget line exhausted',
        });

        expect(purchaseOrderUpdates[0].data).toMatchObject({
            status: 'finance_declined',
            declineReason: 'Budget line exhausted',
        });
    });

    it('finds the order by reference or by id, since older invoices stored either', async () => {
        const { service, purchaseOrderUpdates } = makeService();
        await service.updateInvoice('inv-1', { status: 'paid' });

        expect(purchaseOrderUpdates[0].where).toEqual({
            OR: [{ poRef: 'PO-0031' }, { id: 'PO-0031' }],
        });
    });

    it('refuses to cancel a paid invoice', async () => {
        // It is the record that the money left. Removing or voiding it leaves
        // the order pointing at nothing and the payment with no document.
        const { service, prisma } = makeService();
        prisma.purchaseInvoice.findUnique = jest.fn(() =>
            Promise.resolve({ id: 'inv-1', invoiceNo: 'PI-004', poRef: 'PO-0031', status: 'paid' }),
        );

        await expect(service.cancelInvoice('inv-1')).rejects.toThrow(
            /paid invoice cannot be cancelled/i,
        );
    });
});

describe('creating a purchase invoice', () => {
    it('takes its number from the configured sequence, not the clock', async () => {
        const { service, numbering, prisma } = makeService();
        await service.createInvoice({ supplierName: 'Dangote Cement' });

        expect(numbering.allocate).toHaveBeenCalledWith('PurchaseInvoice');
        expect(prisma.purchaseInvoice.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ invoiceNo: 'PI-004' }),
            }),
        );
    });
});
