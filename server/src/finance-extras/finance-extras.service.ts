import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NumberingService } from '../numbering/numbering.service';
import { PostingEngineService } from './posting-engine.service';

const FINANCE_CONFIG_KEY = 'finance-config';
const SCHEDULED_POSTINGS_KEY = 'finance-scheduled-postings';
const PAYMENT_METHODS_KEY = 'finance-payment-methods';
const PROCESS_MAPPINGS_KEY = 'finance-process-mappings';
const PROCESS_CATEGORIES_KEY = 'finance-process-categories';
const FISCAL_YEARS_KEY = 'finance-fiscal-years';

@Injectable()
export class FinanceExtrasService {
    constructor(
        private prisma: PrismaService,
        private numbering: NumberingService,
        private posting: PostingEngineService,
    ) { }

    // ── Transactions ──
    findAllTransactions(type?: string, status?: string) {
        return this.prisma.transaction.findMany({
            where: {
                ...(type ? { type } : {}),
                ...(status ? { status } : {}),
            },
            orderBy: { date: 'desc' },
        });
    }
    findTransaction(id: string) {
        return this.prisma.transaction.findUniqueOrThrow({ where: { id } });
    }
    createTransaction(data: any) {
        return this.prisma.transaction.create({ data });
    }
    updateTransaction(id: string, data: any) {
        return this.prisma.transaction.update({ where: { id }, data });
    }
    deleteTransaction(id: string) {
        return this.prisma.transaction.delete({ where: { id } });
    }

    // ── Journal Entries ──
    findAllJournals(status?: string) {
        return this.prisma.journalEntry.findMany({
            where: status ? { status } : {},
            include: { lines: true },
            orderBy: { date: 'desc' },
        });
    }
    findJournal(id: string) {
        return this.prisma.journalEntry.findUniqueOrThrow({
            where: { id },
            include: { lines: true },
        });
    }
    private static readonly CREDIT_NORMAL_TYPES = new Set(['Liabilities', 'Equity', 'Income']);
    async createJournal(data: any) {
        const { lines, reference: _ignored, ...rest } = data;
        // References come from the sequence an admin configured in Settings →
        // Numbering ("JE-{N:3}" by default). This used to be `JRN-${Date.now()}`,
        // which ignored that configuration entirely and produced references like
        // JRN-1754212800000 that matched no convention and could not be cited.
        const { reference } = await this.numbering.allocate('JournalEntry');

        // Gets all the selected codes
        const codes = [...new Set(lines.map((l: any) => l.accountCode))] as string[];

        return this.prisma.$transaction(async (tx) => {

            const journal = await tx.journalEntry.create({
                data: {
                    ...rest,
                    reference,
                    lines: { create: lines },
                },
                include: { lines: true },
            });

            console.log('TEST Journal Inserted')

            await Promise.all(

                codes.map(async (code) => {
                    const account = await tx.chartAccount.findUnique({ where: { code }, select: { type: true } });
                    const allJournal = await tx.journalLine.findMany({
                        where: { accountCode: code },
                    })

                    const total = allJournal.reduce(
                        (acc, item) => {
                            acc.totalDebit += item.debit;
                            acc.totalCredit += item.credit;
                            return acc;
                        },
                        { totalDebit: 0, totalCredit: 0 }
                    );

                    console.log('TEST', code, total)


                    const isCreditNormal = FinanceExtrasService.CREDIT_NORMAL_TYPES.has(account.type);
                    const balance = isCreditNormal ? total.totalCredit - total.totalDebit : total.totalDebit - total.totalCredit;
                    console.log('TEST Balance', balance, account.type)

                    await tx.chartAccount.update({
                        where: { code },
                        data: { balance },
                    });

                })
            );
            return journal;
        })
    }

    /** Turns a draft into a ledger record. Balances move here, not at save. */
    postJournal(id: string, body: { postedBy?: string; date?: string } = {}) {
        return this.posting.postDraft(id, body.postedBy, body.date);
    }

    /** Rebuilds Chart of Accounts balances from the posted journal lines. */
    recomputeAccountBalances() {
        return this.posting.recomputeBalances();
    }

