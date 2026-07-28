import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import {
  CalendarDays,
  User,
  PlayCircle,
  Send,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Circle,
} from "lucide-react";
import { useTasks } from "../../contexts/TaskContext";
import type { AppTask, TaskPriority } from "../../contexts/TaskContext";
import { ApprovalPipeline } from "../../components/ApprovalPipeline";
import type { PipelineStep } from "../../components/ApprovalPipeline";
import { fetchEmployees } from "../../api/employees";

type KanbanStatus =
  | "To Do"
  | "In Progress"
  | "Awaiting Approval"
  | "Approved"
  | "Declined";

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  Low: "px-1.5 py-0.5 text-xs rounded font-semibold bg-gray-100 text-gray-500",
  Medium:
    "px-1.5 py-0.5 text-xs rounded font-semibold bg-amber-100 text-amber-700",
  High: "px-1.5 py-0.5 text-xs rounded font-semibold bg-red-100 text-red-700",
};

function computePipeline(task: AppTask): PipelineStep[] {
  const notStarted = task.status === "To Do";
  const notSubmitted = notStarted || task.status === "In Progress";
  const notResolved = notSubmitted || task.status === "Awaiting Approval";
  const isDeclined = task.status === "Declined";

  return [
    { label: "Assigned", actor: task.assignedBy, status: "completed" },
    {
      label: "Started",
      actor: task.assignedTo,
      status: notStarted ? "pending" : "completed",
      date: task.startedAt,
    },
    {
      label: "Submitted",
      actor: task.assignedTo,
      status: notSubmitted
        ? "pending"
        : task.status === "Awaiting Approval"
          ? "active"
          : "completed",
      date: task.submittedAt,
    },
    {
      label: isDeclined ? "Declined" : "Approved",
      actor: task.assignedBy,
      status: notResolved ? "pending" : isDeclined ? "rejected" : "completed",
      date: task.resolvedAt,
      note: isDeclined ? task.declineReason : undefined,
    },
  ];
}

interface Column {
  status: KanbanStatus;
  label: string;
  headerClass: string;
  icon: ReactNode;
}

const COLUMNS: Column[] = [
  {
    status: "To Do",
    label: "To Do",
    headerClass: "bg-gray-50 border-gray-200",
    icon: <Circle className="w-3.5 h-3.5 text-gray-400" />,
  },
  {
    status: "In Progress",
    label: "In Progress",
    headerClass: "bg-blue-50 border-blue-200",
    icon: <Clock className="w-3.5 h-3.5 text-blue-500" />,
  },
  {
    status: "Awaiting Approval",
    label: "Awaiting Approval",
    headerClass: "bg-amber-50 border-amber-200",
    icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />,
  },
  {
    status: "Approved",
    label: "Approved",
    headerClass: "bg-emerald-50 border-emerald-200",
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
  },
  {
    status: "Declined",
    label: "Declined",
    headerClass: "bg-red-50 border-red-200",
    icon: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  },
];

const TODAY = new Date().toISOString().slice(0, 10);

