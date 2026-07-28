import { useState } from "react";
import {
  ScrollText, Plus, X, Save, CheckCircle, XCircle, RefreshCw,
  AlertTriangle, Send,
} from "lucide-react";
import { useFinance } from "../../stores/financeStore";
import { exportCSV } from "../../utils/exportCSV";
import { useChangelog } from "../../stores/changelogStore";
import { useNumbering } from "../../stores/numberingStore";
import { DataTable, type Column } from "../../components/DataTable";
import type {
  Accrual, AccrualType, AccrualStatus, AccrualLine,
} from "./types";
import {
  ACCRUAL_STATUS_LABELS, ACCRUAL_STATUS_COLORS,
} from "./types";

const ACCRUAL_STATUSES: AccrualStatus[] = [
  "draft", "pending", "active", "partially-reversed", "fully-reversed", "cancelled",
];

const SOURCE_MODULES = ["Procurement", "HR", "Finance", "Projects", "ESS", "Storefront"];

const fmt = (n: number) => `₦${n.toLocaleString()}`;

const APPROVAL_LABELS: Record<string, string> = {
  draft: "Draft",
  pending: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
};

const APPROVAL_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

function emptyLine(): AccrualLine {
  return { id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, account: "", description: "", debit: 0, credit: 0 };
}

