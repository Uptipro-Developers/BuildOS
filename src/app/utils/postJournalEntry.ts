import {
  createJournalEntry,
  getChartAccounts,
  getProcessMappings,
  type JournalEntry,
} from "../api/finance-extras";
import type { JournalLineInput } from "../components/JournalLinesEditor";
import { journalTotals } from "../components/JournalLinesEditor";

/**
 * Posts a balanced double-entry to the ledger, from wherever the money moved.
 *
 * Paying a supplier invoice and completing a payment are accounting events, but
 * both used to be status flips: the invoice went to Paid, the payment went to
 * Completed, and nothing reached the Chart of Accounts — so the trial balance
 * and the ledger only ever knew about entries somebody had keyed by hand in
 * Journal Entries. This is the one way any module posts, which is also why the
 * balance check lives here rather than in each caller.
 *
 * Throws rather than returning null: a payment recorded against an unbalanced
 * posting is a payment with no accounting behind it, and the caller must not
 * carry on and mark the thing paid.
 */
export async function postJournalEntry(input: {
  description: string;
  date: string;
  createdBy: string;
  lines: JournalLineInput[];
  /** Human reference of the document this settles, e.g. an invoice number. */
  reference?: string;
}): Promise<JournalEntry> {
  // Checked before anything is dropped. Filtering first would silently discard
  // a line carrying an amount but no account — and if the remaining lines
  // happened to balance without it, the posting would go through having quietly
  // lost part of what the user entered.
  const orphaned = input.lines.find((l) => (l.debit || l.credit) && !l.glCode);
  if (orphaned) {
    throw new Error(
      "Every posting line with an amount needs an account before it can be posted.",
    );
  }

  const lines = input.lines.filter((l) => l.glCode && (l.debit || l.credit));
  const { balanced, difference } = journalTotals(lines);
  if (!balanced) {
    throw new Error(
      lines.length === 0
        ? "There is nothing to post."
        : `The posting is not balanced — ${difference > 0 ? "debits" : "credits"} exceed by ${Math.abs(difference).toLocaleString()}.`,
    );
  }

  return createJournalEntry({
    date: new Date(input.date).toISOString(),
    description: input.description,
    // Posted, not Draft: this is a record of something that has already
    // happened, not a proposal somebody still has to approve.
    status: "Posted",
    createdBy: input.createdBy,
    lines: lines.map((l) => ({
      accountCode: l.glCode,
      accountName: l.account,
      debit: l.debit || 0,
      credit: l.credit || 0,
      description: l.description || undefined,
    })),
    ...(input.reference ? { reference: input.reference } : {}),
  });
}

/** The Chart of Accounts, in the shape the lines editor expects. */
export async function loadPostableAccounts(): Promise<
  { code: string; name: string }[]
> {
  const data = await getChartAccounts();
  return (data as any[])
    // Inactive accounts are kept for history but must not take new postings.
    .filter((a) => a.isActive !== false)
    .map((a) => ({ code: String(a.code ?? ""), name: String(a.name ?? "") }))
    .filter((a) => a.code);
}

/**
 * Finds an account by name fragment, for seeding a posting's default lines.
 *
 * Settling a payable is always "debit Accounts Payable, credit Cash & Bank", so
 * the modal opens with those two lines already filled in — but the codes are
 * whatever this organisation configured, not the ones in the seed data.
 */
export function findAccount(
  accounts: { code: string; name: string }[],
  ...candidates: string[]
): { code: string; name: string } | undefined {
  for (const candidate of candidates) {
    const needle = candidate.toLowerCase();
    const hit = accounts.find((a) => a.name.toLowerCase().includes(needle));
    if (hit) return hit;
  }
  return undefined;
}


/**
 * Builds the posting lines for a business process from its configured mapping.
 *
 * Finance › Process Mapping already let an admin say how a process posts —
 * which account each amount hits and on which side — but nothing read it, so
 * the configuration governed nothing and any module that posted had to hardcode
 * its own accounts. This is what makes the mapping real: pass the process name
 * and the amounts it produced, and the lines come from configuration.
 *
 * Returns an empty array when the process has no mapping, which the caller must
 * treat as "not configured" rather than "nothing to post".
 */
export async function buildProcessPosting(
  process: string,
  fields: Record<string, number>,
): Promise<JournalLineInput[]> {
  const mappings = await getProcessMappings();
  const mapping = (mappings as any[]).find(
    (m) =>
      String(m?.process ?? "").trim().toLowerCase() ===
      process.trim().toLowerCase(),
  );
  const lines: any[] = Array.isArray(mapping?.lines) ? mapping.lines : [];

  return lines
    .map((l, i) => {
      const amount = Number(fields[String(l?.field ?? "")] ?? 0) || 0;
      return {
        id: `${process}-${i}`,
        glCode: String(l?.glCode ?? ""),
        account: String(l?.account ?? ""),
        debit: l?.action === "debit" ? amount : 0,
        credit: l?.action === "credit" ? amount : 0,
        description: String(l?.field ?? ""),
      };
    })
    // A mapped line whose source field produced nothing is not a zero posting,
    // it is a line that does not apply to this run.
    .filter((l) => l.debit > 0 || l.credit > 0);
}
