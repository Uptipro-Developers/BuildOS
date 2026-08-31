import { useState, useEffect, useRef, Fragment } from "react";
import { exportCSV } from "../../utils/exportCSV";
import {
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getStores,
  Store,
  DIMENSION_UNITS,
} from "../../api/materials";
import { getReferenceData } from "../../api/reference-data";
import {
  getMaterialCategories,
  addMaterialsToCategory,
  MaterialCategoryRecord,
  MaterialCatalogRowRecord,
} from "../../api/admin-extras";
import {
  MaterialsBuilder,
  findIncompleteMaterialRow,
  materialsToPayload,
  blankMaterial,
  type MaterialFormRow,
} from "../../components/MaterialsBuilder";
import { toast } from "sonner";
import {
  getCurrencySymbol,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";
import { stockStatusFor } from "../../utils/stockThresholds";
import {
  Plus,
  Search,
  Download,
  Filter,
  AlertTriangle,
  Pencil,
  Trash2,
  ShoppingCart,
  CheckCircle,
  X,
  RefreshCw,
  ArrowRightLeft,
  Package,
} from "lucide-react";

type MaterialStatus = "In Stock" | "Low Stock" | "Out of Stock";
type MaterialType = "Consumable" | "Reusable";
type AllocationStatus = "Available" | "Allocated" | "Under Maintenance";

interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  totalQty: number;
  availableQty: number;
  reservedQty: number;
  unitCost: number;
  reorderLevel: number;
  materialType: MaterialType;
  allocationStatus?: AllocationStatus;
  allocatedTo?: string;
  allocatedProject?: string;
  condition?: string;
  storeId?: string | null;
  storeName?: string | null;
  createdAt?: string;
}

const BLANK: Omit<Material, "id"> = {
  name: "",
  category: "",
  unit: "Units",
  totalQty: 0,
  availableQty: 0,
  reservedQty: 0,
  unitCost: 0,
  reorderLevel: 0,
  storeId: null,
  storeName: null,
  materialType: "Consumable",
};

/**
 * The register spans every store, so no single store's configured thresholds
 * apply here — the material's own reorder level is the line. The shared helper
 * keeps that rule identical to the per-store screens.
 */
function getStatus(m: Material): MaterialStatus {
  return stockStatusFor({ qty: m.availableQty, reorderLevel: m.reorderLevel });
}

const STATUS_STYLE: Record<MaterialStatus, string> = {
  "In Stock": "bg-green-50 text-green-700",
  "Low Stock": "bg-yellow-50 text-yellow-700",
  "Out of Stock": "bg-red-50 text-red-700",
};

const ALLOC_STYLE: Record<AllocationStatus, string> = {
  Available: "bg-green-100 text-green-700",
  Allocated: "bg-blue-100 text-blue-700",
  "Under Maintenance": "bg-orange-100 text-orange-700",
};

