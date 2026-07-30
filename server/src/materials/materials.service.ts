import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/** Must match the key AdminExtrasService writes its settings row under. */
const ADMIN_SETTINGS_KEY = 'admin-settings';

@Injectable()
export class MaterialsService {
    constructor(private prisma: PrismaService) { }

    // ── Materials ──
    findAllMaterials(search?: string, category?: string) {
        return this.prisma.material.findMany({
            where: {
                ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
                ...(category && category !== 'All' ? { category } : {}),
            },
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
        return this.prisma.materialRequest.update({ where: { id }, data });
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
