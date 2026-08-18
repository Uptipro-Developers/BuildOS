import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NumberingService } from '../numbering/numbering.service';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';

interface ReceiveLine {
    material: string;
    unit?: string;
    ordered?: number;
    received?: number;
    accepted?: number;
    rejected?: number;
    reason?: string;
}

@Injectable()
export class GoodsReceiptsService {
    constructor(
        private prisma: PrismaService,
        private numbering: NumberingService,
        private notifications: NotificationDispatchService,
    ) { }

    findAll(status?: string) {
        return this.prisma.goodsReceipt.findMany({
            where: status ? { status } : {},
            include: { items: true },
            orderBy: { receivedDate: 'desc' },
        });
    }

    findOne(id: string) {
        return this.prisma.goodsReceipt.findUniqueOrThrow({
            where: { id },
            include: { items: true, purchaseOrder: { include: { supplier: true } } },
        });
    }

    /**
     * Opens a goods receipt for a confirmed purchase order.
     *
     * Called automatically when an order reaches `confirmed` — the goods are
     * paid for and on their way, so the receipt is the next thing anybody needs
     * and nobody should have to key the order in again by hand. Idempotent, so a
     * re-confirm cannot open a second receipt for the same order.
     */
    async openForOrder(purchaseOrderId: string) {
        const existing = await this.prisma.goodsReceipt.findFirst({
            where: { purchaseOrderId, status: 'pending' },
            include: { items: true },
        });
        if (existing) return existing;

        const po = await this.prisma.purchaseOrder.findUnique({
            where: { id: purchaseOrderId },
            include: { supplier: true, items: true },
        });
        if (!po) throw new NotFoundException('Purchase order not found');

        const { reference } = await this.numbering.allocate('GoodsReceipt');
        const grn = await this.prisma.goodsReceipt.create({
            data: {
                reference,
                purchaseOrderId: po.id,
                poRef: po.poRef ?? po.id,
                mrRef: po.mrRef,
                supplierName: po.supplier?.name ?? 'Unknown supplier',
                storeName: '',
                receivedBy: '',
                status: 'pending',
                items: {
                    create: po.items.map((it) => ({
                        material: it.material,
                        unit: it.unit,
                        ordered: it.qty,
                        // Quantities are recorded when the delivery is actually
                        // inspected; opening the receipt only says what is due.
                        received: 0,
                        accepted: 0,
                        rejected: 0,
                    })),
                },
            },
            include: { items: true },
        });

        void this.notifications.dispatch('goods-receipt.opened', {
            title: 'Delivery due',
            message: `${reference} — ${grn.supplierName} against ${grn.poRef}`,
            actionUrl: '/apps/procurement/goods-receipt',
            relatedId: grn.id,
            relatedType: 'GoodsReceipt',
            vars: { reference, poRef: grn.poRef ?? '' },
        });
        return grn;
    }

