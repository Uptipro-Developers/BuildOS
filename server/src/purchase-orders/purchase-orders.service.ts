import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookService } from '../integrations/webhook.service';
import { MailQueueService } from '../queue/mail-queue.service';
import { supplierPortalLink } from '../common/supplier-portal';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { NumberingService } from '../numbering/numbering.service';
import { GoodsReceiptsService } from '../goods-receipts/goods-receipts.service';

/**
 * What each status is allowed to become.
 *
 * The workflow used to be advanced by whichever button a page happened to
 * render, so an order could jump from draft to paid without finance ever seeing
 * it. The chain is stated once here and enforced on every write, which is what
 * makes the status meaningful rather than decorative.
 */
const PO_TRANSITIONS: Record<string, string[]> = {
    // `draft` is a quote-accepted order the wizard hasn't touched yet.
    // `po_created` is what "Save and Preview PO" produces — term,
    // signatories and delivery timing saved, goods receipt already open,
    // regardless of payment timing. See `createPO`.
    draft: ['po_created', 'cancelled'],
    po_created: ['sent_to_finance', 'cancelled'],
    sent_to_finance: ['finance_accepted', 'finance_declined', 'cancelled'],
    // A declined order goes back to the buyer, who fixes it and resubmits —
    // back to po_created, not draft: the wizard has already run once.
    finance_declined: ['sent_to_finance', 'po_created', 'cancelled'],
    finance_accepted: ['paid', 'cancelled'],
    paid: ['confirmation_requested', 'cancelled'],
    confirmation_requested: ['confirmed', 'cancelled'],
    confirmed: ['goods_received', 'cancelled'],
    goods_received: [],
    cancelled: [],
};

@Injectable()
export class PurchaseOrdersService {
    constructor(
        private prisma: PrismaService,
        private webhookService: WebhookService,
        private mailQueue: MailQueueService,
        private notifications: NotificationDispatchService,
        private numbering: NumberingService,
        private goodsReceipts: GoodsReceiptsService,
    ) { }

