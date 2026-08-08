import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NumberingService } from '../numbering/numbering.service';

/** A single side of a posting. Exactly one of debit/credit carries the amount. */
export interface PostingLine {
    accountCode: string;
    accountName?: string;
    debit?: number;
    credit?: number;
    description?: string;
}

export interface PostingInput {
    description: string;
    date?: string | Date;
    lines: PostingLine[];
    createdBy?: string;
    /** "Journal" | "Payment" | "Purchase" | "Payroll" | … */
    sourceModule?: string;
    sourceType?: string;
    sourceId?: string;
    sourceRef?: string;
    /** The configured process whose mapping produced these lines. */
    process?: string;
}

/**
 * Money is compared in minor units. Summing floats and testing `a === b` reads
 * a balanced posting as out by a fraction of a kobo often enough to matter.
 */
const toMinor = (n: number) => Math.round((Number(n) || 0) * 100);

/**
 * Which side increases an account, by type.
 *
 * Balances are stored in each account's *natural* sign — an Accounts Payable
 * with 500,000 owed reads as 500,000, not −500,000 — because the Chart of
 * Accounts shows this number directly and a negative there reads as an error
 * rather than as a normal credit balance.
 */
function naturalSign(accountType: string | undefined): 1 | -1 {
    const t = String(accountType ?? '').trim().toLowerCase();
    // Asset and expense accounts increase on the debit side; liability, equity
    // and income accounts increase on the credit side.
    if (t.startsWith('liabilit') || t.startsWith('equity') || t.startsWith('income') || t.startsWith('revenue'))
        return -1;
    return 1;
}

/**
 * Room for a posting to finish.
 *
 * A posting is several statements on one connection — write the entry, read the
 * accounts it touches, move each balance — and Prisma caps an interactive
 * transaction at five seconds by default. That is generous locally and not
 * generous at all against a hosted database over a proxy, where each round trip
 * costs a few hundred milliseconds: posting a payroll run timed out mid-way and
 * surfaced as a bare 500. The work inside is small and bounded; the limit is
 * here to catch a genuine hang, not to police normal latency.
 */
const TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 };

/**
 * The one way anything in BuildOS reaches the Chart of Accounts.
 *
 * Journal Entries, Payments, Purchases and Payroll all post through `post()`,
 * so the rules that make the ledger trustworthy — debits equal credits, drafts
 * move nothing, a posted entry is immutable, and every posting names the record
 * that caused it — are enforced in one place rather than re-implemented (and
 * re-forgotten) per module.
 *
 * Account balances are maintained incrementally inside the same database
 * transaction that writes the entry. A balance derived on read instead would
 * mean summing every journal line in the system on every Chart of Accounts
 * load, and would still be wrong the moment anything wrote lines another way.
 */
@Injectable()
export class PostingEngineService {
    private readonly logger = new Logger(PostingEngineService.name);

    constructor(
        private prisma: PrismaService,
        private numbering: NumberingService,
    ) { }

    /**
     * Validates a set of lines as a double entry.
     *
     * Returns the cleaned lines. Throws — rather than dropping the offender —
     * when a line carries an amount but no account: if the rest happened to
     * balance without it, silently discarding it would post an entry that has
     * quietly lost part of what the user entered.
     */
    normalizeLines(rawLines: unknown): PostingLine[] {
        const lines: PostingLine[] = Array.isArray(rawLines) ? (rawLines as PostingLine[]) : [];

        const cleaned = lines.map((l) => {
            const debit = Math.abs(Number(l?.debit) || 0);
            const credit = Math.abs(Number(l?.credit) || 0);
            if (debit > 0 && credit > 0) {
                throw new BadRequestException(
                    `Line "${l?.description || l?.accountCode || ''}" has both a debit and a credit. A posting line is one side or the other.`,
                );
            }
            return {
                accountCode: String(l?.accountCode ?? '').trim(),
                accountName: String(l?.accountName ?? '').trim(),
                debit,
                credit,
                description: l?.description ? String(l.description) : undefined,
            };
        });

        const orphaned = cleaned.find((l) => (l.debit || l.credit) && !l.accountCode);
        if (orphaned) {
            throw new BadRequestException(
                'Every posting line with an amount needs an account before it can be posted.',
            );
        }

        return cleaned.filter((l) => l.accountCode && (l.debit > 0 || l.credit > 0));
    }

