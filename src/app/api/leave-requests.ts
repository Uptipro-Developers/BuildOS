import { apiFetch, toApiArray } from './client';
import { formatDateByGeneralSettings } from '../utils/generalSettings';

function fmt(date: string | null) {
    if (!date) return '';
    return formatDateByGeneralSettings(date);
}

function mapLeaveRequest(r: any) {
    return {
        id: r.id,
        refId: r.refId ?? r.id,
        employee: r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '',
        department: r.employee?.department?.name ?? '',
        leaveType: r.leaveType?.name ?? '',
        startDate: fmt(r.startDate),
        endDate: fmt(r.endDate),
        days: r.days,
        status: r.status,
        submittedAt: fmt(r.submittedAt ?? r.createdAt),
        approvedBy: r.approvedBy ?? '',
        approvedAt: fmt(r.approvedAt),
        notes: r.notes ?? '',
    };
}

export async function fetchLeaveRequests(params?: { status?: string; employeeId?: string }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.employeeId) qs.set('employeeId', params.employeeId);
    const query = qs.toString() ? `?${qs}` : '';
    const data = toApiArray<any>(await apiFetch(`/leave-requests${query}`));
    return data.map(mapLeaveRequest);
}

export function createLeaveRequest(data: any) {
    return apiFetch(`/leave-requests`, { method: 'POST', body: JSON.stringify(data) });
}

export function approveLeaveRequest(id: string, notes?: string) {
    return apiFetch(`/leave-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved', approvedAt: new Date().toISOString(), notes }),
    });
}

export function rejectLeaveRequest(id: string, reason?: string) {
    return apiFetch(`/leave-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected', rejectionReason: reason }),
    });
}

export function updateLeaveRequest(id: string, data: any) {
    return apiFetch(`/leave-requests/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteLeaveRequest(id: string) {
    return apiFetch(`/leave-requests/${id}`, { method: 'DELETE' });
}
