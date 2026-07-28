import { useNavigate } from "react-router";
import {
  Users,
  Briefcase,
  ChevronRight,
  Search,
  Award,
  Plus,
  X,
  ArrowUpDown,
  Filter,
  ChevronDown,
  Download,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { projects, stakeholders } from "./mockData";
import { exportCSV } from "../../utils/exportCSV";
import { listStakeholders } from "../../api/stakeholders";
import { useNumbering } from "../../stores/numberingStore";

const LEVEL_STYLES: Record<string, { bg: string; text: string }> = {
  High: { bg: "#FDE8E6", text: "#B33A2E" },
  Medium: { bg: "#FEF6E6", text: "#B0780F" },
  Low: { bg: "#E8F8EF", text: "#1B7A43" },
};

const ROLES = [
  "Client",
  "Contractor",
  "Consultant",
  "Regulator",
  "Community",
  "Financier",
  "Other",
];

type SortField =
  | "name"
  | "organization"
  | "project"
  | "role"
  | "influenceLevel"
  | "impactLevel";

export function StakeholdersOverviewPage() {
  const { getNextId } = useNumbering();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [localStakeholders, setLocalStakeholders] = useState(stakeholders);
  useEffect(() => {
    let active = true;
    listStakeholders()
      .then((data) => {
        if (active && data.length > 0) setLocalStakeholders(data);
      })
      .catch(() => {
        /* keep mock data on failure */
      });
    return () => {
      active = false;
    };
  }, []);
  const [showModal, setShowModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>("All");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [form, setForm] = useState({
    name: "",
    organization: "",
    role: "Client",
    influenceLevel: "Medium" as "High" | "Medium" | "Low",
    impactLevel: "Medium" as "High" | "Medium" | "Low",
    notes: "",
    projectId: projects[0]?.id ?? "",
  });

  const clients = localStakeholders.filter((s) => s.role === "Client");
  const consultants = localStakeholders.filter((s) => s.role === "Consultant");
  const regulators = localStakeholders.filter((s) => s.role === "Regulator");

  const stats = [
    {
      icon: Users,
      label: "Total Stakeholders",
      value: localStakeholders.length,
    },
    {
      icon: Briefcase,
      label: "Clients",
      value: clients.length,
      color: "#E8973A",
    },
    {
      icon: Award,
      label: "Consultants",
      value: consultants.length,
      color: "#1A5BB3",
    },
    {
      icon: Award,
      label: "Regulators",
      value: regulators.length,
      color: "#27AE60",
    },
  ];

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    let list = localStakeholders;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.organization.toLowerCase().includes(q) ||
          s.role.toLowerCase().includes(q),
      );
    }

    // Project filter
    if (projectFilter !== "All") {
      list = list.filter((s) => s.projectId === projectFilter);
    }

    // Role filter
    if (roleFilter !== "All") {
      list = list.filter((s) => s.role === roleFilter);
    }

    // Sorting
    if (sortField) {
      list = [...list].sort((a, b) => {
        let va: string, vb: string;
        if (sortField === "project") {
          const pa = projects.find((p) => p.id === a.projectId);
          const pb = projects.find((p) => p.id === b.projectId);
          va = pa?.name ?? a.projectId;
          vb = pb?.name ?? b.projectId;
        } else {
          va = a[sortField];
          vb = b[sortField];
        }
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }

    return list;
  }, [
    localStakeholders,
    search,
    projectFilter,
    roleFilter,
    sortField,
    sortDir,
  ]);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  function handleCreate() {
    if (!form.name.trim()) return;
    const newStakeholder = {
      id: getNextId("Stakeholder"),
      projectId: form.projectId,
      name: form.name.trim(),
      organization: form.organization.trim(),
      role: form.role,
      influenceLevel: form.influenceLevel,
      impactLevel: form.impactLevel,
      notes: form.notes.trim(),
    };
    setLocalStakeholders((prev) => [...prev, newStakeholder]);
    setShowModal(false);
    setForm({
      name: "",
      organization: "",
      role: "Client",
      influenceLevel: "Medium",
      impactLevel: "Medium",
      notes: "",
      projectId: projects[0]?.id ?? "",
    });
    showToast(`Stakeholder "${newStakeholder.name}" created`);
  }

  function closeModal() {
    setShowModal(false);
    setForm({
      name: "",
      organization: "",
      role: "Client",
      influenceLevel: "Medium",
      impactLevel: "Medium",
      notes: "",
      projectId: projects[0]?.id ?? "",
    });
  }

  return (
    <div
      style={{ backgroundColor: "#F7F8FA" }}
      className="min-h-screen p-6 space-y-6"
    >
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {toastMsg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#1A202C" }}>
            Stakeholders Overview
          </h1>
          <p className="text-sm mt-1" style={{ color: "#718096" }}>
            Stakeholders across all projects
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: "#E8973A" }}
        >
          <Plus className="w-4 h-4" /> Add Stakeholder
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="bg-white rounded-lg p-4 flex items-center gap-3"
              style={{ border: "1px solid #E2E8F0" }}
            >
              <Icon
                className="w-5 h-5"
                style={{ color: s.color ?? "#718096" }}
              />
              <div>
                <p className="text-xl font-bold" style={{ color: "#1A202C" }}>
                  {s.value}
                </p>
                <p className="text-xs" style={{ color: "#718096" }}>
                  {s.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="bg-white rounded-lg p-4"
        style={{ border: "1px solid #E2E8F0" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "#718096" }}
            />
            <input
              type="text"
              placeholder="Search stakeholders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none"
              style={{ border: "1px solid #E2E8F0", color: "#1A202C" }}
            />
          </div>
          <button
            onClick={() => {
              const rows = filtered.map((s) => {
                const proj = projects.find((p) => p.id === s.projectId);
                return [
                  s.name,
                  s.organization,
                  proj?.name ?? s.projectId,
                  s.role,
                  s.influenceLevel,
                  s.impactLevel,
                ];
              });
              exportCSV(
                "stakeholders",
                [
                  "Name",
                  "Organization",
                  "Project",
                  "Role",
                  "Influence",
                  "Impact",
                ],
                rows,
              );
            }}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-600 rounded-md text-sm font-medium hover:bg-gray-50"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
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
          <span className="text-sm" style={{ color: "#718096" }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {showFilters && (
          <div className="flex gap-4 flex-wrap mb-4">
            <div>
              <label
                className="block text-xs font-medium"
                style={{ color: "#718096" }}
              >
                Project
              </label>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="border rounded-md text-sm px-2 py-1.5 outline-none"
                style={{ borderColor: "#E2E8F0", color: "#1A202C" }}
              >
                <option value="All">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="block text-xs font-medium"
                style={{ color: "#718096" }}
              >
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="border rounded-md text-sm px-2 py-1.5 outline-none"
                style={{ borderColor: "#E2E8F0", color: "#1A202C" }}
              >
                <option value="All">All Roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                setProjectFilter("All");
                setRoleFilter("All");
                setSearch("");
              }}
              className="self-end text-xs font-medium"
              style={{ color: "#E8973A" }}
            >
              Clear all
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  backgroundColor: "#F7F8FA",
                  borderBottom: "1px solid #E2E8F0",
                }}
              >
                {[
                  { key: "name", label: "Name" },
                  { key: "organization", label: "Organization" },
                  { key: "project", label: "Project" },
                  { key: "role", label: "Role" },
                  { key: "influenceLevel", label: "Influence" },
                  { key: "impactLevel", label: "Impact" },
                ].map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key as SortField)}
                    className="text-left px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900 transition-colors"
                    style={{ color: "#718096" }}
                  >
                    <span className="flex items-center gap-1">
                      {col.key === "influenceLevel" ||
                      col.key === "impactLevel" ? (
                        <span className="flex-1 text-center">{col.label}</span>
                      ) : (
                        col.label
                      )}
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    </span>
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => {
                const project = projects.find((p) => p.id === s.projectId);
                const infStyle = LEVEL_STYLES[s.influenceLevel] ?? {
                  bg: "#F1F5F9",
                  text: "#475569",
                };
                const impStyle = LEVEL_STYLES[s.impactLevel] ?? {
                  bg: "#F1F5F9",
                  text: "#475569",
                };
                return (
                  <tr
                    key={s.id}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      borderBottom:
                        i < filtered.length - 1 ? "1px solid #E2E8F0" : "none",
                    }}
                    onClick={() =>
                      navigate(
                        `/apps/construction/projects/${s.projectId}/stakeholders`,
                      )
                    }
                  >
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: "#1A202C" }}
                    >
                      {s.name}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#718096" }}>
                      {s.organization}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#718096" }}>
                      {project?.name ?? s.projectId}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "#E8F0FE", color: "#1A5BB3" }}
                      >
                        {s.role}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: infStyle.bg,
                          color: infStyle.text,
                        }}
                      >
                        {s.influenceLevel}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: impStyle.bg,
                          color: impStyle.text,
                        }}
                      >
                        {s.impactLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight
                        className="w-4 h-4"
                        style={{ color: "#718096" }}
                      />
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-8 text-sm"
                    style={{ color: "#718096" }}
                  >
                    No stakeholders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Stakeholder Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h3
                className="text-lg font-semibold"
                style={{ color: "#1A202C" }}
              >
                Add Stakeholder
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "#4A5568" }}
                >
                  Name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. John Doe"
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "#E2E8F0", color: "#1A202C" }}
                  autoFocus
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "#4A5568" }}
                >
                  Organization
                </label>
                <input
                  value={form.organization}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, organization: e.target.value }))
                  }
                  placeholder="e.g. BuildCorp Ltd"
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "#E2E8F0", color: "#1A202C" }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "#4A5568" }}
                  >
                    Role
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, role: e.target.value }))
                    }
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ borderColor: "#E2E8F0", color: "#1A202C" }}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "#4A5568" }}
                  >
                    Project
                  </label>
                  <select
                    value={form.projectId}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, projectId: e.target.value }))
                    }
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ borderColor: "#E2E8F0", color: "#1A202C" }}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "#4A5568" }}
                  >
                    Influence Level
                  </label>
                  <select
                    value={form.influenceLevel}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        influenceLevel: e.target.value as
                          | "High"
                          | "Medium"
                          | "Low",
                      }))
                    }
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ borderColor: "#E2E8F0", color: "#1A202C" }}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "#4A5568" }}
                  >
                    Impact Level
                  </label>
                  <select
                    value={form.impactLevel}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        impactLevel: e.target.value as
                          | "High"
                          | "Medium"
                          | "Low",
                      }))
                    }
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ borderColor: "#E2E8F0", color: "#1A202C" }}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "#4A5568" }}
                >
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  rows={3}
                  placeholder="Optional notes..."
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none resize-none"
                  style={{ borderColor: "#E2E8F0", color: "#1A202C" }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 border rounded-lg text-sm font-medium"
                style={{ borderColor: "#E2E8F0", color: "#4A5568" }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.name.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                style={{ backgroundColor: "#E8973A" }}
              >
                Create Stakeholder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
