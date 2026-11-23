import { useState, useEffect, useRef, Fragment } from "react";
import { exportCSV } from "../../utils/exportCSV";
import {
  getMaterials,
  createMaterial,
  submitMaterialAmendment,
  deleteMaterial,
  getStores,
  getStoreItems,
  createStoreItem,
  createMaterialRequest,
  getMaterialRequests,
  Store,
  type StoreItem,
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
  isMaterialsComplete,
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
import { useAuthUser } from "../../utils/useAuthUser";
import { ReferenceLink } from "../../components/ReferencePreview";
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
  ChevronDown,
  X,
  RefreshCw,
  ArrowRightLeft,
  Package,
  Upload,
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
  imageUrl?: string | null;
  sku?: string | null;
  dimensions: { kind: string; value?: number | string | null; unit?: string | null }[];
  effectiveStatus?: MaterialStatus;
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
  dimensions: [],
  imageUrl: null,
};

/**
 * The register spans every store, so no single store's configured thresholds
 * apply here — the material's own reorder level is the line. The shared helper
 * keeps that rule identical to the per-store screens.
 */
function getStatus(m: Material): MaterialStatus {
  if (m.effectiveStatus) return m.effectiveStatus;
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
  const categoryPickerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [categories, setCategories] = useState<MaterialCategoryRecord[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategoryRecord | null>(null);
  const [materials, setMaterials] = useState<MaterialFormRow[]>([blankMaterial()]);
  const [stores, setStores] = useState<Store[]>([]);
  const [stockByMaterial, setStockByMaterial] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMaterialCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoadingCategories(false));
  }, []);
  useEffect(() => {
    getStores().then(setStores).catch(() => setStores([]));
  }, []);

  const q = query.trim().toLowerCase();
  const results = q
    ? categories.filter((c) => c.name.toLowerCase().includes(q))
    : categories;

  function pickCategory(c: MaterialCategoryRecord) {
    setSelectedCategory(c);
    setQuery("");
    setCategoryPickerOpen(false);
  }

  function changeCategory() {
    setSelectedCategory(null);
    setMaterials([blankMaterial()]);
  }

  function updateMaterialRows(next: MaterialFormRow[]) {
    setMaterials(next.map((material) => ({
      ...material,
      items: [{
        ...(material.items[0] ?? blankMaterial().items[0]),
        name: material.name,
      }],
    })));
  }

  function generatedSku(materialIndex: number) {
    if (!selectedCategory) return "";
    const number = selectedCategory.skuNext + materialIndex;
    return `${selectedCategory.skuPrefix}${String(number).padStart(Math.max(3, String(selectedCategory.skuStart).length), "0")}`;
  }

  const materialsComplete = isMaterialsComplete(materials);
  const hasAtLeastOneMaterial = materials.some((m) => m.name.trim());
  const canSave =
    Boolean(selectedCategory) && !saving && materialsComplete && hasAtLeastOneMaterial;

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
      for (const material of materials) {
        const created = updated.materials.find((row) => row.name.trim().toLowerCase() === material.name.trim().toLowerCase());
        if (!created) continue;
        const unit = created.unit || created.dimensions?.[0]?.unit || "Units";
        await Promise.all(Object.entries(stockByMaterial[material.key] ?? {})
          .map(([storeId, qty]) => ({ storeId, qty: Number(qty) }))
          .filter((entry) => Number.isFinite(entry.qty) && entry.qty > 0)
          .map((entry) => createStoreItem({
            storeId: entry.storeId,
            materialName: created.name,
            category: selectedCategory.name,
            unit,
            qty: entry.qty,
            openingQty: entry.qty,
            unitCost: created.unitCost ?? 0,
            reorderLevel: created.reorderLevel ?? 0,
          })));
      }
      onSaved(updated.materials);
      toast.success(`Added new materials under "${selectedCategory.name}".`);
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
            <div
              ref={categoryPickerRef}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setCategoryPickerOpen(false);
                }
              }}
            >
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Category
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchRef}
                  value={query}
                  onFocus={() => setCategoryPickerOpen(true)}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setCategoryPickerOpen(true);
                  }}
                  placeholder="Search or select a category…"
                  role="combobox"
                  aria-expanded={categoryPickerOpen}
                  aria-controls="material-category-options"
                  className="w-full pl-9 pr-10 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="button"
                  aria-label="Show categories"
                  onClick={() => {
                    setCategoryPickerOpen((open) => !open);
                    searchRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${categoryPickerOpen ? "rotate-180" : ""}`} />
                </button>
              </div>
              {categoryPickerOpen && (
                <div
                  id="material-category-options"
                  role="listbox"
                  className="mt-1 border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-white shadow-lg"
                >
                  {loadingCategories ? (
                    <p className="px-3 py-2 text-xs text-gray-400">Loading categories…</p>
                  ) : results.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-red-500">
                      No matching category found{query.trim() ? ` for "${query.trim()}"` : ""}.
                    </p>
                  ) : (
                    results.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        role="option"
                        aria-selected={false}
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
              )}
              <p className="text-xs text-gray-400 italic mt-2">
                Open the dropdown to see every category, or type to filter the list.
              </p>
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

              <MaterialsBuilder
                materials={materials}
                onChange={updateMaterialRows}
                title={`Add materials to ${selectedCategory.name}`}
                materialOnly
                skuPreview={generatedSku}
              />

              <section className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-700">Opening stock distribution</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Enter how many units of each new material belong to each store. The organization total is calculated automatically.</p>
                </div>
                <div className="p-3 space-y-3">
                  {materials.filter((material) => material.name.trim()).map((material) => (
                    <div key={material.key} className="rounded-lg border border-gray-100 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-800">{material.name}</p>
                        <span className="text-[11px] text-blue-700">Total: {Object.values(stockByMaterial[material.key] ?? {}).reduce((sum, qty) => sum + (Number(qty) || 0), 0)}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {stores.map((store) => <label key={store.id} className="text-[11px] text-gray-600">
                          {store.name}
                          <input type="number" min="0" step="any" value={stockByMaterial[material.key]?.[store.id] ?? ""}
                            onChange={(event) => setStockByMaterial((current) => ({ ...current, [material.key]: { ...(current[material.key] ?? {}), [store.id]: event.target.value } }))}
                            placeholder="0" className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
                        </label>)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

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
                          <th className="px-3 py-2 text-right font-medium">Reorder Level</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedCategory.materials.map((row) => (
                          <tr key={row.id}>
                            <td className="px-3 py-2 text-gray-900 font-medium">
                              <span>{row.name}</span>
                              {row.dimensions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {row.dimensions.map((dimension, index) => (
                                    <span key={`${dimension.kind}-${index}`} className="text-[10px] font-normal text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                                      {[dimension.value, dimension.unit, dimension.kind].filter((value) => value !== null && value !== undefined && value !== "").join(" ")}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-gray-600">{row.classification}</td>
                            <td className="px-3 py-2 text-gray-600">{row.sku || "—"}</td>
                            <td className="px-3 py-2 text-gray-600">
                              {row.dimensions.length
                                ? row.dimensions.map((dimension) => [dimension.value, dimension.unit, dimension.kind].filter(Boolean).join(" ")).join(", ")
                                : "—"}
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
                            <td className="px-3 py-2 text-right text-gray-700">
                              {formatNumberByGeneralSettings(row.reorderLevel)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

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
            title={
              !selectedCategory
                ? "Search and pick a category first"
                : !hasAtLeastOneMaterial
                  ? "Add at least one material before saving"
                  : !materialsComplete
                    ? "Fill in or remove every incomplete material, item and dimension"
                    : undefined
            }
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
  const authUser = useAuthUser();
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
  const [procurementStoreId, setProcurementStoreId] = useState("");
  const [sendingToProcurement, setSendingToProcurement] = useState(false);
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
  const [categoryRecords, setCategoryRecords] = useState<MaterialCategoryRecord[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const importRef = useRef<HTMLInputElement>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [storeQuantities, setStoreQuantities] = useState<Record<string, string>>({});
  const [amendmentReason, setAmendmentReason] = useState("");

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
    imageUrl: m.imageUrl ?? null,
    sku: m.sku ?? null,
    dimensions: Array.isArray(m.dimensions) ? m.dimensions : [],
  });

  useEffect(() => {
    getMaterialCategories()
      .then((list) => {
        setCategoryRecords(list);
        setConfiguredCategories(
          list.map((c) => c.name).filter(Boolean),
        );
      })
      .catch(() => {
        setCategoryRecords([]);
        setConfiguredCategories([]);
      });
    getStores()
      .then(setStores)
      .catch(() => setStores([]));
  }, []);

  useEffect(() => {
    Promise.all([
      getMaterials(),
      getReferenceData(),
      // Request-state decoration should not prevent the inventory itself from
      // loading if this secondary endpoint is temporarily unavailable.
      getMaterialRequests().catch(() => []),
      getStoreItems().catch(() => []),
    ])
      .then(([materialData, refs, materialRequests, loadedStoreItems]) => {
        setStoreItems(loadedStoreItems);
        const severity: Record<MaterialStatus, number> = { "In Stock": 0, "Low Stock": 1, "Out of Stock": 2 };
        const statusByName = new Map<string, MaterialStatus>();
        loadedStoreItems.forEach((item) => {
          const status = stockStatusFor({ qty: item.qty, reorderLevel: item.reorderLevel, outOfStockLevel: item.outOfStockLevel });
          const key = item.materialName.trim().toLowerCase();
          const current = statusByName.get(key);
          if (!current || severity[status] > severity[current]) statusByName.set(key, status);
        });
        setMaterials(materialData.map((row) => {
          const material = toMaterial(row);
          return { ...material, effectiveStatus: statusByName.get(material.name.trim().toLowerCase()) };
        }));
        setProjectOptions(refs.projects.map((p) => p.name));

        const activeRequestMaterialIds = materialRequests.reduce(
          (ids, request) => {
            const status = String(request.status ?? "")
              .trim()
              .toLowerCase()
              .replace(/\s+/g, "_");
            if (["rejected", "fulfilled", "cancelled"].includes(status)) {
              return ids;
            }

            const match = request.notes?.match(
              /^Raised from Storefront All Materials for material (.+)\.$/,
            );
            if (match?.[1]) ids.add(match[1]);
            return ids;
          },
          new Set<string>(),
        );
        setSentToProcurement(activeRequestMaterialIds);
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
    setStoreQuantities(Object.fromEntries(
      stores.map((store) => [store.id, String(storeItems.find((item) => item.storeId === store.id && item.materialName.toLowerCase() === m.name.toLowerCase())?.qty ?? "")]),
    ));
    setAmendmentReason("");
    setShowModal(true);
  }
  // The modal used to close before the request resolved, and failures only hit
  // console.error — so a rejected save looked like it had worked and the material
  // silently reappeared unchanged on the next load.
  async function save() {
    const name = form.name;
    const {
      totalQty: _totalQty, availableQty: _availableQty, reservedQty: _reservedQty,
      storeId: _storeId, storeName: _storeName, effectiveStatus: _effectiveStatus,
      createdAt: _createdAt, ...payload
    } = form;
    try {
      if (editTarget) {
        if (!amendmentReason.trim()) {
          toast.error("Enter a reason for the proposed changes.");
          return;
        }
        const existingItems = storeItems.filter((item) => item.materialName.toLowerCase() === editTarget.name.toLowerCase());
        const currentByStore = new Map(existingItems.map((item) => [item.storeId, Number(item.qty)]));
        const storeChanges = Object.entries(storeQuantities)
          .filter(([, qty]) => qty !== "")
          .map(([storeId, qty]) => ({ storeId, qty: Number(qty) }))
          .filter((entry) => Number.isFinite(entry.qty) && entry.qty >= 0 && entry.qty !== (currentByStore.get(entry.storeId) ?? 0));
        const updated = await submitMaterialAmendment(editTarget.id, {
          materialChanges: payload,
          storeChanges,
          reason: amendmentReason.trim(),
        });
        setMaterials((prev) =>
          // The update response is the unchanged catalogue row plus a pending
          // amendment marker. Its persisted stock cache may predate the live
          // StoreItem rollup returned by GET /materials, so replacing the row
          // here can make the displayed total jump before approval. Preserve
          // the current computed quantities and decorate only the pending state.
          prev.map((m) => (m.id === updated.id
            ? { ...m, amendmentId: updated.amendmentId, amendmentStatus: updated.amendmentStatus }
            : m)),
        );
        toast.success(`Changes to "${name}" were submitted for approval.`);
      } else {
        const newMat = await createMaterial(payload);
        setMaterials((prev) => [...prev, toMaterial(newMat)]);
        toast.success(`"${name}" added.`);
      }
      setShowModal(false);
      setForm({ ...BLANK });
      setEditTarget(null);
      setStoreQuantities({});
      setAmendmentReason("");
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

  /**
   * Persists the replenishment request before showing the material as sent.
   * The old handler only changed `sentToProcurement`, so the success icon was
   * browser-local and neither request screen ever received a record.
   */
  async function sendToProcurement() {
    if (!procurementTarget || sendingToProcurement) return;

    const qty = Number(procurementQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a quantity greater than zero.");
      return;
    }

    const selectedStore = stores.find((store) => store.id === procurementStoreId);
    const storeId = selectedStore?.id || procurementTarget.storeId || undefined;
    const storeName = selectedStore?.name || procurementTarget.storeName || "";
    if (!storeName) {
      toast.error("Choose the store that needs this material.");
      return;
    }

    setSendingToProcurement(true);
    try {
      const created = await createMaterialRequest({
        materialName: procurementTarget.name,
        unit: procurementTarget.unit,
        qty,
        storeId,
        storeName,
        purpose: `Replenish ${procurementTarget.name} after stock fell to ${procurementTarget.availableQty} ${procurementTarget.unit}.`,
        priority:
          getStatus(procurementTarget) === "Out of Stock" ? "High" : "Normal",
        status: "pending",
        requestedBy: authUser.name || authUser.email || "Current User",
        requestDate: new Date().toISOString(),
        notes: `Raised from Storefront All Materials for material ${procurementTarget.id}.`,
      });

      setSentToProcurement((prev) =>
        new Set([...prev, procurementTarget.id]),
      );
      toast.success(
        `Material request ${created.reference || created.id} sent to Procurement.`,
      );
      setProcurementTarget(null);
      setProcurementQty("");
      setProcurementStoreId("");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to send the material request to Procurement.",
      );
    } finally {
      setSendingToProcurement(false);
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
        "Reorder Threshold",
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
        m.reorderLevel,
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

  async function downloadImportTemplate() {
    const XLSX = await import("xlsx");
    const rows = [{
      Category: categoryRecords[0]?.name || "Concrete & Cement",
      "Material Name": "Example material",
      Classification: "Consumable",
      Dimensions: "Length:12:mm;Thickness:18:mm",
      Aliases: "Alternative name|Common name",
    }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Materials");
    XLSX.writeFile(workbook, "buildos-material-import-template.xlsx");
  }

  async function importMaterials(file?: File) {
    if (!file) return;
    setImportErrors([]);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const errors: string[] = [];
      const batches = new Map<string, MaterialFormRow[]>();
      rows.forEach((row, index) => {
        const categoryName = String(row.Category ?? "").trim();
        const materialName = String(row["Material Name"] ?? row.Material ?? "").trim();
        const category = categoryRecords.find((item) => item.name.toLowerCase() === categoryName.toLowerCase());
        if (!category) errors.push(`Row ${index + 2}: category "${categoryName || "blank"}" was not found.`);
        if (!materialName) errors.push(`Row ${index + 2}: Material Name is required.`);
        if (!category || !materialName) return;
        const dimensions = String(row.Dimensions ?? "").split(";").map((entry) => entry.trim()).filter(Boolean).map((entry) => {
          const [kind, value, unit] = entry.split(":").map((part) => part.trim());
          return { key: `import-${index}-${kind}`, kind, customKind: null, value, unit };
        });
        if (dimensions.some((dimension) => !dimension.kind || !dimension.value || !dimension.unit || !Number.isFinite(Number(dimension.value)))) {
          errors.push(`Row ${index + 2}: dimensions must use Type:Value:Unit separated by semicolons.`);
          return;
        }
        const classification = String(row.Classification).toLowerCase() === "reusable" ? "Reusable" : "Consumable";
        const material: MaterialFormRow = {
          key: `import-material-${index}`,
          name: materialName,
          classification,
          items: [{
            key: `import-item-${index}`,
            name: materialName,
            sku: "",
            aliases: String(row.Aliases ?? "").split("|").map((value) => value.trim()).filter(Boolean).join(", "),
            imageUrl: "",
            reorderLevel: "",
            dimensions,
          }],
        };
        batches.set(category.id, [...(batches.get(category.id) ?? []), material]);
      });
      if (errors.length) {
        setImportErrors(errors);
        toast.error(`${errors.slice(0, 3).join(" ")}${errors.length > 3 ? ` (+${errors.length - 3} more)` : ""}`);
        return;
      }
      if (!rows.length) throw new Error("The import file has no material rows.");
      for (const [categoryId, batch] of batches) {
        await addMaterialsToCategory(categoryId, { materials: materialsToPayload(batch) });
      }
      const activeMaterials = await getMaterials();
      setMaterials(activeMaterials.map(toMaterial));
      setImportErrors([]);
      toast.success(`${rows.length} material${rows.length === 1 ? "" : "s"} imported successfully.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not import materials.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
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
          <input
            ref={importRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(event) => void importMaterials(event.target.files?.[0])}
          />
          <button
            onClick={() => void downloadImportTemplate()}
            className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm px-3 py-2 rounded-xl hover:bg-gray-50"
          >
            <Download className="w-4 h-4" /> Template
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm px-3 py-2 rounded-xl hover:bg-gray-50"
          >
            <Upload className="w-4 h-4" /> Import Materials
          </button>
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

      {importErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-red-800">Material import needs corrections</p>
              <ul className="mt-2 space-y-1 text-xs text-red-700 list-disc list-inside">
                {importErrors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            </div>
            <button onClick={() => setImportErrors([])} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

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
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Material ID</th>
              <th className="px-4 py-3 text-left font-medium">Material Name</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Coverage</th>
              <th className="px-4 py-3 text-left font-medium">Unit</th>
              <th className="px-4 py-3 text-right font-medium">Total Qty</th>
              <th className="px-4 py-3 text-right font-medium">Available</th>
              <th className="px-4 py-3 text-right font-medium">Reserved</th>
              <th className="px-4 py-3 text-left font-medium">Stock Threshold</th>
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
                  colSpan={14}
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
                      <div className="flex items-start gap-3">
                        {m.imageUrl ? (
                          <img
                            src={m.imageUrl}
                            alt={`${m.name} material`}
                            className="w-10 h-10 shrink-0 rounded-lg object-cover border border-gray-200 bg-gray-50"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-10 h-10 shrink-0 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center" aria-hidden="true">
                            <Package className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <ReferenceLink reference={m.sku || m.id} className="text-sm font-medium block truncate !text-gray-900 hover:!text-gray-900">{m.name}</ReferenceLink>
                          {m.sku && <ReferenceLink reference={m.sku} className="text-[10px] block mt-0.5 !text-gray-900 hover:!text-gray-900">{m.sku}</ReferenceLink>}
                          {m.dimensions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {m.dimensions.map((dimension, dimensionIndex) => (
                                <span
                                  key={`${dimension.kind}-${dimensionIndex}`}
                                  className="text-[10px] font-normal text-gray-500 bg-gray-100 rounded px-1.5 py-0.5"
                                >
                                  {[dimension.value, dimension.unit, dimension.kind]
                                    .filter((value) => value !== null && value !== undefined && value !== "")
                                    .join(" ")}
                                </span>
                              ))}
                            </div>
                          )}
                          {m.allocatedTo && (
                            <p className="text-xs text-blue-500 mt-0.5">
                              → {m.allocatedTo}
                              {m.allocatedProject ? ` · ${m.allocatedProject}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
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
                    <td className="px-4 py-3 text-gray-600">All stores</td>
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
                    <td className="px-4 py-3 text-left text-xs text-gray-500">
                      Configured per store
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
                                setProcurementStoreId(
                                  m.storeId || stores[0]?.id || "",
                                );
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
              {editTarget && (
                <section className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-700">Stock distribution by store</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Propose store balances here. Existing-balance changes remain pending until approved.</p>
                  </div>
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {stores.map((store) => {
                      const existing = storeItems.find((item) => item.storeId === store.id && item.materialName.toLowerCase() === editTarget.name.toLowerCase());
                      return <label key={store.id} className="rounded-lg border border-gray-100 p-2.5">
                        <span className="block text-xs font-medium text-gray-700 mb-1">{store.name}</span>
                        <input type="number" min="0" step="any" value={storeQuantities[store.id] ?? ""}
                          onChange={(event) => setStoreQuantities((current) => ({ ...current, [store.id]: event.target.value }))}
                          placeholder="0" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                        {existing && <span className="text-[10px] text-amber-600">Changes require approval before affecting stock.</span>}
                      </label>;
                    })}
                  </div>
                  <div className="px-3 py-2 bg-blue-50 text-xs text-blue-800">
                    Proposed organization total: {stores.reduce((sum, store) => sum + (Number(storeQuantities[store.id]) || 0), 0)} {form.unit}. Current stock remains unchanged until approval.
                  </div>
                </section>
              )}
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
              <section className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2.5">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Properties / dimensions</p>
                    <p className="mt-0.5 text-[11px] text-gray-500">These specifications appear beneath the material name.</p>
                  </div>
                  <button type="button" onClick={() => setForm({ ...form, dimensions: [...form.dimensions, { kind: "", value: "", unit: "" }] })}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50">
                    <Plus className="h-3.5 w-3.5" /> Add property
                  </button>
                </div>
                <div className="space-y-2 p-3">
                  {form.dimensions.length === 0 && <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">No properties added.</p>}
                  {form.dimensions.map((dimension, index) => (
                    <div key={index} className="grid grid-cols-[1fr_0.8fr_0.8fr_auto] items-center gap-2">
                      <input value={dimension.kind} placeholder="Property"
                        onChange={(event) => setForm({ ...form, dimensions: form.dimensions.map((item, itemIndex) => itemIndex === index ? { ...item, kind: event.target.value } : item) })}
                        className="min-w-0 rounded-lg border border-gray-200 px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-teal-500" />
                      <input value={dimension.value ?? ""} placeholder="Value"
                        onChange={(event) => setForm({ ...form, dimensions: form.dimensions.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item) })}
                        className="min-w-0 rounded-lg border border-gray-200 px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-teal-500" />
                      <select value={dimension.unit ?? ""}
                        onChange={(event) => setForm({ ...form, dimensions: form.dimensions.map((item, itemIndex) => itemIndex === index ? { ...item, unit: event.target.value } : item) })}
                        className="min-w-0 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-teal-500">
                        <option value="">Unit</option>
                        {dimension.unit && !DIMENSION_UNITS.includes(dimension.unit) && <option value={dimension.unit}>{dimension.unit}</option>}
                        {DIMENSION_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                      </select>
                      <button type="button" title="Remove property"
                        onClick={() => setForm({ ...form, dimensions: form.dimensions.filter((_, itemIndex) => itemIndex !== index) })}
                        className="p-1.5 text-gray-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
              {editTarget && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reason for change<span className="text-red-500">*</span></label>
                  <textarea value={amendmentReason} onChange={(event) => setAmendmentReason(event.target.value)} rows={2}
                    placeholder="Explain why these material or store quantity changes are required…"
                    className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                  <p className="mt-1 text-[11px] text-gray-400">Recorded in the approval and audit history.</p>
                </div>
              )}
              {(
                [
                  ["totalQty", "Total Quantity", "number"],
                  ["availableQty", "Available Qty", "number"],
                  ["reservedQty", "Reserved Qty", "number"],
                  ["unitCost", `Unit Cost (${getCurrencySymbol()})`, "number"],
                ] as const
              ).map(([key, label, type]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {label}
                  </label>
                  <input
                    type={type}
                    value={(form as Record<string, unknown>)[key] as string}
                    disabled={Boolean(editTarget && ["totalQty", "availableQty", "reservedQty"].includes(key))}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [key]:
                          type === "number"
                            ? Number(e.target.value)
                            : e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                  {editTarget && ["totalQty", "availableQty", "reservedQty"].includes(key) && (
                    <p className="mt-1 text-[11px] text-gray-400">Updated only through posted stock transactions.</p>
                  )}
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
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Fulfilling Store <span className="text-red-500">*</span>
              </label>
              <select
                value={procurementStoreId}
                onChange={(e) => setProcurementStoreId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="">Select store…</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
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
                disabled={
                  !procurementQty ||
                  Number(procurementQty) <= 0 ||
                  !procurementStoreId ||
                  sendingToProcurement
                }
                onClick={() => void sendToProcurement()}
                className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                {sendingToProcurement ? "Sending…" : "Send to Procurement"}
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
          onSaved={() => {
            getMaterials()
              .then((rows) => setMaterials(rows.map(toMaterial)))
              .catch(() => toast.error("Material was saved, but the organization totals could not be refreshed."));
          }}
        />
      )}
    </div>
  );
}
