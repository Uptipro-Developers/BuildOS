import { useState } from "react";
import { Plus, AlertTriangle, Lightbulb, Flag, ChevronDown, ChevronUp } from "lucide-react";
import { useNumbering } from "../../stores/numberingStore";

type IssueType = "Incident" | "Complaint" | "Suggestion" | "Safety";
type IssuePriority = "Low" | "Medium" | "High";
type IssueStatus = "Open" | "Under Investigation" | "In Progress" | "Escalated" | "Resolved" | "Closed";

interface Issue {
  id: string;
  type: IssueType;
  title: string;
  description: string;
  priority: IssuePriority;
  status: IssueStatus;
  date: string;
  anonymous: boolean;
  impactTypes: string[];
  rootCause: string;
  targetDate: string;
  actions: string;
  ownerId: string;
  resolutionNotes: string;
  closedAt: string | null;
}

const staffList = [
  "Emeka Okafor", "Sarah Adeyemi", "Tunde Balogun", "Chidi Nwosu",
  "Yemi Lawson", "Dr. Ngozi Eze", "Mike Ogun", "Kunle Adesina",
  "James Okafor", "Aisha Bello",
];

const TYPE_ICONS: Record<IssueType, React.ReactNode> = {
  Incident:   <AlertTriangle className="w-4 h-4 text-red-500" />,
  Complaint:  <Flag className="w-4 h-4 text-orange-500" />,
  Suggestion: <Lightbulb className="w-4 h-4 text-yellow-500" />,
  Safety:     <AlertTriangle className="w-4 h-4 text-red-600" />,
};

const PRIORITY_STYLES: Record<IssuePriority, string> = {
  Low:    "bg-gray-100 text-gray-600",
  Medium: "bg-yellow-50 text-yellow-700",
  High:   "bg-red-50 text-red-700",
};

const STATUS_STYLES: Record<IssueStatus, string> = {
  Open:                "bg-blue-50 text-blue-700",
  "Under Investigation":"bg-yellow-50 text-yellow-700",
  "In Progress":       "bg-orange-50 text-orange-700",
  Escalated:           "bg-red-50 text-red-700",
  Resolved:            "bg-green-50 text-green-700",
  Closed:              "bg-gray-100 text-gray-600",
};

const MOCK_ISSUES: Issue[] = [
  { id: "ISS-004", type: "Safety", title: "Unmanned excavation pit at Block D", description: "The excavation pit near Block D has been left without safety barriers for 3 days.", priority: "High", status: "Under Investigation", date: "Jun 3, 2025", anonymous: false, impactTypes: ["Safety"], rootCause: "Supervisor not assigned", targetDate: "2025-06-10", actions: "Assign safety supervisor immediately", ownerId: "James Okafor", resolutionNotes: "", closedAt: null },
  { id: "ISS-003", type: "Suggestion", title: "Add more toolbox talk sessions", description: "Weekly toolbox talks would help improve safety awareness on site.", priority: "Medium", status: "Resolved", date: "May 20, 2025", anonymous: false, impactTypes: [], rootCause: "", targetDate: "", actions: "", ownerId: "", resolutionNotes: "Implemented weekly talks", closedAt: "2025-06-01" },
  { id: "ISS-002", type: "Complaint", title: "Late payment of transport allowance", description: "Transport allowance has been delayed by 3 months for the engineering team.", priority: "High", status: "Closed", date: "Apr 15, 2025", anonymous: false, impactTypes: ["Cost"], rootCause: "Payroll processing delay", targetDate: "2025-05-01", actions: "Escalated to HR", ownerId: "Sarah Adeyemi", resolutionNotes: "Payroll processed", closedAt: "2025-05-15" },
];

const BLANK: Omit<Issue, "id" | "date" | "status"> = {
  type: "Incident",
  title: "",
  description: "",
  priority: "Medium",
  anonymous: false,
  impactTypes: [],
  rootCause: "",
  targetDate: "",
  actions: "",
  ownerId: "",
  resolutionNotes: "",
  closedAt: null,
};