    /**
     * Reverses a posted journal entry by posting its mirror. The original is
     * marked Reversed and linked to the entry that reversed it; both the entry
     * and the balance movement it undoes are handled by the posting engine.
     */
    reverseJournal(id: string, body: { date?: string; createdBy?: string } = {}) {
        return this.posting.reverse(id, body);
    }

    /**
     * Edits a journal entry.
     *
     * Only a draft may be edited. A posted entry has already moved account
     * balances and been reported on; changing its lines afterwards would leave
     * the Chart of Accounts holding the effect of numbers that no longer exist.
     * Correcting a posted entry is a reversal followed by a fresh posting, which
     * is what `reverseJournal` is for.
     */
    async updateJournal(id: string, data: any) {
        const existing = await this.prisma.journalEntry.findUniqueOrThrow({
            where: { id },
            select: { status: true, reference: true },
        });
        if (existing.status !== 'Draft') {
            throw new BadRequestException(
                `${existing.reference} is ${existing.status.toLowerCase()} and can no longer be edited. Reverse it and post a corrected entry instead.`,
            );
        }

        const { lines, reference: _ignored, status: _statusIgnored, ...rest } = data;
        return this.prisma.journalEntry.update({
            where: { id },
            data: {
                ...rest,
                ...(lines
                    ? {
                        lines: {
                            deleteMany: {},
                            create: this.posting.normalizeLines(lines).map((l) => ({
                                accountCode: l.accountCode,
                                accountName: l.accountName || '',
                                debit: l.debit ?? 0,
                                credit: l.credit ?? 0,
                                description: l.description ?? null,
                            })),
                        },
                    }
                    : {}),
            },
            include: { lines: true },
        });
    }

    /** Only a draft can be deleted, for the same reason it is the only thing that can be edited. */
    async deleteJournal(id: string) {
        const existing = await this.prisma.journalEntry.findUniqueOrThrow({
            where: { id },
            select: { status: true, reference: true },
        });
        if (existing.status !== 'Draft') {
            throw new BadRequestException(
                `${existing.reference} is ${existing.status.toLowerCase()} and cannot be deleted. Reverse it instead — the ledger has to keep both sides.`,
            );
        }
        return this.prisma.journalEntry.delete({ where: { id } });
    }

    /**
     * The General Ledger: every posted line across every engine, in posting
     * order, with a running balance per account.
     *
     * Built server-side from the journal entries rather than in the browser
     * because the running balance is only meaningful over the *whole* posted
     * set — a page of entries cannot compute it, and the client was loading
     * every entry to work around that.
     */
    async buildGeneralLedger(params: {
        from?: string;
        to?: string;
        accountCode?: string;
        sourceModule?: string;
    } = {}) {
        const range = this.toDateRange(params.from, params.to);
        const entries = await this.prisma.journalEntry.findMany({
            where: {
                // Drafts are excluded: a draft has not been posted, and showing
                // it here would put money in the ledger nobody has committed.
                // Reversed entries stay — the reversal is its own entry and the
                // ledger has to show both sides or it stops reconciling.
                status: { in: ['Posted', 'Reversed'] },
                ...(range ? { date: range } : {}),
                ...(params.sourceModule ? { sourceModule: params.sourceModule } : {}),
            },
            include: { lines: true },
            orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        });

        const balanceByAccount: Record<string, number> = {};
        const rows: any[] = [];
        let totalDebit = 0;
        let totalCredit = 0;

        for (const entry of entries) {
            for (const line of entry.lines) {
                const code = line.accountCode || '(unassigned)';
                balanceByAccount[code] =
                    (balanceByAccount[code] ?? 0) + (line.debit || 0) - (line.credit || 0);

                // Filtered after the running balance is accumulated, so a single
                // account's view still shows the balance it actually carries.
                if (params.accountCode && code !== params.accountCode) continue;

                totalDebit += line.debit || 0;
                totalCredit += line.credit || 0;
                rows.push({
                    id: line.id,
                    date: entry.date,
                    reference: entry.reference,
                    sourceModule: entry.sourceModule,
                    sourceType: entry.sourceType,
                    sourceId: entry.sourceId,
                    sourceRef: entry.sourceRef,
                    process: entry.process,
                    journalId: entry.id,
                    journalStatus: entry.status,
                    accountCode: line.accountCode,
                    accountName: line.accountName,
                    description: [entry.description, line.description].filter(Boolean).join(' — '),
                    debit: line.debit || 0,
                    credit: line.credit || 0,
                    balance: balanceByAccount[code],
                    postedBy: entry.createdBy,
                });
            }
        }

        return {
            rows,
            totals: {
                debit: Number(totalDebit.toFixed(2)),
                credit: Number(totalCredit.toFixed(2)),
                balanced: Math.round((totalDebit - totalCredit) * 100) === 0,
                entries: entries.length,
                lines: rows.length,
            },
        };
    }

