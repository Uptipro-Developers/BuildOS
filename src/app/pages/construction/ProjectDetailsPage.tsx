import { notifyLoadFailure } from "../../utils/loadFailure";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { safePercent } from "../../utils/number";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Activity,
  LayoutDashboard,
  Clock,
  ListTodo,
  Package,
  Cog,
  Receipt,
  FileText,
  History,
  Plus,
  Edit,
  Upload,
  Download,
  ChevronRight,
  Paperclip,
  Search,
  Eye,
} from "lucide-react";
import { fetchProjects } from "../../api/projects";
import { getTasks } from "../../api/tasks";
import { getWorkforceAllocations } from "../../api/workforce-allocation";
import { fetchExpenses } from "../../api/expenses";
import { getResourcePlans } from "../../api/resource-planning";
import {
  formatDateByGeneralSettings,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";

// ─── Shared data ────────────────────────────────────────────────────────────

interface ProjectDetail {
  id: string;
  name: string;
  client: string;
  location: string;
  status: string;
  type: string;
  budget: number;
  spent: number;
  progress: number;
  startDate: string;
  endDate: string;
  manager: string;
  team: number;
  description: string;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type TabId =
  | "overview"
  | "schedule"
  | "tasks"
  | "workforce"
  | "materials"
  | "equipment"
  | "expenses"
  | "documents"
  | "activity";

interface Milestone {
  id: string;
  name: string;
  date: string;
  status: "completed" | "in-progress" | "pending" | "at-risk";
}
interface Task {
  id: string;
  name: string;
  parent: string | null;
  assignee: string;
  startDate: string;
  endDate: string;
  status: "todo" | "in-progress" | "done" | "blocked";
  priority: "low" | "medium" | "high" | "critical";
  progress: number;
}
interface Worker {
  id: string;
  name: string;
  role: string;
  phone: string;
  attendance: "present" | "absent" | "leave";
  hoursThisWeek: number;
}
interface Material {
  id: string;
  name: string;
  unit: string;
  required: number;
  used: number;
  ordered: number;
  status: "in-stock" | "low-stock" | "out-of-stock" | "ordered";
}
interface Equipment {
  id: string;
  name: string;
  type: string;
  status: "active" | "idle" | "maintenance";
  assignedFrom: string;
  assignedTo: string;
}
interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  status: "approved" | "pending" | "rejected";
}
interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedBy: string;
  date: string;
  version: string;
}
interface ActivityItem {
  id: string;
  action: string;
  user: string;
  time: string;
  category: string;
}
const milestones: Milestone[] = [];

const tasks: Task[] = [];

const materials: Material[] = [];

const equipment: Equipment[] = [];

const docs: Document[] = [];

