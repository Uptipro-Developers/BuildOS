import { apiFetch } from './client';
import { formatDateByGeneralSettings } from '../utils/generalSettings';

const statusMap: Record<string, string> = {
    Active: 'Active', Planning: 'Planning', OnHold: 'On Hold',
    Completed: 'Completed', Cancelled: 'Cancelled',
};

function fmt(date: string | null) {
    if (!date) return '';
    return formatDateByGeneralSettings(date);
}

function mapProject(p: any) {
    return {
        id: p.id,
        name: p.name,
        client: p.client ?? '',
        location: p.location ?? '',
        state: p.state ?? '',
        city: p.city ?? '',
        status: statusMap[p.status] ?? p.status,
        type: p.type,
        budget: p.budget ?? 0,
        spent: p.spent ?? 0,
        progress: p.progress ?? 0,
        startDate: fmt(p.startDate),
        endDate: fmt(p.endDate),
        manager: p.manager ?? '',
        team: p.team ?? [],
    };
}

export async function fetchProjects(params?: { status?: string; type?: string }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.type) qs.set('type', params.type);
    const query = qs.toString() ? `?${qs}` : '';
    const data = await apiFetch<any[]>(`/projects${query}`);
    return data.map(mapProject);
}

const ragMap: Record<string, string> = {
    Green: 'on-track', Amber: 'at-risk', Red: 'delayed',
    'on-track': 'on-track', 'at-risk': 'at-risk', delayed: 'delayed',
};

function isoDate(date: string | null | undefined) {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

/**
 * Maps a backend project DTO into the construction module's rich `Project`
 * shape, filling construction-specific fields with safe defaults when the
 * backend does not provide them.
 */
function mapConstructionProject(p: any) {
    return {
        id: p.id,
        name: p.name,
        siteAddress: p.siteAddress ?? p.location ?? '',
        client: p.client ?? '',
        projectManager: p.projectManager ?? p.manager ?? '',
        mainContractor: p.mainContractor ?? '',
        mainContractorId: p.mainContractorId ?? undefined,
        contractType: p.contractType ?? 'Lump Sum',
        plannedStartDate: isoDate(p.plannedStartDate ?? p.startDate),
        plannedEndDate: isoDate(p.plannedEndDate ?? p.endDate),
        description: p.description ?? '',
        blockCount: p.blockCount ?? undefined,
        clusterId: p.clusterId ?? '',
        status: statusMap[p.status] ?? p.status ?? 'Active',
        ragStatus: ragMap[p.ragStatus] ?? 'on-track',
        budget: p.budget ?? 0,
        spent: p.spent ?? 0,
        location: p.location ?? '',
        sector: p.sector ?? undefined,
        category: p.category ?? undefined,
        descriptor: p.descriptor ?? undefined,
        contractingModel: p.contractingModel ?? undefined,
        createdAt: isoDate(p.createdAt) || new Date().toISOString().slice(0, 10),
        lastReportDate: isoDate(p.lastReportDate) || undefined,
        setupComplete: p.setupComplete ?? false,
        setupProgress: p.setupProgress ?? 0,
        setupLocked: p.setupLocked ?? false,
    };
}

/**
 * Fetches projects from the backend and returns them in the construction
 * module's `Project` shape. Pages can fall back to mock data if this rejects
 * or returns an empty list.
 */
export async function fetchConstructionProjects(params?: { status?: string; type?: string }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.type) qs.set('type', params.type);
    const query = qs.toString() ? `?${qs}` : '';
    const data = await apiFetch<any[]>(`/projects${query}`);
    return data.map(mapConstructionProject);
}

export function getProject(id: string) {
    return apiFetch<any>(`/projects/${id}`);
}

/**
 * Fetches a single project from the backend and maps it into the construction
 * module's `Project` shape.
 */
export async function getConstructionProject(id: string) {
    const p = await apiFetch<any>(`/projects/${id}`);
    return mapConstructionProject(p);
}

export function createProject(data: any) {
    return apiFetch(`/projects`, { method: 'POST', body: JSON.stringify(data) });
}

const reverseStatusMap: Record<string, string> = {
    Active: 'Active',
    'On Hold': 'OnHold',
    Planning: 'Planning',
    Completed: 'Completed',
    Cancelled: 'Cancelled',
};

/**
 * Maps the construction module's rich project shape into the backend `Project`
 * columns. Shared by create and update so both persist the full set of
 * construction-specific fields. Only keys present on `data` are included, so a
 * partial update (PATCH) never clobbers unrelated columns.
 */
function toBackendConstructionPayload(data: any) {
    const payload: Record<string, any> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.client !== undefined) payload.client = data.client ?? '';
    // `location` (area, e.g. "Lekki, Lagos") and `siteAddress` (street address)
    // are distinct in the construction shape; keep both, defaulting the shared
    // `location` column to siteAddress when it is unset.
    if (data.location !== undefined || data.siteAddress !== undefined)
        payload.location = data.location || data.siteAddress || '';
    if (data.siteAddress !== undefined) payload.siteAddress = data.siteAddress ?? '';
    if (data.projectManager !== undefined) payload.manager = data.projectManager ?? '';
    if (data.status !== undefined) payload.status = reverseStatusMap[data.status] ?? 'Active';
    if (data.budget !== undefined) payload.budget = data.budget ?? 0;
    if (data.spent !== undefined) payload.spent = data.spent ?? 0;
    if (data.plannedStartDate) payload.startDate = new Date(data.plannedStartDate).toISOString();
    if (data.plannedEndDate) payload.endDate = new Date(data.plannedEndDate).toISOString();
    if (data.lastReportDate) payload.lastReportDate = new Date(data.lastReportDate).toISOString();
    for (const key of [
        'mainContractor', 'mainContractorId', 'contractType', 'clusterId',
        'ragStatus', 'description', 'descriptor', 'sector', 'category',
        'blockCount', 'contractingModel', 'setupComplete', 'setupProgress',
        'setupLocked',
    ]) {
        if (data[key] !== undefined) payload[key] = data[key];
    }
    return payload;
}

/**
 * Maps the construction module's rich project shape into the backend `Project`
 * columns, persists it, and returns the created project in the construction
 * shape (with its real backend id).
 */
export async function createConstructionProject(data: any) {
    const created = await apiFetch<any>('/projects', {
        method: 'POST',
        body: JSON.stringify(toBackendConstructionPayload(data)),
    });
    return mapConstructionProject(created);
}

/**
 * Persists edits to a construction project (full-fidelity: every
 * construction-specific field round-trips), returning the updated project in
 * the construction shape.
 */
export async function updateConstructionProject(id: string, data: any) {
    const updated = await apiFetch<any>(`/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(toBackendConstructionPayload(data)),
    });
    return mapConstructionProject(updated);
}

export function updateProject(id: string, data: any) {
    return apiFetch(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteProject(id: string) {
    return apiFetch(`/projects/${id}`, { method: 'DELETE' });
}
