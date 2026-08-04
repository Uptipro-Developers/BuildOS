import { apiFetch } from './client';

/** One supplier's progress through the sourcing of a purchase request. */
export interface PRSupplier {
    supplier: string;
    supplierId?: string;
    status: string;
    sentDate?: string;
    quoteRef?: string;
    quoteAmount?: number;
    poRef?: string;
}

export interface PurchaseRequest {
    id: string; prRef: string; title: string; projectId?: string;
    projectName?: string; status: string; priority: string;
    requestedBy?: string; daysToDeliver?: number; items: any[]; notes?: string;
    /** Reference of the material request this was raised from, if any. */
    mrRef?: string;
    procurementType?: 'direct' | 'rfq';
    suppliers?: PRSupplier[];
    createdAt: string;
}
export interface PurchaseInvoice {
    id: string; invoiceNo: string; poRef?: string; supplierName: string;
    supplierId?: string; invoiceDate: string; dueDate: string;
    lines: any[]; subtotal: number; vatTotal: number; total: number;
    status: string; notes?: string; createdAt: string;
}
export interface SentRFQ {
    id: string; rfqRef: string; supplierName: string; supplierId?: string;
    status: string; items: any[]; sentDate: string; expiryDate?: string;
    notes?: string; createdAt: string;
    /** The purchase request being competed. Rows sharing one are one RFQ. */
    prRef?: string;
}
export interface ReceivedQuote {
    id: string; rfqRef: string; supplierName: string; supplierId?: string;
    status: string; items: any[]; receivedDate: string; validUntil?: string;
    totalValue: number; notes?: string; createdAt: string;
    /** What is being quoted for. Quote comparison groups on this. */
    prRef?: string;
    projectName?: string;
    destinationStore?: string;
    storeLevel?: string;
}

// Purchase Requests
export const getPurchaseRequests = (status?: string) =>
    apiFetch<PurchaseRequest[]>(status ? `/purchase-requests?status=${status}` : '/purchase-requests');
export const getPurchaseRequest = (id: string) => apiFetch<PurchaseRequest>(`/purchase-requests/${id}`);
export const createPurchaseRequest = (data: Partial<PurchaseRequest>) =>
    apiFetch<PurchaseRequest>('/purchase-requests', { method: 'POST', body: JSON.stringify(data) });
export const updatePurchaseRequest = (id: string, data: Partial<PurchaseRequest>) =>
    apiFetch<PurchaseRequest>(`/purchase-requests/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deletePurchaseRequest = (id: string) =>
    apiFetch<void>(`/purchase-requests/${id}`, { method: 'DELETE' });

// Purchase Invoices
export const getPurchaseInvoices = (status?: string) =>
    apiFetch<PurchaseInvoice[]>(status ? `/purchase-invoices?status=${status}` : '/purchase-invoices');
export const getPurchaseInvoice = (id: string) => apiFetch<PurchaseInvoice>(`/purchase-invoices/${id}`);
export const createPurchaseInvoice = (data: Partial<PurchaseInvoice>) =>
    apiFetch<PurchaseInvoice>('/purchase-invoices', { method: 'POST', body: JSON.stringify(data) });
export const updatePurchaseInvoice = (id: string, data: Partial<PurchaseInvoice>) =>
    apiFetch<PurchaseInvoice>(`/purchase-invoices/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deletePurchaseInvoice = (id: string) =>
    apiFetch<void>(`/purchase-invoices/${id}`, { method: 'DELETE' });

// Sent RFQs
export const getSentRFQs = (status?: string) =>
    apiFetch<SentRFQ[]>(status ? `/sent-rfqs?status=${status}` : '/sent-rfqs');
export const getSentRFQ = (id: string) => apiFetch<SentRFQ>(`/sent-rfqs/${id}`);
export const createSentRFQ = (data: Partial<SentRFQ>) =>
    apiFetch<SentRFQ>('/sent-rfqs', { method: 'POST', body: JSON.stringify(data) });
export const updateSentRFQ = (id: string, data: Partial<SentRFQ>) =>
    apiFetch<SentRFQ>(`/sent-rfqs/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteSentRFQ = (id: string) =>
    apiFetch<void>(`/sent-rfqs/${id}`, { method: 'DELETE' });

// Received Quotes
export const getReceivedQuotes = (status?: string) =>
    apiFetch<ReceivedQuote[]>(status ? `/received-quotes?status=${status}` : '/received-quotes');
export const getReceivedQuote = (id: string) => apiFetch<ReceivedQuote>(`/received-quotes/${id}`);
export const createReceivedQuote = (data: Partial<ReceivedQuote>) =>
    apiFetch<ReceivedQuote>('/received-quotes', { method: 'POST', body: JSON.stringify(data) });
export const updateReceivedQuote = (id: string, data: Partial<ReceivedQuote>) =>
    apiFetch<ReceivedQuote>(`/received-quotes/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteReceivedQuote = (id: string) =>
    apiFetch<void>(`/received-quotes/${id}`, { method: 'DELETE' });
