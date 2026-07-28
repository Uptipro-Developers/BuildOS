import { useState, useEffect } from "react";
import {
  Users,
  Shield,
  Settings,
  Activity,
  ArrowUpRight,
  Info,
} from "lucide-react";
import { NavLink } from "react-router";
import {
  getAdminActivityLog,
  getAdminSystemSummary,
  getUsers,
  type AdminActivity,
  type AdminSystemSummary,
} from "../../api/admin-extras";
import { formatDateTimeByGeneralSettings } from "../../utils/generalSettings";

const ACTIVITY_PREVIEW_COUNT = 5;

export function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminSystemSummary | null>(null);
  const [activityLog, setActivityLog] = useState<AdminActivity[]>([]);
  const [allUsers, setAllUsers] = useState<{ lastLogin?: string }[]>([]);
  const [showAllActivity, setShowAllActivity] = useState(false);

  useEffect(() => {
    getAdminSystemSummary().then(setSummary).catch(console.error);
    getAdminActivityLog().then(setActivityLog).catch(console.error);
    getUsers().then(setAllUsers).catch(console.error);
  }, []);

  const fmt = (n: number | null) => (n === null ? "…" : String(n));
  const sinceCount = (days: number) => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return allUsers.filter(
      (u) => u.lastLogin && new Date(u.lastLogin).getTime() >= cutoff,
    ).length;
  };

  const dau = sinceCount(1);
  const wau = sinceCount(7);
  const mau = sinceCount(30);

  const metrics = [
    {
      label: "Total Users",
      value: fmt(summary?.users ?? null),
      delta: summary ? `${summary.users} registered` : null,
      deltaPositive: true,
      icon: Users,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
    },
    {
      label: "Active Roles",
      value: fmt(summary?.roles ?? null),
      delta: summary ? "Configured roles" : null,
      deltaPositive: null,
      icon: Shield,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
    {
      label: "Active Sessions",
      value: fmt(summary?.activeSessions ?? null),
      delta: summary ? "Current authenticated sessions" : null,
      deltaPositive: null,
      icon: Activity,
      iconBg: "bg-sky-100",
      iconColor: "text-sky-700",
    },
    {
      label: "System Health",
      value: summary?.health.status ?? "…",
      delta: summary
        ? `Uptime ${Math.round(summary.health.uptimeSeconds / 60)}m`
        : null,
      deltaPositive: null,
      icon: Settings,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
  ];

  const serviceStates = [
    {
      name: "Database",
      status:
        summary?.healthPercent === 100
          ? "Operational"
          : summary
            ? "Degraded"
            : "Checking",
      up: summary?.healthPercent === 100,
      detail: summary ? `Health ${summary.healthPercent}%` : "Running checks",
    },
    {
      name: "API",
      status:
        summary?.health.status === "healthy"
          ? "Operational"
          : summary
            ? "Degraded"
            : "Checking",
      up: summary?.health.status === "healthy",
      detail: summary
        ? `${summary.pendingApprovals} pending approvals`
        : "Collecting metrics",
    },
    {
      name: "Storage",
      status: summary ? "Operational" : "Checking",
      up: !!summary,
      detail: summary ? "File storage reachable" : "Collecting metrics",
    },
    {
      name: "Email",
      status: summary ? "Operational" : "Checking",
      up: !!summary,
      detail: summary
        ? `${summary.pendingInvites} pending invites`
        : "Collecting metrics",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          System management and configuration
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 font-medium">{m.label}</p>
              <div
                className={`w-8 h-8 rounded-lg ${m.iconBg} flex items-center justify-center`}
              >
                <m.icon className={`w-4 h-4 ${m.iconColor}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{m.value}</p>
            {m.delta && (
              <p
                className={`text-xs font-medium flex items-center gap-1 ${m.deltaPositive === true ? "text-emerald-600" : m.deltaPositive === false ? "text-red-500" : "text-gray-400"}`}
              >
                {m.deltaPositive === true && (
                  <ArrowUpRight className="w-3 h-3" />
                )}
                {m.delta}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            User Activity
          </h2>
          {summary === null ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : summary.users === 0 ? (
            <p className="text-sm text-gray-400">No users found.</p>
          ) : (
            <div className="space-y-4">
              {[
                {
                  label: "Daily Active Users",
                  value: dau,
                  max: Math.max(summary.users, 1),
                },
                {
                  label: "Weekly Active Users",
                  value: wau,
                  max: Math.max(summary.users, 1),
                },
                {
                  label: "Monthly Active Users",
                  value: mau,
                  max: Math.max(summary.users, 1),
                },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-gray-600">{item.label}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {item.value}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min((item.value / (item.max || 1)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Recent Activity
            </h2>
            {activityLog.length > ACTIVITY_PREVIEW_COUNT && (
              <button
                onClick={() => setShowAllActivity((v) => !v)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                {showAllActivity ? "Show less" : "View more"}
              </button>
            )}
          </div>
          <div
            className={`space-y-3 ${showAllActivity ? "max-h-80 overflow-y-auto pr-1" : ""}`}
          >
            {(showAllActivity
              ? activityLog
              : activityLog.slice(0, ACTIVITY_PREVIEW_COUNT)
            ).map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-lg bg-gray-50 border border-gray-100 p-3"
              >
                <Activity className="w-4 h-4 text-indigo-500 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.action}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {item.actor} · {item.subject}
                  </p>
                </div>
              </div>
            ))}
            {activityLog.length === 0 && (
              <p className="text-sm text-gray-400">No recent activity.</p>
            )}
          </div>
          {activityLog.length > ACTIVITY_PREVIEW_COUNT && (
            <NavLink
              to="/apps/admin/audit-logs"
              className="mt-3 inline-block text-xs font-medium text-gray-400 hover:text-indigo-600"
            >
              View full audit log →
            </NavLink>
          )}
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          System Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {serviceStates.map((svc) => (
            <div
              key={svc.name}
              className="rounded-lg border border-gray-100 p-3 bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-800">{svc.name}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${svc.up ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                >
                  {svc.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{svc.detail}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          {summary
            ? `Last checked ${formatDateTimeByGeneralSettings(new Date(summary.health.checkedAt))}`
            : "Loading system status…"}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="bg-linear-to-r from-indigo-50 to-slate-50 border border-indigo-100 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-500" />
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <NavLink
            to="/apps/admin/users"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Users className="w-4 h-4" />
            Manage Users
          </NavLink>
          <NavLink
            to="/apps/admin/roles"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <Shield className="w-4 h-4" />
            Manage Roles
          </NavLink>
          <NavLink
            to="/apps/admin/audit-logs"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <Activity className="w-4 h-4" />
            View Audit Log
          </NavLink>
          <NavLink
            to="/apps/admin/general-settings"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <Settings className="w-4 h-4" />
            Settings
          </NavLink>
        </div>
      </div>
    </div>
  );
}
