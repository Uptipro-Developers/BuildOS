import { apiFetch } from './client';

export type DelegatedApp = 'construction' | 'storefront' | 'procurement' | 'finance' | 'hr';

export interface ResponsibilityUser {
    id: string; name: string; email: string; role?: string; assignedApps?: string[]; status?: string;
}
export interface ApplicationOwner {
    id: string; app: DelegatedApp; userId: string; user: ResponsibilityUser;
    canConfigure: boolean; canAssign: boolean; active: boolean;
    validFrom: string; validUntil?: string | null;
    appointedBy?: Pick<ResponsibilityUser, 'id' | 'name' | 'email'> | null;
}
export interface ApplicationAssignment {
    id: string; app: DelegatedApp; userId: string; user: ResponsibilityUser;
    processId?: string | null; processName?: string | null;
    scopeType: string; scopeId?: string | null; scopeName?: string | null;
    responsibility?: string | null; permissions: string[]; status: string;
    validFrom: string; validUntil?: string | null;
    assignedBy?: Pick<ResponsibilityUser, 'id' | 'name' | 'email'> | null;
}
export interface ResponsibilityProcess {
    id: string; label: string; description?: string; actions: string[]; scopeTypes: string[];
}
export interface MyApplicationAccess {
    app: DelegatedApp; configured: boolean; unrestricted: boolean; isOwner: boolean;
    canConfigure: boolean; canAssign: boolean; assignments: ApplicationAssignment[];
}

export const getResponsibilityApps = () => apiFetch<Array<{ app: DelegatedApp; scopeTypes: string[] }>>('/responsibilities/apps');
export const getMyApplicationAccess = () => apiFetch<MyApplicationAccess[]>('/responsibilities/me');
export const getApplicationOwners = (app: DelegatedApp) => apiFetch<ApplicationOwner[]>(`/responsibilities/apps/${app}/owners`);
export const getResponsibilityResources = (app: DelegatedApp, scopeType: string) =>
    apiFetch<Array<{ id: string; name: string }>>(`/responsibilities/apps/${app}/resources/${scopeType}`);
export const getResponsibilityProcesses = (app: DelegatedApp) =>
    apiFetch<ResponsibilityProcess[]>(`/responsibilities/apps/${app}/processes`);
export const getResponsibilityUsers = (app: DelegatedApp) =>
    apiFetch<ResponsibilityUser[]>(`/responsibilities/apps/${app}/users`);
export const appointApplicationOwner = (app: DelegatedApp, data: { userId: string; canConfigure?: boolean; canAssign?: boolean; validUntil?: string | null }) =>
    apiFetch<ApplicationOwner>(`/responsibilities/apps/${app}/owners`, { method: 'POST', body: JSON.stringify(data) });
export const revokeApplicationOwner = (id: string) => apiFetch<ApplicationOwner>(`/responsibilities/owners/${id}`, { method: 'DELETE' });
export const getApplicationAssignments = (app: DelegatedApp) => apiFetch<ApplicationAssignment[]>(`/responsibilities/apps/${app}/assignments`);
export const createApplicationAssignment = (app: DelegatedApp, data: {
    userId: string; processId: string; scopeType: string; scopeId?: string | null; scopeName?: string | null;
    responsibility?: string | null; permissions?: string[]; validUntil?: string | null;
}) => apiFetch<ApplicationAssignment>(`/responsibilities/apps/${app}/assignments`, { method: 'POST', body: JSON.stringify(data) });
export const updateApplicationAssignment = (id: string, data: Partial<Pick<ApplicationAssignment, 'responsibility' | 'permissions' | 'status' | 'validUntil'>>) =>
    apiFetch<ApplicationAssignment>(`/responsibilities/assignments/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const revokeApplicationAssignment = (id: string) => apiFetch<ApplicationAssignment>(`/responsibilities/assignments/${id}`, { method: 'DELETE' });
