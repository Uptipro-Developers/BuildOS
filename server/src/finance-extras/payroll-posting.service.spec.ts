import { BadRequestException } from '@nestjs/common';
import { PayrollPostingService, PAYROLL_STATUS } from './payroll-posting.service';

/**
 * Payroll's route from HR to the ledger.
 *
 * The flow used to live entirely in React state on the Payroll Integration
 * page: a run "approved" or "paid" there was back to its old status on the next
 * refresh, and paying it posted whatever the page had in memory. These cover
 * the gates that make the flow mean something — each step only reachable from
 * the one before it, and Posted only ever set once a journal exists.
 */

const MAPPING = [
    {
        process: 'Payroll Disbursement',
        lines: [
            { field: 'Gross Salary', glCode: '5100', account: 'Labour Costs', action: 'debit' },
            { field: 'PAYE Tax', glCode: '2120', account: 'Accrued Expenses', action: 'credit' },
            { field: 'Net Pay', glCode: '1110', account: 'Cash & Bank', action: 'credit' },
        ],
    },
];

function makeService(
    run: Partial<Record<string, any>> = {},
    { mapping = MAPPING as unknown }: { mapping?: unknown } = {},
) {
    // The posting trail columns start absent and are filled in by the service,
    // which is what the assertions are checking.
    const stored: Record<string, any> = {
        id: 'run-1',
        code: null,
        periodName: 'March 2026',
        month: 3,
        year: 2026,
        status: PAYROLL_STATUS.hrApproved,
        totalGross: 1000,
        totalNet: 800,
        employeeCount: 2,
        journalEntryId: null,
        entries: [
            { grossPay: 600, netPay: 480, tax: 120, pension: 0, allowances: 100, overtime: 0 },
            { grossPay: 400, netPay: 320, tax: 80, pension: 0, allowances: 0, overtime: 0 },
        ],
        ...run,
    };

    const prisma: any = {
        payrollRun: {
            findUniqueOrThrow: jest.fn(() => Promise.resolve(stored)),
            findMany: jest.fn(() => Promise.resolve([stored])),
            update: jest.fn(({ data }: any) => {
                Object.assign(stored, data);
                return Promise.resolve(stored);
            }),
        },
        journalEntry: { findMany: jest.fn(() => Promise.resolve([])) },
        systemSetting: {
            findUnique: jest.fn(() =>
                Promise.resolve(mapping ? { key: 'finance-process-mappings', value: mapping } : null),
            ),
        },
    };

    const numbering: any = {
        allocate: jest.fn(() => Promise.resolve({ reference: 'PRL-001' })),
    };

    const posting: any = {
        // Mirrors the real engine, which accepts several names for one process.
        buildFromMapping: jest.fn(async (
            process: string | string[],
            amounts: Record<string, number>,
        ) => {
            const list: any[] = Array.isArray(mapping) ? (mapping as any[]) : [];
            const candidates = (Array.isArray(process) ? process : [process]).map((p) =>
                p.toLowerCase(),
            );
            const found = list.find((m) =>
                candidates.includes(String(m.process).toLowerCase()),
            );
            return (found?.lines ?? [])
                .map((l: any) => {
                    const amount = Number(amounts[l.field] ?? 0) || 0;
                    const isDebit = l.action === 'debit';
                    return {
                        accountCode: l.glCode,
                        accountName: l.account,
                        debit: isDebit ? amount : 0,
                        credit: isDebit ? 0 : amount,
                        description: l.field,
                    };
                })
                .filter((l: any) => l.debit > 0 || l.credit > 0);
        }),
        post: jest.fn(async (input: any) => ({ id: 'je-1', reference: 'JE-001', ...input })),
        totals: jest.fn(() => ({ totalDebit: 1000, totalCredit: 1000, difference: 0, balanced: true })),
    };

    return {
        service: new PayrollPostingService(prisma, numbering, posting),
        stored,
        posting,
        prisma,
    };
}

