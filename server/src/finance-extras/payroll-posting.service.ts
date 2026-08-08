import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NumberingService } from '../numbering/numbering.service';
import { PostingEngineService } from './posting-engine.service';

/** The process whose Process Account Mapping governs how payroll posts. */
export const PAYROLL_PROCESS = 'Payroll Disbursement';

/**
 * Names that count as that process, in order of preference.
 *
 * "Payroll" is accepted because it is what the process catalogue offered before
 * "Payroll Disbursement" existed — an installation that already mapped it that
 * way should not have to remap to keep posting.
 */
const PAYROLL_PROCESS_CANDIDATES = [PAYROLL_PROCESS, 'Payroll'];

/**
 * Statuses a run carries once HR is done with it.
 *
 * Approving the *accounting* is deliberately a separate act from performing it:
 * the person who authorises a payroll to hit the ledger is not always the one
 * who runs the posting, and an approval that immediately posts gives nobody a
 * chance to stop it.
 */
export const PAYROLL_STATUS = {
    /** HR has approved the run. It now appears in Finance › Payroll Overview. */
    hrApproved: 'Approved',
    pendingPostingApproval: 'Pending Posting Approval',
    postingApproved: 'Posting Approved',
    posted: 'Posted',
} as const;

export interface PayrollTotals {
    totalEarnings: number;
    totalDeductions: number;
    netPay: number;
    tax: number;
    pension: number;
    allowances: number;
    overtime: number;
}

/**
 * What HR finishing with a run looks like.
 *
 * The payroll orchestration marks a finished run "Completed"; "Approved" is the
 * name the flow is described in. Both mean the same thing to Finance — HR is
 * done and the run is ready to be posted — so both are accepted and both are
 * reported as Approved, rather than leaving every run HR actually produces
 * invisible to this screen.
 */
const HR_APPROVED = ['Approved', 'Completed'];

/** Statuses Finance is allowed to see and act on. */
const FINANCE_VISIBLE = [
    ...HR_APPROVED,
    PAYROLL_STATUS.pendingPostingApproval,
    PAYROLL_STATUS.postingApproved,
    PAYROLL_STATUS.posted,
];

/**
 * The Finance side of a payroll run: HR approves it, Finance approves posting
 * it, and then posts it through the shared posting engine.
 *
 * Which accounts payroll hits is not decided here. The lines come from the
 * "Payroll Disbursement" Process Account Mapping, so a change of chart or of
 * policy is a configuration edit rather than a code change.
 */
@Injectable()
export class PayrollPostingService {
    constructor(
        private prisma: PrismaService,
        private numbering: NumberingService,
        private posting: PostingEngineService,
    ) { }

    /**
     * The Payroll Overview list.
     *
     * Only runs HR has approved: a draft or in-progress run is HR's to finish,
     * and showing it here invites Finance to post a payroll that is still moving.
     */
    async overview() {
        const runs = await this.prisma.payrollRun.findMany({
            where: { status: { in: FINANCE_VISIBLE } },
            include: { entries: true },
            orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
        });

        const journalIds = runs.map((r) => r.journalEntryId).filter(Boolean) as string[];
        const journals = journalIds.length
            ? await this.prisma.journalEntry.findMany({
                where: { id: { in: journalIds } },
                select: { id: true, reference: true, status: true },
            })
            : [];
        const journalById = new Map(journals.map((j) => [j.id, j]));

        return runs.map((run) => {
            const totals = this.totalsFor(run.entries, run);
            const journal = run.journalEntryId ? journalById.get(run.journalEntryId) : undefined;
            return {
                id: run.id,
                code: run.code ?? run.id,
                periodName: run.periodName,
                month: run.month,
                year: run.year,
                // Normalised so the screen has one name for "HR is done with
                // it" rather than two that mean the same thing.
                status: HR_APPROVED.includes(run.status)
                    ? PAYROLL_STATUS.hrApproved
                    : run.status,
                employeeCount: run.employeeCount,
                totalEarnings: totals.totalEarnings,
                totalDeductions: totals.totalDeductions,
                netPay: totals.netPay,
                postingRequestedBy: run.postingRequestedBy,
                postingRequestedAt: run.postingRequestedAt,
                postingApprovedBy: run.postingApprovedBy,
                postingApprovedAt: run.postingApprovedAt,
                postedBy: run.postedBy,
                postedAt: run.postedAt,
                journalEntryId: run.journalEntryId,
                journalReference: journal?.reference ?? null,
            };
        });
    }

    /**
     * Earnings, deductions and net for a run.
     *
     * Derived from the entries where there are any, because PayrollRun stores
     * only gross and net — "Total Deductions" as a column has to come from
     * somewhere, and gross minus net is the same number by definition. The run
     * totals are the fallback so a run whose entries were never written still
     * shows the figures HR signed off.
     */
    private totalsFor(entries: any[], run: { totalGross: number; totalNet: number }): PayrollTotals {
        if (entries.length === 0) {
            return {
                totalEarnings: run.totalGross,
                totalDeductions: Number((run.totalGross - run.totalNet).toFixed(2)),
                netPay: run.totalNet,
                tax: 0,
                pension: 0,
                allowances: 0,
                overtime: 0,
            };
        }
        const sum = (pick: (e: any) => number) =>
            Number(entries.reduce((s, e) => s + (Number(pick(e)) || 0), 0).toFixed(2));
        const totalEarnings = sum((e) => e.grossPay);
        const netPay = sum((e) => e.netPay);
        return {
            totalEarnings,
            totalDeductions: Number((totalEarnings - netPay).toFixed(2)),
            netPay,
            tax: sum((e) => e.tax),
            pension: sum((e) => e.pension),
            allowances: sum((e) => e.allowances),
            overtime: sum((e) => e.overtime),
        };
    }

