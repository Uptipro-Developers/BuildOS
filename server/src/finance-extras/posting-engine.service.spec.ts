import { BadRequestException } from '@nestjs/common';
import { PostingEngineService } from './posting-engine.service';

/**
 * The rules that make the ledger trustworthy.
 *
 * Before the posting engine, `createJournal` wrote whatever it was handed and
 * nothing ever touched `ChartAccount.balance` — an unbalanced entry posted
 * happily, and the Chart of Accounts showed zero against every account no
 * matter how much had been posted through it. These cover both.
 */

const ACCOUNTS = [
    { id: 'a1', code: '1110', name: 'Cash & Bank', type: 'Assets', balance: 0 },
    { id: 'a2', code: '2110', name: 'Accounts Payable', type: 'Liabilities', balance: 0 },
    { id: 'a3', code: '5100', name: 'Labour Costs', type: 'Expenses', balance: 0 },
    { id: 'a4', code: '4100', name: 'Contract Revenue', type: 'Income', balance: 0 },
];

function makeEngine(seedAccounts = ACCOUNTS) {
    const accounts = seedAccounts.map((a) => ({ ...a }));
    const entries: any[] = [];

    const client: any = {
        chartAccount: {
            findMany: jest.fn(({ where }: any = {}) => {
                const codes = where?.code?.in;
                return Promise.resolve(
                    codes ? accounts.filter((a) => codes.includes(a.code)) : accounts,
                );
            }),
            // `increment` is Prisma syntax; resolved here the way the database would.
            update: jest.fn(({ where, data }: any) => {
                const account = accounts.find((a) => a.id === where.id)!;
                account.balance = Number(
                    (data.balance?.increment !== undefined
                        ? account.balance + data.balance.increment
                        : data.balance
                    ).toFixed(2),
                );
                return Promise.resolve(account);
            }),
        },
        journalEntry: {
            create: jest.fn(({ data }: any) => {
                const entry = {
                    ...data,
                    id: `je-${entries.length + 1}`,
                    lines: (data.lines?.create ?? []).map((l: any, i: number) => ({
                        ...l,
                        id: `jl-${entries.length + 1}-${i}`,
                    })),
                };
                entries.push(entry);
                return Promise.resolve(entry);
            }),
            update: jest.fn(({ where, data }: any) => {
                const entry = entries.find((e) => e.id === where.id);
                Object.assign(entry, data);
                return Promise.resolve(entry);
            }),
            findUnique: jest.fn(({ where }: any) =>
                Promise.resolve(entries.find((e) => e.id === where.id) ?? null),
            ),
            findUniqueOrThrow: jest.fn(({ where }: any) => {
                const entry = entries.find((e) => e.id === where.id);
                if (!entry) throw new Error('not found');
                return Promise.resolve(entry);
            }),
            findMany: jest.fn(({ where }: any = {}) =>
                Promise.resolve(
                    entries.filter((e) => !where?.status || e.status === where.status),
                ),
            ),
        },
        systemSetting: { findUnique: jest.fn(() => Promise.resolve(null)) },
    };

    const prisma: any = {
        ...client,
        $transaction: (fn: any) => (typeof fn === 'function' ? fn(client) : Promise.all(fn)),
    };

    let seq = 0;
    const numbering: any = {
        allocate: jest.fn(() => Promise.resolve({ reference: `JE-${String(++seq).padStart(3, '0')}` })),
    };

    return { engine: new PostingEngineService(prisma, numbering), accounts, entries };
}

const balanceOf = (accounts: any[], code: string) =>
    accounts.find((a) => a.code === code)!.balance;

