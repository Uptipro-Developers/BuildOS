import { Save, Globe, Calendar, DollarSign, Plus, Edit, Trash2, AlertTriangle, CheckCircle, X, Search, RefreshCw, Mail, Edit2, Check as CheckIcon } from "lucide-react";
import { useState } from "react";
import { CreatableSelect } from "../../components/CreatableSelect";
import { useNumbering } from "../../stores/numberingStore";

// ── Issue Types ──────────────────────────────────────────────────────────────
const IT_COLORS = [
  "bg-red-100 text-red-700", "bg-orange-100 text-orange-700",
  "bg-amber-100 text-amber-700", "bg-yellow-100 text-yellow-700",
  "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700",
  "bg-gray-100 text-gray-700", "bg-teal-100 text-teal-700",
];
const IT_COLOR_NAMES: Record<string, string> = {
  "bg-red-100 text-red-700": "Red", "bg-orange-100 text-orange-700": "Orange",
  "bg-amber-100 text-amber-700": "Amber", "bg-yellow-100 text-yellow-700": "Yellow",
  "bg-blue-100 text-blue-700": "Blue", "bg-purple-100 text-purple-700": "Purple",
  "bg-gray-100 text-gray-700": "Gray", "bg-teal-100 text-teal-700": "Teal",
};
type IssuePriority = "low" | "medium" | "high" | "critical";
interface IssueType {
  id: string; name: string; description: string;
  priority: IssuePriority; color: string;
  requiresApproval: boolean; slaHours: number; active: boolean;
}
const SEED_ISSUE_TYPES: IssueType[] = [
  { id: "it-001", name: "Equipment Breakdown",    description: "Machine, tool, or equipment failure",                    priority: "high",     color: "bg-red-100 text-red-700",     requiresApproval: false, slaHours: 4,  active: true },
  { id: "it-002", name: "Safety Hazard",           description: "Unsafe working conditions or near-miss incident",        priority: "critical", color: "bg-orange-100 text-orange-700",requiresApproval: true,  slaHours: 1,  active: true },
  { id: "it-003", name: "Material Shortage",       description: "Required materials not available on site",               priority: "medium",   color: "bg-amber-100 text-amber-700",  requiresApproval: false, slaHours: 8,  active: true },
  { id: "it-004", name: "Payroll Discrepancy",     description: "Issues with salary, deductions, or bonuses",             priority: "medium",   color: "bg-blue-100 text-blue-700",    requiresApproval: true,  slaHours: 24, active: true },
  { id: "it-005", name: "Leave / Absence Issue",   description: "Incorrect leave records or attendance disputes",         priority: "low",      color: "bg-purple-100 text-purple-700",requiresApproval: false, slaHours: 48, active: true },
  { id: "it-006", name: "HR / Personal Issue",     description: "Workplace conflict, harassment, or disciplinary matter", priority: "high",     color: "bg-red-100 text-red-700",     requiresApproval: true,  slaHours: 48, active: true },
  { id: "it-007", name: "IT / System Issue",       description: "Software, hardware, or connectivity problem",            priority: "medium",   color: "bg-gray-100 text-gray-700",    requiresApproval: false, slaHours: 8,  active: true },
  { id: "it-008", name: "Compliance / Regulatory", description: "Potential legal or regulatory non-compliance",           priority: "critical", color: "bg-orange-100 text-orange-700",requiresApproval: true,  slaHours: 2,  active: true },
];
const PRIORITY_BADGE: Record<IssuePriority, string> = {
  low: "bg-gray-100 text-gray-600", medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700", critical: "bg-red-100 text-red-700",
};
const EMPTY_ISSUE: Omit<IssueType, "id"> = {
  name: "", description: "", priority: "medium",
  color: IT_COLORS[0], requiresApproval: false, slaHours: 24, active: true,
};

