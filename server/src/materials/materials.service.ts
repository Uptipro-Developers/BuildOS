import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ProcurementRequestsService } from '../procurement-requests/procurement-requests.service';

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
    ) { }

    // ── Materials ──
    findAllMaterials(search?: string, category?: string) {
        return this.prisma.material.findMany({
            where: {
                ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
                ...(category && category !== 'All' ? { category } : {}),
            },
            // The All Materials table expands a row into its catalogue Types,
            // so every row needs them alongside the Material's own rollup.
            include: { types: { orderBy: { name: 'asc' } } },
            orderBy: { name: 'asc' },
        });
    }

    findMaterial(id: string) {
        return this.prisma.material.findUniqueOrThrow({ where: { id } });
    }

    createMaterial(data: any) {
        return this.prisma.material.create({ data });
    }

    updateMaterial(id: string, data: any) {
        return this.prisma.material.update({ where: { id }, data });
    }

    deleteMaterial(id: string) {
        return this.prisma.material.delete({ where: { id } });
    }

    // ── Stores ──
    findAllStores(type?: string) {
        return this.prisma.store.findMany({
            where: type ? { type } : {},
            include: { storeItems: true },
            orderBy: { name: 'asc' },
        });
    }

    findStore(id: string) {
        return this.prisma.store.findUniqueOrThrow({
            where: { id },
            include: { storeItems: true },
        });
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
    findAllStoreItems() {
        return this.prisma.storeItem.findMany({
            orderBy: { materialName: 'asc' },
        });
    }

    findStoreItems(storeId: string) {
        return this.prisma.storeItem.findMany({
            where: { storeId },
            orderBy: { materialName: 'asc' },
        });
    }

    createStoreItem(data: any) {
        return this.prisma.storeItem.create({ data });
    }

    updateStoreItem(id: string, data: any) {
        return this.prisma.storeItem.update({ where: { id }, data });
    }

    deleteStoreItem(id: string) {
        return this.prisma.storeItem.delete({ where: { id } });
    }

    // ── Stock Movements ──
    findAllMovements(storeId?: string) {
        return this.prisma.stockMovement.findMany({
            where: storeId ? { storeId } : {},
            orderBy: { date: 'desc' },
        });
    }

    createMovement(data: any) {
        return this.prisma.stockMovement.create({ data });
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

    updateTransfer(id: string, data: any) {
        return this.prisma.stockTransfer.update({ where: { id }, data });
    }

    // ── Material Requests ──
    findAllRequests(status?: string) {
        return this.prisma.materialRequest.findMany({
            where: status ? { status } : {},
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
        return this.prisma.materialRequest.create({ data: { ...data, reference } });
    }

    updateRequest(id: string, data: any) {
        return this.prisma.materialRequest.update({ where: { id }, data }).then(async (row) => {
            // Approval is the trigger for procurement: an approved Material
            // Request automatically raises a Purchase Request. This replaces the
            // old manual "Raise Purchase Request" button, so the workflow moves
            // itself forward rather than waiting on a second click.
            if (String(data?.status ?? '').toLowerCase() === 'approved') {
                await this.maybeRaisePurchaseRequest(row).catch(() => undefined);
            }
            return row;
        });
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
            qty: s.qty,
            unit: s.unit,
            unitPrice: 0,
        }));

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
        await this.prisma.materialRequest.updateMany({
            where: { OR: [{ reference: base }, { reference: { startsWith: `${base}/` } }] },
            data: { prRef: pr.prRef, status: 'in_procurement' },
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

    updateReturn(id: string, data: any) {
        return this.prisma.materialReturn.update({ where: { id }, data });
    }
}
