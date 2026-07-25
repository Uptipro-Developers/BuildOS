import { useNavigate } from "react-router";
import { useState, useMemo } from "react";
import {
  LayoutDashboard, FolderKanban, MapPin, Calendar, Users,
  DollarSign, Search, Filter, ChevronRight, TrendingUp,
  AlertTriangle, CheckCircle, PieChart, BarChart3, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  projects, fmtCurrency, fmtDate, ragColor, ragLabel,
  ragBg, ragText, clusters,
} from "./mockData";
import type { RAGStatus } from "./types";

const RAG_HEX: Record<RAGStatus, string> = {
  "on-track": "#27AE60",
  "at-risk": "#F4A623",
  "delayed": "#E74C3C",
};

const RAG_BG_HEX: Record<RAGStatus, string> = {
  "on-track": "#E8F8F0",
  "at-risk": "#FEF5E7",
  "delayed": "#FDEDED",
};

function scheduleInfo(plannedEndDate: string): { label: string; color: string } {
  const now = Date.now();
  const end = new Date(plannedEndDate).getTime();
  const diff = end - now;
  if (diff < 0) return { label: "Overdue", color: "#E74C3C" };
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  if (diff < oneWeek) return { label: "Due soon", color: "#F4A623" };
  return { label: "On schedule", color: "#27AE60" };
}

