import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const FINANCE_CONFIG_KEY = 'finance-config';
const SCHEDULED_POSTINGS_KEY = 'finance-scheduled-postings';
const PAYMENT_METHODS_KEY = 'finance-payment-methods';
const PROCESS_MAPPINGS_KEY = 'finance-process-mappings';

@Injectable()
export class FinanceExtrasService {
    constructor(private prisma: PrismaService) { }

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
    createJournal(data: any) {
        const { lines, ...rest } = data;
        const ref = `JRN-${Date.now()}`;
        return this.prisma.journalEntry.create({
            data: {
                ...rest,
                reference: ref,
                lines: lines ? { create: lines } : undefined,
            },
            include: { lines: true },
        });
    }
    updateJournal(id: string, data: any) {
        const { lines, ...rest } = data;
        return this.prisma.journalEntry.update({
            where: { id },
            data: {
                ...rest,
                ...(lines
                    ? {
                        lines: {
                            deleteMany: {},
                            create: lines,
                        },
                    }
                    : {}),
            },
            include: { lines: true },
        });
    }
    deleteJournal(id: string) {
        return this.prisma.journalEntry.delete({ where: { id } });
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
        for (const key of ['code', 'name', 'type', 'category', 'balance', 'isActive', 'parentId']) {
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
    createTaxConfig(data: any) {
        return this.prisma.taxConfig.create({ data });
    }
    updateTaxConfig(id: string, data: any) {
        return this.prisma.taxConfig.update({ where: { id }, data });
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

    // ── Process / Account Mappings (GL posting rules) ──
    getProcessMappings() {
        return this.readSetting<any[]>(PROCESS_MAPPINGS_KEY, []);
    }
    async saveProcessMappings(mappings: any[]) {
        const list = Array.isArray(mappings) ? mappings : [];
        await this.writeSetting(PROCESS_MAPPINGS_KEY, list);
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
