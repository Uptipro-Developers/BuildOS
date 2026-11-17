import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ProcurementRequestsService } from '../procurement-requests/procurement-requests.service';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';

/** Must match the key AdminExtrasService writes its settings row under. */
const ADMIN_SETTINGS_KEY = 'admin-settings';

/**
 * The request reference behind an item row's `<ref>/<n>` reference.
 *
 * Mirrors src/app/utils/materialRequestRef.ts on the frontend: a multi-item
 * Material Request writes one row per material under `<requestRef>/<n>` because
 * `reference` is UNIQUE. Grouping the rows back together needs the base.
 */
function baseMaterialRequestRef(reference: string): string {
    if (!reference) return '';
    const cut = reference.lastIndexOf('/');
    if (cut <= 0) return reference;
    return /^\d+$/.test(reference.slice(cut + 1)) ? reference.slice(0, cut) : reference;
}

@Injectable()
export class MaterialsService {
    constructor(
        private prisma: PrismaService,
        private procurementRequests: ProcurementRequestsService,
        private notifications: NotificationDispatchService,
    ) { }

    // ── Materials ──
    async findAllMaterials(search?: string, category?: string) {
        const materials = await this.prisma.material.findMany({
            where: {
                ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
                ...(category && category !== 'All' ? { category } : {}),
            },
            orderBy: { name: 'asc' },
        });
        const storeItems = await this.prisma.storeItem.findMany({
            select: { materialName: true, qty: true, reservedQty: true },
        });
        const totals = new Map<string, { totalQty: number; reservedQty: number }>();
        for (const item of storeItems) {
            const key = item.materialName.trim().toLowerCase();
            const current = totals.get(key) ?? { totalQty: 0, reservedQty: 0 };
            current.totalQty += item.qty;
            current.reservedQty += item.reservedQty;
            totals.set(key, current);
        }
        return materials.map((material) => {
            const stock = totals.get(material.name.trim().toLowerCase()) ?? { totalQty: 0, reservedQty: 0 };
            return {
                ...material,
                totalQty: stock.totalQty,
                reservedQty: stock.reservedQty,
                availableQty: Math.max(0, stock.totalQty - stock.reservedQty),
                // A catalogue material is organization-wide; location lives on StoreItem.
                storeId: null,
                storeName: null,
            };
        });
    }

    findMaterial(id: string) {
        return this.prisma.material.findUniqueOrThrow({ where: { id } });
    }

    createMaterial(data: any) {
        return this.prisma.material.create({ data });
    }

    async updateMaterial(id: string, data: any, actor?: { userId?: string; name?: string; email?: string }) {
        const existing = await this.prisma.material.findUniqueOrThrow({ where: { id } });
        const { reason, ...proposed } = data ?? {};
        const blocked = ['totalQty', 'availableQty', 'reservedQty'];
        if (blocked.some((field) => proposed[field] !== undefined && Number(proposed[field]) !== Number((existing as any)[field]))) {
            throw new BadRequestException('Stock quantities cannot be edited directly. Post a receipt, issue, transfer, return, or approved adjustment.');
        }
        blocked.forEach((field) => delete proposed[field]);
        const changes = Object.fromEntries(Object.entries(proposed).filter(([key, value]) => JSON.stringify((existing as any)[key]) !== JSON.stringify(value)));
        if (Object.keys(changes).length === 0) return existing;
        const amendment = await this.prisma.materialAmendment.create({
            data: {
                entityType: 'Material', entityId: id, materialName: existing.name,
                oldValue: existing as any, proposedValue: changes as any,
                reason: String(reason ?? '').trim() || null,
                requestedBy: actor?.name || actor?.email || 'Unknown user',
                requestedById: actor?.userId || null,
            },
        });
        await this.recordAudit('Material', id, 'AMENDMENT_REQUESTED', existing, changes, actor, reason);
        void this.notifications.dispatch('material-amendment.submitted', {
            title: 'Material amendment awaiting approval',
            message: `${existing.name} has a proposed change.`,
            actionUrl: '/apps/storefront/approvals', relatedId: amendment.id, relatedType: 'MaterialAmendment',
            actorUserId: actor?.userId,
        });
        return { ...existing, amendmentId: amendment.id, amendmentStatus: 'pending' };
    }

    deleteMaterial(id: string) {
        return this.prisma.material.delete({ where: { id } });
    }

    // ── Stores ──
    async findAllStores(type?: string, storeIds?: string[] | null) {
        const stores = await this.prisma.store.findMany({
            where: { ...(type ? { type } : {}), ...(storeIds ? { id: { in: storeIds } } : {}) },
            include: { storeItems: true },
            orderBy: { name: 'asc' },
        });
        const items = stores.flatMap((store) => store.storeItems);
        const hydrated = await this.withEffectiveThresholds(items);
        const byId = new Map(hydrated.map((item) => [item.id, item]));
        return stores.map((store) => ({
            ...store,
            storeItems: store.storeItems.map((item) => byId.get(item.id) ?? item),
        }));
    }

    async findStore(id: string) {
        const store = await this.prisma.store.findUniqueOrThrow({
            where: { id },
            include: { storeItems: true },
        });
        return {
            ...store,
            storeItems: await this.withEffectiveThresholds(store.storeItems),
        };
    }

    /**
     * Creates a store, honouring the per-level cap configured in Storefront
     * Settings.
     *
     * The cap ("2 central stores", "5 regional hubs") was configurable and shown in
     * the UI but never enforced anywhere: this was a bare `store.create`, so the
     * limit could be exceeded by any client that skipped the form. `Store.type`
     * carries the level name the cap is keyed on.
     */
    async createStore(data: any) {
        await this.assertStoreLevelCapacity(String(data?.type ?? ''));
        return this.prisma.store.create({ data });
    }

    /** Refuses when the configured maximum for a store level is already reached. */
    private async assertStoreLevelCapacity(type: string) {
        const level = type.trim();
        if (!level) return;

        let levels: any[] = [];
        try {
            const row = await this.prisma.systemSetting.findUnique({
                where: { key: ADMIN_SETTINGS_KEY },
            });
            const value = row?.value as Record<string, any> | undefined;
            levels = Array.isArray(value?.storeLevels) ? value!.storeLevels : [];
        } catch {
            // Settings unavailable — do not block store creation over it.
            return;
        }

        const configured = levels.find(
            (item: any) =>
                String(item?.name ?? '').trim().toLowerCase() === level.toLowerCase(),
        );
        const cap = Number(configured?.maxCount);
        // null/undefined means unlimited, which is how Project Store ships.
        if (!Number.isFinite(cap) || cap <= 0) return;

        const existing = await this.prisma.store.count({
            where: { type: { equals: level, mode: 'insensitive' } },
        });
        if (existing >= cap) {
            throw new BadRequestException(
                `Storefront settings allow a maximum of ${cap} ${level}${cap === 1 ? '' : 's'}; ${existing} already exist. Raise the limit in Storefront Settings first.`,
            );
        }
    }

