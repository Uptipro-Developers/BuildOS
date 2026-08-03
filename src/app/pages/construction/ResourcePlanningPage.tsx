import { useEffect, useState } from "react";
import { safePercent } from "../../utils/number";
import {
  Users,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Search,
  Download,
  Package,
  Wrench,
} from "lucide-react";
import { exportCSV } from "../../utils/exportCSV";
import { getResourcePlans } from "../../api/resource-planning";

interface Worker {
  id: string;
  name: string;
  role: string;
  projects: { projectId: string; projectName: string; hoursPerWeek: number }[];
  totalCapacity: number;
}

const roleColors: Record<string, string> = {
  "Site Engineer": "bg-blue-50 text-blue-700",
  Foreman: "bg-orange-50 text-orange-700",
  QS: "bg-purple-50 text-purple-700",
  Laborer: "bg-gray-100 text-gray-700",
  "Safety Officer": "bg-red-50 text-red-700",
  "Project Manager": "bg-emerald-50 text-emerald-700",
  "Steel Fixer": "bg-amber-50 text-amber-700",
};

const projectColors = [
  "bg-orange-400",
  "bg-blue-400",
  "bg-emerald-400",
  "bg-purple-400",
  "bg-amber-400",
];

function getAllocPct(w: Worker) {
  const total = w.projects.reduce((s, p) => s + p.hoursPerWeek, 0);
  return safePercent(total, w.totalCapacity);
}

