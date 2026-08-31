import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NumberingService } from '../numbering/numbering.service';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { MailQueueService } from '../queue/mail-queue.service';
import { PermissionsService } from '../permissions/permissions.service';

interface ReceiveLine {
    material: string;
    unit?: string;
    ordered?: number;
    received?: number;
    accepted?: number;
    rejected?: number;
    reason?: string;
}

const PROCESS_ID = 'p_goods_receipt';

const GRN_INCLUDE = {
    items: true,
    purchaseOrder: {
        select: {
            id: true,
            poRef: true,
            deliverySplit: true,
            paymentTermSnapshot: true,
            sentToFinance: true,
            financeRef: true,
            supplier: { select: { email: true } },
        },
    },
} as const;

@Injectable()
export class GoodsReceiptsService {
    constructor(
        private prisma: PrismaService,
        private numbering: NumberingService,
        private notifications: NotificationDispatchService,
        private mailQueue: MailQueueService,
        private permissions: PermissionsService,
    ) { }

    async findAll(status?: string, forUser?: { userId?: string; name?: string; email?: string; role?: string }) {
        const rows = await this.prisma.goodsReceipt.findMany({
            where: status ? { status } : {},
            include: GRN_INCLUDE,
            orderBy: { receivedDate: 'desc' },
        });
        if (!forUser) return rows.map((r) => ({ ...r, canDecide: false }));
        const ctx = await this.approverContext(forUser);
        return rows.map((r) => ({ ...r, canDecide: this.canDecideRow(ctx, r.receivedBy) }));
    }

