import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getProcessMappings,
  saveProcessMappings,
} from "../../api/finance-extras";
import { formatDateByGeneralSettings } from "../../utils/generalSettings";
import {
  Plus, Edit, Trash2, X, AlertTriangle,
  Info, Download, ChevronDown,
} from "lucide-react";
import { DataTable, type Column } from "../../components/DataTable";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { useChangelog } from "../../stores/changelogStore";
import { exportCSV } from "../../utils/exportCSV";
import { ACCOUNT_TYPES } from "./types";

// ── Types ─────────────────────────────────────────────────────────────────────
type MappingStatus = "mapped" | "unmapped";

interface AccountMappingLine {
  id: string;
  account: string; // display name e.g. "Material Costs"
  glCode: string; // auto-populated from COA e.g. "5200"
  action: "debit" | "credit";
  field: string; // source field reference
}

interface ProcessMapping {
  id: string;
  application: string;
  process: string;
  lines: AccountMappingLine[];
  status: MappingStatus;
  lastUpdated: string;
  updatedBy: string;
}

interface TableRow {
  id: string;
  application: string;
  process: string;
  status: MappingStatus;
  debitAccounts: string;
  creditAccounts: string;
  linkedFields: string;
  mapping: ProcessMapping;
}

interface MappingLineForm {
  process: string;
  account: string; // "code name" e.g. "5100 Labour Costs"
  action: "debit" | "credit";
  amountField: string;
}

// ── Chart of Accounts ─────────────────────────────────────────────────────────
const COA: readonly { code: string; name: string; type: string }[] = [
  { code: "1100", name: "Accounts Receivable", type: "Assets" },
  { code: "1110", name: "Cash & Bank", type: "Assets" },
  { code: "1200", name: "Staff Advances", type: "Assets" },
  { code: "1210", name: "Plant & Equipment", type: "Assets" },
  { code: "1300", name: "Inventory", type: "Assets" },
  { code: "2000", name: "Accounts Payable", type: "Liabilities" },
  { code: "2100", name: "Accrued Liabilities", type: "Liabilities" },
  { code: "2300", name: "Tax Payable – VAT", type: "Liabilities" },
  { code: "2310", name: "Tax Payable – WHT", type: "Liabilities" },
  { code: "2320", name: "PAYE Liability", type: "Liabilities" },
  { code: "4100", name: "Contract Revenue", type: "Income" },
  { code: "4200", name: "Service Income", type: "Income" },
  { code: "5100", name: "Labour Costs", type: "Expenses" },
  { code: "5200", name: "Material Costs", type: "Expenses" },
  { code: "5300", name: "Equipment Costs", type: "Expenses" },
  { code: "5400", name: "Overhead", type: "Expenses" },
] as const;

type AccountOption = { code: string; name: string; type: string };

// ── Source Fields ─────────────────────────────────────────────────────────────
const SOURCE_FIELDS = [
  "Amount",
  "Net Amount",
  "Gross Amount",
  "Purchase Value",
  "Order Amount",
  "Total Payable",
  "Payment Amount",
  "Net Payment",
  "Goods Value",
  "Transfer Cost",
  "Adjustment Value",
  "Gross Salary",
  "Net Pay",
  "PAYE Tax",
  "Allowance Total",
  "Advance Amount",
  "WHT Deducted",
  "Claim Amount",
  "Reimbursement",
  "Travel Amount",
  "Invoice Amount",
  "Labour Cost",
  "Expense Amount",
  "VAT",
  "Tax",
  "Fee",
  "Penalty",
  "Discount",
  "Retention Amount",
  "Milestone Value",
  "Contract Value",
];

const APPLICATIONS = [
  "Procurement",
  "Storefront",
  "HR",
  "ESS",
  "Projects",
  "Finance",
];