    /** Total debits and credits, and whether they agree to the kobo. */
    totals(lines: PostingLine[]) {
        const debit = lines.reduce((s, l) => s + toMinor(l.debit ?? 0), 0);
        const credit = lines.reduce((s, l) => s + toMinor(l.credit ?? 0), 0);
        return {
            totalDebit: debit / 100,
            totalCredit: credit / 100,
            difference: (debit - credit) / 100,
            balanced: debit === credit,
        };
    }

    /**
     * The gate every posting passes. A journal that does not balance is not a
     * journal — posting it would put the whole ledger out and there is no
     * downstream report that could recover from it.
     */
    assertPostable(lines: PostingLine[]): void {
        if (lines.length === 0) {
            throw new BadRequestException('There is nothing to post — add at least one line with an amount.');
        }
        if (lines.length < 2) {
            throw new BadRequestException(
                'A double entry needs at least two lines — one account debited and another credited.',
            );
        }
        const { balanced, totalDebit, totalCredit, difference } = this.totals(lines);
        if (!balanced) {
            const side = difference > 0 ? 'Debits' : 'Credits';
            throw new BadRequestException(
                `The entry is not balanced. Total debits ${totalDebit.toLocaleString()} vs total credits ${totalCredit.toLocaleString()} — ${side.toLowerCase()} exceed by ${Math.abs(difference).toLocaleString()}.`,
            );
        }
    }

    /**
     * Applies a posted entry's lines to the Chart of Accounts.
     *
     * `direction` is +1 when the entry is being posted and −1 when its effect is
     * being taken back out (a reversal's original, a posted entry being voided).
     * Lines whose account code is not in the Chart of Accounts are recorded in
     * the entry but move no balance — the entry itself still balances, and
     * refusing the whole posting over an unmapped code would block the module
     * that raised it. It is logged so the gap is visible.
     */
    private async applyToAccounts(
        tx: Prisma.TransactionClient,
        lines: PostingLine[],
        direction: 1 | -1,
    ): Promise<void> {
        // One row per account, so an entry touching the same account twice
        // (common in payroll) issues a single update rather than racing itself.
        const netByCode = new Map<string, number>();
        for (const line of lines) {
            const signed = (line.debit ?? 0) - (line.credit ?? 0);
            netByCode.set(line.accountCode, (netByCode.get(line.accountCode) ?? 0) + signed);
        }

        const codes = [...netByCode.keys()];
        if (codes.length === 0) return;

        const accounts = await tx.chartAccount.findMany({
            where: { code: { in: codes } },
            select: { id: true, code: true, type: true },
        });
        const known = new Map(accounts.map((a) => [a.code, a]));

        for (const [code, net] of netByCode) {
            const account = known.get(code);
            if (!account) {
                this.logger.warn(
                    `Posting references account code "${code}", which is not in the Chart of Accounts. The entry was recorded but no balance moved.`,
                );
                continue;
            }
            const delta = (net * direction * naturalSign(account.type));
            if (Math.round(delta * 100) === 0) continue;
            await tx.chartAccount.update({
                where: { id: account.id },
                data: { balance: { increment: delta } },
            });
        }
    }

