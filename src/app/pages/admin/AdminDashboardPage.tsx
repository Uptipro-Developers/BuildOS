import { Users, Shield, Settings, Activity, ArrowUpRight, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { NavLink } from "react-router";

export function AdminDashboardPage() {
  const metrics = [
    {
      label: "Total Users",
      value: "156",
      delta: "+8 this month",
      deltaPositive: true,
      icon: Users,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
    },
    {
      label: "Active Roles",
      value: "6",
      delta: "System roles",
      deltaPositive: null,
      icon: Shield,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
    {
      label: "Active Sessions",
      value: "89",
      delta: "Currently online",
      deltaPositive: true,
      icon: Activity,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      label: "System Health",
      value: "98%",
      delta: "All systems operational",
      deltaPositive: true,
      icon: Settings,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
  ];

  const systemStatus = [
    { name: "Database", status: "Operational" },
    { name: "API", status: "Operational" },
    { name: "Storage", status: "Operational" },
    { name: "Email", status: "Operational" },
  ];

  const recentActivity = [
    { color: "bg-emerald-500", title: "New user registered", detail: "john.smith@company.com", time: "1 hour ago" },
    { color: "bg-indigo-500", title: "Role permissions updated", detail: "Construction Manager role", time: "3 hours ago" },
    { color: "bg-amber-500", title: "System settings changed", detail: "Currency updated to USD", time: "5 hours ago" },
    { color: "bg-gray-400", title: "Company profile updated", detail: "Logo and branding", time: "Yesterday" },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">System management and configuration</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 font-medium">{m.label}</p>
              <div className={`w-8 h-8 rounded-lg ${m.iconBg} flex items-center justify-center`}>
                <m.icon className={`w-4 h-4 ${m.iconColor}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{m.value}</p>
            {m.delta && (
              <p className={`text-xs font-medium flex items-center gap-1 ${m.deltaPositive === true ? "text-emerald-600" : m.deltaPositive === false ? "text-red-500" : "text-gray-400"}`}>
                {m.deltaPositive === true && <ArrowUpRight className="w-3 h-3" />}
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
          <h2 className="text-sm font-semibold text-gray-900 mb-4">User Activity</h2>
          <div className="space-y-4">
            {[
              { label: "Daily Active Users", value: 89, max: 156 },
              { label: "Weekly Active Users", value: 134, max: 156 },
              { label: "Monthly Active Users", value: 156, max: 156 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="text-sm font-medium text-gray-900">{item.value}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-indigo-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${(item.value / item.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivity.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                <div className={`w-2 h-2 ${item.color} rounded-full mt-1.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-400">{item.detail} · {item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">System Status</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {systemStatus.map((s) => (
            <div key={s.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">{s.name}</p>
                <p className="text-xs text-emerald-600">{s.status}</p>
              </div>
            </div>
          ))}
        </div>
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
            to="/apps/admin/settings"
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
