import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookService } from '../integrations/webhook.service';
import { MailQueueService } from '../queue/mail-queue.service';

@Injectable()
export class PurchaseOrdersService {
    constructor(
        private prisma: PrismaService,
        private webhookService: WebhookService,
        private mailQueue: MailQueueService,
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

    findOne(id: string) {
        return this.prisma.purchaseOrder.findUniqueOrThrow({
            where: { id },
            include: { supplier: true, items: true },
        });
    }

    create(data: any) {
        const { items, ...rest } = data;
        return this.prisma.purchaseOrder.create({
            data: {
                ...rest,
                ...(items ? { items: { create: items } } : {}),
            },
            include: { supplier: true, items: true },
        }).then((po) => {
            this.webhookService.triggerWebhook('purchase-order.created', po).catch(() => {});
            // Email the supplier directly — independent of webhook and SabiQuot.
            const supplier = po.supplier;
            if (supplier?.email) {
                const poRef = (po as any).poRef || po.id;
                this.mailQueue.enqueueEmail({
                    to: supplier.email,
                    subject: `New Purchase Order from BuildOS — ${poRef}`,
                    text: `Dear ${supplier.contactPerson || supplier.name},\n\nA new Purchase Order (${poRef}) has been raised for your company on BuildOS.\n\nPlease log in to the supplier portal or contact the procurement team to review the order.\n\nRef: ${poRef}`,
                    html: `<p>Dear ${supplier.contactPerson || supplier.name},</p><p>A new <strong>Purchase Order</strong> (<code>${poRef}</code>) has been raised for your company on BuildOS.</p><p>Please log in to the supplier portal or contact the procurement team to review the order.</p><p style="color:#6b7280;font-size:12px;">Ref: ${poRef}</p>`,
                }).catch(() => {});
            }
            return po;
        });
    }

    update(id: string, data: any) {
        return this.prisma.purchaseOrder.update({
            where: { id },
            data,
            include: { supplier: true, items: true },
        });
    }

    remove(id: string) {
        return this.prisma.purchaseOrder.delete({ where: { id } });
    }
}