    updateStore(id: string, data: any) {
        return this.prisma.store.update({ where: { id }, data });
    }

    deleteStore(id: string) {
        return this.prisma.store.delete({ where: { id } });
    }

    // ── Store Items ──
    async findAllStoreItems(storeIds?: string[] | null) {
        const items = await this.prisma.storeItem.findMany({
            where: storeIds ? { storeId: { in: storeIds } } : {},
            orderBy: { materialName: 'asc' },
        });
        return this.withEffectiveThresholds(items);
    }

    async findStoreItems(storeId: string) {
        const items = await this.prisma.storeItem.findMany({
            where: { storeId },
            orderBy: { materialName: 'asc' },
        });
        return this.withEffectiveThresholds(items);
    }

    async createStoreItem(data: any) {
        const storeId = String(data?.storeId ?? '').trim();
        const materialName = String(data?.materialName ?? '').trim();
        const unit = String(data?.unit ?? '').trim();
        if (!storeId) throw new BadRequestException('Choose a store for this stock balance');
        if (!materialName) throw new BadRequestException('Choose a material for this stock balance');
        if (!unit) throw new BadRequestException(`Set a unit of measure for ${materialName} before adding store quantities`);
        const low = data?.lowStockThreshold ?? data?.reorderLevel;
        const created = await this.prisma.$transaction(async (tx) => {
            const store = await tx.store.findUnique({ where: { id: storeId } });
            if (!store) throw new BadRequestException('The selected store no longer exists');
            const duplicate = await tx.storeItem.findFirst({ where: { storeId, materialName: { equals: materialName, mode: 'insensitive' } } });
            if (duplicate) throw new BadRequestException(`${materialName} already has a balance in ${store.name}`);
            const item = await tx.storeItem.create({ data: {
                storeId,
                materialName,
                category: String(data?.category ?? '').trim() || 'General',
                unit,
                qty: Number(data?.qty ?? 0),
                openingQty: Number(data?.openingQty ?? data?.qty ?? 0),
                unitCost: Number(data?.unitCost ?? 0),
                reorderLevel: Number(low ?? 0),
                lowStockThreshold: low === undefined || low === null || low === '' ? null : Number(low),
                outOfStockThreshold: data?.outOfStockThreshold === undefined || data?.outOfStockThreshold === null || data?.outOfStockThreshold === '' ? null : Number(data.outOfStockThreshold),
                bin: String(data?.bin ?? '').trim() || null,
            }});
            const opening = Number(item.qty ?? 0);
            await tx.stockMovement.create({ data: {
                type: 'opening_balance', materialName: item.materialName, unit: item.unit, qty: opening,
                storeName: store?.name ?? 'Store', storeId: item.storeId, createdBy: 'Initial setup',
                qtyBefore: 0, qtyAfter: opening, direction: 'increase', status: 'posted',
                notes: 'Opening balance established when the material was added to the store.',
            }});
            const material = await tx.material.findFirst({ where: { name: item.materialName } });
            if (material && opening > 0) await tx.material.update({ where: { id: material.id }, data: {
                totalQty: material.totalQty + opening,
                availableQty: material.availableQty + opening,
            }});
            return item;
        });
        return (await this.withEffectiveThresholds([created]))[0];
    }

    async updateStoreItem(id: string, data: any, actor?: { userId?: string; name?: string; email?: string }) {
        const existing = await this.prisma.storeItem.findUniqueOrThrow({ where: { id } });
        if (data?.qty !== undefined && Number(data.qty) !== existing.qty) {
            throw new BadRequestException('Quantity is ledger-controlled. Use Stock Movement for an issue, receipt, return, transfer, or adjustment.');
        }
        const { qty: _qty, reason, ...raw } = data ?? {};
        const proposed = {
            ...raw,
            ...(raw.reorderLevel !== undefined ? { lowStockThreshold: Number(raw.reorderLevel), reorderLevel: Number(raw.reorderLevel) } : {}),
        };
        const changes = Object.fromEntries(Object.entries(proposed).filter(([key, value]) => JSON.stringify((existing as any)[key]) !== JSON.stringify(value)));
        if (Object.keys(changes).length === 0) return (await this.withEffectiveThresholds([existing]))[0];
        const store = await this.prisma.store.findUnique({ where: { id: existing.storeId } });
        const amendment = await this.prisma.materialAmendment.create({
            data: {
                entityType: 'StoreItem', entityId: id, materialName: existing.materialName,
                storeId: existing.storeId, storeName: store?.name ?? null,
                oldValue: existing as any, proposedValue: changes as any,
                reason: String(reason ?? '').trim() || null,
                requestedBy: actor?.name || actor?.email || 'Unknown user', requestedById: actor?.userId || null,
            },
        });
        await this.recordAudit('StoreItem', id, 'AMENDMENT_REQUESTED', existing, changes, actor, reason);
        void this.notifications.dispatch('material-amendment.submitted', {
            title: 'Store item amendment awaiting approval',
            message: `${existing.materialName}${store?.name ? ` in ${store.name}` : ''} has a proposed change.`,
            actionUrl: '/apps/storefront/approvals', relatedId: amendment.id, relatedType: 'MaterialAmendment', actorUserId: actor?.userId,
        });
        return { ...(await this.withEffectiveThresholds([existing]))[0], amendmentId: amendment.id, amendmentStatus: 'pending' };
    }

    deleteStoreItem(id: string) {
        return this.prisma.storeItem.delete({ where: { id } });
    }

