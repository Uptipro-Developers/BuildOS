import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Search,
  MapPin,
  Calendar,
  ChevronDown,
  Trash2,
  Filter,
  FolderKanban,
  CheckCircle,
  Clock,
  XCircle,
  ArrowUpDown,
} from "lucide-react";
import {
  fmtCurrency,
  fmtDate,
  ragColor,
  ragLabel,
  ragBg,
  ragText,
} from "./mockData";
import type { Project, ContractType } from "./types";
import { useResources } from "../../contexts/ResourceContext";
import { fetchConstructionProjects, createConstructionProject } from "../../api/projects";
import { fetchEmployees } from "../../api/employees";
import { setProjectsCache, upsertProjectCache } from "./projectStore";

type ProjectStatus = Project["status"];

const statusConfig: Record<
  ProjectStatus,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  Active: {
    label: "Active",
    icon: <CheckCircle className="w-3 h-3" />,
    color: "text-green-700",
    bg: "bg-green-100",
  },
  "On Hold": {
    label: "On Hold",
    icon: <Clock className="w-3 h-3" />,
    color: "text-amber-700",
    bg: "bg-amber-100",
  },
  Completed: {
    label: "Completed",
    icon: <CheckCircle className="w-3 h-3" />,
    color: "text-gray-700",
    bg: "bg-gray-100",
  },
  Cancelled: {
    label: "Cancelled",
    icon: <XCircle className="w-3 h-3" />,
    color: "text-red-700",
    bg: "bg-red-100",
  },
};