const activityLog: ActivityItem[] = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${(n / 1000).toFixed(0)}K`;
}

const priorityBadge: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-600",
};
const taskStatusBadge: Record<string, string> = {
  done: "bg-green-100 text-green-700",
  "in-progress": "bg-blue-100 text-blue-700",
  todo: "bg-gray-100 text-gray-600",
  blocked: "bg-red-100 text-red-700",
};
const milestoneColor: Record<string, string> = {
  completed: "bg-green-500",
  "in-progress": "bg-blue-500",
  "at-risk": "bg-red-400",
  pending: "bg-gray-300",
};
const attendanceBadge: Record<string, string> = {
  present: "bg-green-100 text-green-700",
  absent: "bg-red-100 text-red-700",
  leave: "bg-amber-100 text-amber-700",
};
const matStatusBadge: Record<string, string> = {
  "in-stock": "bg-green-100 text-green-700",
  "low-stock": "bg-amber-100 text-amber-700",
  "out-of-stock": "bg-red-100 text-red-700",
  ordered: "bg-blue-100 text-blue-700",
};
const eqStatusBadge: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  idle: "bg-gray-100 text-gray-600",
  maintenance: "bg-amber-100 text-amber-700",
};
const expStatusBadge: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
};
const catLogColor: Record<string, string> = {
  milestone: "bg-blue-500",
  task: "bg-orange-500",
  expense: "bg-green-500",
  document: "bg-purple-500",
  workforce: "bg-pink-500",
  material: "bg-teal-500",
  equipment: "bg-yellow-500",
  finance: "bg-emerald-500",
};

// ─── Tab Panels ───────────────────────────────────────────────────────────────

function OverviewTab({ p }: { p: ProjectDetail }) {
  const budgetPct = safePercent(p.spent, p.budget);
  return (
    <div className="space-y-5">
      {/* Top summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Budget",
            value: fmt(p.budget),
            sub: `${fmt(p.spent)} spent`,
            icon: <DollarSign className="w-5 h-5" />,
            color: "text-emerald-600 bg-emerald-50",
          },
          {
            label: "Progress",
            value: `${p.progress}%`,
            sub: "Overall completion",
            icon: <Activity className="w-5 h-5" />,
            color: "text-blue-600 bg-blue-50",
          },
          {
            label: "Team",
            value: `${p.team}`,
            sub: "Assigned workers",
            icon: <Users className="w-5 h-5" />,
            color: "text-purple-600 bg-purple-50",
          },
          {
            label: "Due Date",
            value: formatDateByGeneralSettings(p.endDate),
            sub: `Started ${formatDateByGeneralSettings(p.startDate)}`,
            icon: <Calendar className="w-5 h-5" />,
            color: "text-orange-600 bg-orange-50",
          },
        ].map((m) => (
          <div
            key={m.label}
            className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4"
          >
            <span className={`p-2.5 rounded-lg ${m.color}`}>{m.icon}</span>
            <div>
              <p className="text-xs text-gray-500">{m.label}</p>
              <p className="text-xl font-bold text-gray-900">{m.value}</p>
              <p className="text-xs text-gray-400">{m.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Description + budget bar */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Project Description
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {p.description}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Client</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">
                  {p.client}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Type</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">
                  {p.type}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Location</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">
                  {p.location}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Budget Utilisation
            </h3>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Spent: {fmt(p.spent)}</span>
              <span className="font-medium text-gray-900">{budgetPct}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${budgetPct > 90 ? "bg-red-500" : budgetPct > 75 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${Math.min(budgetPct, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1.5">
              <span>$0</span>
              <span>Total: {fmt(p.budget)}</span>
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Milestones
          </h3>
          <div className="space-y-3">
            {milestones.map((ms, i) => (
              <div key={ms.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-0.5 flex-shrink-0 mt-1">
                  <div
                    className={`w-3 h-3 rounded-full ${milestoneColor[ms.status]}`}
                  />
                  {i < milestones.length - 1 && (
                    <div className="w-px h-5 bg-gray-200" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-2">
                  <p className="text-xs font-medium text-gray-900 leading-snug">
                    {ms.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{ms.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleTab() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Timeline / Gantt View
        </h3>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
          Jan 2026 — Dec 2026
        </span>
      </div>

      {/* Month headers */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="flex border-b border-gray-200 pb-1 mb-2">
            <div className="w-52 flex-shrink-0 text-xs font-medium text-gray-500">
              Task
            </div>
            <div className="flex-1 grid grid-cols-12 gap-0">
              {[
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ].map((m) => (
                <div
                  key={m}
                  className="text-xs font-medium text-gray-400 text-center"
                >
                  {m}
                </div>
              ))}
            </div>
          </div>
          {tasks
            .filter((t) => !t.parent)
            .map((task) => {
              const s = new Date(task.startDate);
              const e = new Date(task.endDate);
              const startMonth = s.getMonth(); // 0-based
              const endMonth = e.getMonth();
              const barColor =
                task.status === "done"
                  ? "bg-green-500"
                  : task.status === "in-progress"
                    ? "bg-orange-500"
                    : "bg-gray-300";
              return (
                <div
                  key={task.id}
                  className="flex items-center py-2 border-b border-gray-50 hover:bg-gray-50 group"
                >
                  <div className="w-52 flex-shrink-0 pr-3">
                    <p className="text-xs font-medium text-gray-800 truncate">
                      {task.name}
                    </p>
                    <p className="text-xs text-gray-400">{task.assignee}</p>
                  </div>
                  <div className="flex-1 grid grid-cols-12 gap-0 h-6">
                    {Array.from({ length: 12 }, (_, mi) => {
                      const inSpan = mi >= startMonth && mi <= endMonth;
                      const isFirst = mi === startMonth;
                      const isLast = mi === endMonth;
                      return (
                        <div
                          key={mi}
                          className="h-full flex items-center px-px"
                        >
                          {inSpan && (
                            <div
                              className={`h-4 w-full ${barColor} ${isFirst ? "rounded-l-full" : ""} ${isLast ? "rounded-r-full" : ""} opacity-80`}
                            />
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

      <p className="text-xs text-gray-400">
        * Click on tasks for full dependency view. Gantt chart shows top-level
        tasks only.
      </p>
    </div>
  );
}

function TasksTab({ tasks }: { tasks: Task[] }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const filtered = tasks.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-64"
          />
        </div>
        <button
          onClick={() => navigate("/apps/construction/tasks")}
          className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
        >
          <Plus className="w-3.5 h-3.5" /> Add Task
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Task Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Assignee
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Start
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                End
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Progress
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((task) => (
              <tr
                key={task.id}
                className={`hover:bg-gray-50 ${task.parent ? "bg-gray-50/50" : ""}`}
              >
                <td className="px-4 py-3">
                  <div
                    className={`flex items-center gap-2 ${task.parent ? "pl-6" : ""}`}
                  >
                    {task.parent && (
                      <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm ${task.parent ? "text-gray-600" : "font-medium text-gray-900"}`}
                    >
                      {task.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {task.assignee}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {formatDateByGeneralSettings(task.startDate)}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {formatDateByGeneralSettings(task.endDate)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${priorityBadge[task.priority]}`}
                  >
                    {task.priority}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${taskStatusBadge[task.status]}`}
                  >
                    {task.status.replace("-", " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-orange-500 h-1.5 rounded-full"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {task.progress}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WorkforceTab({ workers }: { workers: Worker[] }) {
  const navigate = useNavigate();
  const present = workers.filter((w) => w.attendance === "present").length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Assigned",
            value: workers.length,
            color: "text-blue-600 bg-blue-50",
          },
          {
            label: "Present Today",
            value: present,
            color: "text-green-600 bg-green-50",
          },
          {
            label: "Absent / Leave",
            value: workers.length - present,
            color: "text-red-600 bg-red-50",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3"
          >
            <span className={`text-2xl font-bold ${s.color.split(" ")[0]}`}>
              {s.value}
            </span>
            <span className="text-sm text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-900">
          Assigned Workers
        </h3>
        <button
          onClick={() => navigate("/apps/construction/resource-planning")}
          className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
        >
          <Plus className="w-3.5 h-3.5" /> Assign Worker
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Phone
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Attendance
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Hrs This Week
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {workers.map((w) => (
              <tr key={w.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                      {w.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <span className="font-medium text-gray-900">{w.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{w.role}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{w.phone}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${attendanceBadge[w.attendance]}`}
                  >
                    {w.attendance}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {w.hoursThisWeek}h
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MaterialsTab({ materials }: { materials: Material[] }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-900">
          Materials Register
        </h3>
        <button
          onClick={() => navigate("/apps/construction/approvals")}
          className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
        >
          <Plus className="w-3.5 h-3.5" /> Request Material
        </button>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Material
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Unit
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Required
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Used
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Ordered
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Utilisation
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {materials.map((m) => {
              const pct = safePercent(m.used, m.required);
              return (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {m.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{m.unit}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatNumberByGeneralSettings(m.required)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatNumberByGeneralSettings(m.used)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatNumberByGeneralSettings(m.ordered)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${pct > 80 ? "bg-red-500" : pct > 60 ? "bg-amber-500" : "bg-orange-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${matStatusBadge[m.status]}`}
                    >
                      {m.status.replace("-", " ")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EquipmentTab() {
  const [eqList, setEqList] = useState(equipment);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    type: "",
    from: "",
    to: "",
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setEqList((prev) => [
      ...prev,
      {
        id: `eq${Date.now()}`,
        name: addForm.name,
        type: addForm.type,
        status: "idle" as const,
        assignedFrom: addForm.from,
        assignedTo: addForm.to,
      },
    ]);
    setShowAdd(false);
    setAddForm({ name: "", type: "", from: "", to: "" });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-900">
          Equipment Assignment
        </h3>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
        >
          <Plus className="w-3.5 h-3.5" /> Add Equipment
        </button>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Equipment
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Assigned From
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Assigned To
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {eqList.map((eq) => (
              <tr key={eq.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {eq.name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{eq.type}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {eq.assignedFrom}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {eq.assignedTo}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${eqStatusBadge[eq.status]}`}
                  >
                    {eq.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 italic">
        Equipment data is synced with the central equipment registry. Full usage
        tracking available in future release.
      </p>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                Add Equipment
              </h3>
              <button
                onClick={() => setShowAdd(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipment Name *
                </label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. Bulldozer CAT D6"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  required
                  value={addForm.type}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, type: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select type…</option>
                  {[
                    "Crane",
                    "Earthworks",
                    "Concrete",
                    "Access",
                    "Transport",
                    "Compaction",
                    "Other",
                  ].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned From
                  </label>
                  <input
                    type="date"
                    value={addForm.from}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, from: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned To
                  </label>
                  <input
                    type="date"
                    value={addForm.to}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, to: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
                >
                  Add Equipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ExpensesTab({ expenses }: { expenses: Expense[] }) {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const approved = expenses
    .filter((e) => e.status === "approved")
    .reduce((s, e) => s + e.amount, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Recorded",
            value: fmt(total),
            color: "text-gray-900",
          },
          { label: "Approved", value: fmt(approved), color: "text-green-700" },
          {
            label: "Pending Review",
            value: fmt(total - approved),
            color: "text-amber-700",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Expense Records</h3>
        <p className="text-xs text-gray-400 italic">
          Read-only from Finance module
        </p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {expenses.map((ex) => (
              <tr key={ex.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                    {ex.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {ex.description}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {fmt(ex.amount)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{ex.date}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${expStatusBadge[ex.status]}`}
                  >
                    {ex.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocumentsTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [docList, setDocList] = useState(docs);

  /**
   * Delegates to the app-wide toaster. This used to render a bespoke
   * bottom-right box that showed failures in the same neutral style as
   * successes, and sat in a different corner from every other toast in
   * the app.
   */
  function showToast(msg: string) {
    toast.success(msg);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocList((prev) => [
      ...prev,
      {
        id: `d${Date.now()}`,
        name: file.name,
        type: file.name.split(".").pop()?.toUpperCase() ?? "FILE",
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        uploadedBy: "You",
        date: new Date().toISOString().split("T")[0],
        version: "v1.0",
      },
    ]);
    showToast(`"${file.name}" uploaded successfully`);
    e.target.value = "";
  }

  const filtered = docList.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex items-center justify-between gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-64"
          />
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
        >
          <Upload className="w-3.5 h-3.5" /> Upload
        </button>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Size
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Version
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Uploaded By
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Date
              </th>
              <th className="px-4 py-3 w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="font-medium text-gray-900 text-sm">
                      {d.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                    {d.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{d.size}</td>
                <td className="px-4 py-3 text-xs text-blue-600 font-medium">
                  {d.version}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {d.uploadedBy}
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">{d.date}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => showToast(`Previewing "${d.name}"…`)}
                      className="p-1 rounded hover:bg-gray-200 text-gray-400"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => showToast(`Downloading "${d.name}"…`)}
                      className="p-1 rounded hover:bg-gray-200 text-gray-400"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActivityTab() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-5">Activity Log</h3>
      <div className="space-y-4">
        {activityLog.map((a, i) => (
          <div key={a.id} className="flex items-start gap-4">
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-1">
              <div
                className={`w-2.5 h-2.5 rounded-full ${catLogColor[a.category] ?? "bg-gray-400"}`}
              />
              {i < activityLog.length - 1 && (
                <div className="w-px flex-1 h-8 bg-gray-200 mt-1" />
              )}
            </div>
            <div className="flex-1 pb-2 border-b border-gray-50 last:border-0">
              <p className="text-sm text-gray-900">{a.action}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-xs text-gray-400">
                  by <span className="text-gray-600 font-medium">{a.user}</span>
                </p>
                <span className="text-gray-300">·</span>
                <p className="text-xs text-gray-400">{a.time}</p>
                <span className="text-gray-300">·</span>
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded capitalize">
                  {a.category}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: "overview",
    label: "Overview",
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  { id: "schedule", label: "Schedule", icon: <Clock className="w-4 h-4" /> },
  { id: "tasks", label: "Tasks / WBS", icon: <ListTodo className="w-4 h-4" /> },
  { id: "workforce", label: "Workforce", icon: <Users className="w-4 h-4" /> },
  {
    id: "materials",
    label: "Materials",
    icon: <Package className="w-4 h-4" />,
  },
  { id: "equipment", label: "Equipment", icon: <Cog className="w-4 h-4" /> },
  { id: "expenses", label: "Expenses", icon: <Receipt className="w-4 h-4" /> },
  {
    id: "documents",
    label: "Documents",
    icon: <FileText className="w-4 h-4" />,
  },
  { id: "activity", label: "Activity", icon: <History className="w-4 h-4" /> },
];

const statusBadge: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Planning: "bg-blue-100 text-blue-700",
  "On Hold": "bg-amber-100 text-amber-700",
  Completed: "bg-gray-100 text-gray-600",
};

export function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [showEdit, setShowEdit] = useState(false);
  const [pOverride, setPOverride] = useState<{
    name: string;
    status: string;
    progress: number;
    manager: string;
  } | null>(null);

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [projectWorkers, setProjectWorkers] = useState<Worker[]>([]);
  const [projectExpenses, setProjectExpenses] = useState<Expense[]>([]);
  const [, setProjectResources] = useState<any[]>([]);
  useEffect(() => {
    if (!id) return;

    // Load project details
    fetchProjects()
      .then((items) => {
        const found = items.find((item: any) => item.id === id) ?? items[0];
        setProject(
          found
            ? {
                id: found.id,
                name: found.name,
                client: found.client,
                location: found.location,
                status: found.status,
                type: found.type,
                budget: found.budget,
                spent: found.spent,
                progress: found.progress,
                startDate: found.startDate,
                endDate: found.endDate,
                manager: found.manager,
                team: Array.isArray(found.team) ? found.team.length : 0,
                description: (found as any).description ?? "",
              }
            : null,
        );
      })
      .catch((err) => notifyLoadFailure("projects", err));

    // Load project-specific data
    Promise.all([
      getTasks()
        .then((items) =>
          setProjectTasks(
            items
              .filter((t: any) => t.projectId === id)
              .map((t: any) => ({
                id: t.id,
                name: t.title ?? t.name ?? "Untitled Task",
                parent: null,
                assignee: t.assignedTo ?? "Unassigned",
                startDate: t.createdAt ?? t.startDate ?? "",
                endDate: t.dueDate ?? t.endDate ?? t.createdAt ?? "",
                status:
                  t.status === "done" || t.status === "completed"
                    ? "done"
                    : t.status === "in-progress" || t.status === "InProgress"
                      ? "in-progress"
                      : t.status === "blocked"
                        ? "blocked"
                        : "todo",
                priority:
                  t.priority === "critical" ||
                  t.priority === "high" ||
                  t.priority === "medium" ||
                  t.priority === "low"
                    ? t.priority
                    : "medium",
                progress: Number(t.progress ?? 0),
              })),
          ),
        )
        .catch((err) => notifyLoadFailure("tasks", err)),
      getWorkforceAllocations()
        .then((items) =>
          setProjectWorkers(
            items
              .filter((w: any) => w.projectId === id)
              .map((w: any) => ({
                id: w.id,
                name: w.employeeName ?? "",
                role: w.role ?? "",
                phone: "—",
                attendance: "present" as const,
                hoursThisWeek: Math.max(
                  0,
                  Math.round(Number(w.allocPct ?? 0) * 0.4),
                ),
              })),
          ),
        )
        .catch((err) => notifyLoadFailure("workforce allocations", err)),
      fetchExpenses({ projectId: id })
        .then((items) =>
          setProjectExpenses(
            items.map((e: any) => ({
              id: e.id,
              category: e.category ?? "Other",
              description: e.description ?? "",
              amount: Number(e.amount ?? 0),
              date: e.date ?? "",
              status:
                e.status === "Approved"
                  ? "approved"
                  : e.status === "Rejected"
                    ? "rejected"
                    : "pending",
            })),
          ),
        )
        .catch((err) => notifyLoadFailure("expenses", err)),
      getResourcePlans()
        .then((items) =>
          setProjectResources(items.filter((r: any) => r.projectId === id)),
        )
        .catch((err) => notifyLoadFailure("resource plans", err)),
    ]);
  }, [id]);

  if (!project) {
    return (
      <div className="py-16 text-center text-sm text-gray-400">
        Project details are not available.
      </div>
    );
  }

  const p = project;
  const pDisplay = pOverride ? { ...p, ...pOverride } : p;

  return (
    <div className="space-y-5">
      {/* Back + header */}
      <div>
        <button
          onClick={() => navigate("/apps/construction")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </button>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {pDisplay.name}
                </h1>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge[pDisplay.status] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {pDisplay.status}
                </span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                  {p.type}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {p.location}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {pDisplay.manager}
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  {p.client}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDateByGeneralSettings(p.startDate)}{" "}
                  →{" "}
                  {formatDateByGeneralSettings(p.endDate)}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 max-w-xs bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${pDisplay.progress}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {pDisplay.progress}% complete
                </span>
              </div>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => {
                  setPOverride({
                    name: pDisplay.name,
                    status: pDisplay.status,
                    progress: pDisplay.progress,
                    manager: pDisplay.manager,
                  });
                  setShowEdit(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                <Edit className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? "border-orange-600 text-orange-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-5">
          {activeTab === "overview" && <OverviewTab p={p} />}
          {activeTab === "schedule" && <ScheduleTab />}
          {activeTab === "tasks" && <TasksTab tasks={projectTasks} />}
          {activeTab === "workforce" && (
            <WorkforceTab workers={projectWorkers} />
          )}
          {activeTab === "materials" && <MaterialsTab materials={materials} />}
          {activeTab === "equipment" && <EquipmentTab />}
          {activeTab === "expenses" && (
            <ExpensesTab expenses={projectExpenses} />
          )}
          {activeTab === "documents" && <DocumentsTab />}
          {activeTab === "activity" && <ActivityTab />}
        </div>
      </div>

      {/* Edit Project Modal */}
      {showEdit && pOverride && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                Edit Project Info
              </h2>
              <button
                onClick={() => setShowEdit(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowEdit(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={pOverride.name}
                  onChange={(e) =>
                    setPOverride((o) => o && { ...o, name: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={pOverride.status}
                  onChange={(e) =>
                    setPOverride((o) => o && { ...o, status: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {[
                    "Active",
                    "Planning",
                    "On Hold",
                    "Completed",
                    "Cancelled",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Progress ({pOverride.progress}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={pOverride.progress}
                  onChange={(e) =>
                    setPOverride(
                      (o) => o && { ...o, progress: Number(e.target.value) },
                    )
                  }
                  className="w-full accent-orange-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manager
                </label>
                <input
                  type="text"
                  value={pOverride.manager}
                  onChange={(e) =>
                    setPOverride((o) => o && { ...o, manager: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
