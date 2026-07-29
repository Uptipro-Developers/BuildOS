import { apiFetch } from './client';
import type { Accrual, AccrualLine, AccrualStatus, AccrualTypeConfig } from '../pages/finance/types';

/** yyyy-mm-dd, the shape the date inputs and list rendering expect. */
function toDateInput(value: string | Date | null | undefined): string {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function mapAccrual(a: any): Accrual {
    return {
        id: a.id,
        type: a.type,
        title: a.title,
        description: a.description ?? '',
        lines: (a.lines ?? []).map(
            (l: any): AccrualLine => ({
                id: l.id,
                account: l.account ?? '',
                description: l.description ?? '',
                debit: l.debit ?? 0,
                credit: l.credit ?? 0,
            }),
        ),
        amount: a.amount ?? 0,
        status: (a.status ?? 'draft') as AccrualStatus,
        approvalStatus: a.approvalStatus ?? 'draft',
        approvalSteps: Array.isArray(a.approvalSteps) ? a.approvalSteps : [],
        createdAt: toDateInput(a.createdAt),
        createdBy: a.createdBy ?? '',
        reversalDate: toDateInput(a.reversalDate),
        reversedAt: a.reversedAt ? toDateInput(a.reversedAt) : undefined,
        reversedAmount: a.reversedAmount ?? undefined,
        reference: a.reference ?? '',
        sourceModule: a.sourceModule ?? '',
        sourceRef: a.sourceRef ?? '',
        fiscalYearId: a.fiscalYearId ?? '',
        notes: a.notes ?? undefined,
    };
}

export interface AccrualInput {
    reference?: string;
    type: string;
    title: string;
    description?: string;
    createdBy?: string;
    reversalDate?: string;
    sourceModule?: string;
    sourceRef?: string;
    fiscalYearId?: string;
    notes?: string;
    status?: string;
    approvalStatus?: string;
    lines: { account: string; description?: string; debit: number; credit: number }[];
}

export async function fetchAccruals(params?: { status?: string; fiscalYearId?: string }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.fiscalYearId) qs.set('fiscalYearId', params.fiscalYearId);
    const query = qs.toString() ? `?${qs}` : '';
    const data = await apiFetch<any[]>(`/accruals${query}`);
    return data.map(mapAccrual);
}

export async function createAccrual(data: AccrualInput) {
    return mapAccrual(
        await apiFetch<any>('/accruals', { method: 'POST', body: JSON.stringify(data) }),
    );
}

export async function updateAccrual(id: string, data: Partial<AccrualInput>) {
    return mapAccrual(
        await apiFetch<any>(`/accruals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    );
}

export function deleteAccrual(id: string) {
    return apiFetch<void>(`/accruals/${id}`, { method: 'DELETE' });
}

/** Omit `amount` to reverse the whole outstanding balance. */
export async function reverseAccrual(id: string, amount?: number, reversedAt?: string) {
    return mapAccrual(
        await apiFetch<any>(`/accruals/${id}/reverse`, {
            method: 'POST',
            body: JSON.stringify({ amount, reversedAt }),
        }),
    );
}

export async function approveAccrual(id: string, actedBy?: string, comment?: string) {
    return mapAccrual(
        await apiFetch<any>(`/accruals/${id}/approve`, {
            method: 'POST',
            body: JSON.stringify({ actedBy, comment }),
        }),
    );
}

export async function rejectAccrual(id: string, actedBy?: string, comment?: string) {
    return mapAccrual(
        await apiFetch<any>(`/accruals/${id}/reject`, {
            method: 'POST',
            body: JSON.stringify({ actedBy, comment }),
        }),
    );
}

// ── Accrual type configuration ──
function mapType(t: any): AccrualTypeConfig {
    return {
        id: t.id,
        type: t.type,
        label: t.label,
        color: t.color ?? 'bg-gray-100 text-gray-700',
        description: t.description ?? '',
    };
}

export async function fetchAccrualTypes() {
    const data = await apiFetch<any[]>('/accruals/types');
    return data.map(mapType);
}

export async function createAccrualType(data: Omit<AccrualTypeConfig, 'id'>) {
    return mapType(
        await apiFetch<any>('/accruals/types', { method: 'POST', body: JSON.stringify(data) }),
    );
}

export async function updateAccrualType(id: string, data: Partial<AccrualTypeConfig>) {
    return mapType(
        await apiFetch<any>(`/accruals/types/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    );
}

export function deleteAccrualType(id: string) {
    return apiFetch<void>(`/accruals/types/${id}`, { method: 'DELETE' });
}