export function ResourcePlanningPage() {
  const [workerList, setWorkerList] = useState<Worker[]>([]);
  const [roleFilter, setRoleFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [allocForm, setAllocForm] = useState({
    workerId: "",
    projectName: "",
    hoursPerWeek: "20",
  });
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "role" | "alloc">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [activeTab, setActiveTab] = useState<
    "workforce" | "materials" | "equipment"
  >("workforce");

  useEffect(() => {
    getResourcePlans()
      .then((plans) => {
        const grouped = new Map<string, Worker>();
        plans.forEach((plan) => {
          const key = plan.name;
          const current = grouped.get(key) ?? {
            id: key,
            name: plan.name,
            role: plan.resourceType,
            totalCapacity: 40,
            projects: [],
          };
          current.projects.push({
            projectId: plan.projectId ?? "",
            projectName: plan.projectName ?? "Unassigned",
            hoursPerWeek: plan.quantity ?? 0,
          });
          grouped.set(key, current);
        });
        setWorkerList(Array.from(grouped.values()));
      })
      .catch(() => setWorkerList([]));
  }, []);

  const roles = ["All", ...Array.from(new Set(workerList.map((w) => w.role)))];
  const allProjectNames = Array.from(
    new Set(workerList.flatMap((w) => w.projects.map((p) => p.projectName))),
  );
  const projectIdMap = Object.fromEntries(
    workerList.flatMap((w) =>
      w.projects.map((p) => [p.projectName, p.projectId]),
    ),
  );

  function handleSortRP(k: "name" | "role" | "alloc") {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  function SortIconRP({ col }: { col: "name" | "role" | "alloc" }) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-orange-600" />
    ) : (
      <ChevronDown className="w-3 h-3 text-orange-600" />
    );
  }

  const filtered = workerList
    .filter((w) => {
      const matchRole = roleFilter === "All" || w.role === roleFilter;
      const matchSearch =
        !search ||
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.role.toLowerCase().includes(search.toLowerCase());
      return matchRole && matchSearch;
    })
    .sort((a, b) => {
      let v = 0;
      if (sortKey === "name") v = a.name.localeCompare(b.name);
      else if (sortKey === "role") v = a.role.localeCompare(b.role);
      else if (sortKey === "alloc") v = getAllocPct(a) - getAllocPct(b);
      return sortDir === "asc" ? v : -v;
    });

  const overAllocated = workerList.filter((w) => getAllocPct(w) > 100).length;
  const fullyAllocated = workerList.filter(
    (w) => getAllocPct(w) === 100,
  ).length;
  const available = workerList.filter((w) => getAllocPct(w) < 80).length;

  function handleAllocate() {
    const { workerId, projectName, hoursPerWeek } = allocForm;
    if (!workerId || !projectName || !hoursPerWeek) return;
    const hrs = parseInt(hoursPerWeek);
    if (isNaN(hrs) || hrs <= 0) return;
    setWorkerList((prev) =>
      prev.map((w) => {
        if (w.id !== workerId) return w;
        const existing = w.projects.find((p) => p.projectName === projectName);
        if (existing) {
          return {
            ...w,
            projects: w.projects.map((p) =>
              p.projectName === projectName
                ? { ...p, hoursPerWeek: p.hoursPerWeek + hrs }
                : p,
            ),
          };
        }
        return {
          ...w,
          projects: [
            ...w.projects,
            {
              projectId: projectIdMap[projectName] ?? "0",
              projectName,
              hoursPerWeek: hrs,
            },
          ],
        };
      }),
    );
    setAllocForm({ workerId: "", projectName: "", hoursPerWeek: "20" });
    setShowAdd(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Resource Planning
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Allocate workers across projects — avoid over-allocation
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const headers = [
                "Worker",
                "Role",
                "Assigned Projects",
                "Total Hours",
                "Capacity",
                "Allocation %",
              ];
              const rows = filtered.map((w) => {
                const hrs = w.projects.reduce((s, p) => s + p.hoursPerWeek, 0);
                return [
                  w.name,
                  w.role,
                  w.projects
                    .map((p) => `${p.projectName}(${p.hoursPerWeek}h)`)
                    .join("; "),
                  String(hrs),
                  String(w.totalCapacity),
                  `${getAllocPct(w)}%`,
                ];
              });
              exportCSV("resource-planning", headers, rows);
            }}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-700"
          >
            <Plus className="w-4 h-4" /> Allocate Worker
          </button>
        </div>
      </div>

      {/* Resource Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["workforce", "materials", "equipment"] as const).map((id) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === id
                ? "border-orange-600 text-orange-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {id.charAt(0).toUpperCase() + id.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "workforce" && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-xs text-gray-500">Over-allocated</p>
                <p className="text-2xl font-bold text-red-600">
                  {overAllocated}
                </p>
                <p className="text-xs text-gray-400">workers exceed capacity</p>
              </div>
            </div>
            <div className="bg-white border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-xs text-gray-500">Fully Allocated</p>
                <p className="text-2xl font-bold text-green-600">
                  {fullyAllocated}
                </p>
                <p className="text-xs text-gray-400">at 100% capacity</p>
              </div>
            </div>
            <div className="bg-white border border-blue-200 rounded-lg p-4 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-xs text-gray-500">Under-utilized</p>
                <p className="text-2xl font-bold text-blue-600">{available}</p>
                <p className="text-xs text-gray-400">below 80% capacity</p>
              </div>
            </div>
          </div>

          {/* Search + Role filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search workers…"
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-52"
              />
            </div>
            <div className="flex gap-1">
              {roles.map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${roleFilter === r ? "bg-orange-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Allocation table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer"
                    onClick={() => handleSortRP("name")}
                  >
                    <div className="flex items-center gap-1">
                      Worker
                      <SortIconRP col="name" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer"
                    onClick={() => handleSortRP("role")}
                  >
                    <div className="flex items-center gap-1">
                      Role
                      <SortIconRP col="role" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Assigned Projects
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer w-56"
                    onClick={() => handleSortRP("alloc")}
                  >
                    <div className="flex items-center gap-1">
                      Allocation
                      <SortIconRP col="alloc" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Hrs/Week
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((w) => {
                  const allocHrs = w.projects.reduce(
                    (s, p) => s + p.hoursPerWeek,
                    0,
                  );
                  const pct = safePercent(allocHrs, w.totalCapacity);
                  const isOver = pct > 100;
                  return (
                    <tr
                      key={w.id}
                      className={`hover:bg-gray-50 ${isOver ? "bg-red-50/40" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                            {w.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {w.name}
                            </p>
                            {isOver && (
                              <p className="text-xs text-red-500 flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" />{" "}
                                Over-allocated
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[w.role] ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {w.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {w.projects.map((p, pi) => (
                            <span
                              key={p.projectId}
                              className={`text-xs text-white px-2 py-0.5 rounded-full ${projectColors[pi % projectColors.length]}`}
                            >
                              {p.projectName.length > 20
                                ? p.projectName.slice(0, 20) + "…"
                                : p.projectName}{" "}
                              ({p.hoursPerWeek}h)
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 w-56">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${isOver ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-green-500"}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs font-semibold ${isOver ? "text-red-600" : "text-gray-700"}`}
                          >
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-medium ${isOver ? "text-red-600" : "text-gray-900"}`}
                        >
                          {allocHrs}h
                        </span>
                        <span className="text-xs text-gray-400">
                          {" "}
                          / {w.totalCapacity}h
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Allocate Worker Modal */}
          {showAdd && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Allocate Worker
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Worker <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={allocForm.workerId}
                      onChange={(e) =>
                        setAllocForm((f) => ({
                          ...f,
                          workerId: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select worker…</option>
                      {workerList.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={allocForm.projectName}
                      onChange={(e) =>
                        setAllocForm((f) => ({
                          ...f,
                          projectName: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select project…</option>
                      {allProjectNames.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hours per Week <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={allocForm.hoursPerWeek}
                      onChange={(e) =>
                        setAllocForm((f) => ({
                          ...f,
                          hoursPerWeek: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowAdd(false);
                      setAllocForm({
                        workerId: "",
                        projectName: "",
                        hoursPerWeek: "20",
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAllocate}
                    disabled={
                      !allocForm.workerId ||
                      !allocForm.projectName ||
                      !allocForm.hoursPerWeek
                    }
                    className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-40"
                  >
                    Allocate
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "materials" && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-600" />
              <h3 className="text-sm font-semibold text-gray-900">
                Materials Planning
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Material
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Project
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Planned Qty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Allocated Qty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  {
                    material: "Portland Cement",
                    category: "Structural",
                    project: "Downtown Office Complex",
                    planned: "500 bags",
                    allocated: "480 bags",
                    status: "OK",
                  },
                  {
                    material: "Reinforcement Bars",
                    category: "Structural",
                    project: "Downtown Office Complex",
                    planned: "12 tonnes",
                    allocated: "8 tonnes",
                    status: "Low",
                  },
                  {
                    material: "Electrical Conduit",
                    category: "Electrical",
                    project: "Riverside Residential",
                    planned: "800 m",
                    allocated: "800 m",
                    status: "OK",
                  },
                  {
                    material: "PVC Pipes",
                    category: "Plumbing",
                    project: "Riverside Residential",
                    planned: "300 m",
                    allocated: "150 m",
                    status: "Low",
                  },
                  {
                    material: "Hollow Blocks",
                    category: "Masonry",
                    project: "Industrial Warehouse",
                    planned: "10,000 pcs",
                    allocated: "9,800 pcs",
                    status: "OK",
                  },
                  {
                    material: "Ceramic Tiles",
                    category: "Finishing",
                    project: "Shopping Mall Renovation",
                    planned: "2,000 m²",
                    allocated: "200 m²",
                    status: "Critical",
                  },
                  {
                    material: "Gravel (Class A)",
                    category: "Structural",
                    project: "Highway Interchange",
                    planned: "80 tonnes",
                    allocated: "75 tonnes",
                    status: "OK",
                  },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {row.material}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.category}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {row.project}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.planned}</td>
                    <td className="px-4 py-3 text-gray-700">{row.allocated}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          row.status === "OK"
                            ? "bg-green-50 text-green-700"
                            : row.status === "Low"
                              ? "bg-yellow-50 text-yellow-700"
                              : "bg-red-50 text-red-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "equipment" && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-orange-600" />
              <h3 className="text-sm font-semibold text-gray-900">
                Equipment Assignments
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Equipment
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Assigned Project
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Operator
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  {
                    name: "Tower Crane TC-01",
                    type: "Crane",
                    project: "Downtown Office Complex",
                    operator: "Carlos Rivera",
                    status: "Active",
                  },
                  {
                    name: "Excavator EX-03",
                    type: "Excavator",
                    project: "Highway Interchange",
                    operator: "Tom Hughes",
                    status: "Active",
                  },
                  {
                    name: "Concrete Mixer CM-02",
                    type: "Mixer",
                    project: "Riverside Residential",
                    operator: "James Okafor",
                    status: "Active",
                  },
                  {
                    name: "Compactor CP-01",
                    type: "Compactor",
                    project: "—",
                    operator: "—",
                    status: "Available",
                  },
                  {
                    name: "Bulldozer BD-01",
                    type: "Bulldozer",
                    project: "Industrial Warehouse",
                    operator: "Robert Lee",
                    status: "Maintenance",
                  },
                  {
                    name: "Forklift FK-02",
                    type: "Forklift",
                    project: "Shopping Mall Renovation",
                    operator: "Aisha Bello",
                    status: "Active",
                  },
                  {
                    name: "Tower Crane TC-02",
                    type: "Crane",
                    project: "—",
                    operator: "—",
                    status: "Available",
                  },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {row.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.type}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {row.project}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.operator}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          row.status === "Active"
                            ? "bg-green-50 text-green-700"
                            : row.status === "Available"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-yellow-50 text-yellow-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