    /**
     * Records a posting.
     *
     * Everything happens in one database transaction: an entry written without
     * its balance movement — or balances moved with no entry behind them — is
     * exactly the corruption this engine exists to prevent.
     *
     * Pass `status: 'Draft'` to stage an entry without touching balances. A
     * draft is a proposal; only `postDraft` turns it into money.
     */
    async post(input: PostingInput & { status?: 'Draft' | 'Posted' }): Promise<any> {
        const status = input.status === 'Draft' ? 'Draft' : 'Posted';
        const lines = this.normalizeLines(input.lines);

        // Drafts are allowed to be lopsided while somebody is still working on
        // them; the check that matters runs when they are posted.
        if (status === 'Posted') this.assertPostable(lines);

        const when = input.date ? new Date(input.date) : new Date();
        if (Number.isNaN(when.getTime())) {
            throw new BadRequestException('The posting date is not a valid date.');
        }

        const { reference } = await this.numbering.allocate('JournalEntry');

        return this.prisma.$transaction(async (tx) => {
            const entry = await tx.journalEntry.create({
                data: {
                    reference,
                    date: when,
                    description: String(input.description ?? '').trim() || 'Posting',
                    status,
                    createdBy: input.createdBy || 'System',
                    postedAt: status === 'Posted' ? when : null,
                    sourceModule: input.sourceModule || 'Journal',
                    sourceType: input.sourceType ?? null,
                    sourceId: input.sourceId ?? null,
                    sourceRef: input.sourceRef ?? null,
                    process: input.process ?? null,
                    lines: {
                        create: lines.map((l) => ({
                            accountCode: l.accountCode,
                            accountName: l.accountName || '',
                            debit: l.debit ?? 0,
                            credit: l.credit ?? 0,
                            description: l.description ?? null,
                        })),
                    },
                },
                include: { lines: true },
            });

            if (status === 'Posted') await this.applyToAccounts(tx, lines, 1);
            return entry;
        }, TX_OPTIONS);
    }

    /**
     * Posts an entry that was saved as a draft.
     *
     * The balance check runs here rather than at save time — a draft is allowed
     * to be half-finished, but the moment it becomes a ledger record it has to
     * hold up.
     */
    async postDraft(id: string, postedBy?: string, date?: string): Promise<any> {
        const entry = await this.prisma.journalEntry.findUniqueOrThrow({
            where: { id },
            include: { lines: true },
        });
        if (entry.status === 'Posted') {
            throw new BadRequestException(`${entry.reference} has already been posted.`);
        }
        if (entry.status === 'Reversed') {
            throw new BadRequestException(`${entry.reference} has been reversed and cannot be posted again.`);
        }

        const lines = this.normalizeLines(entry.lines);
        this.assertPostable(lines);

        const when = date ? new Date(date) : new Date();
        if (Number.isNaN(when.getTime())) {
            throw new BadRequestException('The posting date is not a valid date.');
        }

        return this.prisma.$transaction(async (tx) => {
            const posted = await tx.journalEntry.update({
                where: { id },
                data: {
                    status: 'Posted',
                    postedAt: when,
                    ...(postedBy ? { createdBy: entry.createdBy || postedBy } : {}),
                },
                include: { lines: true },
            });
            await this.applyToAccounts(tx, lines, 1);
            return posted;
        }, TX_OPTIONS);
    }

