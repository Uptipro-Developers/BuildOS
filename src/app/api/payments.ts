import { apiFetch } from './client';
import { formatDateByGeneralSettings } from '../utils/generalSettings';

const statusMap: Record<string, string> = {
    ApprovedRequest: 'Approved Request',
    SentToFinance: 'Sent to Finance',
    PaymentInitiated: 'Payment Initiated',
    PaymentCompleted: 'Payment Completed',
};

function fmt(date: string | null) {
    if (!date) return '';
    return formatDateByGeneralSettings(date);
}

function mapPayment(p: any) {
    return {
        id: p.id,
        type: p.type,
        reference: p.reference ?? '',
        recipient: p.recipient ?? '',
        amount: p.amount ?? 0,
        method: p.method ?? '',
        bank: p.bank,
        date: fmt(p.date ?? p.createdAt),
        status: statusMap[p.status] ?? p.status,
        initiatedBy: p.initiatedBy,
        completedAt: fmt(p.completedAt),
        note: p.note,
    };
}

export function createPayment(data: any) {
    return apiFetch(`/payments`, { method: 'POST', body: JSON.stringify(data) });
}

export function initiatePayment(id: string) {
    return apiFetch(`/payments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'PaymentInitiated', initiatedAt: new Date().toISOString() }),
    });
}

export function completePayment(id: string) {
    return apiFetch(`/payments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'PaymentCompleted', completedAt: new Date().toISOString() }),
    });
}

export function updatePayment(id: string, data: any) {
    return apiFetch(`/payments/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deletePayment(id: string) {
    return apiFetch(`/payments/${id}`, { method: 'DELETE' });
}

export async function fetchPayments(params?: { status?: string; type?: string }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.type) qs.set('type', params.type);
    const query = qs.toString() ? `?${qs}` : '';
    const data = await apiFetch<any[]>(`/payments${query}`);
    return data.map(mapPayment);
}
