import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Download, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { notifyLoadFailure } from "../../utils/loadFailure";
import { exportCSV } from "../../utils/exportCSV";
import { DataTable, type Column } from "../../components/DataTable";
import {
  getGeneralLedger,
  type GeneralLedger,
  type GeneralLedgerRow,
} from "../../api/finance-extras";
import {
  csvAmountHeader,
  formatCurrencyByGeneralSettings,
  formatDateByGeneralSettings,
} from "../../utils/generalSettings";

/**
 * Where a posting came from, and where to go to see it.
 *
 * Every engine stamps its own module on what it posts, so a ledger line can be
 * followed back to the invoice, payment or payroll run that caused it — which
 * is the difference between a ledger you can audit and a list of numbers.
 */
const SOURCE_ROUTES: Record<
  string,
  { label: string; tone: string; href?: (row: GeneralLedgerRow) => string }
> = {
  Journal: {
    label: "Journal Entry",
    tone: "bg-gray-100 text-gray-700",
    href: (r) => `/apps/finance/journal?entry=${r.journalId}`,
  },
  Payment: {
    label: "Payment",
    tone: "bg-blue-100 text-blue-700",
    href: (r) => `/apps/finance/payments?ref=${encodeURIComponent(r.sourceRef ?? "")}`,
  },
  Purchase: {
    label: "Purchase",
    tone: "bg-amber-100 text-amber-700",
    href: (r) =>
      `/apps/finance/purchase-invoice?invoice=${encodeURIComponent(r.sourceRef ?? "")}`,
  },
  Payroll: {
    label: "Payroll",
    tone: "bg-violet-100 text-violet-700",
    href: (r) => `/apps/finance/payroll?run=${r.sourceId ?? ""}`,
  },
};

function sourceOf(row: GeneralLedgerRow) {
  return (
    SOURCE_ROUTES[row.sourceModule] ?? {
      label: row.sourceModule || "—",
      tone: "bg-gray-100 text-gray-700",
    }
  );
}

/**
 * Every posted accounting line in the system, in one place.
 *
 * Built by the server rather than in the browser: the running balance is only
 * meaningful across the *whole* posted set, so computing it client-side meant
 * loading every journal entry in the system on each visit and still getting it
 * wrong the moment the list was filtered. Drafts are excluded — a draft has not
 * been posted, and showing it here would put money in the ledger nobody has
 * committed. Reversed entries stay: the reversal is its own entry, and the
 * ledger has to show both sides or it stops reconciling.
 */