// ── Change Categories ────────────────────────────────────────────────────────
interface ChangeCategory { id: string; name: string; description: string; }
const SEED_CATS: ChangeCategory[] = [
  { id: "cc-001", name: "Design Change",        description: "Modifications to architectural or engineering designs." },
  { id: "cc-002", name: "Scope Adjustment",     description: "Changes that expand or reduce the project scope." },
  { id: "cc-003", name: "Budget Revision",      description: "Requests to revise the approved project budget." },
  { id: "cc-004", name: "Timeline Change",      description: "Extensions or reductions to project milestones or deadlines." },
  { id: "cc-005", name: "Specification Change", description: "Changes to material specs, grades, or product standards." },
  { id: "cc-006", name: "Resource Reallocation",description: "Reassignment of labour, equipment, or personnel across tasks." },
  { id: "cc-007", name: "Regulatory Compliance",description: "Changes mandated by regulatory or statutory requirements." },
  { id: "cc-008", name: "Safety Improvement",   description: "Changes required to address site safety or risk findings." },
];
const BLANK_CAT: Omit<ChangeCategory, "id"> = { name: "", description: "" };

// ── Email Config Types & Data ────────────────────────────────────────────────
type TriggerModule = "Finance" | "HR" | "Procurement" | "Projects" | "ESS" | "Admin" | "Storefront";

const TRIGGERS_BY_MODULE: Record<TriggerModule, string[]> = {
  HR:          ["Leave Request Submitted", "Leave Request Approved", "Leave Request Rejected", "Payroll Processed", "Appraisal Cycle Opened", "Employee Onboarding Initiated", "Salary Advance Requested"],
  Procurement: ["Purchase Request Submitted", "Purchase Request Approved", "Purchase Order Approved", "Send RFQ to Supplier", "Send PO to Supplier", "Invoice Received", "Invoice Overdue", "Material Request Approved", "Request Payment Confirmation"],
  Finance:     ["Invoice Overdue", "Payment Processed", "Budget Exceeded", "Journal Entry Approved", "Approval Notifications", "WHT Certificate Generated"],
  Projects:    ["Project Created", "Milestone Completed", "Project Delayed", "Resource Assigned", "Contract Signed"],
  ESS:         ["Expense Claim Submitted", "Expense Claim Approved", "Travel Advance Requested", "Reimbursement Processed"],
  Admin:       ["New User Created", "Role Changed", "System Alert", "Login Failure (Threshold)", "Password Reset Requested"],
  Storefront:  ["Material Transferred", "Low Stock Alert", "Stock Adjustment Made", "Procurement Request Sent"],
};

const VARS_BY_MODULE: Record<TriggerModule, string[]> = {
  HR:          ["employee_name", "employee_email", "employee_manager", "period", "cycle", "leave_type", "start_date", "end_date"],
  Procurement: ["supplier_name", "supplier_email", "po_number", "rfq_number", "pr_number", "request_number", "invoice_number", "requester_email"],
  Finance:     ["invoice_number", "invoice_amount", "due_date", "vendor_name", "account_name"],
  Projects:    ["project_name", "project_manager", "milestone_name", "deadline", "contract_number"],
  ESS:         ["employee_name", "claim_amount", "claim_ref", "travel_destination", "advance_amount"],
  Admin:       ["user_name", "user_email", "role_name", "action_date", "system_message"],
  Storefront:  ["material_name", "quantity", "store_name", "project_name", "transferred_by"],
};

interface EmailConfig {
  id: string; trigger: string; module: TriggerModule;
  subject: string; body: string; recipients: string; cc: string; enabled: boolean;
}

const MODULE_COLORS: Record<TriggerModule, string> = {
  Finance: "bg-emerald-50 text-emerald-700", HR: "bg-purple-50 text-purple-700",
  Procurement: "bg-blue-50 text-blue-700", Projects: "bg-sky-50 text-sky-700",
  ESS: "bg-teal-50 text-teal-700", Admin: "bg-gray-100 text-gray-700",
  Storefront: "bg-orange-50 text-orange-700",
};

