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

// ── Project Types: Sector → Category (Settings, real reference data) ──────────
/** One entry of a Category's Level 4 structure field schema. */
export interface ProjectStructureField {
    id: string;
    key: string;
    label: string;
    type: 'text' | 'number' | 'select';
    options?: string[];
}

export interface ProjectCategory {
    id: string;
    sectorId: string;
    name: string;
    /** Level 3 — Specific Descriptors mode. */
    descriptorMode: 'dropdown' | 'free_text';
    descriptorOptions: string[];
    /** Level 4 — Physical Structure Breakdown. */
    structureHeaderLabel: string | null;
    structureDescription: string | null;
    structureFields: ProjectStructureField[];
    createdAt: string;
    updatedAt: string;
}

export interface ProjectSector {
    id: string;
    name: string;
    categories: ProjectCategory[];
    createdAt: string;
    updatedAt: string;
}

export const getProjectSectors = () => apiFetch<ProjectSector[]>('/construction-settings/project-sectors');
export const createProjectSector = (name: string) =>
    apiFetch<ProjectSector>('/construction-settings/project-sectors', {
        method: 'POST',
        body: JSON.stringify({ name }),
    });
export const deleteProjectSector = (id: string) =>
    apiFetch<void>(`/construction-settings/project-sectors/${id}`, { method: 'DELETE' });

export const createProjectCategory = (sectorId: string, name: string) =>
    apiFetch<ProjectCategory>(`/construction-settings/project-sectors/${sectorId}/categories`, {
        method: 'POST',
        body: JSON.stringify({ name }),
    });
export const deleteProjectCategory = (id: string) =>
    apiFetch<void>(`/construction-settings/project-categories/${id}`, { method: 'DELETE' });

/** Level 3 (descriptor mode/options) and Level 4 (structure) — patched per atomic edit. */
export const updateProjectCategory = (
    id: string,
    patch: Partial<
        Pick<
            ProjectCategory,
            | 'descriptorMode'
            | 'descriptorOptions'
            | 'structureHeaderLabel'
            | 'structureDescription'
            | 'structureFields'
        >
    >,
) =>
    apiFetch<ProjectCategory>(`/construction-settings/project-categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
    });