export function GeneralLedgerPage() {
  const [ledger, setLedger] = useState<GeneralLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [range, setRange] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });

  function load() {
    setLoading(true);
    getGeneralLedger({
      ...(range.from ? { from: range.from } : {}),
      ...(range.to ? { to: range.to } : {}),
      ...(sourceFilter ? { sourceModule: sourceFilter } : {}),
    })
      .then(setLedger)
      .catch((err) => notifyLoadFailure("the general ledger", err))
      .finally(() => setLoading(false));
  }

  useEffect(load, [range.from, range.to, sourceFilter]);

  const rows = ledger?.rows ?? [];
  const totals = ledger?.totals;

  /** The modules that actually appear, so the filter offers nothing empty. */
  const sources = useMemo(
    () => [...new Set(rows.map((r) => r.sourceModule).filter(Boolean))].sort(),
    [rows],
  );

  function handleExport() {
    exportCSV(
      "general-ledger",
      [
        "Date",
        "Reference",
        "Source",
        "Process",
        "Origin",
        "Account",
        "Description",
        csvAmountHeader("Debit"),
        csvAmountHeader("Credit"),
        csvAmountHeader("Balance"),
      ],
      rows.map((r) => [
        formatDateByGeneralSettings(r.date),
        r.reference,
        r.sourceModule,
        r.process ?? "",
        r.sourceRef ?? "",
        `${r.accountCode} ${r.accountName}`.trim(),
        r.description,
        r.debit || "",
        r.credit || "",
        r.balance,
      ]),
    );
    toast.success(`Exported ${rows.length} ledger lines.`);
  }

  const columns: Column<GeneralLedgerRow>[] = [
    {
      key: "date",
      label: "Date",
      sortable: true,
      filterable: true,
      render: (r) => (
        <span className="text-sm text-gray-500 whitespace-nowrap">
          {formatDateByGeneralSettings(r.date)}
        </span>
      ),
    },
    {
      key: "reference",
      label: "Reference",
      sortable: true,
      filterable: true,
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs text-gray-700">{r.reference}</span>
          {r.journalStatus === "Reversed" && (
            <span className="text-[10px] text-red-500 font-medium">Reversed</span>
          )}
        </div>
      ),
    },
    {
      key: "sourceModule",
      label: "Source / Process",
      sortable: true,
      filterable: true,
      minWidth: 170,
      render: (r) => {
        const source = sourceOf(r);
        return (
          <div className="flex flex-col gap-0.5">
            <span
              className={`inline-flex w-fit px-2 py-0.5 text-xs rounded-full font-medium ${source.tone}`}
            >
              {source.label}
            </span>
            {r.process && (
              <span className="text-[11px] text-gray-500">{r.process}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "sourceRef",
      label: "Origin",
      sortable: true,
      filterable: true,
      minWidth: 150,
      // The link is what makes a posting traceable. A hand-keyed journal entry
      // has no document behind it, so it shows an em dash rather than a link
      // that would go nowhere.
      render: (r) => {
        const href = sourceOf(r).href?.(r);
        if (!r.sourceRef && r.sourceModule === "Journal") {
          return <span className="text-xs text-gray-300">—</span>;
        }
        const label = r.sourceRef || r.reference;
        return href ? (
          <Link
            to={href}
            className="inline-flex items-center gap-1 font-mono text-xs text-emerald-700 hover:text-emerald-800 hover:underline"
            title={`Open the ${sourceOf(r).label.toLowerCase()} this line came from`}
          >
            {label}
            <ExternalLink className="w-3 h-3 shrink-0" />
          </Link>
        ) : (
          <span className="font-mono text-xs text-gray-600">{label}</span>
        );
      },
    },
    {
      key: "accountCode",
      label: "Account",
      sortable: true,
      filterable: true,
      minWidth: 190,
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs text-gray-700">{r.accountCode}</span>
          <span className="text-xs text-gray-500">{r.accountName}</span>
        </div>
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">General Ledger</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Every posted accounting line across the system — journal entries,
            payments, purchases and payroll
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={rows.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export Ledger
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange((p) => ({ ...p, from: e.target.value }))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange((p) => ({ ...p, to: e.target.value }))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg min-w-[160px]"
          >
            <option value="">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {SOURCE_ROUTES[s]?.label ?? s}
              </option>
            ))}
          </select>
        </div>
        {(range.from || range.to || sourceFilter) && (
          <button
            onClick={() => {
              setRange({ from: "", to: "" });
              setSourceFilter("");
            }}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 font-medium">Total Debits</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {formatCurrencyByGeneralSettings(totals?.debit ?? 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 font-medium">Total Credits</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {formatCurrencyByGeneralSettings(totals?.credit ?? 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 font-medium">Ledger Status</p>
          <p
            className={`text-2xl font-bold mt-1 ${totals?.balanced ? "text-emerald-600" : "text-red-600"}`}
          >
            {totals?.balanced ? "✓ Balanced" : "⚠ Unbalanced"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {totals?.lines ?? 0} ledger line{totals?.lines === 1 ? "" : "s"} ·{" "}
            {totals?.entries ?? 0} posting{totals?.entries === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {loading && !ledger ? (
        <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          keyExtractor={(r) => r.id}
          searchPlaceholder="Search reference, account, description…"
          searchFields={[
            (r) => r.reference,
            (r) => r.accountCode,
            (r) => r.accountName,
            (r) => r.description,
            (r) => r.sourceRef ?? "",
            (r) => r.sourceModule,
          ]}
          emptyMessage="Nothing posted yet — post a journal entry, pay an invoice or post a payroll run to see it here"
        />
      )}
    </div>
  );
}