const MOCK_CONFIGS: EmailConfig[] = [
  { id: "EC-001", trigger: "Leave Request Submitted", module: "HR", subject: "New Leave Request — {{employee_name}}", body: "Dear {{employee_manager}},\n\n{{employee_name}} has submitted a leave request ({{leave_type}}) from {{start_date}} to {{end_date}}.\n\nPlease review and approve or reject the request in BuildOS.", recipients: "hr@buildos.ng", cc: "{{employee_manager}}", enabled: true },
  { id: "EC-002", trigger: "Payroll Processed", module: "HR", subject: "Payroll Processed — {{period}}", body: "Dear Team,\n\nPayroll for {{period}} has been processed successfully. Please log in to BuildOS ESS to view your payslip.", recipients: "all-staff@buildos.ng", cc: "cfo@buildos.ng", enabled: true },
  { id: "EC-003", trigger: "Send PO to Supplier", module: "Procurement", subject: "Purchase Order {{po_number}} — BuildOS", body: "Dear {{supplier_name}},\n\nPlease find attached Purchase Order {{po_number}}. Kindly confirm receipt and expected delivery date.\n\nRegards,\nBuildOS Procurement Team", recipients: "{{supplier_email}}", cc: "procurement@buildos.ng", enabled: true },
  { id: "EC-004", trigger: "Invoice Overdue", module: "Finance", subject: "Overdue Invoice Notice — {{invoice_number}}", body: "Dear Finance Team,\n\nInvoice {{invoice_number}} for {{invoice_amount}} from {{vendor_name}} is past its due date of {{due_date}}.\n\nPlease take action.", recipients: "finance@buildos.ng", cc: "cfo@buildos.ng", enabled: true },
  { id: "EC-005", trigger: "New User Created", module: "Admin", subject: "Welcome to BuildOS — {{user_name}}", body: "Dear {{user_name}},\n\nYour BuildOS account has been created. You can now log in at buildos.ng using your registered email address.\n\nPlease contact admin if you have any issues.", recipients: "{{user_email}}", cc: "admin@buildos.ng", enabled: true },
  { id: "EC-006", trigger: "Material Request Approved", module: "Procurement", subject: "Material Request Approved — {{request_number}}", body: "Dear {{requester_email}},\n\nYour material request {{request_number}} has been approved. The procurement team will proceed with sourcing.", recipients: "{{requester_email}}", cc: "", enabled: false },
  { id: "EC-007", trigger: "Appraisal Cycle Opened", module: "HR", subject: "Performance Appraisal Cycle Started — {{cycle}}", body: "Dear Team,\n\nThe {{cycle}} performance appraisal cycle is now open. Please log in to BuildOS and complete your self-assessment by the deadline.", recipients: "all-staff@buildos.ng", cc: "hr@buildos.ng", enabled: true },
];

const BLANK_FORM: Omit<EmailConfig, "id"> = { trigger: "", module: "HR", subject: "", body: "", recipients: "", cc: "", enabled: true };

// ── Shared Modal Components ─────────────────────────────────────────────────