    /**
     * StoreItem keeps quantities and location only. Its public reorder level is
     * always read from the matching Material row, making the material catalogue
     * the single source of truth even for legacy StoreItem rows that still have
     * an old database value.
     */
    private async withEffectiveThresholds<T extends {
        materialName: string;
        storeId?: string | null;
        unit?: string | null;
        reorderLevel?: number | null;
        lowStockThreshold?: number | null;
        outOfStockThreshold?: number | null;
    }>(items: T[]): Promise<T[]> {
        if (items.length === 0) return items;
        const storeIds = [...new Set(items.map((item) => item.storeId).filter(Boolean))] as string[];
        const stores = storeIds.length ? await this.prisma.store.findMany({ where: { id: { in: storeIds } }, select: { id: true, name: true } }) : [];
        const storeNameById = new Map(stores.map((store) => [store.id, store.name]));
        const settings = await this.prisma.systemSetting.findUnique({ where: { key: ADMIN_SETTINGS_KEY } }).catch(() => null);
        const configured = Array.isArray((settings?.value as any)?.storeThresholds) ? (settings!.value as any).storeThresholds : [];
        const defaults = new Map<string, any>(configured.map((row: any) => [String(row.storeName ?? '').trim().toLowerCase(), row]));
        return items.map((item: any) => {
            const configured = defaults.get(String(storeNameById.get(item.storeId ?? '') ?? '').toLowerCase());
            const percent = String(configured?.unit ?? '').trim() === '%';
            const baseline = Number(item.openingQty ?? item.qty ?? 0);
            const defaultLow = percent ? baseline * Number(configured?.lowStockQty ?? 0) / 100 : Number(configured?.lowStockQty ?? 0);
            const defaultOut = percent ? baseline * Number(configured?.outOfStockQty ?? 0) / 100 : Number(configured?.outOfStockQty ?? 0);
            return {
                ...item,
                reorderLevel: item.lowStockThreshold ?? (configured ? defaultLow : item.reorderLevel ?? 0),
                outOfStockLevel: item.outOfStockThreshold ?? (configured ? defaultOut : 0),
                thresholdSource: item.lowStockThreshold !== null && item.lowStockThreshold !== undefined ? 'item' : 'store',
            };
        });
    }

    // ── Stock Movements ──
    findAllMovements(storeId?: string, storeIds?: string[] | null) {
        return this.prisma.stockMovement.findMany({
            where: storeId ? { storeId } : storeIds ? { storeId: { in: storeIds } } : {},
            orderBy: { date: 'desc' },
        });
    }

    async createMovement(data: any, actor?: { userId?: string; name?: string; email?: string }) {
        const storeId = String(data?.storeId ?? '').trim();
        if (!storeId) throw new BadRequestException('A store is required for a stock movement');
        const quantity = Number(data?.qty);
        if (!Number.isFinite(quantity) || quantity <= 0) throw new BadRequestException('Quantity must be greater than zero');
        const type = String(data?.type ?? '').trim().toLowerCase();
        const movementInput = {
            materialName: String(data?.materialName ?? '').trim(),
            unit: String(data?.unit ?? '').trim(),
            qty: quantity,
            storeName: String(data?.storeName ?? '').trim(),
            storeId,
            reference: String(data?.reference ?? '').trim() || null,
            projectName: String(data?.projectName ?? '').trim() || null,
            projectId: String(data?.projectId ?? '').trim() || null,
            ...(data?.date ? { date: new Date(data.date) } : {}),
            createdBy: actor?.name || actor?.email || data?.createdBy || 'Unknown user',
            notes: String(data?.notes ?? '').trim() || null,
        };
        if (type === 'transfer') {
            const toStoreId = String(data?.toStoreId ?? '').trim();
            const toStoreName = String(data?.toStoreName ?? '').trim();
            if (!toStoreId || !toStoreName || toStoreId === storeId) throw new BadRequestException('Choose a different destination store');
            const reference = String(data?.reference ?? '').trim() || `TRF-${Date.now()}-${randomUUID().slice(0, 6)}`;
            const transfer = await this.prisma.stockTransfer.create({ data: {
                reference, fromStoreId: storeId, fromStoreName: data.storeName,
                toStoreId, toStoreName, items: [{ materialName: data.materialName, qty: quantity, unit: data.unit }],
                status: 'Pending', requestedBy: actor?.name || actor?.email || data.createdBy || 'Unknown user',
                approvedBy: actor?.name || actor?.email || null, notes: data.notes,
            }});
            await this.updateTransfer(transfer.id, { status: 'Completed', completedBy: actor?.name || actor?.email });
            return this.prisma.stockMovement.findFirstOrThrow({ where: { reference, type: 'transfer_out' }, orderBy: { createdAt: 'desc' } });
        }
        if (type === 'adjustment') {
            const item = await this.prisma.storeItem.findFirst({ where: { storeId, materialName: data.materialName } });
            if (!item) throw new BadRequestException('This material is not stocked in the selected store');
            const direction = String(data?.direction ?? '').toLowerCase();
            if (direction !== 'increase' && direction !== 'decrease') throw new BadRequestException('Choose whether the adjustment increases or decreases stock');
            const movement = await this.prisma.stockMovement.create({ data: {
                ...movementInput, type: direction === 'increase' ? 'adjustment_in' : 'adjustment_out',
                qtyBefore: item.qty, qtyAfter: item.qty, direction, status: 'pending_approval',
            }});
            const amendment = await this.prisma.materialAmendment.create({ data: {
                entityType: 'StockAdjustment', entityId: item.id, materialName: item.materialName,
                storeId, storeName: data.storeName, oldValue: { qty: item.qty },
                proposedValue: { movementId: movement.id, quantity, direction, reference: data.reference ?? null },
                reason: String(data?.notes ?? '').trim() || null,
                requestedBy: actor?.name || actor?.email || 'Unknown user', requestedById: actor?.userId || null,
            }});
            void this.notifications.dispatch('material-amendment.submitted', {
                title: 'Stock adjustment awaiting approval', message: `${item.materialName} — ${direction} by ${quantity} ${item.unit}.`,
                actionUrl: '/apps/storefront/approvals', relatedId: amendment.id, relatedType: 'MaterialAmendment', actorUserId: actor?.userId,
            });
            return movement;
        }
        const incoming = ['incoming', 'receipt', 'return', 'adjustment_in'].includes(type);
        const outgoing = ['outgoing', 'issue', 'consumption', 'supplier_return', 'adjustment_out'].includes(type);
        if (!incoming && !outgoing) throw new BadRequestException('Choose a valid stock movement type');
        const result = await this.prisma.$transaction(async (tx) => {
            const item = await tx.storeItem.findFirst({ where: { storeId, materialName: data.materialName } });
            if (!item) throw new BadRequestException('This material is not stocked in the selected store');
            const delta = incoming ? quantity : -quantity;
            const after = item.qty + delta;
            const unreserved = Math.max(0, item.qty - Number(item.reservedQty ?? 0));
            if (outgoing && quantity > unreserved) throw new BadRequestException(`Only ${unreserved} unreserved ${item.unit} is available`);
            const updated = await tx.storeItem.update({ where: { id: item.id }, data: { qty: after } });
            const material = await tx.material.findFirst({ where: { name: item.materialName } });
            if (material) await tx.material.update({ where: { id: material.id }, data: {
                totalQty: Math.max(0, material.totalQty + delta),
                availableQty: Math.max(0, material.availableQty + delta),
            }});
            const movement = await tx.stockMovement.create({ data: {
                ...movementInput, type,
                qtyBefore: item.qty, qtyAfter: after, direction: incoming ? 'increase' : 'decrease', status: 'posted',
            }});
            await tx.auditLog.create({ data: {
                userId: actor?.userId || null, entity: 'StoreItem', entityId: item.id, action: 'STOCK_POSTED',
                oldValue: { qty: item.qty }, newValue: { qty: after, movementId: movement.id, type },
                description: `${type} ${quantity} ${item.unit} for ${item.materialName}`,
            }});
            return { movement, item: updated, before: item.qty };
        });
        await this.dispatchStockStatus(result.item, result.before, data.storeName, actor?.userId, result.movement.id);
        return result.movement;
    }

