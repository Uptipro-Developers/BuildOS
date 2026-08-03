import { useEffect, useState } from "react";
import {
  Settings,
  Save,
  Plus,
  ToggleLeft,
  ToggleRight,
  X,
  Check,
  Tags,
  Layers,
  Sun,
  Building2,
  Users,
  UserCog,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Shield,
  Edit3,
  Trash2,
} from "lucide-react";
import type {
  Sector,
  ScheduleLevelConfig,
  WeatherConfig,
  ProjectRole,
  ProjectTypeSetting,
} from "./types";
import { ALL_PERMISSIONS } from "./types";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import {
  defaultScheduleLevels,
  defaultWeatherConfig,
  defaultProjectTypes,
} from "./mockData";
import {
  listConstructionSettings,
  createConstructionSetting,
  updateConstructionSetting,
} from "../../api/construction-settings";
import { useRoles } from "../../contexts/RolesContext";
import { NumberingConfigPanel } from "../../components/NumberingConfigPanel";

const defaultTradeTypes = [
  "Masonry",
  "Concreting labor",
  "Carpentry (formwork)",
  "Carpentry (roofing)",
  "Iron benders / steel fixers",
  "Tiling",
  "Plumbing",
  "Electrical",
  "Painting",
  "Glazing / aluminum works",
  "General operations / laboring",
  "Equipment operation",
  "Scaffolding",
  "Welding",
];

interface ReportSetting {
  id: string;
  key: string;
  label: string;
  enabled: boolean;
}

const defaultReportSettings: ReportSetting[] = [
  {
    id: "rs1",
    key: "auto_generate_weekly",
    label: "Auto-generate weekly progress report",
    enabled: true,
  },
  {
    id: "rs2",
    key: "rag_summary",
    label: "Include RAG summary in reports",
    enabled: true,
  },
  {
    id: "rs3",
    key: "cost_breakdown",
    label: "Include cost breakdown",
    enabled: true,
  },
  {
    id: "rs4",
    key: "resource_performance",
    label: "Include resource performance metrics",
    enabled: false,
  },
  {
    id: "rs5",
    key: "schedule_gantt",
    label: "Include schedule Gantt chart",
    enabled: true,
  },
  {
    id: "rs6",
    key: "daily_report_reminder",
    label: "Daily report submission reminder",
    enabled: true,
  },
];

type SectionId =
  | "project-types"
  | "schedule-levels"
  | "weather"
  | "hr-classification"
  | "trade-types"
  | "report-settings"
  | "project-roles";

/**
 * Settings is a tabbed module in the prototype. This page rendered every section
 * as a collapsible card on one long scrolling column instead, which is why it
 * did not match: the navigation model was different, not just the styling.
 *
 * Resources carries roles, HR classification and trade types together, as the
 * prototype's ResourcesPanel does.
 */
const TABS = [
  "projects",
  "schedule",
  "weather",
  "resources",
  "reports",
  "numbering",
] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  projects: "Project Types",
  schedule: "Schedule",
  weather: "Weather",
  resources: "Resources",
  reports: "Reports",
  numbering: "Numbering",
};