    /**
     * A run's totals under every name a mapping line might refer to them by.
     *
     * The mapping's source fields are picked from a fixed vocabulary that is
     * shared across all processes ("Gross Amount", "Net Payment", "Amount"), so
     * the same payroll figure has to answer to whichever of them an admin chose
     * — otherwise a perfectly reasonable mapping silently produces no lines.
     */
    private mappableAmounts(totals: PayrollTotals) {
        return {
            'Gross Salary': totals.totalEarnings,
            'Gross Amount': totals.totalEarnings,
            'Labour Cost': totals.totalEarnings,
            Amount: totals.totalEarnings,
            'Net Pay': totals.netPay,
            'Net Amount': totals.netPay,
            'Net Payment': totals.netPay,
            'PAYE Tax': totals.tax,
            Tax: totals.tax,
            'Allowance Total': totals.allowances,
        };
    }

    private async loadRun(id: string) {
        return this.prisma.payrollRun.findUniqueOrThrow({
            where: { id },
            include: { entries: true },
        });
    }

    /** Gives a run its Payroll Code the first time Finance touches it. */
    private async ensureCode(run: { id: string; code: string | null }): Promise<string> {
        if (run.code) return run.code;
        const { reference } = await this.numbering.allocate('PayrollRun');
        await this.prisma.payrollRun.update({
            where: { id: run.id },
            data: { code: reference },
        });
        return reference;
    }

    /** HR Approved → Pending Posting Approval. */
    async sendForPostingApproval(id: string, by?: string) {
        const run = await this.loadRun(id);
        if (!HR_APPROVED.includes(run.status)) {
            throw new BadRequestException(
                run.status === PAYROLL_STATUS.pendingPostingApproval
                    ? 'This payroll has already been sent for posting approval.'
                    : `Only an HR-approved payroll can be sent for posting approval. This run is ${run.status}.`,
            );
        }
        await this.ensureCode(run);
        return this.prisma.payrollRun.update({
            where: { id },
            data: {
                status: PAYROLL_STATUS.pendingPostingApproval,
                postingRequestedBy: by || 'Finance',
                postingRequestedAt: new Date(),
            },
        });
    }

    /** Pending Posting Approval → Posting Approved. Still moves no money. */
    async approvePosting(id: string, by?: string) {
        const run = await this.loadRun(id);
        if (run.status !== PAYROLL_STATUS.pendingPostingApproval) {
            throw new BadRequestException(
                `Only a payroll awaiting posting approval can be approved. This run is ${run.status}.`,
            );
        }
        return this.prisma.payrollRun.update({
            where: { id },
            data: {
                status: PAYROLL_STATUS.postingApproved,
                postingApprovedBy: by || 'Finance',
                postingApprovedAt: new Date(),
            },
        });
    }

    /**
     * Posting Approved → Posted, generating the accounting entry.
     *
     * The run is only marked Posted once the journal exists: a run flagged as
     * posted with nothing in the ledger behind it is the failure this whole flow
     * is built to avoid, so the status write happens after the posting, not
     * alongside it.
     */
    async post(id: string, by?: string) {
        const run = await this.loadRun(id);
        if (run.status === PAYROLL_STATUS.posted) {
            throw new BadRequestException('This payroll has already been posted.');
        }
        if (run.status !== PAYROLL_STATUS.postingApproved) {
            throw new BadRequestException(
                `A payroll must be approved for posting before it can be posted. This run is ${run.status}.`,
            );
        }

        const totals = this.totalsFor(run.entries, run);
        const lines = await this.posting.buildFromMapping(
            PAYROLL_PROCESS_CANDIDATES,
            this.mappableAmounts(totals),
        );

        if (lines.length === 0) {
            throw new BadRequestException(
                `"${PAYROLL_PROCESS}" has no Process Account Mapping. Map it under Finance › Posting Engine › Process Account Mapping before posting a payroll, or the posting has nowhere to go.`,
            );
        }

        const code = await this.ensureCode(run);
        const entry = await this.posting.post({
            description: `${run.periodName} payroll — ${run.employeeCount} employee${run.employeeCount === 1 ? '' : 's'}`,
            date: new Date(),
            createdBy: by || 'Finance',
            lines,
            sourceModule: 'Payroll',
            sourceType: 'PayrollRun',
            sourceId: run.id,
            sourceRef: code,
            process: PAYROLL_PROCESS,
        });

        const updated = await this.prisma.payrollRun.update({
            where: { id },
            data: {
                status: PAYROLL_STATUS.posted,
                postedBy: by || 'Finance',
                postedAt: new Date(),
                journalEntryId: entry.id,
            },
        });

        return { run: updated, journalEntry: entry };
    }

    /**
     * What a run *would* post, without posting it.
     *
     * Lets the Overview show the double entry before anyone commits to it —
     * and surfaces a missing mapping at review time rather than at the moment
     * somebody presses Post.
     */
    async preview(id: string) {
        const run = await this.loadRun(id);
        const totals = this.totalsFor(run.entries, run);
        const lines = await this.posting.buildFromMapping(
            PAYROLL_PROCESS_CANDIDATES,
            this.mappableAmounts(totals),
        );
        return {
            process: PAYROLL_PROCESS,
            mapped: lines.length > 0,
            totals,
            lines,
            ...this.posting.totals(lines),
        };
    }
}
