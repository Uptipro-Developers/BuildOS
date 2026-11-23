import { apiFetch } from './client';

/** Shared stocking/dimension unit options — used by both the Storefront Config dimension builder and the All Materials Add/Edit modal, so a unit picked in one place reads the same way everywhere else. */
export const DIMENSION_UNITS = [
    'kg', 'g', 'tonne', 'mm', 'cm', 'm', 'inch', 'ft',
    'm²', 'ft²', 'm³', 'L', 'bag', 'box', 'roll', 'sheet', 'pcs', 'set',
];

export interface Material {
    id: string; name: string; category: string; unit: string;
    totalQty: number; availableQty: number; reservedQty: number;
    unitCost: number; reorderLevel: number; materialType?: string;
    allocationStatus?: string; allocatedTo?: string; allocatedProject?: string;
    condition?: string; createdAt: string;
    amendmentId?: string; amendmentStatus?: 'pending';
    /** Catalog-created rows only — kind/value/unit are the dimension that produced this row; sku is the material item's. */
    sku?: string | null;
    kind?: string | null;
    value?: number | null;
    /** Pre-concatenation names (Storefront Config builder bookkeeping) — not usually shown directly. */
    materialGroupName?: string | null;
    itemName?: string | null;
    /** Which store this material is attached to, set from the Edit Material modal. */
    storeId?: string | null;
    storeName?: string | null;
}
export interface Store {
    id: string; name: string; type: string; projectId?: string;
    projectName?: string; manager?: string; location?: string;
    storeItems?: StoreItem[]; createdAt: string;
}
export interface StoreItem {
    id: string; materialName: string; category: string; unit: string;
    qty: number; reservedQty?: number; openingQty?: number; reorderLevel: number; unitCost: number;
    lowStockThreshold?: number | null; outOfStockThreshold?: number | null;
    outOfStockLevel?: number; thresholdSource?: 'item' | 'store';
    lastReceived?: string; bin?: string; storeId: string;
}
export interface StockMovement {
    id: string; type: string; materialName: string; unit: string; qty: number;
    storeName: string; storeId: string; reference?: string;
    projectName?: string; projectId?: string; date: string;
    createdBy?: string; notes?: string;
    qtyBefore?: number; qtyAfter?: number; direction?: 'increase' | 'decrease'; status?: string;
    toStoreId?: string; toStoreName?: string;
}
export interface MaterialAmendment {
    id: string; entityType: 'Material' | 'StoreItem'; entityId: string;
    materialName: string; storeId?: string; storeName?: string;
    oldValue: Record<string, unknown>; proposedValue: Record<string, unknown>;
    reason?: string; status: 'pending' | 'approved' | 'rejected';
    requestedBy: string; reviewedBy?: string; createdAt: string; reviewedAt?: string;
}
export interface StockTransfer {
    id: string; reference: string; fromStoreId: string; fromStoreName: string;
    toStoreId: string; toStoreName: string; items: Array<{ materialName: string; qty: number; unit: string; materialRequestRef?: string }>; status: string;
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
    /** Backlink to the Purchase Request auto-raised when this request is approved. */
    prRef?: string;
    /** Photo supplied for a material that does not yet exist in the catalogue. */
    imageUrl?: string | null;
    isNewMaterial?: boolean;
    fulfillmentMethod?: 'stock_movement' | 'procurement' | 'mixed' | null;
    fulfillmentStatus?: string | null;
    sourceStoreId?: string | null;
    sourceStoreName?: string | null;
    stockTransferRef?: string | null;
    stockTransferRefs?: string[];
    fulfillmentPlan?: {
        allocations: { storeId: string; storeName: string; qty: number; transferRef?: string }[];
        procurementQty: number;
    } | null;
    fulfillmentPlans?: {
        requestId: string;
        allocations: { storeId: string; qty: number }[];
        procurementQty: number;
    }[];
}
export interface MaterialReturn {
    id: string; reference: string; materialName: string; unit: string; qty: number;
    fromStoreName: string; toStoreName: string; condition?: string;
    reason?: string; status: string; requestedBy?: string; approvedBy?: string;
    requestDate: string; approvedAt?: string;
}

export interface MaterialStockUpdateInput {
    materials: {
        id: string;
        totalQty: number;
        availableQty: number;
        reservedQty: number;
        unitCost: number;
        /** Omit to leave this row's reorder level untouched. */
        reorderLevel?: number;
    }[];
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

/** Catalogue search for the "Add Material" flow — matches a Material row directly by name, group name or item name. */
export const searchMaterials = (q: string) =>
    apiFetch<Material[]>(`/materials/search?q=${encodeURIComponent(q)}`);

/** Applies stock quantities/cost directly onto one or more existing Material rows picked from the catalogue. */
export const applyMaterialStockUpdate = (data: MaterialStockUpdateInput) =>
    apiFetch<Material[]>('/materials/stock', { method: 'POST', body: JSON.stringify(data) });

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

export const getMaterialAmendments = (status?: string) =>
    apiFetch<MaterialAmendment[]>(status ? `/material-amendments?status=${encodeURIComponent(status)}` : '/material-amendments');
export const decideMaterialAmendment = (id: string, decision: 'approved' | 'rejected') =>
    apiFetch<MaterialAmendment>(`/material-amendments/${id}/decision`, {
        method: 'PATCH', body: JSON.stringify({ decision }),
    });

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
export const getMaterialRequests = (status?: string, consumer?: 'storefront' | 'procurement') => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (consumer) params.set('consumer', consumer);
    const query = params.toString();
    return apiFetch<MaterialRequest[]>(`/material-requests${query ? `?${query}` : ''}`);
};
export const getMaterialRequest = (id: string) => apiFetch<MaterialRequest>(`/material-requests/${id}`);
export const createMaterialRequest = (data: Partial<MaterialRequest>) =>
    apiFetch<MaterialRequest>('/material-requests', { method: 'POST', body: JSON.stringify(data) });
export const createMaterialRequestBatch = (data: {
    reference?: string;
    items: Array<{ materialName: string; unit: string; qty: number; notes?: string }>;
    [key: string]: unknown;
}) => apiFetch<{ reference: string; items: MaterialRequest[] }>('/material-requests/batch', {
    method: 'POST',
    body: JSON.stringify(data),
});
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