export function SettingsPage() {
  const { roles, addRole, updateRole, deleteRole } = useRoles();
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<ProjectRole | null>(
    null,
  );
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [roleFormName, setRoleFormName] = useState("");
  const [roleFormDesc, setRoleFormDesc] = useState("");
  const [roleFormPerms, setRoleFormPerms] = useState<string[]>([]);

  const [tradeTypes, setTradeTypes] = useState<string[]>(defaultTradeTypes);
  const [reportSettings, setReportSettings] = useState<ReportSetting[]>(
    defaultReportSettings,
  );
  const [newTrade, setNewTrade] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<SectionId>>(new Set());
  const [tab, setTab] = useState<Tab>("projects");

  const [scheduleLevels, setScheduleLevels] = useState<ScheduleLevelConfig[]>(
    defaultScheduleLevels,
  );
  const [weatherConfig, setWeatherConfig] =
    useState<WeatherConfig[]>(defaultWeatherConfig);
  const [newWeather, setNewWeather] = useState("");
  const [projectTypes, setProjectTypes] =
    useState<ProjectTypeSetting[]>(defaultProjectTypes);
  const [newSector, setNewSector] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newDescriptor, setNewDescriptor] = useState("");
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    listConstructionSettings()
      .then((rows) => {
        const s = rows[0];
        if (!s) return;
        setSettingsId(s.id ?? null);
        if (s.scheduleLevels?.length) setScheduleLevels(s.scheduleLevels);
        if (s.weatherConfig?.length) setWeatherConfig(s.weatherConfig);
        if (s.projectTypes?.length)
          setProjectTypes(s.projectTypes as typeof defaultProjectTypes);
      })
      .catch(() => {});
  }, []);

  function toggleCollapse(id: SectionId) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function Section({
    id,
    icon,
    title,
    description,
    children,
  }: {
    id: SectionId;
    icon: React.ReactNode;
    title: string;
    description: string;
    children: React.ReactNode;
  }) {
    const isCollapsed = collapsed.has(id);
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <button
          onClick={() => toggleCollapse(id)}
          className="flex items-center justify-between w-full text-left mb-1"
        >
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          </div>
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {!isCollapsed && (
          <>
            <p className="text-xs text-gray-400 mb-4">{description}</p>
            {children}
          </>
        )}
      </div>
    );
  }

  function handleSave() {
    setIsSaving(true);
    const payload = { scheduleLevels, weatherConfig, projectTypes };
    const request = settingsId
      ? updateConstructionSetting(settingsId, payload)
      : createConstructionSetting(payload).then((saved) => {
          if (saved?.id) setSettingsId(saved.id);
          return saved;
        });
    request
      .catch(() => {})
      .finally(() => {
        setIsSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      });
  }

  function toggleReportSetting(id: string) {
    setReportSettings((prev) =>
      prev.map((rs) => (rs.id === id ? { ...rs, enabled: !rs.enabled } : rs)),
    );
  }

  function addTrade() {
    if (!newTrade.trim() || tradeTypes.includes(newTrade.trim())) return;
    setTradeTypes((prev) => [...prev, newTrade.trim()]);
    setNewTrade("");
  }

  function removeTrade(t: string) {
    setTradeTypes((prev) => prev.filter((x) => x !== t));
  }

  function updateScheduleLevel(
    idx: number,
    field: keyof ScheduleLevelConfig,
    val: string | boolean | number | null,
  ) {
    setScheduleLevels((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: val } : l)),
    );
  }

  function addScheduleLevel() {
    const next = scheduleLevels.length + 1;
    setScheduleLevels((prev) => [
      ...prev,
      {
        level: next,
        name: `Level ${next}`,
        prefix: `L${next}`,
        canAssignResources: true,
      },
    ]);
  }

  function removeScheduleLevel(idx: number) {
    setScheduleLevels((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleWeather(idx: number) {
    setWeatherConfig((prev) =>
      prev.map((w, i) => (i === idx ? { ...w, enabled: !w.enabled } : w)),
    );
  }

  function addWeather() {
    if (!newWeather.trim()) return;
    const val = newWeather.trim();
    setWeatherConfig((prev) => [
      ...prev,
      { value: val as any, label: val, enabled: true },
    ]);
    setNewWeather("");
  }

  function removeWeather(idx: number) {
    setWeatherConfig((prev) => prev.filter((_, i) => i !== idx));
  }

  function addSector() {
    if (
      !newSector.trim() ||
      projectTypes.some((pt) => pt.sector === newSector.trim())
    )
      return;
    setProjectTypes((prev) => [
      ...prev,
      {
        sector: newSector.trim() as Sector,
        categories: [newCategory.trim() || "General"],
        descriptors: [],
      },
    ]);
    setNewSector("");
    setNewCategory("");
  }

  function addDescriptor(sector: string) {
    if (!newDescriptor.trim()) return;
    setProjectTypes((prev) =>
      prev.map((pt) =>
        pt.sector === sector
          ? {
              ...pt,
              descriptors: [...(pt.descriptors || []), newDescriptor.trim()],
            }
          : pt,
      ),
    );
    setNewDescriptor("");
  }

  function removeDescriptor(sector: string, desc: string) {
    setProjectTypes((prev) =>
      prev.map((pt) =>
        pt.sector === sector
          ? {
              ...pt,
              descriptors: (pt.descriptors || []).filter((d) => d !== desc),
            }
          : pt,
      ),
    );
  }

  function removeSector(sector: string) {
    setProjectTypes((prev) => prev.filter((pt) => pt.sector !== sector));
  }

  function addCategory(sector: string) {
    if (!newCategory.trim()) return;
    setProjectTypes((prev) =>
      prev.map((pt) =>
        pt.sector === sector
          ? { ...pt, categories: [...pt.categories, newCategory.trim()] }
          : pt,
      ),
    );
    setNewCategory("");
  }

  function removeCategory(sector: string, cat: string) {
    setProjectTypes((prev) =>
      prev.map((pt) =>
        pt.sector === sector
          ? { ...pt, categories: pt.categories.filter((c) => c !== cat) }
          : pt,
      ),
    );
  }

  function startEditRole(role: ProjectRole) {
    setEditingRole(role.id);
    setRoleFormName(role.name);
    setRoleFormDesc(role.description);
    setRoleFormPerms([...role.permissions]);
  }

  function cancelEditRole() {
    setEditingRole(null);
    setRoleFormName("");
    setRoleFormDesc("");
    setRoleFormPerms([]);
  }



  function saveRoleEdit() {
    if (!editingRole || !roleFormName.trim()) return;
    updateRole(editingRole, {
      name: roleFormName.trim(),
      description: roleFormDesc.trim(),
      permissions: roleFormPerms,
    });
    cancelEditRole();
  }

  function addCustomRole() {
    if (!newRoleName.trim()) return;
    addRole({
      name: newRoleName.trim(),
      description: newRoleDesc.trim(),
      permissions: [],
    });
    setNewRoleName("");
    setNewRoleDesc("");
  }

  function toggleRolePerm(perm: string) {
    setRoleFormPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  }

  const PERMISSION_GROUPS = ALL_PERMISSIONS.reduce<
    Record<string, (typeof ALL_PERMISSIONS)[number][]>
  >(
    (acc, p) => {
      const g = p.group;
      if (!acc[g]) acc[g] = [];
      acc[g].push(p);
      return acc;
    },
    {} as Record<string, (typeof ALL_PERMISSIONS)[number][]>,
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Projects module configuration
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${saved ? "bg-green-600 text-white" : "bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-40"}`}
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved" : isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${tab === t ? "border-orange-600 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5">
        {tab === "projects" && (
        <Section
          id="project-types"
          icon={<Tags className="w-4 h-4 text-gray-400" />}
          title="Project Types"
          description="Configure sectors, categories, and descriptors available during project setup"
        >
          <div className="space-y-3">
            {projectTypes.map((pt) => (
              <div
                key={pt.sector}
                className="border border-gray-100 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {pt.sector}
                  </span>
                  <button
                    onClick={() => removeSector(pt.sector)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 font-medium mb-1.5">
                  Categories
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {pt.categories.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full"
                    >
                      {c}
                      <button
                        onClick={() => removeCategory(pt.sector, c)}
                        className="hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Add category..."
                    className="flex-1 max-w-xs border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    onKeyDown={(e) =>
                      e.key === "Enter" && addCategory(pt.sector)
                    }
                  />
                  <button
                    onClick={() => addCategory(pt.sector)}
                    disabled={!newCategory.trim()}
                    className="text-xs px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-40"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 font-medium mb-1.5">
                  Descriptors
                </p>
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {(pt.descriptors || []).map((d) => (
                    <span
                      key={d}
                      className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full"
                    >
                      {d}
                      <button
                        onClick={() => removeDescriptor(pt.sector, d)}
                        className="hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={newDescriptor}
                    onChange={(e) => setNewDescriptor(e.target.value)}
                    placeholder="Add descriptor..."
                    className="flex-1 max-w-xs border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    onKeyDown={(e) =>
                      e.key === "Enter" && addDescriptor(pt.sector)
                    }
                  />
                  <button
                    onClick={() => addDescriptor(pt.sector)}
                    disabled={!newDescriptor.trim()}
                    className="text-xs px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-40"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <input
              value={newSector}
              onChange={(e) => setNewSector(e.target.value)}
              placeholder="New sector name..."
              className="flex-1 max-w-xs border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={addSector}
              disabled={!newSector.trim()}
              className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" /> Add Sector
            </button>
          </div>
        </Section>
        )}

        {tab === "schedule" && (
        <Section
          id="schedule-levels"
          icon={<Layers className="w-4 h-4 text-gray-400" />}
          title="Schedule Levels"
          description="Configure the task hierarchy levels used in the schedule builder. Each level can have resources assigned."
        >
          <div className="space-y-2 mb-3">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 text-xs font-medium text-gray-500 px-3 py-1">
              <span>Level</span> <span>Name</span> <span>Prefix</span>{" "}
              <span>Parent</span> <span>Resources</span>
            </div>
            {scheduleLevels.map((l, i) => (
              <div
                key={l.level}
                className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 items-center px-3 py-2 rounded-lg bg-gray-50"
              >
                <span className="text-xs font-mono text-gray-400 w-6">
                  L{l.level}
                </span>
                <input
                  value={l.name}
                  onChange={(e) =>
                    updateScheduleLevel(i, "name", e.target.value)
                  }
                  className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                <input
                  value={l.prefix}
                  onChange={(e) =>
                    updateScheduleLevel(i, "prefix", e.target.value)
                  }
                  className="text-sm w-16 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                />
                <select
                  value={String(l.parentLevel ?? "")}
                  onChange={(e) =>
                    updateScheduleLevel(
                      i,
                      "parentLevel",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="">None</option>
                  {scheduleLevels.slice(0, i).map((pl) => (
                    <option key={pl.level} value={pl.level}>
                      L{pl.level} ({pl.name})
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      updateScheduleLevel(
                        i,
                        "canAssignResources",
                        !l.canAssignResources,
                      )
                    }
                    className={`text-xs px-2 py-1 rounded font-medium ${l.canAssignResources ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}
                  >
                    {l.canAssignResources ? "Yes" : "No"}
                  </button>
                  <button
                    onClick={() => removeScheduleLevel(i)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addScheduleLevel}
            className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Add Level
          </button>
        </Section>
        )}

        {tab === "weather" && (
        <Section
          id="weather"
          icon={<Sun className="w-4 h-4 text-gray-400" />}
          title="Weather Types"
          description="Configure weather options available in daily reports"
        >
          <div className="flex flex-wrap gap-2 mb-3">
            {weatherConfig.map((w, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${w.enabled ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-400 line-through"}`}
              >
                {w.label}
                <button
                  onClick={() => toggleWeather(i)}
                  className="hover:opacity-70"
                >
                  {w.enabled ? (
                    <ToggleRight className="w-3.5 h-3.5" />
                  ) : (
                    <ToggleLeft className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => removeWeather(i)}
                  className="hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={newWeather}
              onChange={(e) => setNewWeather(e.target.value)}
              placeholder="New weather type..."
              className="flex-1 max-w-xs border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              onKeyDown={(e) => e.key === "Enter" && addWeather()}
            />
            <button
              onClick={addWeather}
              disabled={!newWeather.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </Section>
        )}

        {tab === "resources" && (
        <Section
          id="hr-classification"
          icon={<Users className="w-4 h-4 text-indigo-600" />}
          title="Human Resource Classification"
          description="Human resource types available in the system and where each type is managed."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-semibold text-blue-900">
                  Employees
                </h4>
              </div>
              <p className="text-xs text-blue-700 mb-1">
                Managed within the HR Module.
              </p>
              <p className="text-xs text-gray-500 mb-3">
                Not configurable from the Project Module. Employee data is
                sourced from the HR module.
              </p>
              <a
                href="/apps/hr/employees"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
              >
                Manage Employees in HR Module <ArrowRight className="w-3 h-3" />
              </a>
            </div>
            <div className="rounded-lg border border-purple-200 bg-purple-50/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <UserCog className="w-4 h-4 text-purple-600" />
                <h4 className="text-sm font-semibold text-purple-900">
                  Individual Contractors
                </h4>
              </div>
              <p className="text-xs text-purple-700 mb-1">
                Managed within the Project Module.
              </p>
              <p className="text-xs text-gray-500 mb-3">
                Individual contractors are created and managed in the Resources
                Overview page and can be assigned to specific projects.
              </p>
              <a
                href="/apps/construction/resources"
                className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 hover:text-purple-900"
              >
                Manage Individual Contractors in Resources{" "}
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-50/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-orange-600" />
                <h4 className="text-sm font-semibold text-orange-900">
                  Contractors
                </h4>
              </div>
              <p className="text-xs text-orange-700 mb-1">
                Managed within the Project Module.
              </p>
              <p className="text-xs text-gray-500 mb-3">
                Contractors and subcontractors are created and managed in the
                Resources Overview page and assigned to projects.
              </p>
              <a
                href="/apps/construction/resources"
                className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 hover:text-orange-900"
              >
                Manage Contractors in Resources{" "}
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </Section>
        )}

        {tab === "resources" && (
        <Section
          id="project-roles"
          icon={<Shield className="w-4 h-4 text-orange-500" />}
          title="Project Roles"
          description="Define project roles and map them to daily report section permissions. Roles are used across all projects."
        >
          <div className="space-y-3">
            {roles.map((role) => (
              <div
                key={role.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {editingRole === role.id ? (
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Role Name
                        </label>
                        <input
                          value={roleFormName}
                          onChange={(e) => setRoleFormName(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Description
                        </label>
                        <input
                          value={roleFormDesc}
                          onChange={(e) => setRoleFormDesc(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Permissions
                      </label>
                      {Object.entries(PERMISSION_GROUPS).map(
                        ([group, perms]) => (
                          <div key={group} className="mb-3">
                            <p className="text-xs font-medium text-gray-500 mb-1.5">
                              {group}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {perms.map((p) => {
                                const isOn = roleFormPerms.includes(p.key);
                                return (
                                  <button
                                    key={p.key}
                                    onClick={() => toggleRolePerm(p.key)}
                                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${isOn ? "bg-orange-50 text-orange-700 border-orange-300" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"}`}
                                    title={p.description}
                                  >
                                    {p.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={cancelEditRole}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveRoleEdit}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Shield className="w-4 h-4 text-gray-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {role.name}
                          </p>
                          {role.description && (
                            <p className="text-xs text-gray-500 truncate">
                              {role.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => startEditRole(role)}
                          className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteRoleTarget(role)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {role.permissions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 ml-6">
                        {role.permissions.map((p) => {
                          const permDef = ALL_PERMISSIONS.find(
                            (ap) => ap.key === p,
                          );
                          return (
                            <span
                              key={p}
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600"
                            >
                              {permDef?.label ?? p}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add custom role */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-700 mb-2">
              Add Custom Role
            </p>
            <div className="flex items-center gap-2">
              <input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Role name..."
                className="flex-1 max-w-xs border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <input
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                placeholder="Description (optional)"
                className="flex-1 max-w-xs border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                onClick={addCustomRole}
                disabled={!newRoleName.trim()}
                className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" /> Add Role
              </button>
            </div>
          </div>
        </Section>
        )}

        {tab === "resources" && (
        <Section
          id="trade-types"
          icon={<Settings className="w-4 h-4 text-gray-400" />}
          title="Trade Types"
          description="Project trade categories used for resource classification and planning"
        >
          <div className="flex flex-wrap gap-2 mb-3">
            {tradeTypes.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full"
              >
                {t}
                <button
                  onClick={() => removeTrade(t)}
                  className="hover:text-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={newTrade}
              onChange={(e) => setNewTrade(e.target.value)}
              placeholder="New trade type..."
              className="flex-1 max-w-xs border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              onKeyDown={(e) => e.key === "Enter" && addTrade()}
            />
            <button
              onClick={addTrade}
              disabled={!newTrade.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </Section>
        )}

        {tab === "reports" && (
        <Section
          id="report-settings"
          icon={<Settings className="w-4 h-4 text-gray-400" />}
          title="Default Report Settings"
          description="Configure default options for generated reports"
        >
          <div className="space-y-2">
            {reportSettings.map((rs) => (
              <div
                key={rs.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
              >
                <span className="text-sm text-gray-700">{rs.label}</span>
                <button
                  onClick={() => toggleReportSetting(rs.id)}
                  className={`flex items-center gap-2 text-sm transition-colors ${rs.enabled ? "text-orange-600" : "text-gray-400"}`}
                >
                  {rs.enabled ? (
                    <>
                      <ToggleRight className="w-5 h-5" />{" "}
                      <span className="text-xs font-medium">ON</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5" />{" "}
                      <span className="text-xs font-medium">OFF</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </Section>
        )}

        {/* Module numbering.

            This card filtered with
            `configs.filter(cfg => /^Construction/.test(cfg.module))`, and no module
            is named that way — the sequences here are Project, Structure, SiteTask,
            DailyReport, Issue, ChangeRequest, NonConformance, HSERecord and the rest
            — so the list rendered empty and nothing could be configured. The shared
            panel selects by the `app` a sequence belongs to, and persists to the
            server. */}
        {tab === "numbering" && (
          <NumberingConfigPanel app="construction" accent="orange" />
        )}

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-medium transition-colors ${saved ? "bg-green-600 text-white" : "bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-40"}`}
          >
            {saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved
              ? "Settings Saved"
              : isSaving
                ? "Saving..."
                : "Save All Settings"}
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!deleteRoleTarget}
        title="Delete Role?"
        description={`Remove the "${deleteRoleTarget?.name ?? ""}" role? This cannot be undone.`}
        confirmLabel="Delete"
        isDangerous
        onConfirm={() => {
          if (deleteRoleTarget) deleteRole(deleteRoleTarget.id);
          setDeleteRoleTarget(null);
        }}
        onCancel={() => setDeleteRoleTarget(null)}
      />
    </div>
  );
}
