import { useNavigate } from "react-router";
import {
  FileText, CheckCircle, Clock, FolderKanban, Bell,
  ChevronRight, AlertTriangle, MapPin, Plus,
} from "lucide-react";

// ─── Mock data for the logged-in employee ────────────────────────────────────

const currentUser = { name: "James Okafor", role: "Site Engineer", dept: "Engineering", avatar: "JO" };

const recentRequests = [
  { id: "REQ-0041", type: "Material Request", title: "Structural Steel I-beams", project: "Downtown Office Complex", date: "2026-04-09", status: "pending"  },
  { id: "REQ-0039", type: "Expense Request",  title: "Site Transport — Week 14", project: "Downtown Office Complex", date: "2026-04-07", status: "approved" },
  { id: "REQ-0037", type: "Material Request", title: "Portland Cement (200 bags)", project: "Riverside Residential", date: "2026-04-04", status: "approved" },
  { id: "REQ-0036", type: "Expense Request",  title: "Safety Gear Replacement",   project: "Downtown Office Complex", date: "2026-04-01", status: "rejected" },
];

const myProjects = [
  { id: "1", name: "Downtown Office Complex",  location: "New York, NY",  role: "Site Engineer", progress: 65, status: "Active"   },
  { id: "2", name: "Riverside Residential",    location: "Austin, TX",    role: "QS Support",    progress: 42, status: "Active"   },
];

const notifications = [
  { id: "n1", type: "approval", text: "Your material request REQ-0037 was approved",         time: "2 hours ago",  read: false },
  { id: "n2", type: "rejection", text: "REQ-0036 was rejected — re-submission required",      time: "Yesterday",    read: false },
  { id: "n3", type: "assignment", text: "You have been assigned to Riverside Residential",    time: "2 days ago",   read: true  },
  { id: "n4", type: "reminder", text: "Foundation Works task is due in 3 days",               time: "3 days ago",   read: true  },
];

const statusConfig: Record<string, { badge: string; icon: React.ReactNode }> = {
  pending:  { badge: "bg-amber-100 text-amber-700",  icon: <Clock       className="w-3.5 h-3.5" /> },
  approved: { badge: "bg-green-100 text-green-700",  icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rejected: { badge: "bg-red-100 text-red-700",      icon: <AlertTriangle className="w-3.5 h-3.5" /> },
};

const notifConfig: Record<string, { dot: string; bg: string }> = {
  approval:   { dot: "bg-green-500", bg: "bg-green-50"  },
  rejection:  { dot: "bg-red-500",   bg: "bg-red-50"    },
  assignment: { dot: "bg-blue-500",  bg: "bg-blue-50"   },
  reminder:   { dot: "bg-amber-500", bg: "bg-amber-50"  },
};

export function ESSDashboardPage() {
  const navigate = useNavigate();
  const pendingCount = recentRequests.filter(r => r.status === "pending").length;
  const unreadNotifs = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Welcome bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-base">
            {currentUser.avatar}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Good morning, {currentUser.name.split(" ")[0]} 👋</h1>
            <p className="text-sm text-gray-500">{currentUser.role} · {currentUser.dept}</p>
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
          <p className="text-3xl font-bold text-gray-900">24</p>
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
          <p className="text-3xl font-bold text-green-600">19</p>
          <p className="text-xs text-green-500 mt-0.5">This month: 5</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">My Projects</p>
            <FolderKanban className="w-4 h-4 text-teal-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{myProjects.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Active assignments</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Recent Requests */}
        <div className="col-span-3 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Recent Requests</h2>
            <button onClick={() => navigate("/apps/ess")} className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {recentRequests.map(r => {
              const sc = statusConfig[r.status];
              return (
                <div key={r.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 cursor-pointer" onClick={() => navigate("/apps/ess")}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-gray-400 font-mono">{r.id}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${r.type === "Material Request" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>{r.type}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.project} · {r.date}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {sc.icon}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${sc.badge}`}>{r.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t border-gray-100">
            <button onClick={() => navigate("/apps/ess/submit")}
              className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-teal-200 text-teal-600 rounded-lg text-sm font-medium hover:bg-teal-50 transition-colors">
              <Plus className="w-4 h-4" /> Submit New Request
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-2 space-y-5">
          {/* My Projects mini */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">My Projects</h2>
              <button onClick={() => navigate("/apps/ess/projects")} className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
                View <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {myProjects.map(p => (
                <div key={p.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5 mb-2">
                    <MapPin className="w-3 h-3" />{p.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${p.progress}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-600">{p.progress}%</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">My role: {p.role}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
                {unreadNotifs > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">{unreadNotifs}</span>
                )}
              </div>
              <Bell className="w-4 h-4 text-gray-400" />
            </div>
            <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
              {notifications.map(n => {
                const nc = notifConfig[n.type];
                return (
                  <div key={n.id} className={`flex items-start gap-3 px-4 py-3 ${!n.read ? nc.bg : ""}`}>
                    <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${nc.dot} ${n.read ? "opacity-30" : ""}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-relaxed ${n.read ? "text-gray-400" : "text-gray-700 font-medium"}`}>{n.text}</p>
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
