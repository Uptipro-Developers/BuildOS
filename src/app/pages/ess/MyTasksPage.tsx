import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Filter,
  Briefcase,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getTasks } from "../../api/tasks";
import { fetchEmployees } from "../../api/employees";
import { useAuthUser } from "../../utils/useAuthUser";

type TaskStatus = "done" | "in-progress" | "todo" | "blocked";
type TaskPriority = "low" | "medium" | "high";

interface Task {
  id: string;
  name: string;
  project: string;
  status: TaskStatus;
  due: string;
  priority: TaskPriority;
  assignedTo: string;
  assignedBy?: string;
  description?: string;
}

const statusConfig: Record<
  TaskStatus,
  { icon: React.ReactNode; badge: string; label: string }
> = {
  done: {
    icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    badge: "bg-green-100 text-green-700",
    label: "Done",
  },
  "in-progress": {
    icon: <Clock className="w-4 h-4 text-blue-500" />,
    badge: "bg-blue-100 text-blue-700",
    label: "In Progress",
  },
  todo: {
    icon: <Clock className="w-4 h-4 text-gray-400" />,
    badge: "bg-gray-100 text-gray-600",
    label: "To Do",
  },
  blocked: {
    icon: <AlertCircle className="w-4 h-4 text-red-500" />,
    badge: "bg-red-100 text-red-700",
    label: "Blocked",
  },
};

const priorityConfig: Record<TaskPriority, { dot: string; label: string }> = {
  low: { dot: "bg-green-400", label: "Low" },
  medium: { dot: "bg-yellow-400", label: "Medium" },
  high: { dot: "bg-red-400", label: "High" },
};

function mapStatus(status: string): TaskStatus {
  const s = status.toLowerCase().replace(/[^a-z]/g, "");
  if (s === "done" || s === "completed" || s === "approved") return "done";
  if (s === "inprogress" || s === "awaitingapproval" || s === "submitted")
    return "in-progress";
  if (s === "blocked" || s === "declined" || s === "cancelled")
    return "blocked";
  return "todo";
}

function mapPriority(priority: string): TaskPriority {
  const p = priority.toLowerCase();
  if (p === "high" || p === "critical" || p === "urgent") return "high";
  if (p === "low") return "low";
  return "medium";
}

export function MyTasksPage() {
  const { name: authName } = useAuthUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [currentUser, setCurrentUser] = useState("");
  useEffect(() => {
    fetchEmployees()
      .then((emps) => {
        const names = emps
          .map((e) => `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim())
          .filter(Boolean);
        setEmployees(names);
        setCurrentUser((prev) => {
          if (prev) return prev;
          if (authName && names.includes(authName)) return authName;
          return names[0] ?? "";
        });
      })
      .catch(() => {});
    getTasks()
      .then((ts) =>
        setTasks(
          ts.map((t) => ({
            id: t.id,
            name: t.title,
            project: t.projectName ?? "",
            status: mapStatus(t.status),
            due: t.dueDate?.slice(0, 10) ?? "",
            priority: mapPriority(t.priority),
            assignedTo: t.assignedTo ?? "",
            assignedBy: (t as { assignedBy?: string }).assignedBy,
            description: t.description,
          })),
        ),
      )
      .catch(() => {});
  }, [authName]);

  const displayTasks = currentUser
    ? tasks.filter((t) => t.assignedTo === currentUser)
    : tasks;

  const filtered =
    statusFilter === "all"
      ? displayTasks
      : displayTasks.filter((t) => t.status === statusFilter);

  const counts = {
    all: displayTasks.length,
    "in-progress": displayTasks.filter((t) => t.status === "in-progress")
      .length,
    todo: displayTasks.filter((t) => t.status === "todo").length,
    blocked: displayTasks.filter((t) => t.status === "blocked").length,
    done: displayTasks.filter((t) => t.status === "done").length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Tasks assigned to you across all active projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Viewing as:</span>
          <select
            value={currentUser}
            onChange={(e) => setCurrentUser(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {employees.length === 0 && <option value="">No employees</option>}
            {employees.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["all", "in-progress", "todo", "blocked", "done"] as const).map(
          (s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors whitespace-nowrap ${statusFilter === s ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {s}{" "}
              <span className="ml-0.5 text-xs text-gray-400">
                ({counts[s as keyof typeof counts] ?? 0})
              </span>
            </button>
          ),
        )}
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Filter className="w-3.5 h-3.5" />
        <span>
          {filtered.length} task{filtered.length !== 1 ? "s" : ""}
        </span>
        {counts.blocked > 0 && (
          <span className="ml-2 flex items-center gap-1 text-red-600 font-medium">
            <AlertCircle className="w-3.5 h-3.5" /> {counts.blocked} blocked
          </span>
        )}
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {filtered.map((t) => {
          const sc = statusConfig[t.status];
          const pc = priorityConfig[t.priority];
          return (
            <div
              key={t.id}
              className={`bg-white rounded-xl border overflow-hidden ${t.status === "blocked" ? "border-red-200" : "border-gray-200"}`}
            >
              <div className="flex items-start gap-4 px-5 py-4">
                <div className="flex-shrink-0 mt-0.5">{sc.icon}</div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold ${t.status === "done" ? "line-through text-gray-400" : "text-gray-900"}`}
                  >
                    {t.name}
                  </p>
                  {t.description && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {t.project}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Due {t.due}
                    </span>
                    {t.assignedBy && (
                      <span className="flex items-center gap-1">
                        Assigned by: {t.assignedBy}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${sc.badge}`}
                  >
                    {sc.label}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <span className={`w-2 h-2 rounded-full ${pc.dot}`} />
                    {pc.label}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-16 text-center bg-white rounded-xl border border-gray-200">
            <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              No tasks in this category
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
