import { notifyLoadFailure } from "../../utils/loadFailure";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  getPurchaseRequests,
  createPurchaseRequest,
  updatePurchaseRequest,
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
  Pencil,
  Ban,
} from "lucide-react";
import { DataTable, type Column } from "../../components/DataTable";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { StatusBadge } from "../../components/StatusBadge";
import { RowAction, RowActionNote, RowActions } from "../../components/RowAction";
import {
  PURCHASE_REQUEST_STATUS,
  PR_EDITABLE,
  statusDef,
  type PurchaseRequestStatus,
} from "../../utils/procurementWorkflow";
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
/**
 * A purchase request has no approval of its own.
 *
 * One raised from a Material Request was already approved there, so
 * "Pending Approval" asked the same person to approve the same spend twice —
 * and an approved request then sat waiting for a second, manual push. What is
 * tracked instead is whether the request has been *raised* to suppliers:
 * `draft` for one saved but not finished, `not_raised` for one created for you
 * by an approved Material Request.
 */
type PRStatus = PurchaseRequestStatus;
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
  const rawStatus = r.status?.toLowerCase().replace(/[\s-]+/g, "_") ?? "not_raised";
  const status: PRStatus =
    rawStatus in PURCHASE_REQUEST_STATUS
      ? (rawStatus as PRStatus)
      : "not_raised";
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