    // ── Stock Transfers ──
    findAllTransfers() {
        return this.prisma.stockTransfer.findMany({ orderBy: { requestDate: 'desc' } });
    }

    findTransfer(id: string) {
        return this.prisma.stockTransfer.findUniqueOrThrow({ where: { id } });
    }

    createTransfer(data: any) {
        const ref = `TRF-${Date.now()}`;
        return this.prisma.stockTransfer.create({ data: { ...data, reference: ref } });
    }

    async updateTransfer(id: string, data: any) {
        const transfer = await this.prisma.stockTransfer.findFirst({
            where: { OR: [{ id }, { reference: id }] },
        });
        if (!transfer) throw new BadRequestException('Stock transfer not found');

        const nextStatus = String(data?.status ?? transfer.status).trim().toLowerCase();
        const shouldPost = nextStatus === 'completed' && String(transfer.status).trim().toLowerCase() !== 'completed';
        const shouldRelease = (nextStatus === 'rejected' || nextStatus === 'cancelled')
            && !['completed', 'rejected', 'cancelled'].includes(String(transfer.status).trim().toLowerCase());
        const result = await this.prisma.$transaction(async (tx) => {
            const alerts: any[] = [];
            if (shouldPost) {
                // Atomically claim the completion. A second caller that read the
                // same Pending status cannot post the ledger again after the first
                // transaction commits.
                const claimed = await tx.stockTransfer.updateMany({
                    where: { id: transfer.id, status: transfer.status },
                    data: { status: 'Completing' },
                });
                if (claimed.count === 0) {
                    const current = await tx.stockTransfer.findUniqueOrThrow({ where: { id: transfer.id } });
                    return { updated: current, alerts };
                }
            }
            if (shouldRelease) {
                const lines = Array.isArray(transfer.items) ? transfer.items as any[] : [];
                for (const line of lines) {
                    if (!transfer.fromStoreId || !line.materialRequestRef) continue;
                    const source = await tx.storeItem.findFirst({ where: { storeId: transfer.fromStoreId, materialName: line.materialName } });
                    if (source) await tx.storeItem.update({ where: { id: source.id }, data: { reservedQty: Math.max(0, source.reservedQty - Number(line.qty || 0)) } });
                }
            }
            if (shouldPost) {
                const lines = Array.isArray(transfer.items) ? transfer.items as any[] : [];
                for (const line of lines) {
                    const qty = Number(line.qty);
                    if (!Number.isFinite(qty) || qty <= 0) continue;
                    const source = transfer.fromStoreId
                        ? await tx.storeItem.findFirst({ where: { storeId: transfer.fromStoreId, materialName: line.materialName } })
                        : null;
                    if (!source) throw new BadRequestException(`Insufficient ${line.materialName} in ${transfer.fromStoreName}`);
                    const requestLinked = Boolean(line.materialRequestRef);
                    const available = requestLinked
                        ? Math.min(source.qty, Number(source.reservedQty ?? 0))
                        : Math.max(0, source.qty - Number(source.reservedQty ?? 0));
                    if (available < qty) {
                        throw new BadRequestException(`Only ${available} ${requestLinked ? 'reserved' : 'unreserved'} ${source.unit} is available`);
                    }
                    const sourceAfter = source.qty - qty;
                    const reservedForLine = requestLinked ? qty : 0;
                    const updatedSource = await tx.storeItem.update({ where: { id: source.id }, data: {
                        qty: sourceAfter,
                        reservedQty: Math.max(0, source.reservedQty - reservedForLine),
                    } });
                    await tx.stockMovement.create({ data: {
                        type: 'transfer_out', materialName: line.materialName, unit: line.unit || source.unit, qty,
                        storeName: transfer.fromStoreName, storeId: transfer.fromStoreId, reference: transfer.reference,
                        createdBy: data?.completedBy || transfer.approvedBy || transfer.requestedBy,
                        qtyBefore: source.qty, qtyAfter: sourceAfter, direction: 'decrease', status: 'posted',
                        relatedType: 'StockTransfer', relatedId: transfer.id,
                    }});
                    alerts.push({ item: updatedSource, before: source.qty, storeName: transfer.fromStoreName });

                    if (transfer.toStoreId) {
                        const destination = await tx.storeItem.findFirst({ where: { storeId: transfer.toStoreId, materialName: line.materialName } });
                        if (destination) {
                            const destinationAfter = destination.qty + qty;
                            const updatedDestination = await tx.storeItem.update({ where: { id: destination.id }, data: { qty: destinationAfter } });
                            await tx.stockMovement.create({ data: {
                                type: 'transfer_in', materialName: line.materialName, unit: line.unit || destination.unit, qty,
                                storeName: transfer.toStoreName, storeId: transfer.toStoreId, reference: transfer.reference,
                                createdBy: data?.completedBy || transfer.approvedBy || transfer.requestedBy,
                                qtyBefore: destination.qty, qtyAfter: destinationAfter, direction: 'increase', status: 'posted',
                                relatedType: 'StockTransfer', relatedId: transfer.id,
                            }});
                            alerts.push({ item: updatedDestination, before: destination.qty, storeName: transfer.toStoreName });
                        } else {
                            const createdDestination = await tx.storeItem.create({ data: {
                                storeId: transfer.toStoreId, materialName: line.materialName,
                                category: source.category, unit: line.unit || source.unit, qty,
                                openingQty: qty,
                                unitCost: source.unitCost, lowStockThreshold: null, outOfStockThreshold: null,
                            }});
                            await tx.stockMovement.create({ data: {
                                type: 'transfer_in', materialName: line.materialName, unit: line.unit || source.unit, qty,
                                storeName: transfer.toStoreName, storeId: transfer.toStoreId, reference: transfer.reference,
                                createdBy: data?.completedBy || transfer.approvedBy || transfer.requestedBy,
                                qtyBefore: 0, qtyAfter: qty, direction: 'increase', status: 'posted',
                                relatedType: 'StockTransfer', relatedId: transfer.id,
                            }});
                            alerts.push({ item: createdDestination, before: 0, storeName: transfer.toStoreName });
                        }
                    }
                }
            }
            const updated = await tx.stockTransfer.update({
                where: { id: transfer.id },
                data: {
                    ...(data?.status !== undefined ? { status: data.status } : {}),
                    ...(data?.approvedBy !== undefined ? { approvedBy: data.approvedBy } : {}),
                    ...(data?.notes !== undefined ? { notes: data.notes } : {}),
                    ...(nextStatus === 'completed' && !transfer.completedAt ? { completedAt: new Date() } : {}),
                },
            });
            if (['completed', 'in transit', 'rejected', 'cancelled'].includes(nextStatus)) {
                const requests = await tx.materialRequest.findMany({ where: { OR: [
                    { stockTransferRef: transfer.reference }, { stockTransferRefs: { has: transfer.reference } },
                ] } });
                for (const request of requests) {
                    let status = 'stock_movement_in_progress';
                    if (nextStatus === 'rejected' || nextStatus === 'cancelled') status = 'stock_movement_action_required';
                    if (nextStatus === 'completed') {
                        const refs = request.stockTransferRefs.length ? request.stockTransferRefs : [transfer.reference];
                        const related = await tx.stockTransfer.findMany({ where: { reference: { in: refs } }, select: { reference: true, status: true } });
                        const stockComplete = related.every((candidate) => candidate.status.toLowerCase() === 'completed' || candidate.reference === transfer.reference);
                        const procurementQty = Number((request.fulfillmentPlan as any)?.procurementQty ?? 0);
                        const procurementComplete = request.status === 'procurement_fulfilled_stock_movement_pending';
                        status = stockComplete
                            ? (procurementQty > 0 ? (procurementComplete ? 'fulfilled_via_stock_and_procurement' : 'partially_fulfilled_procurement_pending') : 'fulfilled_via_storefront')
                            : 'stock_movement_in_progress';
                    }
                    await tx.materialRequest.update({ where: { id: request.id }, data: { status, fulfillmentStatus: status } });
                }
            }
            return { updated, alerts };
        });
        for (const alert of result.alerts) await this.dispatchStockStatus(alert.item, alert.before, alert.storeName, undefined, transfer.id);
        return result.updated;
    }

