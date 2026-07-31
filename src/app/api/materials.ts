import { apiFetch } from './client';

export interface Material {
    id: string; name: string; category: string; unit: string;
    totalQty: number; availableQty: number; reservedQty: number;
    unitCost: number; reorderLevel: number; materialType?: string;
    allocationStatus?: string; allocatedTo?: string; allocatedProject?: string;
    condition?: string; createdAt: string;
}
export interface Store {
    id: string; name: string; type: string; projectId?: string;
    projectName?: string; manager?: string; location?: string;
    storeItems?: StoreItem[]; createdAt: string;
}
export interface StoreItem {
    id: string; materialName: string; category: string; unit: string;
    qty: number; reorderLevel: number; unitCost: number;
    lastReceived?: string; bin?: string; storeId: string;
}
export interface StockMovement {
    id: string; type: string; materialName: string; unit: string; qty: number;
    storeName: string; storeId: string; reference?: string;
    projectName?: string; projectId?: string; date: string;
    createdBy?: string; notes?: string;
}
export interface StockTransfer {
    id: string; reference: string; fromStoreId: string; fromStoreName: string;
    toStoreId: string; toStoreName: string; items: any[]; status: string;
    requestedBy?: string; approvedBy?: string; requestDate: string;
    completedAt?: string; notes?: string;
}
export interface MaterialRequest {
    id: string; reference: string; materialName: string; unit: string; qty: number;
    storeName: string; storeId: string; projectName?: string; projectId?: string;
    purpose?: string; priority?: string; status: string;
    requestedBy?: string; approvedBy?: string; requestDate: string;
    /** When the materials are needed — shown as Due date. ISO string. */
    neededBy?: string;
    approvedAt?: string; notes?: string;
}
export interface MaterialReturn {
    id: string; reference: string; materialName: string; unit: string; qty: number;
    fromStoreName: string; toStoreName: string; condition?: string;
    reason?: string; status: string; requestedBy?: string; approvedBy?: string;
    requestDate: string; approvedAt?: string;
}

// Materials
export const getMaterials = () => apiFetch<Material[]>('/materials');
export const getMaterial = (id: string) => apiFetch<Material>(`/materials/${id}`);
export const createMaterial = (data: Partial<Material>) =>
    apiFetch<Material>('/materials', { method: 'POST', body: JSON.stringify(data) });
export const updateMaterial = (id: string, data: Partial<Material>) =>
    apiFetch<Material>(`/materials/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteMaterial = (id: string) =>
    apiFetch<void>(`/materials/${id}`, { method: 'DELETE' });

// Stores
export const getStores = () => apiFetch<Store[]>('/stores');
export const getStore = (id: string) => apiFetch<Store>(`/stores/${id}`);
export const createStore = (data: Partial<Store>) =>
    apiFetch<Store>('/stores', { method: 'POST', body: JSON.stringify(data) });
export const updateStore = (id: string, data: Partial<Store>) =>
    apiFetch<Store>(`/stores/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteStore = (id: string) =>
    apiFetch<void>(`/stores/${id}`, { method: 'DELETE' });

// Store Items
export const getStoreItems = (storeId?: string) =>
    apiFetch<StoreItem[]>(storeId ? `/stores/${storeId}/items` : '/store-items');
export const createStoreItem = (data: Partial<StoreItem>) =>
    apiFetch<StoreItem>('/store-items', { method: 'POST', body: JSON.stringify(data) });
export const updateStoreItem = (id: string, data: Partial<StoreItem>) =>
    apiFetch<StoreItem>(`/store-items/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteStoreItem = (id: string) =>
    apiFetch<void>(`/store-items/${id}`, { method: 'DELETE' });

// Stock Movements
export const getStockMovements = (storeId?: string) =>
    apiFetch<StockMovement[]>(storeId ? `/stock-movements?storeId=${storeId}` : '/stock-movements');
export const createStockMovement = (data: Partial<StockMovement>) =>
    apiFetch<StockMovement>('/stock-movements', { method: 'POST', body: JSON.stringify(data) });

// Stock Transfers
export const getStockTransfers = (status?: string) =>
    apiFetch<StockTransfer[]>(status ? `/stock-transfers?status=${status}` : '/stock-transfers');
export const getStockTransfer = (id: string) => apiFetch<StockTransfer>(`/stock-transfers/${id}`);
export const createStockTransfer = (data: Partial<StockTransfer>) =>
    apiFetch<StockTransfer>('/stock-transfers', { method: 'POST', body: JSON.stringify(data) });
export const updateStockTransfer = (id: string, data: Partial<StockTransfer>) =>
    apiFetch<StockTransfer>(`/stock-transfers/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

// Material Requests
export const getMaterialRequests = (status?: string) =>
    apiFetch<MaterialRequest[]>(status ? `/material-requests?status=${status}` : '/material-requests');
export const getMaterialRequest = (id: string) => apiFetch<MaterialRequest>(`/material-requests/${id}`);
export const createMaterialRequest = (data: Partial<MaterialRequest>) =>
    apiFetch<MaterialRequest>('/material-requests', { method: 'POST', body: JSON.stringify(data) });
export const updateMaterialRequest = (id: string, data: Partial<MaterialRequest>) =>
    apiFetch<MaterialRequest>(`/material-requests/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

// Material Returns
export const getMaterialReturns = (status?: string) =>
    apiFetch<MaterialReturn[]>(status ? `/material-returns?status=${status}` : '/material-returns');
export const getMaterialReturn = (id: string) => apiFetch<MaterialReturn>(`/material-returns/${id}`);
export const createMaterialReturn = (data: Partial<MaterialReturn>) =>
    apiFetch<MaterialReturn>('/material-returns', { method: 'POST', body: JSON.stringify(data) });
export const updateMaterialReturn = (id: string, data: Partial<MaterialReturn>) =>
    apiFetch<MaterialReturn>(`/material-returns/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