function CategoryModal({ initial, onSave, onClose }: { initial: Partial<ChangeCategory> & { name: string; description: string }; onSave: (data: Omit<ChangeCategory, "id"> & { id?: string }) => void; onClose: () => void }) {
  const [form, setForm] = useState({ ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});
  function submit() {
    if (!form.name.trim()) { setErrors({ name: "Name is required." }); return; }
    onSave(form); onClose();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{initial.id ? "Edit Change Category" : "New Change Category"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Design Change"
              className={`w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${errors.name ? "border-red-400" : "border-gray-200"}`} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
              placeholder="Describe when this category applies…" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">{initial.id ? "Save Changes" : "Add Category"}</button>
        </div>
      </div>
    </div>
  );
}

function DeleteCatModal({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Delete Change Category?</h2>
        <p className="text-sm text-gray-500"><strong>"{name}"</strong> will be permanently removed.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Panel Components ────────────────────────────────────────────────────────

function EmailPanel() {
  const [configs, setConfigs] = useState<EmailConfig[]>(MOCK_CONFIGS);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [saved, setSaved] = useState(false);
  const { getNextId } = useNumbering();

  function openAdd() { setForm({ ...BLANK_FORM }); setEditId(null); setShowModal(true); }
  function openEdit(config: EmailConfig) { const { id, ...rest } = config; setForm({ ...rest }); setEditId(id); setShowModal(true); }
  function saveConfig() {
    if (editId) { setConfigs((prev) => prev.map((c) => c.id === editId ? { ...form, id: editId } : c)); }
    else { setConfigs([...configs, { ...form, id: getNextId("EmailConfig") }]); }
    setShowModal(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }
  function toggleEnabled(id: string) { setConfigs((prev) => prev.map((c) => c.id === id ? { ...c, enabled: !c.enabled } : c)); }
  function deleteConfig(id: string) { setConfigs((prev) => prev.filter((c) => c.id !== id)); }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Email Configuration</h2>
          <p className="text-xs text-gray-500 mt-0.5">Configure automated emails triggered by system events</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm px-4 py-2 rounded-xl"><Plus className="w-4 h-4" /> Add Email Config</button>
      </div>

      {saved && <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-xl"><CheckIcon className="w-4 h-4" /> Email configuration saved.</div>}

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">{configs.filter((c) => c.enabled).length}</p>
          <p className="text-xs text-gray-500">Active Email Configs</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">{configs.length}</p>
          <p className="text-xs text-gray-500">Total Triggers Configured</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">{new Set(configs.map((c) => c.module)).size}</p>
          <p className="text-xs text-gray-500">Modules Covered</p>
        </div>
      </div>

      <div className="space-y-3">
        {configs.map((config) => (
          <div key={config.id} className={`bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4 ${!config.enabled ? "opacity-60" : ""}`}>
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"><Mail className="w-5 h-5 text-gray-500" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-900">{config.trigger}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MODULE_COLORS[config.module]}`}>{config.module}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 font-mono">{config.subject}</p>
              {config.body && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{config.body.split("\n")[0]}</p>}
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                <span>To: {config.recipients}</span>{config.cc && <span>CC: {config.cc}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => openEdit(config)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => toggleEnabled(config.id)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${config.enabled ? "bg-gray-800" : "bg-gray-200"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${config.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
              <button onClick={() => deleteConfig(config.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-900">{editId ? "Edit" : "Add"} Email Configuration</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Module</label>
                  <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500"
                    value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value as TriggerModule, trigger: "" })}>
                    {(["Finance","HR","Procurement","Projects","ESS","Admin","Storefront"] as TriggerModule[]).map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Trigger Event</label>
                  <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500"
                    value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })}>
                    <option value="">Select trigger…</option>
                    {(TRIGGERS_BY_MODULE[form.module] ?? []).map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email Subject</label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-gray-500 font-mono"
                  placeholder="Subject line (use {{variable}} for dynamic values)" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email Body Template</label>
                <textarea rows={6} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500 font-mono resize-y"
                  placeholder="Dear {{employee_name}},\n\nWrite your email body here. Use {{variable}} for dynamic content."
                  value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
                <div className="mt-2">
                  <p className="text-xs text-gray-400 mb-1.5">Available variables — click to insert:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(VARS_BY_MODULE[form.module] ?? []).map((v) => (
                      <button key={v} type="button" onClick={() => setForm((p) => ({ ...p, body: p.body + `{{${v}}}` }))}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700 border border-gray-200 hover:border-indigo-300 transition-colors">
                        {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Recipients</label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500"
                  placeholder="email@company.ng or {{dynamic_variable}}" value={form.recipients} onChange={(e) => setForm({ ...form, recipients: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">CC (optional)</label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500"
                  placeholder="cc@company.ng" value={form.cc} onChange={(e) => setForm({ ...form, cc: e.target.value })} />
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={saveConfig} disabled={!form.trigger.trim() || !form.subject.trim() || !form.recipients.trim()}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50">{editId ? "Save Changes" : "Add Config"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "issue_types" | "change_categories" | "email">("general");

  const [settings, setSettings] = useState({
    currency: "USD", currencySymbol: "$", timezone: "America/New_York", dateFormat: "MM/DD/YYYY",
    timeFormat: "12", numberFormat: "1,234.56", fiscalYearStart: "01", language: "en",
  });
  const [currencyOptions, setCurrencyOptions] = useState(defaultCurrencyOptions);
  const handleChange = (field: string, value: string) => setSettings((prev) => ({ ...prev, [field]: value }));
  const handleSave = () => console.log("Saving settings:", settings);

  const [issueTypes, setIssueTypes] = useState<IssueType[]>(SEED_ISSUE_TYPES);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [editIssueId, setEditIssueId] = useState<string | null>(null);
  const [issueForm, setIssueForm] = useState<typeof EMPTY_ISSUE>({ ...EMPTY_ISSUE });
  function saveIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!issueForm.name.trim()) return;
    if (editIssueId) { setIssueTypes((prev) => prev.map((t) => t.id === editIssueId ? { ...t, ...issueForm } : t)); setEditIssueId(null); }
    else { setIssueTypes((prev) => [...prev, { id: `it-${Date.now()}`, ...issueForm }]); }
    setIssueForm({ ...EMPTY_ISSUE }); setShowIssueForm(false);
  }
  function startEditIssue(t: IssueType) { setIssueForm({ name: t.name, description: t.description, priority: t.priority, color: t.color, requiresApproval: t.requiresApproval, slaHours: t.slaHours, active: t.active }); setEditIssueId(t.id); setShowIssueForm(true); }
  function deleteIssue(id: string) { setIssueTypes((prev) => prev.filter((t) => t.id !== id)); }
  function toggleIssueActive(id: string) { setIssueTypes((prev) => prev.map((t) => t.id === id ? { ...t, active: !t.active } : t)); }

  const [categories, setCategories] = useState<ChangeCategory[]>(SEED_CATS);
  const [catSearch, setCatSearch] = useState("");
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<ChangeCategory | null>(null);
  const [deletingCat, setDeletingCat] = useState<ChangeCategory | null>(null);
  const filteredCats = categories.filter((c) => c.name.toLowerCase().includes(catSearch.toLowerCase()) || c.description.toLowerCase().includes(catSearch.toLowerCase()));
  function saveCat(data: Omit<ChangeCategory, "id"> & { id?: string }) {
    if (data.id) { setCategories((prev) => prev.map((c) => (c.id === data.id ? { ...data, id: data.id! } : c))); }
    else { setCategories((prev) => [...prev, { ...data, id: `cc-${Date.now()}` }]); }
  }

  const defaultCurrencyOptions = [
    { label: "US Dollar", value: "USD", meta: "$" }, { label: "Euro", value: "EUR", meta: "€" },
    { label: "British Pound", value: "GBP", meta: "£" }, { label: "Japanese Yen", value: "JPY", meta: "¥" },
    { label: "Chinese Yuan", value: "CNY", meta: "¥" }, { label: "Indian Rupee", value: "INR", meta: "₹" },
    { label: "Nigerian Naira", value: "NGN", meta: "₦" }, { label: "UAE Dirham", value: "AED", meta: "د.إ" },
    { label: "Saudi Riyal", value: "SAR", meta: "﷼" }, { label: "South African Rand", value: "ZAR", meta: "R" },
  ];

  const TABS = [
    { key: "general" as const,           label: "General" },
    { key: "issue_types" as const,       label: "Issue Types" },
    { key: "change_categories" as const, label: "Change Categories" },
    { key: "email" as const,             label: "Email" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Admin Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Configure system-wide preferences, issue types, change categories, and email notifications</p>
        </div>
        {activeTab === "general" && <button onClick={handleSave} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"><Save className="w-4 h-4" /> Save Changes</button>}
        {activeTab === "issue_types" && <button onClick={() => { setShowIssueForm(true); setEditIssueId(null); setIssueForm({ ...EMPTY_ISSUE }); }} className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium"><Plus className="w-4 h-4" /> Add Issue Type</button>}
        {activeTab === "change_categories" && <button onClick={() => { setEditingCat(null); setShowCatModal(true); }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-xl"><Plus className="w-4 h-4" /> Add Category</button>}
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === t.key ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>{t.label}</button>
        ))}
      </div>

      {activeTab === "general" && (
        <>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4"><DollarSign className="w-5 h-5 text-gray-600" /><h2 className="text-lg font-semibold text-gray-900">Currency Settings</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default Currency</label>
                <CreatableSelect options={currencyOptions} value={settings.currency} onChange={(value, option) => { handleChange("currency", value); if (option?.meta) handleChange("currencySymbol", option.meta); }}
                  onCreateOption={(label) => { const opt = { label, value: label.substring(0, 3).toUpperCase(), meta: "" }; setCurrencyOptions((prev) => [...prev, opt]); return opt; }}
                  placeholder="Select or add currency" createLabel="Add custom currency" metaPlaceholder="Symbol (e.g. $, €, ₦)" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency Symbol</label>
                <input type="text" value={settings.currencySymbol} onChange={(e) => handleChange("currencySymbol", e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Number Format</label>
                <select value={settings.numberFormat} onChange={(e) => handleChange("numberFormat", e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent">
                  <option value="1,234.56">1,234.56 (Comma separator, period decimal)</option>
                  <option value="1.234,56">1.234,56 (Period separator, comma decimal)</option>
                  <option value="1 234.56">1 234.56 (Space separator, period decimal)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fiscal Year Start</label>
                <select value={settings.fiscalYearStart} onChange={(e) => handleChange("fiscalYearStart", e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent">
                  {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                    <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4"><Globe className="w-5 h-5 text-gray-600" /><h2 className="text-lg font-semibold text-gray-900">Regional Settings</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                <select value={settings.timezone} onChange={(e) => handleChange("timezone", e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent">
                  <option value="America/New_York">Eastern Time (ET)</option><option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option><option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">London (GMT)</option><option value="Europe/Paris">Paris (CET)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option><option value="Asia/Dubai">Dubai (GST)</option>
                  <option value="Asia/Kolkata">India (IST)</option><option value="Africa/Lagos">Lagos (WAT)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                <select value={settings.language} onChange={(e) => handleChange("language", e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent">
                  <option value="en">English</option><option value="es">Spanish</option><option value="fr">French</option>
                  <option value="de">German</option><option value="zh">Chinese</option><option value="ja">Japanese</option><option value="ar">Arabic</option>
                </select>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4"><Calendar className="w-5 h-5 text-gray-600" /><h2 className="text-lg font-semibold text-gray-900">Date & Time Format</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                <select value={settings.dateFormat} onChange={(e) => handleChange("dateFormat", e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent">
                  <option value="MM/DD/YYYY">MM/DD/YYYY (04/07/2026)</option><option value="DD/MM/YYYY">DD/MM/YYYY (07/04/2026)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2026-04-07)</option><option value="DD-MMM-YYYY">DD-MMM-YYYY (07-Apr-2026)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Format</label>
                <select value={settings.timeFormat} onChange={(e) => handleChange("timeFormat", e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent">
                  <option value="12">12-hour (3:30 PM)</option><option value="24">24-hour (15:30)</option>
                </select>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "issue_types" && (
        <div className="space-y-5">
          {showIssueForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">{editIssueId ? "Edit Issue Type" : "New Issue Type"}</h2>
              <form onSubmit={saveIssue} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Issue Type Name</label>
                    <input value={issueForm.name} onChange={(e) => setIssueForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Equipment Breakdown" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <input value={issueForm.description} onChange={(e) => setIssueForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short description of the issue type" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                    <select value={issueForm.priority} onChange={(e) => setIssueForm((f) => ({ ...f, priority: e.target.value as IssuePriority }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500">
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">SLA Target (hours)</label>
                    <input type="number" min={1} value={issueForm.slaHours} onChange={(e) => setIssueForm((f) => ({ ...f, slaHours: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Badge Color</label>
                    <div className="flex flex-wrap gap-2">
                      {IT_COLORS.map((c) => (
                        <button type="button" key={c} onClick={() => setIssueForm((f) => ({ ...f, color: c }))}
                          className={`px-2.5 py-1 text-xs rounded-full font-medium border-2 ${c} ${issueForm.color === c ? "border-gray-800 scale-110" : "border-transparent"}`}>{IT_COLOR_NAMES[c]}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 justify-end">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={issueForm.requiresApproval} onChange={(e) => setIssueForm((f) => ({ ...f, requiresApproval: e.target.checked }))} className="rounded" /> Requires Manager Approval
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={issueForm.active} onChange={(e) => setIssueForm((f) => ({ ...f, active: e.target.checked }))} className="rounded" /> Active
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">{editIssueId ? "Save Changes" : "Add Issue Type"}</button>
                  <button type="button" onClick={() => { setShowIssueForm(false); setEditIssueId(null); setIssueForm({ ...EMPTY_ISSUE }); }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                </div>
              </form>
            </div>
          )}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Priority</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">SLA Target</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Approval</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Status</th>
                <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {issueTypes.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-sm text-gray-400">No issue types defined.</td></tr>}
                {issueTypes.map((t) => (
                  <tr key={t.id} className={`hover:bg-gray-50/70 ${!t.active ? "opacity-50" : ""}`}>
                    <td className="px-5 py-3"><div className="flex items-center gap-2.5"><AlertTriangle className="w-4 h-4 text-gray-400 flex-shrink-0" /><div><p className="font-medium text-gray-800">{t.name}</p><p className="text-xs text-gray-400">{t.description}</p></div></div></td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_BADGE[t.priority]}`}>{t.priority}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{t.slaHours < 24 ? `${t.slaHours}h` : `${t.slaHours / 24}d`}</td>
                    <td className="px-4 py-3">{t.requiresApproval ? <span className="flex items-center gap-1 text-xs text-amber-700"><CheckCircle className="w-3.5 h-3.5" />Required</span> : <span className="text-xs text-gray-400">—</span>}</td>
                    <td className="px-4 py-3"><button onClick={() => toggleIssueActive(t.id)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${t.active ? "bg-gray-800" : "bg-gray-200"}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${t.active ? "translate-x-4" : "translate-x-0.5"}`} /></button></td>
                    <td className="px-5 py-3"><div className="flex items-center justify-end gap-2"><button onClick={() => startEditIssue(t)} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100"><Edit className="w-3.5 h-3.5" /></button><button onClick={() => deleteIssue(t.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3"><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />Issue types are used in the <strong>ESS → Log Issues</strong> form. Inactive types will not appear for employees.</div>
        </div>
      )}

      {activeTab === "change_categories" && (
        <div className="space-y-5">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-start gap-3">
            <RefreshCw className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-indigo-700">These categories appear in the ESS <strong>Change Request</strong> form. They help classify and route change requests to the appropriate approvers.</p>
          </div>
          <div className="relative w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={catSearch} onChange={(e) => setCatSearch(e.target.value)} placeholder="Search categories…" className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <tr><th className="px-4 py-3 text-left font-medium w-8">#</th><th className="px-4 py-3 text-left font-medium">Category Name</th><th className="px-4 py-3 text-left font-medium">Description</th><th className="px-4 py-3 text-left font-medium w-24">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCats.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">No categories found.</td></tr>}
                {filteredCats.map((cat, i) => (
                  <tr key={cat.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{cat.description || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingCat(cat); setShowCatModal(true); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => setDeletingCat(cat)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">{filteredCats.length} of {categories.length} categories</p>
          {showCatModal && <CategoryModal initial={editingCat ?? { ...BLANK_CAT }} onSave={saveCat} onClose={() => setShowCatModal(false)} />}
          {deletingCat && <DeleteCatModal name={deletingCat.name} onConfirm={() => setCategories((prev) => prev.filter((c) => c.id !== deletingCat.id))} onClose={() => setDeletingCat(null)} />}
        </div>
      )}

      {activeTab === "email" && <EmailPanel />}
    </div>
  );
}