const PROCESSES_BY_APP: Record<string, string[]> = {
  Procurement: [
    "Purchase Request",
    "Purchase Order",
    "Supplier Payment",
    "Goods Receipt",
    "Invoice Processing",
    "Supplier Advance",
  ],
  Storefront: [
    "Material Transfer",
    "Stock Adjustment",
    "Material Return",
    "Issue to Site",
    "Goods Received Note",
  ],
  HR: [
    // The process the Payroll Overview posts through. It was missing, so the
    // one thing payroll needed mapped could not be mapped at all — the run
    // reached "approved to post" and had nowhere to post to.
    "Payroll Disbursement",
    "Payroll",
    "Allowances",
    "Salary Advance",
    "Deductions",
    "Bonus Payment",
    "Pension Remittance",
  ],
  ESS: ["Expense Claim", "Reimbursement", "Travel Advance", "Leave Encashment"],
  Projects: [
    "Project Expense",
    "Resource Allocation",
    "Contract Revenue",
    "Retention",
    "Milestone Billing",
  ],
  Finance: [
    "Bank Reconciliation",
    "Journal Entry",
    "Asset Depreciation",
    "Tax Filing",
    "WHT Deduction",
  ],
};

const APP_COLORS: Record<string, string> = {
  Procurement: "bg-blue-100 text-blue-700",
  Storefront: "bg-teal-100 text-teal-700",
  HR: "bg-purple-100 text-purple-700",
  ESS: "bg-orange-100 text-orange-700",
  Projects: "bg-indigo-100 text-indigo-700",
  Finance: "bg-emerald-100 text-emerald-700",
};

/**
 * The amount field options for each process — what the "Amount" select in
 * the mapping modal actually offers, not just a single auto-picked default.
 * Keyed with the exact strings from PROCESSES_BY_APP so the two stay in
 * lockstep; the first entry in each list is the default a process falls
 * back to.
 */
const AMOUNT_FIELDS_BY_PROCESS: Record<string, string[]> = {
  "Purchase Request": ["purchaseValue", "unitPrice (per line item)", "negotiatedTotal (per item)"],
  "Purchase Order": ["totalValue", "receivedValue", "unitCost (per item)", "qty", "tranchePercent (payment terms, must total 100%)"],
  "Supplier Payment": ["paymentAmount", "netPayment", "whtDeducted"],
  "Goods Receipt": ["orderedQty", "receivedQty", "acceptedQty", "rejectedQty"],
  "Invoice Processing": ["invoiceTotal", "debitLine (DR Accounts Payable)", "creditLine (CR Cash & Bank)", "balanceCheck (debits = credits)"],
  "Supplier Advance": ["advanceAmount"],
  "Material Transfer": ["transferCost", "qty"],
  "Stock Adjustment": ["adjustmentValue"],
  "Material Return": ["qty"],
  "Issue to Site": ["qty", "unitCost (for value)"],
  "Goods Received Note": ["orderedQty", "receivedQty", "acceptedQty", "rejectedQty", "unitCost (from PO for value)"],
  "Payroll Disbursement": ["paymentAmount", "netPayment"],
  Payroll: ["grossSalary", "payeTax", "netPay"],
  Allowances: ["allowanceTotal"],
  "Salary Advance": ["advanceAmount"],
  Deductions: ["deductionAmount"],
  "Bonus Payment": ["bonusAmount"],
  "Pension Remittance": ["pensionAmount", "employeePercent", "employerPercent"],
  "Expense Claim": ["claimAmount"],
  Reimbursement: ["reimbursementAmount"],
  "Travel Advance": ["advanceAmount"],
  "Leave Encashment": ["encashmentAmount"],
  "Project Expense": ["expenseAmount"],
  "Resource Allocation": ["labourCost", "plannedCost", "actualCost"],
  "Contract Revenue": ["invoiceAmount"],
  Retention: ["retentionAmount", "retentionPercent"],
  "Milestone Billing": ["milestoneValue"],
  "Bank Reconciliation": ["statementBalance", "ledgerBalance"],
  "Journal Entry": ["debit (per line)", "credit (per line)", "balancedTotal (debits = credits)"],
  "Asset Depreciation": ["depreciationAmount"],
  "Tax Filing": ["taxAmount", "taxRate"],
  "WHT Deduction": ["whtDeducted", "whtRate"],
};