describe('balance enforcement', () => {
    it('refuses an entry whose debits and credits disagree', async () => {
        const { engine } = makeEngine();
        await expect(
            engine.post({
                description: 'Lopsided',
                lines: [
                    { accountCode: '5100', debit: 1000 },
                    { accountCode: '1110', credit: 400 },
                ],
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('names the side and the shortfall, so it can be corrected', async () => {
        const { engine } = makeEngine();
        await expect(
            engine.post({
                description: 'Lopsided',
                lines: [
                    { accountCode: '5100', debit: 1000 },
                    { accountCode: '1110', credit: 400 },
                ],
            }),
        ).rejects.toThrow(/debits exceed by 600/i);
    });

    it('refuses a one-sided entry — a double entry needs both sides', async () => {
        const { engine } = makeEngine();
        await expect(
            engine.post({ description: 'One line', lines: [{ accountCode: '5100', debit: 1000 }] }),
        ).rejects.toThrow(/at least two lines/i);
    });

    it('accepts many debits against many credits, not just a pair', async () => {
        const { engine, entries } = makeEngine();
        await engine.post({
            description: 'Payroll',
            lines: [
                { accountCode: '5100', debit: 800 },
                { accountCode: '5100', debit: 200 },
                { accountCode: '2110', credit: 300 },
                { accountCode: '1110', credit: 700 },
            ],
        });
        expect(entries[0].lines).toHaveLength(4);
        expect(entries[0].status).toBe('Posted');
    });

    it('treats a sum that is out by a fraction of a kobo as balanced', async () => {
        const { engine, entries } = makeEngine();
        // 0.1 + 0.2 !== 0.3 in binary floating point.
        await engine.post({
            description: 'Rounding',
            lines: [
                { accountCode: '5100', debit: 0.1 },
                { accountCode: '5100', debit: 0.2 },
                { accountCode: '1110', credit: 0.3 },
            ],
        });
        expect(entries).toHaveLength(1);
    });

    it('rejects a line carrying both a debit and a credit', async () => {
        const { engine } = makeEngine();
        await expect(
            engine.post({
                description: 'Both sides',
                lines: [
                    { accountCode: '5100', debit: 100, credit: 100 },
                    { accountCode: '1110', credit: 100 },
                ],
            }),
        ).rejects.toThrow(/one side or the other/i);
    });

    it('refuses an amount with no account rather than quietly dropping it', async () => {
        const { engine } = makeEngine();
        // Without the orphan the remaining two lines balance, so dropping it
        // would post an entry that has lost part of what was entered.
        await expect(
            engine.post({
                description: 'Orphan',
                lines: [
                    { accountCode: '5100', debit: 500 },
                    { accountCode: '1110', credit: 500 },
                    { accountCode: '', debit: 250 },
                ],
            }),
        ).rejects.toThrow(/needs an account/i);
    });
});

describe('chart of accounts balances', () => {
    it('moves account balances when an entry posts', async () => {
        const { engine, accounts } = makeEngine();
        await engine.post({
            description: 'Supplier invoice',
            lines: [
                { accountCode: '5100', debit: 1000 },
                { accountCode: '2110', credit: 1000 },
            ],
        });
        expect(balanceOf(accounts, '5100')).toBe(1000);
        // Held in the account's natural sign: 1,000 owed reads as 1,000, not −1,000.
        expect(balanceOf(accounts, '2110')).toBe(1000);
    });

    it('leaves balances alone for a draft', async () => {
        const { engine, accounts } = makeEngine();
        await engine.post({
            description: 'Proposed',
            status: 'Draft',
            lines: [
                { accountCode: '5100', debit: 1000 },
                { accountCode: '2110', credit: 1000 },
            ],
        });
        expect(balanceOf(accounts, '5100')).toBe(0);
        expect(balanceOf(accounts, '2110')).toBe(0);
    });

    it('moves them when that draft is later posted', async () => {
        const { engine, accounts, entries } = makeEngine();
        await engine.post({
            description: 'Proposed',
            status: 'Draft',
            lines: [
                { accountCode: '5100', debit: 1000 },
                { accountCode: '2110', credit: 1000 },
            ],
        });
        await engine.postDraft(entries[0].id, 'Ada');
        expect(balanceOf(accounts, '5100')).toBe(1000);
        expect(entries[0].status).toBe('Posted');
    });

    it('will not post a draft that does not balance', async () => {
        const { engine, entries } = makeEngine();
        await engine.post({
            description: 'Half done',
            status: 'Draft',
            lines: [{ accountCode: '5100', debit: 1000 }],
        });
        await expect(engine.postDraft(entries[0].id)).rejects.toThrow(/at least two lines/i);
    });

    it('nets an account back to nil when the entry is reversed', async () => {
        const { engine, accounts, entries } = makeEngine();
        await engine.post({
            description: 'Supplier invoice',
            lines: [
                { accountCode: '5100', debit: 1000 },
                { accountCode: '2110', credit: 1000 },
            ],
        });
        await engine.reverse(entries[0].id, { createdBy: 'Ada' });

        expect(balanceOf(accounts, '5100')).toBe(0);
        expect(balanceOf(accounts, '2110')).toBe(0);
        // The original is kept and marked, never edited away — the ledger has to
        // show both it and its contra.
        expect(entries[0].status).toBe('Reversed');
        expect(entries[1].reversalOfId).toBe(entries[0].id);
    });

    it('carries the source through to the reversal, so both trace to the same document', async () => {
        const { engine, entries } = makeEngine();
        await engine.post({
            description: 'Invoice INV-77',
            sourceModule: 'Purchase',
            sourceType: 'PurchaseInvoice',
            sourceId: 'inv-77',
            sourceRef: 'INV-77',
            lines: [
                { accountCode: '5100', debit: 500 },
                { accountCode: '2110', credit: 500 },
            ],
        });
        await engine.reverse(entries[0].id);
        expect(entries[1].sourceRef).toBe('INV-77');
        expect(entries[1].sourceId).toBe('inv-77');
    });

    it('records an entry against an unknown account without moving a balance', async () => {
        const { engine, accounts, entries } = makeEngine();
        await engine.post({
            description: 'Unmapped code',
            lines: [
                { accountCode: '9999', debit: 100 },
                { accountCode: '1110', credit: 100 },
            ],
        });
        // Refusing the whole posting would block the module that raised it, and
        // the entry itself still balances.
        expect(entries).toHaveLength(1);
        expect(balanceOf(accounts, '1110')).toBe(-100);
    });

    it('rebuilds balances from the posted lines', async () => {
        const { engine, accounts } = makeEngine();
        await engine.post({
            description: 'Revenue',
            lines: [
                { accountCode: '1110', debit: 2500 },
                { accountCode: '4100', credit: 2500 },
            ],
        });
        // Something wrote a balance directly, the way everything did before the
        // engine existed.
        accounts.find((a) => a.code === '4100')!.balance = 999999;

        const result = await engine.recomputeBalances();
        expect(balanceOf(accounts, '4100')).toBe(2500);
        expect(result.adjusted).toBe(1);
    });
});

describe('traceability', () => {
    it('stamps the originating record on the posting', async () => {
        const { engine, entries } = makeEngine();
        await engine.post({
            description: 'March payroll',
            sourceModule: 'Payroll',
            sourceType: 'PayrollRun',
            sourceId: 'run-1',
            sourceRef: 'PRL-001',
            process: 'Payroll Disbursement',
            lines: [
                { accountCode: '5100', debit: 900 },
                { accountCode: '1110', credit: 900 },
            ],
        });
        expect(entries[0]).toMatchObject({
            sourceModule: 'Payroll',
            sourceType: 'PayrollRun',
            sourceId: 'run-1',
            sourceRef: 'PRL-001',
            process: 'Payroll Disbursement',
        });
    });

    it('defaults a hand-keyed entry to the Journal source', async () => {
        const { engine, entries } = makeEngine();
        await engine.post({
            description: 'Manual',
            lines: [
                { accountCode: '5100', debit: 10 },
                { accountCode: '1110', credit: 10 },
            ],
        });
        expect(entries[0].sourceModule).toBe('Journal');
    });
});

describe('process account mapping', () => {
    function withMapping(mappings: unknown) {
        const { engine, accounts, entries } = makeEngine();
        (engine as any).prisma.systemSetting.findUnique = jest.fn(() =>
            Promise.resolve({ key: 'finance-process-mappings', value: mappings }),
        );
        return { engine, accounts, entries };
    }

    it('builds lines from the configured accounts and sides', async () => {
        const { engine } = withMapping([
            {
                process: 'Payroll Disbursement',
                lines: [
                    { field: 'Gross Salary', glCode: '5100', account: 'Labour Costs', action: 'debit' },
                    { field: 'Net Pay', glCode: '1110', account: 'Cash & Bank', action: 'credit' },
                    { field: 'PAYE Tax', glCode: '2110', account: 'Accounts Payable', action: 'credit' },
                ],
            },
        ]);

        const lines = await engine.buildFromMapping('Payroll Disbursement', {
            'Gross Salary': 1000,
            'Net Pay': 800,
            'PAYE Tax': 200,
        });

        expect(lines).toEqual([
            { accountCode: '5100', accountName: 'Labour Costs', debit: 1000, credit: 0, description: 'Gross Salary' },
            { accountCode: '1110', accountName: 'Cash & Bank', debit: 0, credit: 800, description: 'Net Pay' },
            { accountCode: '2110', accountName: 'Accounts Payable', debit: 0, credit: 200, description: 'PAYE Tax' },
        ]);
        expect(engine.totals(lines).balanced).toBe(true);
    });

    it('drops a mapped line whose amount is nil — it does not apply to this run', async () => {
        const { engine } = withMapping([
            {
                process: 'Payroll Disbursement',
                lines: [
                    { field: 'Gross Salary', glCode: '5100', action: 'debit' },
                    { field: 'Net Pay', glCode: '1110', action: 'credit' },
                    { field: 'Allowance Total', glCode: '5100', action: 'debit' },
                ],
            },
        ]);
        const lines = await engine.buildFromMapping('Payroll Disbursement', {
            'Gross Salary': 500,
            'Net Pay': 500,
            'Allowance Total': 0,
        });
        expect(lines).toHaveLength(2);
    });

    it('returns nothing for a process nobody has mapped', async () => {
        const { engine } = withMapping([{ process: 'Something Else', lines: [] }]);
        expect(await engine.buildFromMapping('Payroll Disbursement', { Amount: 100 })).toEqual([]);
    });

    it('falls back to an older name for the same process', async () => {
        // An installation that mapped payroll before "Payroll Disbursement"
        // existed as a name should keep posting without remapping.
        const { engine } = withMapping([
            {
                process: 'Payroll',
                lines: [
                    { field: 'Amount', glCode: '5100', action: 'debit' },
                    { field: 'Amount', glCode: '1110', action: 'credit' },
                ],
            },
        ]);
        const lines = await engine.buildFromMapping(
            ['Payroll Disbursement', 'Payroll'],
            { Amount: 100 },
        );
        expect(lines).toHaveLength(2);
    });

    it('prefers the first candidate that is actually mapped', async () => {
        const { engine } = withMapping([
            // Present but empty — not a mapping, so the fallback should win.
            { process: 'Payroll Disbursement', lines: [] },
            {
                process: 'Payroll',
                lines: [
                    { field: 'Amount', glCode: '5100', action: 'debit' },
                    { field: 'Amount', glCode: '1110', action: 'credit' },
                ],
            },
        ]);
        expect(
            await engine.buildFromMapping(['Payroll Disbursement', 'Payroll'], { Amount: 50 }),
        ).toHaveLength(2);
    });

    it('matches the process regardless of case and padding', async () => {
        const { engine } = withMapping([
            {
                process: '  payroll disbursement ',
                lines: [
                    { field: 'Amount', glCode: '5100', action: 'debit' },
                    { field: 'Amount', glCode: '1110', action: 'credit' },
                ],
            },
        ]);
        expect(await engine.buildFromMapping('Payroll Disbursement', { Amount: 100 })).toHaveLength(2);
    });
});
