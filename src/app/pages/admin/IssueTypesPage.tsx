import { useState } from "react";
import { Plus, Edit, Trash2, AlertTriangle, CheckCircle } from "lucide-react";

const COLORS = [
  "bg-red-100 text-red-700",
  "bg-orange-100 text-orange-700",
  "bg-amber-100 text-amber-700",
  "bg-yellow-100 text-yellow-700",
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-gray-100 text-gray-700",
  "bg-teal-100 text-teal-700",
];

const COLOR_NAMES: Record<string, string> = {
  "bg-red-100 text-red-700": "Red",
  "bg-orange-100 text-orange-700": "Orange",
  "bg-amber-100 text-amber-700": "Amber",
  "bg-yellow-100 text-yellow-700": "Yellow",
  "bg-blue-100 text-blue-700": "Blue",
  "bg-purple-100 text-purple-700": "Purple",
  "bg-gray-100 text-gray-700": "Gray",
  "bg-teal-100 text-teal-700": "Teal",
};

type Priority = "low" | "medium" | "high" | "critical";

interface IssueType {
  id: string;
  name: string;
  description: string;
  priority: Priority;
  color: string;
  requiresApproval: boolean;
  slaHours: number;
  active: boolean;
}

const SEED_ISSUE_TYPES: IssueType[] = [
  {
    id: "it-001", name: "Equipment Breakdown", description: "Machine, tool, or equipment failure",
    priority: "high", color: "bg-red-100 text-red-700", requiresApproval: false, slaHours: 4, active: true,
  },
  {
    id: "it-002", name: "Safety Hazard", description: "Unsafe working conditions or near-miss incident",
    priority: "critical", color: "bg-orange-100 text-orange-700", requiresApproval: true, slaHours: 1, active: true,
  },
  {
    id: "it-003", name: "Material Shortage", description: "Required materials not available on site",
    priority: "medium", color: "bg-amber-100 text-amber-700", requiresApproval: false, slaHours: 8, active: true,
  },
  {
    id: "it-004", name: "Payroll Discrepancy", description: "Issues with salary, deductions, or bonuses",
    priority: "medium", color: "bg-blue-100 text-blue-700", requiresApproval: true, slaHours: 24, active: true,
  },
  {
    id: "it-005", name: "Leave / Absence Issue", description: "Incorrect leave records or attendance disputes",
    priority: "low", color: "bg-purple-100 text-purple-700", requiresApproval: false, slaHours: 48, active: true,
  },
  {
    id: "it-006", name: "HR / Personal Issue", description: "Workplace conflict, harassment, or disciplinary matter",
    priority: "high", color: "bg-red-100 text-red-700", requiresApproval: true, slaHours: 48, active: true,
  },
  {
    id: "it-007", name: "IT / System Issue", description: "Software, hardware, or connectivity problem",
    priority: "medium", color: "bg-gray-100 text-gray-700", requiresApproval: false, slaHours: 8, active: true,
  },
  {
    id: "it-008", name: "Compliance / Regulatory", description: "Potential legal or regulatory non-compliance",
    priority: "critical", color: "bg-orange-100 text-orange-700", requiresApproval: true, slaHours: 2, active: true,
  },
];

const PRIORITY_BADGE: Record<Priority, string> = {
  low:      "bg-gray-100 text-gray-600",
  medium:   "bg-amber-100 text-amber-700",
  high:     "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const EMPTY: Omit<IssueType, "id"> = {
  name: "", description: "", priority: "medium",
  color: COLORS[0], requiresApproval: false, slaHours: 24, active: true,
};

export function IssueTypesPage() {
  const [issueTypes, setIssueTypes] = useState<IssueType[]>(SEED_ISSUE_TYPES);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY });

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editId) {
      setIssueTypes((prev) => prev.map((t) => t.id === editId ? { ...t, ...form } : t));
      setEditId(null);
    } else {
      setIssueTypes((prev) => [...prev, { id: `it-${Date.now()}`, ...form }]);
    }
    setForm({ ...EMPTY });
    setShowForm(false);
  }

  function startEdit(t: IssueType) {
    setForm({
      name: t.name, description: t.description, priority: t.priority,
      color: t.color, requiresApproval: t.requiresApproval, slaHours: t.slaHours, active: t.active,
    });
    setEditId(t.id);
    setShowForm(true);
  }

  function deleteType(id: string) {
    setIssueTypes((prev) => prev.filter((t) => t.id !== id));
  }

  function toggleActive(id: string) {
    setIssueTypes((prev) => prev.map((t) => t.id === id ? { ...t, active: !t.active } : t));
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Issue Types</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure issue categories, priorities, and SLA targets for the ESS module</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY }); }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Issue Type
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">{editId ? "Edit Issue Type" : "New Issue Type"}</h2>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Issue Type Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Equipment Breakdown"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Short description of the issue type"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Priority }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">SLA Target (hours)</label>
                <input
                  type="number" min={1}
                  value={form.slaHours}
                  onChange={(e) => setForm((f) => ({ ...f, slaHours: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Badge Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button type="button" key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className={`px-2.5 py-1 text-xs rounded-full font-medium border-2 ${c} ${form.color === c ? "border-gray-800 scale-110" : "border-transparent"}`}>
                      {COLOR_NAMES[c]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2 justify-end">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={form.requiresApproval}
                    onChange={(e) => setForm((f) => ({ ...f, requiresApproval: e.target.checked }))}
                    className="rounded" />
                  Requires Manager Approval
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={form.active}
                    onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                    className="rounded" />
                  Active
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit"
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">
                {editId ? "Save Changes" : "Add Issue Type"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm({ ...EMPTY }); }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Issue types table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Name</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Priority</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">SLA Target</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Approval</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Status</th>
              <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {issueTypes.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-sm text-gray-400">No issue types defined.</td></tr>
            )}
            {issueTypes.map((t) => (
              <tr key={t.id} className={`hover:bg-gray-50/70 ${!t.active ? "opacity-50" : ""}`}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-800">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_BADGE[t.priority]}`}>
                    {t.priority}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {t.slaHours < 24 ? `${t.slaHours}h` : `${t.slaHours / 24}d`}
                </td>
                <td className="px-4 py-3">
                  {t.requiresApproval
                    ? <span className="flex items-center gap-1 text-xs text-amber-700"><CheckCircle className="w-3.5 h-3.5" />Required</span>
                    : <span className="text-xs text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(t.id)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${t.active ? "bg-gray-800" : "bg-gray-200"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${t.active ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => startEdit(t)} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteType(t.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        Issue types are used in the <strong>ESS → Log Issues</strong> form. Inactive types will not appear for employees.
      </div>
    </div>
  );
}