export function LogIssuesPage() {
  const [issues, setIssues] = useState<Issue[]>(MOCK_ISSUES);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...BLANK });
  const [expanded, setExpanded] = useState<string | null>(null);
  const { getNextId } = useNumbering();

  function openModal() {
    setForm({ ...BLANK });
    setShowModal(true);
  }

  function toggleImpact(type: string) {
    setForm(prev => ({
      ...prev,
      impactTypes: prev.impactTypes.includes(type)
        ? prev.impactTypes.filter(t => t !== type)
        : [...prev.impactTypes, type],
    }));
  }

  function submit() {
    const newIssue: Issue = {
      ...form,
      id: getNextId("Issue"),
      status: "Open",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };
    setIssues([newIssue, ...issues]);
    setShowModal(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Log Issues</h1>
          <p className="text-sm text-gray-500 mt-0.5">Report incidents, complaints, safety concerns, or suggestions</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 text-white text-sm px-4 py-2 rounded-xl"
          style={{ backgroundColor: "#E8973A" }}
        >
          <Plus className="w-4 h-4" /> Log Issue
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {(["Open", "Under Investigation", "Resolved", "Total"] as const).map((label) => {
          const count = label === "Total" ? issues.length : issues.filter((i) => i.status === label).length;
          return (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-3">
        {issues.map((issue) => (
          <div key={issue.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 text-left"
              onClick={() => setExpanded((p) => (p === issue.id ? null : issue.id))}
            >
              <div className="flex-shrink-0">{TYPE_ICONS[issue.type]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{issue.title}</p>
                <p className="text-xs text-gray-500">{issue.id} · {issue.type} · {issue.date}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_STYLES[issue.priority]}`}>
                  {issue.priority}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[issue.status]}`}>
                  {issue.status}
                </span>
                {expanded === issue.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>
            {expanded === issue.id && (
              <div className="border-t border-gray-100 px-5 py-4 space-y-2">
                <p className="text-sm text-gray-700">{issue.description}</p>
                {issue.impactTypes.length > 0 && <p className="text-xs text-gray-500">Impact: {issue.impactTypes.join(", ")}</p>}
                {issue.rootCause && <p className="text-xs text-gray-500">Root cause: {issue.rootCause}</p>}
                {issue.ownerId && <p className="text-xs text-gray-500">Owner: {issue.ownerId}</p>}
                {issue.targetDate && <p className="text-xs text-gray-500">Target: {issue.targetDate}</p>}
                {issue.anonymous && <p className="text-xs text-gray-400 italic">Submitted anonymously</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-base font-semibold text-gray-900">Log New Issue</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Issue Type</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as IssueType })}
                  >
                    {(["Incident", "Complaint", "Suggestion", "Safety"] as IssueType[]).map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as IssuePriority })}
                  >
                    {(["Low", "Medium", "High"] as IssuePriority[]).map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
                  placeholder="Brief summary of the issue"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none"
                  rows={3}
                  placeholder="Describe the issue in detail…"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Impact Types</label>
                <div className="flex flex-wrap gap-2">
                  {["Schedule", "Cost", "Scope", "Quality", "Safety"].map(type => (
                    <label key={type} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={form.impactTypes.includes(type)} onChange={() => toggleImpact(type)} className="rounded" style={{ accentColor: "#E8973A" }} />
                      {type}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Root Cause</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
                  placeholder="What caused this issue?"
                  value={form.rootCause}
                  onChange={(e) => setForm({ ...form, rootCause: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Target Resolution Date</label>
                  <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Resolution Owner</label>
                  <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" value={form.ownerId} onChange={e => setForm({ ...form, ownerId: e.target.value })}>
                    <option value="">Select owner</option>
                    {staffList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Actions Being Taken</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none"
                  rows={2}
                  placeholder="What actions are being taken?"
                  value={form.actions}
                  onChange={(e) => setForm({ ...form, actions: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={form.anonymous}
                  onChange={(e) => setForm({ ...form, anonymous: e.target.checked })}
                />
                Submit anonymously
              </label>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!form.title.trim()}
                className="px-4 py-2 text-sm text-white rounded-xl disabled:opacity-50"
                style={{ backgroundColor: "#E8973A" }}
              >
                Submit Issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
