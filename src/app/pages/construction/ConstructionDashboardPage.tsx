import { useState, useEffect } from "react";
import { safePercent } from "../../utils/number";
import { useNavigate } from "react-router";
import {
  formatDateByGeneralSettings,
  getCurrencySymbol,
} from "../../utils/generalSettings";
import {
  FolderKanban,
  AlertTriangle,
  TrendingUp,
  Users,
  Clock,
  DollarSign,
  CheckCircle,
  ArrowUpRight,
  ArrowRight,
  HardHat,
  Package,
  Activity,
} from "lucide-react";

import { fetchProjects } from "../../api/projects";
import { getConstructionApprovals } from "../../api/construction-extras";
import { getResourcePlans } from "../../api/resource-planning";

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  "on-track": {
    label: "On Track",
    color: "text-green-700",
    bg: "bg-green-100",
  },
  "at-risk": { label: "At Risk", color: "text-amber-700", bg: "bg-amber-100" },
  delayed: { label: "Delayed", color: "text-red-700", bg: "bg-red-100" },
};

function fmt(n: number) {
  const symbol = getCurrencySymbol();
  if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(1)}M`;
  return `${symbol}${(n / 1000).toFixed(0)}K`;
}

export function ConstructionDashboardPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<
    "all" | "on-track" | "at-risk" | "delayed"
  >("all");
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [resourcePlans, setResourcePlans] = useState<any[]>([]);

  useEffect(() => {
    fetchProjects()
      .then(setAllProjects)
      .catch(() => {});
    getConstructionApprovals()
      .then(setApprovals)
      .catch(() => {});
    getResourcePlans()
      .then(setResourcePlans)
      .catch(() => {});
  }, []);

  // Map API project statuses to dashboard display statuses
  const projects = allProjects.map((p) => ({
    ...p,
    status:
      p.status === "Delayed"
        ? "delayed"
        : p.status === "On Hold"
          ? "at-risk"
          : "on-track",
    dueDate: p.endDate || "—",
  }));

  // Compute KPI values from real data
  const activeCount = allProjects.filter(
    (p) => !["Completed", "Cancelled"].includes(p.status),
  ).length;
  const delayedCount = allProjects.filter((p) => p.status === "Delayed").length;
  const avgProgress = allProjects.length
    ? Math.round(
        allProjects.reduce((s, p) => s + (p.progress || 0), 0) /
          allProjects.length,
      )
    : 0;
  const totalBudget = allProjects.reduce((s, p) => s + (p.budget || 0), 0);
  const totalSpent = allProjects.reduce((s, p) => s + (p.spent || 0), 0);
  const spentPct = totalBudget
    ? Math.round((totalSpent / totalBudget) * 100)
    : 0;

  const kpis = [
    {
      label: "Active Projects",
      value: String(activeCount),
      sub: "Currently in progress",
      subColor: "text-green-600",
      icon: <FolderKanban className="w-5 h-5" />,
      iconBg: "bg-orange-100 text-orange-600",
    },
    {
      label: "Delayed Projects",
      value: String(delayedCount),
      sub: "Requires immediate action",
      subColor: "text-red-500",
      icon: <AlertTriangle className="w-5 h-5" />,
      iconBg: "bg-red-100 text-red-600",
    },
    {
      label: "Avg. Progress",
      value: `${avgProgress}%`,
      sub: "Across all active projects",
      subColor: "text-green-600",
      icon: <TrendingUp className="w-5 h-5" />,
      iconBg: "bg-green-100 text-green-600",
    },
    {
      label: "Total Workforce",
      value: String(resourcePlans.length),
      sub: "Resource plan entries",
      subColor: "text-gray-500",
      icon: <Users className="w-5 h-5" />,
      iconBg: "bg-blue-100 text-blue-600",
    },
    {
      label: "Total Budget",
      value: fmt(totalBudget),
      sub: `${fmt(totalSpent)} spent (${spentPct}%)`,
      subColor: "text-gray-500",
      icon: <DollarSign className="w-5 h-5" />,
      iconBg: "bg-purple-100 text-purple-600",
    },
    {
      label: "Pending Approvals",
      value: String(approvals.filter((a) => a.status === "pending").length),
      sub: "Awaiting review",
      subColor: "text-amber-600",
      icon: <Clock className="w-5 h-5" />,
      iconBg: "bg-amber-100 text-amber-600",
    },
  ];

  // Status breakdown from mapped projects
  const onTrackCount = projects.filter((p) => p.status === "on-track").length;
  const atRiskCount = projects.filter((p) => p.status === "at-risk").length;
  const delayedMapped = projects.filter((p) => p.status === "delayed").length;
  const totalMapped = projects.length || 1;

  const filtered = projects.filter(
    (p) => activeFilter === "all" || p.status === activeFilter,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Projects Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Overview of all project activities —{" "}
            {formatDateByGeneralSettings(new Date())}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/apps/construction/approvals")}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            <Clock className="w-3.5 h-3.5" />
            View Approvals
          </button>
          <button
            onClick={() => navigate("/apps/construction")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-md text-sm hover:bg-orange-700"
          >
            <FolderKanban className="w-3.5 h-3.5" />
            All Projects
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-500">{k.label}</p>
              <span className={`p-1.5 rounded-md ${k.iconBg}`}>{k.icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{k.value}</p>
            <p className={`text-xs mt-1 ${k.subColor}`}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Active Alerts</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-gray-400">
          <AlertTriangle className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">No alert data available.</p>
          <p className="text-xs mt-1">
            Connect an alerts endpoint to display project warnings here.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Project Progress Table */}
        <div className="col-span-3 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              Project Overview
            </h2>
            <div className="flex gap-1">
              {(["all", "on-track", "at-risk", "delayed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-2.5 py-1 rounded-md text-xs capitalize transition-colors ${
                    activeFilter === f
                      ? "bg-orange-100 text-orange-700 font-medium"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {f === "all" ? "All" : f.replace("-", " ")}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {filtered.map((p) => {
              const sc = statusConfig[p.status];
              const budgetPct = Math.round((p.spent / p.budget) * 100);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 cursor-pointer group"
                  onClick={() =>
                    navigate(`/apps/construction/projects/${p.id}`)
                  }
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {p.name}
                      </p>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${sc.bg} ${sc.color}`}
                      >
                        {sc.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {p.location} · {p.manager}
                    </p>
                  </div>
                  <div className="w-28 flex-shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Progress</span>
                      <span className="text-xs font-medium text-gray-900">
                        {p.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${p.status === "delayed" ? "bg-red-500" : p.status === "at-risk" ? "bg-amber-500" : "bg-green-500"}`}
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-28 flex-shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Budget</span>
                      <span className="text-xs font-medium text-gray-900">
                        {budgetPct}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${budgetPct > 90 ? "bg-red-500" : budgetPct > 75 ? "bg-amber-500" : "bg-blue-500"}`}
                        style={{ width: `${Math.min(budgetPct, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-gray-900">
                      {fmt(p.budget)}
                    </p>
                    <p className="text-xs text-gray-400">Due: {p.dueDate}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t border-gray-100">
            <button
              onClick={() => navigate("/apps/construction")}
              className="text-xs font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              View all projects <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-2 space-y-5">
          {/* Status breakdown */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Status Breakdown
            </h2>
            <div className="space-y-3">
              {[
                {
                  label: "On Track",
                  count: onTrackCount,
                  pct: safePercent(onTrackCount, totalMapped),
                  color: "bg-green-500",
                },
                {
                  label: "At Risk",
                  count: atRiskCount,
                  pct: safePercent(atRiskCount, totalMapped),
                  color: "bg-amber-500",
                },
                {
                  label: "Delayed",
                  count: delayedMapped,
                  pct: safePercent(delayedMapped, totalMapped),
                  color: "bg-red-500",
                },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${s.color}`} />
                      <span className="text-sm text-gray-700">{s.label}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {s.count} projects
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`${s.color} h-2 rounded-full`}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {fmt(totalBudget)}
                </p>
                <p className="text-xs text-gray-400">Total Budget</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {fmt(totalSpent)}
                </p>
                <p className="text-xs text-gray-400">Total Spent</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{spentPct}%</p>
                <p className="text-xs text-gray-400">Utilised</p>
              </div>
            </div>
          </div>

          {/* Module quick access */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Quick Access
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: "Approvals",
                  href: "/apps/construction/approvals",
                  icon: <CheckCircle className="w-4 h-4" />,
                  color: "text-amber-600 bg-amber-50",
                },
                {
                  label: "Documents",
                  href: "/apps/construction/documents",
                  icon: <HardHat className="w-4 h-4" />,
                  color: "text-blue-600 bg-blue-50",
                },
                {
                  label: "Resources",
                  href: "/apps/construction/resource-planning",
                  icon: <Users className="w-4 h-4" />,
                  color: "text-purple-600 bg-purple-50",
                },
                {
                  label: "Materials",
                  href: "/apps/construction/approvals",
                  icon: <Package className="w-4 h-4" />,
                  color: "text-green-600 bg-green-50",
                },
              ].map((qa) => (
                <button
                  key={qa.label}
                  onClick={() => navigate(qa.href)}
                  className="flex flex-col items-start gap-2 p-3 border border-gray-200 rounded-lg hover:border-orange-200 hover:bg-orange-50/30 transition-colors text-left"
                >
                  <span className={`p-1.5 rounded-md ${qa.color}`}>
                    {qa.icon}
                  </span>
                  <p className="text-xs font-medium text-gray-900">
                    {qa.label}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Recent Activity
            </h2>
            <div className="flex flex-col items-center justify-center py-6 text-gray-400">
              <Activity className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No activity log available.</p>
              <p className="text-xs mt-1">
                Connect an activity feed endpoint to show recent events.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
