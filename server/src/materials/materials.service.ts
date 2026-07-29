import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

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

    createStore(data: any) {
        return this.prisma.store.create({ data });
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