    // ── Material Requests ──
    findAllRequests(status?: string, storeIds?: string[] | null, projectIds?: string[] | null) {
        const scoped = storeIds !== null && storeIds !== undefined || projectIds !== null && projectIds !== undefined;
        const scopeFilters = [
            ...(storeIds?.length ? [{ storeId: { in: storeIds } }] : []),
            ...(projectIds?.length ? [{ projectId: { in: projectIds } }] : []),
        ];
        return this.prisma.materialRequest.findMany({
            where: {
                ...(status ? { status } : {}),
                ...(scoped ? { OR: scopeFilters.length ? scopeFilters : [{ id: { in: [] } }] } : {}),
            },
            orderBy: { requestDate: 'desc' },
        });
    }

    findRequest(id: string) {
        return this.prisma.materialRequest.findUniqueOrThrow({ where: { id } });
    }

    createRequest(data: any) {
        // Honour a client-supplied reference so the numbering configured in
        // Admin is preserved, and so a multi-item request can write its rows
        // under related references. Fall back to a generated value that cannot
        // collide when several rows are created in the same millisecond
        // (Date.now() alone did, breaking the UNIQUE constraint).
        const supplied = String(data?.reference ?? '').trim();
        const reference = supplied || `MRQ-${Date.now()}-${randomUUID().slice(0, 8)}`;
        if (data?.isNewMaterial) {
            if (!String(data?.storeId ?? '').trim() || !String(data?.storeName ?? '').trim()) {
                throw new BadRequestException('Choose the destination store for this material request');
            }
            const imageUrl = String(data?.imageUrl ?? '');
            if (!/^data:image\/(jpeg|png|webp);base64,/i.test(imageUrl)) {
                throw new BadRequestException('A JPG, PNG or WebP material photo is required for a new-material request');
            }
            if (imageUrl.length > 2_800_000) {
                throw new BadRequestException('Material photo must be 2 MB or smaller');
            }
        }
        return this.prisma.materialRequest.create({ data: { ...data, reference } });
    }

    async createRequestBatch(data: any) {
        const items = Array.isArray(data?.items) ? data.items : [];
        if (items.length === 0) throw new BadRequestException('Add at least one material');
        if (!String(data?.storeId ?? '').trim() || !String(data?.storeName ?? '').trim()) {
            throw new BadRequestException('Choose the destination store for this material request');
        }
        const normalized = items.map((item: any) => ({
            materialName: String(item?.materialName ?? '').trim(),
            unit: String(item?.unit ?? '').trim(),
            qty: Number(item?.qty),
            notes: String(item?.notes ?? '').trim() || null,
        }));
        if (normalized.some((item) => !item.materialName || !item.unit || !Number.isFinite(item.qty) || item.qty <= 0)) {
            throw new BadRequestException('Every material requires a name, unit, and quantity greater than zero');
        }
        const keys = normalized.map((item) => item.materialName.toLowerCase());
        if (new Set(keys).size !== keys.length) {
            throw new BadRequestException('The same material cannot be added twice');
        }

        const supplied = String(data?.reference ?? '').trim();
        const baseReference = supplied || `MRQ-${Date.now()}-${randomUUID().slice(0, 8)}`;
        const { items: _items, reference: _reference, ...shared } = data ?? {};
        const created = await this.prisma.$transaction(
            normalized.map((item, index) => this.prisma.materialRequest.create({
                data: {
                    ...shared,
                    ...item,
                    reference: normalized.length === 1 ? baseReference : `${baseReference}/${index + 1}`,
                },
            })),
        );
        return { reference: baseReference, items: created };
    }

    async updateRequest(id: string, data: any) {
        const status = String(data?.status ?? '').toLowerCase();
        if (status === 'approved') {
            return this.approveAndRouteRequest(id, data);
        }
        if (status === 'rejected') {
            const row = await this.prisma.materialRequest.findUniqueOrThrow({ where: { id } });
            const base = baseMaterialRequestRef(row.reference);
            await this.prisma.materialRequest.updateMany({
                where: { OR: [{ reference: base }, { reference: { startsWith: `${base}/` } }] },
                data: {
                    status: 'rejected',
                    fulfillmentStatus: 'rejected',
                    approvedBy: String(data?.approvedBy ?? '').trim() || null,
                    approvedAt: new Date(),
                },
            });
            return this.prisma.materialRequest.findUniqueOrThrow({ where: { id } });
        }
        return this.prisma.materialRequest.update({ where: { id }, data });
    }

