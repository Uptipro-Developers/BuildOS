import { useParams } from "react-router";
import { useState, useEffect } from "react";
import {
  GitCompare,
  Plus,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
} from "lucide-react";
import {
  getProjectById,
  changeRequests,
  fmtDate,
  fmtCurrency,
} from "./mockData";
import type { ChangeRequest } from "./types";
import { getCurrencySymbol } from "../../utils/generalSettings";
import { getAuthUserName } from "../../utils/useAuthUser";
import {
  listChangeRequests,
  createChangeRequest,
} from "../../api/change-requests";
import { useNumbering } from "../../stores/numberingStore";

const changeTypeColors: Record<string, string> = {
  Cost: "bg-red-100 text-red-700",
  Scope: "bg-blue-100 text-blue-700",
  Schedule: "bg-amber-100 text-amber-700",
  Design: "bg-purple-100 text-purple-700",
  Quality: "bg-green-100 text-green-700",
};

const statusColors: Record<string, string> = {
  Proposed: "bg-blue-100 text-blue-700",
  "Under Review": "bg-amber-100 text-amber-700",
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  Implemented: "bg-purple-100 text-purple-700",
  Closed: "bg-gray-100 text-gray-600",
};

const statusIcon: Record<string, React.ReactNode> = {
  Proposed: <FileText className="w-4 h-4 text-blue-500" />,
  "Under Review": <Clock className="w-4 h-4 text-amber-500" />,
  Approved: <CheckCircle className="w-4 h-4 text-green-500" />,
  Rejected: <XCircle className="w-4 h-4 text-red-500" />,
  Implemented: <GitCompare className="w-4 h-4 text-purple-500" />,
  Closed: <CheckCircle className="w-4 h-4 text-gray-400" />,
};

const emptyForm = {
  description: "",
  reason: "",
  changeTypes: [] as string[],
  raisedBy: "Current User",
  dateRaised: new Date().toISOString().split("T")[0],
  scopeImpact: "",
  scheduleImpactDays: 0,
  costImpact: 0,
  qualityImpact: "",
  stakeholderImpact: "",
  recommendedAction: "",
  status: "Proposed" as ChangeRequest["status"],
};

