import { useState } from "react";
import { Save, CheckCircle, Clock, Users, Banknote, Settings2, Mail, Building2, ArrowRight, MapPin, Plus, X, Edit, Hash, Trash2, ChevronDown, ChevronRight, XCircle, FolderKanban, FolderX, CalendarDays, CreditCard } from "lucide-react";
import { useNumbering, type ModuleNumbering, MODULE_DOMAINS, formatId } from "../../stores/numberingStore";
import { useHRConfig, type LeaveType, type LeaveGender, type ClaimType } from "../../stores/hrConfigStore";

const TABS = ["general", "leave", "claim", "numbering"] as const;
type Tab = typeof TABS[number];
const TAB_LABELS: Record<Tab, string> = {
  general: "General",
  leave: "Leave Types",
  claim: "Claim Types",
  numbering: "Numbering",
};

interface FieldProps {
  label: string; value: string; onChange: (v: string) => void; type?: "text" | "number" | "select"; options?: string[]; suffix?: string;
}

function Field({ label, value, onChange, type = "text", options, suffix }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="relative">
        {type === "select" ? (
          <select value={value} onChange={e => onChange(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            {options?.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input type={type} value={value} onChange={e => onChange(e.target.value)} className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${suffix ? "pr-16" : ""}`} />
        )}
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">{suffix}</span>}
      </div>
    </div>
  );
}

const COLORS = [
  "bg-blue-100 text-blue-700", "bg-red-100 text-red-700", "bg-orange-100 text-orange-700",
  "bg-green-100 text-green-700", "bg-purple-100 text-purple-700", "bg-pink-100 text-pink-700",
  "bg-amber-100 text-amber-700", "bg-teal-100 text-teal-700", "bg-gray-100 text-gray-700",
];

const COLOR_NAMES: Record<string, string> = {
  "bg-blue-100 text-blue-700": "Blue", "bg-red-100 text-red-700": "Red",
  "bg-orange-100 text-orange-700": "Orange", "bg-green-100 text-green-700": "Green",
  "bg-purple-100 text-purple-700": "Purple", "bg-pink-100 text-pink-700": "Pink",
  "bg-amber-100 text-amber-700": "Amber", "bg-teal-100 text-teal-700": "Teal",
  "bg-gray-100 text-gray-700": "Gray",
};

const GENDER_LABELS: Record<LeaveGender, string> = {
  all: "All (Gender-neutral)", male: "Male only", female: "Female only",
};

const LEAVE_EMPTY = { name: "", daysAllowed: 10, carryOver: false, maxCarryOver: 0, paid: true, approvalsRequired: 1 as 1 | 2, color: COLORS[0], gender: "all" as LeaveGender };
const CLAIM_EMPTY = { name: "", description: "", isProjectBased: false };

function genderBadge(g: LeaveGender) {
  if (g === "male")   return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">Male</span>;
  if (g === "female") return <span className="text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 font-medium">Female</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">All</span>;
}

// ── General Panel ──────────────────────────────────────────────────────────

function GeneralPanel() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    workHoursPerDay: "8", workDaysPerWeek: "5", weekStartDay: "Monday", overtimeMultiplier: "1.5",
    probationMonths: "3", noticePeriodDays: "30", retirementAge: "60", currency: "USD",
    fiscalYearStart: "January", payrollFrequency: "Monthly", taxRate: "15", pensionRate: "8",
    hrEmail: "", notificationEmail: "", senderEmail: "",
  });
  const [clusters, setClusters] = useState(["Lekki-VI", "Ikeja", "Apapa", "Victoria Island", "Ikoyi"]);
  const [newCluster, setNewCluster] = useState("");

  function f(key: keyof typeof form) { return (v: string) => setForm(prev => ({ ...prev, [key]: v })); }

  function save() { setSaved(true); setTimeout(() => setSaved(false), 3000); }

  function addCluster() {
    if (!newCluster.trim() || clusters.includes(newCluster.trim())) return;
    setClusters(prev => [...prev, newCluster.trim()]);
    setNewCluster("");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">General Setup</h2>
          <p className="text-xs text-gray-500 mt-0.5">Configure core HR parameters and policies</p>
        </div>
        <button onClick={save}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${saved ? "bg-green-600 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
          {saved ? <><CheckCircle className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Clock className="w-4 h-4 text-indigo-600" /> Work Schedule</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Work Hours / Day" value={form.workHoursPerDay} onChange={f("workHoursPerDay")} type="number" suffix="hrs" />
            <Field label="Work Days / Week" value={form.workDaysPerWeek} onChange={f("workDaysPerWeek")} type="number" suffix="days" />
            <Field label="Week Start Day" value={form.weekStartDay} onChange={f("weekStartDay")} type="select" options={["Monday", "Sunday"]} />
            <Field label="Overtime Multiplier" value={form.overtimeMultiplier} onChange={f("overtimeMultiplier")} type="number" suffix="×" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Users className="w-4 h-4 text-indigo-600" /> Employment Policies</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Probation Period" value={form.probationMonths} onChange={f("probationMonths")} type="number" suffix="months" />
            <Field label="Notice Period" value={form.noticePeriodDays} onChange={f("noticePeriodDays")} type="number" suffix="days" />
            <Field label="Retirement Age" value={form.retirementAge} onChange={f("retirementAge")} type="number" suffix="yrs" />
            <Field label="Currency" value={form.currency} onChange={f("currency")} type="select" options={["USD", "NGN", "GBP", "EUR", "GHS"]} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Banknote className="w-4 h-4 text-indigo-600" /> Payroll Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Payroll Frequency" value={form.payrollFrequency} onChange={f("payrollFrequency")} type="select" options={["Monthly", "Bi-Weekly", "Weekly"]} />
            <Field label="Fiscal Year Start" value={form.fiscalYearStart} onChange={f("fiscalYearStart")} type="select" options={["January","February","March","April","May","June","July","August","September","October","November","December"]} />
            <Field label="Default Tax Rate" value={form.taxRate} onChange={f("taxRate")} type="number" suffix="%" />
            <Field label="Pension Contribution" value={form.pensionRate} onChange={f("pensionRate")} type="number" suffix="%" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Settings2 className="w-4 h-4 text-indigo-600" /> System Information</h2>
          <div className="space-y-3">
            {[
              { key: "Module Version", val: "HR v2.4.1" }, { key: "Last Configured By", val: "Ngozi Okafor" },
              { key: "Last Modified", val: "Apr 9, 2026 14:32" }, { key: "Total Employees", val: "156" },
              { key: "Active Departments", val: "8" },
            ].map(row => <div key={row.key} className="flex justify-between text-sm"><span className="text-gray-500">{row.key}</span><span className="font-medium text-gray-900">{row.val}</span></div>)}
          </div>
        </div>
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Mail className="w-4 h-4 text-indigo-600" /> Email & Notifications</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field label="HR Email Address" value={form.hrEmail} onChange={f("hrEmail")} />
            <Field label="Notification Email (optional)" value={form.notificationEmail} onChange={f("notificationEmail")} />
            <Field label="System Sender Email" value={form.senderEmail} onChange={f("senderEmail")} />
          </div>
        </div>
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Building2 className="w-4 h-4 text-indigo-600" /> Organizational Structure</h2>
          <p className="text-xs text-gray-500">Configure your organizational hierarchy, including levels, supporting structures (Crafts, Circles), and employee assignments.</p>
          <a href="/apps/hr/org-structure" className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors">
            Manage Organizational Structure <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-indigo-600" /> Clusters Management</h2>
          <p className="text-xs text-gray-500">Geographic clusters used to group organizational units and projects.</p>
          <div className="flex flex-wrap gap-2">
            {clusters.map(c => (
              <span key={c} className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full">
                {c}
                <button onClick={() => setClusters(prev => prev.filter(x => x !== c))} className="hover:text-red-600 transition-colors"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input value={newCluster} onChange={e => setNewCluster(e.target.value)} placeholder="New cluster name..." className="flex-1 max-w-xs border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyDown={e => e.key === "Enter" && addCluster()} />
            <button onClick={addCluster} disabled={!newCluster.trim()} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-40"><Plus className="w-3.5 h-3.5" /> Add Cluster</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Leave Types Panel ──────────────────────────────────────────────────────

function LeaveTypesPanel() {
  const { leaveTypes, setLeaveTypes } = useHRConfig();
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState(LEAVE_EMPTY);
  const [editId, setEditId] = useState<string | null>(null);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editId) {
      setLeaveTypes(prev => prev.map(t => t.id === editId ? { ...t, ...form } : t));
      setEditId(null);
    } else {
      setLeaveTypes(prev => [...prev, { id: `lt-${Date.now()}`, ...form }]);
    }
    setForm(LEAVE_EMPTY);
    setExpanded(false);
  }

  function startEdit(t: LeaveType) {
    setForm({ name: t.name, daysAllowed: t.daysAllowed, carryOver: t.carryOver, maxCarryOver: t.maxCarryOver, paid: t.paid, approvalsRequired: t.approvalsRequired, color: t.color, gender: t.gender });
    setEditId(t.id);
    setExpanded(true);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button onClick={() => setExpanded(!expanded)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-gray-900">Leave Types</h2>
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </button>

        {expanded && (
          <div className="border-t border-gray-100 p-5 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">{editId ? "Edit Leave Type" : "Add Leave Type"}</h3>
              <form onSubmit={save} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Leave Type Name *</label>
                    <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Annual Leave" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Days Allowed / Year</label>
                    <input type="number" min="1" value={form.daysAllowed} onChange={e => setForm(f => ({ ...f, daysAllowed: Number(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
                    <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value as LeaveGender }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                      <option value="all">All (Gender-neutral)</option><option value="female">Female only (e.g. Maternity)</option><option value="male">Male only (e.g. Paternity)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Approvals Required</label>
                    <select value={form.approvalsRequired} onChange={e => setForm(f => ({ ...f, approvalsRequired: Number(e.target.value) as 1 | 2 }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                      <option value={1}>1 — Direct Manager only</option><option value={2}>2 — Manager + HR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Colour Tag</label>
                    <select value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                      {COLORS.map(c => <option key={c} value={c}>{COLOR_NAMES[c]}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-6 flex-wrap">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form.paid} onChange={e => setForm(f => ({ ...f, paid: e.target.checked }))} className="rounded accent-indigo-600" /> Paid Leave
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form.carryOver} onChange={e => setForm(f => ({ ...f, carryOver: e.target.checked }))} className="rounded accent-indigo-600" /> Allow Carry-over
                  </label>
                  {form.carryOver && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600">Max carry-over days:</label>
                      <input type="number" value={form.maxCarryOver} min={0} onChange={e => setForm(f => ({ ...f, maxCarryOver: Number(e.target.value) }))}
                        className="w-16 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Save</button>
                  <button type="button" onClick={() => { setExpanded(false); setEditId(null); setForm(LEAVE_EMPTY); }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                </div>
              </form>
            </div>

            <table className="w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Leave Type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Days / Year</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Paid</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Carry-over</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Approvals</th>
                  <th className="px-3 py-2 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leaveTypes.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2"><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${t.color}`}>{t.name}</span></td>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900">{t.daysAllowed} days</td>
                    <td className="px-3 py-2">{genderBadge(t.gender)}</td>
                    <td className="px-3 py-2">{t.paid ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}</td>
                    <td className="px-3 py-2 text-sm text-gray-500">{t.carryOver ? `Yes (max ${t.maxCarryOver} days)` : "No"}</td>
                    <td className="px-3 py-2 text-sm text-gray-500">{t.approvalsRequired === 1 ? "Manager only" : "Manager + HR"}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(t)} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setLeaveTypes(prev => prev.filter(x => x.id !== t.id))} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-4 text-xs text-gray-500 px-1 pt-2 border-t border-gray-100">
              <span className="font-medium text-gray-600">Gender policy:</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />{GENDER_LABELS.all}</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-pink-400 inline-block" />{GENDER_LABELS.female}</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />{GENDER_LABELS.male}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Claim Types Panel ──────────────────────────────────────────────────────

function ClaimTypesPanel() {
  const { claimTypes, setClaimTypes } = useHRConfig();
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState(CLAIM_EMPTY);
  const [editId, setEditId] = useState<string | null>(null);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editId) {
      setClaimTypes(prev => prev.map(c => c.id === editId ? { ...c, ...form } : c));
      setEditId(null);
    } else {
      setClaimTypes(prev => [...prev, { id: `ct-${Date.now()}`, ...form }]);
    }
    setForm(CLAIM_EMPTY);
    setExpanded(false);
  }

  function startEdit(c: ClaimType) {
    setForm({ name: c.name, description: c.description, isProjectBased: c.isProjectBased });
    setEditId(c.id);
    setExpanded(true);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button onClick={() => setExpanded(!expanded)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-gray-900">Claim Types</h2>
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </button>

        {expanded && (
          <div className="border-t border-gray-100 p-5 space-y-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 flex items-start gap-3">
              <FolderKanban className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-indigo-800">
                Claim types defined here are automatically available in <strong>ESS → Submit Request → Finance → Claim</strong>.
                Enabling <strong>"Project-based"</strong> forces employees to select a project when submitting that claim type.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">{editId ? "Edit Claim Type" : "Add Claim Type"}</h3>
              <form onSubmit={save} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Claim Type Name *</label>
                    <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Travel Claim" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-start gap-3 cursor-pointer w-full border border-gray-200 rounded-md px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="mt-0.5">
                        <input type="checkbox" checked={form.isProjectBased} onChange={e => setForm(f => ({ ...f, isProjectBased: e.target.checked }))} className="rounded accent-indigo-600 w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">Project-based claim</p>
                        <p className="text-xs text-gray-500 mt-0.5">{form.isProjectBased ? "Employee must select a project" : "Claim is not tied to any project"}</p>
                      </div>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2} placeholder="Brief description of what this claim covers…"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">Save</button>
                  <button type="button" onClick={() => { setExpanded(false); setEditId(null); setForm(CLAIM_EMPTY); }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                </div>
              </form>
            </div>

            <table className="w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Claim Type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Project-based</th>
                  <th className="px-3 py-2 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {claimTypes.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">{c.name}</td>
                    <td className="px-3 py-2 text-sm text-gray-500 max-w-xs truncate">{c.description || "—"}</td>
                    <td className="px-3 py-2">
                      {c.isProjectBased ? (
                        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                          <FolderKanban className="w-3 h-3" /> Yes — project required
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">
                          <FolderX className="w-3 h-3" /> No — standalone
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(c)} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setClaimTypes(prev => prev.filter(x => x.id !== c.id))} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {claimTypes.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No claim types defined yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Numbering Panel ────────────────────────────────────────────────────────

function NumberingPanel() {
  const { configs, updateConfig, addConfig, removeConfig } = useNumbering();
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ template: "", startingNumber: 1, endingNumber: null as number | null, incrementBy: 1 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({ module: "", template: "", startingNumber: 1, endingNumber: null as number | null, incrementBy: 1, description: "" });

  function startEdit(cfg: ModuleNumbering) {
    setEditingModule(cfg.module);
    setEditForm({ template: cfg.template, startingNumber: cfg.startingNumber, endingNumber: cfg.endingNumber, incrementBy: cfg.incrementBy });
  }

  function cancelEdit() { setEditingModule(null); }
  function saveEdit(module: string) { updateConfig(module, editForm); setEditingModule(null); }

  function saveAddNumbering() {
    if (!addFormData.module.trim()) return;
    addConfig({
      module: addFormData.module, prefix: addFormData.module.slice(0, 3).toUpperCase(), separator: "-",
      template: addFormData.template || `${addFormData.module.slice(0, 3).toUpperCase()}-{N:4}`,
      startingNumber: addFormData.startingNumber, endingNumber: addFormData.endingNumber, incrementBy: addFormData.incrementBy,
      lastUsedDate: "", lastUsedNumber: 0, description: addFormData.description,
    });
    setShowAddForm(false);
    setAddFormData({ module: "", template: "", startingNumber: 1, endingNumber: null, incrementBy: 1, description: "" });
  }

  const hrConfigs = configs.filter(cfg => MODULE_DOMAINS.HR.includes(cfg.module));

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Hash className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-900">Module Numbering System</h2>
      </div>
      <div className="p-5">
        <p className="text-xs text-gray-500 mb-4">Configure the auto-numbering format for records across HR modules.</p>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Process</th>
                <th className="px-4 py-3 text-left font-medium">Template</th>
                <th className="px-4 py-3 text-left font-medium">Starting #</th>
                <th className="px-4 py-3 text-left font-medium">Ending #</th>
                <th className="px-4 py-3 text-left font-medium">Increment By</th>
                <th className="px-4 py-3 text-left font-medium">Last Used #</th>
                <th className="px-4 py-3 text-left font-medium">Last Used Date</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {hrConfigs.map(cfg => (
                <tr key={cfg.module} className="hover:bg-gray-50 group">
                  {editingModule === cfg.module ? (
                    <>
                      <td className="px-4 py-3 font-medium text-gray-900">{cfg.module}</td>
                      <td className="px-4 py-3"><input type="text" value={editForm.template} onChange={e => setEditForm({ ...editForm, template: e.target.value })} className="w-28 px-2 py-1 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" /></td>
                      <td className="px-4 py-3"><input type="number" min={1} value={editForm.startingNumber} onChange={e => setEditForm({ ...editForm, startingNumber: parseInt(e.target.value) || 1 })} className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" /></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1"><input type="number" min={1} value={editForm.endingNumber ?? ""} onChange={e => setEditForm({ ...editForm, endingNumber: e.target.value ? parseInt(e.target.value) : null })} className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="∞" /><label className="text-[10px] text-gray-400 flex items-center gap-0.5"><input type="checkbox" checked={editForm.endingNumber === null} onChange={e => setEditForm({ ...editForm, endingNumber: e.target.checked ? null : 9999 })} className="w-3 h-3" /> Unlimited</label></div></td>
                      <td className="px-4 py-3"><input type="number" min={1} value={editForm.incrementBy} onChange={e => setEditForm({ ...editForm, incrementBy: parseInt(e.target.value) || 1 })} className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" /></td>
                      <td className="px-4 py-3"><span className="font-mono text-xs text-gray-600">{formatId(cfg.template, cfg.lastUsedNumber)}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{cfg.lastUsedDate || "—"}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1"><button onClick={() => saveEdit(cfg.module)} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg"><Save className="w-3.5 h-3.5" /></button><button onClick={cancelEdit} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-3.5 h-3.5" /></button></div></td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-gray-900">{cfg.module}</td>
                      <td className="px-4 py-3"><span className="font-mono text-xs text-gray-500">{cfg.template}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-700">{cfg.startingNumber}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">{cfg.endingNumber ?? "∞"}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">{cfg.incrementBy}</td>
                      <td className="px-4 py-3"><span className="font-mono text-xs text-gray-600">{formatId(cfg.template, cfg.lastUsedNumber)}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{cfg.lastUsedDate || "—"}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1"><button onClick={() => startEdit(cfg)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Edit className="w-3.5 h-3.5" /></button><button onClick={() => removeConfig(cfg.module)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                    </>
                  )}
                </tr>
              ))}
              {showAddForm && (
                <tr className="bg-amber-50/50">
                  <td className="px-4 py-3">
                    <select value={addFormData.module} onChange={e => { const m = e.target.value; setAddFormData({ ...addFormData, module: m, template: m ? `${m.slice(0, 3).toUpperCase()}-{N:4}` : "" }); }}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white">
                      <option value="">Select a process…</option>
                      {MODULE_DOMAINS.HR.filter(m => !configs.some(c => c.module === m)).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3"><input type="text" value={addFormData.template} onChange={e => setAddFormData({ ...addFormData, template: e.target.value })} className="w-28 px-2 py-1 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" /></td>
                  <td className="px-4 py-3"><input type="number" min={1} value={addFormData.startingNumber} onChange={e => setAddFormData({ ...addFormData, startingNumber: parseInt(e.target.value) || 1 })} className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" /></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1"><input type="number" min={1} value={addFormData.endingNumber ?? ""} onChange={e => setAddFormData({ ...addFormData, endingNumber: e.target.value ? parseInt(e.target.value) : null })} className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="∞" /><label className="text-[10px] text-gray-400 flex items-center gap-0.5"><input type="checkbox" checked={addFormData.endingNumber === null} onChange={e => setAddFormData({ ...addFormData, endingNumber: e.target.checked ? null : 9999 })} className="w-3 h-3" /> Unlimited</label></div></td>
                  <td className="px-4 py-3"><input type="number" min={1} value={addFormData.incrementBy} onChange={e => setAddFormData({ ...addFormData, incrementBy: parseInt(e.target.value) || 1 })} className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" /></td>
                  <td className="px-4 py-3 text-xs text-gray-400">—</td>
                  <td className="px-4 py-3 text-xs text-gray-400">—</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1"><button onClick={saveAddNumbering} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg"><Save className="w-3.5 h-3.5" /></button><button onClick={() => { setShowAddForm(false); setAddFormData({ module: "", template: "", startingNumber: 1, endingNumber: null, incrementBy: 1, description: "" }); }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-3.5 h-3.5" /></button></div></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!showAddForm && <button onClick={() => setShowAddForm(true)} className="mt-4 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"><Plus className="w-3.5 h-3.5" /> Add Numbering Entry</button>}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function HRSettingsPage() {
  const [tab, setTab] = useState<Tab>("general");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">HR Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure core HR parameters, policies, leave types, and claim types</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "general" && <GeneralPanel />}
      {tab === "leave" && <LeaveTypesPanel />}
      {tab === "claim" && <ClaimTypesPanel />}
      {tab === "numbering" && <NumberingPanel />}
    </div>
  );
}
