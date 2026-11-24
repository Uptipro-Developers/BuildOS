import { apiFetch } from './client';
export interface BoqItem { id: string; levelId: string; kind: 'quantity' | 'material'; code: string; description: string; unit: string; quantity: number; unitRate: number; procuredQty: number; notes: string }
export interface BoqLevel { id: string; projectId: string; name: string; description: string; sequence: number; items: BoqItem[] }
export const getProjectBoq = (projectId: string) => apiFetch<BoqLevel[]>(`/project-boq?projectId=${encodeURIComponent(projectId)}`);
export const createBoqLevel = (data: Partial<BoqLevel>) => apiFetch<BoqLevel>('/project-boq/levels', { method: 'POST', body: JSON.stringify(data) });
export const deleteBoqLevel = (id: string) => apiFetch(`/project-boq/levels/${id}`, { method: 'DELETE' });
export const createBoqItem = (levelId: string, data: Partial<BoqItem>) => apiFetch<BoqItem>(`/project-boq/levels/${levelId}/items`, { method: 'POST', body: JSON.stringify(data) });
export const deleteBoqItem = (id: string) => apiFetch(`/project-boq/items/${id}`, { method: 'DELETE' });
