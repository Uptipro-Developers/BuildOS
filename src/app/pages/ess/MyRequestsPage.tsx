import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Clock, CheckCircle, XCircle, Search, ChevronDown, ChevronUp,
  Plus, Package, DollarSign, Calendar, MessageSquare, AlertTriangle, FileText, Download, Edit2,
} from "lucide-react";
import { exportCSV } from "../../utils/exportCSV";
import { ApprovalPipeline, type PipelineStep } from "../../components/ApprovalPipeline";

type ReqStatus = "pending" | "approved" | "rejected";
type ReqType =
  | "Material Request"
  | "Expense Request"
  | "Leave Request"
  | "Issue Report"
  | "Change Request";

// ─── Pipeline templates ───────────────────────────────────────────────────────

const PIPELINE_TEMPLATES: Record<ReqType, Array<{ label: string; actor: string }>> = {
  "Material Request": [
    { label: "Submitted",    actor: "Requestor"           },
    { label: "Line Manager", actor: "Line Manager"        },
    { label: "Procurement",  actor: "Procurement Officer" },
    { label: "Approved",     actor: "Department Head"     },
  ],
  "Expense Request": [
    { label: "Submitted",     actor: "Requestor"      },
    { label: "Line Manager",  actor: "Line Manager"   },
    { label: "Finance Check", actor: "Finance Officer" },
    { label: "Approved",      actor: "Finance Manager" },
  ],
  "Leave Request": [
    { label: "Submitted",    actor: "Employee"     },
    { label: "Line Manager", actor: "Line Manager" },
    { label: "HR Review",    actor: "HR Manager"   },
    { label: "Approved",     actor: "HR Dept"      },
  ],
  "Issue Report": [
    { label: "Reported",      actor: "Reporter"   },
    { label: "HR Received",   actor: "HR Dept"    },
    { label: "Investigating", actor: "HR Manager" },
    { label: "Resolved",      actor: "HR / Mgmt"  },
  ],
  "Change Request": [
    { label: "Submitted", actor: "Employee"   },
    { label: "HR Review", actor: "HR Dept"    },
    { label: "Sys Update",actor: "IT / Admin" },
    { label: "Confirmed", actor: "HR Manager" },
  ],
};

function computePipeline(req: Request): PipelineStep[] {
  const template   = PIPELINE_TEMPLATES[req.type] ?? PIPELINE_TEMPLATES["Material Request"];
  const history    = req.approvalHistory;
  const isApproved = req.status === "approved";
  return template.map((step, i): PipelineStep => {
    const h = history[i];
    if (h) {
      const s: PipelineStep["status"] = h.action === "Rejected" ? "rejected" : "completed";
      return { label: step.label, actor: h.actor !== "System" ? h.actor : step.actor, status: s, date: h.date.split(" ")[0], note: h.note };
    }
    if (isApproved)             return { label: step.label, actor: step.actor, status: "completed" };
    if (req.status === "rejected") return { label: step.label, actor: step.actor, status: "pending" };
    if (i === history.length)   return { label: step.label, actor: step.actor, status: "active" };
    return { label: step.label, actor: step.actor, status: "pending" };
  });
}

interface RequestItem { name: string; qty?: string; amount?: string; }
interface ApprovalHistoryEntry { actor: string; role: string; action: string; date: string; note?: string; }

interface Request {
  id: string; type: ReqType; title: string; project: string;
  date: string; status: ReqStatus; items: RequestItem[];
  comments?: string; approvalHistory: ApprovalHistoryEntry[];
}

// ─── Mock data (James Okafor's requests) ─────────────────────────────────────