    private async approveAndRouteRequest(id: string, data: any) {
        const row = await this.prisma.materialRequest.findUniqueOrThrow({ where: { id } });
        if (Array.isArray(data?.fulfillmentPlans)) {
            return this.approveWithAllocationPlan(row, data);
        }
        const method = String(data?.fulfillmentMethod ?? '').trim().toLowerCase();
        if (method !== 'stock_movement' && method !== 'procurement') {
            throw new BadRequestException('Select either Stock Movement or Procurement before approving');
        }
        if (row.fulfillmentMethod && row.fulfillmentMethod !== method && !(row.fulfillmentMethod === 'mixed' && method === 'procurement')) {
            throw new BadRequestException(`This request is already routed through ${row.fulfillmentMethod}`);
        }
        if (row.fulfillmentMethod === method && method === 'stock_movement') return row;
        if (row.fulfillmentMethod === method && method === 'procurement' && row.prRef) return row;

        const base = baseMaterialRequestRef(row.reference);
        const groupWhere = { OR: [{ reference: base }, { reference: { startsWith: `${base}/` } }] };

        if (method === 'stock_movement') {
            const sourceStoreId = String(data?.sourceStoreId ?? '').trim();
            const sourceStoreName = String(data?.sourceStoreName ?? '').trim();
            if (!sourceStoreId || !sourceStoreName) {
                throw new BadRequestException('Choose the source store for Stock Movement');
            }
            if ((row.storeId && row.storeId === sourceStoreId) || row.storeName.trim().toLowerCase() === sourceStoreName.toLowerCase()) {
                throw new BadRequestException('Source and requesting stores must be different');
            }
            const siblings = await this.prisma.materialRequest.findMany({ where: groupWhere });
            const transferRef = `TRF-${Date.now()}-${randomUUID().slice(0, 6)}`;
            await this.prisma.$transaction(async (tx) => {
                await tx.stockTransfer.create({
                    data: {
                        reference: transferRef,
                        fromStoreId: sourceStoreId,
                        fromStoreName: sourceStoreName,
                        toStoreId: row.storeId,
                        toStoreName: row.storeName,
                        items: siblings.map((item) => ({ materialName: item.materialName, qty: item.qty, unit: item.unit, materialRequestRef: item.reference })),
                        status: 'Pending',
                        requestedBy: row.requestedBy,
                        approvedBy: String(data?.approvedBy ?? '').trim() || null,
                        notes: `Created from ESS Material Request ${base}.`,
                    },
                });
                await tx.materialRequest.updateMany({
                    where: groupWhere,
                    data: {
                        status: 'approved_for_stock_movement',
                        fulfillmentMethod: 'stock_movement',
                        fulfillmentStatus: 'approved_for_stock_movement',
                        sourceStoreId,
                        sourceStoreName,
                        stockTransferRef: transferRef,
                        approvedBy: String(data?.approvedBy ?? '').trim() || null,
                        approvedAt: new Date(),
                    },
                });
            });
            return this.prisma.materialRequest.findUniqueOrThrow({ where: { id } });
        }

        // First approval belongs to Storefront and only forwards the request.
        // A second call, on a request already routed to Procurement, is the
        // independent Procurement approval that may create the Purchase Request.
        if (!row.fulfillmentMethod) {
            await this.prisma.materialRequest.updateMany({
                where: groupWhere,
                data: {
                    status: 'pending_procurement_approval',
                    fulfillmentMethod: 'procurement',
                    fulfillmentStatus: 'pending_procurement_approval',
                    approvedBy: String(data?.approvedBy ?? '').trim() || null,
                    approvedAt: new Date(),
                },
            });
            return this.prisma.materialRequest.findUniqueOrThrow({ where: { id } });
        }

        const siblings = await this.prisma.materialRequest.findMany({ where: groupWhere });
        const procurementRows = siblings.filter((item) => Number((item.fulfillmentPlan as any)?.procurementQty ?? (item.fulfillmentMethod === 'procurement' ? item.qty : 0)) > 0);
        if (procurementRows.length) await this.prisma.materialRequest.updateMany({
            where: { id: { in: procurementRows.map((item) => item.id) } },
            data: { status: 'forwarded_to_procurement', fulfillmentStatus: 'forwarded_to_procurement' },
        });
        const lead = siblings.find((item) => item.reference === base || item.reference === `${base}/1`) ?? siblings[0];
        if (lead) await this.maybeRaisePurchaseRequest(lead);
        return this.prisma.materialRequest.findUniqueOrThrow({ where: { id } });
    }