describe('the status flow', () => {
    it('moves an HR-approved run to Pending Posting Approval', async () => {
        const { service, stored } = makeService();
        await service.sendForPostingApproval('run-1', 'Ada');
        expect(stored.status).toBe(PAYROLL_STATUS.pendingPostingApproval);
        expect(stored.postingRequestedBy).toBe('Ada');
    });

    it('gives the run its Payroll Code on the way through', async () => {
        const { service, stored } = makeService();
        await service.sendForPostingApproval('run-1');
        expect(stored.code).toBe('PRL-001');
    });

    it('keeps a code the run already had rather than allocating another', async () => {
        const { service, stored } = makeService({ code: 'PRL-042' });
        await service.sendForPostingApproval('run-1');
        expect(stored.code).toBe('PRL-042');
    });

    it('refuses to send a run HR has not approved', async () => {
        const { service } = makeService({ status: 'Draft' });
        await expect(service.sendForPostingApproval('run-1')).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });

    it('accepts the "Completed" status the payroll orchestration actually writes', async () => {
        // Otherwise every run HR really produces is invisible to Finance.
        const { service, stored } = makeService({ status: 'Completed' });
        await service.sendForPostingApproval('run-1');
        expect(stored.status).toBe(PAYROLL_STATUS.pendingPostingApproval);
    });

    it('reports a Completed run as Approved, so the screen has one name for it', async () => {
        const { service } = makeService({ status: 'Completed' });
        const [row] = await service.overview();
        expect(row.status).toBe(PAYROLL_STATUS.hrApproved);
    });

    it('will not approve posting for a run that was never sent', async () => {
        const { service } = makeService();
        await expect(service.approvePosting('run-1')).rejects.toThrow(/awaiting posting approval/i);
    });

    it('approves posting without moving any money', async () => {
        const { service, stored, posting } = makeService({
            status: PAYROLL_STATUS.pendingPostingApproval,
        });
        await service.approvePosting('run-1', 'Bem');
        expect(stored.status).toBe(PAYROLL_STATUS.postingApproved);
        expect(stored.postingApprovedBy).toBe('Bem');
        // Approving to post is not posting — that is the whole reason the two
        // steps are separate.
        expect(posting.post).not.toHaveBeenCalled();
    });

    it('will not post a run that has only been sent for approval', async () => {
        const { service } = makeService({ status: PAYROLL_STATUS.pendingPostingApproval });
        await expect(service.post('run-1')).rejects.toThrow(/approved for posting/i);
    });

    it('will not post the same run twice', async () => {
        const { service } = makeService({ status: PAYROLL_STATUS.posted });
        await expect(service.post('run-1')).rejects.toThrow(/already been posted/i);
    });
});

describe('posting a run', () => {
    it('posts through the engine and marks the run Posted', async () => {
        const { service, stored, posting } = makeService({
            status: PAYROLL_STATUS.postingApproved,
        });
        const result = await service.post('run-1', 'Ada');

        expect(posting.post).toHaveBeenCalledTimes(1);
        expect(stored.status).toBe(PAYROLL_STATUS.posted);
        expect(stored.journalEntryId).toBe('je-1');
        expect(result.journalEntry.reference).toBe('JE-001');
    });

    it('stamps the run on the posting, so the ledger traces back to it', async () => {
        const { service, posting } = makeService({ status: PAYROLL_STATUS.postingApproved });
        await service.post('run-1');
        expect(posting.post.mock.calls[0][0]).toMatchObject({
            sourceModule: 'Payroll',
            sourceType: 'PayrollRun',
            sourceId: 'run-1',
            sourceRef: 'PRL-001',
            process: 'Payroll Disbursement',
        });
    });

    it('takes its accounts from the mapping, not from anything hardcoded here', async () => {
        const { service, posting } = makeService({ status: PAYROLL_STATUS.postingApproved });
        await service.post('run-1');
        expect(posting.post.mock.calls[0][0].lines).toEqual([
            { accountCode: '5100', accountName: 'Labour Costs', debit: 1000, credit: 0, description: 'Gross Salary' },
            { accountCode: '2120', accountName: 'Accrued Expenses', debit: 0, credit: 200, description: 'PAYE Tax' },
            { accountCode: '1110', accountName: 'Cash & Bank', debit: 0, credit: 800, description: 'Net Pay' },
        ]);
    });

    it('refuses, and says where to fix it, when the process is unmapped', async () => {
        const { service, posting } = makeService(
            { status: PAYROLL_STATUS.postingApproved },
            { mapping: [] },
        );
        await expect(service.post('run-1')).rejects.toThrow(/Process Account Mapping/i);
        expect(posting.post).not.toHaveBeenCalled();
    });

    it('leaves the run un-posted when the mapping is missing', async () => {
        const { service, stored } = makeService(
            { status: PAYROLL_STATUS.postingApproved },
            { mapping: [] },
        );
        await expect(service.post('run-1')).rejects.toThrow();
        expect(stored.status).toBe(PAYROLL_STATUS.postingApproved);
    });
});

describe('the overview figures', () => {
    it('derives total deductions from the entries', async () => {
        const { service } = makeService();
        const [row] = await service.overview();
        expect(row.totalEarnings).toBe(1000);
        expect(row.totalDeductions).toBe(200);
        expect(row.netPay).toBe(800);
    });

    it('falls back to the run totals when a run has no entries', async () => {
        const { service } = makeService({ entries: [], totalGross: 5000, totalNet: 3800 });
        const [row] = await service.overview();
        expect(row.totalEarnings).toBe(5000);
        expect(row.totalDeductions).toBe(1200);
    });

    it('shows the month and year the run belongs to', async () => {
        const { service } = makeService();
        const [row] = await service.overview();
        expect(row).toMatchObject({ month: 3, year: 2026, periodName: 'March 2026' });
    });

    it('previews the entry without posting it', async () => {
        const { service, stored, posting } = makeService({
            status: PAYROLL_STATUS.postingApproved,
        });
        const preview = await service.preview('run-1');
        expect(preview.mapped).toBe(true);
        expect(preview.lines).toHaveLength(3);
        expect(posting.post).not.toHaveBeenCalled();
        expect(stored.status).toBe(PAYROLL_STATUS.postingApproved);
    });

    it('reports an unmapped process at review time, before anyone presses Post', async () => {
        const { service } = makeService({}, { mapping: [] });
        expect((await service.preview('run-1')).mapped).toBe(false);
    });
});