const myRequests: Request[] = [
  {
    id: "REQ-0041", type: "Material Request", title: "Structural Steel I-beams",
    project: "Downtown Office Complex", date: "2026-04-09", status: "pending",
    items: [{ name: "Structural Steel I-beam (150mm)", qty: "200 metres" }, { name: "Bolts & Washers Set", qty: "50 sets" }],
    comments: "Needed for Phase 2 steel erection starting April 16. Please expedite.",
    approvalHistory: [{ actor: "System", role: "Auto", action: "Submitted", date: "2026-04-09 08:30" }],
  },
  {
    id: "REQ-0039", type: "Expense Request", title: "Site Transport — Week 14",
    project: "Downtown Office Complex", date: "2026-04-07", status: "approved",
    items: [{ name: "Fuel reimbursement", amount: "$120.00" }, { name: "Tolls", amount: "$18.50" }],
    comments: "",
    approvalHistory: [
      { actor: "System", role: "Auto", action: "Submitted", date: "2026-04-07 07:15" },
      { actor: "Michael Chen", role: "Senior PM", action: "Approved", date: "2026-04-07 14:30", note: "Transport costs verified against site logs." },
    ],
  },
  {
    id: "REQ-0037", type: "Material Request", title: "Portland Cement (200 bags)",
    project: "Riverside Residential", date: "2026-04-04", status: "approved",
    items: [{ name: "Ordinary Portland Cement (50kg)", qty: "200 bags" }],
    approvalHistory: [
      { actor: "System", role: "Auto", action: "Submitted", date: "2026-04-04 09:00" },
      { actor: "Sarah Johnson", role: "Project Manager", action: "Approved", date: "2026-04-04 11:45", note: "Stock verified low. Approved." },
    ],
  },
  {
    id: "REQ-0036", type: "Expense Request", title: "Safety Gear Replacement",
    project: "Downtown Office Complex", date: "2026-04-01", status: "rejected",
    items: [{ name: "Hard Hat (replacement)", amount: "$45.00" }, { name: "Safety Harness", amount: "$120.00" }],
    comments: "Existing gear damaged on site.",
    approvalHistory: [
      { actor: "System", role: "Auto", action: "Submitted", date: "2026-04-01 10:00" },
      { actor: "Michael Chen", role: "Senior PM", action: "Rejected", date: "2026-04-02 09:00", note: "Please re-submit with supplier quotes attached per procurement policy." },
    ],
  },
  // ── Pending Leave ──────────────────────────────────────────────────────────
  {
    id: "REQ-0042", type: "Leave Request", title: "Annual Leave — 5 days",
    project: "—", date: "2026-04-10", status: "pending",
    items: [{ name: "Annual Leave: April 14–18 (5 working days)" }],
    comments: "Prior notice given. All hand-overs complete.",
    approvalHistory: [
      { actor: "System",       role: "Auto",         action: "Submitted", date: "2026-04-10 08:00" },
      { actor: "Michael Chen", role: "Line Manager",  action: "Approved",  date: "2026-04-10 10:30", note: "Approved. Please ensure hand-over notes are shared." },
    ],
  },
  // ── Pending Issue Report ───────────────────────────────────────────────────
  {
    id: "ISS-0005", type: "Issue Report", title: "Unsafe scaffolding on Block C",
    project: "Downtown Office Complex", date: "2026-04-11", status: "pending",
    items: [{ name: "Safety Hazard — scaffolding poles improperly secured, Level 4 Block C" }],
    comments: "Immediate risk of collapse if not addressed. Please escalate.",
    approvalHistory: [
      { actor: "System",        role: "Auto", action: "Submitted", date: "2026-04-11 06:45" },
      { actor: "HR Department", role: "HR",   action: "Received",  date: "2026-04-11 08:30", note: "Logged. Assigning to safety manager for investigation." },
    ],
  },
  // ── Approved Leave ─────────────────────────────────────────────────────────
  {
    id: "REQ-0031", type: "Leave Request", title: "Sick Leave — 2 days",
    project: "—", date: "2026-03-22", status: "approved",
    items: [{ name: "Sick Leave: March 23–24 (2 days)" }],
    approvalHistory: [
      { actor: "System",        role: "Auto",         action: "Submitted", date: "2026-03-22 07:00" },
      { actor: "Michael Chen",  role: "Line Manager", action: "Approved",  date: "2026-03-22 09:00" },
      { actor: "Ngozi Okafor",  role: "HR Manager",   action: "Approved",  date: "2026-03-22 11:00" },
      { actor: "HR Department", role: "HR Dept",      action: "Approved",  date: "2026-03-22 12:00" },
    ],
  },
  // ── Approved Change Request ────────────────────────────────────────────────
  {
    id: "CHG-0003", type: "Change Request", title: "Bank Account Update",
    project: "—", date: "2026-03-15", status: "approved",
    items: [{ name: "Bank Details — account number change (verified by Finance)" }],
    approvalHistory: [
      { actor: "System",        role: "Auto",       action: "Submitted", date: "2026-03-15 09:00" },
      { actor: "HR Department", role: "HR",         action: "Approved",  date: "2026-03-15 11:00" },
      { actor: "IT Admin",      role: "Systems",    action: "Updated",   date: "2026-03-15 14:00", note: "Account updated in payroll system." },
      { actor: "Ngozi Okafor",  role: "HR Manager", action: "Confirmed", date: "2026-03-15 16:00" },
    ],
  },
  {
    id: "REQ-0033", type: "Material Request", title: "Plywood Formwork — 50 Sheets",
    project: "Downtown Office Complex", date: "2026-03-28", status: "approved",
    items: [{ name: "18mm Plywood Formwork Sheet", qty: "50 sheets" }],
    approvalHistory: [
      { actor: "System", role: "Auto", action: "Submitted", date: "2026-03-28 07:45" },
      { actor: "Michael Chen", role: "Senior PM", action: "Approved", date: "2026-03-28 13:00" },
    ],
  },
  {
    id: "REQ-0029", type: "Expense Request", title: "Site Catering — Team Briefing",
    project: "Downtown Office Complex", date: "2026-03-20", status: "approved",
    items: [{ name: "Catering for 24 people", amount: "$380.00" }],
    approvalHistory: [
      { actor: "System", role: "Auto", action: "Submitted", date: "2026-03-20 08:00" },
      { actor: "Michael Chen", role: "Senior PM", action: "Approved", date: "2026-03-20 15:00" },
    ],
  },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const statusConfig: Record<ReqStatus, { icon: React.ReactNode; badge: string; label: string }> = {
  pending:  { icon: <Clock        className="w-4 h-4 text-amber-500" />, badge: "bg-amber-100 text-amber-700",  label: "Pending"  },
  approved: { icon: <CheckCircle  className="w-4 h-4 text-green-500" />, badge: "bg-green-100 text-green-700",  label: "Approved" },
  rejected: { icon: <XCircle      className="w-4 h-4 text-red-500"   />, badge: "bg-red-100 text-red-700",     label: "Rejected" },
};

const typeConfig: Record<ReqType, { icon: React.ReactNode; badge: string }> = {
  "Material Request": { icon: <Package       className="w-3.5 h-3.5" />, badge: "bg-blue-50 text-blue-700"    },
  "Expense Request":  { icon: <DollarSign    className="w-3.5 h-3.5" />, badge: "bg-purple-50 text-purple-700" },
  "Leave Request":    { icon: <Calendar      className="w-3.5 h-3.5" />, badge: "bg-teal-50 text-teal-700"    },
  "Issue Report":     { icon: <AlertTriangle className="w-3.5 h-3.5" />, badge: "bg-orange-50 text-orange-700" },
  "Change Request":   { icon: <Edit2         className="w-3.5 h-3.5" />, badge: "bg-violet-50 text-violet-700" },
};

// ─── Main ──────────────────────────────────────────────────────────────────────

export function MyRequestsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReqStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ReqType | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = myRequests.filter(r => {
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchType = typeFilter === "all" || r.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const counts = {
    all: myRequests.length,
    pending:  myRequests.filter(r => r.status === "pending").length,
    approved: myRequests.filter(r => r.status === "approved").length,
    rejected: myRequests.filter(r => r.status === "rejected").length,
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track your requests and see live approval progress</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            const headers = ["Request ID", "Type", "Title", "Project", "Date", "Status", "Items"];
            const rows = filtered.map(r => [
              r.id, r.type, r.title, r.project, r.date, statusConfig[r.status].label,
              r.items.map(i => `${i.name}${i.qty ? ` (${i.qty})` : i.amount ? ` (${i.amount})` : ""}`).join("; "),
            ]);
            exportCSV("my-requests", headers, rows);
          }} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button onClick={() => navigate("/apps/ess/submit")}
            className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-teal-700">
            <Plus className="w-4 h-4" /> New Request
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["all", "pending", "approved", "rejected"] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${statusFilter === s ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {s} <span className="ml-1 text-xs text-gray-400">({counts[s as keyof typeof counts]})</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search requests…"
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-56" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as ReqType | "all")}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="all">All Types</option>
          <option value="Material Request">Material Request</option>
          <option value="Expense Request">Expense Request</option>
          <option value="Leave Request">Leave Request</option>
          <option value="Issue Report">Issue Report</option>
          <option value="Change Request">Change Request</option>
        </select>
      </div>

      {/* Request cards */}
      <div className="space-y-3">
        {filtered.map(r => {
          const pipeline    = computePipeline(r);
          const activeStep  = pipeline.find(s => s.status === "active");
          const pendingLeft = pipeline.filter(s => s.status === "pending").length;
          const sc = statusConfig[r.status];
          const tc = typeConfig[r.type];
          const isExpanded = expandedId === r.id;

          return (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Card header */}
              <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : r.id)}>
                <div className="flex-shrink-0">{sc.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-gray-400 font-mono">{r.id}</span>
                    <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium ${tc.badge}`}>
                      {tc.icon}{r.type}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.title}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
                    <span>{r.project}</span>
                    <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{r.date}</span>
                    {activeStep && (
                      <span className="flex items-center gap-1 text-amber-600 font-medium">
                        <Clock className="w-3 h-3" />
                        Awaiting {activeStep.actor}
                        {pendingLeft > 0 && <span className="text-gray-400 font-normal"> · {pendingLeft + 1} steps left</span>}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sc.badge}`}>{sc.label}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-5 bg-gray-50/50">

                  {/* Approval Pipeline */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Approval Flow</p>
                    <ApprovalPipeline steps={pipeline} />
                  </div>

                  {/* Re-submit banner for rejected */}
                  {r.status === "rejected" && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700">
                        This request was rejected. Review the feedback above and
                        <button onClick={() => navigate("/apps/ess/submit")} className="underline font-medium ml-1">re-submit a new request</button>.
                      </p>
                    </div>
                  )}

                  {/* Items */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Items / Details</p>
                    <div className="space-y-1.5">
                      {r.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            {tc.icon}
                            <span className="text-sm text-gray-800">{item.name}</span>
                          </div>
                          {(item.qty || item.amount) && (
                            <span className="text-sm font-medium text-gray-700">{item.qty ?? item.amount}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comments */}
                  {r.comments && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Comments</p>
                      <div className="flex items-start gap-2 bg-white border border-gray-200 rounded-lg px-4 py-3">
                        <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700">{r.comments}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-16 text-center bg-white rounded-xl border border-gray-200">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No requests found</p>
            <button onClick={() => navigate("/apps/ess/submit")} className="mt-3 text-teal-600 text-sm font-medium hover:text-teal-700">Submit a new request →</button>
          </div>
        )}
      </div>
    </div>
  );
}

