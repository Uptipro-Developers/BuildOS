import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookService } from '../integrations/webhook.service';
import { MailQueueService } from '../queue/mail-queue.service';
import { supplierPortalLink } from '../common/supplier-portal';
import { NumberingService } from '../numbering/numbering.service';

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
    ) {}

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
            this.webhookService.triggerWebhook('purchase-request.created', pr).catch(() => {});
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
    createInvoice(data: any) {
        const invoiceNo = `INV-${Date.now()}`;
        return this.prisma.purchaseInvoice.create({ data: { ...data, invoiceNo } });
    }
    updateInvoice(id: string, data: any) {
        return this.prisma.purchaseInvoice.update({ where: { id }, data });
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
            this.webhookService.triggerWebhook('rfq.sent', rfq).catch(() => {});

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
                }).catch(() => {});
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
                .catch(() => {});
        }
        return quote;
    }
    deleteQuote(id: string) {
        return this.prisma.receivedQuote.delete({ where: { id } });
    }
}
