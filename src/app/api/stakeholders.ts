import { apiFetch } from './client';
import type { Stakeholder } from '../pages/construction/types';

export const listStakeholders = (projectId?: string) =>
    apiFetch<Stakeholder[]>(`/stakeholders${projectId ? `?projectId=${projectId}` : ''}`);
export const getStakeholder = (id: string) => apiFetch<Stakeholder>(`/stakeholders/${id}`);
export const createStakeholder = (data: Partial<Stakeholder>) =>
    apiFetch<Stakeholder>(`/stakeholders`, { method: 'POST', body: JSON.stringify(data) });
export const updateStakeholder = (id: string, data: Partial<Stakeholder>) =>
    apiFetch<Stakeholder>(`/stakeholders/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteStakeholder = (id: string) =>
    apiFetch<void>(`/stakeholders/${id}`, { method: 'DELETE' });
export const inviteStakeholderPartner = (id: string) => apiFetch<any>(`/stakeholders/${id}/invite`, { method: 'POST' });
export const getPartnerWorkspace = () => apiFetch<any>('/stakeholders/partner/workspace');