    /**
     * Records what arrived and posts it to stock.
     *
     * This is the step the module never had. "Accept & Update Stock" set a
     * status in React state: no goods receipt was stored, no stock movement was
     * written, no material quantity changed, and the storefront never saw the
     * delivery. Everything below happens in one transaction, because a receipt
     * that updated the store but not the material catalogue would leave two
     * answers to "how much do we have".
     */
    async receive(
        id: string,
        body: {
            storeId?: string;
            storeName?: string;
            deliveryNote?: string;
            receivedBy?: string;
            notes?: string;
            items?: ReceiveLine[];
        },
    ) {
        const grn = await this.prisma.goodsReceipt.findUnique({
            where: { id },
            include: { items: true, purchaseOrder: { include: { supplier: true } } },
        });
        if (!grn) throw new NotFoundException('Goods receipt not found');
        if (grn.stockPostedAt) {
            throw new BadRequestException(
                `${grn.reference} has already been received into stock.`,
            );
        }

        const storeName = String(body.storeName ?? grn.storeName ?? '').trim();
        if (!storeName) {
            throw new BadRequestException(
                'Choose the store the goods were received into — stock has to land somewhere.',
            );
        }

        // Quantities keyed on the form win; anything not sent keeps what the
        // order said was due.
        const byMaterial = new Map<string, ReceiveLine>();
        for (const line of body.items ?? []) {
            byMaterial.set(String(line.material ?? '').trim().toLowerCase(), line);
        }
        const lines = grn.items.map((it) => {
            const sent = byMaterial.get(it.material.trim().toLowerCase());
            const received = Number(sent?.received ?? it.received) || 0;
            const rejected = Number(sent?.rejected ?? it.rejected) || 0;
            // Accepted defaults to everything that was not rejected, which is the
            // normal case and saves keying the same number twice.
            const accepted = Number(sent?.accepted ?? Math.max(received - rejected, 0)) || 0;
            return {
                id: it.id,
                material: it.material,
                unit: sent?.unit ?? it.unit,
                ordered: Number(sent?.ordered ?? it.ordered) || 0,
                received,
                accepted,
                rejected,
                reason: sent?.reason ?? it.reason ?? null,
            };
        });

        if (lines.every((l) => l.received <= 0)) {
            throw new BadRequestException('Record at least one received quantity.');
        }
        for (const l of lines) {
            if (l.accepted + l.rejected > l.received) {
                throw new BadRequestException(
                    `${l.material}: accepted plus rejected (${l.accepted + l.rejected}) is more than the ${l.received} received.`,
                );
            }
        }

        const now = new Date();
        const receivedBy = String(body.receivedBy ?? grn.receivedBy ?? '').trim() || 'Unknown';
        const store = body.storeId
            ? await this.prisma.store.findUnique({ where: { id: body.storeId } })
            : await this.prisma.store.findFirst({ where: { name: storeName } });
        const projectName = store?.projectName ?? null;
        const projectId = store?.projectId ?? null;

        /**
         * Post-delivery terms send nothing to Finance at PO approval — there's
         * nothing to invoice until the goods actually arrive. A pre-delivery
         * order already raised its invoice back in the wizard (`sendToFinance`),
         * so this only fires once, on the receipt that completes the order.
         */
        const fullyReceived = lines.every((l) => l.received >= l.ordered);
        const po = grn.purchaseOrder;
        const shouldRaiseInvoice =
            fullyReceived && po?.deliverySplit === 'post_delivery' && !po?.sentToFinance;
        const invoiceNo = shouldRaiseInvoice
            ? (await this.numbering.allocate('PurchaseInvoice')).reference
            : null;

        const result = await this.prisma.$transaction(async (tx) => {
            for (const line of lines) {
                await tx.goodsReceiptItem.update({
                    where: { id: line.id },
                    data: {
                        unit: line.unit,
                        ordered: line.ordered,
                        received: line.received,
                        accepted: line.accepted,
                        rejected: line.rejected,
                        reason: line.reason,
                    },
                });

                // Only accepted goods become stock. Rejected quantities are
                // recorded on the receipt and go back to the supplier; adding
                // them to inventory is how a store ends up holding material it
                // has already sent away.
                if (line.accepted <= 0) continue;

                const unitCost = await this.unitCostFor(tx, grn.purchaseOrderId, line.material);

                await tx.stockMovement.create({
                    data: {
                        type: 'incoming',
                        materialName: line.material,
                        unit: line.unit,
                        qty: line.accepted,
                        storeName,
                        storeId: store?.id ?? body.storeId ?? null,
                        // The receipt and the order it came from, so a movement
                        // can always be traced back to what bought it.
                        reference: `${grn.reference} · ${grn.poRef ?? ''}`.trim(),
                        projectName,
                        projectId,
                        date: now,
                        createdBy: receivedBy,
                        notes: [
                            `Goods receipt ${grn.reference} from ${grn.supplierName}`,
                            body.deliveryNote ? `Delivery note ${body.deliveryNote}` : null,
                            line.rejected > 0
                                ? `${line.rejected} ${line.unit} rejected${line.reason ? ` — ${line.reason}` : ''}`
                                : null,
                            body.notes || null,
                        ]
                            .filter(Boolean)
                            .join('. '),
                    },
                });

                await this.postToStore(tx, {
                    storeId: store?.id ?? body.storeId ?? null,
                    material: line.material,
                    unit: line.unit,
                    qty: line.accepted,
                    unitCost,
                    at: now,
                });

                await this.postToCatalogue(tx, {
                    material: line.material,
                    unit: line.unit,
                    qty: line.accepted,
                    unitCost,
                });
            }

            const receivedValue = await this.receivedValue(tx, grn.purchaseOrderId);

            if (shouldRaiseInvoice && invoiceNo) {
                const invoiceLines = await tx.pOItem.findMany({ where: { purchaseOrderId: grn.purchaseOrderId } });
                await tx.purchaseInvoice.create({
                    data: {
                        invoiceNo,
                        poRef: po!.poRef ?? po!.id,
                        supplierName: po!.supplier?.name ?? 'Unknown supplier',
                        supplierId: po!.supplierId,
                        invoiceDate: now,
                        dueDate: po!.expectedDate,
                        lines: invoiceLines.map((it) => ({
                            description: it.material,
                            qty: it.qty,
                            unit: it.unit,
                            unitPrice: it.unitCost,
                        })),
                        subtotal: po!.totalValue,
                        vatTotal: 0,
                        total: po!.totalValue,
                        status: 'pending_review',
                        notes: `Raised from purchase order ${po!.poRef ?? po!.id} on full goods receipt (${grn.reference}).`,
                    },
                });
            }

            await tx.purchaseOrder.update({
                where: { id: grn.purchaseOrderId },
                data: {
                    receivedValue,
                    ...(shouldRaiseInvoice
                        ? {
                            status: 'sent_to_finance' as const,
                            sentToFinance: true,
                            sentToFinanceAt: now,
                            financeRef: invoiceNo,
                        }
                        : fullyReceived
                            ? { status: 'goods_received' as const }
                            : {}),
                },
            });
            // Line-level receipts on the order, so a second delivery knows what
            // is still outstanding.
            for (const line of lines) {
                await tx.pOItem.updateMany({
                    where: { purchaseOrderId: grn.purchaseOrderId, material: line.material },
                    data: { received: line.accepted },
                });
            }

            // The material request that started all this is now satisfied.
            if (fullyReceived && po?.mrRef) {
                await tx.materialRequest
                    .updateMany({
                        where: {
                            OR: [
                                { reference: po.mrRef },
                                { reference: { startsWith: `${po.mrRef}/` } },
                            ],
                        },
                        data: { status: 'fulfilled' },
                    })
                    .catch(() => undefined);
            }

            return tx.goodsReceipt.update({
                where: { id },
                data: {
                    status: 'received',
                    storeId: store?.id ?? body.storeId ?? null,
                    storeName,
                    deliveryNote: body.deliveryNote ?? grn.deliveryNote,
                    receivedBy,
                    receivedDate: now,
                    notes: body.notes ?? grn.notes,
                    stockPostedAt: now,
                },
                include: { items: true },
            });
        });

        if (shouldRaiseInvoice && invoiceNo) {
            void this.notifications.dispatch('purchase-order.sent-to-finance', {
                title: 'Purchase order sent to Finance',
                message: `${po!.poRef ?? po!.id} — ${po!.supplier?.name ?? ''} (${invoiceNo})`,
                actionUrl: '/apps/finance/purchase-invoice',
                relatedId: po!.id,
                relatedType: 'PurchaseOrder',
                vars: { reference: po!.poRef ?? po!.id, invoiceNo },
            });
        }
        return result;
    }

