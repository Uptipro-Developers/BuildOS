import { useState } from "react";
import { Plus, Mail, Trash2, Edit2, Check, X } from "lucide-react";
import { useNumbering } from "../../stores/numberingStore";

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
  id: string;
  trigger: string;
  module: TriggerModule;
  subject: string;
  body: string;
  recipients: string;
  cc: string;
  enabled: boolean;
}

const MODULE_COLORS: Record<TriggerModule, string> = {
  Finance:    "bg-emerald-50 text-emerald-700",
  HR:         "bg-purple-50 text-purple-700",
  Procurement:"bg-blue-50 text-blue-700",
  Projects:   "bg-sky-50 text-sky-700",
  ESS:        "bg-teal-50 text-teal-700",
  Admin:      "bg-gray-100 text-gray-700",
  Storefront: "bg-orange-50 text-orange-700",
};

const MOCK_CONFIGS: EmailConfig[] = [
  { id: "EC-001", trigger: "Leave Request Submitted",   module: "HR",          subject: "New Leave Request — {{employee_name}}",           body: "Dear {{employee_manager}},\n\n{{employee_name}} has submitted a leave request ({{leave_type}}) from {{start_date}} to {{end_date}}.\n\nPlease review and approve or reject the request in BuildOS.",                                  recipients: "hr@buildos.ng",              cc: "{{employee_manager}}", enabled: true  },
  { id: "EC-002", trigger: "Payroll Processed",         module: "HR",          subject: "Payroll Processed — {{period}}",                   body: "Dear Team,\n\nPayroll for {{period}} has been processed successfully. Please log in to BuildOS ESS to view your payslip.",                                                                    recipients: "all-staff@buildos.ng",       cc: "cfo@buildos.ng",       enabled: true  },
  { id: "EC-003", trigger: "Send PO to Supplier",       module: "Procurement", subject: "Purchase Order {{po_number}} — BuildOS",             body: "Dear {{supplier_name}},\n\nPlease find attached Purchase Order {{po_number}}. Kindly confirm receipt and expected delivery date.\n\nRegards,\nBuildOS Procurement Team",              recipients: "{{supplier_email}}",         cc: "procurement@buildos.ng",enabled: true  },
  { id: "EC-004", trigger: "Invoice Overdue",           module: "Finance",     subject: "Overdue Invoice Notice — {{invoice_number}}",      body: "Dear Finance Team,\n\nInvoice {{invoice_number}} for {{invoice_amount}} from {{vendor_name}} is past its due date of {{due_date}}.\n\nPlease take action.",                             recipients: "finance@buildos.ng",         cc: "cfo@buildos.ng",       enabled: true  },
  { id: "EC-005", trigger: "New User Created",          module: "Admin",       subject: "Welcome to BuildOS — {{user_name}}",               body: "Dear {{user_name}},\n\nYour BuildOS account has been created. You can now log in at buildos.ng using your registered email address.\n\nPlease contact admin if you have any issues.",    recipients: "{{user_email}}",             cc: "admin@buildos.ng",     enabled: true  },
  { id: "EC-006", trigger: "Material Request Approved", module: "Procurement", subject: "Material Request Approved — {{request_number}}",   body: "Dear {{requester_email}},\n\nYour material request {{request_number}} has been approved. The procurement team will proceed with sourcing.",                                              recipients: "{{requester_email}}",        cc: "",                     enabled: false },
  { id: "EC-007", trigger: "Appraisal Cycle Opened",    module: "HR",          subject: "Performance Appraisal Cycle Started — {{cycle}}", body: "Dear Team,\n\nThe {{cycle}} performance appraisal cycle is now open. Please log in to BuildOS and complete your self-assessment by the deadline.",                                   recipients: "all-staff@buildos.ng",       cc: "hr@buildos.ng",        enabled: true  },
];

const BLANK_FORM: Omit<EmailConfig, "id"> = {
  trigger: "", module: "HR", subject: "", body: "", recipients: "", cc: "", enabled: true,
};

export function AdminEmailSettingsPage() {
  const [configs, setConfigs] = useState<EmailConfig[]>(MOCK_CONFIGS);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [saved, setSaved] = useState(false);
  const { getNextId } = useNumbering();

  function openAdd() {
    setForm({ ...BLANK_FORM });
    setEditId(null);
    setShowModal(true);
  }

  function openEdit(config: EmailConfig) {
    const { id, ...rest } = config;
    setForm({ ...rest });
    setEditId(id);
    setShowModal(true);
  }

  function saveConfig() {
    if (editId) {
      setConfigs((prev) => prev.map((c) => c.id === editId ? { ...form, id: editId } : c));
    } else {
      setConfigs([...configs, { ...form, id: getNextId("EmailConfig") }]);
    }
    setShowModal(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function toggleEnabled(id: string) {
    setConfigs((prev) => prev.map((c) => c.id === id ? { ...c, enabled: !c.enabled } : c));
  }

  function deleteConfig(id: string) {
    setConfigs((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Email Configuration</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure automated emails triggered by system events</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm px-4 py-2 rounded-xl">
          <Plus className="w-4 h-4" /> Add Email Config
        </button>
      </div>

      {saved && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-xl">
          <Check className="w-4 h-4" /> Email configuration saved.
        </div>
      )}

      {/* Stats */}
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

      {/* Config list */}
      <div className="space-y-3">
        {configs.map((config) => (
          <div key={config.id} className={`bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4 ${!config.enabled ? "opacity-60" : ""}`}>
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
              <Mail className="w-5 h-5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-900">{config.trigger}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MODULE_COLORS[config.module]}`}>
                  {config.module}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 font-mono">{config.subject}</p>
              {config.body && (
                <p className="text-xs text-gray-400 mt-1 line-clamp-1">{config.body.split("\n")[0]}</p>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                <span>To: {config.recipients}</span>
                {config.cc && <span>CC: {config.cc}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => openEdit(config)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => toggleEnabled(config.id)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${config.enabled ? "bg-gray-800" : "bg-gray-200"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${config.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
              <button onClick={() => deleteConfig(config.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
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
              {/* Email body */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email Body Template</label>
                <textarea rows={6}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500 font-mono resize-y"
                  placeholder="Dear {{employee_name}},\n\nWrite your email body here. Use {{variable}} for dynamic content."
                  value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
                {/* Variable chips */}
                <div className="mt-2">
                  <p className="text-xs text-gray-400 mb-1.5">Available variables — click to insert:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(VARS_BY_MODULE[form.module] ?? []).map((v) => (
                      <button key={v} type="button"
                        onClick={() => setForm((p) => ({ ...p, body: p.body + `{{${v}}}` }))}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700 border border-gray-200 hover:border-indigo-300 transition-colors">
                        <X className="w-2.5 h-2.5 opacity-0" />{`{{${v}}}`}
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
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50">
                {editId ? "Save Changes" : "Add Config"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
