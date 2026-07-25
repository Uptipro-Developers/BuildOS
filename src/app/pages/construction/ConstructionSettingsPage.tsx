import { useState } from "react";
import { Settings as SettingsIcon, Save, Plus, ToggleLeft, ToggleRight, X, Check, Tags, Layers, Sun, Building2, Users, Package, UserCog, ArrowRight, Shield, Edit3, Trash2, Hash } from "lucide-react";
import type { Sector, ScheduleLevelConfig, WeatherConfig, ProjectRole, StructureField, CategoryConfig } from "./types";
import { ALL_PERMISSIONS } from "./types";
import { defaultScheduleLevels, defaultWeatherConfig } from "./mockData";
import { useRoles } from "../../contexts/RolesContext";
import { useNumbering, type ModuleNumbering, MODULE_DOMAINS, formatId } from "../../stores/numberingStore";
import { useProjectTypeStore } from "../../stores/projectTypeStore";

const TABS = ["projects", "schedule", "weather", "resources", "reports", "numbering"] as const;
type Tab = typeof TABS[number];
const TAB_LABELS: Record<Tab, string> = {
  projects: "Project Types",
  schedule: "Schedule",
  weather: "Weather",
  resources: "Resources",
  reports: "Reports",
  numbering: "Numbering",
};

const defaultTradeTypes = [
  "Masonry", "Concreting labor", "Carpentry (formwork)", "Carpentry (roofing)",
  "Iron benders / steel fixers", "Tiling", "Plumbing", "Electrical",
  "Painting", "Glazing / aluminum works", "General operations / laboring",
  "Equipment operation", "Scaffolding", "Welding",
];

interface ReportSetting { id: string; key: string; label: string; enabled: boolean; }

const defaultReportSettings: ReportSetting[] = [
  { id: "rs1", key: "auto_generate_weekly", label: "Auto-generate weekly progress report", enabled: true },
  { id: "rs2", key: "rag_summary", label: "Include RAG summary in reports", enabled: true },
  { id: "rs3", key: "cost_breakdown", label: "Include cost breakdown", enabled: true },
  { id: "rs4", key: "resource_performance", label: "Include resource performance metrics", enabled: false },
  { id: "rs5", key: "schedule_gantt", label: "Include schedule Gantt chart", enabled: true },
  { id: "rs6", key: "daily_report_reminder", label: "Daily report submission reminder", enabled: true },
];

// ── Project Types Panel ────────────────────────────────────────────────────

