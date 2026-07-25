import { useState } from "react";
import { Settings, Plus, Edit, Trash2, Ruler, Tag, Layers, Store, ChevronRight, Link2, FolderOpen, Hash, Save } from "lucide-react";
import { useNumbering, type ModuleNumbering, MODULE_DOMAINS, formatId } from "../../stores/numberingStore";

// ─── Store Level Configuration ────────────────────────────────────────────────

interface StoreLevelConfig {
  level: 1 | 2 | 3;
  name: string;
  description: string;
  color: string;
  maxCount?: number;
}

const DEFAULT_LEVEL_CONFIGS: StoreLevelConfig[] = [
  { level: 1, name: "Central Store",      description: "Primary warehouse — controls inventory distribution company-wide", color: "teal",   maxCount: 2 },
  { level: 2, name: "Regional Hub",       description: "Non-project stores serving multiple projects (regions, zones, departments)", color: "blue",   maxCount: 5 },
  { level: 3, name: "Project Store",      description: "Assigned to a specific project, receives materials from Level 1 or 2", color: "purple", maxCount: undefined },
];

const LEVEL_COLORS: Record<string, { badge: string; ring: string; icon: string }> = {
  teal:   { badge: "bg-teal-100 text-teal-700",   ring: "ring-teal-300",   icon: "text-teal-600"   },
  blue:   { badge: "bg-blue-100 text-blue-700",   ring: "ring-blue-300",   icon: "text-blue-600"   },
  purple: { badge: "bg-purple-100 text-purple-700", ring: "ring-purple-300", icon: "text-purple-600" },
  amber:  { badge: "bg-amber-100 text-amber-700", ring: "ring-amber-300",  icon: "text-amber-600"  },
};

