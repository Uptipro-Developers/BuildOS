import { useState, useEffect } from "react";
import { getWorkforceAllocations } from "../../api/workforce-allocation";
import { Users, AlertTriangle, Plus, Search, X, Building2 } from "lucide-react";

interface Allocation {
  empId: string;
  empName: string;
  role: string;
  department: string;
  projects: {
    name: string;
    allocPct: number;
    role: string;
    startDate: string;
  }[];
  totalAlloc: number;
}

const allocColor = (pct: number) => {
  if (pct > 100) return "bg-red-500";
  if (pct >= 90) return "bg-amber-400";
  return "bg-indigo-500";
};

const allocBadge = (pct: number) => {
  if (pct > 100) return "bg-red-100 text-red-700";
  if (pct >= 90) return "bg-amber-100 text-amber-700";
  return "bg-green-100 text-green-700";
};

export function WorkforceAllocationPage() {
  const [allocs, setAllocs] = useState<Allocation[]>([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [filter, setFilter] = useState<"all" | "over" | "full" | "under">(
    "all",
  );
  const [projectSearch] = useState("");
  const [showAssign, setShowAssign] = useState(false);

  useEffect(() => {
    getWorkforceAllocations()
      .then((items) => {
        // Group flat records by employeeName
        const map = new Map<string, Allocation>();
        for (const item of items) {
          const key = item.employeeId ?? item.employeeName;
          if (!map.has(key)) {
            map.set(key, {
              empId: item.employeeId ?? key,
              empName: item.employeeName,
              role: item.role,
              department: "",
              projects: [],
              totalAlloc: 0,
            });
          }
          const entry = map.get(key)!;
          entry.projects.push({
            name: item.projectName ?? "",
            allocPct: item.allocPct,
            role: item.role,
            startDate: item.startDate?.slice(0, 10) ?? "",
          });
          entry.totalAlloc += item.allocPct;
        }
        setAllocs(Array.from(map.values()));
      })
      .catch(() => {});
  }, []);

  const depts = [
    "All",
    ...Array.from(new Set(allocs.map((a) => a.department))).sort(),
  ];

  const filtered = allocs.filter((a) => {
    const matchS =
      a.empName.toLowerCase().includes(search.toLowerCase()) ||
      a.empId.toLowerCase().includes(search.toLowerCase());
    const matchD = deptFilter === "All" || a.department === deptFilter;
    const matchF =
      filter === "all" ||
      (filter === "over" && a.totalAlloc > 100) ||
      (filter === "full" && a.totalAlloc === 100) ||
      (filter === "under" && a.totalAlloc < 100);
    return matchS && matchD && matchF;
  });

  const overAllocated = allocs.filter((a) => a.totalAlloc > 100).length;

  const projectMap = new Map<string, number>();
  allocs.forEach((a) => {
    a.projects.forEach((p) => {
      projectMap.set(p.name, (projectMap.get(p.name) ?? 0) + 1);
    });
  });
  const activeProjects = Array.from(projectMap.entries()).map(
    ([name, headcount]) => ({ name, headcount }),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Workforce Allocation
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Assign employees to projects and monitor allocation capacity
          </p>
        </div>
        <button
          onClick={() => setShowAssign(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 text-white rounded-md text-sm hover:bg-indigo-800"
        >
          <Plus className="w-3.5 h-3.5" /> New Assignment
        </button>
      </div>

      {/* Alert */}
      {overAllocated > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>
              {overAllocated} employee{overAllocated > 1 ? "s" : ""}
            </strong>{" "}
            are over-allocated (total &gt; 100%). Review assignments.
          </span>
        </div>
      )}

      {/* Project summary */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Active Projects
        </h3>
        <div className="grid grid-cols-5 gap-3">
          {activeProjects
            .filter((p) =>
              p.name.toLowerCase().includes(projectSearch.toLowerCase()),
            )
            .map((p) => (
              <div
                key={p.name}
                className="bg-white rounded-lg border border-gray-200 p-3"
              >
                <div className="w-8 h-8 bg-indigo-100 rounded flex items-center justify-center mb-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-xs font-semibold text-gray-800 leading-tight">
                  {p.name}
                </p>
                <div className="flex items-center gap-1 mt-1.5">
                  <Users className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {p.headcount} people
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Employees Assigned",
            value: allocs.length,
            color: "bg-indigo-50 text-indigo-700",
          },
          {
            label: "Over-Allocated",
            value: overAllocated,
            color: "bg-red-50 text-red-700",
          },
          {
            label: "Fully Allocated (100%)",
            value: allocs.filter((a) => a.totalAlloc === 100).length,
            color: "bg-green-50 text-green-700",
          },
          {
            label: "Under-Allocated (<80%)",
            value: allocs.filter((a) => a.totalAlloc < 80).length,
            color: "bg-amber-50 text-amber-700",
          },
        ].map((s) => (
          <div key={s.label} className={`rounded-lg p-4 ${s.color}`}>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
        >
          {depts.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <div className="flex gap-1 border border-gray-300 rounded-md p-1">
          {(
            [
              { key: "all", label: "All" },
              { key: "over", label: "Over" },
              { key: "full", label: "Full" },
              { key: "under", label: "Under" },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded text-xs font-medium ${filter === f.key ? "bg-indigo-700 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Allocation cards */}
      <div className="space-y-3">
        {filtered.map((emp) => {
          const barColor = allocColor(emp.totalAlloc);
          const badge = allocBadge(emp.totalAlloc);
          const pct = Math.min(emp.totalAlloc, 130);
          return (
            <div
              key={emp.empId}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700">
                    {emp.empName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{emp.empName}</p>
                    <p className="text-xs text-gray-500">
                      {emp.role} · {emp.department}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {emp.totalAlloc > 100 && (
                    <span className="flex items-center gap-1 text-xs text-red-600">
                      <AlertTriangle className="w-3 h-3" /> Over-allocated
                    </span>
                  )}
                  <span
                    className={`text-sm font-bold px-2.5 py-1 rounded-full ${badge}`}
                  >
                    {emp.totalAlloc}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-3 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all ${barColor}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {emp.projects.map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between bg-gray-50 rounded px-3 py-2"
                  >
                    <div>
                      <p className="text-xs font-medium text-gray-800">
                        {p.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {p.role} · Since {p.startDate}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {p.allocPct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Assign modal */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">
                Assign Employee to Project
              </h2>
              <button onClick={() => setShowAssign(false)}>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Employee
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select employee...</option>
                  {allocs.map((a) => (
                    <option key={a.empId}>
                      {a.empName} ({a.empId})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Project
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select project...</option>
                  {activeProjects.map((p) => (
                    <option key={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Role on Project
                </label>
                <input
                  placeholder="e.g. Lead Site Engineer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Allocation %
                </label>
                <input
                  type="number"
                  placeholder="e.g. 50"
                  min={5}
                  max={100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowAssign(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-indigo-700 text-white rounded-md text-sm hover:bg-indigo-800">
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
