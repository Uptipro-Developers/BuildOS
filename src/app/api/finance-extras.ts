import { apiFetch } from './client';

export interface Transaction {
    id: string; type: string; category?: string; description: string;
    amount: number; currency: string; status: string; reference?: string;
    date: string; accountId?: string; bankAccountId?: string;
    createdBy?: string; notes?: string; createdAt: string;
}
export interface JournalLine {
    id?: string; accountName?: string; accountCode?: string;
    debit: number; credit: number; description?: string;
}
export interface JournalEntry {
    id: string; reference: string; date: string; description?: string;
    status: string; lines: JournalLine[]; createdBy?: string;
    postedAt?: string; createdAt: string;
    /** Set once the entry has been reversed. */
    reversedAt?: string;
    /** On a reversing entry, the id of the entry it reverses. */
    reversalOfId?: string;
}
export interface ChartAccount {
    id: string; code: string; name: string; type: string;
    subType?: string; parentId?: string; description?: string;
    isActive: boolean; balance: number; createdAt: string;
}
export interface BankAccount {
    id: string; bankName: string; accountName: string; accountNumber: string;
    currency: string; balance: number; isDefault: boolean;
    branchName?: string; sortCode?: string; createdAt: string;
}
export interface TaxConfig {
    id: string; name: string; type: string; rate: number;
    code?: string; description?: string; isActive: boolean; createdAt: string;
}

// Transactions
export const getTransactions = (type?: string, status?: string) => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    const qs = params.toString();
    return apiFetch<Transaction[]>(qs ? `/transactions?${qs}` : '/transactions');
};
export const getTransaction = (id: string) => apiFetch<Transaction>(`/transactions/${id}`);
export const createTransaction = (data: Partial<Transaction>) =>
    apiFetch<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(data) });
export const updateTransaction = (id: string, data: Partial<Transaction>) =>
    apiFetch<Transaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTransaction = (id: string) =>
    apiFetch<void>(`/transactions/${id}`, { method: 'DELETE' });

// Journal Entries
export const getJournalEntries = (status?: string) =>
    apiFetch<JournalEntry[]>(status ? `/journal-entries?status=${status}` : '/journal-entries');
export const getJournalEntry = (id: string) => apiFetch<JournalEntry>(`/journal-entries/${id}`);
export const createJournalEntry = (data: Partial<JournalEntry>) =>
    apiFetch<JournalEntry>('/journal-entries', { method: 'POST', body: JSON.stringify(data) });
export const updateJournalEntry = (id: string, data: Partial<JournalEntry>) =>
    apiFetch<JournalEntry>(`/journal-entries/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteJournalEntry = (id: string) =>
    apiFetch<void>(`/journal-entries/${id}`, { method: 'DELETE' });
/**
 * Reverses a posted entry. The server marks the original Reversed and returns
 * it alongside the newly posted mirror entry, so callers can fold both into the
 * list without refetching.
 */
export const reverseJournalEntry = (id: string, data?: { date?: string; createdBy?: string }) =>
    apiFetch<{ original: JournalEntry; reversal: JournalEntry }>(
        `/journal-entries/${id}/reverse`,
        { method: 'POST', body: JSON.stringify(data ?? {}) },
    );

// Chart of Accounts
export const getChartAccounts = (type?: string) =>
    apiFetch<ChartAccount[]>(type ? `/chart-accounts?type=${type}` : '/chart-accounts');
export const getChartAccount = (id: string) => apiFetch<ChartAccount>(`/chart-accounts/${id}`);
export const createChartAccount = (data: Partial<ChartAccount>) =>
    apiFetch<ChartAccount>('/chart-accounts', { method: 'POST', body: JSON.stringify(data) });
export const updateChartAccount = (id: string, data: Partial<ChartAccount>) =>
    apiFetch<ChartAccount>(`/chart-accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteChartAccount = (id: string) =>
    apiFetch<void>(`/chart-accounts/${id}`, { method: 'DELETE' });

// Bank Accounts
export const getBankAccounts = () => apiFetch<BankAccount[]>('/bank-accounts');
export const getBankAccount = (id: string) => apiFetch<BankAccount>(`/bank-accounts/${id}`);
export const createBankAccount = (data: Partial<BankAccount>) =>
    apiFetch<BankAccount>('/bank-accounts', { method: 'POST', body: JSON.stringify(data) });
export const updateBankAccount = (id: string, data: Partial<BankAccount>) =>
    apiFetch<BankAccount>(`/bank-accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteBankAccount = (id: string) =>
    apiFetch<void>(`/bank-accounts/${id}`, { method: 'DELETE' });

// Tax Configs
export const getTaxConfigs = () => apiFetch<TaxConfig[]>('/tax-configs');
export const getTaxConfig = (id: string) => apiFetch<TaxConfig>(`/tax-configs/${id}`);
export const createTaxConfig = (data: Partial<TaxConfig>) =>
    apiFetch<TaxConfig>('/tax-configs', { method: 'POST', body: JSON.stringify(data) });
export const updateTaxConfig = (id: string, data: Partial<TaxConfig>) =>
    apiFetch<TaxConfig>(`/tax-configs/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTaxConfig = (id: string) =>
    apiFetch<void>(`/tax-configs/${id}`, { method: 'DELETE' });

// Payment Methods
export interface PaymentMethod {
    id: string;
    name: string;
    enabled: boolean;
}
export const getPaymentMethods = () => apiFetch<PaymentMethod[]>('/payment-methods');
export const createPaymentMethod = (data: { name: string; enabled?: boolean }) =>
    apiFetch<PaymentMethod>('/payment-methods', { method: 'POST', body: JSON.stringify(data) });
export const updatePaymentMethod = (id: string, data: Partial<Omit<PaymentMethod, 'id'>>) =>
    apiFetch<PaymentMethod>(`/payment-methods/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePaymentMethod = (id: string) =>
    apiFetch<void>(`/payment-methods/${id}`, { method: 'DELETE' });
export const togglePaymentMethod = (id: string) =>
    apiFetch<{ id: string; enabled: boolean }>(`/payment-methods/${id}/toggle`, { method: 'PATCH' });

// Process / Account Mappings (GL posting rules) — persisted as a JSON collection.
export const getProcessMappings = () => apiFetch<any[]>('/process-mappings');
export const saveProcessMappings = (mappings: any[]) =>
    apiFetch<any[]>('/process-mappings', { method: 'PUT', body: JSON.stringify({ mappings }) });
