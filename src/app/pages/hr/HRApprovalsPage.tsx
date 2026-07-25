import { useState, type ReactNode } from "react";
import { CheckCircle, XCircle, Clock, Search, MessageSquare, ChevronDown, AlertTriangle } from "lucide-react";

type HRApprovalType = "Leave Request" | "Overtime Request" | "Salary Adjustment" | "Position Change";
type ApprovalStatus = "pending" | "approved" | "rejected";

interface HRApproval {
  id: string; type: HRApprovalType; title: string; project: string;
  requestedBy: string; date: string; amount?: number; status: ApprovalStatus;
  urgency: "normal" | "urgent"; description: string;
}

const approvals: HRApproval[] = [
  { id: "hr1", type: "Leave Request",      title: "Annual Leave — 14 Days (Chinwe Obi)",            project: "Finance Dept",       requestedBy: "Chinwe Obi",        date: "2026-04-09",              status: "pending",  urgency: "normal", description: "Annual leave: 21 Apr – 7 May 2026. Leave balance is 18 days. No critical Finance deadlines in this period." },
  { id: "hr2", type: "Overtime Request",   title: "Weekend Overtime — Site Crew (Week 15)",          project: "Construction Dept",  requestedBy: "Robert Lee",        date: "2026-04-09", amount: 42000,  status: "pending",  urgency: "urgent", description: "40 crew members, 2 days overtime to recover 3-week schedule slip. Supervisor approval already granted." },
  { id: "hr3", type: "Salary Adjustment",  title: "Q1 Performance Increment — 12 Staff",            project: "All Departments",    requestedBy: "HR Manager",        date: "2026-04-08", amount: 960000, status: "pending",  urgency: "normal", description: "Annual merit increase for 12 employees rated Outstanding in Q1 review. Average increment: 8%. Band-checks completed." },
  { id: "hr4", type: "Position Change",    title: "Senior → Lead Engineer (James Adeyemi)",         project: "Engineering Dept",   requestedBy: "Engineering HOD",   date: "2026-04-07",              status: "pending",  urgency: "normal", description: "James completed 3-year tenure as Senior Engineer and meets all competency requirements for Lead Engineer role." },
  { id: "hr5", type: "Leave Request",      title: "Sick Leave — 5 Days (Amaka Eze)",                project: "Procurement Dept",   requestedBy: "Amaka Eze",         date: "2026-04-06",              status: "approved", urgency: "normal", description: "Certified medical leave, 7–11 April 2026. Medical certificate attached. Leave balance: 12 days remaining." },
  { id: "hr6", type: "Overtime Request",   title: "Payroll Team — Month-End Closing OT",            project: "HR Dept",            requestedBy: "Payroll Team Lead", date: "2026-04-05", amount: 28000,  status: "approved", urgency: "normal", description: "3 payroll staff to work evenings April 14–16 for month-end payroll processing and reconciliation." },
  { id: "hr7", type: "Salary Adjustment",  title: "Probation Completion Uplift — 4 Employees",     project: "Various Departments", requestedBy: "HR Manager",        date: "2026-04-04", amount: 210000, status: "rejected", urgency: "normal", description: "Rejected — two of the four employees are still under active performance improvement plans. Resubmit after Q2 review." },
];

const statusConfig: Record<ApprovalStatus, { icon: ReactNode; badge: string; label: string }> = {
  pending:  { icon: <Clock className="w-4 h-4 text-amber-500" />,        badge: "bg-amber-100 text-amber-700",  label: "Pending"  },
  approved: { icon: <CheckCircle className="w-4 h-4 text-green-500" />,  badge: "bg-green-100 text-green-700",  label: "Approved" },
  rejected: { icon: <XCircle className="w-4 h-4 text-red-500" />,        badge: "bg-red-100 text-red-700",      label: "Rejected" },
};

