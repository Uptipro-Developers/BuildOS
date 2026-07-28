import { useState, useEffect } from "react";
import {
  getPurchaseRequests,
  PurchaseRequest as ApiPR,
} from "../../api/procurement-requests";
import {
  ShoppingCart,
  Plus,
  CheckCircle,
  X,
  Trash2,
  Send,
  Download,
  Users,
} from "lucide-react";
import { DataTable, type Column } from "../../components/DataTable";
import { useChangelog } from "../../stores/changelogStore";
import { exportCSV } from "../../utils/exportCSV";
import {
  AdvancedFilter,
  applyFiltersAndSort,
  type FilterFieldDef,
  type ActiveFilters,
  type SortConfig,
} from "../../components/AdvancedFilter";
import { useNumbering } from "../../stores/numberingStore";
import { getReferenceData } from "../../api/reference-data";
import {
  getCurrencySymbol,
  formatDateByGeneralSettings,
} from "../../utils/generalSettings";

// ── Types ─────────────────────────────────────────────────────────────────────
type PRStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "sent_to_suppliers"
  | "quotes_received"
  | "po_created"
  | "cancelled";
type SupplierStatus =
  | "not_sent"
  | "request_sent"
  | "quote_received"
  | "po_created"
  | "approved"
  | "paid"
  | "delivered";

interface SupplierProgress {
  supplier: string;
  status: SupplierStatus;
  sentDate?: string;
  quoteRef?: string;
  quoteAmount?: number;
  poRef?: string;
}

interface PRItem {
  material: string;
  qty: number;
  unit: string;
  estimatedUnitCost: number;
}

interface PurchaseRequest {
  id: string;
  materialRequestRef: string;
  project: string;
  raisedBy: string;
  procurementType: "direct" | "rfq";
  status: PRStatus;
  raisedDate: string;
  requiredDate: string;
  totalItems: number;
  estimatedValue: number;
  suppliers: SupplierProgress[];
  items: PRItem[];
}

// ── API mapper ────────────────────────────────────────────────────────────────
function fromApi(r: ApiPR): PurchaseRequest {
  const validStatuses: PRStatus[] = [
    "draft",
    "pending_approval",
    "approved",
    "sent_to_suppliers",
    "quotes_received",
    "po_created",
    "cancelled",
  ];
  const rawStatus = r.status?.toLowerCase().replace(/\s+/g, "_") ?? "draft";
  const status: PRStatus = validStatuses.includes(rawStatus as PRStatus)
    ? (rawStatus as PRStatus)
    : "draft";
  return {
    id: r.id,
    materialRequestRef: r.prRef ?? r.id,
    project: r.projectName ?? "Unknown Project",
    raisedBy: r.requestedBy ?? "Unknown",
    procurementType: "rfq",
    status,
    raisedDate: r.createdAt ? formatDateByGeneralSettings(r.createdAt) : "",
    requiredDate: r.daysToDeliver
      ? formatDateByGeneralSettings(Date.now() + r.daysToDeliver * 86400000)
      : "",
    totalItems: r.items?.length ?? 0,
    estimatedValue:
      r.items?.reduce(
        (sum, it) => sum + (it.qty ?? 0) * (it.unitPrice ?? 0),
        0,
      ) ?? 0,
    suppliers: [],
    items: (r.items ?? []).map((it) => ({
      material: it.description ?? "",
      qty: it.qty ?? 0,
      unit: it.unit ?? "Units",
      estimatedUnitCost: it.unitPrice ?? 0,
    })),
  };
}