    findAll(status?: string, supplierId?: string) {
        return this.prisma.purchaseOrder.findMany({
            where: {
                ...(status ? { status: status as any } : {}),
                ...(supplierId ? { supplierId } : {}),
            },
            include: { supplier: true, items: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Callers may pass either the cuid id or the human-readable poRef — a
    // Purchase Invoice only ever carries the latter, so a plain id lookup
    // left every invoice-side "preview the PO" request 404ing.
    findOne(id: string) {
        return this.prisma.purchaseOrder.findFirstOrThrow({
            where: { OR: [{ id }, { poRef: id }] },
            include: { supplier: true, items: true },
        });
    }

    async create(data: any) {
        const { items, poRef, ...rest } = data;
        // From the PurchaseOrder sequence in Settings › Numbering. The award
        // screen allocated a reference and then dropped it because there was no
        // column to put it in, so every list showed a cuid instead.
        const reference = String(poRef ?? '').trim() ||
            (await this.numbering.allocate('PurchaseOrder')).reference;

        return this.prisma.purchaseOrder.create({
            data: {
                ...rest,
                poRef: reference,
                ...(items ? { items: { create: items } } : {}),
            },
            include: { supplier: true, items: true },
        }).then((po) => {
            this.webhookService.triggerWebhook('purchase-order.created', po).catch(() => { });
            void this.notifications.dispatch('purchase-order.created', {
                title: 'Purchase order created',
                message: `${po.poRef ?? po.id} for ${po.supplier?.name ?? 'a supplier'}`,
                actionUrl: '/apps/procurement/purchase-orders',
                relatedId: po.id,
                relatedType: 'PurchaseOrder',
                vars: {
                    reference: po.poRef ?? po.id,
                    supplier: po.supplier?.name ?? '',
                },
            });
            // No supplier email at draft stage: the order has no payment term
            // or signatories yet — that email now goes out from `createPO`,
            // once the wizard has actually finished and there's a real
            // document to send instead of a bare notice.
            return po;
        });
    }

    /**
     * Generic update. A status change goes through the transition table, so the
     * order cannot skip a stage regardless of which client asked.
     */
    async update(id: string, data: any) {
        if (data?.status) {
            const current = await this.prisma.purchaseOrder.findUnique({
                where: { id },
                select: { status: true },
            });
            if (!current) throw new NotFoundException('Purchase order not found');
            // A PATCH that restates the status it already has is a no-op, not
            // an illegal move — unlike the action endpoints below, where
            // repeating a step means doing its side effects twice.
            this.assertTransition(current.status, String(data.status), { allowSame: true });
        }
        return this.prisma.purchaseOrder.update({
            where: { id },
            data,
            include: { supplier: true, items: true },
        });
    }

    /**
     * @param allowSame treat "already there" as acceptable. Off by default:
     * `sendToFinance` on an order already at `sent_to_finance` would otherwise
     * raise a *second* invoice for the same order, which is how one purchase
     * order ends up owing a supplier twice.
     */
    private assertTransition(from: string, to: string, opts?: { allowSame?: boolean }) {
        if (from === to) {
            if (opts?.allowSame) return;
            throw new BadRequestException(
                `This purchase order is already at "${from}".`,
            );
        }
        const allowed = PO_TRANSITIONS[from] ?? [];
        if (!allowed.includes(to)) {
            throw new BadRequestException(
                `A purchase order at "${from}" cannot move to "${to}".`,
            );
        }
    }

    /**
     * Sends the order to Finance, which is what puts it on Finance › Purchase
     * Invoices.
     *
     * This was a local `setPoList` call on the Purchase Orders page: it set a
     * flag in the browser, invented a `FIN-####` reference with Math.random, and
     * nothing ever arrived in Finance. The invoice written here *is* the order
     * on the Finance side — the two are linked both ways (`financeRef` on the
     * order, `poRef` on the invoice) so a payment recorded in Finance can show up
     * back in Procurement.
     */
    async sendToFinance(id: string, actor?: string, paymentTermId?: string, deliverySplit?: string) {
        const po = await this.prisma.purchaseOrder.findUnique({
            where: { id },
            include: { supplier: true, items: true },
        });
        if (!po) throw new NotFoundException('Purchase order not found');
        this.assertTransition(po.status, 'sent_to_finance');

        const { reference: invoiceNo } = await this.numbering.allocate('PurchaseInvoice');
        const lines = po.items.map((it) => ({
            description: it.material,
            qty: it.qty,
            unit: it.unit,
            unitPrice: it.unitCost,
        }));
        const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);

        await this.prisma.purchaseInvoice.create({
            data: {
                invoiceNo,
                poRef: po.poRef ?? po.id,
                supplierName: po.supplier?.name ?? 'Unknown supplier',
                supplierId: po.supplierId,
                invoiceDate: new Date(),
                // Finance needs a due date to age the payable against; the order's
                // expected delivery date is the only one procurement has agreed.
                dueDate: po.expectedDate,
                lines,
                subtotal,
                vatTotal: 0,
                total: po.totalValue || subtotal,
                status: 'pending_review',
                notes: `Raised from purchase order ${po.poRef ?? po.id}${actor ? ` by ${actor}` : ''}.`,
            },
        });

        const updated = await this.prisma.purchaseOrder.update({
            where: { id },
            data: {
                status: 'sent_to_finance',
                sentToFinance: true,
                sentToFinanceAt: new Date(),
                financeRef: invoiceNo,
                declineReason: null,
                ...(paymentTermId ? { paymentTermId } : {}),
                ...(deliverySplit ? { deliverySplit } : {}),
            },
            include: { supplier: true, items: true },
        });

        void this.notifications.dispatch('purchase-order.sent-to-finance', {
            title: 'Purchase order sent to Finance',
            message: `${updated.poRef ?? updated.id} — ${updated.supplier?.name ?? ''} (${invoiceNo})`,
            actionUrl: '/apps/finance/purchase-invoice',
            relatedId: updated.id,
            relatedType: 'PurchaseOrder',
            vars: { reference: updated.poRef ?? updated.id, invoiceNo },
        });

        return updated;
    }

    /**
     * "Save and Preview PO" in the wizard — what actually makes a draft into
     * a real purchase order, regardless of payment timing.
     *
     * The goods receipt used to only open once a pre-delivery order reached
     * `confirmed` (Finance approved, supplier confirmed the payment landed),
     * which meant a post-delivery order needed its own separate skip-finance
     * path just to become receivable. Opening the receipt here instead, the
     * moment the order is created, means receiving staff can see what's
     * expected regardless of where the order sits in the finance chain —
     * and both payment-timing paths go through exactly one action to get here.
     */
    async createPO(
        id: string,
        data: {
            paymentTermId?: string;
            deliverySplit?: string;
            signatories?: unknown;
            paymentTermSnapshot?: unknown;
        },
    ) {
        const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
        if (!po) throw new NotFoundException('Purchase order not found');
        this.assertTransition(po.status, 'po_created');
        const updated = await this.prisma.purchaseOrder.update({
            where: { id },
            data: {
                status: 'po_created',
                ...(data.paymentTermId ? { paymentTermId: data.paymentTermId } : {}),
                ...(data.deliverySplit ? { deliverySplit: data.deliverySplit } : {}),
                ...(data.signatories !== undefined ? { signatories: data.signatories as any } : {}),
                ...(data.paymentTermSnapshot !== undefined
                    ? { paymentTermSnapshot: data.paymentTermSnapshot as any }
                    : {}),
            },
            include: { supplier: true, items: true },
        });
        await this.goodsReceipts.openForOrder(id).catch(() => undefined);
        this.emailPurchaseOrderToSupplier(updated).catch(() => undefined);
        return updated;
    }

    /**
     * Sends the finished PO to the supplier — the moment `createPO` calls
     * this, the order has a real payment term and signatories on it, unlike
     * the bare "a PO was raised" notice this replaced (which fired at draft
     * stage, before the wizard had touched the order at all).
     */
    private async emailPurchaseOrderToSupplier(po: {
        id: string;
        poRef: string | null;
        expectedDate: Date;
        totalValue: number;
        paymentTermSnapshot: unknown;
        signatories: unknown;
        supplier: { email: string | null; contactPerson: string | null; name: string } | null;
        items: { material: string; qty: number; unit: string; unitCost: number }[];
    }) {
        const supplier = po.supplier;
        if (!supplier?.email) return;
        const poRefOut = po.poRef ?? po.id;
        const company = await this.prisma.companyProfile.findUnique({ where: { id: 'singleton' } });
        const companyName = company?.name || 'BuildOS';

        const rows = po.items
            .map(
                (it) =>
                    `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:left">${it.material}</td>` +
                    `<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${it.qty.toLocaleString()} ${it.unit}</td>` +
                    `<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${it.unitCost.toLocaleString()}</td>` +
                    `<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${(it.qty * it.unitCost).toLocaleString()}</td></tr>`,
            )
            .join('');

        const snap = (po.paymentTermSnapshot ?? {}) as {
            name?: string;
            tranches?: { title: string; percent: number }[];
        };
        const termLine = snap.name
            ? `${snap.name}${snap.tranches?.length ? ' — ' + snap.tranches.map((t) => `${t.percent}% ${t.title}`).join(' + ') : ''}`
            : 'As agreed';

        const signatories = (po.signatories ?? []) as { name: string; role: string }[];
        const sigLine = signatories.length
            ? signatories.map((s) => `${s.name}${s.role ? ` (${s.role})` : ''}`).join(', ')
            : '';

        const portalUrl = supplierPortalLink('purchase-order', po.id, String(poRefOut));

        await this.mailQueue.enqueueEmail({
            to: supplier.email,
            subject: `Purchase Order ${poRefOut} from ${companyName}`,
            text: `Dear ${supplier.contactPerson || supplier.name},\n\nPlease find your Purchase Order ${poRefOut} from ${companyName} below.\n\nItems:\n${po.items.map((it) => `- ${it.material}: ${it.qty} ${it.unit} @ ${it.unitCost}`).join('\n')}\n\nTotal: ${po.totalValue.toLocaleString()}\nPayment terms: ${termLine}\nExpected delivery: ${po.expectedDate.toDateString()}\n${sigLine ? `Authorised by: ${sigLine}\n` : ''}\nView on the Supplier Portal: ${portalUrl}\n\nRef: ${poRefOut}`,
            html: `<div style="font-family:Georgia,serif;color:#111;max-width:640px">
                <p>Dear ${supplier.contactPerson || supplier.name},</p>
                <p>Please find your Purchase Order <strong>${poRefOut}</strong> from <strong>${companyName}</strong> below.</p>
                <table style="width:100%;font-size:13px;border-collapse:collapse;border:1px solid #ddd;margin:12px 0">
                    <thead><tr style="background:#f5f5f5"><th style="padding:6px 8px;text-align:left">Item</th><th style="padding:6px 8px;text-align:right">Qty</th><th style="padding:6px 8px;text-align:right">Unit Price</th><th style="padding:6px 8px;text-align:right">Amount</th></tr></thead>
                    <tbody>${rows}</tbody>
                    <tfoot><tr><td colspan="3" style="padding:8px;text-align:right;font-weight:bold">TOTAL</td><td style="padding:8px;text-align:right;font-weight:bold">${po.totalValue.toLocaleString()}</td></tr></tfoot>
                </table>
                <p style="font-size:13px"><strong>Payment terms:</strong> ${termLine}</p>
                <p style="font-size:13px"><strong>Expected delivery:</strong> ${po.expectedDate.toDateString()}</p>
                ${sigLine ? `<p style="font-size:13px"><strong>Authorised by:</strong> ${sigLine}</p>` : ''}
                <p><a href="${portalUrl}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px;">View on Supplier Portal</a></p>
                <p style="color:#6b7280;font-size:12px;">Ref: ${poRefOut}</p>
            </div>`,
        });
    }

    /** Procurement asks the supplier to confirm the payment landed. */
    async requestPaymentConfirmation(id: string) {
        const po = await this.prisma.purchaseOrder.findUnique({
            where: { id },
            include: { supplier: true },
        });
        if (!po) throw new NotFoundException('Purchase order not found');
        this.assertTransition(po.status, 'confirmation_requested');

        const updated = await this.prisma.purchaseOrder.update({
            where: { id },
            data: { status: 'confirmation_requested' },
            include: { supplier: true, items: true },
        });

        const supplier = updated.supplier;
        if (supplier?.email) {
            const ref = updated.poRef ?? updated.id;
            this.mailQueue.enqueueEmail({
                to: supplier.email,
                subject: `Payment confirmation requested — ${ref}`,
                text: `Dear ${supplier.contactPerson || supplier.name},\n\nPayment has been made against Purchase Order ${ref}. Kindly confirm receipt of the funds.\n\nRef: ${ref}`,
                html: `<p>Dear ${supplier.contactPerson || supplier.name},</p><p>Payment has been made against Purchase Order <code>${ref}</code>. Kindly confirm receipt of the funds.</p><p style="color:#6b7280;font-size:12px;">Ref: ${ref}</p>`,
            }).catch(() => { });
        }
        return updated;
    }

    /**
     * The supplier (or the buyer on their behalf) confirms the payment.
     *
     * Confirming is also what puts the order on Goods Receipt: the money has
     * moved and the delivery is the only thing left, so the receipt is opened
     * here rather than waiting for somebody to key the order in again.
     */
    async confirmPayment(id: string) {
        const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
        if (!po) throw new NotFoundException('Purchase order not found');
        this.assertTransition(po.status, 'confirmed');
        const updated = await this.prisma.purchaseOrder.update({
            where: { id },
            data: { status: 'confirmed', confirmedAt: new Date() },
            include: { supplier: true, items: true },
        });
        await this.goodsReceipts.openForOrder(id).catch(() => undefined);
        return updated;
    }

    /** Cancels the order, and the invoice raised for it if one exists. */
    async cancel(id: string, reason?: string) {
        const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
        if (!po) throw new NotFoundException('Purchase order not found');
        this.assertTransition(po.status, 'cancelled');
        if (po.financeRef) {
            await this.prisma.purchaseInvoice
                .updateMany({
                    where: { invoiceNo: po.financeRef, status: { not: 'paid' } },
                    data: { status: 'cancelled' },
                })
                .catch(() => undefined);
        }
        return this.prisma.purchaseOrder.update({
            where: { id },
            data: { status: 'cancelled', declineReason: reason ?? null },
            include: { supplier: true, items: true },
        });
    }

    remove(id: string) {
        return this.prisma.purchaseOrder.delete({ where: { id } });
    }
}