    /** The price the order agreed for this material, so stock is valued at cost. */
    private async unitCostFor(tx: any, purchaseOrderId: string, material: string) {
        const item = await tx.pOItem.findFirst({
            where: { purchaseOrderId, material },
            select: { unitCost: true },
        });
        return Number(item?.unitCost) || 0;
    }

    /** Adds the delivery to the receiving store's shelf. */
    private async postToStore(
        tx: any,
        line: {
            storeId: string | null;
            material: string;
            unit: string;
            qty: number;
            unitCost: number;
            at: Date;
        },
    ) {
        if (!line.storeId) return;
        const existing = await tx.storeItem.findFirst({
            where: { storeId: line.storeId, materialName: line.material },
        });
        if (existing) {
            await tx.storeItem.update({
                where: { id: existing.id },
                data: {
                    qty: existing.qty + line.qty,
                    // A newly delivered price is the current price.
                    unitCost: line.unitCost || existing.unitCost,
                    lastReceived: line.at,
                },
            });
            return;
        }
        const catalogue = await tx.material.findFirst({ where: { name: line.material } });
        await tx.storeItem.create({
            data: {
                storeId: line.storeId,
                materialName: line.material,
                category: catalogue?.category ?? 'General',
                unit: line.unit,
                qty: line.qty,
                reorderLevel: catalogue?.reorderLevel ?? 0,
                unitCost: line.unitCost,
                lastReceived: line.at,
            },
        });
    }

