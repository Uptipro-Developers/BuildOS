import { useNavigate } from "react-router";
import {
  MapPin, Calendar, Users, ChevronRight, CheckCircle2, Clock, AlertCircle,
  Briefcase,
} from "lucide-react";

type TaskStatus = "done" | "in-progress" | "todo" | "blocked";

interface MyTask {
  id: string; name: string; project: string; status: TaskStatus; due: string; priority: "low" | "medium" | "high";
}

interface MyProject {
  id: string; name: string; location: string; role: string; progress: number;
  status: "active" | "on-hold"; startDate: string; endDate: string; teamSize: number; tag: string;
}

// ─── Mock data (James Okafor's view) ─────────────────────────────────────────

const myProjects: MyProject[] = [
  {
    id: "PRJ-001", name: "Downtown Office Complex", location: "Victoria Island, Lagos",
    role: "Site Engineer", progress: 65, status: "active",
    startDate: "2025-10-01", endDate: "2026-09-30", teamSize: 42, tag: "Phase 2 – Structural",
  },
  {
    id: "PRJ-002", name: "Riverside Residential", location: "Lekki Phase 1, Lagos",
    role: "Lead Engineer", progress: 42, status: "active",
    startDate: "2026-01-15", endDate: "2027-03-15", teamSize: 28, tag: "Foundation",
  },
];

const myTasks: MyTask[] = [
  { id: "TASK-001", name: "Foundation Works Inspection", project: "Downtown Office Complex", status: "in-progress", due: "2026-04-15", priority: "high" },
  { id: "TASK-002", name: "Safety Audit — Block B", project: "Downtown Office Complex", status: "todo", due: "2026-04-18", priority: "high" },
  { id: "TASK-003", name: "Concrete Pour Schedule Review", project: "Riverside Residential", status: "todo", due: "2026-04-20", priority: "medium" },
  { id: "TASK-004", name: "Site Photo Documentation", project: "Downtown Office Complex", status: "done", due: "2026-04-08", priority: "low" },
  { id: "TASK-005", name: "Rebar Installation QC Check", project: "Downtown Office Complex", status: "done", due: "2026-04-06", priority: "medium" },
  { id: "TASK-006", name: "Soil Compaction Test Review", project: "Riverside Residential", status: "blocked", due: "2026-04-14", priority: "high" },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const taskStatusConfig: Record<TaskStatus, { icon: React.ReactNode; badge: string; label: string }> = {
  "done":        { icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-500"  />, badge: "bg-green-100 text-green-700",  label: "Done"        },
  "in-progress": { icon: <Clock        className="w-3.5 h-3.5 text-blue-500"   />, badge: "bg-blue-100 text-blue-700",    label: "In Progress" },
  "todo":        { icon: <Clock        className="w-3.5 h-3.5 text-gray-400"   />, badge: "bg-gray-100 text-gray-600",    label: "To Do"       },
  "blocked":     { icon: <AlertCircle  className="w-3.5 h-3.5 text-red-500"    />, badge: "bg-red-100 text-red-700",      label: "Blocked"     },
};

const priorityDot: Record<string, string> = {
  low: "bg-green-400", medium: "bg-yellow-400", high: "bg-red-400",
};

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export function MyProjectsPage() {
  const navigate = useNavigate();
  const openTasks = myTasks.filter(t => t.status !== "done");
  const doneTasks = myTasks.filter(t => t.status === "done");

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">My Projects</h1>
        <p className="text-sm text-gray-500 mt-0.5">Projects you're assigned to and tasks waiting on you</p>
      </div>

      {/* Project cards */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Assigned Projects</h2>
        <div className="space-y-4">
          {myProjects.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-base font-semibold text-gray-900">{p.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                      {p.status === "active" ? "Active" : "On Hold"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.location}</span>
                    <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{p.role}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{p.teamSize} members</span>
                  </div>
                </div>
                <button onClick={() => navigate("/apps/ess/tasks")}
                  className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium">
                  Tasks <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mb-3">
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{p.tag}</span>
              </div>

              <div className="mb-1">
                <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1.5">
                  <span>Progress</span><span className="text-teal-700">{p.progress}%</span>
                </div>
                <ProgressBar value={p.progress} />
              </div>

              <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Start: {p.startDate}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />End: {p.endDate}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* My Tasks */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">My Tasks</h2>
          <span className="text-xs text-gray-400">{openTasks.length} open · {doneTasks.length} done</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {myTasks.map(t => {
            const sc = taskStatusConfig[t.status];
            return (
              <div key={t.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-shrink-0">{sc.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${t.status === "done" ? "line-through text-gray-400" : "text-gray-900"}`}>{t.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400 truncate">{t.project}</span>
                    {t.status === "blocked" && <span className="text-xs text-red-600 font-medium">⚠ Blocked</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />{t.due}
                  </div>
                  <span className={`w-2 h-2 rounded-full ${priorityDot[t.priority]}`} title={t.priority} />
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.badge}`}>{sc.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
