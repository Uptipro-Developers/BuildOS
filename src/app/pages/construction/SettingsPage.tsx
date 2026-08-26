import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import type { ScheduleLevelConfig, WeatherConfig, ProjectRole } from "./types";
import { ALL_PERMISSIONS } from "./types";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { defaultScheduleLevels, defaultWeatherConfig } from "./mockData";
import {
  listConstructionSettings,
  createConstructionSetting,
  updateConstructionSetting,
  getProjectSectors,
  createProjectSector,
  deleteProjectSector,
  createProjectCategory,
  deleteProjectCategory,
  updateProjectCategory,
  type ProjectSector,
  type ProjectCategory,
  type ProjectStructureField,
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

/**
 * The one report switch that still asks for a scheduled job the Reports module
 * does not run: weekly progress reports are delivered by Admin › Report
 * Automation, so this stays a pointer rather than implying it fires here.
 * ("Daily report submission reminder" now drives a real reminder job.)
 */
const SCHEDULING_REPORT_KEYS = ["auto_generate_weekly"];

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

/**
 * One collapsible settings block.
 *
 * Declared at module scope on purpose. It used to be a function *inside*
 * SettingsPage, which made it a brand-new component type on every render: React
 * cannot match a new type to the old one, so it unmounted and remounted the
 * whole section each time any state changed. That is why the panel appeared to
 * show the right information and then vanish — and why typing into "Add
 * category…" lost focus after a single character, since the input was destroyed
 * and recreated on each keystroke. Reloading appeared to fix it because the
 * first paint happens before any state change.
 */
function Section({
  icon,
  title,
  description,
  isCollapsed,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <button
        onClick={onToggle}
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

type StructureFieldType = "text" | "number" | "select";

/** camelCase slug derived from a label, e.g. "Room Type" -> "roomType". */
function slugifyFieldKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "");
}

// ── Level 4: Add/Edit Structure Field modal ─────────────────────────────────
function StructureFieldModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: ProjectStructureField;
  onClose: () => void;
  onSave: (field: ProjectStructureField) => void;
}) {
  const [key, setKey] = useState(initial?.key ?? "");
  // Once the key has been hand-edited (or we're editing an existing field),
  // stop overwriting it from the label.
  const [keyTouched, setKeyTouched] = useState(Boolean(initial));
  const [label, setLabel] = useState(initial?.label ?? "");
  const [type, setType] = useState<StructureFieldType>(initial?.type ?? "select");
  const [optionsText, setOptionsText] = useState(
    (initial?.options ?? []).join(", "),
  );

  function handleLabelChange(v: string) {
    setLabel(v);
    if (!keyTouched) setKey(slugifyFieldKey(v));
  }

  function submit() {
    if (!label.trim()) return;
    const options = optionsText
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    onSave({
      id:
        initial?.id ??
        `fld-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      key: key.trim() || slugifyFieldKey(label),
      label: label.trim(),
      type,
      options: type === "select" ? options : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {initial ? "Edit Structure Field" : "Add Structure Field"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Field Key
            </label>
            <input
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setKeyTouched(true);
              }}
              placeholder="e.g. roomType (auto-fills from label)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Field Label <span className="text-red-500">*</span>
            </label>
            <input
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g. Room Type"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Field Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as StructureFieldType)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="select">Select (dropdown)</option>
              <option value="text">Text</option>
              <option value="number">Number</option>
            </select>
          </div>
          {type === "select" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Options{" "}
                <span className="text-gray-400 font-normal">
                  (comma-separated)
                </span>
              </label>
              <textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={3}
                placeholder="e.g. 1-Bedroom, 2-Bedroom, 3-Bedroom"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!label.trim()}
            className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {initial ? "Save Field" : "Add Field"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  // Project Types (Sector → Category) are real, independently-persisted rows
  // now — see api/construction-settings.ts — not a JSON field bundled into
  // this page's "Save Settings", and not seeded from mock data: a fresh
  // install starts with none until an admin adds them here.
  const [sectors, setSectors] = useState<ProjectSector[]>([]);
  const [loadingSectors, setLoadingSectors] = useState(true);
  const [newSector, setNewSector] = useState("");
  const [addingSector, setAddingSector] = useState(false);
  /** Which sector currently has its "Add Category" mini-form open. */
  const [categoryFormSector, setCategoryFormSector] = useState<string | null>(
    null,
  );
  const [newCategory, setNewCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  function loadSectors() {
    setLoadingSectors(true);
    return getProjectSectors()
      .then(setSectors)
      .catch(() =>
        toast.error("Could not load project types."),
      )
      .finally(() => setLoadingSectors(false));
  }

  useEffect(() => {
    void loadSectors();
  }, []);

  useEffect(() => {
    listConstructionSettings()
      .then((rows) => {
        const s = rows[0];
        if (!s) return;
        setSettingsId(s.id ?? null);
        if (s.scheduleLevels?.length) setScheduleLevels(s.scheduleLevels);
        if (s.weatherConfig?.length) setWeatherConfig(s.weatherConfig);
        if (s.tradeTypes?.length) setTradeTypes(s.tradeTypes);
        if (s.reportSettings?.length)
          setReportSettings(s.reportSettings as ReportSetting[]);
      })
      .catch(() => { });
  }, []);

  function toggleCollapse(id: SectionId) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSave() {
    setIsSaving(true);
    const payload = {
      scheduleLevels,
      weatherConfig,
      tradeTypes,
      reportSettings,
    };
    const request = settingsId
      ? updateConstructionSetting(settingsId, payload)
      : createConstructionSetting(payload).then((saved) => {
        if (saved?.id) setSettingsId(saved.id);
        return saved;
      });
    request
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        toast.success("Settings saved.");
      })
      // Swallowed the error and showed "Saved" regardless, so a save that never
      // reached the server was indistinguishable from one that did.
      .catch((err) => {
        toast.error(
          err instanceof Error ? err.message : "Could not save the settings.",
        );
      })
      .finally(() => {
        setIsSaving(false);
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

  const sortByName = <T extends { name: string }>(rows: T[]) =>
    [...rows].sort((a, b) => a.name.localeCompare(b.name));

  async function addSector() {
    const name = newSector.trim();
    if (!name || addingSector) return;
    setAddingSector(true);
    try {
      const created = await createProjectSector(name);
      setSectors((prev) => sortByName([...prev, created]));
      setNewSector("");
      toast.success(`"${name}" added.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add sector.");
    } finally {
      setAddingSector(false);
    }
  }

  async function removeSector(sector: ProjectSector) {
    try {
      await deleteProjectSector(sector.id);
      setSectors((prev) => prev.filter((s) => s.id !== sector.id));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Could not remove "${sector.name}".`,
      );
    }
  }

  async function addCategory(sectorId: string) {
    const name = newCategory.trim();
    if (!name || addingCategory) return;
    setAddingCategory(true);
    try {
      const created = await createProjectCategory(sectorId, name);
      setSectors((prev) =>
        prev.map((s) =>
          s.id === sectorId
            ? { ...s, categories: sortByName([...s.categories, created]) }
            : s,
        ),
      );
      setNewCategory("");
      setCategoryFormSector(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add category.");
    } finally {
      setAddingCategory(false);
    }
  }

  async function removeCategory(sectorId: string, categoryId: string) {
    try {
      await deleteProjectCategory(categoryId);
      setSectors((prev) =>
        prev.map((s) =>
          s.id === sectorId
            ? { ...s, categories: s.categories.filter((c) => c.id !== categoryId) }
            : s,
        ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove category.");
    }
  }

  // ── Level 3 (Specific Descriptors) / Level 4 (Physical Structure
  // Breakdown) editing. Every action here persists immediately — there is no
  // separate save step for this part of the tab, matching the reference
  // flow: toggling Mode, adding/removing an option, and adding/editing/
  // removing a Field all hit the API right away.
  const [optionDraft, setOptionDraft] = useState<Record<string, string>>({});
  const [fieldModal, setFieldModal] = useState<{
    sectorId: string;
    categoryId: string;
    field?: ProjectStructureField;
  } | null>(null);

  /** Updates a category's fields in local state without a round trip. */
  function updateCategoryLocal(
    sectorId: string,
    categoryId: string,
    patch: Partial<ProjectCategory>,
  ) {
    setSectors((prev) =>
      prev.map((s) =>
        s.id === sectorId
          ? {
            ...s,
            categories: s.categories.map((c) =>
              c.id === categoryId ? { ...c, ...patch } : c,
            ),
          }
          : s,
      ),
    );
  }

  async function patchCategory(
    sectorId: string,
    categoryId: string,
    patch: Partial<
      Pick<
        ProjectCategory,
        | "descriptorMode"
        | "descriptorOptions"
        | "structureHeaderLabel"
        | "structureDescription"
        | "structureFields"
      >
    >,
  ) {
    try {
      const updated = await updateProjectCategory(categoryId, patch);
      updateCategoryLocal(sectorId, categoryId, updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    }
  }

  function setDescriptorMode(
    sectorId: string,
    cat: ProjectCategory,
    mode: "dropdown" | "free_text",
  ) {
    if (cat.descriptorMode === mode) return;
    void patchCategory(sectorId, cat.id, { descriptorMode: mode });
  }

  function addDescriptorOption(sectorId: string, cat: ProjectCategory) {
    const value = (optionDraft[cat.id] ?? "").trim();
    if (!value || cat.descriptorOptions.includes(value)) return;
    void patchCategory(sectorId, cat.id, {
      descriptorOptions: [...cat.descriptorOptions, value],
    });
    setOptionDraft((prev) => ({ ...prev, [cat.id]: "" }));
  }

  function removeDescriptorOption(
    sectorId: string,
    cat: ProjectCategory,
    option: string,
  ) {
    void patchCategory(sectorId, cat.id, {
      descriptorOptions: cat.descriptorOptions.filter((o) => o !== option),
    });
  }

  function saveStructureHeaderLabel(
    sectorId: string,
    categoryId: string,
    value: string,
  ) {
    void patchCategory(sectorId, categoryId, {
      structureHeaderLabel: value.trim(),
    });
  }

  function saveStructureDescription(
    sectorId: string,
    categoryId: string,
    value: string,
  ) {
    void patchCategory(sectorId, categoryId, {
      structureDescription: value.trim(),
    });
  }

  function saveStructureField(field: ProjectStructureField) {
    if (!fieldModal) return;
    const { sectorId, categoryId, field: editing } = fieldModal;
    const cat = sectors
      .find((s) => s.id === sectorId)
      ?.categories.find((c) => c.id === categoryId);
    if (!cat) return;
    const nextFields = editing
      ? cat.structureFields.map((f) => (f.id === editing.id ? field : f))
      : [...cat.structureFields, field];
    void patchCategory(sectorId, categoryId, { structureFields: nextFields });
    setFieldModal(null);
  }

  function removeStructureField(
    sectorId: string,
    cat: ProjectCategory,
    fieldId: string,
  ) {
    void patchCategory(sectorId, cat.id, {
      structureFields: cat.structureFields.filter((f) => f.id !== fieldId),
    });
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



  // Roles persist as they are edited rather than on "Save Settings", which
  // writes the other sections; the toast says so, and a failed write is
  // reported by the roles store itself.
  function saveRoleEdit() {
    if (!editingRole || !roleFormName.trim()) return;
    updateRole(editingRole, {
      name: roleFormName.trim(),
      description: roleFormDesc.trim(),
      permissions: roleFormPerms,
    });
    toast.success(`"${roleFormName.trim()}" saved.`);
    cancelEditRole();
  }

  function addCustomRole() {
    if (!newRoleName.trim()) return;
    addRole({
      name: newRoleName.trim(),
      description: newRoleDesc.trim(),
      permissions: [],
    });
    toast.success(`"${newRoleName.trim()}" added.`);
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
            isCollapsed={collapsed.has("project-types")}
            onToggle={() => toggleCollapse("project-types")}
            icon={<Tags className="w-4 h-4 text-gray-400" />}
            title="Project Types"
            description="Configure sectors and categories available during project setup"
          >
            {loadingSectors ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : (
              <div className="space-y-3">
                {sectors.length === 0 && (
                  <p className="text-sm text-gray-400">
                    No sectors configured yet — add one below.
                  </p>
                )}
                {sectors.map((sector) => (
                  <div
                    key={sector.id}
                    className="border border-gray-100 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                          L1
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {sector.name}
                        </span>
                      </div>
                      <button
                        onClick={() => removeSector(sector)}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2 pl-1">
                      {sector.categories.map((cat) => (
                        <div
                          key={cat.id}
                          className="bg-amber-50/50 rounded-md px-2.5 py-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">
                                L2
                              </span>
                              <span className="text-sm font-medium text-amber-700">
                                {cat.name}
                              </span>
                            </div>
                            <button
                              onClick={() => removeCategory(sector.id, cat.id)}
                              className="text-red-400 hover:text-red-600 p-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Level 3 — Specific Descriptors */}
                          <div className="mt-2.5 pt-2.5 border-t border-amber-100">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                              Level 3 — Specific Descriptors
                            </p>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-gray-500">Mode:</span>
                              {(
                                [
                                  ["dropdown", "Dropdown"],
                                  ["free_text", "Free Text"],
                                ] as const
                              ).map(([mode, label]) => (
                                <button
                                  key={mode}
                                  onClick={() => setDescriptorMode(sector.id, cat, mode)}
                                  className={`text-xs px-2 py-1 rounded-md font-medium ${cat.descriptorMode === mode
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                                    }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                            {cat.descriptorMode === "dropdown" && (
                              <>
                                {cat.descriptorOptions.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mb-2">
                                    {cat.descriptorOptions.map((opt) => (
                                      <span
                                        key={opt}
                                        className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full"
                                      >
                                        {opt}
                                        <button
                                          onClick={() =>
                                            removeDescriptorOption(sector.id, cat, opt)
                                          }
                                          className="hover:text-red-600"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <input
                                    value={optionDraft[cat.id] ?? ""}
                                    onChange={(e) =>
                                      setOptionDraft((prev) => ({
                                        ...prev,
                                        [cat.id]: e.target.value,
                                      }))
                                    }
                                    onKeyDown={(e) =>
                                      e.key === "Enter" &&
                                      addDescriptorOption(sector.id, cat)
                                    }
                                    placeholder="Add option..."
                                    className="flex-1 max-w-xs border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                                  />
                                  <button
                                    onClick={() => addDescriptorOption(sector.id, cat)}
                                    disabled={!(optionDraft[cat.id] ?? "").trim()}
                                    className="text-xs px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-40"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Level 4 — Physical Structure Breakdown */}
                          <div className="mt-2.5 pt-2.5 border-t border-amber-100 space-y-2">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                              Level 4 — Physical Structure Breakdown
                            </p>
                            <div>
                              <label className="block text-[11px] text-gray-500 mb-1">
                                Header Label
                              </label>
                              <input
                                value={cat.structureHeaderLabel ?? ""}
                                onChange={(e) =>
                                  updateCategoryLocal(sector.id, cat.id, {
                                    structureHeaderLabel: e.target.value,
                                  })
                                }
                                onBlur={(e) =>
                                  saveStructureHeaderLabel(
                                    sector.id,
                                    cat.id,
                                    e.target.value,
                                  )
                                }
                                placeholder="e.g. Building, Room, Warehouse"
                                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                              />
                            </div>
                            <div>
                              <p className="text-[11px] text-gray-500 mb-1">Fields</p>
                              {cat.structureFields.length > 0 && (
                                <div className="space-y-1 mb-1.5">
                                  {cat.structureFields.map((f) => (
                                    <div
                                      key={f.id}
                                      className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-2.5 py-1.5"
                                    >
                                      <span className="text-sm text-gray-800">
                                        {f.label}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-gray-400">
                                          {f.type === "select"
                                            ? `(select) ${f.options?.length ?? 0} opts`
                                            : `(${f.type})`}
                                        </span>
                                        <button
                                          onClick={() =>
                                            setFieldModal({
                                              sectorId: sector.id,
                                              categoryId: cat.id,
                                              field: f,
                                            })
                                          }
                                          className="text-gray-400 hover:text-orange-600 p-0.5"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() =>
                                            removeStructureField(sector.id, cat, f.id)
                                          }
                                          className="text-gray-400 hover:text-red-600 p-0.5"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <button
                                onClick={() =>
                                  setFieldModal({ sectorId: sector.id, categoryId: cat.id })
                                }
                                className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 font-medium"
                              >
                                <Plus className="w-3 h-3" /> Add Field
                              </button>
                            </div>
                            <div>
                              <label className="block text-[11px] text-gray-500 mb-1">
                                Description
                              </label>
                              <input
                                value={cat.structureDescription ?? ""}
                                onChange={(e) =>
                                  updateCategoryLocal(sector.id, cat.id, {
                                    structureDescription: e.target.value,
                                  })
                                }
                                onBlur={(e) =>
                                  saveStructureDescription(
                                    sector.id,
                                    cat.id,
                                    e.target.value,
                                  )
                                }
                                placeholder="Optional free-text description..."
                                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {categoryFormSector === sector.id ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          autoFocus
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          placeholder="Category name..."
                          className="flex-1 max-w-xs border border-orange-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                          onKeyDown={(e) =>
                            e.key === "Enter" && addCategory(sector.id)
                          }
                        />
                        <button
                          onClick={() => addCategory(sector.id)}
                          disabled={!newCategory.trim() || addingCategory}
                          className="text-xs px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-40"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            setCategoryFormSector(null);
                            setNewCategory("");
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setCategoryFormSector(sector.id);
                          setNewCategory("");
                        }}
                        className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 font-medium mt-2"
                      >
                        <Plus className="w-3 h-3" /> Add Category
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <input
                value={newSector}
                onChange={(e) => setNewSector(e.target.value)}
                placeholder="New sector name..."
                className="flex-1 max-w-xs border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                onKeyDown={(e) => e.key === "Enter" && addSector()}
              />
              <button
                onClick={addSector}
                disabled={!newSector.trim() || addingSector}
                className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" /> Add Sector
              </button>
            </div>
          </Section>
        )}

        {tab === "schedule" && (
          <Section
            isCollapsed={collapsed.has("schedule-levels")}
            onToggle={() => toggleCollapse("schedule-levels")}
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
            isCollapsed={collapsed.has("weather")}
            onToggle={() => toggleCollapse("weather")}
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
            isCollapsed={collapsed.has("hr-classification")}
            onToggle={() => toggleCollapse("hr-classification")}
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
            isCollapsed={collapsed.has("project-roles")}
            onToggle={() => toggleCollapse("project-roles")}
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
            isCollapsed={collapsed.has("trade-types")}
            onToggle={() => toggleCollapse("trade-types")}
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
            isCollapsed={collapsed.has("report-settings")}
            onToggle={() => toggleCollapse("report-settings")}
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
                  <div>
                    <span className="text-sm text-gray-700">{rs.label}</span>
                    {/* Weekly progress reports are scheduled and delivered by
                      Admin › Report Automation, not here. Saying so beats a
                      switch that saves and changes nothing. */}
                    {SCHEDULING_REPORT_KEYS.includes(rs.key) && (
                      <p className="text-[11px] text-gray-400">
                        Recorded only — schedule this in Admin › Report Automation.
                      </p>
                    )}
                    {/* This one drives a real job: contributors are reminded when
                      the day's report is missing. */}
                    {rs.key === "daily_report_reminder" && (
                      <p className="text-[11px] text-gray-400">
                        When on, a project's daily-report contributors are reminded
                        later in the day if no report has been submitted.
                      </p>
                    )}
                  </div>
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
            <p className="mt-3 text-[11px] text-gray-400 border-t border-gray-100 pt-3">
              The "include" switches control which sections the Reports module
              offers. Changes apply after Save Settings.
            </p>
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
          if (deleteRoleTarget) {
            // The store refuses to remove the last role and says so itself;
            // only report success when one was actually removed.
            if (roles.length > 1) {
              toast.success(`"${deleteRoleTarget.name}" deleted.`);
            }
            deleteRole(deleteRoleTarget.id);
          }
          setDeleteRoleTarget(null);
        }}
        onCancel={() => setDeleteRoleTarget(null)}
      />

      {fieldModal && (
        <StructureFieldModal
          initial={fieldModal.field}
          onClose={() => setFieldModal(null)}
          onSave={saveStructureField}
        />
      )}
    </div>
  );
}
