import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { getPurchaseRequests } from "../../api/procurement-requests";
import { getMaterialRequests } from "../../api/materials";
import { fetchExpenses } from "../../api/expenses";
import { fetchLeaveRequests } from "../../api/leave-requests";
import { useAuthUser } from "../../utils/useAuthUser";
import {
  Clock,
  CheckCircle,
  XCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Plus,
  Package,
  DollarSign,
  Calendar,
  MessageSquare,
  AlertTriangle,
  FileText,
  Download,
  Edit2,
} from "lucide-react";
import { exportCSV } from "../../utils/exportCSV";
import {
  ApprovalPipeline,
  type PipelineStep,
} from "../../components/ApprovalPipeline";

type ReqStatus = "pending" | "approved" | "rejected";
type ReqType =
  | "Material Request"
  | "Expense Request"
  | "Leave Request"
  | "Issue Report"
  | "Change Request";

// ─── Pipeline templates ───────────────────────────────────────────────────────

const PIPELINE_TEMPLATES: Record<
  ReqType,
  Array<{ label: string; actor: string }>
> = {
  "Material Request": [
    { label: "Submitted", actor: "Requestor" },
    { label: "Line Manager", actor: "Line Manager" },
    { label: "Procurement", actor: "Procurement Officer" },
    { label: "Approved", actor: "Department Head" },
  ],
  "Expense Request": [
    { label: "Submitted", actor: "Requestor" },
    { label: "Line Manager", actor: "Line Manager" },
    { label: "Finance Check", actor: "Finance Officer" },
    { label: "Approved", actor: "Finance Manager" },
  ],
  "Leave Request": [
    { label: "Submitted", actor: "Employee" },
    { label: "Line Manager", actor: "Line Manager" },
    { label: "HR Review", actor: "HR Manager" },
    { label: "Approved", actor: "HR Dept" },
  ],
  "Issue Report": [
    { label: "Reported", actor: "Reporter" },
    { label: "HR Received", actor: "HR Dept" },
    { label: "Investigating", actor: "HR Manager" },
    { label: "Resolved", actor: "HR / Mgmt" },
  ],
  "Change Request": [
    { label: "Submitted", actor: "Employee" },
    { label: "HR Review", actor: "HR Dept" },
    { label: "Sys Update", actor: "IT / Admin" },
    { label: "Confirmed", actor: "HR Manager" },
  ],
};

function computePipeline(req: Request): PipelineStep[] {
  const template =
    PIPELINE_TEMPLATES[req.type] ?? PIPELINE_TEMPLATES["Material Request"];
  const history = req.approvalHistory;
  const isApproved = req.status === "approved";
  return template.map((step, i): PipelineStep => {
    const h = history[i];
    if (h) {
      const s: PipelineStep["status"] =
        h.action === "Rejected" ? "rejected" : "completed";
      return {
        label: step.label,
        actor: h.actor !== "System" ? h.actor : step.actor,
        status: s,
        date: h.date.split(" ")[0],
        note: h.note,
      };
    }
    if (isApproved)
      return { label: step.label, actor: step.actor, status: "completed" };
    if (req.status === "rejected")
      return { label: step.label, actor: step.actor, status: "pending" };
    if (i === history.length)
      return { label: step.label, actor: step.actor, status: "active" };
    return { label: step.label, actor: step.actor, status: "pending" };
  });
}

interface RequestItem {
  name: string;
  qty?: string;
  amount?: string;
}
interface ApprovalHistoryEntry {
  actor: string;
  role: string;
  action: string;
  date: string;
  note?: string;
}

interface Request {
  id: string;
  type: ReqType;
  title: string;
  project: string;
  date: string;
  status: ReqStatus;
  items: RequestItem[];
  comments?: string;
  approvalHistory: ApprovalHistoryEntry[];
}

function toReqStatus(status: string | undefined): ReqStatus {
  const raw = (status ?? "").trim().toLowerCase();
  if (["approved", "approve", "completed", "done", "paid"].includes(raw)) {
    return "approved";
  }
  if (
    ["rejected", "reject", "declined", "cancelled", "canceled"].includes(raw)
  ) {
    return "rejected";
  }
  return "pending";
}

// ─── Config ───────────────────────────────────────────────────────────────────

const statusConfig: Record<
  ReqStatus,
  { icon: React.ReactNode; badge: string; label: string }
