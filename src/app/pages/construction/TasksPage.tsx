import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
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
import { useTasks } from "../../contexts/TaskContext";
import type { TaskPriority, TaskCategory } from "../../contexts/TaskContext";
import { fetchEmployees } from "../../api/employees";
import { ConfirmationModal } from "../../components/ConfirmationModal";

type TaskStatus = "Pending" | "In Progress" | "Completed";

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

const app = "projects";

export function TasksPage() {
  const { tasks, addTask, updateTask, deleteTask } = useTasks();
  const today = new Date().toISOString().slice(0, 10);

  const appTasks = tasks.filter(
    (t) =>
      t.app === app &&
      (t.status === "Pending" ||
        t.status === "In Progress" ||
        t.status === "Completed"),
  ) as ((typeof tasks)[number] & { status: TaskStatus })[];

  const [employeeNames, setEmployeeNames] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "All">("All");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    assignedTo: "",
    dueDate: today,
    priority: "Medium" as TaskPriority,
    category: "process" as TaskCategory,
  });

  // Dropdown options: real employees merged with any assignees already on tasks.
  const users = Array.from(
    new Set([
      ...employeeNames,
      ...tasks.map((t) => t.assignedTo).filter(Boolean),
    ]),
  );

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
    if (!currentUser && users.length > 0) setCurrentUser(users[0]);
  }, [currentUser, users]);

  const filtered = appTasks.filter((t) => {
    if (statusFilter !== "All" && t.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) || t.assignedTo.toLowerCase().includes(q)
    );
  });

  const counts: Record<TaskStatus, number> = {
    Pending: appTasks.filter((t) => t.status === "Pending").length,
    "In Progress": appTasks.filter((t) => t.status === "In Progress").length,
    Completed: appTasks.filter((t) => t.status === "Completed").length,
  };

  function openCreate() {
    setEditId(null);
    setForm({
      name: "",
      description: "",
      assignedTo: users[0] ?? "",
      dueDate: today,
      priority: "Medium",
      category: "process",
    });
    setShowModal(true);
  }

  function openEdit(t: (typeof appTasks)[number]) {
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
    if (editId) {
      updateTask(editId, form);
      toast.success("Task updated");
    } else {
      addTask({
        ...form,
        status: "Pending",
        assignedBy: currentUser,
        app,
        projectId: undefined,
        projectName: undefined,
      });
      toast.success("Task created");
    }
    setShowModal(false);
  }

  function advanceStatus(id: string) {
    const task = appTasks.find((t) => t.id === id);
    if (task) {
      updateTask(id, { status: STATUS_NEXT[task.status] });
    }
  }

  function handleDelete(id: string) {
    setDeleteId(id);
  }

  function confirmDelete() {
    if (!deleteId) return;
    deleteTask(deleteId);
    setDeleteId(null);
    toast.success("Task deleted");
  }

  const isOverdue = (dueDate: string, status: TaskStatus) =>
    status !== "Completed" && new Date(dueDate) < new Date(today);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage and track project tasks
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm rounded-lg bg-amber-600 hover:bg-amber-700"
        >
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(["Pending", "In Progress", "Completed"] as TaskStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? "All" : s)}
            className={`bg-white rounded-xl border p-4 text-left transition-all ${statusFilter === s ? "border-amber-300 ring-2 ring-amber-100" : "border-gray-200 hover:border-gray-300"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              {STATUS_ICON[s]}
              <p className="text-xs text-gray-500">{s}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{counts[s]}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        {(["All", "Pending", "In Progress", "Completed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${statusFilter === s ? "bg-amber-50 text-amber-700 border-current" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
          >
            {s}
          </button>
        ))}
      </div>

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
                    className={`px-1.5 py-0.5 text-xs rounded font-semibold ${task.category === "process" ? "bg-sky-50 text-sky-700" : "bg-violet-50 text-violet-700"}`}
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
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(task)}
                  className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

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
                  placeholder="e.g. Review site drawings"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
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
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                    min={today}
                    onChange={(e) =>
                      setForm({ ...form, dueDate: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                        category: e.target.value as TaskCategory,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                className="px-4 py-2 text-sm text-white rounded-lg bg-amber-600 hover:bg-amber-700"
              >
                Save Task
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteId !== null}
        title="Delete Task?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        isDangerous
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
