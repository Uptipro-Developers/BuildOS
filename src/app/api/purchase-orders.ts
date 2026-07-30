import { apiFetch } from './client';
import { formatDateByGeneralSettings } from '../utils/generalSettings';

function fmt(date: string | null) {
    if (!date) return '';
    return formatDateByGeneralSettings(date);
}

function mapPO(p: any) {
    return {
        id: p.id,
        prRef: p.prRef ?? '',
        mrRef: p.mrRef ?? '',
        supplier: p.supplier?.name ?? '',
        supplierContact: p.supplier?.contactPerson
            ? `${p.supplier.contactPerson}${p.supplier.phone ? ' — ' + p.supplier.phone : ''}`
            : '',
        status: p.status,
        paymentStatus: p.paymentStatus,
        sentToFinance: p.sentToFinance ?? false,
        financeRef: p.financeRef,
        createdBy: p.createdBy ?? '',
        createdDate: fmt(p.createdDate ?? p.createdAt),
        expectedDate: fmt(p.expectedDate),
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

export function approvePO(id: string) {
    return apiFetch(`/purchase-orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'confirmed' }),
    });
}

export function deletePurchaseOrder(id: string) {
    return apiFetch(`/purchase-orders/${id}`, { method: 'DELETE' });
}
