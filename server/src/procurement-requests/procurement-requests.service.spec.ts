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

    const prisma: any = {
        purchaseRequest: record('purchaseRequest'),
        sentRFQ: record('sentRFQ'),
        receivedQuote: record('receivedQuote'),
        materialRequest: {
            updateMany: jest.fn((args: any) => {
                materialRequestUpdates.push(args);
                return Promise.resolve({ count: 1 });
            }),
        },
        supplier: { findUnique: jest.fn(() => Promise.resolve(null)) },
    };

    const webhooks: any = { triggerWebhook: jest.fn(() => Promise.resolve()) };
    const mailQueue: any = { enqueueEmail: jest.fn(() => Promise.resolve()) };
    const numbering: any = {
        allocate: jest.fn((seq: string) =>
            Promise.resolve({ reference: seq === 'RFQ' ? 'RFQ-0011' : 'PR-0019' }),
        ),
    };

    const service = new ProcurementRequestsService(prisma, webhooks, mailQueue, numbering);
    return { service, created, materialRequestUpdates, numbering };
}

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