    private async approveWithAllocationPlan(row: any, data: any) {
        if (row.fulfillmentMethod) throw new BadRequestException('This request has already been routed');
        const base = baseMaterialRequestRef(row.reference);
        const groupWhere = { OR: [{ reference: base }, { reference: { startsWith: `${base}/` } }] };
        const siblings = await this.prisma.materialRequest.findMany({ where: groupWhere, orderBy: { reference: 'asc' } });
        const submitted = new Map<string, any>((data.fulfillmentPlans as any[]).map((plan) => [String(plan.requestId), plan]));
        const plans = siblings.map((request) => {
            const input = submitted.get(request.id);
            if (!input) throw new BadRequestException(`Provide a fulfilment plan for ${request.materialName}`);
            const allocations = (Array.isArray(input.allocations) ? input.allocations : [])
                .map((allocation: any) => ({ storeId: String(allocation.storeId ?? '').trim(), qty: Number(allocation.qty) }))
                .filter((allocation: any) => allocation.storeId && allocation.qty > 0);
            const procurementQty = Number(input.procurementQty ?? 0);
            if (!Number.isFinite(procurementQty) || procurementQty < 0 || allocations.some((allocation: any) => !Number.isFinite(allocation.qty))) {
                throw new BadRequestException(`Invalid quantities for ${request.materialName}`);
            }
            const planned = allocations.reduce((sum: number, allocation: any) => sum + allocation.qty, 0) + procurementQty;
            if (Math.abs(planned - request.qty) > 0.000001) {
                throw new BadRequestException(`${request.materialName} must allocate exactly ${request.qty} ${request.unit}`);
            }
            return { request, allocations, procurementQty };
        });
        const approvedBy = String(data?.approvedBy ?? '').trim() || null;

        await this.prisma.$transaction(async (tx) => {
            const transfers = new Map<string, { store: any; lines: any[] }>();
            for (const plan of plans) {
                for (const allocation of plan.allocations) {
                    if (allocation.storeId === plan.request.storeId) throw new BadRequestException('A requesting store cannot supply itself');
                    const store = await tx.store.findUnique({ where: { id: allocation.storeId } });
                    const item = await tx.storeItem.findFirst({ where: {
                        storeId: allocation.storeId,
                        materialName: { equals: plan.request.materialName, mode: 'insensitive' },
                    } });
                    if (!store || !item) throw new BadRequestException(`${plan.request.materialName} is not stocked in the selected store`);
                    const available = item.qty - item.reservedQty;
                    if (available < allocation.qty) throw new BadRequestException(`Only ${available} ${item.unit} of ${item.materialName} is available in ${store.name}`);
                    await tx.storeItem.update({ where: { id: item.id }, data: { reservedQty: { increment: allocation.qty } } });
                    const transfer = transfers.get(store.id) ?? { store, lines: [] };
                    transfer.lines.push({ materialName: plan.request.materialName, qty: allocation.qty, unit: plan.request.unit, materialRequestRef: plan.request.reference });
                    transfers.set(store.id, transfer);
                }
            }

            const transferRefsByRequest = new Map<string, string[]>();
            for (const { store, lines } of transfers.values()) {
                const reference = `TRF-${Date.now()}-${randomUUID().slice(0, 6)}`;
                await tx.stockTransfer.create({ data: {
                    reference, fromStoreId: store.id, fromStoreName: store.name,
                    toStoreId: row.storeId, toStoreName: row.storeName, items: lines,
                    status: 'Pending', requestedBy: row.requestedBy, approvedBy,
                    notes: `Created from ESS Material Request ${base}.`,
                } });
                for (const line of lines) {
                    const refs = transferRefsByRequest.get(line.materialRequestRef) ?? [];
                    refs.push(reference);
                    transferRefsByRequest.set(line.materialRequestRef, refs);
                }
            }

            for (const plan of plans) {
                const refs = transferRefsByRequest.get(plan.request.reference) ?? [];
                const hasStock = plan.allocations.length > 0;
                const hasProcurement = plan.procurementQty > 0;
                const method = hasStock && hasProcurement ? 'mixed' : hasStock ? 'stock_movement' : 'procurement';
                const status = hasProcurement
                    ? (hasStock ? 'partially_reserved_pending_procurement_approval' : 'pending_procurement_approval')
                    : 'approved_for_stock_movement';
                const allocations = plan.allocations.map((allocation: any) => {
                    const store = transfers.get(allocation.storeId)!.store;
                    return { ...allocation, storeName: store.name };
                });
                await tx.materialRequest.update({ where: { id: plan.request.id }, data: {
                    status, fulfillmentMethod: method, fulfillmentStatus: status,
                    fulfillmentPlan: { allocations, procurementQty: plan.procurementQty },
                    stockTransferRef: refs[0] ?? null, stockTransferRefs: refs,
                    approvedBy, approvedAt: new Date(),
                } });
            }
        }, { isolationLevel: 'Serializable' });
        return this.prisma.materialRequest.findUniqueOrThrow({ where: { id: row.id } });
    }

    /**
     * Raises a Purchase Request for an approved Material Request, once per
     * request group.
     *
     * A multi-item Material Request is stored as sibling `<ref>/<n>` rows, so
     * this is guarded two ways to create exactly one PR: only the lead row acts,
     * and it no-ops if any sibling already carries a `prRef`. The new PR opens in
     * `not_raised` — the approval already happened at the Material Request level,
     * so it needs no further approval, only to be raised to suppliers.
     */
    private async maybeRaisePurchaseRequest(row: {
        reference: string;
        prRef?: string | null;
        projectName?: string | null;
        projectId?: string | null;
        requestedBy?: string | null;
    }) {
        const base = baseMaterialRequestRef(row.reference);
        // Only the lead row of a group raises the PR, so siblings approved in the
        // same batch cannot each create one.
        const isLead = row.reference === base || row.reference === `${base}/1`;
        if (!isLead) return;

        const siblings = await this.prisma.materialRequest.findMany({
            where: { OR: [{ reference: base }, { reference: { startsWith: `${base}/` } }] },
        });
        // Idempotent: a PR already exists for this request.
        if (siblings.some((s) => s.prRef)) return;

        const items = siblings.map((s) => ({
            description: s.materialName,
            material: s.materialName,
            qty: Number((s.fulfillmentPlan as any)?.procurementQty ?? s.qty),
            unit: s.unit,
            unitPrice: 0,
        })).filter((item) => item.qty > 0);
        if (items.length === 0) return;

        const pr = await this.procurementRequests.createPR({
            title: `${row.projectName ?? 'Procurement'} — ${base}`,
            projectId: row.projectId ?? null,
            projectName: row.projectName ?? null,
            requestedBy: row.requestedBy ?? 'System',
            status: 'not_raised',
            procurementType: 'rfq',
            suppliers: [],
            mrRef: base,
            items,
            notes: `Automatically raised from approved Material Request ${base}.`,
        });

        // Backlink and move every row of the group into procurement. createPR
        // only backlinks the exact base reference, which misses the `<ref>/<n>`
        // rows, so the whole group is updated here.
        const procuredIds = siblings
            .filter((s) => Number((s.fulfillmentPlan as any)?.procurementQty ?? (s.fulfillmentMethod === 'procurement' ? s.qty : 0)) > 0)
            .map((s) => s.id);
        await this.prisma.materialRequest.updateMany({
            where: { id: { in: procuredIds } },
            data: { prRef: pr.prRef, status: 'forwarded_to_procurement', fulfillmentStatus: 'forwarded_to_procurement' },
        });
        return pr;
    }

    // ── Material Returns ──
    findAllReturns(status?: string) {
        return this.prisma.materialReturn.findMany({
            where: status ? { status } : {},
            orderBy: { requestDate: 'desc' },
        });
    }

    findReturn(id: string) {
        return this.prisma.materialReturn.findUniqueOrThrow({ where: { id } });
    }

    createReturn(data: any) {
        const ref = `RET-${Date.now()}`;
        return this.prisma.materialReturn.create({ data: { ...data, reference: ref } });
    }

