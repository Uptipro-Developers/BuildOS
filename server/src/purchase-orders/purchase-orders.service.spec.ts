import { BadRequestException } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';

/**
 * The purchase order's workflow.
 *
 * Every step here used to be a `setState` call on the Purchase Orders page: the
 * order advanced in the browser, no request was made, a refresh undid it, and
 * "Send to Finance" invented a `FIN-####` reference with Math.random that
 * Finance had never heard of. Two things matter now and are asserted below —
 * that a step cannot be taken out of order, and that sending to Finance writes
 * the invoice that *is* the order on the Finance side, linked both ways.
 */

function makeService(po: any = {}) {
    const order = {
        id: 'po-1',
        poRef: 'PO-0031',
        status: 'draft',
        supplierId: 'sup-1',
        supplier: { id: 'sup-1', name: 'Dangote Cement', email: 'sales@dangote.ng' },
        items: [
            { material: 'OPC Cement', qty: 500, unit: 'bags', unitCost: 8500, received: 0 },
        ],
        totalValue: 4_250_000,
        expectedDate: new Date('2026-09-01'),
        ...po,
    };

    const updates: any[] = [];
    const invoices: any[] = [];

    const prisma: any = {
        purchaseOrder: {
            findUnique: jest.fn(() => Promise.resolve(order)),
            update: jest.fn(({ data }: any) => {
                updates.push(data);
                return Promise.resolve({ ...order, ...data });
            }),
            create: jest.fn(({ data }: any) => Promise.resolve({ ...data, id: 'po-new', supplier: order.supplier, items: [] })),
        },
        purchaseInvoice: {
            create: jest.fn(({ data }: any) => {
                invoices.push(data);
                return Promise.resolve({ id: 'inv-1', ...data });
            }),
            updateMany: jest.fn(() => Promise.resolve({ count: 1 })),
        },
    };

    const webhooks: any = { triggerWebhook: jest.fn(() => Promise.resolve()) };
    const mailQueue: any = { enqueueEmail: jest.fn(() => Promise.resolve()) };
    const notifications: any = { dispatch: jest.fn(() => Promise.resolve()) };
    const numbering: any = {
        allocate: jest.fn((seq: string) =>
            Promise.resolve({ reference: seq === 'PurchaseInvoice' ? 'PI-004' : 'PO-0032' }),
        ),
    };
    const goodsReceipts: any = { openForOrder: jest.fn(() => Promise.resolve({ id: 'grn-1' })) };

    const service = new PurchaseOrdersService(
        prisma,
        webhooks,
        mailQueue,
        notifications,
        numbering,
        goodsReceipts,
    );
    return { service, prisma, updates, invoices, numbering, goodsReceipts, mailQueue };
}

describe('sending a purchase order to Finance', () => {
    it('raises the invoice that puts it on Finance › Purchase Invoices', async () => {
        const { service, invoices } = makeService();
        await service.sendToFinance('po-1', 'Musa Ibrahim');

        expect(invoices).toHaveLength(1);
        expect(invoices[0]).toMatchObject({
            invoiceNo: 'PI-004',
            poRef: 'PO-0031',
            supplierName: 'Dangote Cement',
            status: 'pending_review',
        });
    });

    it('takes the invoice number from the configured sequence, not Math.random', async () => {
        const { service, numbering, updates } = makeService();
        await service.sendToFinance('po-1');

        expect(numbering.allocate).toHaveBeenCalledWith('PurchaseInvoice');
        expect(updates[0].financeRef).toBe('PI-004');
    });

    it('links the order to the invoice so a payment can come back the other way', async () => {
        const { service, updates, invoices } = makeService();
        await service.sendToFinance('po-1');

        // Both directions: financeRef on the order, poRef on the invoice.
        expect(updates[0]).toMatchObject({
            status: 'sent_to_finance',
            sentToFinance: true,
            financeRef: 'PI-004',
        });
        expect(invoices[0].poRef).toBe('PO-0031');
    });

    it('bills the lines that were ordered, at the price that was agreed', async () => {
        const { service, invoices } = makeService();
        await service.sendToFinance('po-1');

        expect(invoices[0].lines).toEqual([
            { description: 'OPC Cement', qty: 500, unit: 'bags', unitPrice: 8500 },
        ]);
        expect(invoices[0].subtotal).toBe(4_250_000);
    });

    it('clears an earlier decline, so a resubmission is not still marked declined', async () => {
        const { service, updates } = makeService({
            status: 'finance_declined',
            declineReason: 'Budget line exhausted',
        });
        await service.sendToFinance('po-1');

        expect(updates[0].declineReason).toBeNull();
    });

    it('refuses an order that is already with Finance', async () => {
        const { service, invoices } = makeService({ status: 'sent_to_finance' });
        await expect(service.sendToFinance('po-1')).rejects.toBeInstanceOf(
            BadRequestException,
        );
        // Nothing half-done: no second invoice for the same order.
        expect(invoices).toHaveLength(0);
    });
});

describe('the rest of the chain', () => {
    it('refuses to skip Finance entirely', async () => {
        // A draft cannot be declared paid. The old page offered "Mark as Paid"
        // to Procurement, which let it.
        const { service } = makeService({ status: 'draft' });
        await expect(service.update('po-1', { status: 'paid' })).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });

    it('will not request confirmation for a payment that has not been made', async () => {
        const { service } = makeService({ status: 'finance_accepted' });
        await expect(
            service.requestPaymentConfirmation('po-1'),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('asks the supplier to confirm once the payment has gone', async () => {
        const { service, updates, mailQueue } = makeService({ status: 'paid' });
        await service.requestPaymentConfirmation('po-1');

        expect(updates[0]).toMatchObject({ status: 'confirmation_requested' });
        expect(mailQueue.enqueueEmail).toHaveBeenCalledWith(
            expect.objectContaining({ to: 'sales@dangote.ng' }),
        );
    });

    it('opens the goods receipt when the payment is confirmed', async () => {
        // Confirming is what puts the order on Goods Receipt — nobody should
        // have to key the order in again to receive it.
        const { service, goodsReceipts, updates } = makeService({
            status: 'confirmation_requested',
        });
        await service.confirmPayment('po-1');

        expect(updates[0].status).toBe('confirmed');
        expect(goodsReceipts.openForOrder).toHaveBeenCalledWith('po-1');
    });

    it('cancels the unpaid invoice along with the order', async () => {
        const { service, prisma } = makeService({
            status: 'sent_to_finance',
            financeRef: 'PI-004',
        });
        await service.cancel('po-1', 'Duplicate order');

        expect(prisma.purchaseInvoice.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { invoiceNo: 'PI-004', status: { not: 'paid' } },
                data: { status: 'cancelled' },
            }),
        );
    });
});

describe('creating a purchase order', () => {
    it('allocates its own reference rather than displaying a cuid', async () => {
        const { service, numbering, prisma } = makeService();
        await service.create({
            supplierId: 'sup-1',
            createdBy: 'Musa Ibrahim',
            expectedDate: new Date('2026-09-01'),
            totalValue: 100,
            items: [],
        });

        expect(numbering.allocate).toHaveBeenCalledWith('PurchaseOrder');
        expect(prisma.purchaseOrder.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ poRef: 'PO-0032' }),
            }),
        );
    });
});
