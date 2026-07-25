import { useState } from "react";
import {
  Users, Plus, Search, X, Building2, ChevronRight,
} from "lucide-react";

interface Allocation {
  empId: string; empName: string; role: string; department: string;
  projects: { name: string; role: string; startDate: string }[];
}

const allocations: Allocation[] = [
  { empId: "EMP-001", empName: "Chukwudi Eze", role: "Site Engineer", department: "Engineering", projects: [
    { name: "Downtown Office Complex", role: "Lead Site Engineer", startDate: "Feb 2023" },
    { name: "Highway Interchange", role: "Support Engineer", startDate: "Jun 2023" },
    { name: "Industrial Warehouse", role: "Inspection Lead", startDate: "Jan 2024" },
  ]},
  { empId: "EMP-002", empName: "Aisha Bello", role: "Project Manager", department: "Operations", projects: [
    { name: "Downtown Office Complex", role: "Project Manager", startDate: "Mar 2022" },
    { name: "Riverside Residential", role: "Project Manager", startDate: "Jan 2023" },
    { name: "University Science Block", role: "Project Manager", startDate: "Apr 2024" },
  ]},
  { empId: "EMP-003", empName: "Robert Lee", role: "Structural Engineer", department: "Engineering", projects: [
    { name: "Highway Interchange", role: "Lead Structural Engineer", startDate: "Feb 2023" },
    { name: "Downtown Office Complex", role: "Structural Lead", startDate: "Mar 2022" },
    { name: "Industrial Warehouse", role: "Structural Review", startDate: "Nov 2023" },
    { name: "Riverside Residential", role: "Support Engineer", startDate: "Jan 2023" },
  ]},
  { empId: "EMP-007", empName: "Tom Fox", role: "Quantity Surveyor", department: "Procurement", projects: [
    { name: "Riverside Residential", role: "QS Lead", startDate: "Jan 2023" },
    { name: "University Science Block", role: "Cost Consultant", startDate: "Apr 2024" },
    { name: "Highway Interchange", role: "Cost Lead", startDate: "Jun 2023" },
  ]},
  { empId: "EMP-008", empName: "Ngozi Eze", role: "Site Supervisor", department: "Engineering", projects: [
    { name: "Downtown Office Complex", role: "Supervising Engineer", startDate: "Jun 2023" },
    { name: "Riverside Residential", role: "Site Supervisor", startDate: "Jan 2023" },
  ]},
  { empId: "EMP-009", empName: "Kwame Asante", role: "Civil Engineer", department: "Engineering", projects: [
    { name: "Highway Interchange", role: "Civil Lead", startDate: "Mar 2024" },
    { name: "University Science Block", role: "Civil Specialist", startDate: "Apr 2024" },
  ]},
  { empId: "EMP-010", empName: "Emeka Nwosu", role: "HSE Officer", department: "Health & Safety", projects: [
    { name: "Downtown Office Complex", role: "HSE Lead", startDate: "Mar 2022" },
    { name: "Highway Interchange", role: "HSE Officer", startDate: "Jun 2023" },
    { name: "Industrial Warehouse", role: "Safety Inspector", startDate: "Nov 2023" },
    { name: "Riverside Residential", role: "HSE Consultant", startDate: "Jan 2023" },
  ]},
  { empId: "EMP-015", empName: "Yemi Olusegun", role: "Project Manager", department: "Operations", projects: [
    { name: "University Science Block", role: "Project Manager", startDate: "Apr 2024" },
  ]},
];

const projects = [
  { name: "Downtown Office Complex", headcount: 4, budget: "₦2.8B", status: "active" },
  { name: "Highway Interchange", headcount: 5, budget: "₦4.1B", status: "active" },
  { name: "Industrial Warehouse", headcount: 3, budget: "₦980M", status: "active" },
  { name: "Riverside Residential", headcount: 4, budget: "₦1.6B", status: "active" },
  { name: "University Science Block", headcount: 3, budget: "₦1.2B", status: "active" },
];

export function WorkforceAllocationPage() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [projectSearch, setProjectSearch] = useState("");
  const [showAssign, setShowAssign] = useState(false);

  const depts = ["All", ...Array.from(new Set(allocations.map(a => a.department))).sort()];

  const filtered = allocations.filter(a => {
    const matchS = a.empName.toLowerCase().includes(search.toLowerCase()) || a.empId.toLowerCase().includes(search.toLowerCase());
    const matchD = deptFilter === "All" || a.department === deptFilter;
    return matchS && matchD;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Workforce Allocation</h1>
          <p className="text-sm text-gray-500 mt-0.5">View which employees are assigned to which projects and their roles</p>
        </div>
        <button onClick={() => setShowAssign(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 text-white rounded-md text-sm hover:bg-indigo-800">
          <Plus className="w-3.5 h-3.5" /> New Assignment
        </button>
      </div>

      {/* Project summary */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Active Projects</h3>
        <div className="grid grid-cols-5 gap-3">
          {projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase())).map(p => (
            <div key={p.name} className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="w-8 h-8 bg-indigo-100 rounded flex items-center justify-center mb-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-xs font-semibold text-gray-800 leading-tight">{p.name}</p>
              <div className="flex items-center gap-1 mt-1.5">
                <Users className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500">{p.headcount} people</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{p.budget}</p>
              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded mt-1.5 inline-block capitalize">{p.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-indigo-50 rounded-lg p-4">
          <p className="text-xs text-gray-500">Employees Assigned</p>
          <p className="text-2xl font-bold mt-1 text-indigo-700">{allocations.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-xs text-gray-500">Active Projects</p>
          <p className="text-2xl font-bold mt-1 text-green-700">{projects.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white">
          {depts.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      {/* Allocation cards */}
      <div className="space-y-3">
        {filtered.map(emp => (
          <div key={emp.empId} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700">
                  {emp.empName.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{emp.empName}</p>
                  <p className="text-xs text-gray-500">{emp.role} · {emp.department}</p>
                </div>
              </div>
              <span className="text-xs text-gray-400">{emp.projects.length} project{emp.projects.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-2">
              {emp.projects.map(p => (
                <div key={p.name} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                  <div>
                    <p className="text-xs font-medium text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.role} · Since {p.startDate}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Assign modal */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Assign Employee to Project</h2>
              <button onClick={() => setShowAssign(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select employee...</option>
                  {allocations.map(a => <option key={a.empId}>{a.empName} ({a.empId})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select project...</option>
                  {projects.map(p => <option key={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role on Project</label>
                <input placeholder="e.g. Lead Site Engineer" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowAssign(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button className="px-4 py-2 bg-indigo-700 text-white rounded-md text-sm hover:bg-indigo-800">Assign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
