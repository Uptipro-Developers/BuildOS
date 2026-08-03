import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookService } from '../integrations/webhook.service';

@Injectable()
export class PurchaseOrdersService {
    constructor(
        private prisma: PrismaService,
        private webhookService: WebhookService,
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
