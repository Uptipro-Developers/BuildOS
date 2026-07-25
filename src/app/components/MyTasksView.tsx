import { useState } from "react";
import type { ReactNode } from "react";
import {
  CalendarDays, User, PlayCircle, Send, ThumbsUp, ThumbsDown,
  ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle, AlertCircle, Circle,
} from "lucide-react";
import { useNumbering } from "../stores/numberingStore";
import { ApprovalPipeline } from "./ApprovalPipeline";
import type { PipelineStep } from "./ApprovalPipeline";

type TaskStatus = "To Do" | "In Progress" | "Awaiting Approval" | "Approved" | "Declined";
type TaskPriority = "Low" | "Medium" | "High";

interface MyTask {
  id: string;
  name: string;
  description: string;
  assignedTo: string;
  assignedBy: string;
  dueDate: string;
  priority: TaskPriority;
  category: "process" | "general";
  status: TaskStatus;
  startedAt?: string;
  submittedAt?: string;
  resolvedAt?: string;
  declineReason?: string;
}

export interface MyTasksViewProps {
  app: string;
  accentColor?: string;
  ringColor?: string;
  accentClass?: string;
  accentTextClass?: string;
}

const MOCK_USERS: Record<string, string[]> = {
  finance:      ["Amara Lawson", "Femi Bode", "Ngozi Eze", "Sola Adeleke"],
  hr:           ["Ngozi Okafor", "Tunde Bello", "Musa Ibrahim", "Fatima Yusuf"],
  procurement:  ["Kene Obi", "Lawal Musa", "Emeka Nwosu", "Chidi Ogbu"],
  storefront:   ["Ike Eze", "Bola Adewale", "Tayo Fashola", "Ada Okonkwo"],
  construction: ["Chukwudi Eze", "Amara Lawson", "Femi Bode", "Ngozi Okafor"],
};

const MANAGERS: Record<string, string> = {
  finance:      "Finance Manager",
  hr:           "HR Manager",
  procurement:  "Procurement Manager",
  storefront:   "Store Manager",
  construction: "Project Manager",
};

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  Low:    "px-1.5 py-0.5 text-xs rounded font-semibold bg-gray-100 text-gray-500",
  Medium: "px-1.5 py-0.5 text-xs rounded font-semibold bg-amber-100 text-amber-700",
  High:   "px-1.5 py-0.5 text-xs rounded font-semibold bg-red-100 text-red-700",
};

type SeedDef = {
  name: string; description: string; priority: TaskPriority;
  category: "process" | "general"; status: TaskStatus; userIdx: number;
  dueDate: string; startedAt?: string; submittedAt?: string;
  resolvedAt?: string; declineReason?: string;
};

