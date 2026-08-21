import { useState, useEffect, Fragment } from "react";
import { NumberingConfigPanel } from "../../components/NumberingConfigPanel";
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Ruler,
  Tag,
  Package,
  Layers,
  Store,
  ChevronRight,
  ChevronDown,
  Link2,
  FolderOpen,
  Hash,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getStores,
  createStore,
  updateStore,
  deleteStore,
  Store as ApiStore,
} from "../../api/materials";
import {
  getStoreLevels,
  updateStoreLevels,
  getStoreThresholds,
  updateStoreThresholds,
  getUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  getMaterialCategories,
  createMaterialCategory,
  updateMaterialCategory,
  deleteMaterialCategory,
  MaterialCategoryRecord,
} from "../../api/admin-extras";
import { getReferenceData } from "../../api/reference-data";
import { useSearchParams } from "react-router";

// ─── Store Level Configuration ────────────────────────────────────────────────

interface StoreLevelConfig {
  level: 1 | 2 | 3;
  name: string;
  description: string;
  color: string;
  maxCount?: number;
}

const DEFAULT_LEVEL_CONFIGS: StoreLevelConfig[] = [
  {
    level: 1,
    name: "Central Store",
    description:
      "Primary warehouse — controls inventory distribution company-wide",
    color: "teal",
    maxCount: 2,
  },
  {
    level: 2,
    name: "Regional Hub",
    description:
      "Non-project stores serving multiple projects (regions, zones, departments)",
    color: "blue",
    maxCount: 5,
  },
  {
    level: 3,
    name: "Project Store",
    description:
      "Assigned to a specific project, receives materials from Level 1 or 2",
    color: "purple",
    maxCount: undefined,
  },
];

const LEVEL_COLORS: Record<
  string,
  { badge: string; ring: string; icon: string }
> = {
  teal: {
    badge: "bg-teal-100 text-teal-700",
    ring: "ring-teal-300",
    icon: "text-teal-600",
  },
  blue: {
    badge: "bg-blue-100 text-blue-700",
    ring: "ring-blue-300",
    icon: "text-blue-600",
  },
  purple: {
    badge: "bg-purple-100 text-purple-700",
    ring: "ring-purple-300",
    icon: "text-purple-600",
  },
  amber: {
    badge: "bg-amber-100 text-amber-700",
    ring: "ring-amber-300",
    icon: "text-amber-600",
  },
};

