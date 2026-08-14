import { apiFetch } from './client';
import { formatDateByGeneralSettings } from '../utils/generalSettings';

function fmt(date: string | null) {
    if (!date) return '';
    return formatDateByGeneralSettings(date);
}

export function mapPO(p: any) {
    return {
        id: p.id,
        // The order's own reference. Every screen used to show `p.id` — a cuid —
        // under a heading that said "PO ID", because nothing stored the
        // reference the award screen allocated.
        poRef: p.poRef ?? p.id,
        prRef: p.prRef ?? '',
        mrRef: p.mrRef ?? '',
        quoteRef: p.quoteRef ?? '',
        supplierId: p.supplierId ?? p.supplier?.id ?? '',
        supplier: p.supplier?.name ?? '',
        supplierEmail: p.supplier?.email ?? '',
        supplierContact: p.supplier?.contactPerson
            ? `${p.supplier.contactPerson}${p.supplier.phone ? ' — ' + p.supplier.phone : ''}`
            : '',
        status: p.status,
        sentToFinance: p.sentToFinance ?? false,
        financeRef: p.financeRef ?? '',
        declineReason: p.declineReason ?? '',
        paymentTermId: p.paymentTermId ?? '',
        deliverySplit: p.deliverySplit ?? '',
        signatories: (p.signatories ?? []) as { id: string; name: string; role: string; signature?: string | null }[],
        // What the file-icon "Preview PO" re-render shows — set once, at
        // creation, so it doesn't drift if the real term is later edited or
        // deleted in Settings (and works at all for a custom, unsaved term).
        paymentTermSnapshot: (p.paymentTermSnapshot ?? {}) as {
            name?: string;
            description?: string;
            deliverySplit?: string;
            tranches?: { title: string; percent: number; timing: string }[];
        },
        createdBy: p.createdBy ?? '',
        createdDate: fmt(p.createdDate ?? p.createdAt),
        expectedDate: fmt(p.expectedDate),
        sentToFinanceAt: fmt(p.sentToFinanceAt),
        financeDecidedAt: fmt(p.financeDecidedAt),
        paidAt: fmt(p.paidAt),
        confirmedAt: fmt(p.confirmedAt),
        totalItems: p.items?.length ?? 0,
        totalValue: p.totalValue ?? 0,
        receivedValue: p.receivedValue ?? 0,
        items: (p.items ?? []).map((i: any) => ({
            material: i.material,
            qty: i.qty,
            unit: i.unit,
            unitCost: i.unitCost,
            received: i.received ?? 0,
        })),
    };
}

export type MappedPurchaseOrder = ReturnType<typeof mapPO>;

export async function fetchPurchaseOrders(params?: { status?: string; supplierId?: string }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.supplierId) qs.set('supplierId', params.supplierId);
    const query = qs.toString() ? `?${qs}` : '';
    const data = await apiFetch<any[]>(`/purchase-orders${query}`);
    return data.map(mapPO);
}

export function createPurchaseOrder(data: any) {
    return apiFetch(`/purchase-orders`, { method: 'POST', body: JSON.stringify(data) });
}

export function updatePurchaseOrder(id: string, data: any) {
    return apiFetch(`/purchase-orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

/**
 * The workflow transitions.
 *
 * These were `setState` calls on the Purchase Orders page: the order advanced in
 * the browser, nothing was written, a refresh undid it, and Finance never heard
 * about any of it. Each is now the endpoint that actually performs the step, and
 * the server refuses one taken out of order.
 */
export function sendPOToFinance(
    id: string,
    actor?: string,
    paymentTermId?: string,
    deliverySplit?: string,
) {
    return apiFetch<any>(`/purchase-orders/${id}/send-to-finance`, {
        method: 'POST',
        body: JSON.stringify({ actor, paymentTermId, deliverySplit }),
    }).then(mapPO);
}

/**
 * "Save and Preview PO" in the wizard — what actually turns a draft into a
 * real purchase order: saves the term/signatories, moves it to `po_created`,
 * and opens its goods receipt immediately, regardless of payment timing.
 */
export function createPO(
    id: string,
    data: {
        paymentTermId?: string;
        deliverySplit?: string;
        signatories?: { id: string; name: string; role: string; signature?: string | null }[];
        paymentTermSnapshot?: {
            name: string;
            description: string;
            deliverySplit: string;
            tranches: { title: string; percent: number; timing: string }[];
        };
    },
) {
    return apiFetch<any>(`/purchase-orders/${id}/create-po`, {
        method: 'POST',
        body: JSON.stringify(data),
    }).then(mapPO);
}

export function requestPaymentConfirmation(id: string) {
    return apiFetch<any>(`/purchase-orders/${id}/request-payment-confirmation`, {
        method: 'POST',
    }).then(mapPO);
}

export function confirmPOPayment(id: string) {
    return apiFetch<any>(`/purchase-orders/${id}/confirm-payment`, { method: 'POST' }).then(mapPO);
}

/**
 * Cancels the order. Deleting one takes the quote it was awarded from, the
 * invoice Finance raised against it and the payment with it, which is why there
 * is no delete action on this page any more.
 */
export function cancelPurchaseOrder(id: string, reason?: string) {
    return apiFetch<any>(`/purchase-orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    }).then(mapPO);
}

export function deletePurchaseOrder(id: string) {
    return apiFetch(`/purchase-orders/${id}`, { method: 'DELETE' });
}
