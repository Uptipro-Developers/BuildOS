import { apiFetch } from './client';
import { formatDateByGeneralSettings } from '../utils/generalSettings';

const statusMap: Record<string, string> = {
    UnderReview: 'Under Review',
};

function fmt(date: string | null) {
    if (!date) return '';
    return formatDateByGeneralSettings(date);
}

function mapClaim(c: any) {
    return {
        id: c.id,
        employee: c.employee ? `${c.employee.firstName} ${c.employee.lastName}` : '',
        department: c.employee?.department?.name ?? '',
        type: c.claimType?.name ?? c.type ?? '',
        amount: c.amount ?? 0,
        description: c.description ?? '',
        date: fmt(c.date ?? c.createdAt),
        status: statusMap[c.status] ?? c.status,
        reviewedBy: c.reviewedBy,
        reviewedAt: fmt(c.reviewedAt),
        rejectionReason: c.rejectionReason,
        paidAt: fmt(c.paidAt),
    };
}

export async function fetchClaims(params?: { status?: string; employeeId?: string }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.employeeId) qs.set('employeeId', params.employeeId);
    const query = qs.toString() ? `?${qs}` : '';
    const data = await apiFetch<any[]>(`/claims${query}`);
    return data.map(mapClaim);
}

export function createClaim(data: any) {
    return apiFetch(`/claims`, { method: 'POST', body: JSON.stringify(data) });
}

export function approveClaim(id: string, notes?: string) {
    return apiFetch(`/claims/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved', approvedAt: new Date().toISOString(), notes }),
    });
}

export function rejectClaim(id: string, reason?: string) {
    return apiFetch(`/claims/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected', rejectionReason: reason }),
    });
}

export function payClaim(id: string) {
    return apiFetch(`/claims/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'paid', paidAt: new Date().toISOString() }),
    });
}

export function updateClaimStatus(id: string, status: string) {
    return apiFetch(`/claims/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
}

export function deleteClaim(id: string) {
    return apiFetch(`/claims/${id}`, { method: 'DELETE' });
}