const APP_SEEDS: Record<string, SeedDef[]> = {
  finance: [
    { name: "Review Q1 expense reports",  description: "Validate all Q1 submissions before the audit.", priority: "High",   category: "process", status: "In Progress",       userIdx: 0, dueDate: "2026-04-18", startedAt: "2026-04-10" },
    { name: "Prepare payroll report",     description: "Generate April payroll summary for finance.",  priority: "Medium", category: "process", status: "To Do",             userIdx: 0, dueDate: "2026-04-20" },
    { name: "Update GL reconciliation",   description: "Reconcile all GL entries for March 2026.",    priority: "Medium", category: "process", status: "Awaiting Approval",  userIdx: 1, dueDate: "2026-04-15", startedAt: "2026-04-08", submittedAt: "2026-04-13" },
    { name: "Supplier invoice check",     description: "Match invoices to POs for block A.",           priority: "Low",    category: "general", status: "Approved",           userIdx: 2, dueDate: "2026-04-12", startedAt: "2026-04-06", submittedAt: "2026-04-11", resolvedAt: "2026-04-12" },
    { name: "Month-end journal entries",  description: "Post all month-end adjustment entries.",       priority: "High",   category: "process", status: "To Do",             userIdx: 3, dueDate: "2026-04-16" },
    { name: "VAT return preparation",     description: "Prepare Q1 VAT return for filing.",            priority: "High",   category: "process", status: "Declined",          userIdx: 1, dueDate: "2026-04-22", startedAt: "2026-04-09", submittedAt: "2026-04-12", resolvedAt: "2026-04-13", declineReason: "Figures don't match bank statement. Please re-check and resubmit." },
  ],
  hr: [
    { name: "Update employee leave balances", description: "Carry forward unused leave from Q1.",        priority: "High",   category: "process", status: "In Progress",       userIdx: 0, dueDate: "2026-04-18", startedAt: "2026-04-11" },
    { name: "Process new hire onboarding",    description: "Complete documentation for 3 new hires.",    priority: "High",   category: "process", status: "To Do",             userIdx: 0, dueDate: "2026-04-20" },
    { name: "Schedule performance reviews",   description: "Book slots for Q2 appraisals.",              priority: "Medium", category: "process", status: "Awaiting Approval",  userIdx: 1, dueDate: "2026-04-17", startedAt: "2026-04-09", submittedAt: "2026-04-13" },
    { name: "Review payroll deductions",      description: "Verify statutory deductions for April run.", priority: "Medium", category: "process", status: "Approved",           userIdx: 2, dueDate: "2026-04-12", startedAt: "2026-04-07", submittedAt: "2026-04-10", resolvedAt: "2026-04-11" },
    { name: "Update org chart",               description: "Reflect recent promotions in the org chart.",priority: "Low",    category: "general", status: "To Do",             userIdx: 3, dueDate: "2026-04-25" },
    { name: "Conduct exit interview",         description: "Exit interview for departing employee.",     priority: "Medium", category: "process", status: "Declined",          userIdx: 1, dueDate: "2026-04-14", startedAt: "2026-04-10", submittedAt: "2026-04-13", resolvedAt: "2026-04-14", declineReason: "Documentation incomplete. Please attach the signed exit form before resubmitting." },
  ],
  procurement: [
    { name: "Approve pending purchase requests", description: "Review 5 open PRs awaiting approval.",      priority: "High",   category: "process", status: "In Progress",       userIdx: 0, dueDate: "2026-04-16", startedAt: "2026-04-12" },
    { name: "Evaluate supplier quotes",          description: "Compare bids for reinforcement steel.",     priority: "High",   category: "process", status: "To Do",             userIdx: 0, dueDate: "2026-04-19" },
    { name: "Reconcile goods received",          description: "Match GRNs to purchase orders for March.", priority: "Medium", category: "process", status: "Awaiting Approval",  userIdx: 1, dueDate: "2026-04-17", startedAt: "2026-04-10", submittedAt: "2026-04-13" },
    { name: "Update stock reorder levels",       description: "Adjust reorder points based on Q1 usage.", priority: "Low",    category: "general", status: "Approved",           userIdx: 2, dueDate: "2026-04-11", startedAt: "2026-04-06", submittedAt: "2026-04-09", resolvedAt: "2026-04-10" },
    { name: "Prepare tender documents",          description: "Prepare ITT for civil works package.",     priority: "High",   category: "process", status: "To Do",             userIdx: 3, dueDate: "2026-04-22" },
    { name: "Verify delivery documentation",     description: "Check delivery notes against POs.",        priority: "Medium", category: "process", status: "Declined",          userIdx: 1, dueDate: "2026-04-13", startedAt: "2026-04-09", submittedAt: "2026-04-12", resolvedAt: "2026-04-13", declineReason: "3 delivery notes are missing. Follow up with supplier and resubmit." },
  ],
  storefront: [
    { name: "Monthly stock count",              description: "Physical count of all general store items.",priority: "High",   category: "process", status: "In Progress",       userIdx: 0, dueDate: "2026-04-18", startedAt: "2026-04-14" },
    { name: "Process transfer requests",         description: "Approve 4 pending inter-project transfers.",priority: "Medium", category: "process", status: "To Do",            userIdx: 0, dueDate: "2026-04-20" },
    { name: "Update item catalogue",             description: "Add new materials to the item master.",    priority: "Low",    category: "general", status: "Awaiting Approval",  userIdx: 1, dueDate: "2026-04-16", startedAt: "2026-04-10", submittedAt: "2026-04-13" },
    { name: "Reconcile store transactions",      description: "Match store records with finance entries.",priority: "Medium", category: "process", status: "Approved",           userIdx: 2, dueDate: "2026-04-12", startedAt: "2026-04-07", submittedAt: "2026-04-11", resolvedAt: "2026-04-12" },
    { name: "Check expiry dates",                description: "Identify near-expiry consumable items.",  priority: "Medium", category: "process", status: "To Do",             userIdx: 3, dueDate: "2026-04-21" },
    { name: "Bin card reconciliation",           description: "Reconcile bin cards with system stock.",  priority: "High",   category: "process", status: "Declined",          userIdx: 1, dueDate: "2026-04-13", startedAt: "2026-04-08", submittedAt: "2026-04-12", resolvedAt: "2026-04-13", declineReason: "Variance too large. Recount required for Section C." },
  ],
  construction: [
    { name: "Foundation inspection sign-off",  description: "Sign off on B1-B2 foundation pour report.", priority: "High",   category: "process", status: "In Progress",       userIdx: 0, dueDate: "2026-04-16", startedAt: "2026-04-13" },
    { name: "Update project schedule",          description: "Revise Gantt chart for Q2 activities.",    priority: "Medium", category: "process", status: "To Do",             userIdx: 0, dueDate: "2026-04-20" },
    { name: "Prepare site progress report",     description: "Monthly report for client — Downtown.",    priority: "High",   category: "process", status: "Awaiting Approval",  userIdx: 1, dueDate: "2026-04-17", startedAt: "2026-04-09", submittedAt: "2026-04-13" },
    { name: "Review subcontractor invoices",    description: "Check and approve invoices from 3 subs.",  priority: "Medium", category: "general", status: "Approved",           userIdx: 2, dueDate: "2026-04-11", startedAt: "2026-04-07", submittedAt: "2026-04-10", resolvedAt: "2026-04-11" },
    { name: "Concrete pour schedule review",    description: "Review timing for next week's pours.",     priority: "Medium", category: "process", status: "To Do",             userIdx: 3, dueDate: "2026-04-21" },
    { name: "Safety audit report",              description: "Complete HSE report for Block B.",          priority: "High",   category: "process", status: "Declined",          userIdx: 1, dueDate: "2026-04-14", startedAt: "2026-04-10", submittedAt: "2026-04-13", resolvedAt: "2026-04-14", declineReason: "Missing signatures on inspection checklist. Resubmit with all sections completed." },
  ],
};