const typeColors: Record<HRApprovalType, string> = {
  "Leave Request":    "bg-green-50 text-green-700",
  "Overtime Request": "bg-amber-50 text-amber-700",
  "Salary Adjustment":"bg-purple-50 text-purple-700",
  "Position Change":  "bg-blue-50 text-blue-700",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${(n / 1000).toFixed(0)}K`;
}

export function HRApprovalsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<HRApprovalType | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [approvalStates, setApprovalStates] = useState<Record<string, ApprovalStatus>>({});
  const [requestInfoFor, setRequestInfoFor] = useState<string | null>(null);
  const [infoNote, setInfoNote] = useState("");
  const [sentInfoFor, setSentInfoFor] = useState<Set<string>>(new Set());

  function getStatus(a: HRApproval): ApprovalStatus {
    return approvalStates[a.id] ?? a.status;
  }
  function approve(id: string) { setApprovalStates(s => ({ ...s, [id]: "approved" })); }
  function reject(id: string)  { setApprovalStates(s => ({ ...s, [id]: "rejected" })); }
  function sendInfoRequest(id: string) {
    if (!infoNote.trim()) return;
    setSentInfoFor(prev => new Set(prev).add(id));
    setRequestInfoFor(null);
    setInfoNote("");
  }

  const filtered = approvals.filter(a => {
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.project.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && getStatus(a) !== statusFilter) return false;
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    return true;
  });

  const counts = {
    all:      approvals.length,
    pending:  approvals.filter(a => getStatus(a) === "pending").length,
    approved: approvals.filter(a => getStatus(a) === "approved").length,
    rejected: approvals.filter(a => getStatus(a) === "rejected").length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Approvals</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage leave, overtime, salary adjustments, and position changes</p>
        </div>
        {counts.pending > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">{counts.pending} pending approval{counts.pending !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["all", "pending", "approved", "rejected"] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${statusFilter === s ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            {s} <span className="ml-1 text-xs text-gray-400">({counts[s]})</span>
          </button>
        ))}
      </div>

      {/* Search + type filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search approvals…"
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as HRApprovalType | "all")}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="all">All Types</option>
          {(["Leave Request", "Overtime Request", "Salary Adjustment", "Position Change"] as const).map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Approval cards */}
      <div className="space-y-3">
        {filtered.map(a => {
          const status = getStatus(a);
          const sc = statusConfig[status];
          const isPending = status === "pending";
          const isExpanded = expandedId === a.id;
          return (
            <div key={a.id} className={`bg-white rounded-lg border transition-all ${a.urgency === "urgent" && isPending ? "border-amber-300" : "border-gray-200"}`}>
              <div className="flex items-start gap-4 p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : a.id)}>
                <div className="mt-0.5 flex-shrink-0">{sc.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm font-semibold text-gray-900">{a.title}</h3>
                    {a.urgency === "urgent" && isPending && (
                      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">Urgent</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded font-medium ${typeColors[a.type]}`}>{a.type}</span>
                    <span>🏢 {a.project}</span>
                    <span>👤 {a.requestedBy}</span>
                    <span>📅 {a.date}</span>
                    {a.amount !== undefined && <span className="font-medium text-gray-700">{fmt(a.amount)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${sc.badge}`}>{sc.label}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                  <p className="text-sm text-gray-600 mt-3 mb-4">{a.description}</p>
                  {isPending && (
                    <div className="flex items-center gap-3">
                      <button onClick={e => { e.stopPropagation(); approve(a.id); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700">
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={e => { e.stopPropagation(); reject(a.id); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                      {sentInfoFor.has(a.id) ? (
                        <span className="flex items-center gap-1.5 text-xs text-teal-700 bg-teal-50 border border-teal-200 px-3 py-2 rounded-md font-medium">
                          <MessageSquare className="w-3.5 h-3.5" /> Info requested
                        </span>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); setRequestInfoFor(requestInfoFor === a.id ? null : a.id); setInfoNote(""); }}
                          className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                          <MessageSquare className="w-3.5 h-3.5" /> Request Info
                        </button>
                      )}
                    </div>
                  )}
                  {isPending && requestInfoFor === a.id && (
                    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2" onClick={e => e.stopPropagation()}>
                      <p className="text-xs font-medium text-gray-600">What information do you need from the requester?</p>
                      <textarea value={infoNote} onChange={e => setInfoNote(e.target.value)} rows={2}
                        placeholder="e.g. Please provide supporting documentation or manager sign-off…"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => sendInfoRequest(a.id)} disabled={!infoNote.trim()}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-md font-medium hover:bg-indigo-700 disabled:opacity-40">
                          Send Request
                        </button>
                        <button onClick={e => { e.stopPropagation(); setRequestInfoFor(null); setInfoNote(""); }}
                          className="px-3 py-1.5 border border-gray-300 text-xs rounded-md text-gray-600 hover:bg-gray-50">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {!isPending && <p className="text-xs text-gray-400">This request has been {status}.</p>}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-16 text-center bg-white rounded-lg border border-gray-200">
            <CheckCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No approvals match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