function StoreLevelsPanel() {
  const [levels, setLevels] = useState<StoreLevelConfig[]>(DEFAULT_LEVEL_CONFIGS);
  const [editingLevel, setEditingLevel] = useState<StoreLevelConfig | null>(null);
  const [form, setForm] = useState({ name: "", description: "", maxCount: "" });

  function openEdit(l: StoreLevelConfig) {
    setEditingLevel(l);
    setForm({ name: l.name, description: l.description, maxCount: l.maxCount != null ? String(l.maxCount) : "" });
  }
  function save() {
    if (!form.name.trim() || !editingLevel) return;
    setLevels(prev => prev.map(l => l.level === editingLevel.level
      ? { ...l, name: form.name, description: form.description, maxCount: form.maxCount ? Number(form.maxCount) : undefined }
      : l
    ));
    setEditingLevel(null);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Define the naming and limits for each store level. These names appear throughout the system when referencing inventory locations.
      </p>

      <div className="grid grid-cols-3 gap-4">
        {levels.map(l => {
          const clr = LEVEL_COLORS[l.color] ?? LEVEL_COLORS.teal;
          return (
            <div key={l.level} className={`bg-white border-2 rounded-2xl p-5 space-y-3 ${clr.ring} ring-1`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${clr.badge}`}>Level {l.level}</span>
                </div>
                <button onClick={() => openEdit(l)} className="p-1.5 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-teal-50">
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">{l.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{l.description}</p>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                <Layers className={`w-3.5 h-3.5 ${clr.icon}`} />
                <p className="text-xs text-gray-500">
                  Max stores: <span className={`font-semibold ${clr.icon}`}>{l.maxCount ?? "Unlimited"}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
        <p className="font-medium mb-1">How store levels work:</p>
        <ul className="text-xs space-y-0.5 text-blue-600 list-disc list-inside">
          <li>Level 1 stores serve as the primary source of all inventory.</li>
          <li>Level 2 stores receive from Level 1 and distribute to Level 3 or directly to projects.</li>
          <li>Level 3 stores are project-specific and receive materials from Level 1 or Level 2.</li>
        </ul>
      </div>

      {editingLevel && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Configure Level {editingLevel.level}</h2>
              <button onClick={() => setEditingLevel(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Level Name <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Central Warehouse" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={2} placeholder="Brief description of this store level's role"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Maximum Stores (leave blank for unlimited)</label>
                <input type="number" min={1} value={form.maxCount} onChange={e => setForm(p => ({ ...p, maxCount: e.target.value }))}
                  placeholder="e.g. 3" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setEditingLevel(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={save} className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stores Management Panel ──────────────────────────────────────────────────

type StoreLevel = 1 | 2 | 3;
type StoreStatus = "Active" | "Inactive";

interface StoreRecord {
  id: string;
  name: string;
  level: StoreLevel;
  parentId?: string;
  linkedProject?: string;
  location?: string;
  status: StoreStatus;
}

const SEED_STORES: StoreRecord[] = [
  { id: "s1", name: "Main Central Warehouse",   level: 1, status: "Active",   location: "Lagos HQ" },
  { id: "s2", name: "Abuja Central Depot",      level: 1, status: "Active",   location: "Abuja Office" },
  { id: "s3", name: "Lagos Regional Hub",       level: 2, parentId: "s1",    status: "Active",   location: "Lagos Island" },
  { id: "s4", name: "Port Harcourt Regional Hub", level: 2, parentId: "s1",  status: "Active",   location: "Port Harcourt" },
  { id: "s5", name: "Block A Project Store",    level: 3, parentId: "s3",    linkedProject: "Industrial Warehouse",         status: "Active" },
  { id: "s6", name: "Block B Project Store",    level: 3, parentId: "s3",    linkedProject: "Downtown Office Complex",      status: "Active" },
  { id: "s7", name: "Block C Project Store",    level: 3, parentId: "s4",    linkedProject: "Riverside Residential",        status: "Active" },
  { id: "s8", name: "Highway Site Store",       level: 3, parentId: "s4",    linkedProject: "Highway Interchange",          status: "Inactive" },
];

const STORE_PROJECTS = ["Industrial Warehouse", "Downtown Office Complex", "Riverside Residential", "Highway Interchange", "University Science Block"];

function StoresPanel() {
  const [stores, setStores] = useState<StoreRecord[]>(SEED_STORES);
  const [levelFilter, setLevelFilter] = useState<StoreLevel | 0>(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StoreRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoreRecord | null>(null);
  const [form, setForm] = useState<Omit<StoreRecord, "id">>({ name: "", level: 1, status: "Active" });

  const LEVEL_LABELS: Record<StoreLevel, string> = { 1: "Central Store", 2: "Regional Hub", 3: "Project Store" };
  const LEVEL_BADGE: Record<StoreLevel, string> = {
    1: "bg-teal-100 text-teal-700",
    2: "bg-blue-100 text-blue-700",
    3: "bg-purple-100 text-purple-700",
  };

  const filtered = levelFilter === 0 ? stores : stores.filter(s => s.level === levelFilter);

  function openAdd() {
    setEditing(null);
    setForm({ name: "", level: 1, status: "Active" });
    setShowModal(true);
  }
  function openEdit(s: StoreRecord) {
    setEditing(s);
    setForm({ name: s.name, level: s.level, parentId: s.parentId, linkedProject: s.linkedProject, location: s.location, status: s.status });
    setShowModal(true);
  }
  function save() {
    if (!form.name.trim()) return;
    if (editing) {
      setStores(prev => prev.map(s => s.id === editing.id ? { ...s, ...form } : s));
    } else {
      setStores(prev => [...prev, { id: `s${Date.now()}`, ...form }]);
    }
    setShowModal(false);
  }

  const parentOptions = stores.filter(s => s.level < form.level);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {([0, 1, 2, 3] as const).map(l => (
            <button key={l} onClick={() => setLevelFilter(l)}
              className={`px-3 py-1 text-xs rounded-lg border font-medium ${levelFilter === l ? "bg-teal-700 text-white border-teal-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
              {l === 0 ? "All Levels" : `Level ${l} — ${LEVEL_LABELS[l as StoreLevel]}`}
            </button>
          ))}
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm px-4 py-2 rounded-xl">
          <Plus className="w-4 h-4" /> Create Store
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {([1, 2, 3] as StoreLevel[]).map(l => {
          const count = stores.filter(s => s.level === l && s.status === "Active").length;
          return (
            <div key={l} className={`rounded-xl px-4 py-3 border ${l === 1 ? "bg-teal-50 border-teal-200" : l === 2 ? "bg-blue-50 border-blue-200" : "bg-purple-50 border-purple-200"}`}>
              <p className={`text-2xl font-bold ${l === 1 ? "text-teal-700" : l === 2 ? "text-blue-700" : "text-purple-700"}`}>{count}</p>
              <p className={`text-xs mt-0.5 ${l === 1 ? "text-teal-600" : l === 2 ? "text-blue-600" : "text-purple-600"}`}>Active {LEVEL_LABELS[l]}(s)</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Store Name</th>
              <th className="px-4 py-3 text-left font-medium">Level</th>
              <th className="px-4 py-3 text-left font-medium">Parent Store</th>
              <th className="px-4 py-3 text-left font-medium">Linked Project</th>
              <th className="px-4 py-3 text-left font-medium">Location</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(s => {
              const parent = stores.find(p => p.id === s.parentId);
              return (
                <tr key={s.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {s.level === 1 ? <Store className="w-3.5 h-3.5 text-teal-500" /> : s.level === 2 ? <Layers className="w-3.5 h-3.5 text-blue-500" /> : <FolderOpen className="w-3.5 h-3.5 text-purple-500" />}
                      {s.name}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_BADGE[s.level]}`}>Level {s.level}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {parent ? (
                      <div className="flex items-center gap-1">
                        <ChevronRight className="w-3 h-3 text-gray-300" />{parent.name}
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {s.linkedProject ? (
                      <div className="flex items-center gap-1"><Link2 className="w-3 h-3 text-purple-400" />{s.linkedProject}</div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{s.location ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-teal-50"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteTarget(s)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">{editing ? "Edit" : "Create"} Store</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Store Name <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Lagos Central Warehouse"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Store Level <span className="text-red-500">*</span></label>
                  <select value={form.level} onChange={e => setForm(p => ({ ...p, level: Number(e.target.value) as StoreLevel, parentId: undefined, linkedProject: undefined }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                    <option value={1}>Level 1 — Central Store</option>
                    <option value={2}>Level 2 — Regional Hub</option>
                    <option value={3}>Level 3 — Project Store</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as StoreStatus }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>
              {form.level > 1 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Parent Store (Level {form.level - 1})</label>
                  <select value={form.parentId ?? ""} onChange={e => setForm(p => ({ ...p, parentId: e.target.value || undefined }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                    <option value="">— Select parent store —</option>
                    {parentOptions.map(p => <option key={p.id} value={p.id}>{p.name} (Level {p.level})</option>)}
                  </select>
                </div>
              )}
              {form.level === 3 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Linked Project</label>
                  <select value={form.linkedProject ?? ""} onChange={e => setForm(p => ({ ...p, linkedProject: e.target.value || undefined }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                    <option value="">— Select project (optional) —</option>
                    {STORE_PROJECTS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                <input value={form.location ?? ""} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                  placeholder="e.g. Lagos Island"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={save} className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl">{editing ? "Save Changes" : "Create Store"}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Delete Store?</h2>
            <p className="text-sm text-gray-600">Remove <span className="font-semibold">{deleteTarget.name}</span>? Child stores will lose their parent link.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => { setStores(prev => prev.filter(s => s.id !== deleteTarget.id)); setDeleteTarget(null); }}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stock Thresholds ─────────────────────────────────────────────────────────

interface StoreThreshold {
  id: string;
  storeName: string;
  storeType: "General" | "Project";
  lowStockQty: number;
  outOfStockQty: number;
  unit: string;
}

const SEED_THRESHOLDS: StoreThreshold[] = [
  { id: "1", storeName: "General Store",          storeType: "General", lowStockQty: 50,  outOfStockQty: 0,  unit: "%" },
  { id: "2", storeName: "Block A Project Store",  storeType: "Project", lowStockQty: 20,  outOfStockQty: 0,  unit: "%" },
  { id: "3", storeName: "Block B Project Store",  storeType: "Project", lowStockQty: 20,  outOfStockQty: 0,  unit: "%" },
  { id: "4", storeName: "Block C Project Store",  storeType: "Project", lowStockQty: 15,  outOfStockQty: 0,  unit: "%" },
];

function StockThresholdsPanel() {
  const [thresholds, setThresholds] = useState<StoreThreshold[]>(SEED_THRESHOLDS);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StoreThreshold | null>(null);
  const [form, setForm] = useState<Omit<StoreThreshold, "id">>({
    storeName: "", storeType: "General", lowStockQty: 20, outOfStockQty: 0, unit: "%",
  });

  function openAdd() {
    setEditing(null);
    setForm({ storeName: "", storeType: "General", lowStockQty: 20, outOfStockQty: 0, unit: "%" });
    setShowModal(true);
  }
  function openEdit(t: StoreThreshold) {
    setEditing(t);
    setForm({ storeName: t.storeName, storeType: t.storeType, lowStockQty: t.lowStockQty, outOfStockQty: t.outOfStockQty, unit: t.unit });
    setShowModal(true);
  }
  function save() {
    if (!form.storeName.trim()) return;
    if (editing) {
      setThresholds(prev => prev.map(t => t.id === editing.id ? { ...t, ...form } : t));
    } else {
      setThresholds(prev => [...prev, { id: String(Date.now()), ...form }]);
    }
    setShowModal(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Configure when materials are flagged as Low Stock or Out of Stock per store. Each store can have different thresholds because consumption rates vary.
        </p>
        <button onClick={openAdd} className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm px-4 py-2 rounded-xl">
          <Plus className="w-4 h-4" /> Add Store
        </button>
      </div>

      {/* Threshold type info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-yellow-800">Low Stock Threshold</p>
          <p className="text-xs text-yellow-700 mt-1">Minimum quantity (or %) before an item is flagged as low. Triggers reorder alerts.</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-red-800">Out of Stock Threshold</p>
          <p className="text-xs text-red-700 mt-1">Quantity at or below which an item is considered unavailable for new requests.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Store Name</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Low Stock Threshold</th>
              <th className="px-4 py-3 text-left font-medium">Out of Stock Threshold</th>
              <th className="px-4 py-3 text-left font-medium w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {thresholds.map(t => (
              <tr key={t.id} className="hover:bg-gray-50 group">
                <td className="px-4 py-3 font-medium text-gray-900">{t.storeName}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.storeType === "General" ? "bg-teal-50 text-teal-700" : "bg-blue-50 text-blue-700"}`}>
                    {t.storeType} Store
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-yellow-50 text-yellow-700 text-sm font-semibold px-2 py-0.5 rounded-lg">
                    {t.lowStockQty}{t.unit}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-red-50 text-red-700 text-sm font-semibold px-2 py-0.5 rounded-lg">
                    {t.outOfStockQty}{t.unit}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                    <button onClick={() => openEdit(t)} className="p-1.5 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-teal-50">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setThresholds(prev => prev.filter(x => x.id !== t.id))}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">{editing ? "Edit" : "Add"} Store Threshold</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Store Name<span className="text-red-500">*</span></label>
                <input value={form.storeName} onChange={e => setForm(p => ({ ...p, storeName: e.target.value }))}
                  placeholder="e.g. Block D Project Store"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Store Type</label>
                <select value={form.storeType} onChange={e => setForm(p => ({ ...p, storeType: e.target.value as "General" | "Project" }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                  <option value="General">General Store</option>
                  <option value="Project">Project Store</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Low Stock Threshold</label>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-500">
                    <input type="number" min={0} value={form.lowStockQty}
                      onChange={e => setForm(p => ({ ...p, lowStockQty: Number(e.target.value) }))}
                      className="flex-1 px-3 py-2 text-sm outline-none min-w-0" />
                    <span className="px-3 text-sm text-gray-400 bg-gray-50 border-l border-gray-200 py-2">{form.unit}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Out of Stock Threshold</label>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-500">
                    <input type="number" min={0} value={form.outOfStockQty}
                      onChange={e => setForm(p => ({ ...p, outOfStockQty: Number(e.target.value) }))}
                      className="flex-1 px-3 py-2 text-sm outline-none min-w-0" />
                    <span className="px-3 text-sm text-gray-400 bg-gray-50 border-l border-gray-200 py-2">{form.unit}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Threshold Unit</label>
                <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                  <option value="%">Percentage (%)</option>
                  <option value=" units">Absolute quantity (units)</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={save} className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl">
                {editing ? "Save Changes" : "Add Store"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Units of Measurement Panel ───────────────────────────────────────────────

interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  category: string;
}

const SEED_UNITS: Unit[] = [
  { id: "1",  name: "Meter",           abbreviation: "m",    category: "Length"  },
  { id: "2",  name: "Centimeter",      abbreviation: "cm",   category: "Length"  },
  { id: "3",  name: "Foot",            abbreviation: "ft",   category: "Length"  },
  { id: "4",  name: "Kilogram",        abbreviation: "kg",   category: "Weight"  },
  { id: "5",  name: "Tonne",           abbreviation: "t",    category: "Weight"  },
  { id: "6",  name: "Bag (Cement)",    abbreviation: "bag",  category: "Custom"  },
  { id: "7",  name: "Cubic Meter",     abbreviation: "m³",   category: "Volume"  },
  { id: "8",  name: "Litre",           abbreviation: "L",    category: "Volume"  },
  { id: "9",  name: "Square Meter",    abbreviation: "m²",   category: "Area"    },
  { id: "10", name: "Piece / Unit",    abbreviation: "pcs",  category: "Custom"  },
  { id: "11", name: "Roll",            abbreviation: "roll", category: "Custom"  },
  { id: "12", name: "Sheet",           abbreviation: "sht",  category: "Custom"  },
  { id: "13", name: "Length",          abbreviation: "len",  category: "Custom"  },
  { id: "14", name: "Box",             abbreviation: "box",  category: "Custom"  },
];

const UNIT_CATEGORIES = ["All", "Length", "Weight", "Volume", "Area", "Custom"];

function UnitsOfMeasurementPanel() {
  const [units, setUnits] = useState<Unit[]>(SEED_UNITS);
  const [catFilter, setCatFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [form, setForm] = useState({ name: "", abbreviation: "", category: "Custom" });
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);

  const filtered = catFilter === "All" ? units : units.filter(u => u.category === catFilter);

  function openAdd() { setEditing(null); setForm({ name: "", abbreviation: "", category: "Custom" }); setShowModal(true); }
  function openEdit(u: Unit) { setEditing(u); setForm({ name: u.name, abbreviation: u.abbreviation, category: u.category }); setShowModal(true); }
  function save() {
    if (!form.name.trim() || !form.abbreviation.trim()) return;
    if (editing) {
      setUnits(prev => prev.map(u => u.id === editing.id ? { ...u, ...form } : u));
    } else {
      setUnits(prev => [...prev, { id: String(Date.now()), ...form }]);
    }
    setShowModal(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {UNIT_CATEGORIES.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-2.5 py-1 text-xs rounded-lg border font-medium ${catFilter === c ? "bg-teal-700 text-white border-teal-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
              {c}
            </button>
          ))}
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm px-4 py-2 rounded-xl">
          <Plus className="w-4 h-4" /> Add Unit
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Unit Name</th>
              <th className="px-4 py-3 text-left font-medium">Abbreviation</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 group">
                <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3"><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{u.abbreviation}</span></td>
                <td className="px-4 py-3 text-gray-500">{u.category}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                    <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-teal-50">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(u)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">{editing ? "Edit" : "Add"} Unit</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Unit Name<span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Cubic Meter"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Abbreviation<span className="text-red-500">*</span></label>
                <input value={form.abbreviation} onChange={e => setForm(p => ({ ...p, abbreviation: e.target.value }))} placeholder="e.g. m³"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                  {["Length", "Weight", "Volume", "Area", "Custom"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={save} className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl">
                {editing ? "Save Changes" : "Add Unit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Delete Unit?</h2>
            <p className="text-sm text-gray-600">Remove <span className="font-semibold">{deleteTarget.name} ({deleteTarget.abbreviation})</span>? Units in use on existing materials will not be changed.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => { setUnits(prev => prev.filter(u => u.id !== deleteTarget.id)); setDeleteTarget(null); }}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Material Categories Panel ────────────────────────────────────────────────

interface MaterialCategory {
  id: string;
  name: string;
  description: string;
  color: string;
}

const CATEGORY_COLORS = [
  { label: "Teal",   value: "teal"   },
  { label: "Blue",   value: "blue"   },
  { label: "Amber",  value: "amber"  },
  { label: "Green",  value: "green"  },
  { label: "Purple", value: "purple" },
  { label: "Red",    value: "red"    },
  { label: "Orange", value: "orange" },
  { label: "Gray",   value: "gray"   },
];

const COLOR_CLASSES: Record<string, { bg: string; text: string }> = {
  teal:   { bg: "bg-teal-100",   text: "text-teal-700"   },
  blue:   { bg: "bg-blue-100",   text: "text-blue-700"   },
  amber:  { bg: "bg-amber-100",  text: "text-amber-700"  },
  green:  { bg: "bg-green-100",  text: "text-green-700"  },
  purple: { bg: "bg-purple-100", text: "text-purple-700" },
  red:    { bg: "bg-red-100",    text: "text-red-700"    },
  orange: { bg: "bg-orange-100", text: "text-orange-700" },
  gray:   { bg: "bg-gray-100",   text: "text-gray-600"   },
};

const SEED_CATEGORIES: MaterialCategory[] = [
  { id: "1", name: "Concrete & Cement",     description: "Cement bags, ready-mix concrete, and admixtures",    color: "gray"   },
  { id: "2", name: "Steel & Reinforcement", description: "Rebar, mesh, structural steel sections",             color: "blue"   },
  { id: "3", name: "Electrical",            description: "Cables, conduits, switches, and distribution boards", color: "amber"  },
  { id: "4", name: "Plumbing & Drainage",   description: "Pipes, fittings, valves, and drainage systems",      color: "teal"   },
  { id: "5", name: "Timber & Formwork",     description: "Planks, plywood sheets, and shuttering material",    color: "orange" },
  { id: "6", name: "Finishing Materials",   description: "Paints, tiles, screeds, and wall finishes",          color: "purple" },
  { id: "7", name: "Aggregates & Fill",     description: "Sharp sand, gravel, laterite, and hardcore fill",    color: "green"  },
  { id: "8", name: "Plant & Equipment",     description: "Consumables and accessories for plant operations",   color: "red"    },
];

function MaterialCategoriesPanel() {
  const [categories, setCategories] = useState<MaterialCategory[]>(SEED_CATEGORIES);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState<MaterialCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaterialCategory | null>(null);
  const [form, setForm] = useState({ name: "", description: "", color: "teal" });

  function openAdd() { setEditing(null); setForm({ name: "", description: "", color: "teal" }); setShowModal(true); }
  function openEdit(c: MaterialCategory) { setEditing(c); setForm({ name: c.name, description: c.description, color: c.color }); setShowModal(true); }
  function save() {
    if (!form.name.trim()) return;
    if (editing) {
      setCategories(prev => prev.map(c => c.id === editing.id ? { ...c, ...form } : c));
    } else {
      setCategories(prev => [...prev, { id: String(Date.now()), ...form }]);
    }
    setShowModal(false);
  }

  return (
    <div className="space-y-4">
      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-teal-700">{categories.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Categories</p>
        </div>
        {["blue", "amber", "teal"].map(color => {
          const count = categories.filter(c => c.color === color).length;
          const cls = COLOR_CLASSES[color];
          return (
            <div key={color} className={`border rounded-xl p-4 text-center ${cls.bg} border-transparent`}>
              <p className={`text-2xl font-bold ${cls.text}`}>{count}</p>
              <p className={`text-xs mt-0.5 ${cls.text} opacity-80`}>{CATEGORY_COLORS.find(c => c.value === color)?.label}</p>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button onClick={openAdd} className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm px-4 py-2 rounded-xl">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Category Name</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-left font-medium">Colour</th>
              <th className="px-4 py-3 text-left font-medium w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {categories.map(c => {
              const cls = COLOR_CLASSES[c.color] ?? COLOR_CLASSES.gray;
              return (
                <tr key={c.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{c.description}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls.bg} ${cls.text}`}>
                      {CATEGORY_COLORS.find(x => x.value === c.color)?.label ?? c.color}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-teal-50">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(c)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">{editing ? "Edit" : "Add"} Material Category</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category Name<span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Electrical"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={2} placeholder="Brief description of materials in this category"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Colour</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.map(({ label, value }) => {
                    const cls = COLOR_CLASSES[value];
                    return (
                      <button key={value} type="button" onClick={() => setForm(p => ({ ...p, color: value }))}
                        className={`px-2.5 py-1 text-xs rounded-full font-medium border-2 transition-all ${cls.bg} ${cls.text} ${form.color === value ? "border-teal-500 ring-2 ring-teal-200" : "border-transparent"}`}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={save} className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl">
                {editing ? "Save Changes" : "Add Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Delete Category?</h2>
            <p className="text-sm text-gray-600">Remove <span className="font-semibold">{deleteTarget.name}</span>? Materials already assigned to this category will not be changed.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => { setCategories(prev => prev.filter(c => c.id !== deleteTarget.id)); setDeleteTarget(null); }}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Module Numbering System ──────────────────────────────────────────────────

function NumberingPanel() {
  const { configs, updateConfig, resetConfig, addConfig, removeConfig } = useNumbering();
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ template: "", startingNumber: 1, endingNumber: null as number | null, incrementBy: 1 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({ module: "", template: "", startingNumber: 1, endingNumber: null as number | null, incrementBy: 1, description: "" });

  const storefrontConfigs = configs.filter(cfg => MODULE_DOMAINS.Storefront.includes(cfg.module));

  function startEdit(cfg: ModuleNumbering) {
    setEditingModule(cfg.module);
    setEditForm({ template: cfg.template, startingNumber: cfg.startingNumber, endingNumber: cfg.endingNumber, incrementBy: cfg.incrementBy });
  }

  function cancelEdit() {
    setEditingModule(null);
  }

  function saveEdit(module: string) {
    updateConfig(module, editForm);
    setEditingModule(null);
  }

  function saveAddNumbering() {
    if (!addFormData.module.trim()) return;
    addConfig({
      module: addFormData.module,
      prefix: addFormData.module.slice(0, 3).toUpperCase(),
      separator: "-",
      template: addFormData.template || `${addFormData.module.slice(0, 3).toUpperCase()}-{N:4}`,
      startingNumber: addFormData.startingNumber,
      endingNumber: addFormData.endingNumber,
      incrementBy: addFormData.incrementBy,
      lastUsedDate: "",
      lastUsedNumber: 0,
      description: addFormData.description,
    });
    setShowAddForm(false);
    setAddFormData({ module: "", template: "", startingNumber: 1, endingNumber: null, incrementBy: 1, description: "" });
  }

  if (storefrontConfigs.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Hash className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Module Numbering System</h2>
        </div>
        <div className="p-5 text-sm text-gray-500">No Storefront numbering modules configured.</div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Hash className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-900">Module Numbering System</h2>
      </div>
      <div className="p-5">
        <p className="text-xs text-gray-500 mb-4">Configure the auto-numbering format for Storefront records. The system uses these patterns when generating new IDs.</p>
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
              {storefrontConfigs.map(cfg => (
                <tr key={cfg.module} className="hover:bg-gray-50 group">
                  {editingModule === cfg.module ? (
                    <>
                      <td className="px-4 py-3 font-medium text-gray-900">{cfg.module}</td>
                      <td className="px-4 py-3">
                        <input type="text" value={editForm.template} onChange={e => setEditForm({ ...editForm, template: e.target.value })}
                          className="w-28 px-2 py-1 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" min={1} value={editForm.startingNumber} onChange={e => setEditForm({ ...editForm, startingNumber: parseInt(e.target.value) || 1 })}
                          className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <input type="number" min={1} value={editForm.endingNumber ?? ""} onChange={e => setEditForm({ ...editForm, endingNumber: e.target.value ? parseInt(e.target.value) : null })}
                            className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="∞" />
                          <label className="text-[10px] text-gray-400 flex items-center gap-0.5 whitespace-nowrap">
                            <input type="checkbox" checked={editForm.endingNumber === null} onChange={e => setEditForm({ ...editForm, endingNumber: e.target.checked ? null : 9999 })} className="w-3 h-3" />
                            Unlimited
                          </label>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" min={1} value={editForm.incrementBy} onChange={e => setEditForm({ ...editForm, incrementBy: parseInt(e.target.value) || 1 })}
                          className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-600" title={String(cfg.lastUsedNumber)}>
                          {formatId(cfg.template, cfg.lastUsedNumber)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{cfg.lastUsedDate || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => saveEdit(cfg.module)} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg"><Save className="w-3.5 h-3.5" /></button>
                          <button onClick={cancelEdit} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-gray-900">{cfg.module}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-500">{cfg.template}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">{cfg.startingNumber}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">{cfg.endingNumber ?? "∞"}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">{cfg.incrementBy}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-600" title={String(cfg.lastUsedNumber)}>
                          {formatId(cfg.template, cfg.lastUsedNumber)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{cfg.lastUsedDate || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEdit(cfg)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => removeConfig(cfg.module)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Delete entry"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {showAddForm && (
                <tr className="bg-amber-50/50">
                  <td className="px-4 py-3">
                    <select value={addFormData.module} onChange={e => {
                      const m = e.target.value;
                      const prefix = m.slice(0, 3).toUpperCase();
                      setAddFormData({ ...addFormData, module: m, template: m ? `${prefix}-{N:4}` : "" });
                    }}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white">
                      <option value="">Select a process…</option>
                      {MODULE_DOMAINS.Storefront.filter(m => !configs.some(c => c.module === m)).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input type="text" value={addFormData.template} onChange={e => setAddFormData({ ...addFormData, template: e.target.value })}
                      className="w-28 px-2 py-1 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" min={1} value={addFormData.startingNumber} onChange={e => setAddFormData({ ...addFormData, startingNumber: parseInt(e.target.value) || 1 })}
                      className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <input type="number" min={1} value={addFormData.endingNumber ?? ""} onChange={e => setAddFormData({ ...addFormData, endingNumber: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="∞" />
                      <label className="text-[10px] text-gray-400 flex items-center gap-0.5 whitespace-nowrap">
                        <input type="checkbox" checked={addFormData.endingNumber === null} onChange={e => setAddFormData({ ...addFormData, endingNumber: e.target.checked ? null : 9999 })} className="w-3 h-3" />
                        Unlimited
                      </label>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" min={1} value={addFormData.incrementBy} onChange={e => setAddFormData({ ...addFormData, incrementBy: parseInt(e.target.value) || 1 })}
                      className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">—</td>
                  <td className="px-4 py-3 text-xs text-gray-400">—</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={saveAddNumbering} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg"><Save className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setShowAddForm(false); setAddFormData({ module: "", template: "", startingNumber: 1, endingNumber: null, incrementBy: 1, description: "" }); }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)} className="mt-4 flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium">
            <Plus className="w-3.5 h-3.5" /> Add Numbering Entry
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Config Page ─────────────────────────────────────────────────────────
export function StorefrontSettingsPage() {
  const [tab, setTab] = useState<"levels" | "stores" | "thresholds" | "units" | "categories" | "numbering">("levels");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center">
          <Settings className="w-5 h-5 text-teal-700" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Storefront Configuration</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage store hierarchy, stock thresholds and units of measurement for the inventory system</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 flex-wrap">
        {([
          ["levels",     "Store Levels",          <Layers  key="l" className="w-4 h-4" />],
          ["stores",     "Stores",                <Store   key="st" className="w-4 h-4" />],
          ["thresholds", "Stock Thresholds",      <Settings key="s" className="w-4 h-4" />],
          ["units",      "Units of Measurement",  <Ruler   key="r" className="w-4 h-4" />],
          ["categories", "Material Categories",   <Tag     key="t" className="w-4 h-4" />],
          ["numbering",  "Module Numbering",      <Hash    key="n" className="w-4 h-4" />],
        ] as const).map(([key, label, icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {icon} {label}
          </button>
        ))}
      </div>

      {tab === "levels"     && <StoreLevelsPanel />}
      {tab === "stores"     && <StoresPanel />}
      {tab === "thresholds" && <StockThresholdsPanel />}
      {tab === "units"      && <UnitsOfMeasurementPanel />}
      {tab === "categories" && <MaterialCategoriesPanel />}
      {tab === "numbering"  && <NumberingPanel />}
    </div>
  );
}
