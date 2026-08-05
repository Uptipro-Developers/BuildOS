import { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  UserCheck,
  X,
  Timer,
  Calendar,
  Download,
} from "lucide-react";
import { exportCSV } from "../../utils/exportCSV";
import { fetchProjects } from "../../api/projects";
import { fetchEmployees } from "../../api/employees";

// ─── Types ───────────────────────────────────────────────────────────────────

type LogStatus = "pending" | "approved" | "rejected";

interface TimeLog {
  id: string;
  workerId: string;
  workerName: string;
  workerRole: string;
  project: string;
  task: string;
  date: string;
  clockIn: string;
  clockOut: string;
  breakMins: number;
  hoursWorked: number;
  notes: string;
  status: LogStatus;
  supervisorId?: string;
  supervisorName?: string;
  supervisorTime?: string;
  supervisorNote?: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

// allProjects and allWorkers loaded from API — see component state
const taskOptions: string[] = [];

const statusConfig: Record<
  LogStatus,
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

// ─── Log Entry Modal ──────────────────────────────────────────────────────────

function LogTimeModal({
  workers,
  projectNames,
  onSave,
  onClose,
}: {
  workers: { id: string; name: string; role: string }[];
  projectNames: string[];
  onSave: (log: Omit<TimeLog, "id" | "status">) => void;
  onClose: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [workerId, setWorkerId] = useState(workers[0]?.id || "");
  const [project, setProject] = useState("");
  const [task, setTask] = useState("");
  const [date, setDate] = useState(today);
  const [clockIn, setClockIn] = useState("07:00");
  const [clockOut, setClockOut] = useState("16:00");
  const [breakMins, setBreakMins] = useState(60);
  const [notes, setNotes] = useState("");

  const worker = workers.find((w) => w.id === workerId) || {
    id: "",
    name: "",
    role: "",
  };
  const [inH, inM] = clockIn.split(":").map(Number);
  const [outH, outM] = clockOut.split(":").map(Number);
  const totalMins = Math.max(
    0,
    outH * 60 + outM - (inH * 60 + inM) - breakMins,
  );
  const hoursWorked = Math.round((totalMins / 60) * 10) / 10;

  function handleSave() {
    onSave({
      workerId,
      workerName: worker.name,
      workerRole: worker.role,
      project,
      task,
      date,
      clockIn,
      clockOut,
      breakMins,
      hoursWorked,
      notes,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Log Time Entry
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Worker
            </label>
            <select
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} — {w.role}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project
            </label>
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select project…</option>
              {projectNames.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task
            </label>
            <select
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select task…</option>
              {taskOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={today}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clock In
              </label>
              <input
                type="time"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clock Out
              </label>
              <input
                type="time"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Break (mins)
              </label>
              <input
                type="number"
                min={0}
                max={180}
                value={breakMins}
                onChange={(e) => setBreakMins(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          {hoursWorked > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-md px-3 py-2">
              <Timer className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-semibold text-orange-700">
                {hoursWorked}h effective working time
              </span>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was completed today…"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            onClick={handleSave}
            disabled={!project || !task}
            className="flex-1 bg-orange-600 text-white py-2 rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit Log
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function TimeTrackingPage() {
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LogStatus | "all">("all");
  const [projectFilter, setProjectFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [showLog, setShowLog] = useState(false);
  const [supervisorNoteFor, setSupervisorNoteFor] = useState<string | null>(
    null,
  );
  const [supNote, setSupNote] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [allProjects, setAllProjects] = useState<string[]>([]);
  const [allWorkers, setAllWorkers] = useState<
    { id: string; name: string; role: string }[]
  >([]);
  useEffect(() => {
    fetchProjects()
      .then((ps) => setAllProjects(ps.map((p) => p.name)))
      .catch(() => {});
    fetchEmployees()
      .then((es) =>
        setAllWorkers(
          es.map((e) => ({
            id: e.id,
            name: `${e.firstName} ${e.lastName}`,
            role: e.role,
          })),
        ),
      )
      .catch(() => {});
  }, []);

  function nowTime() {
    return new Date().toTimeString().slice(0, 5);
  }

  function handleApprove(id: string) {
    setLogs((ls) =>
      ls.map((l) =>
        l.id === id
          ? {
              ...l,
              status: "approved",
              supervisorName: "Michael Chen",
              supervisorTime: nowTime(),
              supervisorNote: supNote,
            }
          : l,
      ),
    );
    setSupervisorNoteFor(null);
    setSupNote("");
  }
  function handleReject(id: string) {
    setLogs((ls) =>
      ls.map((l) =>
        l.id === id
          ? {
              ...l,
              status: "rejected",
              supervisorName: "Michael Chen",
              supervisorTime: nowTime(),
              supervisorNote: supNote,
            }
          : l,
      ),
    );
    setSupervisorNoteFor(null);
    setSupNote("");
  }

  function handleAddLog(log: Omit<TimeLog, "id" | "status">) {
    setLogs((ls) => [
      { ...log, id: `tl${Date.now()}`, status: "pending" },
      ...ls,
    ]);
    setShowLog(false);
  }

  const filtered = logs.filter((l) => {
    const matchSearch =
      !search ||
      l.workerName.toLowerCase().includes(search.toLowerCase()) ||
      l.task.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const matchProject = projectFilter === "All" || l.project === projectFilter;
    const matchDate = !dateFilter || l.date === dateFilter;
    return matchSearch && matchStatus && matchProject && matchDate;
  });

  const counts = {
    all: logs.length,
    pending: logs.filter((l) => l.status === "pending").length,
    approved: logs.filter((l) => l.status === "approved").length,
    rejected: logs.filter((l) => l.status === "rejected").length,
  };

  const totalHours = filtered.reduce((s, l) => s + l.hoursWorked, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Time Tracking
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Daily time logs, clock-in/out records, and supervisor validation
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const headers = [
                "Log ID",
                "Worker",
                "Role",
                "Project",
                "Task",
                "Date",
                "Clock In",
                "Clock Out",
                "Break (mins)",
                "Hours Worked",
                "Status",
                "Notes",
              ];
              const rows = filtered.map((l) => [
                l.id,
                l.workerName,
                l.workerRole,
                l.project,
                l.task,
                l.date,
                l.clockIn,
                l.clockOut || "—",
                String(l.breakMins),
                String(l.hoursWorked),
                statusConfig[l.status].label,
                l.notes,
              ]);
              exportCSV("time-tracking-logs", headers, rows);
            }}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => setShowLog(true)}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-700"
          >
            <Plus className="w-4 h-4" /> Log Time
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">Total Hours Logged</p>
          <p className="text-2xl font-bold text-gray-900">
            {logs.reduce((s, l) => s + l.hoursWorked, 0)}h
          </p>
          <p className="text-xs text-gray-400">across {logs.length} entries</p>
        </div>
        <div className="bg-white border border-amber-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">Pending Review</p>
          <p className="text-2xl font-bold text-amber-600">{counts.pending}</p>
          <p className="text-xs text-gray-400">awaiting supervisor</p>
        </div>
        <div className="bg-white border border-green-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">Approved</p>
          <p className="text-2xl font-bold text-green-600">{counts.approved}</p>
          <p className="text-xs text-gray-400">verified entries</p>
        </div>
        <div className="bg-white border border-red-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{counts.rejected}</p>
          <p className="text-xs text-gray-400">need resubmission</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["all", "pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${statusFilter === s ? "border-orange-600 text-orange-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            {s}{" "}
            <span className="ml-1 text-xs text-gray-400">
              ({counts[s as keyof typeof counts]})
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search worker or task…"
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-52"
          />
        </div>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {["All", ...allProjects].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        {dateFilter && (
          <button
            onClick={() => setDateFilter("")}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear date ×
          </button>
        )}
        {filtered.length > 0 && (
          <span className="ml-auto text-sm text-gray-500">
            {totalHours.toFixed(1)}h shown
          </span>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Worker
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Project / Task
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Clock In
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Clock Out
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Hours
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Supervisor Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((l) => {
              const sc = statusConfig[l.status];
              const isExpanded = expandedId === l.id;
              const isValidating = supervisorNoteFor === l.id;
              return (
                <>
                  <tr
                    key={l.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : l.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                          {l.workerName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {l.workerName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {l.workerRole}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700 font-medium">
                        {l.task}
                      </p>
                      <p className="text-xs text-gray-400">
                        {l.project.slice(0, 24)}
                        {l.project.length > 24 ? "…" : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-gray-700">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {l.date}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                      {l.clockIn || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {l.clockOut ? (
                        <span className="text-gray-700">{l.clockOut}</span>
                      ) : (
                        <span className="flex items-center gap-1 text-orange-600 font-medium">
                          <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm font-semibold ${l.hoursWorked > 9 ? "text-amber-600" : "text-gray-900"}`}
                      >
                        {l.hoursWorked > 0 ? `${l.hoursWorked}h` : "—"}
                      </span>
                      {l.breakMins > 0 && (
                        <p className="text-xs text-gray-400">
                          {l.breakMins}min break
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {sc.icon}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.badge}`}
                        >
                          {sc.label}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {l.status === "pending" &&
                        (isValidating ? (
                          <div
                            className="space-y-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <textarea
                              rows={2}
                              value={supNote}
                              onChange={(e) => setSupNote(e.target.value)}
                              placeholder="Supervisor note (optional)…"
                              className="w-48 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleApprove(l.id)}
                                className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(l.id)}
                                className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                              >
                                <XCircle className="w-3 h-3" />
                                Reject
                              </button>
                              <button
                                onClick={() => {
                                  setSupervisorNoteFor(null);
                                  setSupNote("");
                                }}
                                className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-50"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSupervisorNoteFor(l.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-orange-300 text-orange-700 rounded-md text-xs font-medium hover:bg-orange-50"
                          >
                            <UserCheck className="w-3.5 h-3.5" /> Validate
                          </button>
                        ))}
                      {l.status !== "pending" && l.supervisorName && (
                        <div className="text-xs text-gray-500">
                          <p className="font-medium text-gray-700">
                            {l.supervisorName}
                          </p>
                          <p>{l.supervisorTime}</p>
                        </div>
                      )}
                    </td>
                  </tr>
                  {/* Expanded notes row */}
                  {isExpanded && (
                    <tr key={`${l.id}-exp`} className="bg-orange-50/30">
                      <td
                        colSpan={8}
                        className="px-6 py-3 border-t border-orange-100"
                      >
                        <div className="flex gap-8 text-sm">
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                              Worker Notes
                            </p>
                            <p className="text-gray-700">
                              {l.notes || (
                                <span className="text-gray-400 italic">
                                  No notes
                                </span>
                              )}
                            </p>
                          </div>
                          {l.supervisorNote && (
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                                Supervisor Note
                              </p>
                              <p className="text-gray-700 italic">
                                "{l.supervisorNote}"
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              No time entries match your filters
            </p>
          </div>
        )}
      </div>

      {showLog && (
        <LogTimeModal
          workers={allWorkers}
          projectNames={allProjects}
          onSave={handleAddLog}
          onClose={() => setShowLog(false)}
        />
      )}
    </div>
  );
}
