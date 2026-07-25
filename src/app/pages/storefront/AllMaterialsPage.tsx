import { useState } from "react";
import { Plus, Search, Download, Filter, AlertTriangle, Pencil, Trash2, ShoppingCart, CheckCircle, X, RefreshCw, ArrowRightLeft, Package } from "lucide-react";

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
}

const MOCK: Material[] = [
  { id: "MAT-001", name: "Cement (50kg bag)",        category: "Concrete",   unit: "Bags",    totalQty: 380,  availableQty: 260, reservedQty: 120, unitCost: 8500,   reorderLevel: 100, materialType: "Consumable" },
  { id: "MAT-002", name: "Steel Rebar Y16",           category: "Steel",      unit: "Tonnes",  totalQty: 12,   availableQty: 10,  reservedQty: 2,   unitCost: 410000, reorderLevel: 5,   materialType: "Consumable" },
  { id: "MAT-003", name: "Electrical Conduit 25mm",   category: "Electrical", unit: "Metres",  totalQty: 45,   availableQty: 45,  reservedQty: 0,   unitCost: 1200,   reorderLevel: 200, materialType: "Consumable" },
  { id: "MAT-004", name: "Binding Wire",              category: "Steel",      unit: "Rolls",   totalQty: 28,   availableQty: 20,  reservedQty: 8,   unitCost: 2800,   reorderLevel: 20,  materialType: "Consumable" },
  { id: "MAT-005", name: "Concrete Block 9 Inch",     category: "Concrete",   unit: "Units",   totalQty: 4200, availableQty: 3500,reservedQty: 700, unitCost: 350,    reorderLevel: 1000,materialType: "Consumable" },
  { id: "MAT-006", name: "2.5mm Twin Cable",          category: "Electrical", unit: "Metres",  totalQty: 80,   availableQty: 80,  reservedQty: 0,   unitCost: 850,    reorderLevel: 300, materialType: "Consumable" },
  { id: "MAT-007", name: "PVC Pipes 2 Inch",          category: "Plumbing",   unit: "Lengths", totalQty: 12,   availableQty: 12,  reservedQty: 0,   unitCost: 4500,   reorderLevel: 50,  materialType: "Consumable" },
  { id: "MAT-008", name: "Sand",                      category: "Aggregates", unit: "Tonnes",  totalQty: 95,   availableQty: 85,  reservedQty: 10,  unitCost: 18000,  reorderLevel: 30,  materialType: "Consumable" },
  { id: "MAT-009", name: "Formwork Plywood",          category: "Timber",     unit: "Sheets",  totalQty: 30,   availableQty: 25,  reservedQty: 5,   unitCost: 14000,  reorderLevel: 15,  materialType: "Reusable",  allocationStatus: "Available", condition: "Good" },
  { id: "MAT-010", name: "Steel Rebar Y12",           category: "Steel",      unit: "Tonnes",  totalQty: 8,    availableQty: 8,   reservedQty: 0,   unitCost: 390000, reorderLevel: 5,   materialType: "Consumable" },
  { id: "MAT-011", name: "Flush Doors",               category: "Finishes",   unit: "Units",   totalQty: 20,   availableQty: 14,  reservedQty: 6,   unitCost: 45000,  reorderLevel: 10,  materialType: "Consumable" },
  { id: "MAT-012", name: "Granite Tiles 600x600",     category: "Finishes",   unit: "Boxes",   totalQty: 0,    availableQty: 0,   reservedQty: 0,   unitCost: 28000,  reorderLevel: 20,  materialType: "Consumable" },
  { id: "MAT-013", name: "Concrete Mixer (350L)",     category: "Equipment",  unit: "Units",   totalQty: 4,    availableQty: 1,   reservedQty: 0,   unitCost: 450000, reorderLevel: 1,   materialType: "Reusable",  allocationStatus: "Allocated",  allocatedTo: "Block A Site Team", allocatedProject: "Industrial Warehouse", condition: "Good" },
  { id: "MAT-014", name: "Water Pump (3 inch)",       category: "Equipment",  unit: "Units",   totalQty: 6,    availableQty: 3,   reservedQty: 0,   unitCost: 180000, reorderLevel: 1,   materialType: "Reusable",  allocationStatus: "Available",  condition: "Good" },
  { id: "MAT-015", name: "Plate Compactor",           category: "Equipment",  unit: "Units",   totalQty: 2,    availableQty: 0,   reservedQty: 0,   unitCost: 320000, reorderLevel: 1,   materialType: "Reusable",  allocationStatus: "Under Maintenance", condition: "Needs Servicing" },
  { id: "MAT-016", name: "Safety Harness Set",        category: "Safety",     unit: "Sets",    totalQty: 20,   availableQty: 12,  reservedQty: 8,   unitCost: 65000,  reorderLevel: 5,   materialType: "Reusable",  allocationStatus: "Available",  condition: "Good" },
  { id: "MAT-017", name: "Scaffolding Frame (H1.8m)", category: "Equipment",  unit: "Frames",  totalQty: 80,   availableQty: 60,  reservedQty: 20,  unitCost: 35000,  reorderLevel: 20,  materialType: "Reusable",  allocationStatus: "Allocated",  allocatedTo: "Scaffolding Crew", allocatedProject: "Downtown Office Complex", condition: "Good" },
];