/** Options for a process, falling back to the generic flat list for any process not yet in the map above. */
function amountFieldsFor(process: string): string[] {
  return AMOUNT_FIELDS_BY_PROCESS[process] ?? SOURCE_FIELDS;
}

// ── Account Mapping Modal ──────────────────────────────────────────────────────
function MappingModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: ProcessMapping;
  onClose: () => void;
  onSave: (m: ProcessMapping) => void;
}) {
  const today = formatDateByGeneralSettings(new Date());
  const accountOptions = COA.map((a) => `${a.code} ${a.name}`);
  const typeByAccount = Object.fromEntries(
    COA.map((a) => [`${a.code} ${a.name}`, a.type]),
  );
  const defaultDebit = accountOptions.includes("5100 Labour Costs")
    ? "5100 Labour Costs"
    : accountOptions[0] ?? "";
  const defaultCredit = accountOptions.includes("1110 Cash & Bank")
    ? "1110 Cash & Bank"
    : accountOptions[1] ?? accountOptions[0] ?? "";
  const accountNameOf = (account: string) =>
    account.includes(" ") ? account.slice(account.indexOf(" ") + 1) : account;

  const [application, setApplication] = useState(
    initial?.application ?? APPLICATIONS[0],
  );
  const [process, setProcess] = useState(
    initial?.process ?? PROCESSES_BY_APP[APPLICATIONS[0]]?.[0] ?? "",
  );
  const [lines, setLines] = useState<MappingLineForm[]>(() => {
    if (initial?.lines?.length) {
      return initial.lines.map((l) => ({
        process: initial.process,
        account: l.glCode ? `${l.glCode} ${l.account}`.trim() : l.account,
        action: l.action,
        amountField: l.field,
      }));
    }
    const defProc = PROCESSES_BY_APP[APPLICATIONS[0]]?.[0] ?? "";
    const defField = amountFieldsFor(defProc)[0] ?? "Amount";
    return [
      {
        process: defProc,
        account: defaultDebit,
        action: "debit",
        amountField: defField,
      },
      {
        process: defProc,
        account: defaultCredit,
        action: "credit",
        amountField: defField,
      },
    ];
  });

  const availableProcesses = PROCESSES_BY_APP[application] ?? [];
  const debitCount = lines.filter((l) => l.action === "debit").length;
  const creditCount = lines.filter((l) => l.action === "credit").length;
  const allFilled =
    lines.length > 1 &&
    lines.every(
      (l) => l.process.trim() && l.account.trim() && l.amountField.trim(),
    );
  const bothSides = debitCount > 0 && creditCount > 0;
  const canSubmit = application && process.trim() && allFilled && bothSides;

  const updateLine = (idx: number, patch: Partial<MappingLineForm>) =>
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    );

  const updateApplication = (app: string) => {
    setApplication(app);
    const first = PROCESSES_BY_APP[app]?.[0] ?? "";
    setProcess(first);
    const opts = amountFieldsFor(first);
    const def = opts[0] ?? "Amount";
    setLines((prev) =>
      prev.map((l) => ({
        ...l,
        process: first,
        // Keep a manual choice only if it's still a valid option for the
        // new process — the option list itself changes now, not just the
        // recommended default, so a field from the old process may no
        // longer exist to keep.
        amountField: opts.includes(l.amountField) ? l.amountField : def,
      })),
    );
  };

  const handleProcessChange = (next: string) => {
    setProcess(next);
    const opts = amountFieldsFor(next);
    const def = opts[0] ?? "Amount";
    setLines((prev) =>
      prev.map((l) => ({
        ...l,
        process: next,
        amountField: opts.includes(l.amountField) ? l.amountField : def,
      })),
    );
  };

  const addLine = () =>
    setLines((prev) => [
      ...prev,
      {
        process,
        account: "",
        action: "debit",
        amountField: amountFieldsFor(process)[0] ?? "Amount",
      },
    ]);

  function save() {
    if (!canSubmit) return;
    onSave({
      id: initial?.id ?? `pm-${Date.now()}`,
      application,
      process: process.trim(),
      lines: lines.map((l) => ({
        id: `nl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        account: accountNameOf(l.account),
        glCode: l.account.includes(" ")
          ? l.account.slice(0, l.account.indexOf(" "))
          : "",
        action: l.action,
        field: l.amountField,
      })),
      status: "mapped",
      lastUpdated: today,
      updatedBy: "Sola Adeleke",
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {initial ? "Edit Account Mapping" : "New Account Mapping"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Define which chart of accounts entries are affected by each
              business process
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Application + Process */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Source Application <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={application}
                  onChange={(e) => updateApplication(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white appearance-none pr-7 focus:ring-2 focus:ring-emerald-500"
                >
                  {APPLICATIONS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Linked Process <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={process}
                  onChange={(e) => handleProcessChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white appearance-none pr-7 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select process…</option>
                  {availableProcesses.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Process-to-Account Mapping */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Process-to-Account Mapping
              </p>
              <button
                onClick={addLine}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                <Plus className="w-3.5 h-3.5" /> Add Line
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] text-gray-400 uppercase tracking-wide">
                    <th className="px-3 py-2 font-semibold min-w-28">Account type</th>
                    <th className="px-3 py-2 font-semibold min-w-36">Account No</th>
                    <th className="px-3 py-2 font-semibold min-w-36">AccountName</th>
                    <th className="px-3 py-2 font-semibold min-w-24">Action</th>
                    <th className="px-3 py-2 font-semibold min-w-28">Amount</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    const lineType = typeByAccount[line.account] ?? "";
                    const typeOpts = lineType
                      ? [lineType, ...ACCOUNT_TYPES.filter((t) => t !== lineType)]
                      : ACCOUNT_TYPES;
                    const accountsForType = COA.filter(
                      (a) => !lineType || a.type === lineType,
                    );
                    return (
                      <tr key={idx} className="border-b border-gray-50 last:border-0">

                        <td className="px-3 py-2">
                          <select
                            value={lineType}
                            onChange={(e) => {
                              const first = COA.find(
                                (a) => a.type === e.target.value,
                              );
                              updateLine(idx, {
                                account: first
                                  ? `${first.code} ${first.name}`
                                  : "",
                              });
                            }}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                          >
                            {typeOpts.map((t) => (
                              <option key={t}>{t}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={line.account}
                            onChange={(e) =>
                              updateLine(idx, { account: e.target.value })
                            }
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                          >
                            {line.account &&
                              !accountsForType.some(
                                (a) => `${a.code} ${a.name}` === line.account,
                              ) && <option value={line.account}>{line.account}</option>}
                            {accountsForType.map((a) => (
                              <option key={a.code} value={`${a.code} ${a.name}`}>
                                {a.code} – {a.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={accountNameOf(line.account)}
                            readOnly
                            placeholder="Account name"
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-gray-50 text-gray-600 pointer-events-none"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={line.action}
                            onChange={(e) =>
                              updateLine(idx, {
                                action: e.target.value as "debit" | "credit",
                              })
                            }
                            className={`w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-medium ${line.action === "debit"
                              ? "text-blue-700 bg-blue-50"
                              : "text-green-700 bg-green-50"
                              }`}
                          >
                            <option value="debit">Debit</option>
                            <option value="credit">Credit</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={line.amountField}
                            onChange={(e) =>
                              updateLine(idx, { amountField: e.target.value })
                            }
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                          >
                            {/* A mapping saved before this process had its own field list may have a
                                value that isn't one of the current options — keep it selectable rather
                                than silently losing what was actually saved. */}
                            {line.amountField &&
                              !amountFieldsFor(process).includes(line.amountField) && (
                                <option value={line.amountField}>{line.amountField}</option>
                              )}
                            {amountFieldsFor(process).map((f) => (
                              <option key={f}>{f}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() =>
                              setLines((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                            disabled={lines.length <= 1}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Remove line"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-2 px-4 pt-2 pb-3">
              <p className="text-xs text-gray-400">
                <span className="text-blue-600 font-medium">
                  {debitCount} Debit
                </span>
                {" · "}
                <span className="text-green-600 font-medium">
                  {creditCount} Credit
                </span>
                {" line"}
                {lines.length === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-gray-400">
                Each line maps an account to this process
              </p>
            </div>
            {!bothSides && (
              <p className="text-xs text-red-500 flex items-center gap-1 px-4 pb-3">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Add at least one Debit and one Credit line so the posting can
                balance.
              </p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!canSubmit}
            className="px-5 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {initial ? "Save Changes" : "Create Mapping"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function ProcessMappingPage() {
  const { logChange } = useChangelog();
  const [mappings, setMappings] = useState<ProcessMapping[]>([]);
  const [appFilter, setAppFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<MappingStatus | "All">(
    "All",
  );
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<ProcessMapping | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<ProcessMapping | null>(null);

  useEffect(() => {
    getProcessMappings()
      .then((d) => setMappings(d as ProcessMapping[]))
      .catch(() => { });
  }, []);

  const filtered = mappings.filter((m) => {
    const matchApp = appFilter === "All" || m.application === appFilter;
    const matchStatus = statusFilter === "All" || m.status === statusFilter;
    return matchApp && matchStatus;
  });

  const unmappedCount = mappings.filter((m) => m.status === "unmapped").length;

  function openEdit(m: ProcessMapping) {
    setEditItem(m);
    setShowModal(true);
  }
  function openCreate() {
    setEditItem(undefined);
    setShowModal(true);
  }

  function save(m: ProcessMapping) {
    const isNew = !mappings.find((x) => x.id === m.id);
    const next = isNew
      ? [m, ...mappings]
      : mappings.map((x) => (x.id === m.id ? m : x));
    setMappings(next);
    saveProcessMappings(next)
      .then(() =>
        toast.success(isNew ? "Mapping created." : "Mapping updated."),
      )
      .catch((err) =>
        toast.error(
          err instanceof Error ? err.message : "Failed to save mapping.",
        ),
      );
    logChange({
      module: "finance",
      action: isNew ? "created" : "updated",
      entityType: "process_mapping",
      entityId: m.id,
      summary: `${isNew ? "Created" : "Updated"} mapping for ${m.application} / ${m.process}`,
      performedBy: m.updatedBy,
    });
  }

  function remove() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    const target = mappings.find((m) => m.id === id);
    const next = mappings.map((m) =>
      m.id === id ? { ...m, status: "unmapped" as const, lines: [] } : m,
    );
    setMappings(next);
    saveProcessMappings(next)
      .then(() => toast.success("Mapping removed."))
      .catch((err) =>
        toast.error(
          err instanceof Error ? err.message : "Failed to remove mapping.",
        ),
      );
    if (target) {
      logChange({
        module: "finance",
        action: "unmapped",
        entityType: "process_mapping",
        entityId: id,
        summary: `Unmapped ${target.application} / ${target.process}`,
        performedBy: "Sola Adeleke",
      });
    }
    setDeleteTarget(null);
  }

  const tableData: TableRow[] = filtered.map((m) => ({
    id: m.id,
    application: m.application,
    process: m.process,
    status: m.status,
    debitAccounts: m.lines.filter((l) => l.action === "debit").map((l) => l.account).join(", "),
    creditAccounts: m.lines.filter((l) => l.action === "credit").map((l) => l.account).join(", "),
    linkedFields: m.lines.map((l) => l.field).join(", "),
    mapping: m,
  }));

  const columns: Column<TableRow>[] = [
    {
      key: "application",
      label: "Source App",
      sortable: true,
      filterable: true,
      render: (row) => (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${APP_COLORS[row.application] ?? "bg-gray-100 text-gray-600"}`}>
          {row.application}
        </span>
      ),
    },
    {
      key: "process",
      label: "Process Name",
      sortable: true,
      filterable: true,
      render: (row) => <span className="font-medium text-gray-900">{row.process}</span>,
    },
    {
      key: "linkedFields",
      label: "Linked Process",
      sortable: true,
      filterable: true,
      render: (row) => row.linkedFields || <span className="text-amber-500 text-xs">Not configured</span>,
    },
    {
      key: "debitAccounts",
      label: "Debit Account",
      sortable: true,
      filterable: true,
      render: (row) => row.debitAccounts || <span className="text-gray-400 text-xs">—</span>,
    },
    {
      key: "creditAccounts",
      label: "Credit Account",
      sortable: true,
      filterable: true,
      render: (row) => row.creditAccounts || <span className="text-gray-400 text-xs">—</span>,
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      filterable: false,
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(row.mapping)}
            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
            <Edit className="w-3.5 h-3.5" />
          </button>
          {row.status === "mapped" && (
            <button onClick={() => setDeleteTarget(row.mapping)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  function handleExport() {
    exportCSV(
      "process-mappings",
      ["Application", "Process", "Status", "Linked Fields", "Debit Accounts", "Credit Accounts"],
      filtered.map((m) => [
        m.application,
        m.process,
        m.status,
        m.lines.map((l) => l.field).join("; "),
        m.lines.filter((l) => l.action === "debit").map((l) => l.account).join("; "),
        m.lines.filter((l) => l.action === "credit").map((l) => l.account).join("; "),
      ]),
    );
    toast.success(`Exported ${filtered.length} process mappings.`);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Account Mapping
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Map every financial process to Chart of Accounts entries
            (debit/credit per field)
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-md text-sm hover:bg-emerald-700"
        >
          <Plus className="w-3.5 h-3.5" /> New Mapping
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
        <Info className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-emerald-800">
          Configure each process to a Chart of Accounts entry. Postings must
          balance (debits = credits) before they are applied to the ledger.
        </p>
      </div>

      {/* Unmapped alert */}
      {unmappedCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            {unmappedCount} process{unmappedCount > 1 ? "es are" : " is"}{" "}
            unmapped — postings will not be generated automatically.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">{mappings.length}</p>
          <p className="text-xs text-gray-500">Total Processes</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-emerald-600">
            {mappings.filter((m) => m.status === "mapped").length}
          </p>
          <p className="text-xs text-gray-500">Mapped</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-amber-600">{unmappedCount}</p>
          <p className="text-xs text-gray-500">Unmapped</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-blue-600">
            {mappings.length > 0
              ? Math.round(
                (mappings.filter((m) => m.status === "mapped").length /
                  mappings.length) *
                100,
              )
              : 0}
            %
          </p>
          <p className="text-xs text-gray-500">Coverage</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {["All", ...APPLICATIONS].map((a) => (
            <button
              key={a}
              onClick={() => setAppFilter(a)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${appFilter === a
                ? "bg-emerald-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {(["All", "mapped", "unmapped"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${statusFilter === s
                ? "bg-emerald-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={tableData}
        keyExtractor={(row) => row.id}
        searchPlaceholder="Search processes…"
        searchFields={[
          (row) => row.application,
          (row) => row.process,
          (row) => row.linkedFields,
          (row) => row.debitAccounts,
          (row) => row.creditAccounts,
        ]}
        headerExtra={
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-md text-sm hover:bg-emerald-700">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        }
      />

      {showModal && (
        <MappingModal
          initial={editItem}
          onClose={() => setShowModal(false)}
          onSave={save}
        />
      )}

      <ConfirmationModal
        isOpen={deleteTarget !== null}
        title="Remove Mapping?"
        description={
          deleteTarget
            ? `This will remove the account mapping for "${deleteTarget.application} / ${deleteTarget.process}". This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        isDangerous
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
