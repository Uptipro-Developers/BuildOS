import { apiFetch } from './client';
import { formatDateByGeneralSettings } from '../utils/generalSettings';

function fmt(date: string | null) {
    if (!date) return '';
    return formatDateByGeneralSettings(date);
}

function mapIncome(i: any) {
    return {
        id: i.id,
        source: i.source ?? '',
        project: i.project?.name ?? '',
        amount: i.amount ?? 0,
        description: i.description ?? '',
        date: fmt(i.date ?? i.createdAt),
        status: i.status,
        receivedBy: i.receivedBy,
    };
}

export async function fetchIncome(params?: { status?: string; projectId?: string }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.projectId) qs.set('projectId', params.projectId);
    const query = qs.toString() ? `?${qs}` : '';
    const data = await apiFetch<any[]>(`/income${query}`);
    return data.map(mapIncome);
}

export function createIncome(data: any) {
    return apiFetch(`/income`, { method: 'POST', body: JSON.stringify(data) });
}

export function updateIncome(id: string, data: any) {
    return apiFetch(`/income/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteIncome(id: string) {
    return apiFetch(`/income/${id}`, { method: 'DELETE' });
}