    // ── Chart of Accounts ──
    findAllAccounts(type?: string) {
        return this.prisma.chartAccount.findMany({
            where: type ? { type } : {},
            orderBy: { code: 'asc' },
        });
    }
    findAccount(id: string) {
        return this.prisma.chartAccount.findUniqueOrThrow({ where: { id } });
    }
    createAccount(data: any) {
        return this.prisma.chartAccount.create({ data: this.sanitizeAccount(data, true) });
    }
    updateAccount(id: string, data: any) {
        return this.prisma.chartAccount.update({ where: { id }, data: this.sanitizeAccount(data) });
    }
    /** Whitelist ChartAccount columns; clients may send extra UI-only fields. */
    private sanitizeAccount(data: any, isCreate = false) {
        const out: any = {};
        for (const key of ['code', 'name', 'type', 'category', 'description', 'balance', 'isActive', 'parentId']) {
            if (data?.[key] !== undefined) out[key] = data[key];
        }
        if (isCreate && out.category === undefined) out.category = String(data?.type ?? 'General');
        // null clears the parent; undefined means caller did not mention it.
        if (out.parentId === '') out.parentId = null;
        return out;
    }
    deleteAccount(id: string) {
        return this.prisma.chartAccount.delete({ where: { id } });
    }

    // ── Bank Accounts ──
    findAllBankAccounts() {
        return this.prisma.bankAccount.findMany({ orderBy: { bankName: 'asc' } });
    }
    findBankAccount(id: string) {
        return this.prisma.bankAccount.findUniqueOrThrow({ where: { id } });
    }
    createBankAccount(data: any) {
        return this.prisma.bankAccount.create({ data });
    }
    updateBankAccount(id: string, data: any) {
        return this.prisma.bankAccount.update({ where: { id }, data });
    }
    deleteBankAccount(id: string) {
        return this.prisma.bankAccount.delete({ where: { id } });
    }

    // ── Tax Configs ──
    findAllTaxConfigs() {
        return this.prisma.taxConfig.findMany({ orderBy: { name: 'asc' } });
    }
    findTaxConfig(id: string) {
        return this.prisma.taxConfig.findUniqueOrThrow({ where: { id } });
    }
    /**
     * Only the columns TaxConfig has.
     *
     * Prisma rejects the whole write on an unrecognised key, and the Finance
     * Configuration form posts its own field names (glCode, appliesTo,
     * enabled), so an unfiltered body failed the request outright.
     */
    private taxConfigData(data: any) {
        const out: Record<string, unknown> = {};
        if (data?.name !== undefined) out.name = String(data.name);
        if (data?.type !== undefined) out.type = String(data.type);
        if (data?.rate !== undefined) out.rate = Number(data.rate) || 0;
        if (data?.code !== undefined || data?.glCode !== undefined)
            out.code = String(data.code ?? data.glCode ?? '');
        if (data?.description !== undefined || data?.appliesTo !== undefined)
            out.description = String(data.description ?? data.appliesTo ?? '');
        if (data?.isActive !== undefined || data?.enabled !== undefined)
            out.isActive = Boolean(data.isActive ?? data.enabled);
        return out;
    }
    createTaxConfig(data: any) {
        const clean = this.taxConfigData(data);
        if (!clean.name) throw new BadRequestException('A tax name is required');
        return this.prisma.taxConfig.create({
            data: {
                name: String(clean.name),
                type: String(clean.type ?? 'Custom'),
                rate: Number(clean.rate ?? 0),
                ...clean,
            } as any,
        });
    }
    updateTaxConfig(id: string, data: any) {
        return this.prisma.taxConfig.update({
            where: { id },
            data: this.taxConfigData(data) as any,
        });
    }
    deleteTaxConfig(id: string) {
        return this.prisma.taxConfig.delete({ where: { id } });
    }

