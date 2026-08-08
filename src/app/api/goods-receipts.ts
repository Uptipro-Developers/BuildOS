import { apiFetch } from './client';

export interface GoodsReceiptItem {
    id: string;
    material: string;
    unit: string;
    ordered: number;
    received: number;
    accepted: number;
    rejected: number;
    reason?: string | null;
}

export interface GoodsReceipt {
    id: string;
    reference: string;
    purchaseOrderId: string;
    poRef?: string | null;
    mrRef?: string | null;
    supplierName: string;
    storeId?: string | null;
    storeName: string;
    deliveryNote?: string | null;
    receivedBy: string;
    receivedDate: string;
    status: string;
    notes?: string | null;
    stockPostedAt?: string | null;
    items: GoodsReceiptItem[];
}

export interface ReceiveGoodsPayload {
    storeId?: string;
    storeName: string;
    deliveryNote?: string;
    receivedBy?: string;
    notes?: string;
    items: {
        material: string;
        unit?: string;
        ordered?: number;
        received: number;
        accepted?: number;
        rejected?: number;
        reason?: string;
    }[];
}

export const getGoodsReceipts = (status?: string) =>
    apiFetch<GoodsReceipt[]>(status ? `/goods-receipts?status=${status}` : '/goods-receipts');

export const getGoodsReceipt = (id: string) =>
    apiFetch<GoodsReceipt>(`/goods-receipts/${id}`);

/** Opens a receipt against an order confirmed before receipts were stored. */
export const openGoodsReceipt = (purchaseOrderId: string) =>
    apiFetch<GoodsReceipt>('/goods-receipts', {
        method: 'POST',
        body: JSON.stringify({ purchaseOrderId }),
    });

/** Records the delivery and posts the accepted quantities to stock. */
export const receiveGoods = (id: string, payload: ReceiveGoodsPayload) =>
    apiFetch<GoodsReceipt>(`/goods-receipts/${id}/receive`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

export const rejectGoodsReceipt = (id: string, reason?: string) =>
    apiFetch<GoodsReceipt>(`/goods-receipts/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    });