const CATEGORIES = ["All", "Concrete", "Steel", "Electrical", "Plumbing", "Aggregates", "Timber", "Finishes", "Equipment", "Safety"];
const PROJECTS = ["Industrial Warehouse", "Downtown Office Complex", "Riverside Residential", "Highway Interchange", "University Science Block"];

const BLANK: Omit<Material, "id"> = {
  name: "", category: "Concrete", unit: "Units",
  totalQty: 0, availableQty: 0, reservedQty: 0, unitCost: 0, reorderLevel: 0,
  materialType: "Consumable",
};

function getStatus(m: Material): MaterialStatus {
  if (m.availableQty === 0) return "Out of Stock";
  if (m.availableQty <= m.reorderLevel) return "Low Stock";
  return "In Stock";
}

const STATUS_STYLE: Record<MaterialStatus, string> = {
  "In Stock":     "bg-green-50 text-green-700",
  "Low Stock":    "bg-yellow-50 text-yellow-700",
  "Out of Stock": "bg-red-50 text-red-700",
};

const ALLOC_STYLE: Record<AllocationStatus, string> = {
  Available:           "bg-green-100 text-green-700",
  Allocated:           "bg-blue-100 text-blue-700",
  "Under Maintenance": "bg-orange-100 text-orange-700",
};

