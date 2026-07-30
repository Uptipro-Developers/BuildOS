import { apiFetch } from './client';
import { formatDateByGeneralSettings } from '../utils/generalSettings';

const statusMap: Record<string, string> = {
    SentToFinance: 'Sent to Finance',
};

/**
 * Dates are formatted for display here, using the configured format.
 *
 * These API clients used to hardcode `en-US` month-day-year, which meant the date
 * format chosen in Admin → General Settings had no effect on anything they
 * returned — the raw value was already gone by the time the UI saw it.
 */
function fmt(date: string | null) {
    if (!date) return '';
    return formatDateByGeneralSettings(date);
}

function mapExpense(e: any) {
    return {
        id: e.id,
        project: e.project?.name ?? '',
        category: e.category ?? '',
        amount: e.amount ?? 0,
        description: e.description ?? '',
        createdBy: e.createdBy ?? '',
        date: fmt(e.date ?? e.createdAt),
        status: statusMap[e.status] ?? e.status,
        receipt: e.receipt,
        approvedBy: e.approvedBy,
        approvedAt: fmt(e.approvedAt),
        rejectedBy: e.rejectedBy,
        rejectedAt: fmt(e.rejectedAt),
        rejectionReason: e.rejectionReason,
    };
}

export async function fetchExpenses(params?: { status?: string; projectId?: string }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.projectId) qs.set('projectId', params.projectId);
    const query = qs.toString() ? `?${qs}` : '';
    const data = await apiFetch<any[]>(`/expenses${query}`);
    return data.map(mapExpense);
}

export function createExpense(data: any) {
    return apiFetch(`/expenses`, { method: 'POST', body: JSON.stringify(data) });
}

export function updateExpense(id: string, data: any) {
    return apiFetch(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function approveExpense(id: string, notes?: string) {
    return apiFetch(`/expenses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Approved', approvedAt: new Date().toISOString(), notes }),
    });
}

export function rejectExpense(id: string, reason?: string) {
    return apiFetch(`/expenses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Rejected', rejectionReason: reason }),
    });
}

export function deleteExpense(id: string) {
    return apiFetch(`/expenses/${id}`, { method: 'DELETE' });
}
