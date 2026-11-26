import { apiFetch } from './client';

export interface GoodsReceiptItem {
    id: string;
    material: string;
    unit: string;
    ordered: number;
    /** Cumulative totals across every accepted pass. */
    received: number;
    accepted: number;
    rejected: number;
    reason?: string | null;
    /** This pass's not-yet-decided quantities, set by Update Record. */
    pendingReceived?: number | null;
    pendingAccepted?: number | null;
    pendingRejected?: number | null;
    pendingReason?: string | null;
}

export interface GoodsReceiptTranche {
    title: string;
    percent: number;
    timing: string;
}

export interface GoodsReceiptPO {
    id: string;
    poRef?: string | null;
    deliverySplit?: string | null;
    paymentTermSnapshot?: {
        name?: string;
        description?: string;
        deliverySplit?: string;
        tranches?: GoodsReceiptTranche[];
    } | null;
    sentToFinance?: boolean;
    financeRef?: string | null;
    supplier?: { email?: string | null } | null;
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
    purchaseOrder?: GoodsReceiptPO | null;
    /** Legacy compatibility field; GRNs no longer require approval. */
    canDecide?: boolean;
}

export interface UpdateRecordPayload {
    storeId?: string;
    storeName: string;
    deliveryNote?: string;
    receivedBy?: string;
    notes?: string;
    items: {
        material: string;
        unit?: string;
        received: number;
        accepted?: number;
        rejected?: number;
        reason?: string;
    }[];
}

export const getGoodsReceipts = (status?: string) =>
    apiFetch<GoodsReceipt[]>(status ? `/goods-receipts?status=${status}` : '/goods-receipts');

export const getGoodsReceipt = (id: string) => apiFetch<GoodsReceipt>(`/goods-receipts/${id}`);

/** Records the delivery and immediately posts its accepted quantities to stock. */
export const updateGoodsReceiptRecord = (id: string, payload: UpdateRecordPayload) =>
    apiFetch<GoodsReceipt>(`/goods-receipts/${id}/update-record`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

/** Posts a legacy receipt that was left pending before automatic posting. */
export const acceptGoodsReceipt = (id: string) =>
    apiFetch<GoodsReceipt>(`/goods-receipts/${id}/accept`, { method: 'POST' });

/** Sends a pending record back for correction. */
export const raiseGoodsReceiptRejectionNote = (id: string, reason: string) =>
    apiFetch<GoodsReceipt>(`/goods-receipts/${id}/raise-rejection-note`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    });

/** Rejects the whole delivery before anything has been recorded. */
export const rejectGoodsReceipt = (id: string, reason?: string) =>
    apiFetch<GoodsReceipt>(`/goods-receipts/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    });

/** Raises the invoice for what has been accepted so far and hands the order to Finance. */
export const sendGoodsReceiptToFinance = (id: string) =>
    apiFetch<GoodsReceipt>(`/goods-receipts/${id}/send-to-finance`, { method: 'POST' });

export const notifyGoodsReceiptSupplier = (
    id: string,
    payload: { email: string; subject?: string; message: string },
) =>
    apiFetch<GoodsReceipt>(`/goods-receipts/${id}/notify-supplier`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