// ── Allocation Tracking Modal ─────────────────────────────────────────────────
function TrackModal({ material, onClose, onSave }: {
  material: Material;
  onClose: () => void;
  onSave: (updated: Partial<Material>) => void;
}) {
  const [allocationStatus, setAllocationStatus] = useState<AllocationStatus>(material.allocationStatus ?? "Available");
  const [allocatedTo, setAllocatedTo] = useState(material.allocatedTo ?? "");
  const [allocatedProject, setAllocatedProject] = useState(material.allocatedProject ?? "");
  const [condition, setCondition] = useState(material.condition ?? "Good");

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Track Reusable Item</h2>
            <p className="text-xs text-gray-500 mt-0.5">{material.name} — {material.id}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Allocation Status</label>
            <div className="flex gap-2">
              {(["Available", "Allocated", "Under Maintenance"] as AllocationStatus[]).map(s => (
                <button key={s} onClick={() => setAllocationStatus(s)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border-2 transition-all ${allocationStatus === s ? `${ALLOC_STYLE[s]} border-current` : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          {allocationStatus === "Allocated" && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Allocated To (Person / Team)</label>
                <input value={allocatedTo} onChange={e => setAllocatedTo(e.target.value)} placeholder="e.g. Block A Site Team"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Linked Project</label>
                <select value={allocatedProject} onChange={e => setAllocatedProject(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                  <option value="">— None —</option>
                  {PROJECTS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Condition</label>
            <select value={condition} onChange={e => setCondition(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white">
              <option>Good</option>
              <option>Fair</option>
              <option>Needs Servicing</option>
              <option>Damaged</option>
            </select>
          </div>
          {allocationStatus === "Available" && material.allocationStatus === "Allocated" && (
            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-start gap-2">
              <RefreshCw className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-green-700">This item will be marked as <strong>returned to store</strong> and available for re-allocation.</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => {
            onSave({
              allocationStatus,
              allocatedTo: allocationStatus === "Allocated" ? allocatedTo : undefined,
              allocatedProject: allocationStatus === "Allocated" ? allocatedProject : undefined,
              condition,
            });
            onClose();
          }} className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl">
            {allocationStatus === "Available" && material.allocationStatus === "Allocated" ? "Confirm Return" : "Save Status"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AllMaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>(MOCK);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<MaterialStatus | "All">("All");
  const [typeFilter, setTypeFilter] = useState<MaterialType | "All">("All");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Material | null>(null);
  const [form, setForm] = useState<Omit<Material, "id">>({ ...BLANK });
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);
  const [procurementTarget, setProcurementTarget] = useState<Material | null>(null);
  const [procurementQty, setProcurementQty] = useState("");
  const [sentToProcurement, setSentToProcurement] = useState<Set<string>>(new Set());
  const [trackTarget, setTrackTarget] = useState<Material | null>(null);

  const filtered = materials.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
    const matchCat = catFilter === "All" || m.category === catFilter;
    const matchStatus = statusFilter === "All" || getStatus(m) === statusFilter;
    const matchType = typeFilter === "All" || m.materialType === typeFilter;
    return matchSearch && matchCat && matchStatus && matchType;
  });

  function openAdd() { setEditTarget(null); setForm({ ...BLANK }); setShowModal(true); }
  function openEdit(m: Material) { setEditTarget(m); const { id: _id, ...rest } = m; setForm(rest); setShowModal(true); }
  function save() {
    if (editTarget) {
      setMaterials((prev) => prev.map((m) => m.id === editTarget.id ? { ...form, id: editTarget.id } : m));
    } else {
      const id = `MAT-${String(materials.length + 1).padStart(3, "0")}`;
      setMaterials((prev) => [...prev, { ...form, id }]);
    }
    setShowModal(false); setForm({ ...BLANK }); setEditTarget(null);
  }
  function doDelete() {
    if (deleteTarget) setMaterials((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    setDeleteTarget(null);
  }
  function exportCSV() {
    const rows = [
      ["Material ID", "Name", "Category", "Type", "Unit", "Total Qty", "Available Qty", "Unit Cost", "Status"],
      ...filtered.map((m) => [m.id, m.name, m.category, m.materialType, m.unit, m.totalQty, m.availableQty, m.unitCost, getStatus(m)]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv," + encodeURIComponent(csv); a.download = "materials.csv"; a.click();
  }

  const low = materials.filter((m) => getStatus(m) !== "In Stock").length;
  const reusable = materials.filter(m => m.materialType === "Reusable");
  const allocated = reusable.filter(m => m.allocationStatus === "Allocated").length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">All Materials</h1>
          <p className="text-sm text-gray-500 mt-0.5">Complete inventory catalogue across all stores</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm px-3 py-2 rounded-xl hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm px-4 py-2 rounded-xl">
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
            <span className="font-semibold">{low} material{low > 1 ? "s" : ""}</span> below reorder level or out of stock — consider raising a procurement request.
          </p>
        </div>
      )}

      {/* Type filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Type:</span>
        {(["All", "Consumable", "Reusable"] as const).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 text-xs rounded-lg border font-medium flex items-center gap-1.5 ${typeFilter === t ? "bg-teal-700 text-white border-teal-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
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
          <input className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Search material ID, name, category…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-2.5 py-1.5 text-xs rounded-lg border font-medium ${catFilter === c ? "bg-teal-700 text-white border-teal-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {(["All", "In Stock", "Low Stock", "Out of Stock"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1.5 text-xs rounded-lg border font-medium ${statusFilter === s ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Material ID</th>
              <th className="px-4 py-3 text-left font-medium">Material Name</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Unit</th>
              <th className="px-4 py-3 text-left font-medium">Available</th>
              <th className="px-4 py-3 text-left font-medium">Unit Cost</th>
              <th className="px-4 py-3 text-left font-medium">Stock Status</th>
              <th className="px-4 py-3 text-left font-medium">Allocation</th>
              <th className="px-4 py-3 w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-sm">No materials found.</td></tr>
            )}
            {filtered.map((m) => {
              const status = getStatus(m);
              return (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {m.name}
                    {m.allocatedTo && <p className="text-xs text-blue-500 mt-0.5">→ {m.allocatedTo}{m.allocatedProject ? ` · ${m.allocatedProject}` : ""}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit ${m.materialType === "Reusable" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"}`}>
                      {m.materialType === "Reusable" ? <RefreshCw className="w-2.5 h-2.5" /> : <Package className="w-2.5 h-2.5" />}
                      {m.materialType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{m.category}</td>
                  <td className="px-4 py-3 text-gray-600">{m.unit}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{m.availableQty.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">{m.unitCost.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[status]}`}>{status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {m.materialType === "Reusable" && m.allocationStatus ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ALLOC_STYLE[m.allocationStatus]}`}>{m.allocationStatus}</span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {m.materialType === "Reusable" && (
                        <button onClick={() => setTrackTarget(m)}
                          className="p-1 text-indigo-400 hover:text-indigo-600 rounded hover:bg-indigo-50" title="Track / Return">
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(status === "Low Stock" || status === "Out of Stock") && (
                        <button onClick={() => { setProcurementTarget(m); setProcurementQty(""); }}
                          className={`p-1 rounded ${sentToProcurement.has(m.id) ? "text-green-500" : "text-amber-500 hover:text-amber-700 hover:bg-amber-50"}`}
                          title={sentToProcurement.has(m.id) ? "Sent to Procurement" : "Send for Procurement"}>
                          {sentToProcurement.has(m.id) ? <CheckCircle className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      <button onClick={() => openEdit(m)} className="p-1 text-gray-400 hover:text-teal-600 rounded hover:bg-teal-50" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(m)} className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50" title="Delete">
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
      <p className="text-xs text-gray-400">Showing {filtered.length} of {materials.length} materials</p>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editTarget ? "Edit Material" : "Add Material"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                    {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Material Type</label>
                  <select value={form.materialType} onChange={(e) => setForm({ ...form, materialType: e.target.value as MaterialType })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                    <option>Consumable</option>
                    <option>Reusable</option>
                  </select>
                </div>
              </div>
              {([
                ["name",         "Material Name",   "text"],
                ["unit",         "Unit of Measure", "text"],
                ["totalQty",     "Total Quantity",  "number"],
                ["availableQty", "Available Qty",   "number"],
                ["reservedQty",  "Reserved Qty",    "number"],
                ["unitCost",     "Unit Cost (₦)",   "number"],
                ["reorderLevel", "Reorder Level",   "number"],
              ] as const).map(([key, label, type]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type={type} value={(form as Record<string, unknown>)[key] as string}
                    onChange={(e) => setForm({ ...form, [key]: type === "number" ? Number(e.target.value) : e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              ))}
              {form.materialType === "Reusable" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Condition</label>
                  <select value={form.condition ?? "Good"} onChange={e => setForm({ ...form, condition: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                    <option>Good</option><option>Fair</option><option>Needs Servicing</option><option>Damaged</option>
                  </select>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={save} className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl">{editTarget ? "Save Changes" : "Add Material"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Delete Material?</h2>
            <p className="text-sm text-gray-600">Remove <span className="font-medium">{deleteTarget.name}</span> from the catalogue? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={doDelete} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Send for Procurement Modal */}
      {procurementTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Send for Procurement</h2>
              <button onClick={() => setProcurementTarget(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">{getStatus(procurementTarget)}</p>
                <p className="text-xs text-amber-700 mt-0.5"><span className="font-medium">{procurementTarget.name}</span> — {procurementTarget.availableQty} {procurementTarget.unit} available, reorder level {procurementTarget.reorderLevel}</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity to Procure <span className="text-red-500">*</span></label>
              <input type="number" min="1" value={procurementQty} onChange={e => setProcurementQty(e.target.value)}
                placeholder="Enter quantity…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <p className="text-xs text-gray-500">A procurement request will be raised and sent to the Procurement team for sourcing.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setProcurementTarget(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
              <button disabled={!procurementQty || Number(procurementQty) <= 0}
                onClick={() => { setSentToProcurement(prev => new Set([...prev, procurementTarget.id])); setProcurementTarget(null); }}
                className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
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
          onClose={() => setTrackTarget(null)}
          onSave={(updated) => {
            setMaterials(prev => prev.map(m => m.id === trackTarget.id ? { ...m, ...updated } : m));
            setTrackTarget(null);
          }}
        />
      )}
    </div>
  );
}


