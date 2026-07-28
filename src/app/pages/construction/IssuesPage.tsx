import { useParams } from "react-router";
import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Plus,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  getIssuesByProject,
  getProjectById,
  getTasksByProject,
  fmtDate,
} from "./mockData";
import type { Issue } from "./types";
import { listIssues, createIssue } from "../../api/construction-issues";
import { fetchEmployees } from "../../api/employees";
import { useNumbering } from "../../stores/numberingStore";

function daysOpen(dateRaised: string): number {
  return Math.max(
    0,
    Math.floor(
      (new Date().getTime() - new Date(dateRaised).getTime()) / 86400000,
    ),
  );
}

const impactColors: Record<string, string> = {
  Schedule: "bg-red-100 text-red-700",
  Cost: "bg-amber-100 text-amber-700",
  Scope: "bg-blue-100 text-blue-700",
  Quality: "bg-purple-100 text-purple-700",
  Safety: "bg-green-100 text-green-700",
};

const statusColors: Record<string, string> = {
  Open: "bg-red-100 text-red-700",
  "Under Investigation": "bg-amber-100 text-amber-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Escalated: "bg-purple-100 text-purple-700",
  Resolved: "bg-green-100 text-green-700",
  Closed: "bg-gray-100 text-gray-600",
};

const statusIcon: Record<string, React.ReactNode> = {
  Open: <XCircle className="w-4 h-4 text-red-500" />,
  "Under Investigation": <Loader2 className="w-4 h-4 text-amber-500" />,
  "In Progress": <Loader2 className="w-4 h-4 text-blue-500" />,
  Escalated: <AlertTriangle className="w-4 h-4 text-purple-500" />,
  Resolved: <CheckCircle className="w-4 h-4 text-green-500" />,
  Closed: <CheckCircle className="w-4 h-4 text-gray-400" />,
};

const statusTimeline = [
  "Open",
  "Under Investigation",
  "In Progress",
  "Escalated",
  "Resolved",
  "Closed",
];

const impactOptions = ["Schedule", "Cost", "Scope", "Quality", "Safety"];

const emptyForm = {
  title: "",
  description: "",
  taskId: "",
  impactTypes: [] as string[],
  rootCause: "",
  targetDate: "",
  actions: "",
  ownerId: "",
  status: "Open" as Issue["status"],
};