function ProjectTypesPanel() {
  const { projectTypes, addSector, removeSector, addCategory, removeCategory, updateStructureMeta, addStructureField, removeStructureField, addDescriptorOption, removeDescriptorOption, updateDescriptorMode, updateDescription } = useProjectTypeStore();
  const [newSector, setNewSector] = useState("");
  const [catInput, setCatInput] = useState("");
  const [catTargetSector, setCatTargetSector] = useState<string | null>(null);
  const [descInput, setDescInput] = useState("");
  const [descTarget, setDescTarget] = useState<{sector: string; category: string} | null>(null);
  const [fieldFormTarget, setFieldFormTarget] = useState<{sector: string; category: string} | null>(null);
  const [fieldForm, setFieldForm] = useState({ key: "", label: "", type: "select" as "text" | "number" | "select", options: "", required: false });

  function handleAddSector() {
    if (!newSector.trim() || projectTypes.some(pt => pt.sector === newSector.trim())) return;
    addSector(newSector.trim());
    setNewSector("");
  }

  function handleAddCategory(sector: string) {
    if (!catInput.trim()) return;
    addCategory(sector, catInput.trim());
    setCatInput("");
    setCatTargetSector(null);
  }

  function handleAddStructureField(sector: string, catName: string) {
    if (!fieldForm.label.trim()) return;
    const key = fieldForm.key.trim() || fieldForm.label.trim().toLowerCase().replace(/\s+/g, "");
    const opts = fieldForm.type === "select" ? fieldForm.options.split(",").map(s => s.trim()).filter(Boolean) : undefined;
    addStructureField(sector, catName, { key, label: fieldForm.label.trim(), type: fieldForm.type, ...(opts?.length ? { options: opts } : {}) });
    setFieldForm({ key: "", label: "", type: "select", options: "", required: false });
    setFieldFormTarget(null);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">Configure the 4-level project type hierarchy: Sector → Category → Specific Descriptor → Physical Structure Breakdown</p>
      <div className="space-y-3">
        {projectTypes.map(pt => (
          <div key={pt.sector} className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-gray-200 text-gray-500 font-semibold px-1.5 py-0.5 rounded">L1</span>
                <span className="text-sm font-semibold text-gray-900">{pt.sector}</span>
              </div>
              <button onClick={() => removeSector(pt.sector)} className="text-red-400 hover:text-red-600 p-1"><X className="w-3.5 h-3.5" /></button>
            </div>
            {pt.categories.map(cat => (
              <div key={cat.name} className="border border-gray-100 rounded-lg p-3 mb-2 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-amber-100 text-amber-600 font-semibold px-1.5 py-0.5 rounded">L2</span>
                    <span className="text-xs font-semibold text-amber-700">{cat.name}</span>
                  </div>
                  <button onClick={() => removeCategory(pt.sector, cat.name)} className="text-red-300 hover:text-red-600 p-0.5"><X className="w-3 h-3" /></button>
                </div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Level 3 — Specific Descriptors</p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-gray-500">Mode:</span>
                  <button onClick={() => updateDescriptorMode(pt.sector, cat.name, "dropdown")}
                    className={`text-xs px-2 py-0.5 rounded-full ${cat.descriptorMode === "dropdown" ? "bg-orange-100 text-orange-700 font-medium" : "bg-gray-100 text-gray-500"}`}>Dropdown</button>
                  <button onClick={() => updateDescriptorMode(pt.sector, cat.name, "free-text")}
                    className={`text-xs px-2 py-0.5 rounded-full ${cat.descriptorMode === "free-text" ? "bg-orange-100 text-orange-700 font-medium" : "bg-gray-100 text-gray-500"}`}>Free Text</button>
                </div>
                {cat.descriptorMode === "dropdown" && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {cat.descriptorOptions.map(d => (
                        <span key={d} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                          {d}
                          <button onClick={() => removeDescriptorOption(pt.sector, cat.name, d)} className="hover:text-red-600"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input value={descTarget?.sector === pt.sector && descTarget?.category === cat.name ? descInput : ""}
                        onChange={e => { setDescInput(e.target.value); setDescTarget({ sector: pt.sector, category: cat.name }); }}
                        onFocus={() => setDescTarget({ sector: pt.sector, category: cat.name })}
                        placeholder="Add option..." className="flex-1 max-w-xs border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                        onKeyDown={e => e.key === "Enter" && addDescriptorOption(pt.sector, cat.name)} />
                      <button onClick={() => addDescriptorOption(pt.sector, cat.name)} disabled={descTarget?.sector !== pt.sector || descTarget?.category !== cat.name || !descInput.trim()}
                        className="text-xs px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-40"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2 mt-3">Level 4 — Physical Structure Breakdown</p>
                <div className="mb-2">
                  <label className="block text-[10px] text-gray-500 mb-0.5">Header Label</label>
                  <input value={cat.structure.unitLabel} onChange={e => updateStructureMeta(pt.sector, cat.name, "unitLabel", e.target.value)}
                    placeholder="e.g. Building, Room, Warehouse" className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white" />
                </div>
                <p className="text-[10px] text-gray-400 font-medium mb-1.5">Fields</p>
                {cat.structure.fields.map((f, fi) => (
                  <div key={fi} className="flex items-center gap-2 mb-1 text-xs bg-white border border-gray-100 rounded px-2 py-1.5">
                    <span className="font-medium text-gray-700 min-w-0 flex-1 truncate">{f.label}</span>
                    <span className="text-gray-400 shrink-0">({f.type})</span>
                    {f.type === "select" && f.options?.length ? <span className="text-gray-400 shrink-0">{f.options.length} opts</span> : null}
                    <button onClick={() => setFieldFormTarget({ sector: pt.sector, category: cat.name })} className="text-gray-400 hover:text-orange-600 p-0.5 shrink-0"><Edit3 className="w-3 h-3" /></button>
                    <button onClick={() => removeStructureField(pt.sector, cat.name, fi)} className="text-gray-400 hover:text-red-600 p-0.5 shrink-0"><X className="w-3 h-3" /></button>
                  </div>
                ))}
                <button onClick={() => { setFieldFormTarget({ sector: pt.sector, category: cat.name }); setFieldForm({ key: "", label: "", type: "select", options: "", required: false }); }}
                  className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium mt-1"><Plus className="w-3 h-3" /> Add Field</button>
                <p className="text-[10px] text-gray-400 font-medium mt-3 mb-1">Description</p>
                <textarea value={cat.description} onChange={e => updateDescription(pt.sector, cat.name, e.target.value)} rows={1} placeholder="Optional free-text description..." className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none" />
              </div>
            ))}
            {catTargetSector === pt.sector ? (
              <div className="flex items-center gap-2 mt-2">
                <input value={catInput} onChange={e => setCatInput(e.target.value)} placeholder="Category name..." autoFocus className="flex-1 max-w-xs border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                  onKeyDown={e => { if (e.key === "Enter") handleAddCategory(pt.sector); if (e.key === "Escape") { setCatTargetSector(null); setCatInput(""); } }} />
                <button onClick={() => handleAddCategory(pt.sector)} disabled={!catInput.trim()} className="text-xs px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-40"><Plus className="w-3 h-3" /></button>
                <button onClick={() => { setCatTargetSector(null); setCatInput(""); }} className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setCatTargetSector(pt.sector)} className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium mt-2"><Plus className="w-3 h-3" /> Add Category</button>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        <input value={newSector} onChange={e => setNewSector(e.target.value)} placeholder="New sector name..." className="flex-1 max-w-xs border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        <button onClick={handleAddSector} disabled={!newSector.trim()} className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-40"><Plus className="w-3.5 h-3.5" /> Add Sector</button>
      </div>

      {fieldFormTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Add Structure Field</h2>
              <button onClick={() => { setFieldFormTarget(null); setFieldForm({ key: "", label: "", type: "select", options: "", required: false }); }} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Field Key</label>
                <input value={fieldForm.key} onChange={e => setFieldForm(f => ({ ...f, key: e.target.value }))} placeholder="e.g. roomType (auto-fills from label)" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Field Label *</label>
                <input value={fieldForm.label} onChange={e => setFieldForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Room Type" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Field Type</label>
                <select value={fieldForm.type} onChange={e => setFieldForm(f => ({ ...f, type: e.target.value as "text" | "number" | "select" }))} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                  <option value="select">Select (dropdown)</option><option value="text">Text (free input)</option><option value="number">Number</option>
                </select>
              </div>
              {fieldForm.type === "select" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Options <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                  <textarea value={fieldForm.options} onChange={e => setFieldForm(f => ({ ...f, options: e.target.value }))} rows={3} placeholder="e.g. 1-Bedroom, 2-Bedroom, 3-Bedroom" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => { setFieldFormTarget(null); setFieldForm({ key: "", label: "", type: "select", options: "", required: false }); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleAddStructureField(fieldFormTarget.sector, fieldFormTarget.category)}
                disabled={!fieldForm.label.trim()} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-40">Add Field</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Schedule Panel ─────────────────────────────────────────────────────────

function SchedulePanel() {
  const [scheduleLevels, setScheduleLevels] = useState<ScheduleLevelConfig[]>(defaultScheduleLevels);

  function updateLevel(idx: number, field: keyof ScheduleLevelConfig, val: string | boolean | number | null) {
    setScheduleLevels(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l));
  }

  function addLevel() {
    const next = scheduleLevels.length + 1;
    setScheduleLevels(prev => [...prev, { level: next, name: `Level ${next}`, prefix: `L${next}`, canAssignResources: true }]);
  }

  function removeLevel(idx: number) {
    setScheduleLevels(prev => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-900 mb-1">Schedule Levels</h3>
      <p className="text-xs text-gray-400 mb-4">Configure the task hierarchy levels used in the schedule builder.</p>
      <div className="space-y-2 mb-3">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 text-xs font-medium text-gray-500 px-3 py-1">
          <span>Level</span> <span>Name</span> <span>Prefix</span> <span>Parent</span> <span>Resources</span>
        </div>
        {scheduleLevels.map((l, i) => (
          <div key={l.level} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 items-center px-3 py-2 rounded-lg bg-gray-50">
            <span className="text-xs font-mono text-gray-400 w-6">L{l.level}</span>
            <input value={l.name} onChange={e => updateLevel(i, "name", e.target.value)} className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            <input value={l.prefix} onChange={e => updateLevel(i, "prefix", e.target.value)} className="text-sm w-16 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono" />
            <select value={String(l.parentLevel ?? "")} onChange={e => updateLevel(i, "parentLevel", e.target.value ? Number(e.target.value) : null)} className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500">
              <option value="">None</option>
              {scheduleLevels.slice(0, i).map(pl => <option key={pl.level} value={pl.level}>L{pl.level} ({pl.name})</option>)}
            </select>
            <div className="flex items-center gap-1">
              <button onClick={() => updateLevel(i, "canAssignResources", !l.canAssignResources)} className={`text-xs px-2 py-1 rounded font-medium ${l.canAssignResources ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>{l.canAssignResources ? "Yes" : "No"}</button>
              <button onClick={() => removeLevel(i)} className="text-red-400 hover:text-red-600 p-1"><X className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={addLevel} className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 font-medium"><Plus className="w-3.5 h-3.5" /> Add Level</button>
    </div>
  );
}

// ── Weather Panel ──────────────────────────────────────────────────────────

function WeatherPanel() {
  const [weatherConfig, setWeatherConfig] = useState<WeatherConfig[]>(defaultWeatherConfig);
  const [newWeather, setNewWeather] = useState("");

  function toggle(idx: number) { setWeatherConfig(prev => prev.map((w, i) => i === idx ? { ...w, enabled: !w.enabled } : w)); }

  function add() {
    if (!newWeather.trim()) return;
    setWeatherConfig(prev => [...prev, { value: newWeather.trim() as any, label: newWeather.trim(), enabled: true }]);
    setNewWeather("");
  }

  function remove(idx: number) { setWeatherConfig(prev => prev.filter((_, i) => i !== idx)); }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-900 mb-1">Weather Types</h3>
      <p className="text-xs text-gray-400 mb-4">Configure weather options available in daily reports</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {weatherConfig.map((w, i) => (
          <span key={i} className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${w.enabled ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-400 line-through"}`}>
            {w.label}
            <button onClick={() => toggle(i)} className="hover:opacity-70">{w.enabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}</button>
            <button onClick={() => remove(i)} className="hover:text-red-600"><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input value={newWeather} onChange={e => setNewWeather(e.target.value)} placeholder="New weather type..." className="flex-1 max-w-xs border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          onKeyDown={e => e.key === "Enter" && add()} />
        <button onClick={add} disabled={!newWeather.trim()} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-40"><Plus className="w-3.5 h-3.5" /> Add</button>
      </div>
    </div>
  );
}

// ── Resources Panel ────────────────────────────────────────────────────────

function ResourcesPanel() {
  const { roles, addRole, updateRole, deleteRole } = useRoles();
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [roleFormName, setRoleFormName] = useState("");
  const [roleFormDesc, setRoleFormDesc] = useState("");
  const [roleFormPerms, setRoleFormPerms] = useState<string[]>([]);
  const [tradeTypes, setTradeTypes] = useState<string[]>(defaultTradeTypes);
  const [newTrade, setNewTrade] = useState("");

  function startEditRole(role: ProjectRole) {
    setEditingRole(role.id);
    setRoleFormName(role.name);
    setRoleFormDesc(role.description);
    setRoleFormPerms([...role.permissions]);
  }

  function cancelEditRole() { setEditingRole(null); setRoleFormName(""); setRoleFormDesc(""); setRoleFormPerms([]); }

  function saveRoleEdit() {
    if (!editingRole || !roleFormName.trim()) return;
    updateRole(editingRole, { name: roleFormName.trim(), description: roleFormDesc.trim(), permissions: roleFormPerms });
    cancelEditRole();
  }

  function addCustomRole() {
    if (!newRoleName.trim()) return;
    addRole({ name: newRoleName.trim(), description: newRoleDesc.trim(), permissions: [] });
    setNewRoleName("");
    setNewRoleDesc("");
  }

  function toggleRolePerm(perm: string) {
    setRoleFormPerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  }

  const PERMISSION_GROUPS = ALL_PERMISSIONS.reduce<Record<string, typeof ALL_PERMISSIONS>>((acc, p) => {
    const g = p.group;
    if (!acc[g]) acc[g] = [];
    acc[g].push(p);
    return acc;
  }, {} as Record<string, typeof ALL_PERMISSIONS>);

  function addTrade() {
    if (!newTrade.trim() || tradeTypes.includes(newTrade.trim())) return;
    setTradeTypes(prev => [...prev, newTrade.trim()]);
    setNewTrade("");
  }

  function removeTrade(t: string) { setTradeTypes(prev => prev.filter(x => x !== t)); }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-xs font-semibold text-gray-900 mb-1">Project Roles</h3>
        <p className="text-xs text-gray-400 mb-4">Define project roles and map them to daily report section permissions.</p>
        <div className="space-y-3">
          {roles.map(role => (
            <div key={role.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {editingRole === role.id ? (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Role Name</label>
                      <input value={roleFormName} onChange={e => setRoleFormName(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                      <input value={roleFormDesc} onChange={e => setRoleFormDesc(e.target.value)} className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Permissions</label>
                    {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                      <div key={group} className="mb-3">
                        <p className="text-xs font-medium text-gray-500 mb-1.5">{group}</p>
                        <div className="flex flex-wrap gap-2">
                          {perms.map(p => {
                            const isOn = roleFormPerms.includes(p.key);
                            return (
                              <button key={p.key} onClick={() => toggleRolePerm(p.key)}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${isOn ? "bg-orange-50 text-orange-700 border-orange-300" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"}`}
                                title={p.description}>{p.label}</button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <button onClick={cancelEditRole} className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                    <button onClick={saveRoleEdit} className="px-3 py-1.5 text-xs font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700">Save</button>
                  </div>
                </div>
              ) : (
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Shield className="w-4 h-4 text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{role.name}</p>
                        {role.description && <p className="text-xs text-gray-500 truncate">{role.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button onClick={() => startEditRole(role)} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteRole(role.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  {role.permissions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 ml-6">
                      {role.permissions.map(p => {
                        const permDef = ALL_PERMISSIONS.find(ap => ap.key === p);
                        return <span key={p} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{permDef?.label ?? p}</span>;
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-700 mb-2">Add Custom Role</p>
          <div className="flex items-center gap-2">
            <input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Role name..." className="flex-1 max-w-xs border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <input value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)} placeholder="Description (optional)" className="flex-1 max-w-xs border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <button onClick={addCustomRole} disabled={!newRoleName.trim()} className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-40"><Plus className="w-3.5 h-3.5" /> Add Role</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-xs font-semibold text-gray-900 mb-1">HR Classification</h3>
        <p className="text-xs text-gray-400 mb-4">Human resource types available in the system and where each type is managed.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-4">
            <div className="flex items-center gap-2 mb-3"><Users className="w-4 h-4 text-blue-600" /><h4 className="text-sm font-semibold text-blue-900">Employees</h4></div>
            <p className="text-xs text-blue-700 mb-1">Managed within the HR Module.</p>
            <p className="text-xs text-gray-500 mb-3">Not configurable from the Project Module.</p>
            <a href="/apps/hr" className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900">Manage Employees in HR Module <ArrowRight className="w-3 h-3" /></a>
          </div>
          <div className="rounded-lg border border-purple-200 bg-purple-50/30 p-4">
            <div className="flex items-center gap-2 mb-3"><UserCog className="w-4 h-4 text-purple-600" /><h4 className="text-sm font-semibold text-purple-900">Individual Contractors</h4></div>
            <p className="text-xs text-purple-700 mb-1">Managed within the Project Module.</p>
            <p className="text-xs text-gray-500 mb-3">Managed in the Resources Overview page.</p>
            <a href="/apps/construction/resources" className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 hover:text-purple-900">Manage in Resources <ArrowRight className="w-3 h-3" /></a>
          </div>
          <div className="rounded-lg border border-orange-200 bg-orange-50/30 p-4">
            <div className="flex items-center gap-2 mb-3"><Building2 className="w-4 h-4 text-orange-600" /><h4 className="text-sm font-semibold text-orange-900">Contractors</h4></div>
            <p className="text-xs text-orange-700 mb-1">Managed within the Project Module.</p>
            <p className="text-xs text-gray-500 mb-3">Managed in the Resources Overview page.</p>
            <a href="/apps/construction/resources" className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 hover:text-orange-900">Manage in Resources <ArrowRight className="w-3 h-3" /></a>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-xs font-semibold text-gray-900 mb-1">Trade Types</h3>
        <p className="text-xs text-gray-400 mb-4">Construction trade categories used for resource classification.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {tradeTypes.map(t => (
            <span key={t} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
              {t}
              <button onClick={() => removeTrade(t)} className="hover:text-red-600"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input value={newTrade} onChange={e => setNewTrade(e.target.value)} placeholder="New trade type..." className="flex-1 max-w-xs border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            onKeyDown={e => e.key === "Enter" && addTrade()} />
          <button onClick={addTrade} disabled={!newTrade.trim()} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-40"><Plus className="w-3.5 h-3.5" /> Add</button>
        </div>
      </div>
    </div>
  );
}

// ── Reports Panel ──────────────────────────────────────────────────────────

function ReportsPanel() {
  const [reportSettings, setReportSettings] = useState<ReportSetting[]>(defaultReportSettings);

  function toggle(id: string) { setReportSettings(prev => prev.map(rs => rs.id === id ? { ...rs, enabled: !rs.enabled } : rs)); }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-900 mb-1">Default Report Settings</h3>
      <p className="text-xs text-gray-400 mb-4">Configure default options for generated reports</p>
      <div className="space-y-2">
        {reportSettings.map(rs => (
          <div key={rs.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
            <span className="text-sm text-gray-700">{rs.label}</span>
            <button onClick={() => toggle(rs.id)} className={`flex items-center gap-2 text-sm transition-colors ${rs.enabled ? "text-orange-600" : "text-gray-400"}`}>
              {rs.enabled ? <><ToggleRight className="w-5 h-5" /> <span className="text-xs font-medium">ON</span></> : <><ToggleLeft className="w-5 h-5" /> <span className="text-xs font-medium">OFF</span></>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Numbering Panel ────────────────────────────────────────────────────────

function NumberingPanel() {
  const { configs, updateConfig, addConfig, removeConfig } = useNumbering();
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ template: "", startingNumber: 1, endingNumber: null as number | null, incrementBy: 1 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({ module: "", template: "", startingNumber: 1, endingNumber: null as number | null, incrementBy: 1, description: "" });

  function startEdit(cfg: ModuleNumbering) { setEditingModule(cfg.module); setEditForm({ template: cfg.template, startingNumber: cfg.startingNumber, endingNumber: cfg.endingNumber, incrementBy: cfg.incrementBy }); }
  function cancelEdit() { setEditingModule(null); }
  function saveEdit(module: string) { updateConfig(module, editForm); setEditingModule(null); }

  function saveAddNumbering() {
    if (!addFormData.module.trim()) return;
    addConfig({
      module: addFormData.module, prefix: addFormData.module.slice(0, 3).toUpperCase(), separator: "-",
      template: addFormData.template || `${addFormData.module.slice(0, 3).toUpperCase()}-{N:4}`,
      startingNumber: addFormData.startingNumber, endingNumber: addFormData.endingNumber, incrementBy: addFormData.incrementBy,
      lastUsedDate: "", lastUsedNumber: 0, description: addFormData.description,
    });
    setShowAddForm(false);
    setAddFormData({ module: "", template: "", startingNumber: 1, endingNumber: null, incrementBy: 1, description: "" });
  }

  const constructionConfigs = configs.filter(cfg => MODULE_DOMAINS.Construction.includes(cfg.module));

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Hash className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-900">Module Numbering System</h2>
      </div>
      <div className="p-5">
        <p className="text-xs text-gray-500 mb-4">Configure auto-numbering format for records across Construction modules.</p>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Process</th>
                <th className="px-4 py-3 text-left font-medium">Template</th>
                <th className="px-4 py-3 text-left font-medium">Starting #</th>
                <th className="px-4 py-3 text-left font-medium">Ending #</th>
                <th className="px-4 py-3 text-left font-medium">Increment By</th>
                <th className="px-4 py-3 text-left font-medium">Last Used #</th>
                <th className="px-4 py-3 text-left font-medium">Last Used Date</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {constructionConfigs.map(cfg => (
                <tr key={cfg.module} className="hover:bg-gray-50 group">
                  {editingModule === cfg.module ? (
                    <>
                      <td className="px-4 py-3 font-medium text-gray-900">{cfg.module}</td>
                      <td className="px-4 py-3"><input type="text" value={editForm.template} onChange={e => setEditForm({ ...editForm, template: e.target.value })} className="w-28 px-2 py-1 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500" /></td>
                      <td className="px-4 py-3"><input type="number" min={1} value={editForm.startingNumber} onChange={e => setEditForm({ ...editForm, startingNumber: parseInt(e.target.value) || 1 })} className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500" /></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1"><input type="number" min={1} value={editForm.endingNumber ?? ""} onChange={e => setEditForm({ ...editForm, endingNumber: e.target.value ? parseInt(e.target.value) : null })} className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="∞" /><label className="text-[10px] text-gray-400 flex items-center gap-0.5"><input type="checkbox" checked={editForm.endingNumber === null} onChange={e => setEditForm({ ...editForm, endingNumber: e.target.checked ? null : 9999 })} className="w-3 h-3" /> Unlimited</label></div></td>
                      <td className="px-4 py-3"><input type="number" min={1} value={editForm.incrementBy} onChange={e => setEditForm({ ...editForm, incrementBy: parseInt(e.target.value) || 1 })} className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500" /></td>
                      <td className="px-4 py-3"><span className="font-mono text-xs text-gray-600">{formatId(cfg.template, cfg.lastUsedNumber)}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{cfg.lastUsedDate || "—"}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1"><button onClick={() => saveEdit(cfg.module)} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg"><Save className="w-3.5 h-3.5" /></button><button onClick={cancelEdit} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-3.5 h-3.5" /></button></div></td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-gray-900">{cfg.module}</td>
                      <td className="px-4 py-3"><span className="font-mono text-xs text-gray-500">{cfg.template}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-700">{cfg.startingNumber}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">{cfg.endingNumber ?? "∞"}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">{cfg.incrementBy}</td>
                      <td className="px-4 py-3"><span className="font-mono text-xs text-gray-600">{formatId(cfg.template, cfg.lastUsedNumber)}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{cfg.lastUsedDate || "—"}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1"><button onClick={() => startEdit(cfg)} className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg"><Edit3 className="w-3.5 h-3.5" /></button><button onClick={() => removeConfig(cfg.module)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                    </>
                  )}
                </tr>
              ))}
              {showAddForm && (
                <tr className="bg-amber-50/50">
                  <td className="px-4 py-3">
                    <select value={addFormData.module} onChange={e => { const m = e.target.value; setAddFormData({ ...addFormData, module: m, template: m ? `${m.slice(0, 3).toUpperCase()}-{N:4}` : "" }); }}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white">
                      <option value="">Select a process…</option>
                      {MODULE_DOMAINS.Construction.filter(m => !configs.some(c => c.module === m)).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3"><input type="text" value={addFormData.template} onChange={e => setAddFormData({ ...addFormData, template: e.target.value })} className="w-28 px-2 py-1 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500" /></td>
                  <td className="px-4 py-3"><input type="number" min={1} value={addFormData.startingNumber} onChange={e => setAddFormData({ ...addFormData, startingNumber: parseInt(e.target.value) || 1 })} className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500" /></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1"><input type="number" min={1} value={addFormData.endingNumber ?? ""} onChange={e => setAddFormData({ ...addFormData, endingNumber: e.target.value ? parseInt(e.target.value) : null })} className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="∞" /><label className="text-[10px] text-gray-400 flex items-center gap-0.5"><input type="checkbox" checked={addFormData.endingNumber === null} onChange={e => setAddFormData({ ...addFormData, endingNumber: e.target.checked ? null : 9999 })} className="w-3 h-3" /> Unlimited</label></div></td>
                  <td className="px-4 py-3"><input type="number" min={1} value={addFormData.incrementBy} onChange={e => setAddFormData({ ...addFormData, incrementBy: parseInt(e.target.value) || 1 })} className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500" /></td>
                  <td className="px-4 py-3 text-xs text-gray-400">—</td>
                  <td className="px-4 py-3 text-xs text-gray-400">—</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1"><button onClick={saveAddNumbering} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg"><Save className="w-3.5 h-3.5" /></button><button onClick={() => { setShowAddForm(false); setAddFormData({ module: "", template: "", startingNumber: 1, endingNumber: null, incrementBy: 1, description: "" }); }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-3.5 h-3.5" /></button></div></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!showAddForm && <button onClick={() => setShowAddForm(true)} className="mt-4 flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium"><Plus className="w-3.5 h-3.5" /> Add Numbering Entry</button>}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function ConstructionSettingsPage() {
  const [tab, setTab] = useState<Tab>("projects");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Construction Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Construction module configuration</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t ? "border-orange-600 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "projects" && <ProjectTypesPanel />}
      {tab === "schedule" && <SchedulePanel />}
      {tab === "weather" && <WeatherPanel />}
      {tab === "resources" && <ResourcesPanel />}
      {tab === "reports" && <ReportsPanel />}
      {tab === "numbering" && <NumberingPanel />}
    </div>
  );
}
