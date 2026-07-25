import { useState, type ReactNode } from "react";
import { CheckCircle, XCircle, Clock, Search, MessageSquare, ChevronDown, AlertTriangle } from "lucide-react";

type ProcApprovalType = "Material Request" | "Purchase Request" | "Purchase Order" | "Supplier Onboarding";
type ApprovalStatus = "pending" | "approved" | "rejected";

interface ProcApproval {
  id: string; type: ProcApprovalType; title: string; project: string;
  requestedBy: string; date: string; amount?: number; status: ApprovalStatus;
  urgency: "normal" | "urgent"; description: string;
}

const approvals: ProcApproval[] = [
  { id: "pr1", type: "Material Request",    title: "Structural Steel I-Beams — 150 tonnes",      project: "Downtown Office Complex",  requestedBy: "Site Supervisor",     date: "2026-04-09", amount: 185000, status: "pending",  urgency: "urgent", description: "Critical for Phase 2 structural framing scheduled April 16. Site works will halt without this delivery." },
  { id: "pr2", type: "Purchase Request",    title: "Tower Crane Rental Extension — 3 Months",     project: "Riverside Residential",    requestedBy: "Project Manager",     date: "2026-04-09", amount: 270000, status: "pending",  urgency: "urgent", description: "Crane lease expires April 12. Extension needed through July to complete structural floor pours on schedule." },
  { id: "pr3", type: "Purchase Order",      title: "Electrical Cable Bundle — Phase 2",           project: "Highway Interchange",      requestedBy: "Procurement Officer", date: "2026-04-08", amount: 58000,  status: "pending",  urgency: "normal", description: "Phase 2 electrical works start April 20. PO covers LV cable, conduit, and trunking from approved supplier." },
  { id: "pr4", type: "Supplier Onboarding", title: "SteelMart Nigeria Ltd — New Vendor",          project: "—",                        requestedBy: "Procurement Lead",    date: "2026-04-07",               status: "pending",  urgency: "normal", description: "SteelMart passed vendor evaluation. Proposed for primary steel supply. CAC docs and tax clearance attached." },
  { id: "pr5", type: "Material Request",    title: "Ceramic Floor Tiles — 5,000 sqm",            project: "Shopping Mall Renovation", requestedBy: "Interior Contractor", date: "2026-04-06", amount: 93000,  status: "approved", urgency: "normal", description: "Interior fit-out materials. Approved — within budget. Delivery scheduled April 18." },
  { id: "pr6", type: "Purchase Order",      title: "Concrete Mixer — 2 Units",                   project: "Industrial Warehouse",     requestedBy: "Equipment Manager",   date: "2026-04-05", amount: 145000, status: "rejected", urgency: "normal", description: "Rejected — rental of equivalent capacity equipment is $28K per month, preferred over capital purchase at this stage." },
  { id: "pr7", type: "Purchase Request",    title: "Safety Harnesses & PPE — 50 Sets",           project: "All Sites",                requestedBy: "HSE Officer",         date: "2026-04-04", amount: 18500,  status: "approved", urgency: "normal", description: "Routine PPE replenishment across all active sites. ISO 45001 compliance requirement." },
];

const statusConfig: Record<ApprovalStatus, { icon: ReactNode; badge: string; label: string }> = {
  pending:  { icon: <Clock className="w-4 h-4 text-amber-500" />,        badge: "bg-amber-100 text-amber-700",  label: "Pending"  },
  approved: { icon: <CheckCircle className="w-4 h-4 text-green-500" />,  badge: "bg-green-100 text-green-700",  label: "Approved" },
  rejected: { icon: <XCircle className="w-4 h-4 text-red-500" />,        badge: "bg-red-100 text-red-700",      label: "Rejected" },
};

const typeColors: Record<ProcApprovalType, string> = {
  "Material Request":    "bg-blue-50 text-blue-700",
  "Purchase Request":    "bg-purple-50 text-purple-700",
  "Purchase Order":      "bg-orange-50 text-orange-700",
  "Supplier Onboarding": "bg-teal-50 text-teal-700",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${(n / 1000).toFixed(0)}K`;
}

export function ProcurementApprovalsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ProcApprovalType | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [approvalStates, setApprovalStates] = useState<Record<string, ApprovalStatus>>({});
  const [requestInfoFor, setRequestInfoFor] = useState<string | null>(null);
  const [infoNote, setInfoNote] = useState("");
  const [sentInfoFor, setSentInfoFor] = useState<Set<string>>(new Set());

  function getStatus(a: ProcApproval): ApprovalStatus {
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
          <p className="text-sm text-gray-500 mt-0.5">Review material requests, purchase orders, and supplier onboarding</p>
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
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${statusFilter === s ? "border-blue-700 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
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
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as ProcApprovalType | "all")}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All Types</option>
          {(["Material Request", "Purchase Request", "Purchase Order", "Supplier Onboarding"] as const).map(t => (
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
                    <span>📁 {a.project}</span>
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
                        placeholder="e.g. Please attach supplier quotes and delivery lead time…"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => sendInfoRequest(a.id)} disabled={!infoNote.trim()}
                          className="px-3 py-1.5 bg-blue-700 text-white text-xs rounded-md font-medium hover:bg-blue-800 disabled:opacity-40">
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