function buildSeeds(app: string, getId: (module: string) => string): MyTask[] {
  const users  = MOCK_USERS[app]  ?? ["Team Member"];
  const manager = MANAGERS[app]  ?? "Manager";
  const seeds  = APP_SEEDS[app]  ?? APP_SEEDS.finance;
  return seeds.map((s) => ({
    id:           getId("MyTask"),
    name:         s.name,
    description:  s.description,
    assignedTo:   users[s.userIdx % users.length],
    assignedBy:   manager,
    dueDate:      s.dueDate,
    priority:     s.priority,
    category:     s.category,
    status:       s.status,
    startedAt:    s.startedAt,
    submittedAt:  s.submittedAt,
    resolvedAt:   s.resolvedAt,
    declineReason: s.declineReason,
  }));
}

function computePipeline(task: MyTask): PipelineStep[] {
  const notStarted = task.status === "To Do";
  const notSubmitted = notStarted || task.status === "In Progress";
  const notResolved = notSubmitted || task.status === "Awaiting Approval";
  const isDeclined = task.status === "Declined";

  return [
    {
      label: "Assigned",
      actor: task.assignedBy,
      status: "completed",
    },
    {
      label: "Started",
      actor: task.assignedTo,
      status: notStarted ? "pending" : "completed",
      date: task.startedAt,
    },
    {
      label: "Submitted",
      actor: task.assignedTo,
      status: notSubmitted ? "pending" : task.status === "Awaiting Approval" ? "active" : "completed",
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
  status: TaskStatus;
  label: string;
  headerClass: string;
  icon: ReactNode;
}

const COLUMNS: Column[] = [
  { status: "To Do",             label: "To Do",             headerClass: "bg-gray-50 border-gray-200",     icon: <Circle        className="w-3.5 h-3.5 text-gray-400" /> },
  { status: "In Progress",       label: "In Progress",       headerClass: "bg-blue-50 border-blue-200",     icon: <Clock         className="w-3.5 h-3.5 text-blue-500" /> },
  { status: "Awaiting Approval", label: "Awaiting Approval", headerClass: "bg-amber-50 border-amber-200",   icon: <AlertCircle   className="w-3.5 h-3.5 text-amber-500" /> },
  { status: "Approved",          label: "Approved",          headerClass: "bg-emerald-50 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> },
  { status: "Declined",          label: "Declined",          headerClass: "bg-red-50 border-red-200",       icon: <XCircle       className="w-3.5 h-3.5 text-red-500" /> },
];

const TODAY = "2026-04-14";

export function MyTasksView({
  app,
  accentColor    = "bg-indigo-600 hover:bg-indigo-700",
  ringColor      = "focus:ring-indigo-500",
  accentClass    = "bg-indigo-600 border-indigo-600",
  accentTextClass = "text-indigo-700",
}: MyTasksViewProps) {
  const users = MOCK_USERS[app] ?? ["Team Member"];
  const { getNextId } = useNumbering();
  const [tasks, setTasks]         = useState<MyTask[]>(() => buildSeeds(app, getNextId));
  const [currentUser, setCurrentUser] = useState(users[0]);
  const [expandedId, setExpandedId]   = useState<string | null>(null);

  const myTasks = tasks.filter((t) => t.assignedTo === currentUser);

  function startTask(id: string) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: "In Progress", startedAt: TODAY } : t));
  }

  function submitTask(id: string) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: "Awaiting Approval", submittedAt: TODAY } : t));
  }

  function approveTask(id: string) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: "Approved", resolvedAt: TODAY } : t));
  }

  function declineTask(id: string) {
    setTasks((prev) => prev.map((t) =>
      t.id === id ? { ...t, status: "Declined", resolvedAt: TODAY, declineReason: "Declined by manager. Please review and resubmit." } : t
    ));
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track your assigned tasks and update their status</p>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Viewing as:</span>
          <select
            value={currentUser}
            onChange={(e) => { setCurrentUser(e.target.value); setExpandedId(null); }}
            className={`text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 ${ringColor}`}>
            {users.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Count pills */}
      <div className="flex flex-wrap gap-3">
        {COLUMNS.map((col) => {
          const count = myTasks.filter((t) => t.status === col.status).length;
          return (
            <div key={col.status} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1">
              {col.icon}
              <span className="text-xs text-gray-600 font-medium">{col.label}</span>
              <span className="text-xs font-bold text-gray-800 bg-gray-100 rounded-full px-1.5">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
        {COLUMNS.map((col) => {
          const colTasks = myTasks.filter((t) => t.status === col.status);
          return (
            <div key={col.status} className="flex-shrink-0 w-60">
              {/* Column header */}
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-t-xl border ${col.headerClass}`}>
                {col.icon}
                <span className="text-xs font-semibold text-gray-700 flex-1">{col.label}</span>
                <span className="text-xs font-bold bg-white/80 text-gray-600 px-1.5 py-0.5 rounded-full border border-current/10">
                  {colTasks.length}
                </span>
              </div>

              {/* Column body */}
              <div className="border border-t-0 rounded-b-xl bg-white min-h-[160px] divide-y divide-gray-50">
                {colTasks.length === 0 && (
                  <p className="py-6 text-center text-xs text-gray-300">No tasks</p>
                )}
                {colTasks.map((task) => {
                  const isExpanded = expandedId === task.id;
                  const overdue = !["Approved", "Declined"].includes(task.status) && task.dueDate < TODAY;

                  return (
                    <div key={task.id} className="p-3 space-y-2">
                      {/* Card top — clickable to expand */}
                      <div
                        className="cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : task.id)}>
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex gap-1 flex-wrap mb-1.5">
                              <span className={PRIORITY_BADGE[task.priority]}>{task.priority}</span>
                              <span className={`px-1.5 py-0.5 text-xs rounded font-semibold ${task.category === "process" ? "bg-sky-50 text-sky-700" : "bg-violet-50 text-violet-700"}`}>
                                {task.category === "process" ? "Process" : "General"}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 leading-snug">{task.name}</p>
                            <div className={`flex items-center gap-1 mt-1 text-xs ${overdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
                              <CalendarDays className="w-3 h-3" />
                              Due {task.dueDate}{overdue && " · Overdue"}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                              <User className="w-3 h-3" />
                              From: {task.assignedBy}
                            </div>
                          </div>
                          <span className="text-gray-300 pt-0.5">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </span>
                        </div>
                      </div>

                      {/* Expanded section */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 pt-2 space-y-3">
                          {task.description && (
                            <p className="text-xs text-gray-500 leading-relaxed">{task.description}</p>
                          )}
                          <ApprovalPipeline
                            steps={computePipeline(task)}
                            accentClass={accentClass}
                            accentTextClass={accentTextClass}
                          />
                          {task.declineReason && task.status === "Declined" && (
                            <div className="bg-red-50 border border-red-100 rounded-lg p-2">
                              <p className="text-xs text-red-700"><span className="font-semibold">Reason: </span>{task.declineReason}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      {task.status === "To Do" && (
                        <button
                          onClick={() => startTask(task.id)}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                          <PlayCircle className="w-3.5 h-3.5" /> Start Task
                        </button>
                      )}
                      {task.status === "In Progress" && (
                        <button
                          onClick={() => submitTask(task.id)}
                          className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-white rounded-lg transition-colors ${accentColor}`}>
                          <Send className="w-3.5 h-3.5" /> Submit as Done
                        </button>
                      )}
                      {task.status === "Awaiting Approval" && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => approveTask(task.id)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors">
                            <ThumbsUp className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => declineTask(task.id)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
                            <ThumbsDown className="w-3.5 h-3.5" /> Decline
                          </button>
                        </div>
                      )}
                      {task.status === "Declined" && (
                        <button
                          onClick={() => startTask(task.id)}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
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
