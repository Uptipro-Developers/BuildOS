import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  getMaterials,
  createMaterial,
  Material as ApiMaterial,
} from "../../api/materials";
import { useClickOutside } from "../../utils/useClickOutside";
import {
  getCurrencySymbol,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";
import {
  Package,
  Search,
  Plus,
  Edit,
  Archive,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Download,
  X,
} from "lucide-react";
import { exportCSV } from "../../utils/exportCSV";

type LocalMaterial = {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  unitCost: number;
  supplier: string;
  status: string;
};

function fromApiMaterial(m: ApiMaterial): LocalMaterial {
  const stock = m.availableQty ?? m.totalQty ?? 0;
  const min = m.reorderLevel ?? 0;
  const status =
    stock <= 0 ? "out_of_stock" : stock <= min ? "low_stock" : "in_stock";
  return {
    id: m.id,
    name: m.name,
    category: m.category,
    unit: m.unit,
    currentStock: stock,
    minStock: min,
    unitCost: m.unitCost ?? 0,
    supplier: "",
    status,
  };
}

const statusConfig: Record<
  string,
  { label: string; badge: string; icon: React.ReactNode }
> = {
  in_stock: {
    label: "In Stock",
    badge: "bg-green-100 text-green-700",
    icon: <CheckCircle className="w-3.5 h-3.5 text-green-600" />,
  },
  low_stock: {
    label: "Low Stock",
    badge: "bg-amber-100 text-amber-700",
    icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
  },
  out_of_stock: {
    label: "Out of Stock",
    badge: "bg-red-100 text-red-700",
    icon: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  },
};

function fmt(n: number) {
  const symbol = getCurrencySymbol();
  if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${symbol}${(n / 1000).toFixed(0)}K`;
  return `${symbol}${n}`;
}

type MatSortKey =
  "name" | "category" | "currentStock" | "unitCost" | "stockValue" | "status";
type SortDir = "asc" | "desc";

// ── Add Material modal ────────────────────────────────────────────────────────
const MATERIAL_TYPES = ["Consumable", "Reusable"];
const ALLOCATION_STATUSES = ["Available", "Allocated", "Under Maintenance"];
const CONDITIONS = ["Good", "Fair", "Needs Servicing", "Damaged"];

const inputClass =
  "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const errorInputClass =
  "w-full border border-red-400 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400";

interface AddMaterialForm {
  name: string;
  category: string;
  unit: string;
  materialType: string;
  totalQty: string;
  availableQty: string;
  reservedQty: string;
  unitCost: string;
  reorderLevel: string;
  allocationStatus: string;
  allocatedTo: string;
  allocatedProject: string;
  condition: string;
}

const emptyMaterialForm: AddMaterialForm = {
  name: "",
  category: "",
  unit: "",
  materialType: "Consumable",
  totalQty: "",
  availableQty: "",
  reservedQty: "",
  unitCost: "",
  reorderLevel: "",
  allocationStatus: "Available",
  allocatedTo: "",
  allocatedProject: "",
  condition: "Good",
};

type MaterialFormErrors = Partial<Record<keyof AddMaterialForm, string>>;

function validateMaterialForm(form: AddMaterialForm): MaterialFormErrors {
  const errors: MaterialFormErrors = {};
  if (!form.name.trim()) errors.name = "Material name is required.";
  if (!form.category.trim()) errors.category = "Category is required.";
  if (!form.unit.trim()) errors.unit = "Unit of measure is required.";

  const numeric: (keyof AddMaterialForm)[] = [
    "totalQty",
    "availableQty",
    "reservedQty",
    "unitCost",
    "reorderLevel",
  ];
  for (const key of numeric) {
    const raw = form[key].trim();
    if (!raw) continue; // blank means "use the default of 0"
    const n = Number(raw);
    if (!Number.isFinite(n)) errors[key] = "Enter a number.";
    else if (n < 0) errors[key] = "Cannot be negative.";
  }

  // Reusable items are the only ones that can be allocated to somebody.
  if (form.allocationStatus === "Allocated" && !form.allocatedTo.trim())
    errors.allocatedTo = "Say who the material is allocated to.";

  return errors;
}

function MatField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function AddMaterialModal({
  onSave,
  onClose,
  knownCategories,
  saving,
}: {
  onSave: (payload: Partial<ApiMaterial>) => void;
  onClose: () => void;
  knownCategories: string[];
  saving: boolean;
}) {
  const [form, setForm] = useState<AddMaterialForm>({ ...emptyMaterialForm });
  const [errors, setErrors] = useState<MaterialFormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const set = (k: keyof AddMaterialForm, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev));
  };
  const cls = (k: keyof AddMaterialForm) =>
    errors[k] ? errorInputClass : inputClass;

  const num = (v: string) => (v.trim() ? Number(v) : 0);

  function handleSubmit() {
    const found = validateMaterialForm(form);
    setErrors(found);
    setSubmitted(true);
    if (Object.keys(found).length > 0) return;

    const totalQty = num(form.totalQty);
    const reservedQty = num(form.reservedQty);
    // Stock that hasn't been reserved is available, which is what a store
    // clerk means when they only fill in the total received.
    const availableQty = form.availableQty.trim()
      ? Number(form.availableQty)
      : Math.max(totalQty - reservedQty, 0);

    onSave({
      name: form.name.trim(),
      category: form.category.trim(),
      unit: form.unit.trim(),
      materialType: form.materialType,
      totalQty,
      availableQty,
      reservedQty,
      unitCost: num(form.unitCost),
      reorderLevel: num(form.reorderLevel),
      allocationStatus: form.allocationStatus,
      allocatedTo: form.allocatedTo.trim() || undefined,
      allocatedProject: form.allocatedProject.trim() || undefined,
      condition: form.materialType === "Reusable" ? form.condition : undefined,
    });
  }

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add Material</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-6 overflow-y-auto">
          {submitted && errorCount > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Please correct {errorCount} highlighted{" "}
              {errorCount === 1 ? "field" : "fields"} before adding this
              material.
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
              Identification
            </p>
            <div className="grid grid-cols-2 gap-4">
              <MatField label="Material Name" required error={errors.name}>
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. OPC Cement"
                  className={cls("name")}
                />
              </MatField>
              <MatField label="Category" required error={errors.category}>
                <input
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  list="material-category-options"
                  placeholder="e.g. Concrete"
                  className={cls("category")}
                />
                <datalist id="material-category-options">
                  {knownCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </MatField>
              <MatField label="Unit of Measure" required error={errors.unit}>
                <input
                  value={form.unit}
                  onChange={(e) => set("unit", e.target.value)}
                  placeholder="e.g. bags, tonnes, m³"
                  className={cls("unit")}
                />
              </MatField>
              <MatField label="Material Type">
                <select
                  value={form.materialType}
                  onChange={(e) => set("materialType", e.target.value)}
                  className={`${inputClass} bg-white`}
                >
                  {MATERIAL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </MatField>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
              Stock &amp; Cost
            </p>
            <div className="grid grid-cols-2 gap-4">
              <MatField label="Total Quantity" error={errors.totalQty}>
                <input
                  type="number"
                  min="0"
                  value={form.totalQty}
                  onChange={(e) => set("totalQty", e.target.value)}
                  placeholder="0"
                  className={cls("totalQty")}
                />
              </MatField>
              <MatField label="Reserved Quantity" error={errors.reservedQty}>
                <input
                  type="number"
                  min="0"
                  value={form.reservedQty}
                  onChange={(e) => set("reservedQty", e.target.value)}
                  placeholder="0"
                  className={cls("reservedQty")}
                />
              </MatField>
              <MatField label="Available Quantity" error={errors.availableQty}>
                <input
                  type="number"
                  min="0"
                  value={form.availableQty}
                  onChange={(e) => set("availableQty", e.target.value)}
                  placeholder="Total − reserved"
                  className={cls("availableQty")}
                />
              </MatField>
              <MatField
                label={`Unit Cost (${getCurrencySymbol()})`}
                error={errors.unitCost}
              >
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unitCost}
                  onChange={(e) => set("unitCost", e.target.value)}
                  placeholder="0.00"
                  className={cls("unitCost")}
                />
              </MatField>
              <MatField
                label="Reorder Level (min stock)"
                error={errors.reorderLevel}
              >
                <input
                  type="number"
                  min="0"
                  value={form.reorderLevel}
                  onChange={(e) => set("reorderLevel", e.target.value)}
                  placeholder="0"
                  className={cls("reorderLevel")}
                />
              </MatField>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
              Allocation
            </p>
            <div className="grid grid-cols-2 gap-4">
              <MatField label="Allocation Status">
                <select
                  value={form.allocationStatus}
                  onChange={(e) => set("allocationStatus", e.target.value)}
                  className={`${inputClass} bg-white`}
                >
                  {ALLOCATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </MatField>
              {form.materialType === "Reusable" && (
                <MatField label="Condition">
                  <select
                    value={form.condition}
                    onChange={(e) => set("condition", e.target.value)}
                    className={`${inputClass} bg-white`}
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </MatField>
              )}
              <MatField
                label="Allocated To"
                required={form.allocationStatus === "Allocated"}
                error={errors.allocatedTo}
              >
                <input
                  value={form.allocatedTo}
                  onChange={(e) => set("allocatedTo", e.target.value)}
                  placeholder="Person, crew or store"
                  className={cls("allocatedTo")}
                />
              </MatField>
              <MatField label="Allocated Project">
                <input
                  value={form.allocatedProject}
                  onChange={(e) => set("allocatedProject", e.target.value)}
                  className={inputClass}
                />
              </MatField>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-blue-700 text-white rounded-md text-sm font-medium hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Adding…" : "Add Material"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function InventoryPage() {
  const [materials, setMaterials] = useState<LocalMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [saving, setSaving] = useState(false);

  function loadMaterials() {
    return getMaterials().then((data) =>
      setMaterials(data.map(fromApiMaterial)),
    );
  }

  useEffect(() => {
    loadMaterials()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);
  const [statusFilter, setStatusFilter] = useState("All");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLTableCellElement>(null);
  useClickOutside(menuRef, menuOpen !== null, () => setMenuOpen(null));
  const [sortKey, setSortKey] = useState<MatSortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(k: MatSortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  function SortIcon({ col }: { col: MatSortKey }) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-blue-600" />
    ) : (
      <ChevronDown className="w-3 h-3 text-blue-600" />
    );
  }

  const filtered = materials
    .filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.id.toLowerCase().includes(search.toLowerCase());
      const matchCat =
        activeCategory === "All" || m.category === activeCategory;
      const matchStatus = statusFilter === "All" || m.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    })
    .sort((a, b) => {
      let v = 0;
      if (sortKey === "name") v = a.name.localeCompare(b.name);
      else if (sortKey === "category") v = a.category.localeCompare(b.category);
      else if (sortKey === "currentStock") v = a.currentStock - b.currentStock;
      else if (sortKey === "unitCost") v = a.unitCost - b.unitCost;
      else if (sortKey === "stockValue")
        v = a.currentStock * a.unitCost - b.currentStock * b.unitCost;
      else if (sortKey === "status") v = a.status.localeCompare(b.status);
      return sortDir === "asc" ? v : -v;
    });

  const counts = {
    in_stock: materials.filter((m) => m.status === "in_stock").length,
    low_stock: materials.filter((m) => m.status === "low_stock").length,
    out_of_stock: materials.filter((m) => m.status === "out_of_stock").length,
  };

  // Category filter options come from the categories actually present on the
  // loaded materials, so the filter can never offer a category with no items.
  const knownCategories = useMemo(
    () =>
      Array.from(
        new Set(materials.map((m) => m.category).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [materials],
  );
  const categories = ["All", ...knownCategories];

  async function handleCreateMaterial(payload: Partial<ApiMaterial>) {
    setSaving(true);
    try {
      await createMaterial(payload);
      await loadMaterials();
      setShowAddMaterial(false);
      toast.success("Material added");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add material",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
    );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            All Materials
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {materials.length} items across {knownCategories.length}{" "}
            {knownCategories.length === 1 ? "category" : "categories"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const headers = [
                "Material ID",
                "Name",
                "Category",
                "Unit",
                "Current Stock",
                "Min Level",
                "Unit Cost",
                "Stock Value",
                "Status",
                "Supplier",
              ];
              const rows = filtered.map((m) => [
                m.id,
                m.name,
                m.category,
                m.unit,
                String(m.currentStock),
                String(m.minStock),
                fmt(m.unitCost),
                fmt(m.currentStock * m.unitCost),
                statusConfig[m.status as keyof typeof statusConfig].label,
                m.supplier,
              ]);
              exportCSV("inventory-materials", headers, rows);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={() => setShowAddMaterial(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-md text-sm hover:bg-blue-800"
          >
            <Plus className="w-3.5 h-3.5" /> Add Material
          </button>
        </div>
      </div>

      {/* Status summary tiles */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            key: "in_stock",
            label: "In Stock",
            count: counts.in_stock,
            color: "border-green-200 bg-green-50",
            textColor: "text-green-700",
          },
          {
            key: "low_stock",
            label: "Low Stock",
            count: counts.low_stock,
            color: "border-amber-200 bg-amber-50",
            textColor: "text-amber-700",
          },
          {
            key: "out_of_stock",
            label: "Out of Stock",
            count: counts.out_of_stock,
            color: "border-red-200 bg-red-50",
            textColor: "text-red-700",
          },
        ].map((tile) => (
          <button
            key={tile.key}
            onClick={() =>
              setStatusFilter(statusFilter === tile.key ? "All" : tile.key)
            }
            className={`p-4 rounded-lg border text-left transition-all ${tile.color} ${statusFilter === tile.key ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}
          >
            <p className={`text-2xl font-bold ${tile.textColor}`}>
              {tile.count}
            </p>
            <p className="text-sm text-gray-600 mt-0.5">{tile.label}</p>
          </button>
        ))}
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search materials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1.5 text-xs rounded-md border font-medium transition-colors ${activeCategory === cat ? "bg-blue-700 text-white border-blue-700" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th
                className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-1">
                  Material
                  <SortIcon col="name" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer"
                onClick={() => handleSort("category")}
              >
                <div className="flex items-center gap-1">
                  Category
                  <SortIcon col="category" />
                </div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                Unit
              </th>
              <th
                className="px-4 py-3 text-xs font-medium text-gray-500 text-right cursor-pointer"
                onClick={() => handleSort("currentStock")}
              >
                <div className="flex items-center justify-end gap-1">
                  Current Stock
                  <SortIcon col="currentStock" />
                </div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">
                Min Level
              </th>
              <th
                className="px-4 py-3 text-xs font-medium text-gray-500 text-right cursor-pointer"
                onClick={() => handleSort("unitCost")}
              >
                <div className="flex items-center justify-end gap-1">
                  Unit Cost
                  <SortIcon col="unitCost" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-xs font-medium text-gray-500 text-right cursor-pointer"
                onClick={() => handleSort("stockValue")}
              >
                <div className="flex items-center justify-end gap-1">
                  Stock Value
                  <SortIcon col="stockValue" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-1">
                  Status
                  <SortIcon col="status" />
                </div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                Supplier
              </th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((m) => {
              const cfg = statusConfig[m.status] ?? {
                badge: "bg-gray-100 text-gray-700",
                icon: null,
                label: String(m.status ?? "Unknown"),
              };
              const stockValue = m.currentStock * m.unitCost;
              return (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.id}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {m.category}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{m.unit}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-semibold ${m.currentStock === 0 ? "text-red-600" : m.currentStock < m.minStock ? "text-amber-600" : "text-gray-900"}`}
                    >
                      {formatNumberByGeneralSettings(m.currentStock)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {formatNumberByGeneralSettings(m.minStock)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {fmt(m.unitCost)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {fmt(stockValue)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium w-fit ${cfg.badge}`}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {m.supplier}
                  </td>
                  <td
                    className="px-4 py-3 relative"
                    ref={menuOpen === m.id ? menuRef : undefined}
                  >
                    <button
                      onClick={() =>
                        setMenuOpen(menuOpen === m.id ? null : m.id)
                      }
                      className="p-1 rounded hover:bg-gray-100"
                    >
                      <MoreHorizontal className="w-4 h-4 text-gray-400" />
                    </button>
                    {menuOpen === m.id && (
                      <div className="absolute right-8 top-2 bg-white border border-gray-200 rounded-md shadow-lg z-10 py-1 min-w-[140px]">
                        <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                          <Archive className="w-3.5 h-3.5" /> Archive
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No materials match your filters</p>
          </div>
        )}
      </div>

      {showAddMaterial && (
        <AddMaterialModal
          knownCategories={knownCategories}
          saving={saving}
          onSave={handleCreateMaterial}
          onClose={() => setShowAddMaterial(false)}
        />
      )}
    </div>
  );
}
