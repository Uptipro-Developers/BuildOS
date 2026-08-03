import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookService } from '../integrations/webhook.service';
import { MailQueueService } from '../queue/mail-queue.service';

@Injectable()
export class ProcurementRequestsService {
    constructor(
        private prisma: PrismaService,
        private webhookService: WebhookService,
        private mailQueue: MailQueueService,
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
    createPR(data: any) {
        const prRef = `PR-${Date.now()}`;
        return this.prisma.purchaseRequest.create({ data: { ...data, prRef } }).then((pr) => {
            this.webhookService.triggerWebhook('purchase-request.created', pr).catch(() => {});
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
        return this.prisma.sentRFQ.findUniqueOrThrow({ where: { id } });
    }
    createRFQ(data: any) {
        const rfqRef = `RFQ-${Date.now()}`;
        return this.prisma.sentRFQ.create({ data: { ...data, rfqRef } }).then(async (rfq) => {
            this.webhookService.triggerWebhook('rfq.sent', rfq).catch(() => {});
            // Email the supplier directly so they are notified even without a
            // webhook or SabiQuot account.
            if (data.supplierId) {
                const supplier = await this.prisma.supplier.findUnique({ where: { id: data.supplierId } }).catch(() => null);
                if (supplier?.email) {
                    this.mailQueue.enqueueEmail({
                        to: supplier.email,
                        subject: `New RFQ from BuildOS — ${rfqRef}`,
                        text: `Dear ${supplier.contactPerson || supplier.name},\n\nYou have received a new Request for Quotation (${rfqRef}) from BuildOS.\n\nPlease log in to the supplier portal or contact the procurement team to review and respond.\n\nRef: ${rfqRef}`,
                        html: `<p>Dear ${supplier.contactPerson || supplier.name},</p><p>You have received a new <strong>Request for Quotation</strong> (<code>${rfqRef}</code>) from BuildOS.</p><p>Please log in to the supplier portal or contact the procurement team to review and respond.</p><p style="color:#6b7280;font-size:12px;">Ref: ${rfqRef}</p>`,
                    }).catch(() => {});
                }
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
    createQuote(data: any) {
        return this.prisma.receivedQuote.create({ data });
    }
    updateQuote(id: string, data: any) {
        return this.prisma.receivedQuote.update({ where: { id }, data });
    }
    deleteQuote(id: string) {
        return this.prisma.receivedQuote.delete({ where: { id } });
    }
}