    /**
     * Adds the delivery to the material catalogue, which is what Inventory,
     * Stock Levels and the Storefront all read.
     */
    private async postToCatalogue(
        tx: any,
        line: { material: string; unit: string; qty: number; unitCost: number },
    ) {
        const existing = await tx.material.findFirst({ where: { name: line.material } });
        if (existing) {
            await tx.material.update({
                where: { id: existing.id },
                data: {
                    totalQty: existing.totalQty + line.qty,
                    availableQty: existing.availableQty + line.qty,
                    unitCost: line.unitCost || existing.unitCost,
                    allocationStatus: 'Available',
                },
            });
            return;
        }
        // A material bought but never catalogued still has to be findable, or the
        // stock exists in a store and nowhere else.
        await tx.material.create({
            data: {
                name: line.material,
                category: 'General',
                unit: line.unit,
                totalQty: line.qty,
                availableQty: line.qty,
                unitCost: line.unitCost,
            },
        });
    }

    /** Value of everything accepted against the order so far. */
    private async receivedValue(tx: any, purchaseOrderId: string) {
        const items = await tx.pOItem.findMany({ where: { purchaseOrderId } });
        const receipts = await tx.goodsReceipt.findMany({
            where: { purchaseOrderId, status: 'received' },
            include: { items: true },
        });
        const acceptedByMaterial = new Map<string, number>();
        for (const r of receipts) {
            for (const it of r.items) {
                const key = it.material.trim().toLowerCase();
                acceptedByMaterial.set(key, (acceptedByMaterial.get(key) ?? 0) + it.accepted);
            }
        }
        return items.reduce((sum: number, it: any) => {
            const accepted = acceptedByMaterial.get(it.material.trim().toLowerCase()) ?? 0;
            return sum + accepted * it.unitCost;
        }, 0);
    }

    /** Rejects the whole delivery — nothing is posted to stock. */
    async reject(id: string, reason?: string) {
        const grn = await this.prisma.goodsReceipt.findUnique({ where: { id } });
        if (!grn) throw new NotFoundException('Goods receipt not found');
        if (grn.stockPostedAt) {
            throw new BadRequestException(
                `${grn.reference} has already been received into stock and cannot be rejected.`,
            );
        }
        return this.prisma.goodsReceipt.update({
            where: { id },
            data: {
                status: 'rejected',
                notes: [grn.notes, reason ? `Rejected: ${reason}` : null].filter(Boolean).join('\n'),
            },
            include: { items: true },
        });
    }
}
