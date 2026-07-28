import { useState, useEffect } from "react";
import {
  getMaterialRequests,
  MaterialRequest as ApiMR,
} from "../../api/materials";
import {
  formatDateByGeneralSettings,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";
import {
  ClipboardList,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Clock,
  XCircle,
  X,
  Trash2,
  ShoppingCart,
} from "lucide-react";
import {
  AdvancedFilter,
  applyFiltersAndSort,
  type FilterFieldDef,
  type ActiveFilters,
  type SortConfig,
} from "../../components/AdvancedFilter";
import { useNumbering } from "../../stores/numberingStore";
import { getReferenceData } from "../../api/reference-data";

type ReqStatus =
  "pending" | "approved" | "rejected" | "in_procurement" | "fulfilled";

type LocalMR = {
  id: string;
  project: string;
  requestedBy: string;
  department: string;
  status: ReqStatus;
  priority: "urgent" | "high" | "normal";
  submittedDate: string;
  neededBy: string;
  totalItems: number;
  justification: string;
  items: {
    material: string;
    qty: number;
    unit: string;
    available: number;
    notes: string;
  }[];
};

function fromApiMR(r: ApiMR): LocalMR {
  const validStatuses: ReqStatus[] = [
    "pending",
    "approved",
    "rejected",
    "in_procurement",
    "fulfilled",
  ];
  const rawStatus = r.status?.toLowerCase().replace(/\s+/g, "_") ?? "pending";
  const status: ReqStatus = validStatuses.includes(rawStatus as ReqStatus)
    ? (rawStatus as ReqStatus)
    : "pending";
  const rawPri = r.priority?.toLowerCase() ?? "normal";
  const priority = (
    ["urgent", "high", "normal"].includes(rawPri) ? rawPri : "normal"
  ) as "urgent" | "high" | "normal";
  return {
    id: r.reference ?? r.id,
    project: r.projectName ?? "Unknown Project",
    requestedBy: r.requestedBy ?? "Unknown",
    department: "Site",
    status,
    priority,
    submittedDate: r.requestDate
      ? formatDateByGeneralSettings(r.requestDate)
      : "",
    neededBy: "",
    totalItems: 1,
    justification: r.purpose ?? r.notes ?? "",
    items: [
      {
        material: r.materialName,
        qty: r.qty,
        unit: r.unit,
        available: 0,
        notes: r.notes ?? "",
      },
    ],
  };
}

const statusConfig: Record<
  ReqStatus,
  { label: string; badge: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending Review",
    badge: "bg-amber-100 text-amber-700",
    icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
  },
  approved: {
    label: "Approved",
    badge: "bg-green-100 text-green-700",
    icon: <CheckCircle className="w-3.5 h-3.5 text-green-600" />,
  },
  rejected: {
    label: "Rejected",
    badge: "bg-red-100 text-red-700",
    icon: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  },
  in_procurement: {
    label: "In Procurement",
    badge: "bg-blue-100 text-blue-700",
    icon: <ClipboardList className="w-3.5 h-3.5 text-blue-600" />,
  },
  fulfilled: {
    label: "Fulfilled",
    badge: "bg-gray-100 text-gray-600",
    icon: <CheckCircle className="w-3.5 h-3.5 text-gray-500" />,
  },
};

const priorityConfig = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-gray-100 text-gray-600",
};

const tabs: { key: ReqStatus | "all"; label: string }[] = [
  { key: "all", label: "All Requests" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "in_procurement", label: "In Procurement" },
  { key: "fulfilled", label: "Fulfilled" },
  { key: "rejected", label: "Rejected" },
];

const MR_FILTER_FIELDS: FilterFieldDef[] = [
  { key: "id", label: "Request ID", type: "text" },
  { key: "project", label: "Project", type: "text" },
  { key: "requestedBy", label: "Requested By", type: "text" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["pending", "approved", "rejected", "in_procurement", "fulfilled"],
  },
  {
    key: "priority",
    label: "Priority",
    type: "select",
    options: ["urgent", "high", "normal"],
  },
];

const MR_UNITS = [
  "Tonnes",
  "Bags",
  "Metres",
  "Sheets",
  "Rolls",
  "Units",
  "Cartons",
  "Litres",
  "Buckets",
];

interface MRItem {
  material: string;
  qty: string;
  unit: string;
  available: string;
  notes: string;
}

function NewMRModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (req: LocalMR) => void;
}) {
  const today = new Date();
  const fmtDate = (d: Date) => formatDateByGeneralSettings(d);
  const addDays = (n: number) => {
    const d2 = new Date(today);
    d2.setDate(d2.getDate() + n);
    return fmtDate(d2);
  };

  const [projects, setProjects] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [project, setProject] = useState("");
  const [department, setDepartment] = useState("");
  const [neededDays, setNeededDays] = useState("5");
  const [priority, setPriority] = useState<"urgent" | "high" | "normal">(
    "normal",
  );
  const [justification, setJustification] = useState("");
  const [items, setItems] = useState<MRItem[]>([
    { material: "", qty: "", unit: MR_UNITS[0], available: "", notes: "" },
  ]);

  useEffect(() => {
    getReferenceData()
      .then((data) => {
        const projectNames = data.projects.map((p) => p.name);
        const departmentNames = data.departments.map((d) => d.name);
        setProjects(projectNames);
        setDepartments(departmentNames);
        setProject((prev) => prev || projectNames[0] || "");
        setDepartment((prev) => prev || departmentNames[0] || "");
      })
      .catch(() => {});
  }, []);

  const addItem = () =>
    setItems((p) => [
      ...p,
      { material: "", qty: "", unit: MR_UNITS[0], available: "", notes: "" },
    ]);
  const removeItem = (i: number) =>
    setItems((p) => p.filter((_, j) => j !== i));
  const updateItem = (i: number, k: keyof MRItem, v: string) =>
    setItems((p) => p.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  const { getNextId } = useNumbering();
  const valid =
    project &&
    justification.trim() &&
    items.every((it) => it.material.trim() && it.qty.trim());

  function handleSave() {
    if (!valid) return;
    const nextId = getNextId("MaterialRequest");
    onSave({
      id: nextId,
      project,
      requestedBy: "Amaka Osei",
      department,
      status: "pending",
      priority,
      submittedDate: fmtDate(today),
      neededBy: addDays(parseInt(neededDays) || 5),
      totalItems: items.length,
      justification: justification.trim(),
      items: items.map((it) => ({
        material: it.material,
        qty: parseFloat(it.qty) || 0,
        unit: it.unit,
        available: parseFloat(it.available) || 0,
        notes: it.notes,
      })),
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            New Material Request
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {projects.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {departments.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Needed In (days)
              </label>
              <input
                type="number"
                min={1}
                value={neededDays}
                onChange={(e) => setNeededDays(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-0.5">
                Needed by: {addDays(parseInt(neededDays) || 5)}
              </p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={2}
              placeholder="Why are these materials needed?"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">
                Materials Requested <span className="text-red-500">*</span>
              </label>
              <button
                onClick={addItem}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_60px_80px_60px_1fr_28px] gap-1.5 items-center"
                >
                  <input
                    value={item.material}
                    onChange={(e) => updateItem(i, "material", e.target.value)}
                    placeholder="Material name"
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => updateItem(i, "qty", e.target.value)}
                    placeholder="Qty"
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(i, "unit", e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {MR_UNITS.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={item.available}
                    onChange={(e) => updateItem(i, "available", e.target.value)}
                    placeholder="Avail."
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={item.notes}
                    onChange={(e) => updateItem(i, "notes", e.target.value)}
                    placeholder="Notes (optional)"
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(i)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!valid}
            className="px-4 py-2 text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ClipboardList className="w-4 h-4" /> Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectMRModal({
  req,
  onClose,
  onDone,
}: {
  req: LocalMR;
  onClose: () => void;
  onDone: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Reject Material Request
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm">
            <span className="font-medium text-red-800">{req.id}</span> ·{" "}
            <span className="text-red-700">{req.project}</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Explain why this request is being rejected…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onDone(reason.trim())}
            disabled={!reason.trim()}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" /> Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function RaisePRModal({
  req,
  onClose,
  onDone,
}: {
  req: LocalMR;
  onClose: () => void;
  onDone: (prId: string, type: "direct" | "rfq", suppliers: string[]) => void;
}) {
  const [procType, setProcType] = useState<"direct" | "rfq">("direct");
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const { getNextId } = useNumbering();

  useEffect(() => {
    getReferenceData()
      .then((data) => {
        const supplierNames = data.suppliers.map((s) => s.name);
        setSuppliers(supplierNames);
        setSelected((prev) => (prev.length ? prev : supplierNames.slice(0, 1)));
      })
      .catch(() => {});
  }, []);

  function toggleSupplier(s: string) {
    if (procType === "direct") {
      setSelected([s]);
    } else {
      setSelected((prev) =>
        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
      );
    }
  }

  function submit() {
    if (!selected.length) return;
    const prId = getNextId("PurchaseRequest");
    onDone(prId, procType, selected);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Raise Purchase Request
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          {/* MR summary */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
            <ClipboardList className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-semibold text-blue-800">{req.id}</span>
              <span className="text-blue-600 ml-2">· {req.project}</span>
              <p className="text-xs text-blue-500 mt-0.5">
                {req.totalItems} item{req.totalItems > 1 ? "s" : ""} · Needed by{" "}
                {req.neededBy}
              </p>
            </div>
          </div>

          {/* Procurement type */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Procurement Type
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["direct", "rfq"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setProcType(t);
                    if (t === "direct")
                      setSelected([selected[0] ?? suppliers[0] ?? ""]);
                  }}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    procType === t
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p
                    className={`text-sm font-semibold ${procType === t ? "text-blue-700" : "text-gray-700"}`}
                  >
                    {t === "direct"
                      ? "Direct Procurement"
                      : "Request for Quote (RFQ)"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t === "direct"
                      ? "Single supplier — fastest turnaround"
                      : "Multiple suppliers compete on price"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Supplier selection */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {procType === "direct"
                ? "Select Supplier"
                : "Select Suppliers (RFQ will be sent to all)"}
            </p>
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {suppliers.map((s) => {
                const isSelected = selected.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleSupplier(s)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0 ${
                      isSelected ? "bg-blue-50" : ""
                    }`}
                  >
                    <span
                      className={
                        isSelected
                          ? "text-blue-700 font-medium"
                          : "text-gray-700"
                      }
                    >
                      {s}
                    </span>
                    {isSelected && (
                      <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {selected.length} supplier{selected.length !== 1 ? "s" : ""}{" "}
              selected
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!selected.length}
            className="px-4 py-2 text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" /> Create Purchase Request
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Success toast ──────────────────────────────────────────────────────────────
function PRCreatedToast({
  prId,
  onClose,
}: {
  prId: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-white border border-green-200 rounded-2xl shadow-xl px-5 py-4 flex items-start gap-3 w-80">
      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900">
          Purchase Request Created
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          <span className="font-semibold text-blue-600">{prId}</span> has been
          raised and is pending approval.
        </p>
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function MaterialRequestsPage() {
  const [reqList, setReqList] = useState<LocalMR[]>([]);
  const [loading, setLoading] = useState(true);
  const [raisePRFor, setRaisePRFor] = useState<LocalMR | null>(null);
  const [prToast, setPrToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ReqStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [advFilters, setAdvFilters] = useState<ActiveFilters>({});
  const [advSort, setAdvSort] = useState<SortConfig>(null);
  const [showNewMR, setShowNewMR] = useState(false);
  const [rejectReq, setRejectReq] = useState<LocalMR | null>(null);

  useEffect(() => {
    getMaterialRequests()
      .then((data) => setReqList(data.map(fromApiMR)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = applyFiltersAndSort(
    reqList.filter((r) => {
      const matchTab = activeTab === "all" || r.status === activeTab;
      const matchSearch =
        r.id.toLowerCase().includes(search.toLowerCase()) ||
        r.project.toLowerCase().includes(search.toLowerCase()) ||
        r.requestedBy.toLowerCase().includes(search.toLowerCase());
      return matchTab && matchSearch;
    }),
    advFilters,
    advSort,
  );

  if (loading)
    return (
      <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
    );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Material Requests
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Review, approve, and track material issuance requests from site
          </p>
        </div>
        <button
          onClick={() => setShowNewMR(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-md text-sm hover:bg-blue-800"
        >
          <Plus className="w-3.5 h-3.5" /> New Request
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => {
          const count =
            tab.key === "all"
              ? reqList.length
              : reqList.filter((r) => r.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? "border-blue-700 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {tab.label}{" "}
              <span
                className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search requests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <AdvancedFilter
          fields={MR_FILTER_FIELDS}
          filters={advFilters}
          onFiltersChange={setAdvFilters}
          sort={advSort}
          onSortChange={setAdvSort}
        />
        <span className="text-xs text-gray-400">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map((req) => {
          const cfg = statusConfig[req.status] ?? {
            badge: "bg-gray-100 text-gray-700",
            icon: null,
            label: String(req.status ?? "Unknown"),
          };
          const isExpanded = expanded === req.id;
          return (
            <div
              key={req.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(isExpanded ? null : req.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">
                      {req.id}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${priorityConfig[req.priority]}`}
                    >
                      {req.priority}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${cfg.badge}`}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{req.project}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    By {req.requestedBy} · {req.department} · {req.totalItems}{" "}
                    item{req.totalItems > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-500">
                    Submitted: {req.submittedDate}
                  </p>
                  <p className="text-xs font-medium text-gray-700 mt-0.5">
                    Needed by: {req.neededBy}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50">
                  <div className="px-5 py-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Justification
                        </p>
                        <p className="text-sm text-gray-700">
                          {req.justification}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Request Details
                        </p>
                        <div className="space-y-1 text-sm">
                          <div className="flex gap-4">
                            <span className="text-gray-500 w-24">
                              Request ID
                            </span>
                            <span className="font-medium text-gray-900">
                              {req.id}
                            </span>
                          </div>
                          <div className="flex gap-4">
                            <span className="text-gray-500 w-24">Project</span>
                            <span className="font-medium text-gray-900">
                              {req.project}
                            </span>
                          </div>
                          <div className="flex gap-4">
                            <span className="text-gray-500 w-24">
                              Requested by
                            </span>
                            <span className="font-medium text-gray-900">
                              {req.requestedBy}
                            </span>
                          </div>
                          <div className="flex gap-4">
                            <span className="text-gray-500 w-24">
                              Needed by
                            </span>
                            <span className="font-medium text-gray-900">
                              {req.neededBy}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Requested Materials
                      </p>
                      <table className="w-full text-sm bg-white rounded-md border border-gray-200">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-left">
                            <th className="px-3 py-2 text-xs font-medium text-gray-500">
                              Material
                            </th>
                            <th className="px-3 py-2 text-xs font-medium text-gray-500 text-right">
                              Requested
                            </th>
                            <th className="px-3 py-2 text-xs font-medium text-gray-500 text-right">
                              Available
                            </th>
                            <th className="px-3 py-2 text-xs font-medium text-gray-500">
                              Notes
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {req.items.map((item, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium text-gray-900">
                                {item.material}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-gray-900">
                                {formatNumberByGeneralSettings(item.qty)}{" "}
                                {item.unit}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span
                                  className={
                                    item.available >= item.qty
                                      ? "text-green-700 font-medium"
                                      : item.available > 0
                                        ? "text-amber-600 font-medium"
                                        : "text-red-600 font-medium"
                                  }
                                >
                                  {formatNumberByGeneralSettings(
                                    item.available,
                                  )}{" "}
                                  {item.unit}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-500">
                                {item.notes}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {req.status === "pending" && (
                      <div className="flex gap-2 mt-4 justify-end">
                        <button
                          onClick={() => setRejectReq(req)}
                          className="px-4 py-2 text-sm border border-red-200 text-red-700 rounded-md hover:bg-red-50"
                        >
                          Reject
                        </button>
                        <button className="px-4 py-2 text-sm border border-blue-200 text-blue-700 rounded-md hover:bg-blue-50">
                          Request More Info
                        </button>
                        <button
                          onClick={() =>
                            setReqList((prev) =>
                              prev.map((r) =>
                                r.id === req.id
                                  ? { ...r, status: "approved" as const }
                                  : r,
                              ),
                            )
                          }
                          className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          Approve Request
                        </button>
                      </div>
                    )}
                    {req.status === "approved" && (
                      <div className="flex gap-2 mt-4 justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRaisePRFor(req);
                          }}
                          className="px-4 py-2 text-sm bg-blue-700 text-white rounded-md hover:bg-blue-800 flex items-center gap-2"
                        >
                          <ShoppingCart className="w-4 h-4" /> Raise Purchase
                          Request
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No requests found</p>
          </div>
        )}
      </div>

      {showNewMR && (
        <NewMRModal
          onClose={() => setShowNewMR(false)}
          onSave={(req) => {
            setReqList((prev) => [req, ...prev]);
            setShowNewMR(false);
          }}
        />
      )}
      {rejectReq && (
        <RejectMRModal
          req={rejectReq}
          onClose={() => setRejectReq(null)}
          onDone={(_reason) => {
            setReqList((prev) =>
              prev.map((r) =>
                r.id === rejectReq.id
                  ? { ...r, status: "rejected" as const }
                  : r,
              ),
            );
            setRejectReq(null);
          }}
        />
      )}
      {raisePRFor && (
        <RaisePRModal
          req={raisePRFor}
          onClose={() => setRaisePRFor(null)}
          onDone={(prId, _type, _suppliers) => {
            setReqList((prev) =>
              prev.map((r) =>
                r.id === raisePRFor.id
                  ? { ...r, status: "in_procurement" as const }
                  : r,
              ),
            );
            setPrToast(prId);
            setTimeout(() => setPrToast(null), 5000);
          }}
        />
      )}
      {prToast && (
        <PRCreatedToast prId={prToast} onClose={() => setPrToast(null)} />
      )}
    </div>
  );
}
