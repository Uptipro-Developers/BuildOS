import { useNavigate } from "react-router";
import { Users, HardHat, Wrench, Truck, BookOpen, ArrowRight, Building, MapPin, Calendar } from "lucide-react";
import { projects, staffList, vendors } from "./mockData";

const vendorActivity = [
  { vendor: "Alhaji Masonry Services", action: "Daily report submitted", project: "Lekki Tower A", time: "2 hours ago" },
  { vendor: "Steel Fixers United", action: "Progress claim submitted", project: "Lekki Tower A", time: "5 hours ago" },
  { vendor: "De Renaissance Painters", action: "Contract awarded", project: "Riverside Estate Phase 2", time: "1 day ago" },
  { vendor: "Ade Plumbing Services", action: "Mobilization completed", project: "Riverside Estate Phase 2", time: "2 days ago" },
  { vendor: "Chike Tiling Experts", action: "Weekly progress report", project: "Lekki Tower A", time: "3 days ago" },
];

export function ResourceHubPage() {
  const navigate = useNavigate();
  const activeProjects = projects.filter(p => p.status === "Active");

  const stats = [
    { label: "Active Projects", value: activeProjects.length, icon: <Building className="w-5 h-5" />, color: "text-orange-600 bg-orange-50" },
    { label: "Total Projects", value: projects.length, icon: <BookOpen className="w-5 h-5" />, color: "text-blue-600 bg-blue-50" },
    { label: "Registered Contractors", value: vendors.length, icon: <Truck className="w-5 h-5" />, color: "text-purple-600 bg-purple-50" },
    { label: "Staff Members", value: staffList.length, icon: <Users className="w-5 h-5" />, color: "text-green-600 bg-green-50" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Resources</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of projects, vendors, and staff across the organization</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
            <span className={`p-2.5 rounded-lg ${s.color}`}>{s.icon}</span>
            <div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Quick links to projects */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Active Projects</h3>
            <button onClick={() => navigate("/apps/construction")} className="text-xs text-orange-600 font-medium hover:text-orange-700">View all →</button>
          </div>
          <div className="divide-y divide-gray-100">
            {activeProjects.length === 0 && (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">No active projects</p>
            )}
            {activeProjects.slice(0, 5).map(p => (
              <button
                key={p.id}
                onClick={() => navigate(`/apps/construction/projects/${p.id}/overview`)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 text-left transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Building className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{p.location}</span>
                    <span>·</span>
                    <Calendar className="w-3 h-3" />
                    <span>{p.plannedStartDate}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Recent resource activity */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Recent Resource Activity</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {vendorActivity.map((va, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3">
                <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Truck className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <strong>{va.vendor}</strong> — {va.action}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <span>{va.project}</span>
                    <span>·</span>
                    <span>{va.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-gray-100">
            <button onClick={() => navigate("/apps/procurement")} className="text-xs text-orange-600 font-medium hover:text-orange-700">
              View all resource activity →
            </button>
          </div>
        </div>
      </div>

      {/* Staff quick view */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Staff Directory</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-0">
          {staffList.map((name, i) => (
            <div key={i} className="flex items-center gap-2.5 px-4 py-3 border-r border-b border-gray-50">
              <div className="w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                {name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <span className="text-sm text-gray-700 truncate">{name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Resource links */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Resource Planning", desc: "Assign and manage workforce across projects", link: "/apps/construction/resource-planning", icon: <Users className="w-4 h-4" /> },
          { label: "Contractors & Subcontractors", desc: "Manage vendor contracts and performance", link: "/apps/procurement", icon: <Truck className="w-4 h-4" /> },
          { label: "Staff & Payroll", desc: "Staff records, attendance and timesheets", link: "/apps/hr", icon: <HardHat className="w-4 h-4" /> },
        ].map(r => (
          <button
            key={r.label}
            onClick={() => navigate(r.link)}
            className="bg-white rounded-lg border border-gray-200 p-4 text-left hover:border-orange-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-md bg-orange-50 text-orange-600">{r.icon}</span>
              <span className="text-sm font-semibold text-gray-900">{r.label}</span>
            </div>
            <p className="text-xs text-gray-500">{r.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