function StoreLevelsPanel() {
  const [levels, setLevels] = useState<StoreLevelConfig[]>(
    DEFAULT_LEVEL_CONFIGS,
  );
  const [editingLevel, setEditingLevel] = useState<StoreLevelConfig | null>(
    null,
  );
  const [form, setForm] = useState({ name: "", description: "", maxCount: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getStoreLevels()
      .then((data) => {
        if (Array.isArray(data) && data.length) {
          setLevels(
            data.map((l) => ({
              level: l.level,
              name: l.name,
              description: l.description,
              color: l.color || "teal",
              maxCount: l.maxCount ?? undefined,
            })),
          );
        }
      })
      .catch((err: unknown) =>
        toast.error(
          err instanceof Error ? err.message : "Failed to load store levels.",
        ),
      );
  }, []);

  function openEdit(l: StoreLevelConfig) {
    setEditingLevel(l);
    setForm({
      name: l.name,
      description: l.description,
      maxCount: l.maxCount != null ? String(l.maxCount) : "",
    });
  }
  async function save() {
    if (!form.name.trim() || !editingLevel) return;
    const next = levels.map((l) =>
      l.level === editingLevel.level
        ? {
          ...l,
          name: form.name,
          description: form.description,
          maxCount: form.maxCount ? Number(form.maxCount) : undefined,
        }
        : l,
    );
    setSaving(true);
    try {
      await updateStoreLevels(
        next.map((l) => ({
          level: l.level,
          name: l.name,
          description: l.description,
          color: l.color,
          maxCount: l.maxCount ?? null,
        })),
      );
      setLevels(next);
      setEditingLevel(null);
      toast.success(`Level ${editingLevel.level} updated`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update store level");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Define the naming and limits for each store level. These names appear
        throughout the system when referencing inventory locations.
      </p>

      <div className="grid grid-cols-3 gap-4">
        {levels.map((l) => {
          const clr = LEVEL_COLORS[l.color] ?? LEVEL_COLORS.teal;
          return (
            <div
              key={l.level}
              className={`bg-white border-2 rounded-2xl p-5 space-y-3 ${clr.ring} ring-1`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${clr.badge}`}
                  >
                    Level {l.level}
                  </span>
                </div>
                <button
                  onClick={() => openEdit(l)}
                  className="p-1.5 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-teal-50"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">
                  {l.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {l.description}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                <Layers className={`w-3.5 h-3.5 ${clr.icon}`} />
                <p className="text-xs text-gray-500">
                  Max stores:{" "}
                  <span className={`font-semibold ${clr.icon}`}>
                    {l.maxCount ?? "Unlimited"}
                  </span>
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
          <li>
            Level 2 stores receive from Level 1 and distribute to Level 3 or
            directly to projects.
          </li>
          <li>
            Level 3 stores are project-specific and receive materials from Level
            1 or Level 2.
          </li>
        </ul>
      </div>

      {editingLevel && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Configure Level {editingLevel.level}
              </h2>
              <button
                onClick={() => setEditingLevel(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Level Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Central Warehouse"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  rows={2}
                  placeholder="Brief description of this store level's role"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Maximum Stores (leave blank for unlimited)
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.maxCount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, maxCount: e.target.value }))
                  }
                  placeholder="e.g. 3"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setEditingLevel(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
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


function storeFromApi(s: ApiStore): StoreRecord {
  const level: StoreLevel =
    s.type === "Project"
      ? 3
      : s.type === "Regional"
        ? 2
        : 1;
  return {
    id: s.id,
    name: s.name,
    level,
    location: s.location,
    linkedProject: s.projectName,
    status: "Active",
  };
}

function levelToType(level: StoreLevel): string {
  return level === 3 ? "Project" : level === 2 ? "Regional" : "Central";
}

function StoresPanel() {
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [levelCaps, setLevelCaps] = useState<Record<number, number | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<StoreLevel | 0>(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StoreRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoreRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<Omit<StoreRecord, "id">>({
    name: "",
    level: 1,
    status: "Active",
  });

  useEffect(() => {
    Promise.all([getStores(), getReferenceData(), getStoreLevels()])
      .then(([storeData, refs, levels]) => {
        setStores(storeData.map(storeFromApi));
        setProjects(refs.projects.map((p) => p.name));
        if (Array.isArray(levels) && levels.length) {
          const caps: Record<number, number | undefined> = {};
          levels.forEach((l) => {
            caps[l.level] =
              l.maxCount === null || l.maxCount === undefined
                ? undefined
                : Number(l.maxCount);
          });
          setLevelCaps(caps);
        } else {
          const caps: Record<number, number | undefined> = {};
          DEFAULT_LEVEL_CONFIGS.forEach((l) => {
            caps[l.level] = l.maxCount;
          });
          setLevelCaps(caps);
        }
      })
      .catch((err: unknown) =>
        toast.error(
          err instanceof Error ? err.message : "Failed to load store levels.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const LEVEL_LABELS: Record<StoreLevel, string> = {
    1: "Central Store",
    2: "Regional Hub",
    3: "Project Store",
  };
  const LEVEL_BADGE: Record<StoreLevel, string> = {
    1: "bg-teal-100 text-teal-700",
    2: "bg-blue-100 text-blue-700",
    3: "bg-purple-100 text-purple-700",
  };

  const filtered =
    levelFilter === 0 ? stores : stores.filter((s) => s.level === levelFilter);

  if (loading)
    return (
      <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
    );

  function openAdd() {
    setEditing(null);
    setForm({ name: "", level: 1, status: "Active" });
    setShowModal(true);
  }
  function openEdit(s: StoreRecord) {
    setEditing(s);
    setForm({
      name: s.name,
      level: s.level,
      parentId: s.parentId,
      linkedProject: s.linkedProject,
      location: s.location,
      status: s.status,
    });
    setShowModal(true);
  }
  async function save() {
    if (!form.name.trim()) return;
    if (!editing) {
      const cap = levelCaps[form.level];
      if (typeof cap === "number" && cap >= 0) {
        const existingAtLevel = stores.filter(
          (s) => s.level === form.level,
        ).length;
        if (existingAtLevel >= cap) {
          toast.error(
            `Maximum of ${cap} ${LEVEL_LABELS[form.level]} store${cap === 1 ? "" : "s"} allowed. Update the limit in Store Levels to add more.`,
          );
          return;
        }
      }
    }
    const payload = {
      name: form.name.trim(),
      type: levelToType(form.level),
      location: form.location || undefined,
      projectName: form.level === 3 ? form.linkedProject || undefined : undefined,
    };
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateStore(editing.id, payload);
        setStores((prev) =>
          prev.map((s) =>
            s.id === editing.id
              ? { ...s, ...form, id: updated.id, name: updated.name }
              : s,
          ),
        );
        toast.success("Store updated");
      } else {
        const created = await createStore(payload);
        setStores((prev) => [
          ...prev,
          { ...storeFromApi(created), ...form, id: created.id },
        ]);
        toast.success("Store created");
      }
      setShowModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save store");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteStore(deleteTarget.id);
      setStores((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast.success("Store deleted");
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete store");
    } finally {
      setDeleting(false);
    }
  }

  const parentOptions = stores.filter((s) => s.level < form.level);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {([0, 1, 2, 3] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLevelFilter(l)}
              className={`px-3 py-1 text-xs rounded-lg border font-medium ${levelFilter === l ? "bg-teal-700 text-white border-teal-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
            >
              {l === 0
                ? "All Levels"
                : `Level ${l} — ${LEVEL_LABELS[l as StoreLevel]}`}
            </button>
          ))}
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm px-4 py-2 rounded-xl"
        >
          <Plus className="w-4 h-4" /> Create Store
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {([1, 2, 3] as StoreLevel[]).map((l) => {
          const count = stores.filter(
            (s) => s.level === l && s.status === "Active",
          ).length;
          return (
            <div
              key={l}
              className={`rounded-xl px-4 py-3 border ${l === 1 ? "bg-teal-50 border-teal-200" : l === 2 ? "bg-blue-50 border-blue-200" : "bg-purple-50 border-purple-200"}`}
            >
              <p
                className={`text-2xl font-bold ${l === 1 ? "text-teal-700" : l === 2 ? "text-blue-700" : "text-purple-700"}`}
              >
                {count}
              </p>
              <p
                className={`text-xs mt-0.5 ${l === 1 ? "text-teal-600" : l === 2 ? "text-blue-600" : "text-purple-600"}`}
              >
                Active {LEVEL_LABELS[l]}(s)
              </p>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Store Name</th>
              <th className="px-4 py-3 text-left font-medium">Level</th>
              <th className="px-4 py-3 text-left font-medium">Parent Store</th>
              <th className="px-4 py-3 text-left font-medium">
                Linked Project
              </th>
              <th className="px-4 py-3 text-left font-medium">Location</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((s) => {
              const parent = stores.find((p) => p.id === s.parentId);
              return (
                <tr key={s.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {s.level === 1 ? (
                        <Store className="w-3.5 h-3.5 text-teal-500" />
                      ) : s.level === 2 ? (
                        <Layers className="w-3.5 h-3.5 text-blue-500" />
                      ) : (
                        <FolderOpen className="w-3.5 h-3.5 text-purple-500" />
                      )}
                      {s.name}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_BADGE[s.level]}`}
                    >
                      Level {s.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {parent ? (
                      <div className="flex items-center gap-1">
                        <ChevronRight className="w-3 h-3 text-gray-300" />
                        {parent.name}
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {s.linkedProject ? (
                      <div className="flex items-center gap-1">
                        <Link2 className="w-3 h-3 text-purple-400" />
                        {s.linkedProject}
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {s.location ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 transition-opacity justify-end">
                      <button
                        onClick={() => openEdit(s)}
                        title="Edit store"
                        className="p-1.5 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-teal-50"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(s)}
                        title="Delete store"
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      >
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
              <h2 className="text-base font-semibold text-gray-900">
                {editing ? "Edit" : "Create"} Store
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Store Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Lagos Central Warehouse"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Store Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.level}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        level: Number(e.target.value) as StoreLevel,
                        parentId: undefined,
                        linkedProject: undefined,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value={1}>Level 1 — Central Store</option>
                    <option value={2}>Level 2 — Regional Hub</option>
                    <option value={3}>Level 3 — Project Store</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        status: e.target.value as StoreStatus,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>
              {form.level > 1 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Parent Store (Level {form.level - 1})
                  </label>
                  <select
                    value={form.parentId ?? ""}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        parentId: e.target.value || undefined,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="">— Select parent store —</option>
                    {parentOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Level {p.level})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {form.level === 3 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Linked Project
                  </label>
                  <select
                    value={form.linkedProject ?? ""}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        linkedProject: e.target.value || undefined,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="">— Select project (optional) —</option>
                    {projects.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Location
                </label>
                <input
                  value={form.location ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, location: e.target.value }))
                  }
                  placeholder="e.g. Lagos Island"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl disabled:opacity-60"
              >
                {saving
                  ? "Saving…"
                  : editing
                    ? "Save Changes"
                    : "Create Store"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">
              Delete Store?
            </h2>
            <p className="text-sm text-gray-600">
              Remove <span className="font-semibold">{deleteTarget.name}</span>?
              Child stores will lose their parent link.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
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


function StockThresholdsPanel() {
  const [thresholds, setThresholds] =
    useState<StoreThreshold[]>([]);
  const [stores, setStores] = useState<ApiStore[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StoreThreshold | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoreThreshold | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<StoreThreshold, "id">>({
    storeName: "",
    storeType: "General",
    lowStockQty: 20,
    outOfStockQty: 0,
    unit: "%",
  });

  useEffect(() => {
    Promise.all([getStoreThresholds(), getStores()])
      .then(([thresholdData, storeData]) => {
        if (Array.isArray(thresholdData)) setThresholds(thresholdData);
        setStores(storeData);
      })
      .catch((err: unknown) =>
        toast.error(
          err instanceof Error ? err.message : "Failed to load stores.",
        ),
      );
  }, []);

  async function persist(next: StoreThreshold[], successMsg: string) {
    setSaving(true);
    try {
      const saved = await updateStoreThresholds(next);
      setThresholds(Array.isArray(saved) ? saved : next);
      toast.success(successMsg);
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Failed to save store threshold");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setForm({
      storeName: "",
      storeType: "General",
      lowStockQty: 20,
      outOfStockQty: 0,
      unit: "%",
    });
    setShowModal(true);
  }
  function openEdit(t: StoreThreshold) {
    setEditing(t);
    setForm({
      storeName: t.storeName,
      storeType: t.storeType,
      lowStockQty: t.lowStockQty,
      outOfStockQty: t.outOfStockQty,
      unit: t.unit,
    });
    setShowModal(true);
  }
  async function save() {
    if (!form.storeName.trim()) return;
    // A store has one threshold. Two rows for the same store would give the
    // stock-status calculation two different answers with nothing deciding
    // which applies, so the second is rejected rather than silently shadowing
    // the first.
    const duplicate = thresholds.some(
      (t) => t.id !== editing?.id && t.storeName === form.storeName,
    );
    if (duplicate) {
      toast.error(`${form.storeName} already has a stock threshold.`);
      return;
    }
    const next = editing
      ? thresholds.map((t) =>
        t.id === editing.id ? { ...t, ...form } : t,
      )
      : [...thresholds, { id: String(Date.now()), ...form }];
    const ok = await persist(
      next,
      editing ? "Threshold updated" : "Threshold added",
    );
    if (ok) setShowModal(false);
  }
  async function remove(id: string) {
    await persist(
      thresholds.filter((x) => x.id !== id),
      "Threshold deleted",
    );
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Configure when materials are flagged as Low Stock or Out of Stock per
          store. Each store can have different thresholds because consumption
          rates vary.
        </p>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm px-4 py-2 rounded-xl"
        >
          <Plus className="w-4 h-4" /> Add Store
        </button>
      </div>

      {/* Threshold type info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-yellow-800">
            Low Stock Threshold
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            Minimum quantity (or %) before an item is flagged as low. Triggers
            reorder alerts.
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-red-800">
            Out of Stock Threshold
          </p>
          <p className="text-xs text-red-700 mt-1">
            Quantity at or below which an item is considered unavailable for new
            requests.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Store Name</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">
                Low Stock Threshold
              </th>
              <th className="px-4 py-3 text-left font-medium">
                Out of Stock Threshold
              </th>
              <th className="px-4 py-3 text-left font-medium w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {thresholds.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 group">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {t.storeName}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.storeType === "General" ? "bg-teal-50 text-teal-700" : "bg-blue-50 text-blue-700"}`}
                  >
                    {t.storeType} Store
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-yellow-50 text-yellow-700 text-sm font-semibold px-2 py-0.5 rounded-lg">
                    {t.lowStockQty}
                    {t.unit}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-red-50 text-red-700 text-sm font-semibold px-2 py-0.5 rounded-lg">
                    {t.outOfStockQty}
                    {t.unit}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 transition-opacity justify-end">
                    <button
                      onClick={() => openEdit(t)}
                      title="Edit threshold"
                      className="p-1.5 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-teal-50"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      title="Delete threshold"
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    >
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
              <h2 className="text-base font-semibold text-gray-900">
                {editing ? "Edit" : "Add"} Store Threshold
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Store Name<span className="text-red-500">*</span>
                </label>
                <select
                  value={form.storeName}
                  onChange={(e) => {
                    const name = e.target.value;
                    const matched = stores.find((s) => s.name === name);
                    setForm((p) => ({
                      ...p,
                      storeName: name,
                      storeType:
                        matched?.type === "Project" ? "Project" : p.storeType,
                    }));
                  }}
                  disabled={stores.length === 0}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                >
                  {stores.length === 0 ? (
                    <option value="">No stores available — create one first</option>
                  ) : (
                    <>
                      <option value="">— Select a store —</option>
                      {/* A store that already has a threshold is not offered
                          again; the one being edited stays selectable. */}
                      {stores
                        .filter(
                          (s) =>
                            s.name === editing?.storeName ||
                            !thresholds.some((t) => t.storeName === s.name),
                        )
                        .map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Store Type
                </label>
                <select
                  value={form.storeType}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      storeType: e.target.value as "General" | "Project",
                    }))
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="General">General Store</option>
                  <option value="Project">Project Store</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Low Stock Threshold
                  </label>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-500">
                    <input
                      type="number"
                      min={0}
                      value={form.lowStockQty}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          lowStockQty: Number(e.target.value),
                        }))
                      }
                      className="flex-1 px-3 py-2 text-sm outline-none min-w-0"
                    />
                    <span className="px-3 text-sm text-gray-400 bg-gray-50 border-l border-gray-200 py-2">
                      {form.unit}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Out of Stock Threshold
                  </label>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-500">
                    <input
                      type="number"
                      min={0}
                      value={form.outOfStockQty}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          outOfStockQty: Number(e.target.value),
                        }))
                      }
                      className="flex-1 px-3 py-2 text-sm outline-none min-w-0"
                    />
                    <span className="px-3 text-sm text-gray-400 bg-gray-50 border-l border-gray-200 py-2">
                      {form.unit}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Threshold Unit
                </label>
                <select
                  value={form.unit}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, unit: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="%">Percentage (%)</option>
                  <option value=" units">Absolute quantity (units)</option>
                </select>
                <p className="mt-1 text-[11px] text-gray-400">
                  A percentage is taken of each item's own reorder level; an
                  absolute threshold is compared to the quantity on hand. Items
                  with no reorder level fall back to it as the low-stock line.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl disabled:opacity-60"
              >
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Store"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">
              Delete Threshold?
            </h2>
            <p className="text-sm text-gray-600">
              Remove the threshold for{" "}
              <span className="font-semibold">{deleteTarget.storeName}</span>?
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={saving}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-60"
              >
                {saving ? "Deleting…" : "Delete"}
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


const UNIT_CATEGORIES = ["All", "Length", "Weight", "Volume", "Area", "Custom"];

function UnitsOfMeasurementPanel() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [catFilter, setCatFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [form, setForm] = useState({
    name: "",
    abbreviation: "",
    category: "Custom",
  });
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getUnits()
      .then((data) =>
        setUnits(
          (data ?? []).map((u) => ({
            id: u.id,
            name: u.name,
            abbreviation: u.abbreviation,
            category: u.category || "Custom",
          })),
        ),
      )
      .catch((err) => toast.error(err?.message || "Failed to load units"));
  }, []);

  const filtered =
    catFilter === "All" ? units : units.filter((u) => u.category === catFilter);

  function openAdd() {
    setEditing(null);
    setForm({ name: "", abbreviation: "", category: "Custom" });
    setShowModal(true);
  }
  function openEdit(u: Unit) {
    setEditing(u);
    setForm({
      name: u.name,
      abbreviation: u.abbreviation,
      category: u.category,
    });
    setShowModal(true);
  }
  async function save() {
    if (!form.name.trim() || !form.abbreviation.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        abbreviation: form.abbreviation.trim(),
        category: form.category,
        baseUnit: form.abbreviation.trim(),
        conversionFactor: 1,
      };
      if (editing) {
        const updated = await updateUnit(editing.id, payload);
        setUnits((prev) =>
          prev.map((u) =>
            u.id === editing.id
              ? {
                id: updated.id,
                name: updated.name,
                abbreviation: updated.abbreviation,
                category: updated.category,
              }
              : u,
          ),
        );
        toast.success("Unit updated");
      } else {
        const created = await createUnit(payload);
        setUnits((prev) => [
          ...prev,
          {
            id: created.id,
            name: created.name,
            abbreviation: created.abbreviation,
            category: created.category,
          },
        ]);
        toast.success("Unit added");
      }
      setShowModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save unit");
    } finally {
      setSaving(false);
    }
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUnit(deleteTarget.id);
      setUnits((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      toast.success("Unit deleted");
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete unit");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {UNIT_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`px-2.5 py-1 text-xs rounded-lg border font-medium ${catFilter === c ? "bg-teal-700 text-white border-teal-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm px-4 py-2 rounded-xl"
        >
          <Plus className="w-4 h-4" /> Add Unit
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Unit Name</th>
              <th className="px-4 py-3 text-left font-medium">Abbreviation</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 group">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {u.name}
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {u.abbreviation}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.category}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 transition-opacity justify-end">
                    <button
                      onClick={() => openEdit(u)}
                      title="Edit unit"
                      className="p-1.5 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-teal-50"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(u)}
                      title="Delete unit"
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    >
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
              <h2 className="text-base font-semibold text-gray-900">
                {editing ? "Edit" : "Add"} Unit
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Unit Name<span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Cubic Meter"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Abbreviation<span className="text-red-500">*</span>
                </label>
                <input
                  value={form.abbreviation}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, abbreviation: e.target.value }))
                  }
                  placeholder="e.g. m³"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, category: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  {["Length", "Weight", "Volume", "Area", "Custom"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl disabled:opacity-60"
              >
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Unit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">
              Delete Unit?
            </h2>
            <p className="text-sm text-gray-600">
              Remove{" "}
              <span className="font-semibold">
                {deleteTarget.name} ({deleteTarget.abbreviation})
              </span>
              ? Units in use on existing materials will not be changed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Material Categories Panel ────────────────────────────────────────────────

type MaterialCategory = MaterialCategoryRecord;

const CATEGORY_COLORS = [
  { label: "Teal", value: "teal" },
  { label: "Blue", value: "blue" },
  { label: "Amber", value: "amber" },
  { label: "Green", value: "green" },
  { label: "Purple", value: "purple" },
  { label: "Red", value: "red" },
  { label: "Orange", value: "orange" },
  { label: "Gray", value: "gray" },
];

const COLOR_CLASSES: Record<string, { bg: string; text: string }> = {
  teal: { bg: "bg-teal-100", text: "text-teal-700" },
  blue: { bg: "bg-blue-100", text: "text-blue-700" },
  amber: { bg: "bg-amber-100", text: "text-amber-700" },
  green: { bg: "bg-green-100", text: "text-green-700" },
  purple: { bg: "bg-purple-100", text: "text-purple-700" },
  red: { bg: "bg-red-100", text: "text-red-700" },
  orange: { bg: "bg-orange-100", text: "text-orange-700" },
  gray: { bg: "bg-gray-100", text: "text-gray-600" },
};

const DIMENSION_KINDS = [
  "Weight",
  "Length",
  "Width",
  "Breadth",
  "Thickness",
  "Area",
  "Volume",
  "Custom",
];

const DIMENSION_UNITS = [
  "kg", "g", "tonne", "mm", "cm", "m", "inch", "ft",
  "m²", "ft²", "m³", "L", "bag", "box", "roll", "sheet", "pcs", "set",
];

let catalogFormKeySeed = 0;
function nextCatalogFormKey() {
  catalogFormKeySeed += 1;
  return `k${catalogFormKeySeed}`;
}

interface DimensionFormRow {
  key: string;
  kind: string;
  value: string;
  unit: string;
}
interface TypeFormRow {
  key: string;
  name: string;
  sku: string;
  dimensions: DimensionFormRow[];
}
interface MaterialFormRow {
  key: string;
  name: string;
  classification: "Consumable" | "Reusable";
  types: TypeFormRow[];
}

function blankDimension(): DimensionFormRow {
  return { key: nextCatalogFormKey(), kind: "Length", value: "", unit: "" };
}
function blankType(): TypeFormRow {
  return { key: nextCatalogFormKey(), name: "", sku: "", dimensions: [blankDimension()] };
}
function blankMaterial(): MaterialFormRow {
  return { key: nextCatalogFormKey(), name: "", classification: "Consumable", types: [blankType()] };
}

/**
 * Guards against a category record missing its nested materials/types/
 * dimensions arrays — e.g. a backend still on the old flat
 * {name, description, color} shape — so the page degrades to "no materials
 * yet" instead of crashing on `.reduce`/`.map` over undefined.
 */
function normalizeCategoryRecord(c: MaterialCategory): MaterialCategory {
  return {
    ...c,
    materials: (c.materials ?? []).map((m) => ({
      ...m,
      classification: m.classification === "Reusable" ? "Reusable" : "Consumable",
      types: (m.types ?? []).map((t) => ({
        ...t,
        dimensions: t.dimensions ?? [],
      })),
    })),
  };
}

function MaterialCategoriesPanel() {
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MaterialCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaterialCategory | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", color: "teal" });
  const [materials, setMaterials] = useState<MaterialFormRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getMaterialCategories()
      .then((data) => {
        console.log("[MaterialCategory:load] server returned", data);
        setCategories((data ?? []).map(normalizeCategoryRecord));
      })
      .catch((err) => {
        console.error("[MaterialCategory:load] failed", err);
        toast.error(err?.message || "Failed to load categories");
      });
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({ name: "", description: "", color: "teal" });
    setMaterials([blankMaterial()]);
    setShowModal(true);
  }

  function openEdit(c: MaterialCategory) {
    setEditing(c);
    setForm({ name: c.name, description: c.description || "", color: c.color });
    setMaterials(
      c.materials.length
        ? c.materials.map((m) => ({
          key: nextCatalogFormKey(),
          name: m.name,
          classification: m.classification,
          types: m.types.length
            ? m.types.map((t) => ({
              key: nextCatalogFormKey(),
              name: t.name,
              sku: t.sku || "",
              dimensions: t.dimensions.length
                ? t.dimensions.map((d) => ({
                  key: nextCatalogFormKey(),
                  kind: d.kind,
                  value: d.value == null ? "" : String(d.value),
                  unit: d.unit || "",
                }))
                : [blankDimension()],
            }))
            : [blankType()],
        }))
        : [blankMaterial()],
    );
    setShowModal(true);
  }

  function addMaterial() {
    setMaterials((prev) => [...prev, blankMaterial()]);
  }
  function removeMaterial(key: string) {
    setMaterials((prev) => prev.filter((m) => m.key !== key));
  }
  function updateMaterialRow(key: string, patch: Partial<MaterialFormRow>) {
    setMaterials((prev) => prev.map((m) => (m.key === key ? { ...m, ...patch } : m)));
  }
  function addType(materialKey: string) {
    setMaterials((prev) =>
      prev.map((m) => (m.key === materialKey ? { ...m, types: [...m.types, blankType()] } : m)),
    );
  }
  function removeType(materialKey: string, typeKey: string) {
    setMaterials((prev) =>
      prev.map((m) =>
        m.key === materialKey ? { ...m, types: m.types.filter((t) => t.key !== typeKey) } : m,
      ),
    );
  }
  function updateTypeRow(materialKey: string, typeKey: string, patch: Partial<TypeFormRow>) {
    setMaterials((prev) =>
      prev.map((m) =>
        m.key === materialKey
          ? { ...m, types: m.types.map((t) => (t.key === typeKey ? { ...t, ...patch } : t)) }
          : m,
      ),
    );
  }
  function addDimension(materialKey: string, typeKey: string) {
    setMaterials((prev) =>
      prev.map((m) =>
        m.key === materialKey
          ? {
            ...m,
            types: m.types.map((t) =>
              t.key === typeKey ? { ...t, dimensions: [...t.dimensions, blankDimension()] } : t,
            ),
          }
          : m,
      ),
    );
  }
  function removeDimension(materialKey: string, typeKey: string, dimensionKey: string) {
    setMaterials((prev) =>
      prev.map((m) =>
        m.key === materialKey
          ? {
            ...m,
            types: m.types.map((t) =>
              t.key === typeKey
                ? { ...t, dimensions: t.dimensions.filter((d) => d.key !== dimensionKey) }
                : t,
            ),
          }
          : m,
      ),
    );
  }
  function updateDimensionRow(
    materialKey: string,
    typeKey: string,
    dimensionKey: string,
    patch: Partial<DimensionFormRow>,
  ) {
    setMaterials((prev) =>
      prev.map((m) =>
        m.key === materialKey
          ? {
            ...m,
            types: m.types.map((t) =>
              t.key === typeKey
                ? {
                  ...t,
                  dimensions: t.dimensions.map((d) =>
                    d.key === dimensionKey ? { ...d, ...patch } : d,
                  ),
                }
                : t,
            ),
          }
          : m,
      ),
    );
  }

  /**
   * A blank pre-seeded row is silently dropped on save (that's fine — it's
   * how "leave it empty if you don't need it" works). But a row that's
   * *partly* filled in — a Type named with no Unit picked, or a Type under
   * a Material whose own name was never filled in — would be silently
   * dropped too, with no sign anything was lost. Catch that before saving.
   */
  function findIncompleteRow(): string | null {
    for (const m of materials) {
      const materialName = m.name.trim();
      if (materialName) continue;
      for (const t of m.types) {
        const typeName = t.name.trim();
        if (typeName) {
          return `"${typeName}" needs its material's name filled in before it can be saved.`;
        }
      }
    }
    return null;
  }

  async function save() {
    if (!form.name.trim()) return;
    const incomplete = findIncompleteRow();
    if (incomplete) {
      toast.error(incomplete);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        color: form.color,
        materials: materials
          .filter((m) => m.name.trim())
          .map((m) => ({
            name: m.name.trim(),
            classification: m.classification,
            types: m.types
              .filter((t) => t.name.trim())
              .map((t) => ({
                name: t.name.trim(),
                sku: t.sku.trim() || undefined,
                dimensions: t.dimensions
                  .filter((d) => d.kind)
                  .map((d) => ({
                    kind: d.kind,
                    value: d.value === "" ? undefined : Number(d.value),
                    unit: d.unit || undefined,
                  })),
              })),
          })),
      };
      console.log(
        `[MaterialCategory:save] submitting ${editing ? "update" : "create"} payload`,
        payload,
      );
      if (editing) {
        const updated = normalizeCategoryRecord(await updateMaterialCategory(editing.id, payload));
        console.log("[MaterialCategory:save] server responded (update)", updated);
        setCategories((prev) => prev.map((c) => (c.id === editing.id ? updated : c)));
        toast.success("Category updated");
      } else {
        const created = normalizeCategoryRecord(await createMaterialCategory(payload));
        console.log("[MaterialCategory:save] server responded (create)", created);
        setCategories((prev) => [...prev, created]);
        toast.success("Category added");
      }
      setShowModal(false);
    } catch (err: any) {
      console.error("[MaterialCategory:save] failed", err);
      toast.error(err?.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    console.log("[MaterialCategory:delete] requesting delete for", deleteTarget.id, deleteTarget.name);
    setDeleting(true);
    try {
      await deleteMaterialCategory(deleteTarget.id);
      console.log("[MaterialCategory:delete] server confirmed delete for", deleteTarget.id);
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      toast.success("Category deleted");
      setDeleteTarget(null);
    } catch (err: any) {
      console.error("[MaterialCategory:delete] failed", err);
      toast.error(err?.message || "Failed to delete category");
    } finally {
      setDeleting(false);
    }
  }

  const totalTypes = categories.reduce(
    (sum, c) => sum + c.materials.reduce((s, m) => s + m.types.length, 0),
    0,
  );
  const totalMaterials = categories.reduce((sum, c) => sum + c.materials.length, 0);
  const totalReusable = categories.reduce(
    (sum, c) => sum + c.materials.filter((m) => m.classification === "Reusable").length,
    0,
  );

  return (
    <div className="space-y-4">
      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-teal-700">{categories.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Categories</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-teal-700">{totalMaterials}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Materials</p>
        </div>
        <div className="bg-purple-50 border border-transparent rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-700">{totalReusable}</p>
          <p className="text-xs text-purple-700/80 mt-0.5">Reusable</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-teal-700">{totalTypes}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Types</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm px-4 py-2 rounded-xl"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Category Name</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-left font-medium">Materials</th>
              <th className="px-4 py-3 text-left font-medium">Colour</th>
              <th className="px-4 py-3 text-left font-medium w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {categories.map((c) => {
              const cls = COLOR_CLASSES[c.color] ?? COLOR_CLASSES.gray;
              const typeCount = c.materials.reduce((s, m) => s + m.types.length, 0);
              const isExpanded = expanded === c.id;
              return (
                <Fragment key={c.id}>
                  <tr
                    className="group hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : c.id)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                      {c.description}
                    </td>
                    <td className="px-4 py-3 text-teal-700 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                        )}
                        {c.materials.length} material{c.materials.length === 1 ? "" : "s"} ·{" "}
                        {typeCount} type{typeCount === 1 ? "" : "s"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls.bg} ${cls.text}`}
                      >
                        {CATEGORY_COLORS.find((x) => x.value === c.color)
                          ?.label ?? c.color}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(c)}
                          title="Edit category"
                          className="p-1.5 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-teal-50"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          title="Delete category"
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={5} className="bg-gray-50 px-4 py-4">
                        {c.materials.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No materials added yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {c.materials.map((m) => (
                              <div key={m.id} className="bg-white border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-gray-900">{m.name}</span>
                                    <span
                                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${m.classification === "Reusable" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}
                                    >
                                      {m.classification}
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-400 flex-shrink-0">
                                    {m.types.length} type{m.types.length === 1 ? "" : "s"}
                                  </span>
                                </div>
                                {m.types.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {m.types.map((t) => (
                                      <span
                                        key={t.id}
                                        className="inline-flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1"
                                      >
                                        <Package className="w-3 h-3 text-teal-600" />
                                        <span className="font-medium text-gray-700">{t.name}</span>
                                        {t.dimensions.map((d, di) => (
                                          <span key={di} className="text-gray-400">
                                            {[d.value, d.unit, d.kind].filter(Boolean).join(" ")}
                                          </span>
                                        ))}
                                        {t.sku && (
                                          <span className="text-[10px] tracking-wide text-gray-400">{t.sku}</span>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h2 className="text-base font-semibold text-gray-900">
                {editing ? "Edit" : "Add"} Material Category
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Category Name<span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Electrical"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  rows={2}
                  placeholder="Brief description of materials in this category"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Colour
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.map(({ label, value }) => {
                    const cls = COLOR_CLASSES[value];
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, color: value }))}
                        className={`px-2.5 py-1 text-xs rounded-full font-medium border-2 transition-all ${cls.bg} ${cls.text} ${form.color === value ? "border-teal-500 ring-2 ring-teal-200" : "border-transparent"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <FolderOpen className="w-4 h-4 text-gray-500" />
                    Materials under this category
                  </div>
                  <button
                    type="button"
                    onClick={addMaterial}
                    className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Material
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Each material is classified Consumable (used up) or Reusable
                  (returned to store), and can have as many types (variants)
                  as needed — each type carries measurable dimensions.
                </p>

                <div className="space-y-3">
                  {materials.map((m) => (
                    <div key={m.key} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/60">
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Material Name<span className="text-red-500">*</span>
                          </label>
                          <input
                            value={m.name}
                            onChange={(e) => updateMaterialRow(m.key, { name: e.target.value })}
                            placeholder="e.g. Granite Tiles"
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                          />
                        </div>
                        <div className="w-40">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Classification
                          </label>
                          <select
                            value={m.classification}
                            onChange={(e) =>
                              updateMaterialRow(m.key, {
                                classification: e.target.value === "Reusable" ? "Reusable" : "Consumable",
                              })
                            }
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                          >
                            <option value="Consumable">Consumable</option>
                            <option value="Reusable">Reusable</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => addType(m.key)}
                          className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap py-2"
                        >
                          <Plus className="w-3.5 h-3.5" /> Type
                        </button>
                        <button
                          type="button"
                          onClick={() => removeMaterial(m.key)}
                          title="Remove material"
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {m.types.length > 0 && (
                        <div className="space-y-2 pl-3 border-l-2 border-gray-200">
                          {m.types.map((t) => (
                            <div key={t.key} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  value={t.name}
                                  onChange={(e) =>
                                    updateTypeRow(m.key, t.key, { name: e.target.value })
                                  }
                                  placeholder="Type name (e.g. Wall)"
                                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                />
                                <input
                                  value={t.sku}
                                  onChange={(e) =>
                                    updateTypeRow(m.key, t.key, { sku: e.target.value })
                                  }
                                  placeholder="SKU (e.g. GT-W-600600)"
                                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => addDimension(m.key, t.key)}
                                  className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Dimension
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeType(m.key, t.key)}
                                  title="Remove type"
                                  className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              {t.dimensions.map((d) => (
                                <div key={d.key} className="flex items-center gap-2">
                                  <select
                                    value={d.kind}
                                    onChange={(e) =>
                                      updateDimensionRow(m.key, t.key, d.key, { kind: e.target.value })
                                    }
                                    className="w-32 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                                  >
                                    {DIMENSION_KINDS.map((k) => (
                                      <option key={k} value={k}>{k}</option>
                                    ))}
                                  </select>
                                  <input
                                    type="number"
                                    value={d.value}
                                    onChange={(e) =>
                                      updateDimensionRow(m.key, t.key, d.key, { value: e.target.value })
                                    }
                                    placeholder="Value"
                                    className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                                  <select
                                    value={d.unit}
                                    onChange={(e) =>
                                      updateDimensionRow(m.key, t.key, d.key, { unit: e.target.value })
                                    }
                                    className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                                  >
                                    <option value="">— unit —</option>
                                    {DIMENSION_UNITS.map((u) => (
                                      <option key={u} value={u}>{u}</option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => removeDimension(m.key, t.key, d.key)}
                                    title="Remove dimension"
                                    className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {materials.length === 0 && (
                    <button
                      type="button"
                      onClick={addMaterial}
                      className="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:text-teal-700 hover:border-teal-300"
                    >
                      + Add a material
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl disabled:opacity-60"
              >
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">
              Delete Category?
            </h2>
            <p className="text-sm text-gray-600">
              Remove <span className="font-semibold">{deleteTarget.name}</span>?
              Its {deleteTarget.materials.length} material
              {deleteTarget.materials.length === 1 ? "" : "s"} and all their
              types will be removed too.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Config Page ─────────────────────────────────────────────────────────
export function StorefrontConfigPage() {
  // Honours ?tab= so other pages can deep-link to a specific panel — the
  // dashboard's "View all stores" link needs to land on Stores, not Levels.
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [tab, setTab] = useState<
    "levels" | "stores" | "thresholds" | "units" | "categories" | "numbering"
  >(() =>
    (
      ["levels", "stores", "thresholds", "units", "categories", "numbering"] as const
    ).includes(requestedTab as any)
      ? (requestedTab as "stores")
      : "levels",
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center">
          <Settings className="w-5 h-5 text-teal-700" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Storefront Settings
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage store hierarchy, stock thresholds and units of measurement
            for the inventory system
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 flex-wrap">
        {([
          ["levels", "Store Levels", <Layers key="l" className="w-4 h-4" />],
          ["stores", "Stores", <Store key="st" className="w-4 h-4" />],
          ["thresholds", "Stock Thresholds", <Settings key="s" className="w-4 h-4" />],
          ["units", "Units of Measurement", <Ruler key="r" className="w-4 h-4" />],
          ["categories", "Material Categories", <Tag key="t" className="w-4 h-4" />],
          ["numbering", "Module Numbering", <Hash key="n" className="w-4 h-4" />],
        ] as const).map(([key, label, icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? "border-teal-600 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {icon} {label}
          </button>
        ))}
      </div>

      {tab === "levels" && <StoreLevelsPanel />}
      {tab === "stores" && <StoresPanel />}
      {tab === "thresholds" && <StockThresholdsPanel />}
      {tab === "units" && <UnitsOfMeasurementPanel />}
      {tab === "categories" && <MaterialCategoriesPanel />}
      {/* Shared panel. The local copy filtered with `cfg.module.match(/^Storefront/)`
          and the Storefront sequences are GeneralStore, StockTransfer,
          MaterialReturn and StockMovement — none of which start with
          "Storefront" — so the tab rendered empty and nothing could be
          configured. The shared panel selects by the sequence's `app`. */}
      {tab === "numbering" && (
        <NumberingConfigPanel app="storefront" accent="teal" />
      )}
    </div>
  );
}
