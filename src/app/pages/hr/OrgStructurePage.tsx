import { useState, useEffect } from "react";
import { useHRConfig } from "../../stores/hrConfigStore";
import {
  fetchOrgUnits,
  createOrgUnit,
  updateOrgUnit,
  type OrgUnit as ApiOrgUnit,
  type OrgUnitKind,
} from "../../api/org-units";
import { Plus, X, Save, CheckCircle, Building2, Users, Layers, Archive, Shield, BookOpen, UserPlus, ArrowUp, ArrowDown, FileText, Check } from "lucide-react";

interface OrgLevel {
  id: string; name: string; description: string; members: number; archived: boolean;
}

interface StructureTemplate {
  id: string; name: string; description: string; levels: { name: string; description: string }[];
}

const TEMPLATES: StructureTemplate[] = [
  {
    id: "collegium",
    name: "Collegium / Cluster / Crew",
    description: "Current company structure with executive leadership, operational management, and execution teams",
    levels: [
      { name: "Collegium", description: "Executive leadership body overseeing strategy and governance" },
      { name: "Cluster", description: "Operational management level managing related projects and regions" },
      { name: "Crew", description: "Execution-level teams performing project work" },
    ],
  },
  {
    id: "division",
    name: "Division / Department / Team",
    description: "Traditional corporate organizational structure",
    levels: [
      { name: "Division", description: "Major business unit or functional area" },
      { name: "Department", description: "Specialized functional group within a division" },
      { name: "Team", description: "Smaller working group within a department" },
    ],
  },
  {
    id: "region",
    name: "Region / Branch / Unit",
    description: "Multi-location or distributed organizational structure",
    levels: [
      { name: "Region", description: "Geographic or operational region" },
      { name: "Branch", description: "Local branch or office within a region" },
      { name: "Unit", description: "Specific operational unit within a branch" },
    ],
  },
];

