import { useState, useEffect } from "react";
import {
  getCurrencySymbol,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";
import {
  Download,
  X,
  ExternalLink,
  CheckCircle,
  Clock,
} from "lucide-react";
import { exportCSV } from "../../utils/exportCSV";
import { DataTable, type Column } from "../../components/DataTable";
import { getTransactions } from "../../api/finance-extras";

// ── Types ─────────────────────────────────────────────────────────────────────
type TxnType =
  | "Income"
  | "Expense"
  | "Payroll"
  | "Payment"
  | "Transfer"
  | "Adjustment"
  | "Journal";
type ApprovalStatus = "approved" | "pending" | "auto-approved";

interface LinkedRecord {
  label: string;
  ref: string;
}

interface Transaction {
  id: string;
  type: TxnType;
  description: string;
  debitAccount: string;
  creditAccount: string;
  reference: string;
  amount: number;
  date: string;
  createdBy: string;
  sourceApp: string;
  sourceProcess: string;
  approvalStatus: ApprovalStatus;
  linkedRecords?: LinkedRecord[];
  notes?: string;
}

// ── Style helpers ─────────────────────────────────────────────────────────────
const typeColors: Record<TxnType, string> = {
  Income: "bg-emerald-100 text-emerald-700",
  Expense: "bg-red-100 text-red-700",
  Payroll: "bg-purple-100 text-purple-700",
  Payment: "bg-blue-100 text-blue-700",
  Transfer: "bg-gray-100 text-gray-700",
  Adjustment: "bg-amber-100 text-amber-700",
  Journal: "bg-indigo-100 text-indigo-700",
};

const approvalBadge: Record<ApprovalStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  approved:        { label: "Approved",       cls: "bg-emerald-100 text-emerald-700", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  pending:         { label: "Pending",        cls: "bg-amber-100 text-amber-700",     icon: <Clock       className="w-3.5 h-3.5" /> },
  "auto-approved": { label: "Auto-Approved",  cls: "bg-gray-100 text-gray-600",       icon: <CheckCircle className="w-3.5 h-3.5" /> },
};

const APP_COLORS: Record<string, string> = {
  Procurement: "bg-blue-50 text-blue-700",
  Storefront: "bg-teal-50 text-teal-700",
  HR: "bg-purple-50 text-purple-700",
  ESS: "bg-orange-50 text-orange-700",
  Projects: "bg-indigo-50 text-indigo-700",
  Finance: "bg-emerald-50 text-emerald-700",
};

function fmtAmt(n: number) {
  const abs = `${getCurrencySymbol()}${formatNumberByGeneralSettings(Math.abs(n))}`;
  return n >= 0 ? `+${abs}` : `−${abs}`;
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function TransactionDetailModal({
  txn,
  onClose,
}: {
  txn: Transaction;
  onClose: () => void;
}) {
  const ab = approvalBadge[txn.approvalStatus];
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-gray-900">
              {txn.id}
            </span>
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-medium ${typeColors[txn.type]}`}
            >
              {txn.type}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <section>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Basic Information
            </p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Description</p>
                <p className="font-medium text-gray-900 mt-0.5">
                  {txn.description}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Transaction ID</p>
                <p className="font-mono font-medium text-gray-900 mt-0.5">
                  {txn.id}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="font-medium text-gray-900 mt-0.5">{txn.date}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Reference</p>
                <p className="font-mono font-medium text-gray-900 mt-0.5">
                  {txn.reference}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Amount</p>
                <p
                  className={`text-lg font-bold mt-0.5 ${txn.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}
                >
                  {fmtAmt(txn.amount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Initiated By</p>
                <p className="font-medium text-gray-900 mt-0.5">
                  {txn.createdBy}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Approval Status</p>
                <span
                  className={`inline-flex items-center gap-1.5 mt-0.5 px-2 py-0.5 text-xs rounded-full font-medium ${ab.cls}`}
                >
                  {ab.icon}
                  {ab.label}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Source Application</p>
                <span
                  className={`inline-block mt-0.5 px-2 py-0.5 text-xs rounded font-medium ${APP_COLORS[txn.sourceApp] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {txn.sourceApp}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Source Process</p>
                <p className="font-medium text-gray-900 mt-0.5">
                  {txn.sourceProcess}
                </p>
              </div>
              {txn.notes && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Notes</p>
                  <p className="text-sm text-gray-700 mt-0.5 bg-gray-50 rounded-lg px-3 py-2">
                    {txn.notes}
                  </p>
                </div>
              )}
            </div>
          </section>
          <hr className="border-gray-100" />
          <section>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Financial Entries
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">
                      Entry
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">
                      Account
                    </th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-2.5"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">DR</span></td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{txn.debitAccount}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{formatNumberByGeneralSettings(Math.abs(txn.amount))}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded font-medium">CR</span></td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{txn.creditAccount}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{formatNumberByGeneralSettings(Math.abs(txn.amount))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          {txn.linkedRecords && txn.linkedRecords.length > 0 && (
            <>
              <hr className="border-gray-100" />
              <section>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Linked Records
                </p>
                <div className="flex flex-wrap gap-2">
                  {txn.linkedRecords.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-blue-50 border border-blue-100 rounded-lg"
                    >
                      <span className="text-xs text-gray-500">{r.label}:</span>
                      <span className="text-xs font-mono font-semibold text-blue-700">
                        {r.ref}
                      </span>
                      <ExternalLink className="w-3 h-3 text-blue-400" />
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
        <div className="flex justify-end px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function TransactionsLedgerPage() {
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    getTransactions()
      .then((data) =>
        setAllTransactions(
          data.map((t) => ({
            id: t.id,
            type: t.type as TxnType,
            description: t.description,
            debitAccount: "",
            creditAccount: "",
            reference: t.reference ?? "",
            amount: t.type === "Income" ? t.amount : -t.amount,
            date: t.date,
            createdBy: t.createdBy ?? "",
            sourceApp: "",
            sourceProcess: "",
            approvalStatus: (t.status as ApprovalStatus) ?? "pending",
            notes: t.notes,
          })),
        ),
      )
      .catch(console.error);
  }, []);

  const totalInflow = allTransactions
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);
  const totalOutflow = allTransactions
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = totalInflow - totalOutflow;

  function handleExport() {
    exportCSV(
      "transactions-ledger",
      [
        "Transaction ID",
        "Type",
        "Description",
        "Debit Account",
        "Credit Account",
        "Reference",
        "Amount",
        "Date",
        "Source App",
        "Source Process",
        "Approval Status",
        "Created By",
      ],
      allTransactions.map((t) => [
        t.id,
        t.type,
        t.description,
        t.debitAccount,
        t.creditAccount,
        t.reference,
        fmtAmt(t.amount),
        t.date,
        t.sourceApp,
        t.sourceProcess,
        t.approvalStatus,
        t.createdBy,
      ]),
    );
  }

  const columns: Column<Transaction>[] = [
    { key: "id", label: "Transaction ID", render: t => <span className="font-mono text-xs text-gray-500 group-hover:text-emerald-700">{t.id}</span>, sortable: true, filterable: true },
    { key: "type", label: "Type", render: t => <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${typeColors[t.type]}`}>{t.type}</span>, sortable: true, filterable: true },
    { key: "description", label: "Description", render: t => <span className="text-sm text-gray-900 max-w-[200px] block truncate">{t.description}</span>, sortable: true, filterable: true, minWidth: 160 },
    { key: "accounts", label: "DR / CR", render: t => (
      <div>
        <p className="text-xs font-mono text-gray-600 truncate max-w-[140px]">{t.debitAccount}</p>
        <p className="text-xs font-mono text-gray-400 truncate max-w-[140px]">{t.creditAccount}</p>
      </div>
    ), sortable: false, filterable: false, minWidth: 160 },
    { key: "source", label: "Source", render: t => (
      <div>
        <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${APP_COLORS[t.sourceApp] ?? "bg-gray-100 text-gray-600"}`}>{t.sourceApp}</span>
        <p className="text-xs text-gray-400 mt-0.5">{t.sourceProcess}</p>
      </div>
    ), sortable: true, filterable: true },
    { key: "amount", label: "Amount (₦)", render: t => (
      <span className={`text-sm font-semibold ${t.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtAmt(t.amount)}</span>
    ), sortable: true, filterable: false, className: "text-right", headerClassName: "text-right" },
    { key: "date", label: "Date", render: t => <span className="text-sm text-gray-500 whitespace-nowrap">{t.date}</span>, sortable: true, filterable: false },
    { key: "approval", label: "Approval", render: t => {
      const ab = approvalBadge[t.approvalStatus];
      return <span className={`flex items-center gap-1 w-fit text-xs rounded-full px-2 py-0.5 font-medium ${ab.cls}`}>{ab.icon}{ab.label}</span>;
    }, sortable: true, filterable: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Transactions Ledger
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Complete financial audit trail — click any row to view full
            transaction details
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Download className="w-4 h-4" /> Export Ledger
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 font-medium">Total Inflow</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {getCurrencySymbol()}{formatNumberByGeneralSettings(totalInflow)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 font-medium">Total Outflow</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {getCurrencySymbol()}{formatNumberByGeneralSettings(totalOutflow)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 font-medium">Net Position</p>
          <p
            className={`text-2xl font-bold mt-1 ${net >= 0 ? "text-emerald-600" : "text-red-600"}`}
          >
            {net >= 0 ? "+" : "−"}{getCurrencySymbol()}{formatNumberByGeneralSettings(Math.abs(net))}
          </p>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={allTransactions}
        keyExtractor={t => t.id}
        searchPlaceholder="Search: ID, description, account…"
        searchFields={[t => t.id, t => t.description, t => t.debitAccount, t => t.creditAccount, t => t.reference, t => t.sourceApp, t => t.sourceProcess]}
        emptyMessage="No transactions found"
        onRowClick={setSelected}
      />

      {selected && (
        <TransactionDetailModal
          txn={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