function StatusBadge({ status }: { status: ProjectStatus }) {
  const c = statusConfig[status] ?? statusConfig["On Hold"];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.color}`}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

const DEFAULT_FORM = {
  name: "",
  client: "",
  location: "",
  siteAddress: "",
  projectManager: "",
  contractType: "Lump Sum" as ContractType,
  plannedStartDate: "",
  plannedEndDate: "",
  description: "",
  clusterId: "",
};

export function ProjectsListPage() {
  const navigate = useNavigate();
  const { contractors } = useResources();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "All">(
    "All",
  );
  const [clusterFilter, setClusterFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<keyof Project | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<string[]>([]);

  // Load employees for the Project Manager dropdown.
  useEffect(() => {
    let active = true;
    fetchEmployees({ status: "active" })
      .then((employees) => {
        if (!active) return;
        setStaffList(
          employees
            .map((e) => `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim())
            .filter(Boolean),
        );
      })
      .catch(() => {
        /* leave dropdown empty on failure */
      });
    return () => {
      active = false;
    };
  }, []);

  // Load projects from the backend. Shows a clean empty state until the user
  // creates projects.
  useEffect(() => {
    let active = true;
    fetchConstructionProjects()
      .then((apiProjects) => {
        if (!active) return;
        setProjectList(apiProjects as Project[]);
        setProjectsCache(apiProjects as Project[]);
      })
      .catch(() => {
        /* leave the list empty on failure */
      });
    return () => {
      active = false;
    };
  }, []);

  const clusters = Array.from(new Set(projectList.map((p) => p.clusterId)));

  function handleDelete(id: string) {
    setProjectList((prev) => prev.filter((p) => p.id !== id));
    setDeleteConfirmId(null);
  }

  function toggleSort(field: keyof Project) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  let displayed = projectList.filter((p) => {
    const q = search.toLowerCase();
    if (
      q &&
      !p.name.toLowerCase().includes(q) &&
      !p.client.toLowerCase().includes(q) &&
      !p.location.toLowerCase().includes(q)
    )
      return false;
    if (statusFilter !== "All" && p.status !== statusFilter) return false;
    if (clusterFilter !== "All" && p.clusterId !== clusterFilter) return false;
    return true;
  });

  if (sortField) {
    displayed = [...displayed].sort((a, b) => {
      const va = a[sortField];
      const vb = b[sortField];
      if (typeof va === "number" && typeof vb === "number")
        return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }

  const counts: Record<string, number> = { All: projectList.length };
  projectList.forEach((p) => {
    counts[p.status] = (counts[p.status] ?? 0) + 1;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">All Projects</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {projectList.length} projects total
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          style={{ backgroundColor: "#E8973A", color: "white" }}
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {(["All", "Active", "On Hold", "Completed", "Cancelled"] as const).map(
          (s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                statusFilter === s
                  ? "border-amber-600 text-amber-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {s}{" "}
              {counts[s] !== undefined && (
                <span className="ml-1 text-xs font-normal text-gray-400">
                  ({counts[s]})
                </span>
              )}
            </button>
          ),
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, client, location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowFilters((f) => !f)}
          className={`flex items-center gap-1.5 px-3 py-2 border rounded-md text-sm transition-colors ${
            showFilters
              ? "border-amber-400 bg-amber-50 text-amber-700"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`}
          />
        </button>
        <span className="text-sm text-gray-400">
          {displayed.length} result{displayed.length !== 1 ? "s" : ""}
        </span>
      </div>

      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 flex gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Cluster
            </label>
            <select
              value={clusterFilter}
              onChange={(e) => setClusterFilter(e.target.value)}
              className="border border-gray-300 rounded-md text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="All">All Clusters</option>
              {clusters.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              setClusterFilter("All");
              setSearch("");
              setStatusFilter("All");
            }}
            className="self-end text-xs font-medium hover:underline"
            style={{ color: "#E8973A" }}
          >
            Clear all
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {[
                { key: "name", label: "Project" },
                { key: "status", label: "Status" },
                { key: "ragStatus", label: "RAG" },
                { key: "budget", label: "Budget" },
                { key: "spent", label: "Spent" },
                { key: "projectManager", label: "Manager" },
                { key: "plannedEndDate", label: "Due Date" },
              ].map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key as keyof Project)}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none"
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.map((p) => {
              const pct = Math.min(Math.round((p.spent / p.budget) * 100), 100);
              return (
                <tr
                  key={p.id}
                  onClick={() =>
                    navigate(`/apps/construction/projects/${p.id}/overview`)
                  }
                  className="hover:bg-gray-50 cursor-pointer group"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900 group-hover:text-amber-700 transition-colors">
                        {p.name}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {p.location}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${ragBg(p.ragStatus)} ${ragText(p.ragStatus)}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${ragColor(p.ragStatus)}`}
                      />
                      {ragLabel(p.ragStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">
                      {fmtCurrency(p.budget)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm text-gray-700">
                        {fmtCurrency(p.spent)}
                      </p>
                      <div className="w-20 bg-gray-200 rounded-full h-1 mt-1">
                        <div
                          className={`h-1 rounded-full ${pct >= 100 ? "bg-green-500" : "bg-amber-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                        style={{ backgroundColor: "#E8973A" }}
                      >
                        {p.projectManager
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <span className="text-sm text-gray-700 truncate">
                        {p.projectManager}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {fmtDate(p.plannedEndDate)}
                    </div>
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="relative">
                      <button
                        onClick={() => setDeleteConfirmId(p.id)}
                        className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {displayed.length === 0 && (
          <div className="py-16 text-center">
            <FolderKanban className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              No projects found
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Try adjusting your filters
            </p>
          </div>
        )}
      </div>

      {deleteConfirmId &&
        (() => {
          const proj = projectList.find((p) => p.id === deleteConfirmId);
          return proj ? (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Delete Project
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Delete{" "}
                      <span className="font-medium text-gray-700">
                        "{proj.name}"
                      </span>
                      ? This cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirmId)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ) : null;
        })()}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Create New Project
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Set up a new construction project
                </p>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <form
              className="p-6 space-y-5"
              onSubmit={async (e) => {
                e.preventDefault();
                if (creating) return;
                setCreating(true);
                try {
                  const created = (await createConstructionProject({
                    name: form.name,
                    client: form.client,
                    siteAddress: form.siteAddress,
                    location: form.location,
                    projectManager: form.projectManager,
                    contractType: form.contractType,
                    plannedStartDate: form.plannedStartDate,
                    plannedEndDate: form.plannedEndDate,
                    description: form.description,
                    clusterId: form.clusterId,
                    status: "Active",
                    budget: 0,
                  })) as Project;
                  setProjectList((prev) => [...prev, created]);
                  upsertProjectCache(created);
                  setShowCreate(false);
                  setForm(DEFAULT_FORM);
                } catch (err) {
                  alert(
                    (err as Error)?.message ||
                      "Failed to create project. Please try again.",
                  );
                } finally {
                  setCreating(false);
                }
              }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. Harbour View Tower"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.client}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, client: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Client name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contract Type
                  </label>
                  <select
                    value={form.contractType}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        contractType: e.target.value as ContractType,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {(
                      [
                        "Lump Sum",
                        "Remeasurable",
                        "Cost Plus",
                      ] as ContractType[]
                    ).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.location}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, location: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. Lekki, Lagos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cluster
                  </label>
                  <select
                    value={form.clusterId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, clusterId: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Select cluster</option>
                    {["Lekki-VI", "Ikeja", "Apapa"].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site Address
                  </label>
                  <input
                    type="text"
                    value={form.siteAddress}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, siteAddress: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Full address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Manager *
                  </label>
                  <select
                    required
                    value={form.projectManager}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, projectManager: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Select PM</option>
                    <optgroup label="Employees">
                      {staffList.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </optgroup>
                    {contractors.length > 0 && (
                      <optgroup label="Contractors">
                        {contractors.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Planned Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.plannedStartDate}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        plannedStartDate: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Planned End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.plannedEndDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, plannedEndDate: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Project description"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-white rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: "#E8973A" }}
                >
                  {creating ? "Creating…" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