export function AccrualsPage() {
  const { accruals, setAccruals, fiscalYears, accounts, accrualTypeConfigs } = useFinance();
  const { logChange } = useChangelog();
  const { getNextId } = useNumbering();

  // Filters
  const [typeFilter, setTypeFilter] = useState<AccrualType | "All">("All");
  const [statusFilter, setStatusFilter] = useState<AccrualStatus | "All">("All");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    type: "", title: "", description: "",
    reversalDate: "", reference: "", sourceModule: "Procurement" as string,
    lines: [emptyLine(), emptyLine()],
  });

  const currentFy = fiscalYears.find(fy => fy.isCurrent);

  const filtered = accruals.filter(a => {
    if (typeFilter !== "All" && a.type !== typeFilter) return false;
    if (statusFilter !== "All" && a.status !== statusFilter) return false;
    return true;
  });

  function addLine() { setForm(f => ({ ...f, lines: [...f.lines, emptyLine()] })); }

  function removeLine(id: string) {
    setForm(f => f.lines.length <= 2 ? f : { ...f, lines: f.lines.filter(l => l.id !== id) });
  }

  function updateLine(id: string, field: keyof AccrualLine, value: string | number) {
    setForm(f => ({
      ...f,
      lines: f.lines.map(l => l.id === id ? { ...l, [field]: value } : l),
    }));
  }

  const totalDebits = form.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredits = form.lines.reduce((s, l) => s + (l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
  const totalAmount = totalDebits || totalCredits;

  function handleCreate() {
    if (!form.title.trim() || !form.reversalDate || !form.type) return;
    if (!isBalanced) return;
    const lines = form.lines.filter(l => l.account && (l.debit || l.credit));
    if (lines.length === 0) return;

    const accrual: Accrual = {
      id: getNextId("Accrual"),
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim(),
      lines,
      amount: totalAmount,
      status: "draft",
      approvalStatus: "draft",
      approvalSteps: [],
      createdAt: new Date().toISOString().split("T")[0],
      createdBy: "Sola Adeleke",
      reversalDate: form.reversalDate,
      reference: form.reference.trim() || getNextId("Accrual"),
      sourceModule: form.sourceModule,
      sourceRef: form.reference.trim() || getNextId("Accrual"),
      fiscalYearId: currentFy?.id ?? "fy2",
    };
    setAccruals(prev => [accrual, ...prev]);
    logChange({ module: "Finance", action: "Created", entityType: "Accrual", entityId: accrual.id, summary: `Accrual "${accrual.title}" (${accrual.type}) created`, performedBy: "Sola Adeleke" });
    setShowModal(false);
    setForm({ type: "", title: "", description: "", reversalDate: "", reference: "", sourceModule: "Procurement", lines: [emptyLine(), emptyLine()] });
  }

  function handleSubmitForApproval(id: string) {
    setAccruals(prev => prev.map(a =>
      a.id === id ? { ...a, status: "pending" as AccrualStatus, approvalStatus: "pending", approvalSteps: [{ role: "Finance Manager", action: "pending" }] } : a
    ));
    logChange({ module: "Finance", action: "Submitted for Approval", entityType: "Accrual", entityId: id, summary: `Accrual submitted for approval`, performedBy: "Sola Adeleke" });
  }

  function handleApprove(id: string) {
    setAccruals(prev => prev.map(a =>
      a.id === id ? { ...a, status: "active" as AccrualStatus, approvalStatus: "approved", approvalSteps: a.approvalSteps.map(s => s.action === "pending" ? { ...s, action: "approved" as const, actedBy: "Sola Adeleke", actedAt: new Date().toISOString() } : s) } : a
    ));
    logChange({ module: "Finance", action: "Approved", entityType: "Accrual", entityId: id, summary: `Accrual approved`, performedBy: "Sola Adeleke" });
  }

  function handleReject(id: string) {
    setAccruals(prev => prev.map(a =>
      a.id === id ? { ...a, status: "cancelled" as AccrualStatus, approvalStatus: "rejected", approvalSteps: a.approvalSteps.map(s => s.action === "pending" ? { ...s, action: "rejected" as const, actedBy: "Sola Adeleke", actedAt: new Date().toISOString() } : s) } : a
    ));
    logChange({ module: "Finance", action: "Rejected", entityType: "Accrual", entityId: id, summary: `Accrual rejected`, performedBy: "Sola Adeleke" });
  }

  function handleReverse(id: string) {
    setAccruals(prev => prev.map(a =>
      a.id === id
        ? { ...a, status: "fully-reversed" as AccrualStatus, reversedAt: new Date().toISOString().split("T")[0], reversedAmount: a.amount }
        : a
    ));
    logChange({ module: "Finance", action: "Reversed", entityType: "Accrual", entityId: id, summary: `Accrual fully reversed`, performedBy: "Sola Adeleke" });
  }

  function handleCancel(id: string) {
    setAccruals(prev => prev.map(a =>
      a.id === id ? { ...a, status: "cancelled" as AccrualStatus } : a
    ));
    logChange({ module: "Finance", action: "Cancelled", entityType: "Accrual", entityId: id, summary: `Accrual cancelled`, performedBy: "Sola Adeleke" });
  }

  function handleExport() {
    exportCSV("accruals",
      ["ID", "Type", "Title", "Amount", "Status", "Approval", "Created", "Reversal Date", "Source", "Reference"],
      filtered.map(a => [a.id, accrualTypeConfigs.find(tc => tc.type === a.type)?.label ?? a.type, a.title, fmt(a.amount), ACCRUAL_STATUS_LABELS[a.status], APPROVAL_LABELS[a.approvalStatus] ?? a.approvalStatus, a.createdAt, a.reversalDate, a.sourceModule, a.reference]),
    );
  }

  function getAccountOptions() {
    return accounts.filter(a => a.parentId !== null).map(a => ({ value: `${a.code} ${a.name}`, label: `${a.code} — ${a.name} (${a.type})` }));
  }

  const accountOptions = getAccountOptions();

  const activeTotal = accruals.filter(a => a.status === "active").reduce((s, a) => s + a.amount, 0);
  const reversedTotal = accruals.filter(a => a.status === "fully-reversed").reduce((s, a) => s + (a.reversedAmount ?? 0), 0);

  const columns: Column<Accrual>[] = [
    { key: "type", label: "Type", render: a => (
      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${accrualTypeConfigs.find(tc => tc.type === a.type)?.color ?? "bg-gray-100 text-gray-600"}`}>
        {accrualTypeConfigs.find(tc => tc.type === a.type)?.label ?? a.type}
      </span>
    ), sortable: true, filterable: true },
    { key: "title", label: "Title", render: a => (
      <div><p className="text-sm font-medium text-gray-900">{a.title}</p><p className="text-xs text-gray-400 mt-0.5">{a.description}</p></div>
    ), sortable: true, filterable: true, minWidth: 200 },
    { key: "lines", label: "Lines", render: a => (
      <div className="space-y-0.5">{a.lines.filter(l => l.debit > 0).map(l => (
        <p key={l.id} className="text-xs font-mono text-gray-600">{l.account} <span className="text-emerald-600">₦{l.debit.toLocaleString()} DR</span></p>
      ))}{a.lines.filter(l => l.credit > 0).map(l => (
        <p key={l.id} className="text-xs font-mono text-gray-400">{l.account} <span className="text-amber-600">₦{l.credit.toLocaleString()} CR</span></p>
      ))}</div>
    ), sortable: false, filterable: false, minWidth: 200 },
    { key: "amount", label: "Amount (₦)", render: a => (
      <span className="text-sm font-semibold text-gray-900">{fmt(a.amount)}</span>
    ), sortable: true, filterable: false, className: "text-right", headerClassName: "text-right" },
    { key: "status", label: "Status", render: a => (
      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${ACCRUAL_STATUS_COLORS[a.status]}`}>{ACCRUAL_STATUS_LABELS[a.status]}</span>
    ), sortable: true, filterable: true },
    { key: "approval", label: "Approval", render: a => (
      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${APPROVAL_COLORS[a.approvalStatus]}`}>{APPROVAL_LABELS[a.approvalStatus]}</span>
    ), sortable: true, filterable: true },
    { key: "source", label: "Source", render: a => (
      <div><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{a.sourceModule}</span><p className="text-xs text-gray-400 mt-0.5 font-mono">{a.reference}</p></div>
    ), sortable: true, filterable: true },
    { key: "reversalDate", label: "Reversal Date", render: a => (
      <span className="text-sm text-gray-500">{a.reversalDate}</span>
    ), sortable: true, filterable: false },
    { key: "actions", label: "Actions", render: a => {
      return (
        <div className="flex items-center justify-end gap-1">
          {a.status === "draft" && (
            <button onClick={e => { e.stopPropagation(); handleSubmitForApproval(a.id); }} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Submit for Approval">
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
          {a.approvalStatus === "pending" && (
            <>
              <button onClick={e => { e.stopPropagation(); handleApprove(a.id); }} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Approve"><CheckCircle className="w-3.5 h-3.5" /></button>
              <button onClick={e => { e.stopPropagation(); handleReject(a.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Reject"><XCircle className="w-3.5 h-3.5" /></button>
            </>
          )}
          {a.status === "active" && (
            <>
              <button onClick={e => { e.stopPropagation(); handleReverse(a.id); }} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Reverse"><RefreshCw className="w-3.5 h-3.5" /></button>
              <button onClick={e => { e.stopPropagation(); handleCancel(a.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Cancel"><XCircle className="w-3.5 h-3.5" /></button>
            </>
          )}
          {a.status === "fully-reversed" && <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="w-3 h-3" /> Done</span>}
        </div>
      );
    }, sortable: false, filterable: false, className: "text-right", headerClassName: "text-right" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Accruals</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage accrual entries across all modules — with multi-line journal entries and approval workflow</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Export CSV</button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> New Accrual
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Accruals", value: accruals.length, color: "text-gray-900", bg: "bg-white" },
          { label: "Active (Pending Reversal)", value: fmt(activeTotal), color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Reversed This Period", value: fmt(reversedTotal), color: "text-gray-600", bg: "bg-gray-50" },
          { label: "Net Accrual Exposure", value: fmt(activeTotal - reversedTotal), color: "text-amber-700", bg: "bg-amber-50" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl border border-gray-200 p-4`}>
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          <button onClick={() => setTypeFilter("All")} className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${typeFilter === "All" ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>All Types</button>
          {accrualTypeConfigs.map(tc => (
            <button key={tc.type} onClick={() => setTypeFilter(tc.type as AccrualType)} className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${typeFilter === tc.type ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>{tc.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {["All", ...ACCRUAL_STATUSES].map(s => (
            <button key={s} onClick={() => setStatusFilter(s as any)} className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${statusFilter === s ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
              {s === "All" ? "All Status" : ACCRUAL_STATUS_LABELS[s as AccrualStatus]}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={filtered} keyExtractor={a => a.id}
        searchPlaceholder="Search accruals..."
        searchFields={[a => a.title, a => a.description, a => a.reference, a => a.sourceRef, a => a.sourceModule]}
        emptyMessage="No accruals found" />

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-semibold text-gray-900">New Accrual Entry</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Basic Info */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Basic Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Accrual Type *</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="">Select accrual type...</option>
                      {accrualTypeConfigs.map(tc => <option key={tc.type} value={tc.type}>{tc.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Reference</label>
                    <input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="e.g. PO-0031" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title *</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. GRNI — Supplier Name" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Describe the accrual reason" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Reversal Date *</label>
                    <input type="date" value={form.reversalDate} onChange={e => setForm({ ...form, reversalDate: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Source Module</label>
                    <select value={form.sourceModule} onChange={e => setForm({ ...form, sourceModule: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      {SOURCE_MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Accrual Lines */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Accrual Lines</p>
                  <button onClick={addLine} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                    <Plus className="w-3 h-3" /> Add Line
                  </button>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Account</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Description</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Debit (₦)</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Credit (₦)</th>
                        <th className="w-10 px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {form.lines.map((line) => (
                        <tr key={line.id}>
                          <td className="px-4 py-2">
                            <select value={line.account} onChange={e => updateLine(line.id, "account", e.target.value)}
                              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white">
                              <option value="">Select account...</option>
                              {accountOptions.map(ao => <option key={ao.value} value={ao.value}>{ao.label}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input value={line.description} onChange={e => updateLine(line.id, "description", e.target.value)}
                              placeholder="Line description" className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" value={line.debit || ""} onChange={e => updateLine(line.id, "debit", parseFloat(e.target.value) || 0)}
                              placeholder="0.00" className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right" min={0} />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" value={line.credit || ""} onChange={e => updateLine(line.id, "credit", parseFloat(e.target.value) || 0)}
                              placeholder="0.00" className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-right" min={0} />
                          </td>
                          <td className="px-4 py-2 text-center">
                            {form.lines.length > 2 && (
                              <button onClick={() => removeLine(line.id)} className="p-1 text-gray-300 hover:text-red-500 rounded"><X className="w-3 h-3" /></button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-100">
                      <tr>
                        <td colSpan={2} className="px-4 py-2 text-xs font-semibold text-gray-600 text-right">Total</td>
                        <td className="px-4 py-2 text-right text-sm font-semibold text-emerald-700">{totalDebits.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-sm font-semibold text-amber-700">{totalCredits.toLocaleString()}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {!isBalanced && form.lines.some(l => l.account) && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Debits ({fmt(totalDebits)}) and Credits ({fmt(totalCredits)}) must be equal.</p>
                )}
                {isBalanced && totalDebits > 0 && (
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Balanced — Total: {fmt(totalDebits)}</p>
                )}
              </div>

              {currentFy && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
                  This accrual will be recorded under <strong>{currentFy.label}</strong>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={!form.title.trim() || !form.reversalDate || !form.type || !isBalanced}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed">
                <Save className="w-3.5 h-3.5" /> Save as Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