export function IssuesPage() {
  const { getNextId } = useNumbering();
  const { id } = useParams();
  const project = id ? getProjectById(id) : undefined;
  const [issues, setIssues] = useState<Issue[]>(() =>
    id ? getIssuesByProject(id) : [],
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [staffList, setStaffList] = useState<string[]>([]);

  // Load employees for the owner dropdown.
  useEffect(() => {
    let active = true;
    fetchEmployees({ status: "active" })
      .then((employees) => {
        if (!active) return;
        setStaffList(
          employees
            .map((e) => `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim())
            .filter(Boolean),
        );
      })
      .catch(() => {
        /* leave dropdown empty on failure */
      });
    return () => {
      active = false;
    };
  }, []);

  // Load issues from the backend, falling back to mock data when the API is
  // unavailable or returns no records for this project.
  useEffect(() => {
    if (!id) return;
    let active = true;
    listIssues(id)
      .then((data) => {
        if (active && data.length > 0) setIssues(data);
      })
      .catch(() => {
        /* keep mock data on failure */
      });
    return () => {
      active = false;
    };
  }, [id]);

  const filtered = issues.filter((i) => {
    if (
      search &&
      !i.title.toLowerCase().includes(search.toLowerCase()) &&
      !i.issueNumber.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    return true;
  });

  const workPackages = id
    ? getTasksByProject(id).filter((t) => t.level === 4)
    : [];

  function toggleImpact(type: string) {
    setForm((prev) => ({
      ...prev,
      impactTypes: prev.impactTypes.includes(type)
        ? prev.impactTypes.filter((t) => t !== type)
        : [...prev.impactTypes, type],
    }));
  }

  async function handleLogIssue() {
    if (!form.title.trim()) return;
    const newIssue: Issue = {
      id: getNextId("Issue"),
      projectId: id!,
      issueNumber: `ISS-${String(issues.length + 1043).padStart(4, "0")}`,
      dateRaised: new Date().toISOString().slice(0, 10),
      raisedBy: "Emeka Okafor",
      title: form.title,
      description: form.description,
      taskId: form.taskId,
      impactTypes: form.impactTypes,
      rootCause: form.rootCause,
      targetDate: form.targetDate,
      actions: form.actions,
      ownerId: form.ownerId,
      status: form.status,
      resolutionNotes: "",
      closedAt: null,
    };
    try {
      const { id: _omit, ...payload } = newIssue;
      const saved = await createIssue(payload);
      setIssues((prev) => [...prev, saved]);
    } catch {
      setIssues((prev) => [...prev, newIssue]);
    }
    setShowLogModal(false);
    setForm(emptyForm);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Issues</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {project ? `${project.name} — ` : ""}Log and track project issues
          </p>
        </div>
        <button
          onClick={() => setShowLogModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white hover:opacity-90"
          style={{ backgroundColor: "#E8973A" }}
        >
          <Plus className="w-4 h-4" /> Log Issue
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or ID…"
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 w-full"
            style={{ ["--tw-ring-color" as any]: "#E8973A" }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
        >
          <option value="all">All Statuses</option>
          {statusTimeline.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Issue ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Impact
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Owner
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Target Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Days Open
              </th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((issue) => (
              <tr
                key={issue.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedIssue(issue)}
              >
                <td className="px-4 py-3 font-mono text-xs font-medium text-gray-700">
                  {issue.issueNumber}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {fmtDate(issue.dateRaised)}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900 max-w-[220px] truncate">
                  {issue.title}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {issue.impactTypes.map((t) => (
                      <span
                        key={t}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${impactColors[t] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {statusIcon[issue.status]}
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColors[issue.status]}`}
                    >
                      {issue.status}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {issue.ownerId}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {issue.targetDate ? fmtDate(issue.targetDate) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-mono font-medium ${daysOpen(issue.dateRaised) > 14 ? "text-red-600" : daysOpen(issue.dateRaised) > 7 ? "text-amber-600" : "text-gray-600"}`}
                  >
                    {daysOpen(issue.dateRaised)} days
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIssue(issue);
                    }}
                    className="p-1 rounded hover:bg-gray-200 text-gray-400"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No issues found</p>
          </div>
        )}
      </div>

      {/* Log Issue Modal */}
      {showLogModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowLogModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-gray-900">Log Issue</h2>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2"
                  placeholder="Brief title of the issue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 resize-none"
                  placeholder="Describe the issue in detail"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Package Affected
                </label>
                <select
                  value={form.taskId}
                  onChange={(e) => setForm({ ...form, taskId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2"
                >
                  <option value="">Select work package</option>
                  {workPackages.map((wp) => (
                    <option key={wp.id} value={wp.id}>
                      {wp.name} ({wp.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Impact Type
                </label>
                <div className="flex flex-wrap gap-3">
                  {impactOptions.map((t) => (
                    <label
                      key={t}
                      className="flex items-center gap-1.5 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.impactTypes.includes(t)}
                        onChange={() => toggleImpact(t)}
                        className="rounded"
                        style={{ accentColor: "#E8973A" }}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Root Cause
                </label>
                <input
                  type="text"
                  value={form.rootCause}
                  onChange={(e) =>
                    setForm({ ...form, rootCause: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2"
                  placeholder="What caused the issue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Resolution Date
                </label>
                <input
                  type="date"
                  value={form.targetDate}
                  onChange={(e) =>
                    setForm({ ...form, targetDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actions Being Taken
                </label>
                <textarea
                  value={form.actions}
                  onChange={(e) =>
                    setForm({ ...form, actions: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 resize-none"
                  placeholder="Describe the actions being taken to resolve this issue"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resolution Owner
                  </label>
                  <select
                    value={form.ownerId}
                    onChange={(e) =>
                      setForm({ ...form, ownerId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2"
                  >
                    <option value="">Select owner</option>
                    {staffList.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as Issue["status"],
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2"
                  >
                    {statusTimeline.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowLogModal(false);
                  setForm(emptyForm);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogIssue}
                className="px-4 py-2 rounded-md text-sm font-medium text-white hover:opacity-90"
                style={{ backgroundColor: "#E8973A" }}
              >
                Log Issue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedIssue && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedIssue(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {selectedIssue.issueNumber}
                </span>
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedIssue.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
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
                    {fmtDate(selectedIssue.dateRaised)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    Raised By
                  </p>
                  <p className="text-sm text-gray-900">
                    {selectedIssue.raisedBy}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    Work Package
                  </p>
                  <p className="text-sm text-gray-900 font-mono">
                    {selectedIssue.taskId}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    Target Date
                  </p>
                  <p className="text-sm text-gray-900">
                    {selectedIssue.targetDate
                      ? fmtDate(selectedIssue.targetDate)
                      : "—"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Description
                </p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-100">
                  {selectedIssue.description}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Impact Types
                  </p>
                  <div className="flex gap-1.5">
                    {selectedIssue.impactTypes.map((t) => (
                      <span
                        key={t}
                        className={`text-xs px-2 py-0.5 rounded font-medium ${impactColors[t] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Status
                  </p>
                  <div className="flex items-center gap-1.5">
                    {statusIcon[selectedIssue.status]}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[selectedIssue.status]}`}
                    >
                      {selectedIssue.status}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Root Cause
                </p>
                <p className="text-sm text-gray-700">
                  {selectedIssue.rootCause || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Actions Taken
                </p>
                <p className="text-sm text-gray-700">
                  {selectedIssue.actions || "—"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    Resolution Owner
                  </p>
                  <p className="text-sm text-gray-900">
                    {selectedIssue.ownerId}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    Days Open
                  </p>
                  <p
                    className={`text-sm font-mono font-medium ${daysOpen(selectedIssue.dateRaised) > 14 ? "text-red-600" : daysOpen(selectedIssue.dateRaised) > 7 ? "text-amber-600" : "text-gray-900"}`}
                  >
                    {daysOpen(selectedIssue.dateRaised)} days
                  </p>
                </div>
              </div>

              {selectedIssue.status === "Resolved" ||
              selectedIssue.status === "Closed" ? (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Resolution Notes
                  </p>
                  <p className="text-sm text-gray-700 bg-green-50 rounded-lg p-3 border border-green-100">
                    {selectedIssue.resolutionNotes || "—"}
                  </p>
                  {selectedIssue.closedAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      Closed on {fmtDate(selectedIssue.closedAt)}
                    </p>
                  )}
                </div>
              ) : null}

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Status Timeline
                </p>
                <div className="flex items-center gap-0">
                  {statusTimeline.map((s, i) => {
                    const currentIdx = statusTimeline.indexOf(
                      selectedIssue.status,
                    );
                    const isReached = i <= currentIdx;
                    const isCurrent = i === currentIdx;
                    return (
                      <div key={s} className="flex items-center flex-1">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isReached ? "text-white" : "text-gray-400 bg-gray-200"} ${isCurrent ? "ring-2 ring-offset-1" : ""}`}
                            style={{
                              backgroundColor: isReached
                                ? "#E8973A"
                                : undefined,
                            }}
                          >
                            {i + 1}
                          </div>
                          <span
                            className={`text-[9px] mt-1 text-center leading-tight max-w-[60px] ${isCurrent ? "font-bold text-gray-900" : isReached ? "text-gray-600" : "text-gray-400"}`}
                          >
                            {s}
                          </span>
                        </div>
                        {i < statusTimeline.length - 1 && (
                          <div
                            className={`flex-1 h-0.5 mx-1 ${i < currentIdx ? "bg-amber-500" : "bg-gray-200"}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
