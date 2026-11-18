import { apiFetch } from './client';

export interface LeaveType {
    id: string;
    name: string;
    daysAllowed: number;
    carryOver: boolean;
    maxCarryOver: number;
    paid: boolean;
    approvalsRequired: number;
    color: string;
    gender: string;
    gradeEntitlements: Record<string, number>;
}

export const fetchLeaveTypes = () => apiFetch<LeaveType[]>('/leave-types');
export const createLeaveType = (data: Omit<LeaveType, 'id'>) =>
    apiFetch<LeaveType>('/leave-types', { method: 'POST', body: JSON.stringify(data) });
export const updateLeaveType = (id: string, data: Partial<Omit<LeaveType, 'id'>>) =>
    apiFetch<LeaveType>(`/leave-types/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteLeaveType = (id: string) =>
    apiFetch<void>(`/leave-types/${id}`, { method: 'DELETE' });
