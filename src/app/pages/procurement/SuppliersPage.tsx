import { useState, useEffect } from "react";
import { fetchSuppliers } from "../../api/suppliers";
import { fetchPurchaseOrders } from "../../api/purchase-orders";
import {
  Building,
  Plus,
  Search,
  Star,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  ChevronRight,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  X,
  Edit,
  Trash2,
  User,
} from "lucide-react";
import {
  getCurrencySymbol,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";

type SupplierCity = "Lagos" | "Abuja" | "Ibadan" | "Port Harcourt" | "Kano";
type Category = string;

type Supplier = Awaited<ReturnType<typeof fetchSuppliers>>[number];
type PurchaseOrder = Awaited<ReturnType<typeof fetchPurchaseOrders>>[number];

function renderStars(rating: number) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-gray-300"}`}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

function fmt(n: number) {
  const symbol = getCurrencySymbol();
  if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${symbol}${(n / 1000).toFixed(0)}K`;
  return `${symbol}${n}`;
}

const BLANK_SUPPLIER = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  city: "Lagos" as SupplierCity,
  category: [] as Category[],
  notes: "",
};
const BLANK_MODAL_DOCS: Record<string, File | null> = Object.fromEntries(
  [
    "TIN Certificate",
    "CAC Certificate",
    "Bank Account / Verification",
    "Insurance Certificate",
    "Company Profile",
  ].map((d) => [d, null]),
);

export function SuppliersPage() {
  const [supplierList, setSupplierList] = useState<Supplier[]>([]);
  useEffect(() => {
    fetchSuppliers().then(setSupplierList);
  }, []);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [supplierTab, setSupplierTab] = useState<"overview" | "documents">(
    "overview",
  );
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [profileTarget, setProfileTarget] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ ...BLANK_SUPPLIER });
  const [modalDocs, setModalDocs] = useState<Record<string, File | null>>({
    ...BLANK_MODAL_DOCS,
  });

  type DocEntry = { fileName: string | null };
  const REQUIRED_DOCS = [
    "TIN Certificate",
    "CAC Certificate",
    "Bank Account / Verification",
    "Insurance Certificate",
    "Company Profile",
  ];
  const [uploadedDocs, setUploadedDocs] = useState<
    Record<string, Record<string, DocEntry>>
  >({});
  const [profileOrders, setProfileOrders] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
    if (!profileTarget) {
      setProfileOrders([]);
      return;
    }
    fetchPurchaseOrders({ supplierId: profileTarget.id })
      .then(setProfileOrders)
      .catch(console.error);
  }, [profileTarget]);

  function handleDocUpload(
    supplierId: string,
    docName: string,
    fileName: string,
  ) {
    setUploadedDocs((prev) => ({
      ...prev,
      [supplierId]: {
        ...(prev[supplierId] ?? {}),
        [docName]: { fileName },
      },
    }));
  }

  function removeDoc(supplierId: string, docName: string) {
    setUploadedDocs((prev) => {
      const copy = { ...prev };
      if (copy[supplierId]) {
        const inner = { ...copy[supplierId] };
        delete inner[docName];
        copy[supplierId] = inner;
      }
      return copy;
    });
  }

  function openAdd() {
    setModalMode("add");
    setEditTarget(null);
    setForm({ ...BLANK_SUPPLIER });
    setModalDocs({ ...BLANK_MODAL_DOCS });
    setShowModal(true);
  }

  function openEdit(sup: Supplier) {
    setModalMode("edit");
    setEditTarget(sup);
    setForm({
      name: sup.name,
      contactPerson: sup.contactPerson,
      phone: sup.phone,
      email: sup.email,
      city: sup.city,
      category: [...sup.category],
      notes: sup.notes,
    });
    setModalDocs({ ...BLANK_MODAL_DOCS });
    setShowModal(true);
  }

  function handleAdd() {
    if (modalMode === "edit" && editTarget) {
      setSupplierList((prev) =>
        prev.map((s) => (s.id === editTarget.id ? { ...s, ...form } : s)),
      );
      setShowModal(false);
      return;
    }
    const newId = `SUP-${String(supplierList.length + 1).padStart(3, "0")}`;
    const newSup = {
      ...form,
      id: newId,
      rating: 0,
      onTimeDeliveryRate: 0,
      rejectRate: 0,
      activePOs: 0,
      totalSpend: 0,
      lastOrder: "—",
      status: "active" as const,
      materials: [],
    };
    setSupplierList([...supplierList, newSup]);
    const docEntries = Object.entries(modalDocs)
      .filter(([, file]) => file !== null)
      .reduce<Record<string, { fileName: string }>>((acc, [docName, file]) => {
        acc[docName] = { fileName: file!.name };
        return acc;
      }, {});
    if (Object.keys(docEntries).length > 0) {
      setUploadedDocs((prev) => ({ ...prev, [newId]: docEntries }));
    }
    setShowModal(false);
  }

  function confirmDelete(id: string) {
    setSupplierList((prev) => prev.filter((s) => s.id !== id));
    setDeleteTarget(null);
  }

  function toggleCategory(cat: Category) {
    setForm((f) => ({
      ...f,
      category: f.category.includes(cat)
        ? f.category.filter((c) => c !== cat)
        : [...f.category, cat],
    }));
  }

  const allCategories = [
    "All",
    ...Array.from(new Set(supplierList.flatMap((s) => s.category))),
  ];

  const filtered = supplierList.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(search.toLowerCase());
    const matchCat =
      categoryFilter === "All" ||
      s.category.includes(categoryFilter as Category);
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {supplierList.length} registered suppliers · Manage supply chain and
            track performance
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-md text-sm hover:bg-blue-800"
        >
          <Plus className="w-3.5 h-3.5" /> Add Supplier
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Active Suppliers",
            value: supplierList.filter((s) => s.status === "active").length,
            color: "bg-green-50 border-green-200 text-green-700",
          },
          {
            label: "With Open POs",
            value: supplierList.filter((s) => s.activePOs > 0).length,
            color: "bg-blue-50 border-blue-200 text-blue-700",
          },
          {
            label: "Avg On-Time Rate",
            value: supplierList.length
              ? `${Math.round(supplierList.reduce((a, s) => a + s.onTimeDeliveryRate, 0) / supplierList.length)}%`
              : "—",
            color: "bg-gray-50 border-gray-200 text-gray-900",
          },
          {
            label: "Total Spend (YTD)",
            value: fmt(supplierList.reduce((a, s) => a + s.totalSpend, 0)),
            color: "bg-amber-50 border-amber-200 text-amber-700",
          },
        ].map((s) => (
          <div key={s.label} className={`p-4 rounded-lg border ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm opacity-80 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1.5 text-xs rounded-md border font-medium ${categoryFilter === cat ? "bg-blue-700 text-white border-blue-700" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Supplier Cards */}
      <div className="space-y-3">
        {filtered.map((sup) => {
          const isExpanded = expanded === sup.id;
          const perfColor =
            sup.onTimeDeliveryRate >= 90
              ? "text-green-700"
              : sup.onTimeDeliveryRate >= 80
                ? "text-amber-600"
                : "text-red-600";
          return (
            <div
              key={sup.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Building className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">
                      {sup.name}
                    </p>
                    {sup.activePOs > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {sup.activePOs} Open PO{sup.activePOs > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {renderStars(sup.rating)}
                    <span className="text-xs text-gray-400">·</span>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" />
                      {sup.city}
                    </div>
                    <span className="text-xs text-gray-400">·</span>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      {sup.category.map((c: string) => (
                        <span
                          key={c}
                          className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-center flex-shrink-0 px-4">
                  <p className={`text-lg font-bold ${perfColor}`}>
                    {sup.onTimeDeliveryRate}%
                  </p>
                  <p className="text-xs text-gray-400">On-time</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900">
                    {fmt(sup.totalSpend)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Total spend</p>
                  <p className="text-xs text-gray-400">Last: {sup.lastOrder}</p>
                </div>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setProfileTarget(sup);
                    }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Profile"
                  >
                    <User className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(sup);
                    }}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(sup);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : sup.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50">
                  {/* Tab bar */}
                  <div className="flex gap-0 border-b border-gray-200 bg-white px-5">
                    {(["overview", "documents"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setSupplierTab(t)}
                        className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${supplierTab === t ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {supplierTab === "overview" && (
                    <div className="px-5 py-4">
                      <div className="grid grid-cols-3 gap-6 mb-5">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Contact
                          </p>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Building className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              {sup.contactPerson}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              {sup.phone}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              {sup.email}
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Performance
                          </p>
                          <div className="space-y-2">
                            <div>
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>On-time Delivery</span>
                                <span className={`font-medium ${perfColor}`}>
                                  {sup.onTimeDeliveryRate}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${sup.onTimeDeliveryRate >= 90 ? "bg-green-500" : sup.onTimeDeliveryRate >= 80 ? "bg-amber-400" : "bg-red-400"}`}
                                  style={{
                                    width: `${sup.onTimeDeliveryRate}%`,
                                  }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>Rejection Rate</span>
                                <span
                                  className={`font-medium ${sup.rejectRate < 2 ? "text-green-700" : sup.rejectRate < 4 ? "text-amber-600" : "text-red-600"}`}
                                >
                                  {sup.rejectRate}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${sup.rejectRate < 2 ? "bg-green-500" : sup.rejectRate < 4 ? "bg-amber-400" : "bg-red-400"}`}
                                  style={{
                                    width: `${Math.min(sup.rejectRate * 10, 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Notes
                          </p>
                          <p className="text-sm text-gray-700">{sup.notes}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Supplied Materials
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {sup.materials.map(
                            (m: {
                              name: string;
                              unit: string;
                              lastPrice: number;
                            }) => (
                              <div
                                key={m.name}
                                className="bg-white border border-gray-200 rounded-md px-3 py-2 text-xs"
                              >
                                <p className="font-medium text-gray-900">
                                  {m.name}
                                </p>
                                <p className="text-gray-400 mt-0.5">
                                  Last: {formatNumberByGeneralSettings(m.lastPrice)} /{" "}
                                  {m.unit}
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <button className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                          View Order History
                        </button>
                        <button className="px-3 py-1.5 text-sm bg-blue-700 text-white rounded-md hover:bg-blue-800">
                          Create PO with Supplier
                        </button>
                      </div>
                    </div>
                  )}

                  {supplierTab === "documents" && (
                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Compliance Documents
                        </p>
                        <span className="text-xs text-gray-400">
                          {
                            Object.values(uploadedDocs[sup.id] ?? {}).filter(
                              (d) => d.fileName,
                            ).length
                          }{" "}
                          / {REQUIRED_DOCS.length} uploaded
                        </span>
                      </div>
                      <div className="space-y-2">
                        {REQUIRED_DOCS.map((docName) => {
                          const entry = uploadedDocs[sup.id]?.[docName];
                          const isUploaded = !!entry?.fileName;
                          return (
                            <div
                              key={docName}
                              className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3"
                            >
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isUploaded ? "bg-green-100" : "bg-gray-100"}`}
                              >
                                {isUploaded ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Clock className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800">
                                  {docName}
                                </p>
                                {isUploaded ? (
                                  <p className="text-xs text-green-600 truncate">
                                    {entry.fileName}
                                  </p>
                                ) : (
                                  <p className="text-xs text-gray-400">
                                    No file uploaded
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {isUploaded && (
                                  <button
                                    onClick={() => removeDoc(sup.id, docName)}
                                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer text-gray-600">
                                  <Upload className="w-3.5 h-3.5" />
                                  {isUploaded ? "Replace" : "Upload"}
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.jpg,.png"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f)
                                        handleDocUpload(
                                          sup.id,
                                          docName,
                                          f.name,
                                        );
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-400 mt-3">
                        Accepted formats: PDF, DOC, DOCX, JPG, PNG
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Supplier
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Are you sure you want to remove{" "}
              <strong>{deleteTarget.name}</strong>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(deleteTarget.id)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Profile Modal */}
      {profileTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between px-6 py-5 border-b">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Building className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {profileTarget.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500">
                      {profileTarget.id}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${profileTarget.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                    >
                      {profileTarget.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setProfileTarget(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
              {/* Key metrics */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  {
                    label: "Rating",
                    value: profileTarget.rating.toFixed(1),
                    sub: "/ 5.0",
                    color: "text-amber-600",
                  },
                  {
                    label: "On-Time Rate",
                    value: `${profileTarget.onTimeDeliveryRate}%`,
                    sub: "",
                    color:
                      profileTarget.onTimeDeliveryRate >= 90
                        ? "text-green-600"
                        : profileTarget.onTimeDeliveryRate >= 80
                          ? "text-amber-600"
                          : "text-red-600",
                  },
                  {
                    label: "Rejection Rate",
                    value: `${profileTarget.rejectRate}%`,
                    sub: "",
                    color:
                      profileTarget.rejectRate < 2
                        ? "text-green-600"
                        : profileTarget.rejectRate < 4
                          ? "text-amber-600"
                          : "text-red-600",
                  },
                  {
                    label: "Total Spend",
                    value: fmt(profileTarget.totalSpend),
                    sub: "YTD",
                    color: "text-blue-700",
                  },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="bg-gray-50 border rounded-xl p-3"
                  >
                    <p className={`text-xl font-bold ${m.color}`}>
                      {m.value}
                      {m.sub && (
                        <span className="text-sm text-gray-400 ml-1">
                          {m.sub}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>

              {/* Company details */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Company Details
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Building className="w-4 h-4 text-gray-400" />
                      {profileTarget.contactPerson}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {profileTarget.phone}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {profileTarget.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {profileTarget.city}, Nigeria
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Categories
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {profileTarget.category.map((c: string) => (
                      <span
                        key={c}
                        className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full border border-blue-100"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-2">
                    Notes
                  </p>
                  <p className="text-sm text-gray-700">{profileTarget.notes}</p>
                </div>
              </div>

              {/* Supplied materials */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Price List
                </p>
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                          Material
                        </th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                          Unit
                        </th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">
                          Last Price
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {profileTarget.materials.map(
                        (m: {
                          name: string;
                          unit: string;
                          lastPrice: number;
                        }) => (
                          <tr key={m.name} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-gray-800">
                              {m.name}
                            </td>
                            <td className="px-4 py-2.5 text-gray-500">
                              {m.unit}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-gray-800">
                              {formatNumberByGeneralSettings(m.lastPrice)}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Purchase Orders */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Recent Purchase Orders
                </p>
                {profileOrders.length > 0 ? (
                  <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                            PO Number
                          </th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                            Date
                          </th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">
                            Amount
                          </th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {profileOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-mono text-blue-700">
                              {order.id}
                            </td>
                            <td className="px-4 py-2.5 text-gray-500">
                              {order.createdDate}
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-800">
                              {formatNumberByGeneralSettings(order.totalValue)}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    No purchase orders on record.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => {
                  openEdit(profileTarget);
                  setProfileTarget(null);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <Edit className="w-4 h-4" /> Edit Supplier
              </button>
              <button
                onClick={() => setProfileTarget(null)}
                className="px-4 py-2 text-sm bg-blue-700 text-white rounded-lg hover:bg-blue-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Supplier Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-900">
                {modalMode === "edit" ? "Edit Supplier" : "Add Supplier"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Company Name
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. CemCo Nigeria Ltd"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Contact Person
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Full name"
                    value={form.contactPerson}
                    onChange={(e) =>
                      setForm({ ...form, contactPerson: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    City
                  </label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.city}
                    onChange={(e) =>
                      setForm({ ...form, city: e.target.value as SupplierCity })
                    }
                  >
                    {(
                      [
                        "Lagos",
                        "Abuja",
                        "Ibadan",
                        "Port Harcourt",
                        "Kano",
                      ] as SupplierCity[]
                    ).map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Phone
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+234 80 XXXX XXXX"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Email
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="supplier@example.com"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Categories
                </label>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "Concrete & Masonry",
                      "Steel & Ironmongery",
                      "Electrical",
                      "Plumbing & MEP",
                      "Timber & Formwork",
                      "Finishes",
                      "Aggregates",
                    ] as Category[]
                  ).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-2.5 py-1 text-xs rounded-lg border font-medium ${form.category.includes(cat) ? "bg-blue-700 text-white border-blue-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Notes
                </label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="Add notes about this supplier…"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              {/* Documents */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600">
                    Compliance Documents
                  </label>
                  <span className="text-xs text-gray-400">
                    {Object.values(modalDocs).filter(Boolean).length} /{" "}
                    {Object.keys(modalDocs).length} uploaded
                  </span>
                </div>
                <div className="space-y-2">
                  {Object.keys(modalDocs).map((docName) => {
                    const file = modalDocs[docName];
                    return (
                      <div
                        key={docName}
                        className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50"
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${file ? "bg-green-100" : "bg-white border border-gray-200"}`}
                        >
                          {file ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <FileText className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800">
                            {docName}
                          </p>
                          {file ? (
                            <p className="text-xs text-green-600 truncate">
                              {file.name}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400">
                              No file uploaded
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {file && (
                            <button
                              type="button"
                              onClick={() =>
                                setModalDocs((prev) => ({
                                  ...prev,
                                  [docName]: null,
                                }))
                              }
                              className="p-1 text-gray-400 hover:text-red-500 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <label className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50 cursor-pointer text-gray-600">
                            <Upload className="w-3 h-3" />
                            {file ? "Replace" : "Upload"}
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.jpg,.png"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f)
                                  setModalDocs((prev) => ({
                                    ...prev,
                                    [docName]: f,
                                  }));
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  Accepted: PDF, DOC, DOCX, JPG, PNG · Documents can also be
                  added later
                </p>
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!form.name.trim() || !form.contactPerson.trim()}
                className="px-4 py-2 text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-50"
              >
                {modalMode === "edit" ? "Save Changes" : "Add Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