export function ChangeRequestsPage() {
  const { getNextId } = useNumbering();
  const { id } = useParams();
  const project = id ? getProjectById(id) : undefined;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCR, setSelectedCR] = useState<ChangeRequest | null>(null);
  const [crStates, setCrStates] = useState<Record<string, ChangeRequest>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const [projectCRs, setProjectCRs] = useState<ChangeRequest[]>(() =>
    id ? changeRequests.filter((cr) => cr.projectId === id) : [],
  );
  useEffect(() => {
    if (!id) return;
    let active = true;
    listChangeRequests(id)
      .then((data) => {
        if (active && data.length > 0) setProjectCRs(data);
      })
      .catch(() => {
        /* keep mock data on failure */
      });
    return () => {
      active = false;
    };
  }, [id]);

  function getCR(cr: ChangeRequest): ChangeRequest {
    return crStates[cr.id] ?? cr;
  }

  function updateCR(id: string, updates: Partial<ChangeRequest>) {
    setCrStates((s) => ({
      ...s,
      [id]: { ...getCR(changeRequests.find((c) => c.id === id)!), ...updates },
    }));
  }

  function nextCrNumber(): string {
    const nums = changeRequests
      .map((cr) => parseInt(cr.crNumber.replace("CR-", ""), 10))
      .filter((n) => !isNaN(n));
    const max = nums.length ? Math.max(...nums) : 0;
    return `CR-${String(max + 1).padStart(4, "0")}`;
  }

  function handleCreate() {
    if (!form.description.trim() || !id) return;
    const newCR: ChangeRequest = {
      id: getNextId("ChangeRequest"),
      projectId: id,
      crNumber: nextCrNumber(),
      dateRaised: form.dateRaised,
      raisedBy: form.raisedBy,
      changeTypes: form.changeTypes,
      description: form.description,
      reason: form.reason,
      summaryTaskId: "",
      taskId: "",
      scopeImpact: form.scopeImpact,
      scheduleImpactDays: form.scheduleImpactDays,
      costImpact: form.costImpact,
      qualityImpact: form.qualityImpact,
      stakeholderImpact: form.stakeholderImpact,
      recommendedAction: form.recommendedAction,
      status: form.status,
      approverId: null,
      approvedAt: null,
      approvalNotes: "",
    };
    const { id: _omit, ...payload } = newCR;
    createChangeRequest(payload)
      .then((saved) => setProjectCRs((prev) => [...prev, saved]))
      .catch(() => setProjectCRs((prev) => [...prev, newCR]));
    setShowCreateModal(false);
    setForm({ ...emptyForm });
  }

  function toggleChangeType(t: string) {
    setForm((f) => ({
      ...f,
      changeTypes: f.changeTypes.includes(t)
        ? f.changeTypes.filter((x) => x !== t)
        : [...f.changeTypes, t],
    }));
  }

  const filtered = projectCRs.filter((cr) => {
    const c = getCR(cr);
    if (
      search &&
      !c.description.toLowerCase().includes(search.toLowerCase()) &&
      !c.crNumber.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Change Requests
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {project ? `${project.name} — ` : ""}Formally log and approve
            project deviations
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white hover:opacity-90"
          style={{ backgroundColor: "#E8973A" }}
        >
          <Plus className="w-4 h-4" /> New CR
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search CRs…"
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 w-full"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
        >
          <option value="all">All Statuses</option>
          {[
            "Proposed",
            "Under Review",
            "Approved",
            "Rejected",
            "Implemented",
            "Closed",
          ].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                CR ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Impact Summary
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Approver
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Date
              </th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((cr) => {
              const c = getCR(cr);
              return (
                <tr
                  key={cr.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedCR(cr)}
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium text-gray-700">
                    {c.crNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {fmtDate(c.dateRaised)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.changeTypes.map((t) => (
                        <span
                          key={t}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${changeTypeColors[t] ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-900 max-w-[200px] truncate">
                    {c.description}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] truncate">
                    {c.scheduleImpactDays > 0 && `${c.scheduleImpactDays}d `}
                    {c.costImpact > 0 && `${fmtCurrency(c.costImpact)}`}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {statusIcon[c.status]}
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColors[c.status]}`}
                      >
                        {c.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.approverId || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {c.approvedAt ? fmtDate(c.approvedAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCR(cr);
                      }}
                      className="p-1 rounded hover:bg-gray-200 text-gray-400"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <GitCompare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No change requests found</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-gray-900">
                New Change Request
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Reason
                </label>
                <textarea
                  value={form.reason}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reason: e.target.value }))
                  }
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Change Types
                </label>
                <div className="flex flex-wrap gap-2">
                  {["Cost", "Scope", "Schedule", "Design", "Quality"].map(
                    (t) => (
                      <label
                        key={t}
                        className="flex items-center gap-1.5 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={form.changeTypes.includes(t)}
                          onChange={() => toggleChangeType(t)}
                          className="rounded border-gray-300"
                        />
                        {t}
                      </label>
                    ),
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Raised By
                  </label>
                  <input
                    value={form.raisedBy}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, raisedBy: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Date Raised
                  </label>
                  <input
                    type="date"
                    value={form.dateRaised}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, dateRaised: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Scope Impact
                </label>
                <textarea
                  value={form.scopeImpact}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, scopeImpact: e.target.value }))
                  }
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Schedule Impact (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.scheduleImpactDays}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        scheduleImpactDays: Math.max(
                          0,
                          parseInt(e.target.value) || 0,
                        ),
                      }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Cost Impact ({getCurrencySymbol()})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.costImpact}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        costImpact: Math.max(0, parseInt(e.target.value) || 0),
                      }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Quality Impact
                </label>
                <textarea
                  value={form.qualityImpact}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, qualityImpact: e.target.value }))
                  }
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Stakeholder Impact
                </label>
                <textarea
                  value={form.stakeholderImpact}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      stakeholderImpact: e.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Recommended Action
                </label>
                <textarea
                  value={form.recommendedAction}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      recommendedAction: e.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as ChangeRequest["status"],
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
                >
                  {[
                    "Proposed",
                    "Under Review",
                    "Approved",
                    "Rejected",
                    "Implemented",
                    "Closed",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.description.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#E8973A" }}
              >
                <Plus className="w-4 h-4" /> Create CR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedCR &&
        (() => {
          const c = getCR(selectedCR);
          const isUnderReview = c.status === "Under Review";
          return (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedCR(null)}
            >
              <div
                className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {c.crNumber}
                    </span>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Change Request
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedCR(null)}
                    className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                  >
                    &times;
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                        Date Raised
                      </p>
                      <p className="text-sm text-gray-900">
                        {fmtDate(c.dateRaised)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                        Raised By
                      </p>
                      <p className="text-sm text-gray-900">{c.raisedBy}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                        Change Types
                      </p>
                      <div className="flex gap-1.5 flex-wrap">
                        {c.changeTypes.map((t) => (
                          <span
                            key={t}
                            className={`text-xs px-2 py-0.5 rounded font-medium ${changeTypeColors[t] ?? "bg-gray-100 text-gray-600"}`}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                        Status
                      </p>
                      <div className="flex items-center gap-1.5">
                        {statusIcon[c.status]}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[c.status]}`}
                        >
                          {c.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Description
                    </p>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-100">
                      {c.description}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Reason
                    </p>
                    <p className="text-sm text-gray-700">{c.reason}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Affected Tasks
                    </p>
                    <p className="text-sm text-gray-700 font-mono">
                      {c.taskId || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Impact Assessment
                    </p>
                    <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                          Scope
                        </p>
                        <p className="text-sm text-gray-800 mt-0.5">
                          {c.scopeImpact || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                          Schedule
                        </p>
                        <p className="text-sm text-gray-800 mt-0.5">
                          {c.scheduleImpactDays > 0
                            ? `${c.scheduleImpactDays} days`
                            : "No impact"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                          Cost
                        </p>
                        <p className="text-sm text-gray-800 mt-0.5 font-medium">
                          {c.costImpact > 0
                            ? fmtCurrency(c.costImpact)
                            : "No impact"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                          Quality
                        </p>
                        <p className="text-sm text-gray-800 mt-0.5">
                          {c.qualityImpact || "—"}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                          Stakeholder
                        </p>
                        <p className="text-sm text-gray-800 mt-0.5">
                          {c.stakeholderImpact || "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Approval
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                          Approver
                        </p>
                        <p className="text-sm text-gray-800 mt-0.5">
                          {c.approverId || "Not assigned"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                          Approval Date
                        </p>
                        <p className="text-sm text-gray-800 mt-0.5">
                          {c.approvedAt ? fmtDate(c.approvedAt) : "—"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                        Notes
                      </p>
                      <p className="text-sm text-gray-700 mt-0.5">
                        {c.approvalNotes || "—"}
                      </p>
                    </div>

                    {isUnderReview && (
                      <div className="flex items-center gap-3 mt-4">
                        <button
                          onClick={() =>
                            updateCR(c.id, {
                              status: "Approved",
                              approverId: getAuthUserName() || "Current User",
                              approvedAt: new Date()
                                .toISOString()
                                .split("T")[0],
                              approvalNotes: "Approved",
                            })
                          }
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() =>
                            updateCR(c.id, {
                              status: "Rejected",
                              approverId: getAuthUserName() || "Current User",
                              approvedAt: new Date()
                                .toISOString()
                                .split("T")[0],
                              approvalNotes: "Rejected",
                            })
                          }
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