export function OrgStructurePage() {
  const { setOrgLevels } = useHRConfig();
  const [saved, setSaved] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string>(TEMPLATES[0].id);
  const [customTemplate, setCustomTemplate] = useState<StructureTemplate | null>(null);

  const currentTemplate = customTemplate ?? TEMPLATES.find(t => t.id === activeTemplate)!;
  const levelNames = {
    l1: currentTemplate.levels[0]?.name ?? "Level 1",
    l2: currentTemplate.levels[1]?.name ?? "Level 2",
    l3: currentTemplate.levels[2]?.name ?? "Level 3",
  };
  const allLevels = currentTemplate.levels;

  const TIER_KINDS: OrgUnitKind[] = ["tier1", "tier2", "tier3"];
  const [units, setUnits] = useState<ApiOrgUnit[]>([]);

  function loadUnits() {
    fetchOrgUnits().then(setUnits).catch(console.error);
  }
  useEffect(() => { loadUnits(); }, []);

  const toLevel = (u: ApiOrgUnit): OrgLevel => ({
    id: u.id, name: u.name, description: u.description, members: u.members, archived: u.archived,
  });
  const allOrgItems = [
    units.filter(u => u.kind === "tier1").map(toLevel),
    units.filter(u => u.kind === "tier2").map(toLevel),
    units.filter(u => u.kind === "tier3").map(toLevel),
  ];

  const crafts = units.filter(u => u.kind === "craft");
  const circles = units.filter(u => u.kind === "circle");

  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDesc, setNewOrgDesc] = useState("");
  const [addingTo, setAddingTo] = useState<number | null>(null);

  const [newCraftName, setNewCraftName] = useState("");
  const [newCraftDesc, setNewCraftDesc] = useState("");
  const [newCircleName, setNewCircleName] = useState("");
  const [newCircleDesc, setNewCircleDesc] = useState("");

  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customLevels, setCustomLevels] = useState<{ name: string; description: string }[]>([]);
  const [newCustomLevelName, setNewCustomLevelName] = useState("");
  const [newCustomLevelDesc, setNewCustomLevelDesc] = useState("");

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function applyTemplate(t: StructureTemplate) {
    setActiveTemplate(t.id);
    setCustomTemplate(null);
    setOrgLevels(t.levels);
  }

  function startCustomTemplate() {
    setCustomLevels([...allLevels]);
    setShowCustomModal(true);
  }

  function applyCustomTemplate() {
    const levels = customLevels.length > 0 ? customLevels : [{ name: "Level 1", description: "Top level" }];
    setCustomTemplate({
      id: "custom",
      name: "Custom Structure",
      description: "User-defined organizational structure",
      levels,
    });
    setOrgLevels(levels);
    setShowCustomModal(false);
  }

  function addCustomLevel() {
    if (!newCustomLevelName.trim()) return;
    setCustomLevels(prev => [...prev, { name: newCustomLevelName.trim(), description: newCustomLevelDesc.trim() }]);
    setNewCustomLevelName("");
    setNewCustomLevelDesc("");
  }

  function moveCustomLevel(idx: number, dir: "up" | "down") {
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= customLevels.length) return;
    setCustomLevels(prev => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function removeCustomLevel(idx: number) {
    setCustomLevels(prev => prev.filter((_, i) => i !== idx));
  }

  function addOrgLevel(levelIdx: number) {
    if (!newOrgName.trim()) return;
    createOrgUnit({ name: newOrgName.trim(), description: newOrgDesc.trim(), kind: TIER_KINDS[levelIdx], members: 0, archived: false })
      .then(loadUnits)
      .catch(err => alert((err as Error)?.message || "Failed to add unit"));
    setNewOrgName("");
    setNewOrgDesc("");
    setAddingTo(null);
  }

  function archiveOrg(_levelIdx: number, id: string) {
    const current = units.find(u => u.id === id);
    if (!current) return;
    updateOrgUnit(id, { archived: !current.archived })
      .then(loadUnits)
      .catch(err => alert((err as Error)?.message || "Failed to update unit"));
  }

  function addSupporting(type: "craft" | "circle") {
    const name = type === "craft" ? newCraftName : newCircleName;
    const desc = type === "craft" ? newCraftDesc : newCircleDesc;
    if (!name.trim()) return;
    createOrgUnit({ name: name.trim(), description: desc.trim(), kind: type, members: 0, archived: false })
      .then(loadUnits)
      .catch(err => alert((err as Error)?.message || "Failed to add unit"));
    if (type === "craft") { setNewCraftName(""); setNewCraftDesc(""); }
    else { setNewCircleName(""); setNewCircleDesc(""); }
  }

  const sectionIconMap = [Building2, Users, Users];

  const LevelCard = ({ item, levelIdx }: { item: OrgLevel; levelIdx: number }) => (
    <div className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm ${item.archived ? "bg-gray-50 opacity-60" : "bg-white"}`} style={{ borderColor: "#E2E8F0" }}>
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${item.archived ? "text-gray-400 line-through" : "text-gray-900"}`}>{item.name}</p>
        <p className="text-xs text-gray-500 truncate">{item.description} · {item.members} members</p>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <button onClick={() => archiveOrg(levelIdx, item.id)} className={`p-1 rounded ${item.archived ? "text-green-500 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`} title={item.archived ? "Restore" : "Archive"}>
          <Archive className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Organizational Structure</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure your organization hierarchy, structure templates, and supporting units</p>
        </div>
        <button onClick={save} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${saved ? "bg-green-600 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
          {saved ? <><CheckCircle className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </div>

      {/* ─── Structure Templates ─── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-indigo-600" /> Structure Templates
        </h2>
        <p className="text-xs text-gray-400 mb-4">Choose a predefined organizational structure template or create a custom one</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => applyTemplate(t)}
              className={`text-left p-3 rounded-lg border transition-all ${
                activeTemplate === t.id && !customTemplate
                  ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                  : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-gray-900">{t.name.split("/")[0].trim()}</h3>
                {activeTemplate === t.id && !customTemplate && <Check className="w-3.5 h-3.5 text-indigo-600" />}
              </div>
              <p className="text-[10px] text-gray-500 mb-1.5">{t.levels.map(l => l.name).join(" → ")}</p>
              <p className="text-[10px] text-gray-400">{t.description}</p>
            </button>
          ))}
          <button onClick={startCustomTemplate}
            className={`text-left p-3 rounded-lg border transition-all ${
              customTemplate
                ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                : "border-dashed border-gray-300 hover:border-indigo-300 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-gray-900">Custom</h3>
              {customTemplate && <Check className="w-3.5 h-3.5 text-indigo-600" />}
            </div>
            <p className="text-[10px] text-gray-500 mb-1.5">Define your own levels</p>
            <p className="text-[10px] text-gray-400">Create custom organizational levels with your own terminology</p>
          </button>
        </div>

        {/* Active Structure Preview */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Layers className="w-3.5 h-3.5" />
            Active Structure: <span className="font-semibold text-gray-700">{currentTemplate.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {allLevels.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                  {l.name}
                </span>
                {i < allLevels.length - 1 && <ArrowDown className="w-3 h-3 text-gray-300" />}
              </div>
            ))}
            <span className="text-xs text-gray-400 ml-2">({allLevels.length} level{allLevels.length > 1 ? "s" : ""})</span>
          </div>
        </div>
      </div>

      {/* ─── Hierarchy Sections ─── */}
      {allLevels.map((lv, idx) => {
        const SectionIcon = sectionIconMap[idx];
        return (
        <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <SectionIcon className="w-4 h-4 text-indigo-600" /> {lv.name}s
            </h2>
            <button onClick={() => setAddingTo(idx)} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              <Plus className="w-3 h-3" /> Add {lv.name}
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-3">{lv.description}</p>
          <div className="space-y-2">
            {allOrgItems[idx].filter(i => !i.archived).map(item => <LevelCard key={item.id} item={item} levelIdx={idx} />)}
            {allOrgItems[idx].filter(i => i.archived).length > 0 && (
              <>
                <p className="text-xs text-gray-400 font-medium mt-3 mb-1">Archived</p>
                {allOrgItems[idx].filter(i => i.archived).map(item => <LevelCard key={item.id} item={item} levelIdx={idx} />)}
              </>
            )}
            {allOrgItems[idx].length === 0 && <p className="text-sm text-gray-400 text-center py-4">No {lv.name.toLowerCase()}s configured</p>}
          </div>
        </div>
        );
      })}

      {/* Add Org Level Modal */}
      {addingTo !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl w-full max-w-md p-5" style={{ backgroundColor: "white" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Add {levelNames[addingTo === 0 ? "l1" : addingTo === 1 ? "l2" : "l3"]}</h3>
              <button onClick={() => setAddingTo(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={newOrgName} onChange={e => setNewOrgName(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Lagos Operations" style={{ borderColor: "#E2E8F0" }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input value={newOrgDesc} onChange={e => setNewOrgDesc(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Brief description" style={{ borderColor: "#E2E8F0" }} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setAddingTo(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Cancel</button>
              <button onClick={() => addOrgLevel(addingTo)} disabled={!newOrgName.trim()} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium disabled:opacity-40 hover:bg-indigo-700">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Custom Structure Modal ─── */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "white" }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "#E2E8F0" }}>
              <h2 className="text-lg font-bold text-gray-900">Custom Organizational Structure</h2>
              <button onClick={() => setShowCustomModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500">Define your own organizational levels. You can add, rename, reorder, or remove levels.</p>

              {customLevels.map((lv, i) => (
                <div key={i} className="flex items-center gap-2 p-3 rounded-lg border" style={{ borderColor: "#E2E8F0" }}>
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveCustomLevel(i, "up")} disabled={i === 0} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20"><ArrowUp className="w-3 h-3" /></button>
                    <button onClick={() => moveCustomLevel(i, "down")} disabled={i === customLevels.length - 1} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20"><ArrowDown className="w-3 h-3" /></button>
                  </div>
                  <div className="flex-1">
                    <input value={lv.name} onChange={e => {
                      const next = [...customLevels];
                      next[i] = { ...next[i], name: e.target.value };
                      setCustomLevels(next);
                    }} className="w-full text-sm font-medium border-b border-transparent focus:border-indigo-500 focus:outline-none px-1 py-0.5" placeholder="Level name" />
                    <input value={lv.description} onChange={e => {
                      const next = [...customLevels];
                      next[i] = { ...next[i], description: e.target.value };
                      setCustomLevels(next);
                    }} className="w-full text-xs text-gray-500 border-b border-transparent focus:border-indigo-500 focus:outline-none px-1 py-0.5 mt-0.5" placeholder="Description (optional)" />
                  </div>
                  <button onClick={() => removeCustomLevel(i)} className="p-1 text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}

              <div className="flex items-center gap-2 pt-2">
                <input value={newCustomLevelName} onChange={e => setNewCustomLevelName(e.target.value)} placeholder="New level name..." className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  onKeyDown={e => e.key === "Enter" && addCustomLevel()} />
                <input value={newCustomLevelDesc} onChange={e => setNewCustomLevelDesc(e.target.value)} placeholder="Description..." className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <button onClick={addCustomLevel} disabled={!newCustomLevelName.trim()} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium disabled:opacity-40 hover:bg-indigo-700"><Plus className="w-3 h-3" /></button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t" style={{ borderColor: "#E2E8F0" }}>
              <button onClick={() => setShowCustomModal(false)} className="px-4 py-2 rounded-lg border text-sm text-gray-600" style={{ borderColor: "#E2E8F0" }}>Cancel</button>
              <button onClick={applyCustomTemplate} disabled={customLevels.length === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium disabled:opacity-40 hover:bg-indigo-700">Apply Structure</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Supporting Structures ─── */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-emerald-600" /> Crafts
          </h2>
          <p className="text-xs text-gray-400 mb-3">Cross-functional professional groups for knowledge sharing and standardization</p>
          <div className="space-y-2 mb-3">
            {crafts.map(c => (
              <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0" }}>
                <div>
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.description} · {c.members} members</p>
                </div>
              </div>
            ))}
            {crafts.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No crafts configured</p>}
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <input value={newCraftName} onChange={e => setNewCraftName(e.target.value)} placeholder="Craft name..." className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            <input value={newCraftDesc} onChange={e => setNewCraftDesc(e.target.value)} placeholder="Description..." className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            <button onClick={() => addSupporting("craft")} disabled={!newCraftName.trim()} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium disabled:opacity-40 hover:bg-emerald-700"><Plus className="w-3 h-3" /></button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-amber-600" /> Circles
          </h2>
          <p className="text-xs text-gray-400 mb-3">Learning and collaboration communities for mentorship and development</p>
          <div className="space-y-2 mb-3">
            {circles.map(c => (
              <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0" }}>
                <div>
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.description} · {c.members} members</p>
                </div>
              </div>
            ))}
            {circles.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No circles configured</p>}
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <input value={newCircleName} onChange={e => setNewCircleName(e.target.value)} placeholder="Circle name..." className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            <input value={newCircleDesc} onChange={e => setNewCircleDesc(e.target.value)} placeholder="Description..." className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            <button onClick={() => addSupporting("circle")} disabled={!newCircleName.trim()} className="px-3 py-1.5 bg-amber-600 text-white rounded text-xs font-medium disabled:opacity-40 hover:bg-amber-700"><Plus className="w-3 h-3" /></button>
          </div>
        </div>
      </div>

      {/* Contractor Supervisor Support */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1">
          <UserPlus className="w-4 h-4 text-indigo-600" /> Contractor Supervisors
        </h2>
        <p className="text-xs text-gray-400 mb-3">External supervisor records for project workforce management (no payroll linkage required)</p>
        <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg text-sm text-indigo-800">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>Contractor supervisors can be attached to <strong>{levelNames.l3}s</strong> and participate in project execution without requiring employee records or payroll linkage.</span>
        </div>
      </div>
    </div>
  );
}