// ── Allocation Tracking Modal ─────────────────────────────────────────────────
function TrackModal({
  material,
  projectOptions,
  onClose,
  onSave,
}: {
  material: Material;
  projectOptions: string[];
  onClose: () => void;
  onSave: (updated: Partial<Material>) => void;
}) {
  const [allocationStatus, setAllocationStatus] = useState<AllocationStatus>(
    material.allocationStatus ?? "Available",
  );
  const [allocatedTo, setAllocatedTo] = useState(material.allocatedTo ?? "");
  const [allocatedProject, setAllocatedProject] = useState(
    material.allocatedProject ?? "",
  );
  const [condition, setCondition] = useState(material.condition ?? "Good");

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Track Reusable Item
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {material.name} — {material.id}
            </p>
          </div>
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
              Allocation Status
            </label>
            <div className="flex gap-2">
              {(
                [
                  "Available",
                  "Allocated",
                  "Under Maintenance",
                ] as AllocationStatus[]
              ).map((s) => (
                <button
                  key={s}
                  onClick={() => setAllocationStatus(s)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border-2 transition-all ${allocationStatus === s ? `${ALLOC_STYLE[s]} border-current` : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          {allocationStatus === "Allocated" && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Allocated To (Person / Team)
                </label>
                <input
                  value={allocatedTo}
                  onChange={(e) => setAllocatedTo(e.target.value)}
                  placeholder="e.g. Block A Site Team"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Linked Project
                </label>
                <select
                  value={allocatedProject}
                  onChange={(e) => setAllocatedProject(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="">— None —</option>
                  {projectOptions.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Condition
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option>Good</option>
              <option>Fair</option>
              <option>Needs Servicing</option>
              <option>Damaged</option>
            </select>
          </div>
          {allocationStatus === "Available" &&
            material.allocationStatus === "Allocated" && (
              <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-start gap-2">
                <RefreshCw className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-green-700">
                  This item will be marked as <strong>returned to store</strong>{" "}
                  and available for re-allocation.
                </p>
              </div>
            )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave({
                allocationStatus,
                allocatedTo:
                  allocationStatus === "Allocated" ? allocatedTo : undefined,
                allocatedProject:
                  allocationStatus === "Allocated"
                    ? allocatedProject
                    : undefined,
                condition,
              });
              onClose();
            }}
            className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl"
          >
            {allocationStatus === "Available" &&
              material.allocationStatus === "Allocated"
              ? "Confirm Return"
              : "Save Status"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Material (catalogue-aware stock entry) ────────────────────────────────
// Searches by category rather than by catalogue item — pick a category to
// see the materials already under it (read-only; editing their stock lives
// on the main table's per-row Edit action), then add new materials to that
// same category using the same builder Storefront Config uses. This only
// ever adds rows; every material already under the category (which may
// carry real stock) is left completely untouched.
function AddMaterialModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (materials: MaterialCatalogRowRecord[]) => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<MaterialCategoryRecord[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategoryRecord | null>(null);
  const [materials, setMaterials] = useState<MaterialFormRow[]>([blankMaterial()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMaterialCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoadingCategories(false));
  }, []);

  const q = query.trim().toLowerCase();
  const results = q ? categories.filter((c) => c.name.toLowerCase().includes(q)) : [];

  function pickCategory(c: MaterialCategoryRecord) {
    setSelectedCategory(c);
    setQuery("");
  }

  function changeCategory() {
    setSelectedCategory(null);
    setMaterials([blankMaterial()]);
  }

  const canSave = Boolean(selectedCategory) && !saving;

  async function save() {
    if (!selectedCategory) return;
    const incomplete = findIncompleteMaterialRow(materials);
    if (incomplete) {
      toast.error(incomplete);
      return;
    }
    const payload = materialsToPayload(materials);
    if (payload.length === 0) {
      toast.error("Add at least one material before saving.");
      return;
    }
    setSaving(true);
    try {
      const updated = await addMaterialsToCategory(selectedCategory.id, { materials: payload });
      onSaved(updated.materials);
      toast.success(`Added new materials to "${selectedCategory.name}".`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add materials.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add Material</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Search a category, then add new materials under it.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {!selectedCategory ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Search Category
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by category name…"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              {query.trim() ? (
                <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {loadingCategories ? (
                    <p className="px-3 py-2 text-xs text-gray-400">Loading categories…</p>
                  ) : results.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-red-500">
                      No matching category found for "{query.trim()}".
                    </p>
                  ) : (
                    results.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => pickCategory(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-teal-50 border-b border-gray-100 last:border-0"
                      >
                        <span className="font-medium text-gray-900">{c.name}</span>{" "}
                        <span className="text-xs text-gray-400">
                          {c.materials.length} material{c.materials.length === 1 ? "" : "s"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic mt-2">
                  Search and pick a category to see its materials and add new ones.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">Category</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedCategory.name}</p>
                </div>
                <button
                  type="button"
                  onClick={changeCategory}
                  className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800"
                >
                  Change category
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Materials under {selectedCategory.name}
                </label>
                {selectedCategory.materials.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No materials added yet.</p>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 text-gray-400 uppercase tracking-wide">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Name</th>
                          <th className="px-3 py-2 text-left font-medium">Classification</th>
                          <th className="px-3 py-2 text-left font-medium">SKU</th>
                          <th className="px-3 py-2 text-left font-medium">Dimension</th>
                          <th className="px-3 py-2 text-right font-medium">Total Qty</th>
                          <th className="px-3 py-2 text-right font-medium">Available</th>
                          <th className="px-3 py-2 text-right font-medium">Reserved</th>
                          <th className="px-3 py-2 text-right font-medium">Unit Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedCategory.materials.map((row) => (
                          <tr key={row.id}>
                            <td className="px-3 py-2 text-gray-900 font-medium">{row.name}</td>
                            <td className="px-3 py-2 text-gray-600">{row.classification}</td>
                            <td className="px-3 py-2 text-gray-600">{row.sku || "—"}</td>
                            <td className="px-3 py-2 text-gray-600">
                              {[row.value, row.unit, row.kind].filter(Boolean).join(" ") || "—"}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              {formatNumberByGeneralSettings(row.totalQty)}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              {formatNumberByGeneralSettings(row.availableQty)}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              {formatNumberByGeneralSettings(row.reservedQty)}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              {getCurrencySymbol()}
                              {formatNumberByGeneralSettings(row.unitCost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <MaterialsBuilder
                materials={materials}
                onChange={setMaterials}
                title={`Add materials to ${selectedCategory.name}`}
              />
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void save()}
            disabled={!canSave}
            title={canSave ? undefined : "Search and pick a category first"}
            className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Add Material"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AllMaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<MaterialStatus | "All">(
    "All",
  );
  const [typeFilter, setTypeFilter] = useState<MaterialType | "All">("All");
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Material | null>(null);
  const [form, setForm] = useState<Omit<Material, "id">>({ ...BLANK });
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);
  const [procurementTarget, setProcurementTarget] = useState<Material | null>(
    null,
  );
  const [procurementQty, setProcurementQty] = useState("");
  const [sentToProcurement, setSentToProcurement] = useState<Set<string>>(
    new Set(),
  );
  const [trackTarget, setTrackTarget] = useState<Material | null>(null);
  const [projectOptions, setProjectOptions] = useState<string[]>([]);
  /**
   * Categories as configured under Storefront → Settings → Material Categories.
   * The filter used to be built from whatever categories happened to appear on
   * the loaded materials, so a configured category with no material yet was not
   * filterable and a stale free-typed one still showed up.
   */
  const [configuredCategories, setConfiguredCategories] = useState<string[]>(
    [],
  );
  const [stores, setStores] = useState<Store[]>([]);

  const toMaterial = (m: any): Material => ({
    id: m.id,
    name: m.name ?? "",
    category: m.category ?? "",
    unit: m.unit ?? "Units",
    totalQty: Number(m.totalQty ?? 0),
    availableQty: Number(m.availableQty ?? 0),
    reservedQty: Number(m.reservedQty ?? 0),
    unitCost: Number(m.unitCost ?? 0),
    reorderLevel: Number(m.reorderLevel ?? 0),
    materialType: m.materialType === "Reusable" ? "Reusable" : "Consumable",
    allocationStatus:
      m.allocationStatus === "Allocated" ||
        m.allocationStatus === "Under Maintenance"
        ? m.allocationStatus
        : "Available",
    allocatedTo: m.allocatedTo,
    allocatedProject: m.allocatedProject,
    condition: m.condition,
    storeId: m.storeId ?? null,
    storeName: m.storeName ?? null,
    createdAt: m.createdAt,
  });

  useEffect(() => {
    getMaterialCategories()
      .then((list) =>
        setConfiguredCategories(
          list.map((c) => c.name).filter(Boolean),
        ),
      )
      .catch(() => setConfiguredCategories([]));
    getStores()
      .then(setStores)
      .catch(() => setStores([]));
  }, []);

  useEffect(() => {
    Promise.all([getMaterials(), getReferenceData()])
      .then(([materialData, refs]) => {
        setMaterials(materialData.map(toMaterial));
        setProjectOptions(refs.projects.map((p) => p.name));
      })
      .catch((err: unknown) =>
        toast.error(
          err instanceof Error ? err.message : "Failed to load materials.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <div className="p-8 text-center text-gray-400">Loading...</div>;

  const filtered = materials
    .filter((m) => {
      const q = search.toLowerCase();
      const matchSearch =
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q);
      const matchCat = catFilter === "All" || m.category === catFilter;
      const matchStatus = statusFilter === "All" || getStatus(m) === statusFilter;
      const matchType = typeFilter === "All" || m.materialType === typeFilter;
      return matchSearch && matchCat && matchStatus && matchType;
    })
    // Newest first — the sequential display number below (001, 002, …)
    // reads top-to-bottom against this order, not the raw database id.
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());

  function openEdit(m: Material) {
    setEditTarget(m);
    const { id: _id, ...rest } = m;
    setForm(rest);
    setShowModal(true);
  }
  // The modal used to close before the request resolved, and failures only hit
  // console.error — so a rejected save looked like it had worked and the material
  // silently reappeared unchanged on the next load.
  async function save() {
    const name = form.name;
    const payload = form;
    try {
      if (editTarget) {
        const updated = await updateMaterial(editTarget.id, payload);
        setMaterials((prev) =>
          prev.map((m) => (m.id === updated.id ? toMaterial(updated) : m)),
        );
        toast.success(`"${name}" updated.`);
      } else {
        const newMat = await createMaterial(payload);
        setMaterials((prev) => [...prev, toMaterial(newMat)]);
        toast.success(`"${name}" added.`);
      }
      setShowModal(false);
      setForm({ ...BLANK });
      setEditTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save the material.",
      );
    }
  }

  async function doDelete() {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    try {
      await deleteMaterial(id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      toast.success(`"${name}" deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to delete "${name}".`,
      );
    }
  }
  function handleExportCSV() {
    const rows = [
      [
        "Material ID",
        "Name",
        "Category",
        "Type",
        "Unit",
        "Total Qty",
        "Available Qty",
        "Unit Cost",
        "Status",
      ],
      ...filtered.map((m) => [
        m.id,
        m.name,
        m.category,
        m.materialType,
        m.unit,
        m.totalQty,
        m.availableQty,
        m.unitCost,
        getStatus(m),
      ]),
    ];
    // Hands off to the shared helper: the previous inline version built a
    // detached `data:text/csv` anchor, which Firefox and Safari ignore, declared
    // no charset (mangling ₦ and accents) and had no escaping, so any cell
    // containing a comma silently shifted every later column.
    exportCSV("materials", rows[0] as string[], rows.slice(1));
  }

  const low = materials.filter((m) => getStatus(m) !== "In Stock").length;
  const reusable = materials.filter((m) => m.materialType === "Reusable");
  const allocated = reusable.filter(
    (m) => m.allocationStatus === "Allocated",
  ).length;
  // The configured list drives the filter. Any category still carried by a
  // material but no longer configured is appended so those rows stay reachable.
  const editableCategories = Array.from(
    new Set([
      ...configuredCategories,
      ...materials.map((m) => m.category).filter(Boolean),
    ]),
  );
  const categories = ["All", ...editableCategories];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            All Materials
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Complete inventory catalogue across all stores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm px-3 py-2 rounded-xl hover:bg-gray-50"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm px-4 py-2 rounded-xl"
          >
            <Plus className="w-4 h-4" /> Add Material
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">{materials.length}</p>
          <p className="text-xs text-gray-500">Total SKUs</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-yellow-600">{low}</p>
          <p className="text-xs text-gray-500">Low / Out of Stock</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-blue-600">{reusable.length}</p>
          <p className="text-xs text-gray-500">Reusable Items</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-indigo-600">{allocated}</p>
          <p className="text-xs text-gray-500">Currently Allocated</p>
        </div>
      </div>

      {low > 0 && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">
              {low} material{low > 1 ? "s" : ""}
            </span>{" "}
            below reorder level or out of stock — consider raising a procurement
            request.
          </p>
        </div>
      )}

      {/* Type filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
          Type:
        </span>
        {(["All", "Consumable", "Reusable"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 text-xs rounded-lg border font-medium flex items-center gap-1.5 ${typeFilter === t ? "bg-teal-700 text-white border-teal-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
          >
            {t === "Reusable" && <RefreshCw className="w-3 h-3" />}
            {t === "Consumable" && <Package className="w-3 h-3" />}
            {t}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Search material ID, name, category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`px-2.5 py-1.5 text-xs rounded-lg border font-medium ${catFilter === c ? "bg-teal-700 text-white border-teal-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {(["All", "In Stock", "Low Stock", "Out of Stock"] as const).map(
            (s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1.5 text-xs rounded-lg border font-medium ${statusFilter === s ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
              >
                {s}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Table. Scrolls horizontally rather than clipping: at ten columns the
          trailing actions cell was being cut off by the wrapper, which is what
          made the Edit and Archive buttons unreachable on smaller screens. */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Material ID</th>
              <th className="px-4 py-3 text-left font-medium">Material Name</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Store</th>
              <th className="px-4 py-3 text-left font-medium">Unit</th>
              <th className="px-4 py-3 text-right font-medium">Total Qty</th>
              <th className="px-4 py-3 text-right font-medium">Available</th>
              <th className="px-4 py-3 text-right font-medium">Reserved</th>
              <th className="px-4 py-3 text-right font-medium">Unit Cost</th>
              <th className="px-4 py-3 text-left font-medium">Stock Status</th>
              <th className="px-4 py-3 text-left font-medium">Allocation</th>
              <th className="px-4 py-3 w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={13}
                  className="px-4 py-8 text-center text-gray-400 text-sm"
                >
                  No materials found.
                </td>
              </tr>
            )}
            {filtered.map((m, index) => {
              const status = getStatus(m);
              const displayId = String(index + 1).padStart(3, "0");
              return (
                <Fragment key={m.id}>
                  <tr className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {displayId}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <span>{m.name}</span>
                      {m.allocatedTo && (
                        <p className="text-xs text-blue-500 mt-0.5">
                          → {m.allocatedTo}
                          {m.allocatedProject ? ` · ${m.allocatedProject}` : ""}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit ${m.materialType === "Reusable" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"}`}
                      >
                        {m.materialType === "Reusable" ? (
                          <RefreshCw className="w-2.5 h-2.5" />
                        ) : (
                          <Package className="w-2.5 h-2.5" />
                        )}
                        {m.materialType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.category}</td>
                    <td className="px-4 py-3 text-gray-600">{m.storeName || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{m.unit}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatNumberByGeneralSettings(m.totalQty)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatNumberByGeneralSettings(m.availableQty)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatNumberByGeneralSettings(m.reservedQty)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {getCurrencySymbol()}
                      {formatNumberByGeneralSettings(m.unitCost)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[status]}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {m.materialType === "Reusable" && m.allocationStatus ? (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${ALLOC_STYLE[m.allocationStatus]}`}
                        >
                          {m.allocationStatus}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {m.materialType === "Reusable" && (
                          <button
                            onClick={() => setTrackTarget(m)}
                            className="p-1 text-indigo-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
                            title="Track / Return"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(status === "Low Stock" ||
                          status === "Out of Stock") && (
                            <button
                              onClick={() => {
                                setProcurementTarget(m);
                                setProcurementQty("");
                              }}
                              className={`p-1 rounded ${sentToProcurement.has(m.id) ? "text-green-500" : "text-amber-500 hover:text-amber-700 hover:bg-amber-50"}`}
                              title={
                                sentToProcurement.has(m.id)
                                  ? "Sent to Procurement"
                                  : "Send for Procurement"
                              }
                            >
                              {sentToProcurement.has(m.id) ? (
                                <CheckCircle className="w-3.5 h-3.5" />
                              ) : (
                                <ShoppingCart className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        <button
                          onClick={() => openEdit(m)}
                          className="p-1 text-gray-400 hover:text-teal-600 rounded hover:bg-teal-50"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(m)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">
        Showing {filtered.length} of {materials.length} materials
      </p>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editTarget ? "Edit Material" : "Add Material"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="">Select category</option>
                    {editableCategories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Material Type
                  </label>
                  <select
                    value={form.materialType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        materialType: e.target.value as MaterialType,
                      })
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option>Consumable</option>
                    <option>Reusable</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Store
                </label>
                <select
                  value={form.storeId ?? ""}
                  onChange={(e) => {
                    const store = stores.find((s) => s.id === e.target.value);
                    setForm({
                      ...form,
                      storeId: store?.id ?? null,
                      storeName: store?.name ?? null,
                    });
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="">— Not attached to a store —</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Material Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Unit of Measure
                </label>
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="">— unit —</option>
                  {/* A material saved before this list existed (or with a custom
                      unit) still needs to show its real value — add it as its
                      own option rather than silently rendering blank. */}
                  {form.unit && !DIMENSION_UNITS.includes(form.unit) && (
                    <option value={form.unit}>{form.unit}</option>
                  )}
                  {DIMENSION_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              {(
                [
                  ["totalQty", "Total Quantity", "number"],
                  ["availableQty", "Available Qty", "number"],
                  ["reservedQty", "Reserved Qty", "number"],
                  ["unitCost", `Unit Cost (${getCurrencySymbol()})`, "number"],
                  ["reorderLevel", "Reorder Level", "number"],
                ] as const
              ).map(([key, label, type]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {label}
                  </label>
                  <input
                    type={type}
                    value={(form as Record<string, unknown>)[key] as string}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [key]:
                          type === "number"
                            ? Number(e.target.value)
                            : e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              ))}
              {form.materialType === "Reusable" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Condition
                  </label>
                  <select
                    value={form.condition ?? "Good"}
                    onChange={(e) =>
                      setForm({ ...form, condition: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option>Good</option>
                    <option>Fair</option>
                    <option>Needs Servicing</option>
                    <option>Damaged</option>
                  </select>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void save()}
                className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl"
              >
                {editTarget ? "Save Changes" : "Add Material"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">
              Delete Material?
            </h2>
            <p className="text-sm text-gray-600">
              Remove <span className="font-medium">{deleteTarget.name}</span>{" "}
              from the catalogue? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void doDelete()}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send for Procurement Modal */}
      {procurementTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Send for Procurement
              </h2>
              <button
                onClick={() => setProcurementTarget(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {getStatus(procurementTarget)}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  <span className="font-medium">{procurementTarget.name}</span>{" "}
                  — {procurementTarget.availableQty} {procurementTarget.unit}{" "}
                  available, reorder level {procurementTarget.reorderLevel}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Quantity to Procure <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={procurementQty}
                onChange={(e) => setProcurementQty(e.target.value)}
                placeholder="Enter quantity…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <p className="text-xs text-gray-500">
              A procurement request will be raised and sent to the Procurement
              team for sourcing.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setProcurementTarget(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={!procurementQty || Number(procurementQty) <= 0}
                onClick={() => {
                  setSentToProcurement(
                    (prev) => new Set([...prev, procurementTarget.id]),
                  );
                  setProcurementTarget(null);
                }}
                className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" /> Send to Procurement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Track Reusable Modal */}
      {trackTarget && (
        <TrackModal
          material={trackTarget}
          projectOptions={projectOptions}
          onClose={() => setTrackTarget(null)}
          onSave={(updated) => {
            setMaterials((prev) =>
              prev.map((m) =>
                m.id === trackTarget.id ? { ...m, ...updated } : m,
              ),
            );
            setTrackTarget(null);
          }}
        />
      )}

      {/* Add Material (catalogue-aware stock entry) */}
      {showAddModal && (
        <AddMaterialModal
          onClose={() => setShowAddModal(false)}
          onSaved={(updatedList) => {
            setMaterials((prev) => {
              let next = prev;
              for (const updated of updatedList) {
                const idx = next.findIndex((m) => m.id === updated.id);
                next = idx === -1 ? [...next, toMaterial(updated)] : next.map((m, i) => (i === idx ? toMaterial(updated) : m));
              }
              return next;
            });
          }}
        />
      )}
    </div>
  );
}