    // ── Scheduled Postings ──
    private async readSetting<T>(key: string, fallback: T): Promise<T> {
        const row = await this.prisma.systemSetting.findUnique({ where: { key } });
        return (row?.value as T) ?? fallback;
    }
    private async writeSetting(key: string, value: unknown): Promise<void> {
        const clean = JSON.parse(JSON.stringify(value ?? null));
        await this.prisma.systemSetting.upsert({
            where: { key },
            create: { key, value: clean },
            update: { value: clean },
        });
    }

    findScheduledPostings() {
        return this.readSetting<any[]>(SCHEDULED_POSTINGS_KEY, []);
    }
    async createScheduledPosting(data: any) {
        const postings = await this.findScheduledPostings();
        const created = { id: `sp-${Date.now()}`, ...data };
        postings.unshift(created);
        await this.writeSetting(SCHEDULED_POSTINGS_KEY, postings);
        return created;
    }
    async deleteScheduledPosting(id: string) {
        const postings = await this.findScheduledPostings();
        await this.writeSetting(
            SCHEDULED_POSTINGS_KEY,
            postings.filter((p: any) => p.id !== id),
        );
        return { id, deleted: true };
    }

    // ── Payment Methods ──
    private readonly defaultPaymentMethods = [
        { id: 'pm-bank-transfer', name: 'Bank Transfer', enabled: true },
        { id: 'pm-cash', name: 'Cash', enabled: true },
        { id: 'pm-cheque', name: 'Cheque', enabled: false },
    ];
    async findPaymentMethods() {
        const raw = await this.readSetting<any>(PAYMENT_METHODS_KEY, null);
        if (Array.isArray(raw)) {
            return raw
                .filter((m) => m && m.id)
                .map((m) => ({ id: String(m.id), name: String(m.name ?? ''), enabled: m.enabled !== false }));
        }
        // Legacy shape: Record<id, boolean> toggles layered over the defaults.
        if (raw && typeof raw === 'object') {
            return this.defaultPaymentMethods.map((m) => ({ ...m, enabled: raw[m.id] ?? m.enabled }));
        }
        return [...this.defaultPaymentMethods];
    }
    async createPaymentMethod(data: any) {
        const name = String(data?.name ?? '').trim();
        if (!name) throw new BadRequestException('Payment method name is required');
        const methods = await this.findPaymentMethods();
        const created = { id: `pm-${Date.now()}`, name, enabled: data?.enabled !== false };
        await this.writeSetting(PAYMENT_METHODS_KEY, [...methods, created]);
        return created;
    }
    async updatePaymentMethod(id: string, data: any) {
        const methods = await this.findPaymentMethods();
        const updated = methods.map((m) =>
            m.id === id
                ? {
                    ...m,
                    ...(data?.name !== undefined ? { name: String(data.name).trim() } : {}),
                    ...(data?.enabled !== undefined ? { enabled: !!data.enabled } : {}),
                }
                : m,
        );
        await this.writeSetting(PAYMENT_METHODS_KEY, updated);
        return updated.find((m) => m.id === id) ?? { id, ...data };
    }
    async deletePaymentMethod(id: string) {
        const methods = await this.findPaymentMethods();
        await this.writeSetting(PAYMENT_METHODS_KEY, methods.filter((m) => m.id !== id));
        return { id, deleted: true };
    }
    async togglePaymentMethod(id: string) {
        const methods = await this.findPaymentMethods();
        const target = methods.find((m) => m.id === id);
        const enabled = target ? !target.enabled : true;
        await this.writeSetting(PAYMENT_METHODS_KEY, methods.map((m) => (m.id === id ? { ...m, enabled } : m)));
        return { id, enabled };
    }