    async updateReturn(id: string, data: any) {
        const existing = await this.prisma.materialReturn.findUniqueOrThrow({ where: { id } });
        const next = String(data?.status ?? existing.status).toLowerCase();
        const shouldPost = next === 'received' && String(existing.status).toLowerCase() !== 'received';
        if (!shouldPost) return this.prisma.materialReturn.update({ where: { id }, data });
        const result = await this.prisma.$transaction(async (tx) => {
            const toStore = await tx.store.findFirst({ where: { name: existing.toStoreName } });
            if (!toStore) throw new BadRequestException(`Store "${existing.toStoreName}" was not found`);
            let item = await tx.storeItem.findFirst({ where: { storeId: toStore.id, materialName: existing.materialName } });
            const before = item?.qty ?? 0;
            if (item) item = await tx.storeItem.update({ where: { id: item.id }, data: { qty: item.qty + existing.qty } });
            else {
                const material = await tx.material.findFirst({ where: { name: existing.materialName } });
                item = await tx.storeItem.create({ data: {
                    storeId: toStore.id, materialName: existing.materialName, category: material?.category ?? 'General',
                    unit: existing.unit, qty: existing.qty, unitCost: material?.unitCost ?? 0,
                    openingQty: existing.qty,
                    lowStockThreshold: null, outOfStockThreshold: null,
                }});
            }
            await tx.stockMovement.create({ data: {
                type: 'return', materialName: existing.materialName, unit: existing.unit, qty: existing.qty,
                storeName: existing.toStoreName, storeId: toStore.id, reference: existing.reference,
                createdBy: data?.receivedBy || existing.approvedBy || existing.requestedBy,
                qtyBefore: before, qtyAfter: item.qty, direction: 'increase', status: 'posted',
                relatedType: 'MaterialReturn', relatedId: existing.id,
            }});
            const catalogue = await tx.material.findFirst({ where: { name: existing.materialName } });
            if (catalogue) await tx.material.update({ where: { id: catalogue.id }, data: {
                totalQty: catalogue.totalQty + existing.qty,
                availableQty: catalogue.availableQty + existing.qty,
            }});
            const updated = await tx.materialReturn.update({ where: { id }, data });
            return { updated, item, before };
        });
        await this.dispatchStockStatus(result.item, result.before, existing.toStoreName, undefined, existing.id);
        return result.updated;
    }

    findAmendments(status?: string) {
        return this.prisma.materialAmendment.findMany({
            where: status ? { status } : {}, orderBy: { createdAt: 'desc' },
        });
    }

    async decideAmendment(id: string, decision: 'approved' | 'rejected', actor?: { userId?: string; name?: string; email?: string }) {
        const amendment = await this.prisma.materialAmendment.findUniqueOrThrow({ where: { id } });
        if (amendment.status !== 'pending') throw new BadRequestException('This amendment has already been decided');
        const reviewer = actor?.name || actor?.email || 'Unknown reviewer';
        let stockAlert: { item: any; before: number; storeName: string; movementId: string } | null = null;
        const result = await this.prisma.$transaction(async (tx) => {
            if (decision === 'approved') {
                const values = amendment.proposedValue as Record<string, any>;
                if (amendment.entityType === 'Material') {
                    const { totalQty, availableQty, reservedQty, ...safe } = values;
                    await tx.material.update({ where: { id: amendment.entityId }, data: safe });
                } else if (amendment.entityType === 'StoreItem') {
                    const { qty, ...safe } = values;
                    await tx.storeItem.update({ where: { id: amendment.entityId }, data: safe });
                } else if (amendment.entityType === 'StockAdjustment') {
                    const values = amendment.proposedValue as Record<string, any>;
                    const item = await tx.storeItem.findUniqueOrThrow({ where: { id: amendment.entityId } });
                    const delta = Number(values.quantity) * (values.direction === 'decrease' ? -1 : 1);
                    const after = item.qty + delta;
                    const unreserved = Math.max(0, item.qty - Number(item.reservedQty ?? 0));
                    if (values.direction === 'decrease' && Number(values.quantity) > unreserved) {
                        throw new BadRequestException(`Only ${unreserved} unreserved ${item.unit} is available`);
                    }
                    const updatedItem = await tx.storeItem.update({ where: { id: item.id }, data: { qty: after } });
                    const material = await tx.material.findFirst({ where: { name: item.materialName } });
                    if (material) await tx.material.update({ where: { id: material.id }, data: {
                        totalQty: Math.max(0, material.totalQty + delta),
                        availableQty: Math.max(0, material.availableQty + delta),
                    }});
                    await tx.stockMovement.update({ where: { id: values.movementId }, data: { qtyAfter: after, status: 'posted' } });
                    stockAlert = { item: updatedItem, before: item.qty, storeName: amendment.storeName ?? '', movementId: values.movementId };
                }
            } else if (amendment.entityType === 'StockAdjustment') {
                const values = amendment.proposedValue as Record<string, any>;
                await tx.stockMovement.update({ where: { id: values.movementId }, data: { status: 'rejected' } });
            }
            const decided = await tx.materialAmendment.update({ where: { id }, data: {
                status: decision, reviewedBy: reviewer, reviewedById: actor?.userId || null,
                reviewedAt: new Date(),
            }});
            await tx.auditLog.create({ data: {
                userId: actor?.userId || null, entity: amendment.entityType, entityId: amendment.entityId,
                action: decision === 'approved' ? 'AMENDMENT_APPROVED' : 'AMENDMENT_REJECTED',
                oldValue: amendment.oldValue as any, newValue: amendment.proposedValue as any,
                description: `${amendment.materialName} amendment ${decision} by ${reviewer}`,
            }});
            return decided;
        });
        if (stockAlert) await this.dispatchStockStatus(stockAlert.item, stockAlert.before, stockAlert.storeName, actor?.userId, stockAlert.movementId);
        return result;
    }

    private async recordAudit(entity: string, entityId: string, action: string, oldValue: any, newValue: any, actor?: { userId?: string }, reason?: unknown) {
        await this.prisma.auditLog.create({ data: {
            userId: actor?.userId || null, entity, entityId, action,
            oldValue: oldValue as any, newValue: newValue as any,
            description: String(reason ?? '').trim() || `${entity} amendment requested`,
        }});
    }

    private stockState(qty: number, low: number, out: number) {
        if (qty <= out) return 'out_of_stock';
        if (qty <= low) return 'low_stock';
        return 'in_stock';
    }

    private async dispatchStockStatus(item: any, beforeQty: number, storeName: string, actorUserId?: string, relatedId?: string) {
        const hydrated = (await this.withEffectiveThresholds([item]))[0] as any;
        const low = Number(hydrated.reorderLevel ?? 0);
        const out = Number(hydrated.outOfStockLevel ?? 0);
        const before = this.stockState(beforeQty, low, out);
        const after = this.stockState(Number(item.qty), low, out);
        await this.prisma.storeItem.update({ where: { id: item.id }, data: { alertState: after } });
        if (before === after) return;
        const event = after === 'low_stock' ? 'stock.low' : after === 'out_of_stock' ? 'stock.out' : 'stock.restored';
        const label = after === 'low_stock' ? 'Low stock' : after === 'out_of_stock' ? 'Out of stock' : 'Stock restored';
        void this.notifications.dispatch(event, {
            title: `${label}: ${item.materialName}`,
            message: `${storeName} now has ${item.qty} ${item.unit} (low ${low}, out ${out}).`,
            actionUrl: '/apps/storefront/stock-levels', relatedId: relatedId || item.id, relatedType: 'StoreItem',
            actorUserId, vars: { storeId: item.storeId, storeName, materialName: item.materialName, store_name: storeName, material_name: item.materialName, quantity: item.qty, unit: item.unit, lowThreshold: low, outThreshold: out },
        });
    }
}
