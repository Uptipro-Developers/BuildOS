import { apiFetch } from './client';
import type { ConstructionSetting } from '../pages/construction/types';

export const listConstructionSettings = (projectId?: string) =>
    apiFetch<ConstructionSetting[]>(`/construction-settings${projectId ? `?projectId=${projectId}` : ''}`);
export const getConstructionSetting = (id: string) => apiFetch<ConstructionSetting>(`/construction-settings/${id}`);
export const createConstructionSetting = (data: Partial<ConstructionSetting>) =>
    apiFetch<ConstructionSetting>(`/construction-settings`, { method: 'POST', body: JSON.stringify(data) });
export const updateConstructionSetting = (id: string, data: Partial<ConstructionSetting>) =>
    apiFetch<ConstructionSetting>(`/construction-settings/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteConstructionSetting = (id: string) =>
    apiFetch<void>(`/construction-settings/${id}`, { method: 'DELETE' });

// The `/project-types` and `/project-statuses` collections had one client, a
// Construction "Project Configuration" page that was never routed and so could
// not be opened. It has been removed: the sectors and categories a project is
// actually created from live on ConstructionSetting.projectTypes (see
// useConstructionSettings), and a project's status is a database enum, not a
// configurable list. The endpoints remain so the rows already stored under them
// are still reachable.

// Project roles (Construction › Settings › Resources). Saved as one collection
// because the screen edits the whole list.
export const getProjectRoles = () => apiFetch<any[]>('/project-roles');
export const saveProjectRoles = (roles: any[]) =>
    apiFetch<any[]>('/project-roles', { method: 'PUT', body: JSON.stringify({ roles }) });