    // ── Report Templates ──
    async getReportTemplates() {
        const definitions = await this.prisma.reportDefinition.findMany({
            where: { module: { equals: 'finance', mode: 'insensitive' } },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                type: true,
                description: true,
                isScheduled: true,
                schedule: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        const byType = definitions.reduce<Record<string, any[]>>((acc, item) => {
            const key = String(item.type || 'general').toLowerCase();
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {});

        return {
            templates: definitions,
            grouped: byType,
        };
    }

    // ── Config ──
    getConfig() {
        return this.readSetting<Record<string, unknown>>(FINANCE_CONFIG_KEY, {});
    }
    async saveConfig(data: any) {
        const current = await this.getConfig();
        const merged = { ...current, ...(data ?? {}) };
        await this.writeSetting(FINANCE_CONFIG_KEY, merged);
        return { saved: true, ...merged };
    }

    // ── Fiscal Years ──
    /**
     * The fiscal year register.
     *
     * Fiscal years were held only in the Finance provider's React state, so
     * creating one, setting the current year or closing a period was discarded
     * on the next refresh — including the close audit trail the screen shows.
     */
    getFiscalYears() {
        return this.readSetting<any[]>(FISCAL_YEARS_KEY, []);
    }

    /**
     * Replaces the register. The screen edits the list as a whole (closing one
     * year and marking another current is a single act), and exactly one year
     * may be current.
     */
    async saveFiscalYears(years: any[]) {
        const list = (Array.isArray(years) ? years : [])
            .filter((fy) => fy && String(fy.id ?? '').trim())
            .map((fy) => ({
                id: String(fy.id),
                label: String(fy.label ?? '').trim(),
                startDate: String(fy.startDate ?? ''),
                endDate: String(fy.endDate ?? ''),
                status: ['open', 'closing', 'closed'].includes(String(fy.status))
                    ? String(fy.status)
                    : 'open',
                isCurrent: Boolean(fy.isCurrent),
                ...(fy.closedAt ? { closedAt: String(fy.closedAt) } : {}),
                ...(fy.closedBy ? { closedBy: String(fy.closedBy) } : {}),
                ...(fy.openingBalances && typeof fy.openingBalances === 'object'
                    ? { openingBalances: fy.openingBalances }
                    : {}),
            }));

        const firstCurrent = list.findIndex((fy) => fy.isCurrent);
        const normalized = list.map((fy, index) => ({
            ...fy,
            isCurrent: index === firstCurrent,
        }));

        await this.writeSetting(FISCAL_YEARS_KEY, normalized);
        return normalized;
    }

    // ── Process / Account Mappings (GL posting rules) ──
    getProcessMappings() {
        return this.readSetting<any[]>(PROCESS_MAPPINGS_KEY, []);
    }
    async saveProcessMappings(mappings: any[]) {
        const list = Array.isArray(mappings) ? mappings : [];
        // A process may only ever have one mapping — the frontend already
        // gates this in the modal, but the whole list is replaced wholesale
        // here, so it's enforced again server-side rather than trusted.
        const seen = new Set<string>();
        for (const m of list) {
            const process = String(m?.process ?? '').trim();
            if (!process) continue;
            if (seen.has(process)) {
                throw new BadRequestException(
                    `"${process}" already has a mapping — a process can only be mapped once.`,
                );
            }
            seen.add(process);
        }
        await this.writeSetting(PROCESS_MAPPINGS_KEY, list);
        return list;
    }

    /**
     * The Posting Engine's process categories — the buckets transactions arrive
     * under, and the debit/credit pair each posts to.
     *
     * These had nowhere to live at all: the page held them in component state
     * seeded with an empty array, so the category list was empty on every load,
     * a category created by hand vanished on refresh, and posting to the ledger
     * — which looks its category up first — could never run. Stored as a setting
     * rather than a table for the same reason the mappings are: it is a short
     * configured list edited as a whole, not a growing record set.
     */
    getProcessCategories() {
        return this.readSetting<any[]>(PROCESS_CATEGORIES_KEY, []);
    }
    async saveProcessCategories(categories: any[]) {
        const list = Array.isArray(categories) ? categories : [];
        await this.writeSetting(PROCESS_CATEGORIES_KEY, list);
        return list;
    }

    // ── Finance Reports ──
    /**
     * Aggregated data for the Financial Reports page. Returns rows per report
     * type keyed by the page's report ids. Monetary values are returned as raw
     * numbers with a `format` hint so the client can apply the configured
     * currency/number formatting.
     */
    async buildFinanceReports(from?: string, to?: string) {
        const range = this.toDateRange(from, to);
        const dateWhere = range ? { date: range } : {};

        const [expenses, incomes, budgets, payments, payrollRuns] =
            await Promise.all([
                this.prisma.expense.findMany({
                    where: { ...dateWhere, status: { not: 'Rejected' } },
                    select: { category: true, amount: true, status: true },
                }),
                this.prisma.income.findMany({
                    where: dateWhere,
                    select: { source: true, amount: true, status: true },
                }),
                this.prisma.budget.findMany({
                    where: { status: { not: 'Closed' } },
                    select: {
                        name: true,
                        totalBudget: true,
                        spent: true,
                        committed: true,
                    },
                }),
                this.prisma.payment.findMany({
                    where: { ...dateWhere, status: { not: 'Failed' } },
                    select: { amount: true, status: true },
                }),
                this.prisma.payrollRun.findMany({
                    where: range
                        ? { createdAt: range }
                        : undefined,
                    select: {
                        totalGross: true,
                        totalNet: true,
                        employeeCount: true,
                        entries: {
                            select: { department: true, grossPay: true, netPay: true },
                        },
                    },
                }),
            ]);

        const sum = (values: number[]) =>
            values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
        const pct = (part: number, total: number) =>
            total > 0 ? Math.round((part / total) * 100) : 0;
        const topGroups = (
            items: { key: string; amount: number }[],
            limit = 5,
        ) => {
            const totals = new Map<string, number>();
            for (const item of items) {
                const key = item.key || 'Uncategorised';
                totals.set(key, (totals.get(key) ?? 0) + (item.amount || 0));
            }
            return [...totals.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, limit);
        };

        // Expense report
        const expenseTotal = sum(expenses.map((e) => e.amount));
        const pendingExpenses = sum(
            expenses
                .filter((e) => e.status === 'Draft' || e.status === 'Submitted')
                .map((e) => e.amount),
        );
        const expenseRows = [
            { label: 'Total Expenses', amount: expenseTotal, format: 'currency' },
            ...topGroups(
                expenses.map((e) => ({ key: e.category, amount: e.amount })),
            ).map(([category, amount]) => ({
                label: category,
                amount,
                format: 'currency',
                sub: `${pct(amount, expenseTotal)}% of total`,
            })),
            {
                label: 'Awaiting Approval',
                amount: pendingExpenses,
                format: 'currency',
                sub: 'Draft & submitted',
            },
            { label: 'Expense Entries', amount: expenses.length, format: 'count' },
        ];

        // Income report
        const incomeTotal = sum(incomes.map((i) => i.amount));
        const receivedIncome = sum(
            incomes.filter((i) => i.status === 'Received').map((i) => i.amount),
        );
        const incomeRows = [
            { label: 'Total Income', amount: incomeTotal, format: 'currency' },
            ...topGroups(
                incomes.map((i) => ({ key: i.source, amount: i.amount })),
            ).map(([source, amount]) => ({
                label: source,
                amount,
                format: 'currency',
                sub: `${pct(amount, incomeTotal)}% of total`,
            })),
            {
                label: 'Received',
                amount: receivedIncome,
                format: 'currency',
                positive: true,
            },
            {
                label: 'Outstanding',
                amount: incomeTotal - receivedIncome,
                format: 'currency',
                sub: 'Confirmed & invoiced, not yet received',
            },
        ];

        // Cash flow
        const paidExpenses = sum(
            expenses.filter((e) => e.status === 'Paid').map((e) => e.amount),
        );
        const completedPayments = sum(
            payments
                .filter((p) => p.status === 'PaymentCompleted')
                .map((p) => p.amount),
        );
        const netCashFlow = receivedIncome - paidExpenses - completedPayments;
        const cashflowRows = [
            {
                label: 'Net Cash Flow',
                amount: netCashFlow,
                format: 'currency',
                positive: netCashFlow >= 0,
            },
            {
                label: 'Cash Inflows',
                amount: receivedIncome,
                format: 'currency',
                positive: true,
                sub: 'Income received',
            },
            {
                label: 'Expense Outflows',
                amount: paidExpenses,
                format: 'currency',
                positive: false,
                sub: 'Expenses paid',
            },
            {
                label: 'Payment Outflows',
                amount: completedPayments,
                format: 'currency',
                positive: false,
                sub: 'Payments completed',
            },
        ];

        // Budget vs actual
        const totalBudgeted = sum(budgets.map((b) => b.totalBudget));
        const totalSpent = sum(budgets.map((b) => b.spent));
        const totalCommitted = sum(budgets.map((b) => b.committed));
        const budgetRows = [
            { label: 'Total Budgeted', amount: totalBudgeted, format: 'currency' },
            {
                label: 'Total Spent',
                amount: totalSpent,
                format: 'currency',
                sub: `${pct(totalSpent, totalBudgeted)}% utilised`,
                positive: totalSpent <= totalBudgeted,
            },
            { label: 'Committed', amount: totalCommitted, format: 'currency' },
            {
                label: 'Remaining',
                amount: totalBudgeted - totalSpent - totalCommitted,
                format: 'currency',
                positive: totalBudgeted - totalSpent - totalCommitted >= 0,
            },
            ...budgets
                .slice()
                .sort((a, b) => b.totalBudget - a.totalBudget)
                .slice(0, 5)
                .map((b) => ({
                    label: b.name,
                    amount: b.spent,
                    format: 'currency',
                    sub: `${pct(b.spent, b.totalBudget)}% of budget`,
                    positive: b.spent <= b.totalBudget,
                })),
        ];

        // Payroll summary
        const entries = payrollRuns.flatMap((r) => r.entries);
        const totalGross = sum(payrollRuns.map((r) => r.totalGross));
        const totalNet = sum(payrollRuns.map((r) => r.totalNet));
        const payrollRows = [
            { label: 'Total Gross Pay', amount: totalGross, format: 'currency' },
            { label: 'Total Net Pay', amount: totalNet, format: 'currency' },
            {
                label: 'Total Deductions',
                amount: totalGross - totalNet,
                format: 'currency',
            },
            {
                label: 'Employees Paid',
                amount: sum(payrollRuns.map((r) => r.employeeCount)),
                format: 'count',
            },
            ...topGroups(
                entries.map((e) => ({ key: e.department, amount: e.grossPay })),
            ).map(([department, amount]) => ({
                label: department,
                amount,
                format: 'currency',
                sub: `${pct(amount, totalGross)}% of gross`,
            })),
        ];

        return {
            expense: expenseRows,
            income: incomeRows,
            cashflow: cashflowRows,
            budget: budgetRows,
            payroll: payrollRows,
        };
    }

    private toDateRange(
        from?: string,
        to?: string,
    ): { gte?: Date; lte?: Date } | null {
        const gte = from ? new Date(from) : undefined;
        // Treat the end date as inclusive by extending to the end of that day.
        const lte = to ? new Date(`${to.slice(0, 10)}T23:59:59.999Z`) : undefined;
        const valid = (d?: Date) => d && !Number.isNaN(d.getTime());
        if (!valid(gte) && !valid(lte)) return null;
        return {
            ...(valid(gte) ? { gte } : {}),
            ...(valid(lte) ? { lte } : {}),
        };
    }
}
