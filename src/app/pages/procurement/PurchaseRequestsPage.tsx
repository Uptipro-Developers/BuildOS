import { notifyLoadFailure } from "../../utils/loadFailure";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  getPurchaseRequests,
  createPurchaseRequest,
  updatePurchaseRequest,
  deletePurchaseRequest,
  createSentRFQ,
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
  Eye,
} from "lucide-react";
import { DataTable, type Column } from "../../components/DataTable";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { useApprovalRights } from "../../utils/useApprovalRights";
import { useAuthUser, getAuthUserName } from "../../utils/useAuthUser";
import { toast } from "sonner";
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
import { useProcurementUnits } from "../../utils/useProcurementUnits";
import { getReferenceData } from "../../api/reference-data";
import { fetchProjects } from "../../api/projects";
import { getMaterialRequests } from "../../api/materials";
import { baseMaterialRequestRef } from "../../utils/materialRequestRef";
import {
  csvAmountHeader,
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

const VALID_SUPPLIER_STATUSES: SupplierStatus[] = [
  "not_sent",
  "request_sent",
  "quote_received",
  "po_created",
  "approved",
  "paid",
  "delivered",
];

interface SupplierProgress {
  supplier: string;
  /** Needed to send this supplier an RFQ — the server resolves the email by id. */
  supplierId?: string;
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
  /** The request's own human reference (PR-0019), used on RFQs and quotes. */
  prRef: string;
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
    prRef: r.prRef ?? r.id,
    // The originating material request. This field showed `r.prRef` — the
    // request's own reference — so the column headed "Material Request" never
    // once displayed a material request.
    materialRequestRef: r.mrRef ?? "",
    project: r.projectName ?? "Unknown Project",
    raisedBy: r.requestedBy ?? "Unknown",
    procurementType: r.procurementType === "direct" ? "direct" : "rfq",
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
    // Was hardcoded empty, which left "Send to Suppliers" mapping over nothing.
    suppliers: (r.suppliers ?? []).map((s) => ({
      supplier: s.supplier,
      supplierId: s.supplierId,
      status: (VALID_SUPPLIER_STATUSES.includes(s.status as SupplierStatus)
        ? s.status
        : "not_sent") as SupplierStatus,
      sentDate: s.sentDate,
      quoteRef: s.quoteRef,
      quoteAmount: s.quoteAmount,
      poRef: s.poRef,
    })),
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
  // Filters on the reference, not the database id, which is what "PR Number"
  // means to anyone using this screen.
  { key: "prRef", label: "PR Number", type: "text" },
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

// ── New PR modal ──────────────────────────────────────────────────────────────
interface NewPRItemForm {
  material: string;
  qty: string;
  unit: string;
  estimatedUnitCost: string;
}

interface NewPRPayload {
  title: string;
  projectId?: string;
  projectName: string;
  requestedBy: string;
  daysToDeliver: number;
  /** The material request this covers, if it was raised against one. */
  mrRef?: string;
  procurementType: "direct" | "rfq";
  suppliers: SupplierProgress[];
  items: {
    description: string;
    qty: number;
    unit: string;
    unitPrice: number;
  }[];
}

function NewPRModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (payload: NewPRPayload) => void;
}) {
  const today = new Date();
  const fmtDate = (d: Date) => formatDateByGeneralSettings(d);
  const addDays = (n: number) => {
    const d2 = new Date(today);
    d2.setDate(d2.getDate() + n);
    return fmtDate(d2);
  };

  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  /** Supplier ids by name — the RFQ send needs the id, the picker shows names. */
  const [supplierIds, setSupplierIds] = useState<Record<string, string>>({});
  // The material catalogue, so a PR line can only reference a material that
  // already exists rather than a free-typed name.
  const [materialOptions, setMaterialOptions] = useState<
    { name: string; unit: string }[]
  >([]);
  const [project, setProject] = useState("");
  const [mrRef, setMrRef] = useState("");
  /** References of material requests that could justify this request. */
  const [materialRequestRefs, setMaterialRequestRefs] = useState<string[]>([]);
  const [procType, setProcType] = useState<"direct" | "rfq">("direct");
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [daysToDeliver, setDaysToDeliver] = useState("7");
  const units = useProcurementUnits();
  const [items, setItems] = useState<NewPRItemForm[]>([
    { material: "", qty: "", unit: units[0], estimatedUnitCost: "" },
  ]);

  // Projects come from /projects directly so the dropdown always reflects the
  // real project list; suppliers still come from the reference-data bundle.
  useEffect(() => {
    fetchProjects()
      .then((rows) => {
        const list = rows.map((p) => ({ id: p.id, name: p.name }));
        setProjects(list);
        setProject((prev) => prev || list[0]?.name || "");
      })
      .catch(() => {});

    getReferenceData()
      .then((data) => {
        const supplierNames = data.suppliers.map((s) => s.name);
        setSuppliers(supplierNames);
        setSupplierIds(
          Object.fromEntries(data.suppliers.map((s) => [s.name, s.id])),
        );
        setSelectedSuppliers((prev) =>
          prev.length ? prev : supplierNames.slice(0, 1),
        );
        setMaterialOptions(
          (data.materials ?? [])
            .map((m) => ({ name: m.name, unit: m.unit ?? "" }))
            .filter((m) => m.name),
        );
      })
      .catch(() => {});

    getMaterialRequests()
      .then((rows) =>
        setMaterialRequestRefs([
          ...new Set(
            rows
              .map((r) => baseMaterialRequestRef(r.reference))
              .filter((ref): ref is string => Boolean(ref)),
          ),
        ]),
      )
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

  const { allocate } = useNumbering();
  // The material request is optional: a purchase request can be raised on its
  // own. It was previously required, against a field prefilled with a made-up
  // reference, so the only way to satisfy it was to submit the placeholder.
  const valid =
    project && items.every((it) => it.material.trim() && it.qty.trim());

  async function save() {
    if (!valid || !selectedSuppliers.length) return;
    // Consumes the next PR number for the numbering config's sequence, even
    // though PurchaseRequest has no field of its own to store it in yet.
    await allocate("PurchaseRequest");
    onSave({
      title: mrRef.trim()
        ? `${project} — ${mrRef.trim()}`
        : `Purchase Request — ${project}`,
      projectId: projects.find((p) => p.name === project)?.id,
      projectName: project,
      requestedBy: getAuthUserName() || "Current User",
      daysToDeliver: parseInt(daysToDeliver) || 7,
      // The form has always collected these three; nothing was ever sent, so a
      // request created here opened with no suppliers and "Send to Suppliers"
      // had nothing to send to.
      mrRef: mrRef.trim() || undefined,
      procurementType: procType,
      suppliers: selectedSuppliers.map((name) => ({
        supplier: name,
        supplierId: supplierIds[name],
        status: "not_sent" as SupplierStatus,
      })),
      items: items.map((it) => ({
        description: it.material,
        qty: parseFloat(it.qty) || 0,
        unit: it.unit,
        unitPrice: parseFloat(it.estimatedUnitCost) || 0,
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
                <option value="">Select a project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Material Request
              </label>
              {/* Chosen from the real list rather than typed. A free-text
                  reference defaulted to "MR-0041" and was never validated, so it
                  could name a request that does not exist — or, as shipped, one
                  that never did. */}
              <select
                value={mrRef}
                onChange={(e) => setMrRef(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None — raised directly</option>
                {materialRequestRefs.map((ref) => (
                  <option key={ref} value={ref}>
                    {ref}
                  </option>
                ))}
              </select>
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
                      unit: units[0],
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
                  <select
                    value={it.material}
                    onChange={(e) => {
                      const name = e.target.value;
                      setItems((p) =>
                        p.map((x, j) =>
                          j === i ? { ...x, material: name } : x,
                        ),
                      );
                      // Adopt the catalogue's unit for the chosen material.
                      const chosen = materialOptions.find(
                        (m) => m.name === name,
                      );
                      if (chosen?.unit) {
                        setItems((p) =>
                          p.map((x, j) =>
                            j === i ? { ...x, unit: chosen.unit } : x,
                          ),
                        );
                      }
                    }}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">
                      {materialOptions.length === 0
                        ? "No materials in the catalogue"
                        : "Select material…"}
                    </option>
                    {materialOptions.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
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
                    {Array.from(
                      new Set([...units, it.unit].filter(Boolean)),
                    ).map((u) => (
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
  sending,
}: {
  pr: PurchaseRequest;
  onClose: () => void;
  onSend: () => void;
  sending: boolean;
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
              {pr.prRef} · {pr.project}
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
            disabled={sending || pr.suppliers.length === 0}
            className="px-4 py-2 text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />{" "}
            {sending ? "Sending…" : "Confirm & Send"}
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
      .catch((err) => notifyLoadFailure("purchase requests", err))
      .finally(() => setLoading(false));
  }, []);
  const [activeTab, setActiveTab] = useState<PRStatus | "all">("all");
  const [showNewPR, setShowNewPR] = useState(false);
  const [sendFor, setSendFor] = useState<PurchaseRequest | null>(null);
  /** Id of the request currently being sent, so the button can't be double-fired. */
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [viewPR, setViewPR] = useState<PurchaseRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseRequest | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [advFilters, setAdvFilters] = useState<ActiveFilters>({});
  const [advSort, setAdvSort] = useState<SortConfig>(null);

  const navigate = useNavigate();
  const { canApprove } = useApprovalRights();
  const authUser = useAuthUser();
  /** Purchase Requests process id from the backend process catalog. */
  const mayApprovePRs = canApprove("p_purchase_requests");

  /**
   * Whether the signed-in user raised this request. Matched on name or email,
   * the same two identities the server compares `requestedBy` against.
   */
  const raisedByMe = (pr: PurchaseRequest) => {
    const raised = String(pr.raisedBy ?? "").trim().toLowerCase();
    if (!raised) return false;
    return [authUser.name, authUser.email]
      .map((v) => String(v ?? "").trim().toLowerCase())
      .filter(Boolean)
      .includes(raised);
  };

  /** Deletes the request, then re-reads so the table reflects the database. */
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePurchaseRequest(deleteTarget.id);
      setPrList((prev) => prev.filter((pr) => pr.id !== deleteTarget.id));
      toast.success(`Purchase request ${deleteTarget.prRef} deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not delete the purchase request.",
      );
    } finally {
      setDeleting(false);
    }
  }

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
      key: "prRef",
      label: "PR ID",
      sortable: true,
      filterable: true,
      // The request's reference, not its database id. This column rendered
      // `pr.id` — a cuid — under the heading "PR ID".
      render: (pr) => <span className="font-mono text-sm">{pr.prRef}</span>,
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
          {pr.materialRequestRef && (
            <p className="text-xs text-gray-400">
              from {pr.materialRequestRef}
            </p>
          )}
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
      /**
       * Every row gets View and Delete; the rest depend on where the request is in
       * its lifecycle.
       *
       * Previously the whole cell was status-conditional, so a draft, cancelled or
       * po_created row rendered an empty Actions column — four of the seven statuses
       * showed nothing at all. There was also no way to view or delete a request,
       * and the PO button had an empty handler.
       */
      render: (pr) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setViewPR(pr);
            }}
            title="View this request"
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <Eye className="w-4 h-4" />
          </button>
          {pr.status === "draft" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                submitPRForApproval(pr.id);
              }}
              title="Submit this request for approval"
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Submit for Approval
            </button>
          )}
          {/* A requester may not decide their own request — the server enforces
              this and returns 403. Surfaced here so the button is not offered
              only to fail on click. */}
          {pr.status === "pending_approval" && mayApprovePRs && raisedByMe(pr) && (
            <span
              className="px-2 py-1 text-xs text-gray-400 italic"
              title="You raised this request, so it must be approved by someone else."
            >
              Awaiting another approver
            </span>
          )}
          {pr.status === "pending_approval" &&
            !raisedByMe(pr) &&
            (mayApprovePRs ? (
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
            ) : (
              <span
                className="px-2 py-1 text-xs text-gray-400 italic"
                title="Only the approver configured for Purchase Requests can decide it."
              >
                Awaiting approver
              </span>
            ))}
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
                // Quotes are compared and turned into a PO on Received Quotes,
                // which is where the supplier responses live.
                navigate("/apps/procurement/received-quotes");
              }}
              title="Raise a purchase order from the received quotes"
              className="px-2 py-1 text-xs bg-purple-700 text-white rounded hover:bg-purple-800 flex items-center gap-1"
            >
              <ShoppingCart className="w-3 h-3" /> PO
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(pr);
            }}
            title="Delete this request"
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  /**
   * Records a decision on a purchase request.
   *
   * Both handlers used to call `setPrList` only, so an approval or rejection lived
   * in React state and was gone on the next refresh — the table said "Approved"
   * while the database still said pending. The status is written first and the row
   * is only updated once the server has accepted it; on failure the table is left
   * untouched rather than showing a decision that did not persist.
   */
  async function decidePR(
    id: string,
    status: Extract<PRStatus, "approved" | "cancelled">,
    action: string,
  ) {
    const previous = prList;
    setPrList((prev) =>
      prev.map((pr) => (pr.id === id ? { ...pr, status } : pr)),
    );
    try {
      await updatePurchaseRequest(id, { status });
      logChange({
        module: "procurement",
        action,
        entityType: "purchase_request",
        entityId: id,
        summary: `${action === "approved" ? "Approved" : "Rejected"} PR ${id}`,
        performedBy: authUser.name || "Unknown",
      });
      toast.success(
        `Purchase request ${id} ${status === "approved" ? "approved" : "rejected"}.`,
      );
    } catch (err) {
      setPrList(previous);
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not record the decision. Please try again.",
      );
    }
  }

  function approvePR(id: string) {
    void decidePR(id, "approved", "approved");
  }

  function rejectPR(id: string) {
    void decidePR(id, "cancelled", "rejected");
  }

  /**
   * Submits a draft request for approval.
   *
   * `pending_approval` was referenced by the status config, the tab filter and
   * the Approve/Reject gate, but nothing ever assigned it: requests are created
   * as Draft (the column default) and there was no action anywhere that moved
   * one out of Draft. So every request sat in Draft forever and the Approve
   * button — which only renders for `pending_approval` — could never appear.
   */
  async function submitPRForApproval(id: string) {
    const previous = prList;
    setPrList((prev) =>
      prev.map((pr) => (pr.id === id ? { ...pr, status: "pending_approval" } : pr)),
    );
    try {
      await updatePurchaseRequest(id, { status: "pending_approval" });
      logChange({
        module: "procurement",
        action: "submitted",
        entityType: "purchase_request",
        entityId: id,
        summary: `Submitted PR ${id} for approval`,
        performedBy: authUser.name || "Unknown",
      });
      toast.success("Purchase request submitted for approval.");
    } catch (err) {
      setPrList(previous);
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not submit the request. Please try again.",
      );
    }
  }

  /**
   * Sends the request out to its suppliers as RFQs.
   *
   * This used to call `setPrList` and nothing else: no RFQ record was created,
   * no supplier was emailed, nothing reached the SabiQuot portal, and the status
   * reverted on the next refresh. It was the break in the middle of the chain —
   * a request could be approved and a quote could be recorded, but there was no
   * point at which BuildOS actually asked anyone for one.
   *
   * One RFQ row is written per supplier, all sharing this request's `prRef`;
   * that shared reference is what groups the responses back together for quote
   * comparison. The server allocates each `rfqRef`, emails the supplier a portal
   * link and fires the `rfq.sent` webhook. Direct procurement goes out the same
   * way — the supplier is already chosen, but they still have to send a price
   * back, and an RFQ is how a price gets into BuildOS.
   */
  async function sendToSuppliers(id: string) {
    const pr = prList.find((p) => p.id === id);
    if (!pr || sendingTo) return;
    if (pr.suppliers.length === 0) {
      toast.error("This request has no suppliers to send to.");
      return;
    }

    setSendingTo(id);
    const previous = prList;
    const now = formatDateByGeneralSettings(new Date());
    const items = pr.items.map((it) => ({
      material: it.material,
      qty: it.qty,
      unit: it.unit,
    }));
    const label =
      pr.procurementType === "direct" ? "Direct Procurement" : "RFQ";

    try {
      // Sent one at a time so a failure part-way through is reported with the
      // supplier it happened on, and so the numbering sequence is not raced.
      const sent: SupplierProgress[] = [];
      for (const s of pr.suppliers) {
        const rfq = await createSentRFQ({
          prRef: pr.prRef,
          supplierName: s.supplier,
          supplierId: s.supplierId,
          status: "Sent",
          items,
          sentDate: new Date().toISOString(),
          notes: `${label} for ${pr.prRef}${pr.materialRequestRef ? ` (from ${pr.materialRequestRef})` : ""}.`,
        });
        sent.push({
          ...s,
          status: "request_sent",
          sentDate: now,
          quoteRef: rfq.rfqRef,
        });
      }

      await updatePurchaseRequest(id, {
        status: "sent_to_suppliers",
        suppliers: sent,
      });

      setPrList((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: "sent_to_suppliers" as PRStatus, suppliers: sent }
            : p,
        ),
      );
      logChange({
        module: "procurement",
        action: "sent_to_suppliers",
        entityType: "purchase_request",
        entityId: id,
        summary: `Sent ${pr.prRef} to ${sent.length} supplier${sent.length > 1 ? "s" : ""}`,
        performedBy: authUser.name || "Unknown",
      });
      toast.success(
        `${pr.prRef} sent to ${sent.length} supplier${sent.length > 1 ? "s" : ""}.`,
      );
    } catch (err) {
      setPrList(previous);
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not send the request. Please try again.",
      );
    } finally {
      setSendingTo(null);
    }
  }

  function handleExport() {
    exportCSV(
      "purchase-requests",
      [
        "PR ID",
        "Title / Description",
        "Requester",
        "Department",
        csvAmountHeader("Total"),
        "Date",
        "Status",
      ],
      filtered.map((pr) => [
        pr.prRef,
        pr.project,
        pr.raisedBy,
        pr.project,
        pr.estimatedValue,
        pr.raisedDate,
        PR_STATUS_CFG[pr.status].label,
      ]),
    );
  }

  async function handleCreatePR(payload: NewPRPayload) {
    try {
      const created = await createPurchaseRequest(payload);
      const pr = fromApi(created);
      setPrList((prev) => [pr, ...prev]);
      setShowNewPR(false);
      logChange({
        module: "procurement",
        action: "created",
        entityType: "purchase_request",
        entityId: pr.id,
        summary: `Created PR ${pr.prRef} for ${pr.project}`,
        performedBy: authUser.name || "Current User",
      });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to create the purchase request.",
      );
    }
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
          (pr) => pr.prRef,
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
          sending={sendingTo === sendFor.id}
          onSend={() => void sendToSuppliers(sendFor.id)}
        />
      )}

      {viewPR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {viewPR.prRef}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {viewPR.project} · raised by {viewPR.raisedBy}
                </p>
              </div>
              <button
                onClick={() => setViewPR(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Material request</p>
                  <p className="text-gray-900">
                    {viewPR.materialRequestRef || "Raised directly"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Procurement type</p>
                  <p className="text-gray-900 uppercase">
                    {viewPR.procurementType}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Raised</p>
                  <p className="text-gray-900">{viewPR.raisedDate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Required by</p>
                  <p className="text-gray-900">{viewPR.requiredDate}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">
                  Items ({viewPR.totalItems})
                </p>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                          Material
                        </th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                          Qty
                        </th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                          Unit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {viewPR.items.map((it, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-gray-700">
                            {it.material}
                          </td>
                          <td className="px-3 py-2 text-gray-700">{it.qty}</td>
                          <td className="px-3 py-2 text-gray-500">{it.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setViewPR(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title="Delete purchase request"
        description={
          deleteTarget
            ? `Delete ${deleteTarget.prRef} for ${deleteTarget.project}? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        isDangerous
        isLoading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