const TABS: { key: PRStatus | "all"; label: string }[] = [
  { key: "all", label: "All PRs" },
  { key: "draft", label: "Draft" },
  { key: "not_raised", label: "Not Raised" },
  { key: "raised", label: "Raised" },
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
    options: Object.keys(PURCHASE_REQUEST_STATUS),
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

/**
 * The create/edit form for a purchase request.
 *
 * Doubles as the editor because a request that has not gone out to suppliers is
 * still just a request — there was previously no way to correct one at all, so
 * a typo in a line item meant deleting it and starting again.
 */
function PRFormModal({
  initial,
  onClose,
  onSave,
}: {
  /** The request being edited, or undefined when raising a new one. */
  initial?: PurchaseRequest;
  onClose: () => void;
  /** `raise` sends it to suppliers immediately; `draft` parks it. */
  onSave: (payload: NewPRPayload, intent: "draft" | "raise") => Promise<void>;
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
  const [project, setProject] = useState(initial?.project ?? "");
  const [mrRef, setMrRef] = useState(initial?.materialRequestRef ?? "");
  const [saving, setSaving] = useState<"draft" | "raise" | null>(null);
  /** References of material requests that could justify this request. */
  const [materialRequestRefs, setMaterialRequestRefs] = useState<string[]>([]);
  const [procType, setProcType] = useState<"direct" | "rfq">(
    initial?.procurementType ?? "direct",
  );
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>(
    initial?.suppliers.map((sup) => sup.supplier) ?? [],
  );
  const [daysToDeliver, setDaysToDeliver] = useState("7");
  const units = useProcurementUnits();
  const [items, setItems] = useState<NewPRItemForm[]>(
    initial?.items.length
      ? initial.items.map((it) => ({
          material: it.material,
          qty: String(it.qty),
          unit: it.unit,
          estimatedUnitCost: String(it.estimatedUnitCost || ""),
        }))
      : [{ material: "", qty: "", unit: units[0], estimatedUnitCost: "" }],
  );

  // Projects come from /projects directly so the dropdown always reflects the
  // real project list; suppliers still come from the reference-data bundle.
  useEffect(() => {
    fetchProjects()
      .then((rows) => {
        const list = rows.map((p) => ({ id: p.id, name: p.name }));
        setProjects(list);
        setProject((prev) => prev || initial?.project || list[0]?.name || "");
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
          // An edited request keeps the suppliers it already names, and a draft
          // is allowed to have none — only raising it needs one.
          prev.length || initial ? prev : supplierNames.slice(0, 1),
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

  async function save(intent: "draft" | "raise") {
    if (!valid || saving) return;
    // Raising means going out to suppliers, so it needs at least one. A draft
    // is allowed to be incomplete — that is the point of saving one.
    if (intent === "raise" && !selectedSuppliers.length) {
      toast.error("Choose at least one supplier before raising this request.");
      return;
    }
    setSaving(intent);
    try {
      // Consumes the next PR number for the numbering config's sequence. Only a
      // brand-new request takes one; editing must not burn another.
      if (!initial) await allocate("PurchaseRequest");
      await onSave(
        {
          title: mrRef.trim()
            ? `${project} — ${mrRef.trim()}`
            : `Purchase Request — ${project}`,
          projectId: projects.find((p) => p.name === project)?.id,
          projectName: project,
          requestedBy:
            initial?.raisedBy || getAuthUserName() || "Current User",
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
        },
        intent,
      );
      onClose();
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            {initial ? `Edit ${initial.prRef}` : "New Purchase Request"}
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
            onClick={() => void save("draft")}
            disabled={!valid || Boolean(saving)}
            className="px-4 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving === "draft" ? "Saving…" : "Save as Draft"}
          </button>
          {/* Raising is the step that sends the request out, so it is the one
              that needs suppliers — a draft deliberately does not. */}
          <button
            onClick={() => void save("raise")}
            disabled={!valid || !selectedSuppliers.length || Boolean(saving)}
            className="px-4 py-2 text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {saving === "raise" ? "Raising…" : "Raise Purchase Request"}
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
  /** The draft being edited, if any. */
  const [editPR, setEditPR] = useState<PurchaseRequest | null>(null);
  const [sendFor, setSendFor] = useState<PurchaseRequest | null>(null);
  /** Id of the request currently being sent, so the button can't be double-fired. */
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [viewPR, setViewPR] = useState<PurchaseRequest | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PurchaseRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [advFilters, setAdvFilters] = useState<ActiveFilters>({});
  const [advSort, setAdvSort] = useState<SortConfig>(null);

  const navigate = useNavigate();
  const authUser = useAuthUser();

  /**
   * Cancels the request rather than deleting it.
   *
   * Delete was offered on every row, including ones already sent to suppliers
   * and ones with a purchase order behind them — removing those takes the RFQs,
   * quotes and order history with them. Cancelling leaves the trail intact,
   * which is what the rest of the chain reads back.
   */
  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    const previous = prList;
    try {
      await updatePurchaseRequest(cancelTarget.id, { status: "cancelled" });
      setPrList((prev) =>
        prev.map((pr) =>
          pr.id === cancelTarget.id
            ? { ...pr, status: "cancelled" as PRStatus }
            : pr,
        ),
      );
      logChange({
        module: "procurement",
        action: "cancelled",
        entityType: "purchase_request",
        entityId: cancelTarget.id,
        summary: `Cancelled PR ${cancelTarget.prRef}`,
        performedBy: authUser.name || "Unknown",
      });
      toast.success(`Purchase request ${cancelTarget.prRef} cancelled.`);
      setCancelTarget(null);
    } catch (err) {
      setPrList(previous);
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not cancel the purchase request.",
      );
    } finally {
      setCancelling(false);
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
      render: (pr) => <StatusBadge {...statusDef(PURCHASE_REQUEST_STATUS, pr.status)} />,
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      filterable: false,
      headerClassName: "text-right",
      /**
       * The actions are the workflow.
       *
       * A request that has not gone out is editable and can be raised; once it
       * has, there is nothing to do here but watch it — the next decision
       * belongs to Sent Requests and then Received Quotes. The old cell offered
       * Submit for Approval, Approve and Reject, none of which belong on a
       * document whose approval already happened upstream, and Delete on every
       * row including ones with a purchase order behind them.
       */
      render: (pr) => {
        const editable = PR_EDITABLE.includes(pr.status);
        return (
          <RowActions>
            <RowAction
              icon={<Eye className="w-3.5 h-3.5" />}
              label="View"
              tone="primary"
              onClick={() => setViewPR(pr)}
            />
            {editable && (
              <>
                <RowAction
                  icon={<Pencil className="w-3.5 h-3.5" />}
                  label="Edit"
                  onClick={() => setEditPR(pr)}
                />
                <RowAction
                  icon={<Send className="w-3.5 h-3.5" />}
                  label="Raise Purchase Request"
                  tone="positive"
                  busy={sendingTo === pr.id}
                  busyLabel="Raising…"
                  onClick={() => setSendFor(pr)}
                />
                <RowAction
                  icon={<Ban className="w-3.5 h-3.5" />}
                  label="Cancel"
                  tone="negative"
                  onClick={() => setCancelTarget(pr)}
                />
              </>
            )}
            {pr.status === "raised" && (
              <RowAction
                icon={<Send className="w-3.5 h-3.5" />}
                label="Sent Requests"
                onClick={() => navigate("/apps/procurement/sent-requests")}
              />
            )}
            {pr.status === "quotes_received" && (
              <RowAction
                icon={<ShoppingCart className="w-3.5 h-3.5" />}
                label="Received Quotes"
                tone="primary"
                onClick={() => navigate("/apps/procurement/received-quotes")}
              />
            )}
            {pr.status === "po_created" && (
              <RowAction
                icon={<ShoppingCart className="w-3.5 h-3.5" />}
                label="Purchase Order"
                tone="primary"
                onClick={() => navigate("/apps/procurement/purchase-orders")}
              />
            )}
            {pr.status === "cancelled" && (
              <RowActionNote>Cancelled</RowActionNote>
            )}
          </RowActions>
        );
      },
    },
  ];

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
  async function raiseToSuppliers(id: string, fresh?: PurchaseRequest) {
    // `fresh` is the row we just wrote; prList has not necessarily re-rendered
    // with it yet when the create flow raises immediately.
    const pr = fresh ?? prList.find((p) => p.id === id);
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
        status: "raised",
        suppliers: sent,
      });

      setPrList((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: "raised" as PRStatus, suppliers: sent }
            : p,
        ),
      );
      logChange({
        module: "procurement",
        action: "raised",
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
        statusDef(PURCHASE_REQUEST_STATUS, pr.status).label,
      ]),
    );
  }

  /**
   * Creates a request, and raises it straight away when that is what was asked
   * for — "Raise Purchase Request" is one action, not a create followed by a
   * second click on a different button.
   */
  async function handleCreatePR(
    payload: NewPRPayload,
    intent: "draft" | "raise",
  ) {
    try {
      const created = await createPurchaseRequest({
        ...payload,
        status: intent === "raise" ? "not_raised" : "draft",
      });
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
      if (intent === "raise") {
        await raiseToSuppliers(pr.id, pr);
      } else {
        toast.success(`${pr.prRef} saved as a draft.`);
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to create the purchase request.",
      );
    }
  }

  /** Saves an edit to a request that has not been raised yet. */
  async function handleEditPR(
    payload: NewPRPayload,
    intent: "draft" | "raise",
  ) {
    if (!editPR) return;
    try {
      const updated = await updatePurchaseRequest(editPR.id, {
        title: payload.title,
        projectId: payload.projectId,
        projectName: payload.projectName,
        daysToDeliver: payload.daysToDeliver,
        mrRef: payload.mrRef,
        procurementType: payload.procurementType,
        suppliers: payload.suppliers,
        items: payload.items,
      });
      const pr = fromApi(updated);
      setPrList((prev) => prev.map((p) => (p.id === pr.id ? pr : p)));
      setEditPR(null);
      logChange({
        module: "procurement",
        action: "updated",
        entityType: "purchase_request",
        entityId: pr.id,
        summary: `Edited PR ${pr.prRef}`,
        performedBy: authUser.name || "Current User",
      });
      if (intent === "raise") {
        await raiseToSuppliers(pr.id, pr);
      } else {
        toast.success(`${pr.prRef} updated.`);
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to update the purchase request.",
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
        <PRFormModal
          onClose={() => setShowNewPR(false)}
          onSave={handleCreatePR}
        />
      )}

      {editPR && (
        <PRFormModal
          initial={editPR}
          onClose={() => setEditPR(null)}
          onSave={handleEditPR}
        />
      )}

      {sendFor && (
        <SendToSuppliersModal
          pr={sendFor}
          onClose={() => setSendFor(null)}
          sending={sendingTo === sendFor.id}
          onSend={() => void raiseToSuppliers(sendFor.id)}
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
                <div className="border border-gray-200 rounded-xl overflow-x-auto">
                  <table className="min-w-[720px] w-full text-sm">
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
        isOpen={Boolean(cancelTarget)}
        title="Cancel purchase request"
        description={
          cancelTarget
            ? `Cancel ${cancelTarget.prRef} for ${cancelTarget.project}? It stays on record but will not be raised to suppliers.`
            : ""
        }
        confirmLabel="Cancel request"
        isDangerous
        isLoading={cancelling}
        onConfirm={confirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