    /**
     * Reverses a posted entry by posting its mirror.
     *
     * The original is never edited or deleted: a posted entry is a permanent
     * record, and the ledger has to show both it and its contra. Balances move
     * twice — the reversal's own lines are applied, which nets the original back
     * to nil without ever rewriting history.
     */
    async reverse(id: string, body: { date?: string; createdBy?: string } = {}): Promise<any> {
        const original = await this.prisma.journalEntry.findUniqueOrThrow({
            where: { id },
            include: { lines: true },
        });

        if (original.status === 'Reversed') {
            throw new BadRequestException('This journal entry has already been reversed.');
        }
        if (original.status !== 'Posted') {
            throw new BadRequestException('Only a posted journal entry can be reversed.');
        }

        const when = body.date ? new Date(body.date) : new Date();
        if (Number.isNaN(when.getTime())) {
            throw new BadRequestException('The reversal date is not a valid date.');
        }

        const { reference } = await this.numbering.allocate('JournalEntry');

        // The swap is the reversal.
        const mirrored: PostingLine[] = original.lines.map((l) => ({
            accountCode: l.accountCode,
            accountName: l.accountName,
            debit: l.credit,
            credit: l.debit,
            description: l.description ?? undefined,
        }));

        const [, reversal] = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.journalEntry.update({
                where: { id },
                data: { status: 'Reversed', reversedAt: when },
            });
            const created = await tx.journalEntry.create({
                data: {
                    reference,
                    date: when,
                    description: `Reversal of ${original.reference} — ${original.description}`,
                    status: 'Posted',
                    postedAt: when,
                    createdBy: body.createdBy || original.createdBy || 'System',
                    reversalOfId: original.id,
                    sourceModule: original.sourceModule,
                    sourceType: original.sourceType,
                    sourceId: original.sourceId,
                    sourceRef: original.sourceRef,
                    process: original.process,
                    lines: { create: mirrored.map((l) => ({
                        accountCode: l.accountCode,
                        accountName: l.accountName || '',
                        debit: l.debit ?? 0,
                        credit: l.credit ?? 0,
                        description: l.description ?? null,
                    })) },
                },
                include: { lines: true },
            });
            await this.applyToAccounts(tx, mirrored, 1);
            return [updated, created] as const;
        }, TX_OPTIONS);

        return {
            original: await this.prisma.journalEntry.findUnique({
                where: { id },
                include: { lines: true },
            }),
            reversal,
        };
    }

    /**
     * Rebuilds every Chart of Accounts balance from the posted journal lines.
     *
     * Needed once, to bring accounts that predate this engine in line — their
     * balances were never maintained at all — and useful afterwards as the
     * reconciliation any accountant will ask for. Recomputing from source is
     * always safe: the posted lines are the truth, the balance column is a
     * cache of them.
     */
    async recomputeBalances(): Promise<{ accounts: number; adjusted: number }> {
        const [accounts, entries] = await Promise.all([
            this.prisma.chartAccount.findMany({ select: { id: true, code: true, type: true, balance: true } }),
            this.prisma.journalEntry.findMany({
                where: { status: 'Posted' },
                select: { lines: { select: { accountCode: true, debit: true, credit: true } } },
            }),
        ]);

        const netByCode = new Map<string, number>();
        for (const entry of entries) {
            for (const line of entry.lines) {
                const signed = (line.debit || 0) - (line.credit || 0);
                netByCode.set(line.accountCode, (netByCode.get(line.accountCode) ?? 0) + signed);
            }
        }

        let adjusted = 0;
        await this.prisma.$transaction(async (tx) => {
            for (const account of accounts) {
                const net = netByCode.get(account.code) ?? 0;
                const balance = Number(((net * naturalSign(account.type))).toFixed(2));
                if (Math.round((account.balance - balance) * 100) === 0) continue;
                await tx.chartAccount.update({ where: { id: account.id }, data: { balance } });
                adjusted += 1;
            }
        }, TX_OPTIONS);

        return { accounts: accounts.length, adjusted };
    }

    /**
     * Builds posting lines for a business process from its configured mapping.
     *
     * Finance › Posting Engine › Process Account Mapping says which account each
     * amount a process produces hits, and on which side. Reading it here is what
     * makes payroll (and anything else) use configuration rather than accounts
     * hardcoded in the module that happens to be posting.
     */
    async buildFromMapping(
        process: string | string[],
        amounts: Record<string, number>,
    ): Promise<PostingLine[]> {
        const row = await this.prisma.systemSetting.findUnique({
            where: { key: 'finance-process-mappings' },
        });
        const mappings: any[] = Array.isArray(row?.value) ? (row!.value as any[]) : [];

        // Several names may denote the same process — payroll posts through
        // "Payroll Disbursement", but an installation that mapped it as
        // "Payroll" before that name existed should keep working. The first
        // candidate that is actually mapped wins.
        const candidates = (Array.isArray(process) ? process : [process]).map((p) =>
            p.trim().toLowerCase(),
        );
        const mapping = candidates
            .map((needle) =>
                mappings.find(
                    (m) => String(m?.process ?? '').trim().toLowerCase() === needle,
                ),
            )
            .find((m) => Array.isArray(m?.lines) && m.lines.length > 0);

        const lines: any[] = Array.isArray(mapping?.lines) ? mapping.lines : [];
        return lines
            .map((l) => {
                const amount = Number(amounts[String(l?.field ?? '')] ?? 0) || 0;
                const isDebit = String(l?.action ?? '').toLowerCase() === 'debit';
                return {
                    accountCode: String(l?.glCode ?? ''),
                    accountName: String(l?.account ?? ''),
                    debit: isDebit ? amount : 0,
                    credit: isDebit ? 0 : amount,
                    description: String(l?.field ?? ''),
                };
            })
            // A mapped line whose source amount is nil does not apply to this
            // run — it is not a zero posting.
            .filter((l) => l.debit > 0 || l.credit > 0);
    }
}