export function MyTasksPage() {
  const { tasks, updateTask } = useTasks();
  const [employeeNames, setEmployeeNames] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees()
      .then((emps) => {
        const names = emps
          .map((e) => `${e.firstName} ${e.lastName}`.trim())
          .filter(Boolean);
        if (names.length > 0) setEmployeeNames(names);
      })
      .catch(() => {});
  }, []);

  // Dropdown options: real employees from the API, merged with any assignees
  // already present on tasks so the board never loses its current data.
  const users = Array.from(
    new Set([
      ...employeeNames,
      ...tasks.map((t) => t.assignedTo).filter(Boolean),
    ]),
  );

  useEffect(() => {
    if (!currentUser && users.length > 0) setCurrentUser(users[0]);
  }, [currentUser, users]);

  const myTasks = tasks.filter(
    (t) =>
      t.assignedTo === currentUser &&
      (t.status as string) !== "Pending" &&
      (t.status as string) !== "Completed",
  ) as AppTask[];

  function startTask(id: string) {
    updateTask(id, { status: "In Progress", startedAt: TODAY });
  }

  function submitTask(id: string) {
    updateTask(id, { status: "Awaiting Approval", submittedAt: TODAY });
  }

  function approveTask(id: string) {
    updateTask(id, { status: "Approved", resolvedAt: TODAY });
  }

  function declineTask(id: string) {
    updateTask(id, {
      status: "Declined",
      resolvedAt: TODAY,
      declineReason: "Declined by manager. Please review and resubmit.",
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track your assigned tasks and update their status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Viewing as:</span>
          <select
            value={currentUser}
            onChange={(e) => {
              setCurrentUser(e.target.value);
              setExpandedId(null);
            }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {users.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {COLUMNS.map((col) => {
          const count = myTasks.filter((t) => t.status === col.status).length;
          return (
            <div
              key={col.status}
              className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1"
            >
              {col.icon}
              <span className="text-xs text-gray-600 font-medium">
                {col.label}
              </span>
              <span className="text-xs font-bold text-gray-800 bg-gray-100 rounded-full px-1.5">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pb-4">
        {COLUMNS.map((col) => {
          const colTasks = myTasks.filter((t) => t.status === col.status);
          return (
            <div key={col.status} className="min-w-0">
              <div
                className={`flex items-center gap-2 px-3 py-2.5 rounded-t-xl border ${col.headerClass}`}
              >
                {col.icon}
                <span className="text-xs font-semibold text-gray-700 flex-1">
                  {col.label}
                </span>
                <span className="text-xs font-bold bg-white/80 text-gray-600 px-1.5 py-0.5 rounded-full border border-current/10">
                  {colTasks.length}
                </span>
              </div>

              <div className="border border-t-0 rounded-b-xl bg-white min-h-[160px] divide-y divide-gray-50">
                {colTasks.length === 0 && (
                  <p className="py-6 text-center text-xs text-gray-300">
                    No tasks
                  </p>
                )}
                {colTasks.map((task) => {
                  const isExpanded = expandedId === task.id;
                  const overdue =
                    !!task.dueDate &&
                    !["Approved", "Declined"].includes(task.status) &&
                    task.dueDate < TODAY;

                  return (
                    <div key={task.id} className="p-3 space-y-2">
                      <div
                        className="cursor-pointer"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : task.id)
                        }
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex gap-1 flex-wrap mb-1.5">
                              <span className={PRIORITY_BADGE[task.priority]}>
                                {task.priority}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 text-xs rounded font-semibold ${task.category === "process" ? "bg-sky-50 text-sky-700" : "bg-violet-50 text-violet-700"}`}
                              >
                                {task.category === "process"
                                  ? "Process"
                                  : "General"}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 leading-snug">
                              {task.name}
                            </p>
                            <div
                              className={`flex items-center gap-1 mt-1 text-xs ${overdue ? "text-red-500 font-medium" : "text-gray-400"}`}
                            >
                              <CalendarDays className="w-3 h-3" />
                              Due {task.dueDate}
                              {overdue && " · Overdue"}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                              <User className="w-3 h-3" />
                              From: {task.assignedBy}
                            </div>
                          </div>
                          <span className="text-gray-300 pt-0.5">
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gray-100 pt-2 space-y-3">
                          {task.description && (
                            <p className="text-xs text-gray-500 leading-relaxed">
                              {task.description}
                            </p>
                          )}
                          <ApprovalPipeline
                            steps={computePipeline(task)}
                            accentClass="bg-amber-600 border-amber-600"
                            accentTextClass="text-amber-700"
                          />
                          {task.declineReason && task.status === "Declined" && (
                            <div className="bg-red-50 border border-red-100 rounded-lg p-2">
                              <p className="text-xs text-red-700">
                                <span className="font-semibold">Reason: </span>
                                {task.declineReason}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {task.status === "To Do" && (
                        <button
                          onClick={() => startTask(task.id)}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <PlayCircle className="w-3.5 h-3.5" /> Start Task
                        </button>
                      )}
                      {task.status === "In Progress" && (
                        <button
                          onClick={() => submitTask(task.id)}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-white rounded-lg transition-colors bg-amber-600 hover:bg-amber-700"
                        >
                          <Send className="w-3.5 h-3.5" /> Submit as Done
                        </button>
                      )}
                      {task.status === "Awaiting Approval" && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => approveTask(task.id)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => declineTask(task.id)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" /> Decline
                          </button>
                        </div>
                      )}
                      {task.status === "Declined" && (
                        <button
                          onClick={() => startTask(task.id)}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                        >
                          <PlayCircle className="w-3.5 h-3.5" /> Restart Task
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
