import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import {
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Circle,
  Trash2,
  Edit,
  X,
  CalendarDays,
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  listAppTasks,
  createAppTask,
  updateAppTask,
  deleteAppTask,
} from "../api/app-tasks";
import { fetchEmployees } from "../api/employees";
import { ConfirmationModal } from "./ConfirmationModal";

type TaskStatus = "Pending" | "In Progress" | "Completed";
type TaskPriority = "Low" | "Medium" | "High";

interface Task {
  id: string;
  name: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  app: string;
  createdAt: string;
  category: "process" | "general";
}

interface TasksPageProps {
  app: string;
  accentColor?: string; // tailwind bg color class for buttons e.g. "bg-emerald-600 hover:bg-emerald-700"
  ringColor?: string; // e.g. "focus:ring-emerald-500"
  badgeColor?: string; // active nav badge e.g. "bg-emerald-50 text-emerald-700"
}

const DEPT_USERS: Record<string, string[]> = {};

function makeId() {
  return `TASK-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

// Status values written to the backend. New tasks are stored as "To Do" so
// they also appear on the My Tasks board, which uses the board status model.
const STATUS_TO_BACKEND: Record<TaskStatus, string> = {
  Pending: "To Do",
  "In Progress": "In Progress",
  Completed: "Completed",
};

const STATUS_ICON: Record<TaskStatus, ReactNode> = {
  Pending: <Circle className="w-4 h-4 text-gray-400" />,
  "In Progress": <Clock className="w-4 h-4 text-blue-500" />,
  Completed: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
};
const STATUS_BADGE: Record<TaskStatus, string> = {
  Pending: "bg-gray-100 text-gray-600",
  "In Progress": "bg-blue-100 text-blue-700",
  Completed: "bg-emerald-100 text-emerald-700",
};
const PRIORITY_BADGE: Record<TaskPriority, string> = {
  Low: "bg-gray-100 text-gray-500",
  Medium: "bg-amber-100 text-amber-700",
  High: "bg-red-100 text-red-700",
};
const STATUS_NEXT: Record<TaskStatus, TaskStatus> = {
  Pending: "In Progress",
  "In Progress": "Completed",
  Completed: "Pending",
};

// Backend tasks use board-style statuses ("To Do", "Awaiting Approval", …);
// normalise them onto this page's three-state model.
function normalizeStatus(status: string | undefined): TaskStatus {
  switch (status) {
    case "In Progress":
    case "Awaiting Approval":
      return "In Progress";
    case "Completed":
    case "Approved":
      return "Completed";
    default:
      return "Pending";
  }
}

export function TasksPage({
  app,
  accentColor = "bg-indigo-600 hover:bg-indigo-700",
  ringColor = "focus:ring-indigo-500",
  badgeColor = "bg-indigo-50 text-indigo-700",
}: TasksPageProps) {
  const [employeeNames, setEmployeeNames] = useState<string[]>([]);
  const today = new Date().toISOString().slice(0, 10);

  const [tasks, setTasks] = useState<Task[]>([]);

  // Assignee options: real employees merged with assignees already on tasks.
  const users = Array.from(
    new Set([
      ...(DEPT_USERS[app] ?? []),
      ...employeeNames,
      ...tasks.map((t) => t.assignedTo).filter(Boolean),
    ]),
  );
  if (users.length === 0) users.push("Team Member");

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

  useEffect(() => {
    listAppTasks()
      .then((rows) => {
        setTasks(
          rows
            .filter((t) => t.app === app)
            .map((t) => ({
              id: t.id,
              name: t.name,
              description: t.description,
              assignedTo: t.assignedTo,
              dueDate: t.dueDate,
              priority: (t.priority as TaskPriority) ?? "Medium",
              status: normalizeStatus(t.status),
              app: t.app,
              createdAt: t.createdAt,
              category: (t.category as Task["category"]) ?? "general",
            })),
        );
      })
      .catch((err) => {
        console.error(`Failed to load tasks for ${app}:`, err);
        setTasks([]);
      });
  }, [app]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "All">("All");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    assignedTo: users[0],
    dueDate: today,
    priority: "Medium" as TaskPriority,
    category: "process" as "process" | "general",
  });

  const filtered = tasks.filter((t) => {
    if (statusFilter !== "All" && t.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) || t.assignedTo.toLowerCase().includes(q)
    );
  });

  const counts: Record<TaskStatus, number> = {
    Pending: tasks.filter((t) => t.status === "Pending").length,
    "In Progress": tasks.filter((t) => t.status === "In Progress").length,
    Completed: tasks.filter((t) => t.status === "Completed").length,
  };

  function openCreate() {
    setEditId(null);
    setForm({
      name: "",
      description: "",
      assignedTo: users[0],
      dueDate: today,
      priority: "Medium",
      category: "process",
    });
    setShowModal(true);
  }

  function openEdit(t: Task) {
    setEditId(t.id);
    setForm({
      name: t.name,
      description: t.description,
      assignedTo: t.assignedTo,
      dueDate: t.dueDate,
      priority: t.priority,
      category: t.category,
    });
    setShowModal(true);
  }

  function saveTask() {
    if (!form.name.trim()) return;
    if (!editId && form.dueDate < today) {
      toast.error("Due date cannot be in the past for new tasks.");
      return;
    }
    if (editId) {
      const prevTasks = tasks;
      setTasks((prev) =>
        prev.map((t) => (t.id === editId ? { ...t, ...form } : t)),
      );
      setShowModal(false);
      updateAppTask(editId, { ...form }).catch((err) => {
        setTasks(prevTasks);
        toast.error(err?.message || "Failed to update task.");
      });
    } else {
      const tempId = makeId();
      const newTask: Task = {
        id: tempId,
        ...form,
        status: "Pending",
        app,
        createdAt: today,
      };
      setTasks((prev) => [...prev, newTask]);
      setShowModal(false);
      createAppTask({
        ...form,
        status: STATUS_TO_BACKEND.Pending,
        app,
        assignedBy: form.assignedTo,
      })
        .then((created) => {
          // Swap the temporary id for the server-generated one.
          setTasks((prev) =>
            prev.map((t) => (t.id === tempId ? { ...t, id: created.id } : t)),
          );
        })
        .catch((err) => {
          setTasks((prev) => prev.filter((t) => t.id !== tempId));
          toast.error(err?.message || "Failed to create task.");
        });
    }
  }

  function advanceStatus(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const next = STATUS_NEXT[task.status];
    const prevTasks = tasks;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: next } : t)),
    );
    updateAppTask(id, { status: STATUS_TO_BACKEND[next] }).catch((err) => {
      setTasks(prevTasks);
      toast.error(err?.message || "Failed to update task status.");
    });
  }

  function deleteTask(id: string) {
    const prevTasks = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    deleteAppTask(id).catch((err) => {
      setTasks(prevTasks);
      toast.error(err?.message || "Failed to delete task.");
    });
  }

  const isOverdue = (dueDate: string, status: TaskStatus) =>
    status !== "Completed" && new Date(dueDate) < new Date(today);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage and track team tasks
          </p>
        </div>
        <button
          onClick={openCreate}
          className={`flex items-center gap-2 px-4 py-2 text-white text-sm rounded-lg ${accentColor}`}
        >
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {(["Pending", "In Progress", "Completed"] as TaskStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? "All" : s)}
            className={`bg-white rounded-xl border p-4 text-left transition-all ${statusFilter === s ? "border-indigo-300 ring-2 ring-indigo-100" : "border-gray-200 hover:border-gray-300"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              {STATUS_ICON[s]}
              <p className="text-xs text-gray-500">{s}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{counts[s]}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className={`w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${ringColor}`}
          />
        </div>
        {(["All", "Pending", "In Progress", "Completed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${statusFilter === s ? `${badgeColor} border-current` : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Tasks list */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No tasks found</p>
          </div>
        )}
        {filtered.map((task) => {
          const overdue = isOverdue(task.dueDate, task.status);
          return (
            <div
              key={task.id}
              className="px-5 py-4 flex items-start gap-4 hover:bg-gray-50 group"
            >
              <button
                onClick={() => advanceStatus(task.id)}
                className="mt-0.5 shrink-0"
                title={`Mark as ${STATUS_NEXT[task.status]}`}
              >
                {STATUS_ICON[task.status]}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p
                    className={`text-sm font-medium text-gray-900 ${task.status === "Completed" ? "line-through text-gray-400" : ""}`}
                  >
                    {task.name}
                  </p>
                  <span
                    className={`px-1.5 py-0.5 text-xs rounded font-semibold ${STATUS_BADGE[task.status]}`}
                  >
                    {task.status}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 text-xs rounded font-semibold ${PRIORITY_BADGE[task.priority]}`}
                  >
                    {task.priority}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 text-xs rounded font-semibold ${
                      task.category === "process"
                        ? "bg-sky-50 text-sky-700"
                        : "bg-violet-50 text-violet-700"
                    }`}
                  >
                    {task.category === "process" ? "Process" : "General"}
                  </span>
                  {overdue && (
                    <span className="px-1.5 py-0.5 text-xs rounded font-semibold bg-red-100 text-red-700">
                      Overdue
                    </span>
                  )}
                </div>
                {task.description && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {task.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <User className="w-3 h-3" />
                    {task.assignedTo}
                  </span>
                  <span
                    className={`flex items-center gap-1 text-xs ${overdue ? "text-red-500 font-medium" : "text-gray-400"}`}
                  >
                    <CalendarDays className="w-3 h-3" /> Due {task.dueDate}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => openEdit(task)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPendingDeleteTask(task)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                {editId ? "Edit Task" : "New Task"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Task Name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Review monthly report"
                  className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${ringColor}`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                  className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${ringColor} resize-none`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Assigned To
                  </label>
                  <select
                    value={form.assignedTo}
                    onChange={(e) =>
                      setForm({ ...form, assignedTo: e.target.value })
                    }
                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${ringColor}`}
                  >
                    {users.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        priority: e.target.value as TaskPriority,
                      })
                    }
                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${ringColor}`}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm({ ...form, dueDate: e.target.value })
                    }
                    min={editId ? undefined : today}
                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${ringColor}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Task Type
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        category: e.target.value as "process" | "general",
                      })
                    }
                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${ringColor}`}
                  >
                    <option value="process">Process Task</option>
                    <option value="general">General Task</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveTask}
                className={`px-4 py-2 text-sm text-white rounded-lg ${accentColor}`}
              >
                Save Task
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={pendingDeleteTask !== null}
        title="Delete Task?"
        description={
          pendingDeleteTask
            ? `This will permanently remove "${pendingDeleteTask.name}". This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        isDangerous={true}
        onConfirm={() => {
          if (!pendingDeleteTask) return;
          deleteTask(pendingDeleteTask.id);
          setPendingDeleteTask(null);
        }}
        onCancel={() => setPendingDeleteTask(null)}
      />
    </div>
  );
}