export function PortfolioDashboardPage() {
  const navigate = useNavigate();
  const [clusterFilter, setClusterFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [ragFilter, setRagFilter] = useState<RAGStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const activeProjects = useMemo(
    () => projects.filter(p => p.status === "Active"),
    []
  );

  const stats = useMemo(() => {
    const onTrack = activeProjects.filter(p => p.ragStatus === "on-track").length;
    const atRisk = activeProjects.filter(p => p.ragStatus === "at-risk").length;
    const delayed = activeProjects.filter(p => p.ragStatus === "delayed").length;
    const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
    const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
    return [
      { label: "Active Projects", value: activeProjects.length, icon: FolderKanban, accent: "#E8973A" },
      { label: "On Track", value: onTrack, dot: true, accent: RAG_HEX["on-track"] },
      { label: "At Risk", value: atRisk, dot: true, accent: RAG_HEX["at-risk"] },
      { label: "Delayed", value: delayed, dot: true, accent: RAG_HEX["delayed"] },
      { label: "Total Budget", value: fmtCurrency(totalBudget), icon: DollarSign, accent: "#1A202C" },
      { label: "Total Spent", value: fmtCurrency(totalSpent), icon: TrendingUp, accent: "#718096" },
    ];
  }, [activeProjects]);

  const filtered = useMemo(
    () => {
      let base = projects;
      if (statusFilter !== "All") {
        base = base.filter(p => p.status === statusFilter);
      }
      return base.filter(p => {
        if (clusterFilter !== "All" && p.clusterId !== clusterFilter) return false;
        if (ragFilter !== "All" && p.ragStatus !== ragFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!p.name.toLowerCase().includes(q) && !p.client.toLowerCase().includes(q)) return false;
        }
        if (dateFrom && new Date(p.plannedStartDate) < new Date(dateFrom)) return false;
        if (dateTo && new Date(p.plannedEndDate) > new Date(dateTo)) return false;
        return true;
      });
    },
    [projects, clusterFilter, statusFilter, ragFilter, search, dateFrom, dateTo]
  );

  return (
    <div className="space-y-5">
      {/* Dark header */}
      <div
        className="rounded-lg p-5 flex items-center justify-between"
        style={{ backgroundColor: "#1C2333" }}
      >
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-5 h-5" style={{ color: "#E8973A" }} />
          <div>
            <h1 className="text-xl font-semibold text-white">Portfolio Dashboard</h1>
            <p className="text-sm mt-0.5" style={{ color: "#94A3B8" }}>
              Executive overview &middot; {activeProjects.length} active projects
            </p>
          </div>
        </div>
        <div
          className="text-xs font-medium px-3 py-1.5 rounded-full"
          style={{ backgroundColor: "rgba(232,151,58,0.15)", color: "#E8973A" }}
        >
          Q2 2026
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => (
          <div
            key={s.label}
            className="bg-white rounded-lg border p-4"
            style={{ borderColor: "#E2E8F0" }}
          >
            <p className="text-xs font-medium mb-2" style={{ color: "#718096" }}>{s.label}</p>
            <div className="flex items-center gap-2">
              {"dot" in s && s.dot ? (
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.accent }} />
              ) : "icon" in s && s.icon ? (
                <s.icon className="w-4 h-4 flex-shrink-0" style={{ color: s.accent }} />
              ) : null}
              <span className="text-lg font-bold" style={{ color: "#1A202C" }}>
                {s.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        {/* RAG Distribution */}
        <div className="bg-white rounded-lg border p-5" style={{ borderColor: "#E2E8F0" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "#1A202C" }}>Project Health (RAG)</h3>
          {(["on-track", "at-risk", "delayed"] as const).map(r => {
            const count = activeProjects.filter(p => p.ragStatus === r).length;
            const pct = Math.round((count / Math.max(activeProjects.length, 1)) * 100);
            return (
              <div key={r} className="flex items-center gap-3 mb-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: RAG_HEX[r] }} />
                <span className="text-sm flex-1" style={{ color: "#718096" }}>{(r === "on-track" ? "On Track" : r === "at-risk" ? "At Risk" : "Delayed")}</span>
                <span className="text-sm font-medium" style={{ color: "#1A202C" }}>{count}</span>
                <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: RAG_HEX[r] }} />
                </div>
                <span className="text-xs" style={{ color: "#718096" }}>{pct}%</span>
              </div>
            );
          })}
        </div>
        {/* Budget vs Spend Summary */}
        <div className="bg-white rounded-lg border p-5" style={{ borderColor: "#E2E8F0" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "#1A202C" }}>Budget vs Spend</h3>
          {(() => {
            const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
            const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
            const pct = Math.round((totalSpent / totalBudget) * 100);
            const remaining = totalBudget - totalSpent;
            return (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: "#718096" }}>Total Budget</span>
                  <span className="text-sm font-bold" style={{ color: "#1A202C" }}>{fmtCurrency(totalBudget)}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: "#718096" }}>Spent to Date</span>
                  <span className="text-sm font-bold" style={{ color: "#3B82F6" }}>{fmtCurrency(totalSpent)}</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm" style={{ color: "#718096" }}>Remaining</span>
                  <span className="text-sm font-bold" style={{ color: remaining >= 0 ? "#27AE60" : "#E74C3C" }}>{fmtCurrency(remaining)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct > 90 ? "#E74C3C" : pct > 75 ? "#F4A623" : "#27AE60" }} />
                </div>
                <div className="flex justify-between text-xs mt-1" style={{ color: "#718096" }}>
                  <span>0%</span>
                  <span>{pct}% utilised</span>
                  <span>100%</span>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Filter bar */}
      <div
        className="bg-white rounded-lg border p-4"
        style={{ borderColor: "#E2E8F0" }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4" style={{ color: "#718096" }} />
          {/* Cluster */}
          <select
            value={clusterFilter}
            onChange={e => setClusterFilter(e.target.value)}
            className="border rounded-md text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            style={{ borderColor: "#E2E8F0", color: "#1A202C" }}
          >
            <option value="All">All Clusters</option>
            {clusters.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {/* Status */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border rounded-md text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            style={{ borderColor: "#E2E8F0", color: "#1A202C" }}
          >
            <option value="All">All Statuses</option>
            {["Active", "On Hold", "Completed", "Cancelled"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {/* RAG */}
          <select
            value={ragFilter}
            onChange={e => setRagFilter(e.target.value as RAGStatus | "All")}
            className="border rounded-md text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            style={{ borderColor: "#E2E8F0", color: "#1A202C" }}
          >
            <option value="All">All RAG</option>
            {(["on-track", "at-risk", "delayed"] as const).map(r => (
              <option key={r} value={r}>{ragLabel(r)}</option>
            ))}
          </select>
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#718096" }} />
            <input
              type="text"
              placeholder="Search project or client..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              style={{ borderColor: "#E2E8F0", color: "#1A202C" }}
            />
          </div>
          {/* Date range */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: "#718096" }} />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="border rounded-md text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              style={{ borderColor: "#E2E8F0", color: "#1A202C" }}
              title="From date"
            />
            <span className="text-xs" style={{ color: "#718096" }}>—</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="border rounded-md text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              style={{ borderColor: "#E2E8F0", color: "#1A202C" }}
              title="To date"
            />
          </div>
          <span className="text-xs ml-auto" style={{ color: "#718096" }}>
            {filtered.length} of {projects.length} projects
          </span>
        </div>
      </div>

      {/* Project cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(project => {
          const pct = Math.min(Math.round((project.spent / project.budget) * 100), 100);
          const schedule = scheduleInfo(project.plannedEndDate);
          return (
            <div
              key={project.id}
              onClick={() => navigate(`/apps/construction/projects/${project.id}`)}
              className="bg-white rounded-lg border cursor-pointer hover:shadow-md transition-shadow relative"
              style={{ borderColor: "#E2E8F0" }}
            >
              <div className="p-4 space-y-3">
                {/* Name + RAG badge */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold truncate" style={{ color: "#1A202C" }}>
                    {project.name}
                  </h3>
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                    style={{ backgroundColor: RAG_BG_HEX[project.ragStatus], color: RAG_HEX[project.ragStatus] }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: RAG_HEX[project.ragStatus] }} />
                    {ragLabel(project.ragStatus)}
                  </span>
                </div>

                {/* Client + location */}
                <div className="space-y-1 text-xs" style={{ color: "#718096" }}>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{project.client}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{project.location}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: "#718096" }}>Overall</span>
                    <span className="font-medium" style={{ color: "#1A202C" }}>{pct}%</span>
                  </div>
                  <div className="w-full rounded-full h-1.5" style={{ backgroundColor: "#E2E8F0" }}>
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: RAG_HEX[project.ragStatus] }}
                    />
                  </div>
                </div>

                {/* Schedule status + last report */}
                <div
                  className="flex items-center justify-between text-xs pt-2"
                  style={{ borderTop: "1px solid #E2E8F0", color: "#718096" }}
                >
                  <div className="flex items-center gap-1.5">
                    {schedule.label === "On schedule" ? (
                      <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: schedule.color }} />
                    ) : (
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: schedule.color }} />
                    )}
                    <span style={{ color: schedule.color }}>{schedule.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {project.lastReportDate ? (
                      <>
                        {Math.floor(
                          (Date.now() - new Date(project.lastReportDate).getTime()) / 86400000
                        ) > 1 && (
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: "#F4A623" }} />
                        )}
                        <span>{fmtDate(project.lastReportDate)}</span>
                      </>
                    ) : (
                      <span style={{ color: "#E74C3C" }}>No report</span>
                    )}
                  </div>
                </div>

                {/* Setup progress bar (only when setup is incomplete) */}
                {project.setupComplete === false && project.setupProgress != null && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span style={{ color: "#718096" }}>Setup</span>
                      <span className="font-medium" style={{ color: "#1A202C" }}>{project.setupProgress}%</span>
                    </div>
                    <div className="w-full rounded-full h-1" style={{ backgroundColor: "#E2E8F0" }}>
                      <div
                        className="h-1 rounded-full transition-all"
                        style={{ width: `${project.setupProgress}%`, backgroundColor: "#94A3B8" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Chevron indicator */}
              <ChevronRight
                className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "#CBD5E0" }}
              />
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-12">
          <FolderKanban className="w-10 h-10 mx-auto mb-3" style={{ color: "#CBD5E0" }} />
          <p className="text-sm font-medium" style={{ color: "#718096" }}>No matching projects</p>
          <p className="text-xs mt-1" style={{ color: "#A0AEC0" }}>Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