> = {
  pending: {
    icon: <Clock className="w-4 h-4 text-amber-500" />,
    badge: "bg-amber-100 text-amber-700",
    label: "Pending",
  },
  approved: {
    icon: <CheckCircle className="w-4 h-4 text-green-500" />,
    badge: "bg-green-100 text-green-700",
    label: "Approved",
  },
  rejected: {
    icon: <XCircle className="w-4 h-4 text-red-500" />,
    badge: "bg-red-100 text-red-700",
    label: "Rejected",
  },
};

const typeConfig: Record<ReqType, { icon: React.ReactNode; badge: string }> = {
  "Material Request": {
    icon: <Package className="w-3.5 h-3.5" />,
    badge: "bg-blue-50 text-blue-700",
  },
  "Expense Request": {
    icon: <DollarSign className="w-3.5 h-3.5" />,
    badge: "bg-purple-50 text-purple-700",
  },
  "Leave Request": {
    icon: <Calendar className="w-3.5 h-3.5" />,
    badge: "bg-teal-50 text-teal-700",
  },
  "Issue Report": {
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    badge: "bg-orange-50 text-orange-700",
  },
  "Change Request": {
    icon: <Edit2 className="w-3.5 h-3.5" />,
    badge: "bg-violet-50 text-violet-700",
  },
};

// ─── Main ──────────────────────────────────────────────────────────────────────

