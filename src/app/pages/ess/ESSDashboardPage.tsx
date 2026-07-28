import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  FileText,
  CheckCircle,
  Clock,
  FolderKanban,
  Bell,
  ChevronRight,
  AlertTriangle,
  MapPin,
  Plus,
} from "lucide-react";
import { fetchProjects } from "../../api/projects";
import { getPurchaseRequests } from "../../api/procurement-requests";
import { useAuthUser } from "../../utils/useAuthUser";
import { getGreeting } from "../../utils/generalSettings";

interface RecentRequest {
  id: string;
  type: string;
  title: string;
  project: string;
  date: string;
  status: string;
}
interface Notification {
  id: string;
  type: string;
  text: string;
  time: string;
  read: boolean;
}

const statusConfig: Record<string, { badge: string; icon: React.ReactNode }> = {
  pending: {
    badge: "bg-amber-100 text-amber-700",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  approved: {
    badge: "bg-green-100 text-green-700",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  rejected: {
    badge: "bg-red-100 text-red-700",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
};

const notifConfig: Record<string, { dot: string; bg: string }> = {
  approval: { dot: "bg-green-500", bg: "bg-green-50" },
  rejection: { dot: "bg-red-500", bg: "bg-red-50" },
  assignment: { dot: "bg-blue-500", bg: "bg-blue-50" },
  reminder: { dot: "bg-amber-500", bg: "bg-amber-50" },
};

export function ESSDashboardPage() {
  const navigate = useNavigate();
  const {
    name: authName,
    role: authRole,
    initials: authInitials,
  } = useAuthUser();
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<RecentRequest[]>([]);
  const [notifications] = useState<Notification[]>([]);
  const unreadNotifs = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    fetchProjects({ status: "Active" })
      .then(setAllProjects)
      .catch(() => {});
    getPurchaseRequests()
      .then((data) =>
        setAllRequests(
          data.map((r) => ({
            id: r.prRef || r.id,
            type: "Material Request",
            title: r.title,
            project: r.projectName || "—",
            date: r.createdAt ? r.createdAt.slice(0, 10) : "",
            status: (r.status || "pending").toLowerCase(),
          })),
        ),
      )
      .catch(() => {});
  }, []);

  const recentRequests = allRequests.slice(0, 5);
  const pendingCount = allRequests.filter((r) => r.status === "pending").length;
  const approvedCount = allRequests.filter(
    (r) => r.status === "approved",
  ).length;
  const totalRequests = allRequests.length;

  const myProjects = allProjects.map((p) => ({
    id: p.id,
    name: p.name,
    location: p.location || [p.city, p.state].filter(Boolean).join(", ") || "—",
    role: "Team Member",
    progress: p.progress || 0,
    status: p.status,
  }));

  const firstName = authName ? authName.split(" ")[0] : "there";
  const displayRole = authRole || "Employee";
  const displayInitials = authInitials || "?";

  return (
    <div className="space-y-6">
      {/* Welcome bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-base">
            {displayInitials}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {getGreeting()}, {firstName} 👋
            </h1>
            <p className="text-sm text-gray-500 capitalize">{displayRole}</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/apps/ess/submit")}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-teal-700"
        >
          <Plus className="w-4 h-4" /> Submit Request
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">Total Requests</p>
            <FileText className="w-4 h-4 text-teal-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalRequests}</p>
          <p className="text-xs text-gray-400 mt-0.5">All time</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">Pending</p>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
          <p className="text-xs text-amber-500 mt-0.5">Awaiting approval</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">Approved</p>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
          <p className="text-xs text-green-500 mt-0.5">All time</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">My Projects</p>
            <FolderKanban className="w-4 h-4 text-teal-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {myProjects.length}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Active assignments</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Recent Requests */}
        <div className="col-span-3 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              Recent Requests
            </h2>
            <button
              onClick={() => navigate("/apps/ess/requests")}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {recentRequests.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-gray-400">
                No requests yet.
              </p>
            )}
            {recentRequests.map((r) => {
              const sc = statusConfig[r.status];
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate("/apps/ess/requests")}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-gray-400 font-mono">
                        {r.id}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${r.type === "Material Request" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}
                      >
                        {r.type}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {r.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.project} · {r.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {sc.icon}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${sc.badge}`}
                    >
                      {r.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t border-gray-100">
            <button
              onClick={() => navigate("/apps/ess/submit")}
              className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-teal-200 text-teal-600 rounded-lg text-sm font-medium hover:bg-teal-50 transition-colors"
            >
              <Plus className="w-4 h-4" /> Submit New Request
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-2 space-y-5">
          {/* My Projects mini */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                My Projects
              </h2>
              <button
                onClick={() => navigate("/apps/ess/projects")}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
              >
                View <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {myProjects.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-gray-400">
                  No projects assigned.
                </p>
              )}
              {myProjects.map((p) => (
                <div key={p.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {p.name}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5 mb-2">
                    <MapPin className="w-3 h-3" />
                    {p.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-teal-500 h-1.5 rounded-full"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-600">
                      {p.progress}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    My role: {p.role}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-900">
                  Notifications
                </h2>
                {unreadNotifs > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {unreadNotifs}
                  </span>
                )}
              </div>
              <Bell className="w-4 h-4 text-gray-400" />
            </div>
            <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
              {notifications.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-gray-400">
                  No notifications.
                </p>
              )}
              {notifications.map((n) => {
                const nc = notifConfig[n.type];
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 ${!n.read ? nc.bg : ""}`}
                  >
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${nc.dot} ${n.read ? "opacity-30" : ""}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs leading-relaxed ${n.read ? "text-gray-400" : "text-gray-700 font-medium"}`}
                      >
                        {n.text}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