function fmt(n: number) {
  const symbol = getCurrencySymbol();
  if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${symbol}${(n / 1000).toFixed(0)}K`;
  return `${symbol}${n}`;
}

const PR_STATUS_CFG: Record<PRStatus, { label: string; badge: string }> = {
  draft: { label: "Draft", badge: "bg-gray-100 text-gray-600" },
  pending_approval: {
    label: "Pending Approval",
    badge: "bg-amber-100 text-amber-700",
  },
  approved: { label: "Approved", badge: "bg-green-100 text-green-700" },
  sent_to_suppliers: {
    label: "Sent to Suppliers",
    badge: "bg-blue-100 text-blue-700",
  },
  quotes_received: {
    label: "Quotes Received",
    badge: "bg-purple-100 text-purple-700",
  },
  po_created: { label: "PO Created", badge: "bg-teal-100 text-teal-700" },
  cancelled: { label: "Cancelled", badge: "bg-red-100 text-red-700" },
};

const TABS: { key: PRStatus | "all"; label: string }[] = [
  { key: "all", label: "All PRs" },
  { key: "draft", label: "Draft" },
  { key: "pending_approval", label: "Pending Approval" },
  { key: "approved", label: "Approved" },
  { key: "sent_to_suppliers", label: "Sent to Suppliers" },
  { key: "quotes_received", label: "Quotes Received" },
  { key: "po_created", label: "PO Created" },
];

const PR_FILTER_FIELDS: FilterFieldDef[] = [
  { key: "id", label: "PR Number", type: "text" },
  { key: "project", label: "Project", type: "text" },
  { key: "materialRequestRef", label: "MR Ref", type: "text" },
  {
    key: "procurementType",
    label: "Type",
    type: "select",
    options: ["direct", "rfq"],
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      "draft",
      "pending_approval",
      "approved",
      "sent_to_suppliers",
      "quotes_received",
      "po_created",
      "cancelled",
    ],
  },
];

const PR_UNITS = [
  "Tonnes",
  "Bags",
  "Metres",
  "Sheets",
  "Rolls",
  "Units",
  "Cartons",
  "Litres",
];

// ── New PR modal ──────────────────────────────────────────────────────────────
interface NewPRItemForm {
  material: string;
  qty: string;
  unit: string;
  estimatedUnitCost: string;
}

function NewPRModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (pr: PurchaseRequest) => void;
}) {
  const today = new Date();
  const fmtDate = (d: Date) => formatDateByGeneralSettings(d);
  const addDays = (n: number) => {
    const d2 = new Date(today);
    d2.setDate(d2.getDate() + n);
    return fmtDate(d2);
  };

  const [projects, setProjects] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [project, setProject] = useState("");
  const [mrRef, setMrRef] = useState("MR-0041");
  const [procType, setProcType] = useState<"direct" | "rfq">("direct");
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [daysToDeliver, setDaysToDeliver] = useState("7");
  const [items, setItems] = useState<NewPRItemForm[]>([
    { material: "", qty: "", unit: PR_UNITS[0], estimatedUnitCost: "" },
  ]);

  useEffect(() => {
    getReferenceData()
      .then((data) => {
        const projectNames = data.projects.map((p) => p.name);
        const supplierNames = data.suppliers.map((s) => s.name);
        setProjects(projectNames);
        setSuppliers(supplierNames);
        setProject((prev) => prev || projectNames[0] || "");
        setSelectedSuppliers((prev) =>
          prev.length ? prev : supplierNames.slice(0, 1),
        );
      })
      .catch(() => {});
  }, []);

  function toggleSupplier(s: string) {
    if (procType === "direct") {
      setSelectedSuppliers([s]);
    } else {
      setSelectedSuppliers((prev) =>
        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
      );
    }
  }

  const { getNextId } = useNumbering();
  const valid =
    project &&
    mrRef.trim() &&
    items.every((it) => it.material.trim() && it.qty.trim());

  function save() {
    if (!valid || !selectedSuppliers.length) return;
    const id = getNextId("PurchaseRequest");
    const total = items.reduce(
      (s, it) =>
        s + parseFloat(it.qty) * parseFloat(it.estimatedUnitCost || "0"),
      0,
    );
    onSave({
      id,
      materialRequestRef: mrRef,
      project,
      raisedBy: "Amaka Osei",
      procurementType: procType,
      status: "draft",
      raisedDate: fmtDate(today),
      requiredDate: addDays(parseInt(daysToDeliver) || 7),
      totalItems: items.length,
      estimatedValue: total,
      suppliers: selectedSuppliers.map((s) => ({
        supplier: s,
        status: "not_sent" as SupplierStatus,
      })),
      items: items.map((it) => ({
        material: it.material,
        qty: parseFloat(it.qty) || 0,
        unit: it.unit,
        estimatedUnitCost: parseFloat(it.estimatedUnitCost) || 0,
      })),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            New Purchase Request
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {projects.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                MR Reference
              </label>
              <input
                value={mrRef}
                onChange={(e) => setMrRef(e.target.value)}
                placeholder="e.g. MR-0041"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Required in (days)
              </label>
              <input
                type="number"
                min={1}
                value={daysToDeliver}
                onChange={(e) => setDaysToDeliver(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-0.5">
                Required by: {addDays(parseInt(daysToDeliver) || 7)}
              </p>
            </div>
          </div>

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
                      setSelectedSuppliers([
                        selectedSuppliers[0] ?? suppliers[0] ?? "",
                      ]);
                  }}
                  className={`p-3 rounded-xl border text-left ${procType === t ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
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
                      ? "Single supplier chosen directly"
                      : "Multiple suppliers invited to quote"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {procType === "direct"
                ? "Select Supplier"
                : "Select Suppliers for RFQ"}
            </p>
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
              {suppliers.map((s) => {
                const sel = selectedSuppliers.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleSupplier(s)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0 ${sel ? "bg-blue-50" : ""}`}
                  >
                    <span
                      className={
                        sel ? "text-blue-700 font-medium" : "text-gray-700"
                      }
                    >
                      {s}
                    </span>
                    {sel && <CheckCircle className="w-4 h-4 text-blue-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Line Items <span className="text-red-500">*</span>
              </p>
              <button
                onClick={() =>
                  setItems((p) => [
                    ...p,
                    {
                      material: "",
                      qty: "",
                      unit: PR_UNITS[0],
                      estimatedUnitCost: "",
                    },
                  ])
                }
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_60px_80px_90px_28px] gap-1.5 items-center"
                >
                  <input
                    value={it.material}
                    onChange={(e) =>
                      setItems((p) =>
                        p.map((x, j) =>
                          j === i ? { ...x, material: e.target.value } : x,
                        ),
                      )
                    }
                    placeholder="Material"
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={it.qty}
                    onChange={(e) =>
                      setItems((p) =>
                        p.map((x, j) =>
                          j === i ? { ...x, qty: e.target.value } : x,
                        ),
                      )
                    }
                    placeholder="Qty"
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={it.unit}
                    onChange={(e) =>
                      setItems((p) =>
                        p.map((x, j) =>
                          j === i ? { ...x, unit: e.target.value } : x,
                        ),
                      )
                    }
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PR_UNITS.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={it.estimatedUnitCost}
                    onChange={(e) =>
                      setItems((p) =>
                        p.map((x, j) =>
                          j === i
                            ? { ...x, estimatedUnitCost: e.target.value }
                            : x,
                        ),
                      )
                    }
                    placeholder={`Unit ${getCurrencySymbol()}`}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {items.length > 1 && (
                    <button
                      onClick={() =>
                        setItems((p) => p.filter((_, j) => j !== i))
                      }
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
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!valid || !selectedSuppliers.length}
            className="px-4 py-2 text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create PR
          </button>
        </div>
      </div>
    </div>
  );
}

function SendToSuppliersModal({
  pr,
  onClose,
  onSend,
}: {
  pr: PurchaseRequest;
  onClose: () => void;
  onSend: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Send to Suppliers
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm">
            <p className="font-medium text-blue-800">
              {pr.id} · {pr.project}
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              {pr.procurementType === "rfq"
                ? "Request for Quote"
                : "Direct Procurement"}{" "}
              · {pr.suppliers.length} supplier
              {pr.suppliers.length > 1 ? "s" : ""}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Will be sent to:
            </p>
            <div className="space-y-1">
              {pr.suppliers.map((s) => (
                <div
                  key={s.supplier}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm"
                >
                  <Users className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-700">{s.supplier}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500">
            {pr.procurementType === "rfq"
              ? "Each supplier will receive the material requirements and be asked to submit a quote."
              : "The selected supplier will receive the purchase request directly."}
          </p>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSend();
              onClose();
            }}
            className="px-4 py-2 text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 flex items-center gap-2"
          >
            <Send className="w-4 h-4" /> Confirm & Send
          </button>
        </div>
      </div>
    </div>
  );
}

export function PurchaseRequestsPage() {
  const { logChange } = useChangelog();
  const [prList, setPrList] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPurchaseRequests()
      .then((data) => setPrList(data.map(fromApi)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);
  const [activeTab, setActiveTab] = useState<PRStatus | "all">("all");
  const [showNewPR, setShowNewPR] = useState(false);
  const [sendFor, setSendFor] = useState<PurchaseRequest | null>(null);
  const [advFilters, setAdvFilters] = useState<ActiveFilters>({});
  const [advSort, setAdvSort] = useState<SortConfig>(null);

  const filtered = applyFiltersAndSort(
    prList.filter((pr) => {
      const matchTab = activeTab === "all" || pr.status === activeTab;
      return matchTab;
    }),
    advFilters,
    advSort,
  );

  const columns: Column<PurchaseRequest>[] = [
    {
      key: "id",
      label: "PR ID",
      sortable: true,
      filterable: true,
      render: (pr) => <span className="font-mono text-sm">{pr.id}</span>,
    },
    {
      key: "project",
      label: "Title / Description",
      sortable: true,
      filterable: true,
      minWidth: 200,
      render: (pr) => (
        <div>
          <p className="font-medium text-gray-900">{pr.project}</p>
          <p className="text-xs text-gray-400">{pr.materialRequestRef}</p>
        </div>
      ),
    },
    {
      key: "raisedBy",
      label: "Requester",
      sortable: true,
      filterable: true,
      render: (pr) => pr.raisedBy,
    },
    {
      key: "department",
      label: "Department",
      sortable: true,
      filterable: true,
      render: (pr) => pr.project,
    },
    {
      key: "estimatedValue",
      label: "Total ($)",
      sortable: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (pr) => (
        <span className="font-semibold">{fmt(pr.estimatedValue)}</span>
      ),
    },
    {
      key: "raisedDate",
      label: "Date",
      sortable: true,
      render: (pr) => pr.raisedDate,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      filterable: true,
      render: (pr) => {
        const cfg = PR_STATUS_CFG[pr.status] ?? {
          badge: "bg-gray-100 text-gray-700",
          label: String(pr.status ?? "Unknown"),
        };
        return (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}
          >
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      filterable: false,
      render: (pr) => (
        <div className="flex items-center gap-1">
          {pr.status === "pending_approval" && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  rejectPR(pr.id);
                }}
                className="px-2 py-1 text-xs border border-red-200 text-red-700 rounded hover:bg-red-50"
              >
                Reject
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  approvePR(pr.id);
                }}
                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                Approve
              </button>
            </>
          )}
          {pr.status === "approved" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSendFor(pr);
              }}
              className="px-2 py-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-800 flex items-center gap-1"
            >
              <Send className="w-3 h-3" /> Send
            </button>
          )}
          {(pr.status === "quotes_received" ||
            pr.status === "sent_to_suppliers") && (
            <button
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="px-2 py-1 text-xs bg-purple-700 text-white rounded hover:bg-purple-800 flex items-center gap-1"
            >
              <ShoppingCart className="w-3 h-3" /> PO
            </button>
          )}
        </div>
      ),
    },
  ];

  function approvePR(id: string) {
    setPrList((prev) =>
      prev.map((pr) =>
        pr.id === id ? { ...pr, status: "approved" as PRStatus } : pr,
      ),
    );
    logChange({
      module: "procurement",
      action: "approved",
      entityType: "purchase_request",
      entityId: id,
      summary: `Approved PR ${id}`,
      performedBy: "Amaka Osei",
    });
  }

  function rejectPR(id: string) {
    setPrList((prev) =>
      prev.map((pr) =>
        pr.id === id ? { ...pr, status: "cancelled" as PRStatus } : pr,
      ),
    );
    logChange({
      module: "procurement",
      action: "rejected",
      entityType: "purchase_request",
      entityId: id,
      summary: `Rejected PR ${id}`,
      performedBy: "Amaka Osei",
    });
  }

  function sendToSuppliers(id: string) {
    const now = formatDateByGeneralSettings(new Date());
    setPrList((prev) =>
      prev.map((pr) =>
        pr.id !== id
          ? pr
          : {
              ...pr,
              status: "sent_to_suppliers" as PRStatus,
              suppliers: pr.suppliers.map((s) => ({
                ...s,
                status: "request_sent" as SupplierStatus,
                sentDate: now,
              })),
            },
      ),
    );
    logChange({
      module: "procurement",
      action: "sent_to_suppliers",
      entityType: "purchase_request",
      entityId: id,
      summary: `Sent PR ${id} to suppliers`,
      performedBy: "Amaka Osei",
    });
  }

  function handleExport() {
    exportCSV(
      "purchase-requests",
      [
        "PR ID",
        "Title / Description",
        "Requester",
        "Department",
        "Total",
        "Date",
        "Status",
      ],
      filtered.map((pr) => [
        pr.id,
        pr.project,
        pr.raisedBy,
        pr.project,
        fmt(pr.estimatedValue),
        pr.raisedDate,
        PR_STATUS_CFG[pr.status].label,
      ]),
    );
  }

  function handleCreatePR(pr: PurchaseRequest) {
    setPrList((prev) => [pr, ...prev]);
    setShowNewPR(false);
    logChange({
      module: "procurement",
      action: "created",
      entityType: "purchase_request",
      entityId: pr.id,
      summary: `Created PR ${pr.id} for ${pr.project}`,
      performedBy: "Amaka Osei",
    });
  }

  if (loading)
    return (
      <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
    );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Purchase Requests
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Multi-supplier sourcing — track each vendor independently from
            request to delivery
          </p>
        </div>
        <button
          onClick={() => setShowNewPR(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-md text-sm hover:bg-blue-800"
        >
          <Plus className="w-3.5 h-3.5" /> New PR
        </button>
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => {
          const count =
            tab.key === "all"
              ? prList.length
              : prList.filter((pr) => pr.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "border-blue-700 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <AdvancedFilter
          fields={PR_FILTER_FIELDS}
          filters={advFilters}
          onFiltersChange={setAdvFilters}
          sort={advSort}
          onSortChange={setAdvSort}
        />
        <span className="text-xs text-gray-400">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <DataTable<PurchaseRequest>
        columns={columns}
        data={filtered}
        keyExtractor={(pr) => pr.id}
        searchPlaceholder="Search PRs, projects, references…"
        searchFields={[
          (pr) => pr.id,
          (pr) => pr.project,
          (pr) => pr.raisedBy,
          (pr) => pr.materialRequestRef,
        ]}
        headerExtra={
          <button
            onClick={handleExport}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-100"
          >
            <Download className="w-3 h-3" /> Export
          </button>
        }
      />

      {showNewPR && (
        <NewPRModal
          onClose={() => setShowNewPR(false)}
          onSave={handleCreatePR}
        />
      )}

      {sendFor && (
        <SendToSuppliersModal
          pr={sendFor}
          onClose={() => setSendFor(null)}
          onSend={() => sendToSuppliers(sendFor.id)}
        />
      )}
    </div>
  );
}