    async findOne(id: string, forUser?: { userId?: string; name?: string; email?: string; role?: string }) {
        const row = await this.prisma.goodsReceipt.findUniqueOrThrow({
            where: { id },
            include: { items: true, purchaseOrder: { include: { supplier: true } } },
        });
        if (!forUser) return { ...row, canDecide: false };
        const ctx = await this.approverContext(forUser);
        return { ...row, canDecide: this.canDecideRow(ctx, row.receivedBy) };
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

    // ── Identity / approver resolution ──────────────────────────────────────
    // Self-contained rather than routed through AdminExtrasService, which would
    // need to import this module back to call `accept()` from the generic
    // Approvals page — a circular dependency. Mirrors the matching logic in
    // AdminExtrasService.findApprovals/assertMayApprove.

    private normalizeIdentity(value: unknown): string {
        return String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
    }

    private async resolveIdentities(forUser?: {
        userId?: string;
        name?: string;
        email?: string;
        role?: string;
    }): Promise<string[]> {
        if (!forUser) return [];
        let identity = forUser;
        if (forUser.userId) {
            const user = await this.prisma.user
                .findUnique({ where: { id: forUser.userId }, select: { name: true, email: true, role: true } })
                .catch(() => null);
            if (user) {
                identity = {
                    ...forUser,
                    name: user.name ?? forUser.name,
                    email: user.email ?? forUser.email,
                    role: user.role ?? forUser.role,
                };
            }
        }
        return [identity.name, identity.email, identity.role]
            .map((v) => this.normalizeIdentity(v))
            .filter(Boolean);
    }

    /** Every approver a Goods Receipt workflow names, across single/group/tier shapes. */
    private async namedApprovers(): Promise<string[]> {
        const row = await this.prisma.systemSetting.findUnique({ where: { key: 'admin-settings' } }).catch(() => null);
        const value = row?.value && typeof row.value === 'object' && !Array.isArray(row.value) ? (row.value as any) : {};
        const workflows = Array.isArray(value.processWorkflows) ? value.processWorkflows : [];
        const workflow = workflows.find((w: any) => w?.processId === PROCESS_ID);
        if (!workflow) return [];
        const approvers: unknown[] =
            workflow.workflowType === 'single'
                ? [workflow.approver]
                : workflow.workflowType === 'group'
                    ? (Array.isArray(workflow.groupApprovers) ? workflow.groupApprovers : [])
                    : workflow.workflowType === 'tier'
                        ? (Array.isArray(workflow.tierLevels) ? workflow.tierLevels.map((t: any) => t?.approver) : [])
                        : [];
        return approvers.map((v) => this.normalizeIdentity(v)).filter(Boolean);
    }

    /**
     * What the caller's identity resolves to, independent of any one record —
     * shared by `assertMayDecide` (which enforces it) and `canDecide` (which
     * only reports it, for the page to grey out Accept/Reject up front rather
     * than let someone click them and hit a 403).
     */
    private async approverContext(forUser: {
        userId?: string;
        name?: string;
        email?: string;
        role?: string;
    }) {
        const named = await this.namedApprovers();
        const identities = await this.resolveIdentities(forUser);
        let allowedBase = named.length > 0 && named.some((a) => identities.includes(a));
        if (named.length === 0 && forUser.userId) {
            allowedBase = await this.permissions.can(forUser.userId, PROCESS_ID, 'approve').catch(() => false);
        }
        const isSuper = forUser.userId
            ? await this.permissions.resolveForUser(forUser.userId).then((p) => p.isSuper).catch(() => false)
            : false;
        return { allowedBase, identities, isSuper };
    }

    /** Whether `ctx` may decide a record raised by `receivedBy` — self-decision blocked unless super. */
    private canDecideRow(
        ctx: { allowedBase: boolean; identities: string[]; isSuper: boolean },
        receivedBy?: string | null,
    ): boolean {
        if (!ctx.allowedBase) return false;
        const raisedBy = this.normalizeIdentity(receivedBy);
        if (!raisedBy || !ctx.identities.includes(raisedBy)) return true;
        return ctx.isSuper;
    }

    /**
     * Throws unless the caller is the configured Goods Receipt approver.
     *
     * Where no workflow is configured at all, falls back to the role-based
     * `approve` permission — configuring a workflow narrows who may decide,
     * it never widens it. A receiver may not accept their own delivery unless
     * they hold a super/admin role.
     */
    private async assertMayDecide(
        forUser: { userId?: string; name?: string; email?: string; role?: string } | undefined,
        receivedBy?: string | null,
    ): Promise<void> {
        if (!forUser) return;
        const ctx = await this.approverContext(forUser);
        if (!ctx.allowedBase) {
            throw new ForbiddenException(
                'Only the configured Goods Receipt approver may decide this record.',
            );
        }
        if (!this.canDecideRow(ctx, receivedBy)) {
            throw new ForbiddenException('You recorded this delivery, so it must be decided by someone else.');
        }
    }

    // ── Payment timing ──────────────────────────────────────────────────────

    /** Mirrors timingBucketFor in PurchaseOrdersPage.tsx. */
    private timingBucket(po: { paymentTermSnapshot: any }): 'before' | 'after' | 'both' {
        const tranches: { timing?: string }[] = Array.isArray(po.paymentTermSnapshot?.tranches)
            ? po.paymentTermSnapshot.tranches
            : [];
        if (tranches.length === 0) return 'after';
        const beforeCount = tranches.filter((t) => t.timing === 'on_po_approval').length;
        if (beforeCount === 0) return 'after';
        if (beforeCount === tranches.length) return 'before';
        return 'both';
    }

    // ── Recording a delivery (no stock touched) ─────────────────────────────

    /**
     * Records what arrived, without posting anything to stock.
     *
     * Quantities land in each item's pending* fields, not the cumulative
     * received/accepted/rejected totals — those only move when the record is
     * accepted, so an edit or a rejection here can never disturb stock that
     * has already been posted from an earlier accepted pass.
     */
    async updateRecord(
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
        const grn = await this.prisma.goodsReceipt.findUnique({ where: { id }, include: { items: true } });
        if (!grn) throw new NotFoundException('Goods receipt not found');
        if (grn.status === 'rejected') {
            throw new BadRequestException(`${grn.reference} was rejected outright and cannot be recorded.`);
        }
        // A decided GRN (partial delivery, over/under supply) can still take another
        // pass through Record Remaining Delivery as long as some line is short of
        // what was ordered — only a fully settled record is closed to new drafts.
        const alreadyDecided = grn.status !== 'pending' && grn.status !== 'pending_approval';
        const outstanding = grn.items.some((it) => (it.accepted ?? 0) < it.ordered);
        if (alreadyDecided && !outstanding) {
            throw new BadRequestException(
                `${grn.reference} has already been fully received — there is nothing left to record.`,
            );
        }

        const storeName = String(body.storeName ?? grn.storeName ?? '').trim();
        if (!storeName) {
            throw new BadRequestException(
                'Choose the store the goods were received into — stock has to land somewhere.',
            );
        }

        const byMaterial = new Map<string, ReceiveLine>();
        for (const line of body.items ?? []) {
            byMaterial.set(String(line.material ?? '').trim().toLowerCase(), line);
        }
        const lines = grn.items.map((it) => {
            const sent = byMaterial.get(it.material.trim().toLowerCase());
            const received = Number(sent?.received ?? 0) || 0;
            const rejected = Number(sent?.rejected ?? 0) || 0;
            const accepted = Number(sent?.accepted ?? Math.max(received - rejected, 0)) || 0;
            return { id: it.id, material: it.material, received, accepted, rejected, reason: sent?.reason ?? null };
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
            if (l.rejected > 0 && !l.reason?.trim()) {
                throw new BadRequestException(`${l.material}: give a reason for the rejected quantity.`);
            }
        }

        const receivedBy = String(body.receivedBy ?? grn.receivedBy ?? '').trim() || 'Unknown';

        await this.prisma.$transaction(
            lines.map((l) =>
                this.prisma.goodsReceiptItem.update({
                    where: { id: l.id },
                    data: {
                        pendingReceived: l.received,
                        pendingAccepted: l.accepted,
                        pendingRejected: l.rejected,
                        pendingReason: l.reason,
                    },
                }),
            ),
        );

        return this.prisma.goodsReceipt.update({
            where: { id },
            data: {
                status: 'pending_approval',
                storeId: body.storeId ?? grn.storeId,
                storeName,
                deliveryNote: body.deliveryNote ?? grn.deliveryNote,
                receivedBy,
                notes: body.notes ?? grn.notes,
            },
            include: { items: true },
        });
    }

    /** Classifies the delivery from its cumulative totals. Rejection outranks quantity. */
    private classify(items: { ordered: number; received: number; rejected: number }[]): string {
        if (items.some((it) => it.rejected > 0)) return 'partial_delivery';
        if (items.some((it) => it.received > it.ordered)) return 'over_supply';
        if (items.some((it) => it.received < it.ordered)) return 'under_supply';
        return 'fully_received';
    }

    /**
     * Accepts the pending record: folds this pass's quantities into the
     * cumulative totals, posts the newly accepted quantities to stock, and
     * reclassifies the delivery. This is the only place stock actually moves —
     * `updateRecord` only ever wrote a draft.
     *
     * Only the Goods Receipt workflow's configured approver may call this,
     * whether from this page's own button or from the generic Approvals page
     * (AdminExtrasService.updateApproval delegates here) — one gate either way.
     */
    async accept(id: string, forUser?: { userId?: string; name?: string; email?: string; role?: string }) {
        const grn = await this.prisma.goodsReceipt.findUnique({
            where: { id },
            include: { items: true, purchaseOrder: { include: { supplier: true } } },
        });
        if (!grn) throw new NotFoundException('Goods receipt not found');
        if (grn.status !== 'pending_approval') {
            throw new BadRequestException(`${grn.reference} is not awaiting a decision.`);
        }
        await this.assertMayDecide(forUser, grn.receivedBy);

        const now = new Date();
        const po = grn.purchaseOrder;

        const lines = grn.items.map((it) => ({
            id: it.id,
            material: it.material,
            unit: it.unit,
            ordered: it.ordered,
            receivedTotal: it.received + (it.pendingReceived ?? 0),
            acceptedTotal: it.accepted + (it.pendingAccepted ?? 0),
            rejectedTotal: it.rejected + (it.pendingRejected ?? 0),
            passAccepted: it.pendingAccepted ?? 0,
            reason: it.pendingReason ?? it.reason,
        }));

        const result = await this.prisma.$transaction(async (tx) => {
            const store = grn.storeId
                ? await tx.store.findUnique({ where: { id: grn.storeId } })
                : await tx.store.findFirst({ where: { name: grn.storeName } });
            const storeId = store?.id ?? grn.storeId ?? null;
            const projectName = store?.projectName ?? null;
            const projectId = store?.projectId ?? null;

            for (const line of lines) {
                await tx.goodsReceiptItem.update({
                    where: { id: line.id },
                    data: {
                        received: line.receivedTotal,
                        accepted: line.acceptedTotal,
                        rejected: line.rejectedTotal,
                        reason: line.reason,
                        pendingReceived: null,
                        pendingAccepted: null,
                        pendingRejected: null,
                        pendingReason: null,
                    },
                });

                // Only this pass's newly accepted quantity is posted — the rest
                // of the cumulative total was already posted on an earlier pass.
                if (line.passAccepted <= 0) continue;

                const unitCost = await this.unitCostFor(tx, grn.purchaseOrderId, line.material);

                await tx.stockMovement.create({
                    data: {
                        type: 'incoming',
                        materialName: line.material,
                        unit: line.unit,
                        qty: line.passAccepted,
                        storeName: grn.storeName,
                        storeId,
                        reference: `${grn.reference} · ${grn.poRef ?? ''}`.trim(),
                        projectName,
                        projectId,
                        date: now,
                        createdBy: grn.receivedBy,
                        notes: [
                            `Goods receipt ${grn.reference} from ${grn.supplierName}`,
                            grn.deliveryNote ? `Delivery note ${grn.deliveryNote}` : null,
                        ]
                            .filter(Boolean)
                            .join('. '),
                    },
                });

                await this.postToStore(tx, {
                    storeId,
                    material: line.material,
                    unit: line.unit,
                    qty: line.passAccepted,
                    unitCost,
                    at: now,
                });

                await this.postToCatalogue(tx, {
                    material: line.material,
                    unit: line.unit,
                    qty: line.passAccepted,
                    unitCost,
                });
            }

            const status = this.classify(lines.map((l) => ({ ordered: l.ordered, received: l.receivedTotal, rejected: l.rejectedTotal })));
            const stillOutstanding = lines.some((l) => l.acceptedTotal < l.ordered);
            const valueSoFar = await this.receivedValueFor(tx, grn.purchaseOrderId, lines);

            await tx.purchaseOrder.update({
                where: { id: grn.purchaseOrderId },
                data: {
                    receivedValue: valueSoFar,
                    ...(stillOutstanding ? {} : { status: 'goods_received' as const }),
                },
            });
            for (const line of lines) {
                await tx.pOItem.updateMany({
                    where: { purchaseOrderId: grn.purchaseOrderId, material: line.material },
                    data: { received: line.acceptedTotal },
                });
            }

            if (!stillOutstanding && po?.mrRef) {
                await tx.materialRequest
                    .updateMany({
                        where: { OR: [{ reference: po.mrRef }, { reference: { startsWith: `${po.mrRef}/` } }] },
                        data: { status: 'fulfilled' },
                    })
                    .catch(() => undefined);
            }

            return tx.goodsReceipt.update({
                where: { id },
                data: { status, receivedDate: now, stockPostedAt: now },
                include: { items: true },
            });
        });

        return result;
    }

    /** Value of everything accepted against the order so far, from this GRN's own cumulative totals. */
    private async receivedValueFor(
        tx: any,
        purchaseOrderId: string,
        lines: { material: string; acceptedTotal: number }[],
    ) {
        const items = await tx.pOItem.findMany({ where: { purchaseOrderId } });
        const acceptedByMaterial = new Map(lines.map((l) => [l.material.trim().toLowerCase(), l.acceptedTotal]));
        return items.reduce((sum: number, it: any) => {
            const accepted = acceptedByMaterial.get(it.material.trim().toLowerCase()) ?? 0;
            return sum + accepted * it.unitCost;
        }, 0);
    }

    /**
     * Sends the pending record back for correction instead of accepting it.
     *
     * The draft quantities in pending* are left untouched, so re-opening
     * Update Record shows what was keyed in rather than a blank form.
     */
    async raiseRejectionNote(
        id: string,
        reason: string,
        forUser?: { userId?: string; name?: string; email?: string; role?: string },
    ) {
        const grn = await this.prisma.goodsReceipt.findUnique({ where: { id } });
        if (!grn) throw new NotFoundException('Goods receipt not found');
        if (grn.status !== 'pending_approval') {
            throw new BadRequestException(`${grn.reference} is not awaiting a decision.`);
        }
        await this.assertMayDecide(forUser, grn.receivedBy);
        return this.prisma.goodsReceipt.update({
            where: { id },
            data: {
                status: 'pending',
                notes: [grn.notes, reason ? `Rejection note: ${reason}` : null].filter(Boolean).join('\n'),
            },
            include: { items: true },
        });
    }

    /** Rejects the whole delivery before anything has ever been recorded. */
    async reject(id: string, reason?: string) {
        const grn = await this.prisma.goodsReceipt.findUnique({ where: { id } });
        if (!grn) throw new NotFoundException('Goods receipt not found');
        if (grn.status !== 'pending') {
            throw new BadRequestException(`${grn.reference} has already been recorded and cannot be rejected outright.`);
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

    /**
     * Raises the invoice for what has been accepted so far and hands the order
     * to Finance. Manual, and only once accepted — there is nothing silent
     * about it any more, and nothing to invoice before a decision has landed.
     */
    async sendToFinance(id: string) {
        const grn = await this.prisma.goodsReceipt.findUnique({
            where: { id },
            include: { items: true, purchaseOrder: { include: { supplier: true } } },
        });
        if (!grn) throw new NotFoundException('Goods receipt not found');
        if (['pending', 'pending_approval', 'rejected'].includes(grn.status)) {
            throw new BadRequestException(`${grn.reference} has not been accepted yet.`);
        }
        const po = grn.purchaseOrder;
        if (!po) throw new NotFoundException('Purchase order not found');
        if (po.sentToFinance) {
            throw new BadRequestException(`${po.poRef ?? po.id} has already been sent to Finance.`);
        }
        const bucket = this.timingBucket(po);
        if (bucket === 'before') {
            throw new BadRequestException(
                'This payment term is settled before delivery — nothing more to send to Finance here.',
            );
        }

        const acceptedItems = grn.items.filter((it) => it.accepted > 0);
        if (acceptedItems.length === 0) {
            throw new BadRequestException('Nothing has been accepted on this receipt yet.');
        }
        const poItems = await this.prisma.pOItem.findMany({ where: { purchaseOrderId: grn.purchaseOrderId } });
        const unitCostByMaterial = new Map(poItems.map((it) => [it.material.trim().toLowerCase(), it.unitCost]));
        const lines = acceptedItems.map((it) => {
            const unitCost = unitCostByMaterial.get(it.material.trim().toLowerCase()) ?? 0;
            return { description: it.material, qty: it.accepted, unit: it.unit, unitPrice: unitCost };
        });
        const total = lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);

        const { reference: invoiceNo } = await this.numbering.allocate('PurchaseInvoice');
        const now = new Date();

        await this.prisma.purchaseInvoice.create({
            data: {
                invoiceNo,
                poRef: po.poRef ?? po.id,
                supplierName: po.supplier?.name ?? 'Unknown supplier',
                supplierId: po.supplierId,
                invoiceDate: now,
                dueDate: po.expectedDate,
                lines,
                subtotal: total,
                vatTotal: 0,
                total,
                status: 'pending_review',
                notes: `Raised from goods receipt ${grn.reference} against purchase order ${po.poRef ?? po.id}.`,
            },
        });
        await this.prisma.purchaseOrder.update({
            where: { id: po.id },
            data: {
                status: 'sent_to_finance',
                sentToFinance: true,
                sentToFinanceAt: now,
                financeRef: invoiceNo,
            },
        });

        void this.notifications.dispatch('purchase-order.sent-to-finance', {
            title: 'Purchase order sent to Finance',
            message: `${po.poRef ?? po.id} — ${po.supplier?.name ?? ''} (${invoiceNo})`,
            actionUrl: '/apps/finance/purchase-invoice',
            relatedId: po.id,
            relatedType: 'PurchaseOrder',
            vars: { reference: po.poRef ?? po.id, invoiceNo },
        });

        return this.findOne(id);
    }

    /** Sends the (editable) over/under-supply notice to the supplier by email. */
    async notifySupplier(id: string, body: { email?: string; subject?: string; message?: string }) {
        const grn = await this.prisma.goodsReceipt.findUnique({ where: { id }, include: { items: true } });
        if (!grn) throw new NotFoundException('Goods receipt not found');
        const email = String(body.email ?? '').trim();
        if (!email) throw new BadRequestException('A supplier email address is required.');
        const message = String(body.message ?? '').trim();
        if (!message) throw new BadRequestException('A message is required.');
        const kind = grn.status === 'over_supply' ? 'Over Supply' : grn.status === 'under_supply' ? 'Under Supply' : 'Delivery Notice';

        await this.mailQueue.enqueueEmail({
            to: email,
            subject: String(body.subject ?? '').trim() || `${kind} — ${grn.reference}`,
            text: message,
        });

        return this.prisma.goodsReceipt.update({
            where: { id },
            data: {
                notes: [grn.notes, `Supplier notified (${kind}) at ${email}.`].filter(Boolean).join('\n'),
            },
            include: { items: true },
        });
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
     * Stock Levels and the Storefront all read. The material must already
     * exist there — it's meant to be created once, up front, via Storefront
     * Category — so a receipt referencing one that isn't found is a data
     * problem to fix, not something to paper over by inventing a new
     * catalogue row with none of its proper category/sku/classification
     * set. Throwing here aborts the whole `accept()` transaction, so nothing
     * from this receipt (stock movement, store shelf) is posted either.
     */
    private async postToCatalogue(
        tx: any,
        line: { material: string; unit: string; qty: number; unitCost: number },
    ) {
        const existing = await tx.material.findFirst({ where: { name: line.material } });
        if (!existing) {
            throw new BadRequestException(
                `"${line.material}" was not found in the material catalogue — add it under Storefront → Config before accepting this receipt.`,
            );
        }
        await tx.material.update({
            where: { id: existing.id },
            data: {
                totalQty: existing.totalQty + line.qty,
                availableQty: existing.availableQty + line.qty,
                unitCost: line.unitCost || existing.unitCost,
                allocationStatus: 'Available',
            },
        });
    }
}
