import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { notifyLoadFailure } from "../../utils/loadFailure";
import { exportCSV } from "../../utils/exportCSV";
import { DataTable, type Column } from "../../components/DataTable";
import {
  getJournalEntries,
  type JournalEntry,
} from "../../api/finance-extras";
import {
  csvAmountHeader,
  formatCurrencyByGeneralSettings,
  formatDateByGeneralSettings,
} from "../../utils/generalSettings";

interface GLRow {
  key: string;
  date: string;
  /** Sortable form of the date, since the displayed one is locale-formatted. */
  sortDate: string;
  reference: string;
  source: string;
  account: string;
  description: string;
  debit: number;
  credit: number;
  /** Running balance for this line's account, in posting order. */
  balance: number;
}

/**
 * Every posted accounting line in the system, in one place.
 *
 * Reads the posted journal entries rather than a separate ledger table: a
 * journal entry *is* the posting, and Payments and Purchase Invoice settlements
 * now write one too, so this is the consolidated view of everything that has
 * hit the Chart of Accounts. Draft entries are excluded — a draft has not been
 * posted, and showing it here would put money in the ledger that nobody has
 * committed. Reversed entries stay: the reversal is its own entry, and the
 * ledger has to show both sides or it stops reconciling.
 */
export function GeneralLedgerPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJournalEntries()
      .then((rows) =>
        setEntries(
          rows.filter((e) => String(e.status).toLowerCase() !== "draft"),
        ),
      )
      .catch((err) => notifyLoadFailure("the general ledger", err))
      .finally(() => setLoading(false));
  }, []);

  const { rows, totalDebits, totalCredits } = useMemo(() => {
    const balanceByAccount: Record<string, number> = {};
    const out: GLRow[] = [];
    // Posting order, so the running balance means something.
    const sorted = [...entries].sort((a, b) => {
      const d = String(a.date).localeCompare(String(b.date));
      return d !== 0 ? d : a.reference.localeCompare(b.reference);
    });

    for (const entry of sorted) {
      for (const [i, line] of (entry.lines ?? []).entries()) {
        const account = [line.accountCode, line.accountName]
          .filter(Boolean)
          .join(" ")
          .trim();
        const key = account || "(unassigned)";
        balanceByAccount[key] =
          (balanceByAccount[key] ?? 0) + (line.debit || 0) - (line.credit || 0);
        out.push({
          key: `${entry.id}-${line.id ?? i}`,
          date: formatDateByGeneralSettings(entry.date),
          sortDate: String(entry.date),
          reference: entry.reference,
          source: entry.createdBy || "—",
          account: key,
          description: [entry.description, line.description]
            .filter(Boolean)
            .join(" — "),
          debit: line.debit || 0,
          credit: line.credit || 0,
          balance: balanceByAccount[key],
        });
      }
    }
    return {
      rows: out,
      totalDebits: out.reduce((s, r) => s + r.debit, 0),
      totalCredits: out.reduce((s, r) => s + r.credit, 0),
    };
  }, [entries]);

  function handleExport() {
    exportCSV(
      "general-ledger",
      [
        "Date",
        "Reference",
        "Posted By",
        "Account",
        "Description",
        csvAmountHeader("Debit"),
        csvAmountHeader("Credit"),
        csvAmountHeader("Balance"),
      ],
      rows.map((r) => [
        r.date,
        r.reference,
        r.source,
        r.account,
        r.description,
        r.debit || "",
        r.credit || "",
        r.balance,
      ]),
    );
  }

  const columns: Column<GLRow>[] = [
    {
      key: "sortDate",
      label: "Date",
      sortable: true,
      filterable: true,
      render: (r) => (
        <span className="text-sm text-gray-500 whitespace-nowrap">{r.date}</span>
      ),
    },
    {
      key: "reference",
      label: "Reference",
      sortable: true,
      filterable: true,
      render: (r) => (
        <span className="font-mono text-xs text-gray-600">{r.reference}</span>
      ),
    },
    {
      key: "source",
      label: "Posted By",
      sortable: true,
      filterable: true,
      render: (r) => <span className="text-xs text-gray-500">{r.source}</span>,
    },
    {
      key: "account",
      label: "Account",
      sortable: true,
      filterable: true,
      minWidth: 180,
      render: (r) => (
        <span className="font-mono text-xs text-gray-700">{r.account}</span>
      ),
    },
    {
      key: "description",
      label: "Description",
      sortable: true,
      filterable: true,
      minWidth: 220,
      render: (r) => (
        <span
          className="text-sm text-gray-900 max-w-[260px] block truncate"
          title={r.description}
        >
          {r.description}
        </span>
      ),
    },
    {
      key: "debit",
      label: "Debit",
      sortable: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (r) =>
        r.debit ? (
          <span className="text-sm font-medium text-emerald-700">
            {formatCurrencyByGeneralSettings(r.debit)}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    {
      key: "credit",
      label: "Credit",
      sortable: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (r) =>
        r.credit ? (
          <span className="text-sm font-medium text-red-600">
            {formatCurrencyByGeneralSettings(r.credit)}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    {
      key: "balance",
      label: "Balance",
      sortable: true,
      className: "text-right",
      headerClassName: "text-right",
      // DR/CR rather than a minus sign: a credit balance on a liability account
      // is normal, and showing it as negative reads as an error.
      render: (r) => (
        <span
          className={`text-sm font-semibold ${r.balance >= 0 ? "text-gray-800" : "text-red-600"}`}
        >
          {formatCurrencyByGeneralSettings(Math.abs(r.balance))}
          {r.balance < 0 ? " CR" : " DR"}
        </span>
      ),
    },
  ];

  if (loading)
    return <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">General Ledger</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Every posted accounting line across the system — journal entries,
            payments and supplier invoice settlements
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Download className="w-4 h-4" /> Export Ledger
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 font-medium">Total Debits</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {formatCurrencyByGeneralSettings(totalDebits)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 font-medium">Total Credits</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {formatCurrencyByGeneralSettings(totalCredits)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 font-medium">Ledger Status</p>
          {/* Rounded before comparing: floating-point sums of currency can
              differ by a fraction of a kobo and read as unbalanced when the
              ledger is in fact square. */}
          <p
            className={`text-2xl font-bold mt-1 ${Math.round((totalDebits - totalCredits) * 100) === 0 ? "text-emerald-600" : "text-red-600"}`}
          >
            {Math.round((totalDebits - totalCredits) * 100) === 0
              ? "✓ Balanced"
              : "⚠ Unbalanced"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {rows.length} ledger line{rows.length === 1 ? "" : "s"} ·{" "}
            {entries.length} posting{entries.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        keyExtractor={(r) => r.key}
        searchPlaceholder="Search reference, account, description…"
        searchFields={[
          (r) => r.reference,
          (r) => r.account,
          (r) => r.description,
          (r) => r.source,
        ]}
        emptyMessage="Nothing posted yet — post a journal entry, pay an invoice or complete a payment to see it here"
      />
    </div>
  );
}
