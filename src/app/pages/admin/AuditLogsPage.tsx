import { FileText, Download, Filter } from "lucide-react";
import { useState } from "react";
import { DataTable } from "../../components/DataTable";

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  details: string;
  ipAddress: string;
}

export function AuditLogsPage() {
  const [logs] = useState<AuditLog[]>([
    {
      id: "1",
      timestamp: "2026-04-07 14:35:22",
      user: "John Smith",
      action: "Created",
      module: "Projects",
      details: "Created project 'Harbor View Complex'",
      ipAddress: "192.168.1.100",
    },
    {
      id: "2",
      timestamp: "2026-04-07 14:30:15",
      user: "Sarah Johnson",
      action: "Updated",
      module: "Expenses",
      details: "Updated expense #EXP-1234 amount to $5,500",
      ipAddress: "192.168.1.105",
    },
    {
      id: "3",
      timestamp: "2026-04-07 14:25:10",
      user: "Michael Chen",
      action: "Approved",
      module: "Approvals",
      details: "Approved material request #MR-5678",
      ipAddress: "192.168.1.110",
    },
    {
      id: "4",
      timestamp: "2026-04-07 14:20:05",
      user: "Emily Davis",
      action: "Deleted",
      module: "Users",
      details: "Deleted user 'test@example.com'",
      ipAddress: "192.168.1.115",
    },
    {
      id: "5",
      timestamp: "2026-04-07 14:15:30",
      user: "Robert Wilson",
      action: "Login",
      module: "Authentication",
      details: "User logged in successfully",
      ipAddress: "192.168.1.120",
    },
    {
      id: "6",
      timestamp: "2026-04-07 14:10:45",
      user: "Lisa Anderson",
      action: "Updated",
      module: "Projects",
      details: "Updated project budget for 'Skyline Plaza'",
      ipAddress: "192.168.1.125",
    },
    {
      id: "7",
      timestamp: "2026-04-07 14:05:20",
      user: "David Lee",
      action: "Created",
      module: "Materials",
      details: "Added new material 'Steel Rebar 12mm'",
      ipAddress: "192.168.1.130",
    },
    {
      id: "8",
      timestamp: "2026-04-07 14:00:10",
      user: "Maria Garcia",
      action: "Exported",
      module: "Reports",
      details: "Exported project performance report",
      ipAddress: "192.168.1.135",
    },
    {
      id: "9",
      timestamp: "2026-04-07 13:55:30",
      user: "Thomas Brown",
      action: "Updated",
      module: "Settings",
      details: "Changed company currency to USD",
      ipAddress: "192.168.1.140",
    },
    {
      id: "10",
      timestamp: "2026-04-07 13:50:15",
      user: "Jennifer Wilson",
      action: "Created",
      module: "Employees",
      details: "Added new employee 'Alex Johnson'",
      ipAddress: "192.168.1.145",
    },
  ]);

  const columns = [
    {
      key: "timestamp",
      label: "Timestamp",
      sortable: true,
      render: (row: AuditLog) => (
        <span className="text-sm font-mono text-gray-900">{row.timestamp}</span>
      ),
    },
    {
      key: "user",
      label: "User",
      sortable: true,
    },
    {
      key: "action",
      label: "Action",
      sortable: true,
      render: (row: AuditLog) => {
        const colors: Record<string, string> = {
          Created: "bg-green-100 text-green-700",
          Updated: "bg-blue-100 text-blue-700",
          Deleted: "bg-red-100 text-red-700",
          Approved: "bg-purple-100 text-purple-700",
          Login: "bg-gray-100 text-gray-700",
          Exported: "bg-yellow-100 text-yellow-700",
        };
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              colors[row.action] || "bg-gray-100 text-gray-700"
            }`}
          >
            {row.action}
          </span>
        );
      },
    },
    {
      key: "module",
      label: "Module",
      sortable: true,
    },
    {
      key: "details",
      label: "Details",
      sortable: false,
      render: (row: AuditLog) => (
        <span className="text-sm text-gray-700">{row.details}</span>
      ),
    },
    {
      key: "ipAddress",
      label: "IP Address",
      sortable: true,
      render: (row: AuditLog) => (
        <span className="text-sm font-mono text-gray-600">{row.ipAddress}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Audit & Logs</h1>
          <p className="text-sm text-gray-600 mt-1">
            Track all user activities and system changes
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Logs</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {logs.length}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Today</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {logs.filter((log) => log.timestamp.startsWith("2026-04-07")).length}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Active Users</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">8</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Failed Logins</p>
          <p className="text-2xl font-semibold text-red-600 mt-1">0</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <div className="flex flex-wrap gap-4 flex-1">
            <select className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent">
              <option value="">All Actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
              <option value="approved">Approved</option>
              <option value="login">Login</option>
            </select>

            <select className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent">
              <option value="">All Modules</option>
              <option value="projects">Projects</option>
              <option value="expenses">Expenses</option>
              <option value="users">Users</option>
              <option value="settings">Settings</option>
            </select>

            <input
              type="date"
              className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <DataTable
        data={logs}
        columns={columns}
        searchable={true}
        exportable={true}
        pageSize={15}
      />
    </div>
  );
}
