import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Eye, Search } from "lucide-react";
import {
  getConstructionApprovals,
  updateConstructionApproval,
  ConstructionApproval as ApiApproval,
} from "../../api/construction-extras";

type ApprovalType = "Material Request" | "Transfer" | "Return";
type ApprovalStatus = "Pending" | "Approved" | "Rejected";

interface ApprovalItem {
  id: string;
  type: ApprovalType;
  reference: string;
  description: string;
  requestedBy: string;
  requestDate: string;
  status: ApprovalStatus;
  approvedBy: string;
  approvalDate: string;
  details: Record<string, string>;
}

const TYPE_STYLE: Record<ApprovalType, string> = {
  "Material Request": "bg-blue-50 text-blue-700",
  Transfer: "bg-purple-50 text-purple-700",
  Return: "bg-yellow-50 text-yellow-700",
};

const STATUS_STYLE: Record<ApprovalStatus, string> = {
  Pending: "bg-yellow-50 text-yellow-700",
  Approved: "bg-green-50 text-green-700",
  Rejected: "bg-red-50 text-red-700",
};

// MOCK removed — data now from API

function fromApi(a: ApiApproval): ApprovalItem {
  return {
    id: a.id,
    type: a.type as ApprovalType,
    reference: a.reference,
    description: a.description ?? "",
    requestedBy: a.requestedBy ?? "",
    requestDate: a.requestDate,
    status: a.status as ApprovalStatus,
    approvedBy: a.reviewedBy ?? "",
    approvalDate: a.reviewedAt ?? "",
    details: { Notes: a.notes ?? "" },
  };
}

export function StorefrontApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ApprovalType | "All">("All");
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "All">(
    "Pending",
  );
  const [selected, setSelected] = useState<ApprovalItem | null>(null);

  useEffect(() => {
    getConstructionApprovals()
      .then((data) => setItems(data.map(fromApi)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch =
      a.reference.toLowerCase().includes(q) ||
      a.requestedBy.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q);
    const matchType = typeFilter === "All" || a.type === typeFilter;
    const matchStatus = statusFilter === "All" || a.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  async function approve(id: string) {
    try {
      const updated = await updateConstructionApproval(id, {
        status: "Approved",
        reviewedBy: "Store Manager",
      });
      setItems((prev) => prev.map((a) => (a.id === id ? fromApi(updated) : a)));
      setSelected(null);
    } catch (e) {
      console.error(e);
    }
  }

  async function reject(id: string) {
    try {
      const updated = await updateConstructionApproval(id, {
        status: "Rejected",
        reviewedBy: "Store Manager",
      });
      setItems((prev) => prev.map((a) => (a.id === id ? fromApi(updated) : a)));
      setSelected(null);
    } catch (e) {
      console.error(e);
    }
  }

  const pendingCount = items.filter((a) => a.status === "Pending").length;

  if (loading)
    return (
      <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
    );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Approvals</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Review and action material requests, transfers, and returns
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-sm px-3 py-1.5 rounded-xl font-medium">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Summary tabs */}
      <div className="flex items-center gap-3">
        {(["All", "Pending", "Approved", "Rejected"] as const).map((s) => {
          const count =
            s === "All"
              ? items.length
              : items.filter((a) => a.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 text-sm rounded-xl border font-medium ${statusFilter === s ? "bg-teal-700 text-white border-teal-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
            >
              {s}{" "}
              {count > 0 && (
                <span className="ml-1.5 bg-white/20 px-1.5 rounded-full text-xs">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Search reference, requester…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {(["All", "Material Request", "Transfer", "Return"] as const).map(
          (t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1.5 text-xs rounded-lg border font-medium ${typeFilter === t ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
            >
              {t}
            </button>
          ),
        )}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl px-6 py-12 text-center text-gray-400 text-sm">
            No approvals found.
          </div>
        )}
        {filtered.map((a) => (
          <div
            key={a.id}
            className="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLE[a.type]}`}
                >
                  {a.type}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  {a.reference}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {a.description}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Requested by{" "}
                <span className="text-gray-700 font-medium">
                  {a.requestedBy}
                </span>{" "}
                · {a.requestDate}
              </p>
              {a.approvedBy && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {a.status} by {a.approvedBy} on {a.approvalDate}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[a.status]}`}
              >
                {a.status}
              </span>
              {a.status === "Pending" && (
                <>
                  <button
                    onClick={() => approve(a.id)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => reject(a.id)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </>
              )}
              <button
                onClick={() => setSelected(a)}
                className="p-1.5 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-teal-50"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLE[selected.type]}`}
                  >
                    {selected.type}
                  </span>
                  <span className="text-xs font-mono text-gray-500">
                    {selected.reference}
                  </span>
                </div>
                <h2 className="text-base font-semibold text-gray-900 mt-1">
                  {selected.description}
                </h2>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-3">
              {Object.entries(selected.details).map(([k, v]) => (
                <div key={k} className="flex gap-4">
                  <span className="text-xs text-gray-400 w-36 flex-shrink-0 mt-0.5">
                    {k}
                  </span>
                  <span className="text-sm text-gray-800 font-medium">{v}</span>
                </div>
              ))}
              <div className="flex gap-4">
                <span className="text-xs text-gray-400 w-36 flex-shrink-0 mt-0.5">
                  Requested By
                </span>
                <span className="text-sm text-gray-800 font-medium">
                  {selected.requestedBy} · {selected.requestDate}
                </span>
              </div>
              {selected.approvedBy && (
                <div className="flex gap-4">
                  <span className="text-xs text-gray-400 w-36 flex-shrink-0 mt-0.5">
                    Actioned By
                  </span>
                  <span className="text-sm text-gray-800 font-medium">
                    {selected.approvedBy} on {selected.approvalDate}
                  </span>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
              {selected.status === "Pending" && (
                <>
                  <button
                    onClick={() => approve(selected.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-xl"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => reject(selected.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </>
              )}
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