export function MyRequestsPage() {
  const navigate = useNavigate();
  const authUser = useAuthUser();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReqStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ReqType | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [myRequests, setMyRequests] = useState<Request[]>([]);

  useEffect(() => {
    Promise.allSettled([
      getPurchaseRequests(),
      getMaterialRequests(),
      fetchExpenses(),
      fetchLeaveRequests(),
    ])
      .then((results) => {
        const purchaseRequests =
          results[0].status === "fulfilled" && Array.isArray(results[0].value)
            ? results[0].value
            : [];
        const materialRequests =
          results[1].status === "fulfilled" && Array.isArray(results[1].value)
            ? results[1].value
            : [];
        const expenses =
          results[2].status === "fulfilled" && Array.isArray(results[2].value)
            ? results[2].value
            : [];
        const leaves =
          results[3].status === "fulfilled" && Array.isArray(results[3].value)
            ? results[3].value
            : [];

        const byKey = `${(authUser.name || authUser.email || "").trim().toLowerCase()}`;

        const mappedPurchase: Request[] = purchaseRequests.map((pr) => ({
          id: pr.prRef || pr.id,
          type: "Material Request",
          title: pr.title || "Purchase request",
          project: pr.projectName || "—",
          date: pr.createdAt?.slice(0, 10) || "",
          status: toReqStatus(pr.status),
          items: (pr.items || []).map((i: any) => ({
            name: i.name || i.description || String(i),
            qty: i.quantity != null ? String(i.quantity) : undefined,
          })),
          comments: pr.notes || "",
          approvalHistory: [],
        }));

        const mappedMaterial: Request[] = materialRequests
          .filter((mr) => {
            if (!byKey) return true;
            return (
              String(mr.requestedBy || "")
                .trim()
                .toLowerCase() === byKey
            );
          })
          .map((mr) => ({
            id: mr.reference || mr.id,
            type: "Material Request",
            title: mr.materialName || "Material request",
            project: mr.projectName || "—",
            date: mr.requestDate?.slice(0, 10) || "",
            status: toReqStatus(mr.status),
            items: [
              {
                name: mr.materialName || "Material",
                qty:
                  mr.qty != null
                    ? `${mr.qty} ${mr.unit || ""}`.trim()
                    : undefined,
              },
            ],
            comments: mr.purpose || mr.notes || "",
            approvalHistory: [],
          }));

        const mappedExpenses: Request[] = expenses
          .filter((exp: any) => {
            if (!byKey) return true;
            return (
              String(exp.createdBy || "")
                .trim()
                .toLowerCase() === byKey
            );
          })
          .map((exp: any) => ({
            id: exp.id,
            type: "Expense Request",
            title: exp.description || "Expense request",
            project: exp.project || "—",
            date: exp.date || "",
            status: toReqStatus(exp.status),
            items: [
              {
                name: exp.category || "Expense",
                amount: exp.amount != null ? String(exp.amount) : undefined,
              },
            ],
            comments: exp.description || "",
            approvalHistory: [],
          }));

        const mappedLeaves: Request[] = leaves
          .filter((lv: any) => {
            if (!byKey) return true;
            return String(lv.employee || "")
              .trim()
              .toLowerCase()
              .includes(byKey);
          })
          .map((lv: any) => ({
            id: lv.refId || lv.id,
            type: "Leave Request",
            title: lv.leaveType || "Leave request",
            project: lv.department || "HR",
            date: lv.submittedAt || lv.startDate || "",
            status: toReqStatus(lv.status),
            items: [
              {
                name: `${lv.startDate || ""} - ${lv.endDate || ""}`.trim(),
                qty: lv.days != null ? `${lv.days} day(s)` : undefined,
              },
            ],
            comments: lv.notes || "",
            approvalHistory: [],
          }));

        const merged = [
          ...mappedMaterial,
          ...mappedPurchase,
          ...mappedExpenses,
          ...mappedLeaves,
        ].sort((a, b) => b.date.localeCompare(a.date));

        setMyRequests(merged);
      })
      .catch(() => {
        setMyRequests([]);
      });
  }, [authUser.email, authUser.name]);

  const filtered = myRequests.filter((r) => {
    const matchSearch =
      !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchType = typeFilter === "all" || r.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const counts = {
    all: myRequests.length,
    pending: myRequests.filter((r) => r.status === "pending").length,
    approved: myRequests.filter((r) => r.status === "approved").length,
    rejected: myRequests.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track your requests and see live approval progress
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const headers = [
                "Request ID",
                "Type",
                "Title",
                "Project",
                "Date",
                "Status",
                "Items",
              ];
              const rows = filtered.map((r) => [
                r.id,
                r.type,
                r.title,
                r.project,
                r.date,
                statusConfig[r.status].label,
                r.items
                  .map(
                    (i) =>
                      `${i.name}${i.qty ? ` (${i.qty})` : i.amount ? ` (${i.amount})` : ""}`,
                  )
                  .join("; "),
              ]);
              exportCSV("my-requests", headers, rows);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={() => navigate("/apps/ess/submit")}
            className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-teal-700"
          >
            <Plus className="w-4 h-4" /> New Request
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["all", "pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${statusFilter === s ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            {s}{" "}
            <span className="ml-1 text-xs text-gray-400">
              ({counts[s as keyof typeof counts]})
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requests…"
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-56"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ReqType | "all")}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
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
        {filtered.map((r) => {
          const pipeline = computePipeline(r);
          const activeStep = pipeline.find((s) => s.status === "active");
          const pendingLeft = pipeline.filter(
            (s) => s.status === "pending",
          ).length;
          const sc = statusConfig[r.status];
          const tc = typeConfig[r.type];
          const isExpanded = expandedId === r.id;

          return (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Card header */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : r.id)}
              >
                <div className="flex-shrink-0">{sc.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-gray-400 font-mono">
                      {r.id}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium ${tc.badge}`}
                    >
                      {tc.icon}
                      {r.type}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {r.title}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
                    <span>{r.project}</span>
                    <span className="flex items-center gap-0.5">
                      <Calendar className="w-3 h-3" />
                      {r.date}
                    </span>
                    {activeStep && (
                      <span className="flex items-center gap-1 text-amber-600 font-medium">
                        <Clock className="w-3 h-3" />
                        Awaiting {activeStep.actor}
                        {pendingLeft > 0 && (
                          <span className="text-gray-400 font-normal">
                            {" "}
                            · {pendingLeft + 1} steps left
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${sc.badge}`}
                  >
                    {sc.label}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-5 bg-gray-50/50">
                  {/* Approval Pipeline */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      Approval Flow
                    </p>
                    <ApprovalPipeline steps={pipeline} />
                  </div>

                  {/* Re-submit banner for rejected */}
                  {r.status === "rejected" && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700">
                        This request was rejected. Review the feedback above and
                        <button
                          onClick={() => navigate("/apps/ess/submit")}
                          className="underline font-medium ml-1"
                        >
                          re-submit a new request
                        </button>
                        .
                      </p>
                    </div>
                  )}

                  {/* Items */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      Items / Details
                    </p>
                    <div className="space-y-1.5">
                      {r.items.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2.5"
                        >
                          <div className="flex items-center gap-2">
                            {tc.icon}
                            <span className="text-sm text-gray-800">
                              {item.name}
                            </span>
                          </div>
                          {(item.qty || item.amount) && (
                            <span className="text-sm font-medium text-gray-700">
                              {item.qty ?? item.amount}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comments */}
                  {r.comments && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Comments
                      </p>
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
            <p className="text-sm font-medium text-gray-500">
              No requests found
            </p>
            <button
              onClick={() => navigate("/apps/ess/submit")}
              className="mt-3 text-teal-600 text-sm font-medium hover:text-teal-700"
            >
              Submit a new request →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
