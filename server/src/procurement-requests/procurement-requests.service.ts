import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookService } from '../integrations/webhook.service';
import { MailQueueService } from '../queue/mail-queue.service';
import { supplierPortalLink } from '../common/supplier-portal';
import { NumberingService } from '../numbering/numbering.service';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';

/**
 * A trimmed email address, or null.
 *
 * Blank is not an override — an untouched form field must fall through to the
 * supplier's filed address rather than store an empty string that later reads as
 * "send it nowhere".
 */
function normaliseEmail(raw: any): string | null {
    const s = String(raw ?? '').trim();
    return s.length > 0 ? s : null;
}

/**
 * Statuses have been written in several shapes over time ("Pending Approval",
 * "pending_approval", "Approved"), so every comparison goes through here.
 * Mirrors normaliseStatus in src/app/utils/procurementWorkflow.tsx.
 */
function normaliseStatus(raw: unknown): string {
    return String(raw ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/** Accepts ISO (YYYY-MM-DD) or DD/MM/YYYY date strings; returns a Date or null. */
function parseFlexDate(raw: any): Date | null {
    if (!raw) return null;
    const s = String(raw).trim();
    // DD/MM/YYYY
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) return new Date(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`);
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

@Injectable()
export class ProcurementRequestsService {
    constructor(
        private prisma: PrismaService,
        private webhookService: WebhookService,
        private mailQueue: MailQueueService,
        private numbering: NumberingService,
        private notifications: NotificationDispatchService,
    ) { }

    // ── Purchase Requests ──
    findAllPRs(status?: string) {
        return this.prisma.purchaseRequest.findMany({
            where: status ? { status } : {},
            orderBy: { createdAt: 'desc' },
        });
    }
    findPR(id: string) {
        return this.prisma.purchaseRequest.findUniqueOrThrow({ where: { id } });
    }
    async createPR(data: any) {
        // From the PurchaseRequest sequence in Settings > Numbering ("PR-{N:4}").
        // `PR-${Date.now()}` ignored that configuration and produced references
        // like PR-1785770844706, which match no convention and cannot be cited.
        const { reference: prRef } = await this.numbering.allocate('PurchaseRequest');
        const prData: any = {
            prRef,
            title: data.title,
            projectId: data.projectId ?? null,
            projectName: data.projectName ?? null,
            status: data.status ?? undefined,
            priority: data.priority ?? undefined,
            requestedBy: data.requestedBy,
            daysToDeliver: data.daysToDeliver != null ? Number(data.daysToDeliver) : null,
            items: Array.isArray(data.items) ? data.items : [],
            notes: data.notes ?? null,
            // The material request this was raised from, and how it is to be
            // sourced. Both were previously expressible only as prose in `notes`.
            mrRef: data.mrRef ? String(data.mrRef) : null,
            procurementType: data.procurementType === 'direct' ? 'direct' : 'rfq',
            suppliers: Array.isArray(data.suppliers) ? data.suppliers : [],
        };
        return this.prisma.purchaseRequest.create({ data: prData }).then(async (pr) => {
            this.webhookService.triggerWebhook('purchase-request.created', pr).catch(() => { });
            // Whoever the Admin › Notifications rules name for this event.
            void this.notifications.dispatch('purchase-request.created', {
                title: 'Purchase request raised',
                message: `${pr.prRef} — ${pr.title} (raised by ${pr.requestedBy})`,
                actionUrl: '/apps/procurement/purchase-requests',
                relatedId: pr.id,
                relatedType: 'PurchaseRequest',
                vars: { reference: pr.prRef, title: pr.title, requestedBy: pr.requestedBy },
            });
            // Close the loop the other way, so the material request can show what
            // became of it rather than stopping at "In Procurement".
            if (pr.mrRef) {
                await this.prisma.materialRequest
                    .updateMany({ where: { reference: pr.mrRef }, data: { prRef: pr.prRef } })
                    .catch(() => undefined);
            }
            return pr;
        });
    }
    updatePR(id: string, data: any) {
        return this.prisma.purchaseRequest.update({ where: { id }, data });
    }
    deletePR(id: string) {
        return this.prisma.purchaseRequest.delete({ where: { id } });
    }

    // ── Purchase Invoices ──
    findAllInvoices(status?: string) {
        return this.prisma.purchaseInvoice.findMany({
            where: status ? { status } : {},
            orderBy: { createdAt: 'desc' },
        });
    }
    findInvoice(id: string) {
        return this.prisma.purchaseInvoice.findUniqueOrThrow({ where: { id } });
    }
    async createInvoice(data: any) {
        // From the PurchaseInvoice sequence in Settings › Numbering ("PI-{N:3}").
        // `INV-${Date.now()}` ignored that configuration and produced references
        // like INV-1785770844706, which match no convention and cannot be cited.
        const { invoiceNo: supplied, ...rest } = data ?? {};
        const invoiceNo =
            String(supplied ?? '').trim() ||
            (await this.numbering.allocate('PurchaseInvoice')).reference;
        return this.prisma.purchaseInvoice.create({ data: { ...rest, invoiceNo } });
    }

    /**
     * Moves the invoice into the Purchase Invoices approval workflow, with the
     * accounting treatment already decided.
     *
     * The posting date/method/GL lines are chosen here, not when the invoice is
     * later posted — the approver is approving the actual journal entry this
     * will become, not just the invoice. `updateInvoice` (which moves it to
     * `approved`) does not touch this; posting reads it back unchanged.
     */
    async sendInvoiceForApproval(id: string, postingDraft: any) {
        const invoice = await this.prisma.purchaseInvoice.findUnique({ where: { id } });
        if (!invoice) throw new NotFoundException('Purchase invoice not found');
        if (normaliseStatus(invoice.status) !== 'pending_review') {
            throw new BadRequestException(
                'Only an invoice pending review can be sent for approval.',
            );
        }
        const lines = Array.isArray(postingDraft?.lines) ? postingDraft.lines : [];
        if (lines.length === 0) {
            throw new BadRequestException(
                'Posting lines are required before sending for approval.',
            );
        }
        const debit = lines.reduce((s: number, l: any) => s + Number(l?.debit || 0), 0);
        const credit = lines.reduce((s: number, l: any) => s + Number(l?.credit || 0), 0);
        if (Math.abs(debit - credit) > 0.01) {
            throw new BadRequestException(
                'Posting lines must balance (debits must equal credits) before sending for approval.',
            );
        }
        return this.prisma.purchaseInvoice.update({
            where: { id },
            data: { status: 'pending_approval', postingDraft },
        });
    }

    /**
     * Records Finance's decision, and mirrors it onto the purchase order.
     *
     * Procurement and Finance were two lists that happened to mention the same
     * PO reference: Finance could approve and pay an invoice and the order in
     * Procurement still read "Unpaid" forever, because nothing joined them. The
     * invoice carries `poRef`, so a decision here moves the order too — which is
     * what makes "Paid in Finance shows as Paid on the PO" true rather than
     * something a user has to keep in their head.
     */
    async updateInvoice(id: string, data: any) {
        const invoice = await this.prisma.purchaseInvoice.update({ where: { id }, data });
        const status = normaliseStatus(data?.status);

        const poStatus =
            status === 'approved'
                ? 'finance_accepted'
                : status === 'rejected'
                    ? 'finance_declined'
                    : status === 'paid'
                        ? 'paid'
                        : null;

        if (poStatus && invoice.poRef) {
            const now = new Date();
            await this.prisma.purchaseOrder
                .updateMany({
                    where: { OR: [{ poRef: invoice.poRef }, { id: invoice.poRef }] },
                    data: {
                        status: poStatus as any,
                        ...(status === 'paid'
                            ? { paidAt: now }
                            : { financeDecidedAt: now }),
                        ...(status === 'rejected'
                            ? { declineReason: data?.notes ?? 'Declined by Finance.' }
                            : {}),
                    },
                })
                .catch(() => undefined);

            void this.notifications.dispatch(`purchase-invoice.${status}`, {
                title: `Purchase invoice ${status}`,
                message: `${invoice.invoiceNo} — ${invoice.supplierName} (PO ${invoice.poRef})`,
                actionUrl: '/apps/procurement/purchase-orders',
                relatedId: invoice.id,
                relatedType: 'PurchaseInvoice',
                vars: { reference: invoice.invoiceNo, poRef: invoice.poRef },
            });
        }

        return invoice;
    }

    /**
     * Cancels an invoice rather than deleting it.
     *
     * Purchase Invoices offered Delete as the action on a *paid* invoice, which
     * is the one row that must not disappear: it is the record that the money
     * left. A cancellation keeps the history and releases the order back to
     * procurement.
     */
    async cancelInvoice(id: string, reason?: string) {
        const invoice = await this.prisma.purchaseInvoice.findUnique({ where: { id } });
        if (!invoice) throw new NotFoundException('Purchase invoice not found');
        if (normaliseStatus(invoice.status) === 'paid') {
            throw new BadRequestException(
                'A paid invoice cannot be cancelled. Reverse the payment first.',
            );
        }
        const updated = await this.prisma.purchaseInvoice.update({
            where: { id },
            data: {
                status: 'cancelled',
                notes: reason ? `${invoice.notes ?? ''}\nCancelled: ${reason}`.trim() : invoice.notes,
            },
        });
        if (invoice.poRef) {
            await this.prisma.purchaseOrder
                .updateMany({
                    where: {
                        OR: [{ poRef: invoice.poRef }, { id: invoice.poRef }],
                        status: { in: ['sent_to_finance', 'finance_accepted'] },
                    },
                    data: {
                        status: 'finance_declined',
                        declineReason: reason ?? 'Invoice cancelled in Finance.',
                        financeDecidedAt: new Date(),
                    },
                })
                .catch(() => undefined);
        }
        return updated;
    }

    deleteInvoice(id: string) {
        return this.prisma.purchaseInvoice.delete({ where: { id } });
    }

    // ── Sent RFQs ──
    findAllRFQs(status?: string) {
        return this.prisma.sentRFQ.findMany({
            where: status ? { status } : {},
            orderBy: { sentDate: 'desc' },
        });
    }
    findRFQ(id: string) {
        // Callers may pass either the cuid id or the human-readable rfqRef.
        return this.prisma.sentRFQ.findFirstOrThrow({
            where: { OR: [{ id }, { rfqRef: id }] },
        });
    }
    async createRFQ(data: any) {
        // From the RFQ sequence in Settings > Numbering ("RFQ-{N:4}").
        const { reference: rfqRef } = await this.numbering.allocate('RFQ');
        const rfqData: any = {
            supplierName: data.supplierName,
            supplierId: data.supplierId ?? null,
            status: data.status ?? 'Sent',
            items: Array.isArray(data.items) ? data.items : [],
            notes: data.notes ?? null,
            // The purchase request being competed. This whitelist previously
            // omitted it, so the reference the UI collected was silently dropped
            // and every RFQ came back detached from its request.
            prRef: data.prRef ? String(data.prRef) : null,
            // The address to send to, when the raiser overrode the supplier's
            // filed one. Nothing stored this before, so the form's "Vendor Email"
            // box was collected and thrown away.
            contactEmail: normaliseEmail(data.contactEmail),
            rfqRef,
            sentDate: parseFlexDate(data.sentDate) ?? new Date(),
            expiryDate: parseFlexDate(data.expiryDate) ?? null,
        };
        return this.prisma.sentRFQ.create({ data: rfqData }).then(async (rfq) => {
            this.webhookService.triggerWebhook('rfq.sent', rfq).catch(() => { });
            void this.notifications.dispatch('rfq.sent', {
                title: 'RFQ sent',
                message: `${rfq.rfqRef} sent to ${rfq.supplierName}`,
                actionUrl: '/apps/procurement/sent-requests',
                relatedId: rfq.id,
                relatedType: 'SentRFQ',
                vars: { reference: rfq.rfqRef, supplier: rfq.supplierName },
            });

            const supplier = data.supplierId
                ? await this.prisma.supplier.findUnique({ where: { id: data.supplierId } }).catch(() => null)
                : null;
            // An explicit address wins over the supplier's filed one — that is
            // the whole point of letting it be edited. Sending is no longer
            // conditional on `supplierId`: an RFQ addressed by hand still has
            // somewhere to go.
            const recipient = rfqData.contactEmail ?? supplier?.email ?? null;

            if (recipient) {
                const greetingName = supplier?.contactPerson || supplier?.name || rfq.supplierName;
                const portalUrl = supplierPortalLink('rfq', rfq.id, String(rfqRef));
                this.mailQueue.enqueueEmail({
                    to: recipient,
                    subject: `New RFQ from BuildOS — ${rfqRef}`,
                    text: `Dear ${greetingName},\n\nYou have received a new Request for Quotation (${rfqRef}) from BuildOS.\n\nReview it here: ${portalUrl}\n\nRef: ${rfqRef}`,
                    html: `<p>Dear ${greetingName},</p><p>You have received a new <strong>Request for Quotation</strong> (<code>${rfqRef}</code>) from BuildOS.</p><p><a href="${portalUrl}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px;">View on Supplier Portal</a></p><p style="color:#6b7280;font-size:12px;">Ref: ${rfqRef}</p>`,
                }).catch(() => { });
            }
            return rfq;
        });
    }
    updateRFQ(id: string, data: any) {
        return this.prisma.sentRFQ.update({ where: { id }, data });
    }
    deleteRFQ(id: string) {
        return this.prisma.sentRFQ.delete({ where: { id } });
    }

    // ── Received Quotes ──
    findAllQuotes(status?: string) {
        return this.prisma.receivedQuote.findMany({
            where: status ? { status } : {},
            orderBy: { receivedDate: 'desc' },
        });
    }
    findQuote(id: string) {
        return this.prisma.receivedQuote.findUniqueOrThrow({ where: { id } });
    }
    /**
     * Records a supplier's quote.
     *
     * Whitelisted rather than spread straight into Prisma: this is one of the
     * service-key endpoints the SabiQuot portal posts to, and an unrecognised
     * field in that payload would otherwise fail the whole write.
     */
    createQuote(data: any) {
        return this.prisma.receivedQuote.create({
            data: {
                rfqRef: data.rfqRef ? String(data.rfqRef) : null,
                // What the quote is for. Quote comparison groups on this.
                prRef: data.prRef ? String(data.prRef) : null,
                supplierName: data.supplierName,
                supplierId: data.supplierId ?? null,
                status: data.status ?? 'Received',
                items: Array.isArray(data.items) ? data.items : [],
                receivedDate: parseFlexDate(data.receivedDate) ?? new Date(),
                validUntil: parseFlexDate(data.validUntil) ?? null,
                totalValue: Number(data.totalValue) || 0,
                notes: data.notes ?? null,
                projectName: data.projectName ?? null,
                destinationStore: data.destinationStore ?? null,
                storeLevel: data.storeLevel ?? null,
            },
        });
    }
    async updateQuote(id: string, data: any) {
        const quote = await this.prisma.receivedQuote.update({ where: { id }, data });

        // Approving a quote *is* raising the order. "Create PO" was a separate
        // button on Received Quotes, so a quote could sit approved with no order
        // behind it and the two lists disagreed about what had been bought.
        if (normaliseStatus(data?.status) === 'approved') {
            await this.raisePurchaseOrderFromQuote(quote).catch(() => undefined);
            return this.prisma.receivedQuote.findUniqueOrThrow({ where: { id } });
        }
        // Mirror a buyer counter-offer to the supplier's portal. Only the negotiate
        // action sends items carrying negotiation rounds; status-only updates don't.
        const rounds = Array.isArray(data.items)
            ? data.items.flatMap((it: any) =>
                Array.isArray(it?.negotiations) ? it.negotiations : [],
            )
            : [];
        if (rounds.length) {
            const latest = rounds[rounds.length - 1];
            this.webhookService
                .triggerWebhook('quote.negotiated', {
                    id: quote.id,
                    supplierId: quote.supplierId,
                    supplierName: quote.supplierName,
                    proposedAmount: Number(latest?.proposedAmount) || 0,
                    comment: latest?.comment ?? null,
                    round: latest?.round ?? rounds.length,
                })
                .catch(() => { });
        }
        return quote;
    }
    deleteQuote(id: string) {
        return this.prisma.receivedQuote.delete({ where: { id } });
    }

    /**
     * Raises the purchase order an approved quote has won.
     *
     * Written against Prisma rather than through PurchaseOrdersService on
     * purpose: that service is where "send this order to Finance" lives, and
     * Finance's invoice updates come back through *this* service, so injecting
     * one into the other would close a cycle. A quote-derived order also should
     * not email the supplier yet — it has to clear Finance first — which is the
     * other half of why it does not reuse the create path.
     *
     * Idempotent: a quote already carrying an order is left alone, so a repeated
     * approve cannot raise the same order twice.
     */
    private async raisePurchaseOrderFromQuote(quote: {
        id: string;
        prRef: string | null;
        supplierId: string | null;
        supplierName: string;
        items: any;
        totalValue: number;
        validUntil: Date | null;
    }) {
        const existing = await this.prisma.purchaseOrder.findFirst({
            where: { quoteRef: quote.id },
            select: { id: true },
        });
        if (existing) return existing;

        // An order needs a supplier row: the price is owed to somebody specific.
        // A quote recorded against a name that is not in the supplier list has
        // nowhere to send the money, so the quote stays approved and the buyer is
        // told to add the supplier.
        const supplierId =
            quote.supplierId ??
            (
                await this.prisma.supplier.findFirst({
                    where: { name: { equals: quote.supplierName, mode: 'insensitive' } },
                    select: { id: true },
                })
            )?.id;
        if (!supplierId) {
            throw new BadRequestException(
                `${quote.supplierName} is not in the supplier list, so an order cannot be raised against them.`,
            );
        }

        // Delivery is due when the request that started this asked for it; the
        // quote's validity, then a fortnight, are the fallbacks.
        const pr = quote.prRef
            ? await this.prisma.purchaseRequest.findUnique({ where: { prRef: quote.prRef } })
            : null;
        const days = pr?.daysToDeliver ?? null;
        const expectedDate =
            days != null
                ? new Date(Date.now() + days * 86_400_000)
                : (quote.validUntil ?? new Date(Date.now() + 14 * 86_400_000));

        const items = (Array.isArray(quote.items) ? quote.items : []).map((it: any) => ({
            material: String(it?.material ?? it?.description ?? ''),
            qty: Number(it?.qty) || 0,
            unit: String(it?.unit ?? 'Units'),
            unitCost: Number(it?.unitPrice ?? it?.unitCost) || 0,
        }));

        const { reference: poRef } = await this.numbering.allocate('PurchaseOrder');
        const po = await this.prisma.purchaseOrder.create({
            data: {
                poRef,
                prRef: quote.prRef,
                mrRef: pr?.mrRef ?? null,
                quoteRef: quote.id,
                supplierId,
                status: 'draft',
                createdBy: 'System',
                expectedDate,
                totalValue: Number(quote.totalValue) || 0,
                items: { create: items },
            },
            include: { supplier: true, items: true },
        });

        // Both ends of the award are recorded: the quote is spent, and the
        // request it was competed for now has an order against it.
        await this.prisma.receivedQuote.update({
            where: { id: quote.id },
            data: { status: 'po_created' },
        });
        if (quote.prRef) {
            await this.prisma.purchaseRequest
                .updateMany({ where: { prRef: quote.prRef }, data: { status: 'po_created' } })
                .catch(() => undefined);
            // Losing quotes for the same request are closed out, so the list does
            // not keep offering an approval for something already bought.
            await this.prisma.receivedQuote
                .updateMany({
                    where: { prRef: quote.prRef, id: { not: quote.id }, status: 'pending_review' },
                    data: { status: 'rejected' },
                })
                .catch(() => undefined);
        }

        this.webhookService.triggerWebhook('purchase-order.created', po).catch(() => { });
        void this.notifications.dispatch('purchase-order.created', {
            title: 'Purchase order raised from approved quote',
            message: `${poRef} — ${po.supplier?.name ?? quote.supplierName}`,
            actionUrl: '/apps/procurement/purchase-orders',
            relatedId: po.id,
            relatedType: 'PurchaseOrder',
            vars: { reference: poRef, supplier: po.supplier?.name ?? quote.supplierName },
        });
        return po;
    }
}
