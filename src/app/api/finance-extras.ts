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
    /** Which engine raised the posting — "Journal", "Payment", "Purchase", "Payroll". */
    sourceModule?: string;
    /** The originating record's model and id, for tracing back to it. */
    sourceType?: string;
    sourceId?: string;
    /** The originating document's own reference, e.g. an invoice number. */
    sourceRef?: string;
    /** The configured process whose mapping produced the lines. */
    process?: string;
}

/** One posted line, as the General Ledger serves it. */
export interface GeneralLedgerRow {
    id: string;
    date: string;
    reference: string;
    sourceModule: string;
    sourceType?: string | null;
    sourceId?: string | null;
    sourceRef?: string | null;
    process?: string | null;
    journalId: string;
    journalStatus: string;
    accountCode: string;
    accountName: string;
    description: string;
    debit: number;
    credit: number;
    /** Running balance for this line's account, across the whole posted set. */
    balance: number;
    postedBy?: string;
}

export interface GeneralLedger {
    rows: GeneralLedgerRow[];
    totals: {
        debit: number; credit: number; balanced: boolean;
        entries: number; lines: number;
    };
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

/**
 * Posts a saved draft. The balance check runs server-side at this point, not
 * when the draft was saved — a draft is allowed to be half-finished.
 */
export const postJournalDraft = (id: string, data?: { postedBy?: string; date?: string }) =>
    apiFetch<JournalEntry>(`/journal-entries/${id}/post`, {
        method: 'POST',
        body: JSON.stringify(data ?? {}),
    });

// General Ledger — every posted line across every engine, with the running
// balance computed over the whole posted set rather than the loaded page.
export const getGeneralLedger = (params: {
    from?: string; to?: string; accountCode?: string; sourceModule?: string;
} = {}) => {
    const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v) as [string, string][],
    ).toString();
    return apiFetch<GeneralLedger>(qs ? `/general-ledger?${qs}` : '/general-ledger');
};

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
/**
 * Rebuilds every balance from the posted journal lines. Accounts seeded before
 * the posting engine existed never had their balances maintained, and this is
 * also the reconciliation to reach for if one is ever doubted.
 */
export const recomputeAccountBalances = () =>
    apiFetch<{ accounts: number; adjusted: number }>('/chart-accounts/recompute-balances', {
        method: 'POST',
    });

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

/**
 * The Posting Engine's process categories. Stored and saved as a whole list,
 * the same way the mappings are — the screen edits the set, not one row.
 */
export const getProcessCategories = () => apiFetch<any[]>('/process-categories');
export const saveProcessCategories = (categories: any[]) =>
    apiFetch<any[]>('/process-categories', { method: 'PUT', body: JSON.stringify({ categories }) });

// ── Payroll Overview ──────────────────────────────────────────────────────────
/**
 * A payroll run's journey from HR into the ledger.
 *
 * "Approved" is HR's sign-off — the point at which the run reaches Finance.
 * From there, approving the posting and performing it are two separate acts,
 * so that authorising payroll to hit the accounts is not the same keystroke as
 * doing it.
 */
export type PayrollPostingStatus =
    | 'Approved'
    | 'Pending Posting Approval'
    | 'Posting Approved'
    | 'Posted';

export interface PayrollOverviewRow {
    id: string;
    /** The Payroll Code, allocated from Settings → Numbering. */
    code: string;
    periodName: string;
    month: number;
    year: number;
    status: PayrollPostingStatus | string;
    employeeCount: number;
    totalEarnings: number;
    totalDeductions: number;
    netPay: number;
    postingRequestedBy?: string | null;
    postingRequestedAt?: string | null;
    postingApprovedBy?: string | null;
    postingApprovedAt?: string | null;
    postedBy?: string | null;
    postedAt?: string | null;
    journalEntryId?: string | null;
    journalReference?: string | null;
}

/** The double entry a run would post, shown before anyone commits to it. */
export interface PayrollPostingPreview {
    process: string;
    mapped: boolean;
    totals: {
        totalEarnings: number; totalDeductions: number; netPay: number;
        tax: number; pension: number; allowances: number; overtime: number;
    };
    lines: {
        accountCode: string; accountName: string;
        debit: number; credit: number; description?: string;
    }[];
    totalDebit: number;
    totalCredit: number;
    difference: number;
    balanced: boolean;
}

export const getPayrollOverview = () => apiFetch<PayrollOverviewRow[]>('/payroll-overview');
export const getPayrollPostingPreview = (id: string) =>
    apiFetch<PayrollPostingPreview>(`/payroll-overview/${id}/posting-preview`);
export const sendPayrollForPostingApproval = (id: string) =>
    apiFetch<PayrollOverviewRow>(`/payroll-overview/${id}/send-for-posting-approval`, {
        method: 'POST', body: JSON.stringify({}),
    });
export const approvePayrollPosting = (id: string) =>
    apiFetch<PayrollOverviewRow>(`/payroll-overview/${id}/approve-posting`, {
        method: 'POST', body: JSON.stringify({}),
    });
export const postPayroll = (id: string) =>
    apiFetch<{ run: PayrollOverviewRow; journalEntry: JournalEntry }>(
        `/payroll-overview/${id}/post`,
        { method: 'POST', body: JSON.stringify({}) },
    );

// Fiscal years. Written as one collection: closing a year and making another
// current is a single change to the register.
export const getFiscalYears = () => apiFetch<any[]>('/fiscal-years');
export const saveFiscalYears = (fiscalYears: any[]) =>
    apiFetch<any[]>('/fiscal-years', { method: 'PUT', body: JSON.stringify({ fiscalYears }) });
