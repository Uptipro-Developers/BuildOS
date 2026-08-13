import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  fetchPurchaseOrders,
  mapPO,
  sendPOToFinance,
  cancelPurchaseOrder,
  type MappedPurchaseOrder,
} from "../../api/purchase-orders";
import { getReferenceData } from "../../api/reference-data";
import { getSignatories } from "../../api/signatories";
import { getAuthUserName } from "../../utils/useAuthUser";
import {
  csvAmountHeader,
  getCurrencySymbol,
  formatCurrencyByGeneralSettings,
  formatDateByGeneralSettings,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";
import {
  Plus,
  Truck,
  X,
  Trash2,
  DownloadCloud,
  ChevronRight,
  CheckCircle,
  Building2,
} from "lucide-react";
import { DataTable, type Column } from "../../components/DataTable";
import { useChangelog } from "../../stores/changelogStore";
import { exportCSV } from "../../utils/exportCSV";
import { useProcurementUnits } from "../../utils/useProcurementUnits";
import { useNumbering } from "../../stores/numberingStore";
import { toast } from "sonner";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { StatusBadge } from "../../components/StatusBadge";
import {
  PURCHASE_ORDER_STATUS,
  statusDef,
  type PurchaseOrderStatus,
} from "../../utils/procurementWorkflow";

type POStatus = PurchaseOrderStatus;

/** The shape mapPO returns — the page and the API agree on one row type. */
type PurchaseOrder = MappedPurchaseOrder;

/**
 * The stages a buyer can see, in the order the workflow reaches them.
 *
 * The old tabs offered "Sent" and "Partial Receipt", neither of which any step
 * produced, and had nowhere to show an order sitting with Finance — which is
 * where an order spends most of its life.
 */
const tabs: { key: POStatus | "all"; label: string }[] = [
  { key: "all", label: "All POs" },
  { key: "draft", label: "Draft" },
  { key: "sent_to_finance", label: "With Finance" },
  { key: "finance_accepted", label: "Accepted" },
  { key: "paid", label: "Paid" },
  { key: "confirmation_requested", label: "Awaiting Confirmation" },
  { key: "confirmed", label: "Confirmed" },
  { key: "goods_received", label: "Goods Received" },
];

function fmt(n: number) {
  const symbol = getCurrencySymbol();
  if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${symbol}${(n / 1000).toFixed(0)}K`;
  return `${symbol}${n}`;
}

/**
 * Where the money stands, collapsed from the order's own status.
 *
 * `finance_accepted` is the invoice approved but not yet paid — "Payment
 * Requested". From `paid` onward the money has already moved, so
 * confirmation/goods-receipt steps still read as "Paid" here even though the
 * order's own status has moved past it.
 */
function paymentStatusFor(status: POStatus): { label: string; badge: string } {
  switch (status) {
    case "finance_accepted":
      return { label: "Payment Requested", badge: "bg-amber-100 text-amber-700" };
    case "paid":
    case "confirmation_requested":
    case "confirmed":
    case "goods_received":
      return { label: "Paid", badge: "bg-green-100 text-green-700" };
    default:
      return { label: "Unpaid", badge: "bg-gray-100 text-gray-500" };
  }
}

interface POItem {
  material: string;
  qty: string;
  unit: string;
  unitCost: string;
}

// ── Payment terms (Step 2 of PO creation) ──────────────────────────────────
// Picked per order from a set of presets, each split into tranches. A
// tranche due "on_po_approval" is what lets the order go straight to Finance
// on creation (see handleCreate) rather than waiting for Goods Receipt. There
// is no backend model for this yet — the choice drives the document preview
// and the create-time routing below, but isn't persisted on the PurchaseOrder
// record itself.

type PaymentTiming = "on_po_approval" | "on_delivery" | "net_30" | "net_60";

interface PaymentTranche {
  title: string;
  percent: number;
  timing: PaymentTiming;
}

interface PaymentTermPreset {
  id: string;
  name: string;
  description: string;
  tranches: PaymentTranche[];
}

const PAYMENT_TERM_PRESETS: PaymentTermPreset[] = [
  {
    id: "full-delivery",
    name: "Full payment on delivery",
    description: "100% after goods received — Finance pays after GRN / invoice.",
    tranches: [{ title: "On delivery", percent: 100, timing: "on_delivery" }],
  },
  {
    id: "50-50",
    name: "50% deposit + 50% on delivery",
    description: "Half at PO approval, half after delivery.",
    tranches: [
      { title: "Deposit", percent: 50, timing: "on_po_approval" },
      { title: "Balance on delivery", percent: 50, timing: "on_delivery" },
    ],
  },
  {
    id: "30-70",
    name: "30% deposit + 70% on delivery",
    description: "30% at PO approval, balance after delivery.",
    tranches: [
      { title: "Deposit", percent: 30, timing: "on_po_approval" },
      { title: "Balance on delivery", percent: 70, timing: "on_delivery" },
    ],
  },
  {
    id: "net-30",
    name: "Net 30",
    description: "Full amount payable 30 days after delivery.",
    tranches: [{ title: "Net 30 days", percent: 100, timing: "net_30" }],
  },
  {
    id: "net-30-50",
    name: "50% on delivery + 50% Net 30",
    description: "Half at delivery, the remainder within 30 days.",
    tranches: [
      { title: "On delivery", percent: 50, timing: "on_delivery" },
      { title: "Balance Net 30", percent: 50, timing: "net_30" },
    ],
  },
];

const DEFAULT_PAYMENT_TERM_ID = "full-delivery";

function tranchesLabel(tranches: PaymentTranche[]): string {
  return tranches.map((t) => `${t.percent}% ${t.title}`).join(" + ");
}

/** A tranche due before delivery is what lets Finance act at PO approval. */
function hasPreDeliveryTranche(term: PaymentTermPreset): boolean {
  return term.tranches.some((t) => t.timing === "on_po_approval");
}

interface Signatory {
  id: string;
  name: string;
  role: string;
}

interface POPreviewItem {
  material: string;
  qty: number;
  unit: string;
  unitCost: number;
}

/**
 * The formal PO document — letterhead, supplier/delivery details, line
 * items, payment terms and a signature block. Shared between the create-flow
 * preview (step 3) and the printable copy `printPurchaseOrder` opens.
 */
function PurchaseOrderPaper({
  poRef,
  createdDate,
  supplier,
  supplierContact,
  expectedDate,
  items,
  totalValue,
  term,
  signatories,
}: {
  poRef: string;
  createdDate: string;
  supplier: string;
  supplierContact: string;
  expectedDate: string;
  items: POPreviewItem[];
  totalValue: number;
  term: PaymentTermPreset;
  signatories: Signatory[];
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-6 py-5 border-b-4 border-double border-blue-800 flex items-start justify-between">
        <div>
          <p className="text-xl font-bold text-blue-900">BUILDOS CONSTRUCTION</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Block A, Industrial Estate · Lagos · +234 1 234 5678
          </p>
          <p className="text-xs text-gray-400">VAT 051-2345-6789 · RCN 2019/0456789</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900">PURCHASE ORDER</p>
          <p className="text-xs text-gray-600 mt-0.5">
            No: <span className="font-mono font-semibold">{poRef}</span>
          </p>
          <p className="text-xs text-gray-600">Date: {createdDate}</p>
        </div>
      </div>

      <div className="px-6 py-4 grid grid-cols-2 gap-6 border-b border-gray-100">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 pb-1 mb-2">
            Bill To / Supplier
          </p>
          <p className="text-sm font-semibold text-gray-900">{supplier || "—"}</p>
          <p className="text-xs text-gray-600">{supplierContact || "—"}</p>
          <p className="text-xs text-gray-500 mt-1">
            Payment ref: <span className="font-mono">{poRef}</span>
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 pb-1 mb-2">
            Ship To
          </p>
          <p className="text-sm text-gray-900">Site Stores — Main Yard</p>
          <p className="text-xs text-gray-600">Lagos, Nigeria</p>
          <p className="text-xs text-gray-500 mt-1">Expected delivery: {expectedDate}</p>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-xs text-gray-500 uppercase tracking-wide">
            <th className="px-6 py-2.5 text-left font-semibold">Description</th>
            <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
            <th className="px-4 py-2.5 text-right font-semibold">Unit Price</th>
            <th className="px-6 py-2.5 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((it, i) => (
            <tr key={i}>
              <td className="px-6 py-2.5 text-gray-800">{it.material}</td>
              <td className="px-4 py-2.5 text-right text-gray-700">
                {it.qty.toLocaleString()} {it.unit}
              </td>
              <td className="px-4 py-2.5 text-right text-gray-700">
                {formatCurrencyByGeneralSettings(it.unitCost)}
              </td>
              <td className="px-6 py-2.5 text-right font-medium text-gray-900">
                {formatCurrencyByGeneralSettings(it.qty * it.unitCost)}
              </td>
            </tr>
          ))}
          <tr className="bg-gray-50">
            <td colSpan={3} className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
              TOTAL
            </td>
            <td className="px-6 py-3 text-right font-bold text-gray-900">
              {formatCurrencyByGeneralSettings(totalValue)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="px-6 py-4 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 pb-1 mb-2">
          Payment Terms
        </p>
        <p className="text-sm text-gray-800 font-medium">{term.name}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {term.tranches.map((t, i) => (
            <span
              key={i}
              className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full border ${t.timing === "on_po_approval" ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-white text-gray-600 border-gray-200"}`}
            >
              {t.percent}% {t.title}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">{term.description}</p>
      </div>

      <div className="px-6 py-5 border-t border-gray-100 grid grid-cols-2 gap-8">
        <div>
          <div className="space-y-3">
            {(signatories.length
              ? signatories
              : [{ id: "fallback", name: "Procurement Manager", role: "" }]
            ).map((s) => (
              <div key={s.id}>
                <div className="h-9 border-b border-gray-900" />
                <p className="text-xs font-semibold text-gray-900 mt-1">{s.name}</p>
                {s.role && <p className="text-[11px] text-gray-500">{s.role}</p>}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-700 mt-3 font-medium">Authorised for BUILDOS</p>
        </div>
        <div>
          <div className="h-10 border-b border-gray-900" />
          <p className="text-xs text-gray-700 mt-1.5">Supplier acknowledgement</p>
          <p className="text-xs text-gray-600">Name &amp; signature</p>
        </div>
      </div>
    </div>
  );
}

/** Opens a print-ready copy of the formal PO (Download PDF). */
function printPurchaseOrder(props: {
  poRef: string;
  createdDate: string;
  supplier: string;
  supplierContact: string;
  expectedDate: string;
  items: POPreviewItem[];
  totalValue: number;
  term: PaymentTermPreset;
  signatories: Signatory[];
}) {
  const { poRef, createdDate, supplier, supplierContact, expectedDate, items, totalValue, term, signatories } = props;
  const rows = items
    .map(
      (it) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:left">${it.material}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${it.qty.toLocaleString()} ${it.unit}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${formatCurrencyByGeneralSettings(it.unitCost)}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${formatCurrencyByGeneralSettings(it.qty * it.unitCost)}</td></tr>`,
    )
    .join("");
  const tranches = term.tranches.map((t) => `${t.percent}% ${t.title}`).join(" + ");
  const sigHtml = (signatories.length ? signatories : [{ id: "fallback", name: "Procurement Manager", role: "" }])
    .map(
      (s) =>
        `<div style="margin-bottom:10px"><div style="border-top:1px solid #000;padding-top:4px">${s.name}<br/><span style="color:#555;font-size:11px">${s.role}</span></div></div>`,
    )
    .join("");
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${poRef}</title></head>
    <body style="font-family:Georgia,serif;color:#111;max-width:720px;margin:32px auto;line-height:1.5">
      <div style="border-bottom:3px double #1e3a8a;padding-bottom:12px;display:flex;justify-content:space-between;align-items:flex-end">
        <div><div style="font-size:22px;font-weight:bold;color:#1e3a8a">BUILDOS CONSTRUCTION</div>
        <div style="font-size:11px;color:#555">Block A, Industrial Estate · Lagos · +234 1 234 5678</div></div>
        <div style="text-align:right"><div style="font-size:16px;font-weight:bold">PURCHASE ORDER</div>
        <div style="font-size:11px">No: <b>${poRef}</b></div><div style="font-size:11px">Date: ${createdDate}</div></div>
      </div>
      <table style="width:100%;margin-top:16px;font-size:13px;border-collapse:collapse">
        <tr>
          <td style="vertical-align:top"><div style="font-weight:bold;border-bottom:1px solid #999;margin-bottom:6px;padding-bottom:2px">Supplier</div>
            <div>${supplier}</div><div style="color:#555;font-size:12px">${supplierContact}</div></td>
          <td style="vertical-align:top"><div style="font-weight:bold;border-bottom:1px solid #999;margin-bottom:6px;padding-bottom:2px">Deliver To</div>
            <div>Site Stores — Main Yard</div><div style="color:#555;font-size:12px">Lagos, Nigeria</div>
            <div style="color:#555;font-size:12px">Expected: ${expectedDate}</div></td>
        </tr>
      </table>
      <div style="font-weight:bold;border-bottom:1px solid #999;margin:16px 0 6px;padding-bottom:2px">Items</div>
      <table style="width:100%;font-size:12px;border-collapse:collapse;border:1px solid #ddd">
        <thead><tr style="background:#f5f5f5"><th style="padding:6px 8px;text-align:left">Description</th>
        <th style="padding:6px 8px;text-align:right">Qty</th><th style="padding:6px 8px;text-align:right">Unit Price</th>
        <th style="padding:6px 8px;text-align:right">Amount</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="3" style="padding:8px;text-align:right;font-weight:bold">TOTAL</td>
        <td style="padding:8px;text-align:right;font-weight:bold">${formatCurrencyByGeneralSettings(totalValue)}</td></tr></tfoot>
      </table>
      <div style="font-weight:bold;border-bottom:1px solid #999;margin:16px 0 6px;padding-bottom:2px">Payment Terms</div>
      <div style="font-size:12px">${term.name} — ${tranches}</div>
      <div style="font-size:11px;color:#555;margin-top:2px">${term.description}</div>
      <div style="margin-top:24px;display:flex;justify-content:space-between;gap:24px;font-size:12px">
        <div style="flex:1">${sigHtml}<div style="margin-top:4px;font-weight:bold">Authorised for BUILDOS</div></div>
        <div style="flex:1"><div style="border-top:1px solid #000;padding-top:4px">Supplier Acknowledgement<br/>Name &amp; Signature</div></div>
      </div>
    </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

interface NewPOPayload {
  supplierId: string;
  prRef?: string;
  createdBy: string;
  expectedDate: string;
  totalValue: number;
  items: { material: string; qty: number; unit: string; unitCost: number }[];
}

function NewPOModal({
  initial,
  onClose,
  onSave,
}: {
  /**
   * An existing draft order to carry forward rather than build from scratch —
   * it was already raised from an accepted quote (or created directly), so its
   * supplier and items are real and not re-collected. When set, Step 1 (PO
   * setup) is skipped entirely: the wizard opens straight on payment terms.
   */
  initial?: PurchaseOrder;
  onClose: () => void;
  onSave: (
    payload: NewPOPayload,
    meta: {
      paymentTerm: PaymentTermPreset;
      signatories: Signatory[];
      sendToFinanceNow: boolean;
      /** Set when carrying an existing order forward — skips creating a new one. */
      existingId?: string;
    },
  ) => void;
}) {
  const isInherited = !!initial;
  const today = new Date();
  const fmtDate = (d: Date) => formatDateByGeneralSettings(d);
  const addDays = (n: number) => {
    const d2 = new Date(today);
    d2.setDate(d2.getDate() + n);
    return fmtDate(d2);
  };
  /** ISO variant of addDays, since addDays's display format can't be sent to the backend. */
  const addDaysIso = (n: number) => {
    const d2 = new Date(today);
    d2.setDate(d2.getDate() + n);
    d2.setHours(0, 0, 0, 0);
    return d2.toISOString();
  };

  const [step, setStep] = useState<1 | 2 | 3>(isInherited ? 2 : 1);

  // ── Step 1 — PO setup (skipped entirely when `initial` is set) ──
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [projects, setProjects] = useState<string[]>([]);
  // The material catalogue, so a PO line can only reference a material that
  // already exists rather than a free-typed name.
  const [materialOptions, setMaterialOptions] = useState<
    { name: string; unit: string }[]
  >([]);
  const [supplierId, setSupplierId] = useState(initial?.supplierId ?? "");
  const [supplierContact, setSupplierContact] = useState(initial?.supplierContact ?? "");
  const [prRef, setPrRef] = useState(initial?.prRef ?? "");
  const [project, setProject] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("7");
  const units = useProcurementUnits();
  const [items, setItems] = useState<POItem[]>(
    initial
      ? initial.items.map((it) => ({
        material: it.material,
        qty: String(it.qty),
        unit: it.unit,
        unitCost: String(it.unitCost),
      }))
      : [{ material: "", qty: "", unit: units[0], unitCost: "" }],
  );

  useEffect(() => {
    // Nothing on step 1 renders in inherited mode, so there is nothing here to
    // populate a dropdown for.
    if (isInherited) return;
    getReferenceData()
      .then((data) => {
        const supplierList = data.suppliers.map((s) => ({
          id: s.id,
          name: s.name,
        }));
        const projectNames = data.projects.map((p) => p.name);
        setSuppliers(supplierList);
        setProjects(projectNames);
        setSupplierId((prev) => prev || supplierList[0]?.id || "");
        setProject((prev) => prev || projectNames[0] || "");
        setMaterialOptions(
          (data.materials ?? [])
            .map((m) => ({ name: m.name, unit: m.unit ?? "" }))
            .filter((m) => m.name),
        );
      })
      .catch(() => { });
  }, [isInherited]);

  const addItem = () =>
    setItems((p) => [
      ...p,
      { material: "", qty: "", unit: units[0], unitCost: "" },
    ]);
  const removeItem = (i: number) =>
    setItems((p) => p.filter((_, j) => j !== i));
  const updateItem = (i: number, k: keyof POItem, v: string) =>
    setItems((p) => p.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  const totalValue = items.reduce(
    (s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.unitCost) || 0),
    0,
  );
  const validSetup =
    !!supplierId &&
    items.every(
      (it) => it.material.trim() && it.qty.trim() && it.unitCost.trim(),
    );
  const supplierName = initial?.supplier ?? (suppliers.find((s) => s.id === supplierId)?.name ?? "");
  // The real date already on the order, rather than a freshly recomputed one.
  const previewExpectedDate = initial?.expectedDate || addDays(parseInt(deliveryDays) || 7);

  // ── Step 2 — payment terms & signatories ──
  const [timingCat, setTimingCat] = useState<"before" | "after" | "both" | "any">("any");
  const [paymentTermId, setPaymentTermId] = useState(DEFAULT_PAYMENT_TERM_ID);
  const [customMode, setCustomMode] = useState(false);
  // Terms defined inline this session — not persisted anywhere once the modal closes.
  const [customTerms, setCustomTerms] = useState<PaymentTermPreset[]>([]);
  const [customForm, setCustomForm] = useState<{
    name: string;
    description: string;
    tranches: { title: string; percent: string; timing: PaymentTiming }[];
  }>({
    name: "",
    description: "",
    tranches: [{ title: "", percent: "100", timing: "on_delivery" }],
  });
  // The real list configured in Procurement Settings › Signatories, not a
  // fixed set every PO used to pick from regardless of who's actually on
  // file.
  const [signatoryOptions, setSignatoryOptions] = useState<Signatory[]>([]);
  const [signatoriesLoading, setSignatoriesLoading] = useState(true);
  const [signatoriesError, setSignatoriesError] = useState(false);
  const [selectedSignatories, setSelectedSignatories] = useState<string[]>([]);

  useEffect(() => {
    getSignatories()
      .then((rows) => {
        const options: Signatory[] = rows.map((r) => ({
          id: r.id,
          name: r.user?.name ?? "Unknown",
          role: r.role,
        }));
        setSignatoryOptions(options);
        // Default to whoever's on file as Procurement Manager, same starting
        // point the old hardcoded list picked — just off the real data now.
        setSelectedSignatories((prev) =>
          prev.length
            ? prev
            : options.filter((o) => o.role === "Procurement Manager").map((o) => o.name),
        );
      })
      .catch(() => setSignatoriesError(true))
      .finally(() => setSignatoriesLoading(false));
  }, []);

  const allTerms = [...PAYMENT_TERM_PRESETS, ...customTerms];
  const hasBefore = (t: PaymentTermPreset) => t.tranches.some((tr) => tr.timing === "on_po_approval");
  const hasAfter = (t: PaymentTermPreset) => t.tranches.some((tr) => tr.timing !== "on_po_approval");
  const filteredTerms = allTerms.filter((t) => {
    if (timingCat === "before") return hasBefore(t) && !hasAfter(t);
    if (timingCat === "after") return hasAfter(t) && !hasBefore(t);
    if (timingCat === "both") return hasBefore(t) && hasAfter(t);
    return true;
  });
  const term = allTerms.find((t) => t.id === paymentTermId) ?? allTerms[0];

  // When the timing bucket changes, keep the selected term valid for it —
  // otherwise the detail card below would show a term the filter just hid.
  function pickTermForCat(cat: "before" | "after" | "both" | "any") {
    const matches = (t: PaymentTermPreset) => {
      const b = hasBefore(t);
      const a = hasAfter(t);
      if (cat === "before") return b && !a;
      if (cat === "after") return a && !b;
      if (cat === "both") return b && a;
      return true;
    };
    return matches(term) ? term.id : (allTerms.find(matches)?.id ?? DEFAULT_PAYMENT_TERM_ID);
  }

  const customTotal = customForm.tranches.reduce((s, t) => s + (parseFloat(t.percent) || 0), 0);
  const customValid =
    !!customForm.name.trim() &&
    customForm.tranches.length > 0 &&
    customForm.tranches.every((t) => t.title.trim() && parseFloat(t.percent) > 0) &&
    Math.round(customTotal) === 100;
  const canPreview = customMode ? customValid : filteredTerms.length > 0;

  const toggleSignatory = (name: string) =>
    setSelectedSignatories((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );

  function continueToPreview() {
    if (customMode) {
      const id = `custom-${Date.now()}`;
      setCustomTerms((prev) => [
        ...prev,
        {
          id,
          name: customForm.name.trim(),
          description: customForm.description.trim(),
          tranches: customForm.tranches.map((t) => ({
            title: t.title.trim(),
            percent: parseFloat(t.percent) || 0,
            timing: t.timing,
          })),
        },
      ]);
      setPaymentTermId(id);
    }
    setStep(3);
  }

  // ── Step 3 — preview & send ──
  // Non-consuming: safe to call during render, unlike allocate(), which
  // reserves the number on the server. The real reference is allocated for
  // real by the backend when the order is actually created.
  const { peekNextId } = useNumbering();
  // An inherited order already has a real reference and creation date —
  // peeking a fresh one would show a number that isn't actually this order's.
  const poRefPreview = initial?.poRef || peekNextId("PurchaseOrder");
  const createdDatePreview = initial?.createdDate || fmtDate(today);
  const previewSignatories = signatoryOptions.filter((s) => selectedSignatories.includes(s.name));
  // A tranche due before delivery is what lets this order go straight to
  // Finance once created, rather than waiting on Goods Receipt.
  const sendToFinanceNow = hasPreDeliveryTranche(term);

  function previewItems(): POPreviewItem[] {
    return items.map((it) => ({
      material: it.material,
      qty: parseFloat(it.qty) || 0,
      unit: it.unit,
      unitCost: parseFloat(it.unitCost) || 0,
    }));
  }

  /**
   * Building the payload is only meaningful for a brand-new order — when
   * carrying an existing one forward, the caller uses `meta.existingId`
   * instead and this is never sent anywhere.
   */
  function handleSubmit() {
    onSave(
      {
        supplierId,
        prRef: prRef.trim() || undefined,
        createdBy: getAuthUserName() || "Current User",
        expectedDate: addDaysIso(parseInt(deliveryDays) || 7),
        totalValue,
        items: previewItems(),
      },
      { paymentTerm: term, signatories: previewSignatories, sendToFinanceNow, existingId: initial?.id },
    );
  }

  function handleDownload() {
    printPurchaseOrder({
      poRef: poRefPreview,
      createdDate: createdDatePreview,
      supplier: supplierName,
      supplierContact: supplierContact || supplierName,
      expectedDate: previewExpectedDate,
      items: previewItems(),
      totalValue,
      term,
      signatories: previewSignatories,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Create Purchase Order
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isInherited && (
                <span className="text-blue-600">Inherited from {initial!.poRef} · </span>
              )}
              Step {isInherited ? step - 1 : step} of {isInherited ? 2 : 3} —{" "}
              {step === 1
                ? "PO setup"
                : step === 2
                  ? "Payment terms & signatories"
                  : "Preview & send"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 1 && (
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Supplier Contact
                </label>
                <input
                  value={supplierContact}
                  onChange={(e) => setSupplierContact(e.target.value)}
                  placeholder="Name — +234 …"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  PR Reference
                </label>
                <input
                  value={prRef}
                  onChange={(e) => setPrRef(e.target.value)}
                  placeholder="PR-0019"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Project
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
                  Expected Delivery (days)
                </label>
                <input
                  type="number"
                  min={1}
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-0.5">
                  Expected: {addDays(parseInt(deliveryDays) || 7)}
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">
                  Line Items <span className="text-red-500">*</span>
                </label>
                <button
                  onClick={addItem}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Line
                </button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_70px_90px_90px_32px] gap-1.5 items-center"
                  >
                    <select
                      value={item.material}
                      onChange={(e) => {
                        const name = e.target.value;
                        updateItem(i, "material", name);
                        // Adopt the catalogue's unit for the chosen material.
                        const chosen = materialOptions.find((m) => m.name === name);
                        if (chosen?.unit) updateItem(i, "unit", chosen.unit);
                      }}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      {Array.from(
                        new Set([...units, item.unit].filter(Boolean)),
                      ).map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={item.unitCost}
                      onChange={(e) => updateItem(i, "unitCost", e.target.value)}
                      placeholder={`Unit ${getCurrencySymbol()}`}
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
              {totalValue > 0 && (
                <div className="flex justify-end mt-2">
                  <span className="text-sm font-semibold text-gray-800">
                    Total: {fmt(totalValue)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="px-6 py-5 space-y-4">
            {isInherited && (
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5">
                <p className="text-xs font-semibold text-blue-900">{supplierName}</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  {items.length} item{items.length > 1 ? "s" : ""}:{" "}
                  {items.map((it) => it.material).join(", ")} · {fmt(totalValue)}
                </p>
                <p className="text-[11px] text-blue-400 mt-0.5">
                  Supplier and items are fixed from {initial!.poRef} — raised from an already
                  accepted quote.
                </p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Payment Timing <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { key: "before", label: "Before Delivery", desc: "Due at PO approval" },
                    { key: "after", label: "After Delivery", desc: "Due after goods received" },
                    { key: "both", label: "Before & After", desc: "Split across both" },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      setTimingCat(c.key);
                      setCustomMode(false);
                      setPaymentTermId(pickTermForCat(c.key));
                    }}
                    className={`rounded-xl border p-3 text-left transition-colors ${timingCat === c.key ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-gray-200 bg-white hover:border-gray-300"}`}
                  >
                    <p
                      className={`text-sm font-semibold ${timingCat === c.key ? "text-blue-800" : "text-gray-800"}`}
                    >
                      {c.label}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600">
                  Payment Terms <span className="text-red-500">*</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customMode}
                    onChange={(e) => setCustomMode(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-700 focus:ring-blue-500"
                  />
                  Create custom terms
                </label>
              </div>
              {customMode ? (
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={customForm.name}
                      onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                      placeholder="Term name e.g. 30% deposit + 70% Net 60"
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      value={customForm.description}
                      onChange={(e) =>
                        setCustomForm({ ...customForm, description: e.target.value })
                      }
                      placeholder="Short description (optional)"
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {customForm.tranches.map((tr, i) => (
                    <div key={i} className="grid grid-cols-[1fr_70px_1fr_28px] gap-1.5 items-center">
                      <input
                        value={tr.title}
                        onChange={(e) =>
                          setCustomForm({
                            ...customForm,
                            tranches: customForm.tranches.map((x, j) =>
                              j === i ? { ...x, title: e.target.value } : x,
                            ),
                          })
                        }
                        placeholder="Tranche title"
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={tr.percent}
                          onChange={(e) =>
                            setCustomForm({
                              ...customForm,
                              tranches: customForm.tranches.map((x, j) =>
                                j === i ? { ...x, percent: e.target.value } : x,
                              ),
                            })
                          }
                          placeholder="%"
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm pr-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">
                          %
                        </span>
                      </div>
                      <select
                        value={tr.timing}
                        onChange={(e) =>
                          setCustomForm({
                            ...customForm,
                            tranches: customForm.tranches.map((x, j) =>
                              j === i
                                ? { ...x, timing: e.target.value as PaymentTiming }
                                : x,
                            ),
                          })
                        }
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="on_po_approval">Before delivery</option>
                        <option value="on_delivery">On delivery</option>
                        <option value="net_30">Net 30</option>
                        <option value="net_60">Net 60</option>
                      </select>
                      <button
                        type="button"
                        disabled={customForm.tranches.length <= 1}
                        onClick={() =>
                          setCustomForm({
                            ...customForm,
                            tranches: customForm.tranches.filter((_, j) => j !== i),
                          })
                        }
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setCustomForm({
                          ...customForm,
                          tranches: [
                            ...customForm.tranches,
                            { title: "", percent: "", timing: "on_delivery" },
                          ],
                        })
                      }
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Tranche
                    </button>
                    <p className="text-[11px] text-gray-500">
                      Total:{" "}
                      <span
                        className={`font-semibold ${Math.round(customTotal) === 100 ? "text-emerald-600" : "text-amber-600"}`}
                      >
                        {Math.round(customTotal)}%
                      </span>
                    </p>
                    {Math.round(customTotal) !== 100 && (
                      <p className="text-[11px] text-amber-600">must total 100%</p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {filteredTerms.length === 0 ? (
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-500">
                      No preset terms payable entirely{" "}
                      {timingCat === "before"
                        ? "before delivery"
                        : timingCat === "after"
                          ? "after delivery"
                          : "this way"}{" "}
                      — tick "Create custom terms" to define one.
                    </div>
                  ) : (
                    <select
                      value={paymentTermId}
                      onChange={(e) => setPaymentTermId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {filteredTerms.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {tranchesLabel(p.tranches)}
                        </option>
                      ))}
                    </select>
                  )}
                  {term && (
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 mt-2">
                      <p className="text-xs font-medium text-gray-700">{term.name}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {term.tranches.map((t, i) => (
                          <span
                            key={i}
                            className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border ${t.timing === "on_po_approval" ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-white text-gray-600 border-gray-200"}`}
                          >
                            {t.percent}% {t.title}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1.5">{term.description}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Signatories on PO
              </label>
              {signatoriesLoading ? (
                <p className="text-xs text-gray-400">Loading signatories…</p>
              ) : signatoriesError ? (
                <p className="text-xs text-red-500">
                  Could not load signatories from Procurement Settings.
                </p>
              ) : signatoryOptions.length === 0 ? (
                <p className="text-xs text-gray-400">
                  No signatories configured — add them under Procurement Settings › Signatories.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {signatoryOptions.map((s) => {
                    const on = selectedSignatories.includes(s.name);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSignatory(s.name)}
                        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${on ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                      >
                        <CheckCircle className={`w-3.5 h-3.5 ${on ? "text-blue-600" : "text-gray-300"}`} />
                        {s.name} <span className="text-[10px] text-gray-400">· {s.role}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="px-6 py-6 bg-gray-50/50">
            <PurchaseOrderPaper
              poRef={poRefPreview}
              createdDate={createdDatePreview}
              supplier={supplierName}
              supplierContact={supplierContact || supplierName}
              expectedDate={previewExpectedDate}
              items={previewItems()}
              totalValue={totalValue}
              term={term}
              signatories={previewSignatories}
            />
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {step === 1 && (
              <p className="text-xs text-gray-400">Fill the PO setup to continue</p>
            )}
            {/* No step 1 to return to when carrying an existing order forward. */}
            {step !== 1 && !(isInherited && step === 2) && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                onClick={handleDownload}
                title="Download PDF"
                className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
              >
                <DownloadCloud className="w-5 h-5" />
              </button>
            )}
          </div>
          {step === 1 && (
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!validSetup}
              className="px-4 py-2 text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Continue · Payment Terms <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              onClick={continueToPreview}
              disabled={!canPreview}
              className="px-4 py-2 text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Preview PO <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 text-sm bg-indigo-700 text-white rounded-xl hover:bg-indigo-800 flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" /> {sendToFinanceNow ? "Send to Finance" : "Create PO"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PurchaseOrdersPage() {
  const { logChange } = useChangelog();
  // Suppliers → View Order History / Create PO with Supplier arrive here with
  // the supplier in the query string, so honour it rather than landing on an
  // unfiltered list.
  const [searchParams] = useSearchParams();
  const supplierParam = searchParams.get("supplier") ?? "";
  const [poList, setPoList] = useState<PurchaseOrder[]>([]);
  useEffect(() => {
    fetchPurchaseOrders().then(setPoList);
  }, []);
  const [activeTab, setActiveTab] = useState<POStatus | "all">("all");
  /**
   * The draft (or Finance-declined) order the "Create PO" row action was
   * clicked on — carried into the wizard as `initial` so it can finish that
   * specific order (payment terms, signatories, then Finance) instead of
   * opening a disconnected blank form.
   */
  const [createFromExisting, setCreateFromExisting] = useState<PurchaseOrder | null>(null);
  /** Id of the order currently mid-transition, so an action can't double-fire. */
  const [working, setWorking] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PurchaseOrder | null>(null);
  const [viewPO, setViewPO] = useState<PurchaseOrder | null>(null);
  const navigate = useNavigate();

  /**
   * Runs one workflow step against the server and replaces the row with what
   * came back.
   *
   * Every one of these used to be a `setPoList` call and nothing else: the order
   * advanced in the browser, no request was made, a refresh put it back, and
   * "Send to Finance" invented a `FIN-####` reference with Math.random that
   * Finance had never heard of. The server owns the transition now — including
   * refusing one taken out of order — so the row is only updated once it has
   * actually happened.
   */
  async function step(
    po: PurchaseOrder,
    run: () => Promise<PurchaseOrder>,
    action: string,
    summary: string,
    success: string,
    description?: string,
  ) {
    if (working) return;
    setWorking(po.id);
    try {
      const updated = await run();
      setPoList((prev) => prev.map((p) => (p.id === po.id ? updated : p)));
      logChange({
        module: "Procurement",
        action,
        entityType: "PurchaseOrder",
        entityId: po.id,
        summary,
        performedBy: getAuthUserName() || "Current User",
      });
      toast.success(success, description ? { description } : undefined);
      return updated;
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not update the purchase order.",
      );
    } finally {
      setWorking(null);
    }
  }

  async function confirmCancel() {
    const po = cancelTarget;
    if (!po) return;
    setCancelTarget(null);
    await step(
      po,
      () => cancelPurchaseOrder(po.id),
      "Cancelled",
      `PO ${po.poRef} cancelled`,
      `${po.poRef} cancelled.`,
    );
  }

  /**
   * Shared by both `NewPOModal` instances below.
   *
   * `meta.existingId` set means the wizard was opened on an order that
   * already exists (raised from an accepted quote, sitting in draft) —
   * nothing new is created, the existing order is just carried forward. Its
   * absence means a brand-new order, built from scratch via the header
   * button.
   */
  async function handleModalSave(
    // Only reachable via createFromExisting now — nothing here builds a new
    // order from this payload, but NewPOModal's onSave still passes one.
    _payload: NewPOPayload,
    meta: {
      paymentTerm: PaymentTermPreset;
      signatories: Signatory[];
      sendToFinanceNow: boolean;
      existingId?: string;
    },
  ) {
    // Only ever called with an existing order now — the header's "create a
    // blank PO from scratch" path is gone, so `meta.existingId` is always
    // set here.
    if (!meta.existingId) return;
    try {
      if (!meta.sendToFinanceNow) {
        // No transition exists for "wait for delivery" beyond the draft
        // it's already sitting in — there's nothing further to do here.
        toast.success("Payment terms recorded.", {
          description: "This order still waits for delivery before Finance is involved.",
        });
        setCreateFromExisting(null);
        return;
      }
      const sent = await sendPOToFinance(meta.existingId, getAuthUserName() || undefined);
      const po = mapPO(sent);
      setPoList((prev) => prev.map((p) => (p.id === po.id ? po : p)));
      logChange({
        module: "Procurement",
        action: "Sent to Finance",
        entityType: "PurchaseOrder",
        entityId: po.id,
        summary: `PO ${po.poRef} sent to Finance — ${meta.paymentTerm.name}`,
        performedBy: "Current User",
      });
      toast.success(`${po.poRef} sent to Finance.`);
      setCreateFromExisting(null);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to update the purchase order.",
      );
    }
  }

  const filtered = poList.filter(
    (po) =>
      (activeTab === "all" || po.status === activeTab) &&
      (!supplierParam || po.supplier === supplierParam),
  );

  const columns: Column<PurchaseOrder>[] = [
    {
      key: "poRef",
      label: "PO Ref",
      sortable: true,
      filterable: true,
      render: (po) => (
        <div>
          <span className="font-mono text-xs font-semibold text-gray-900">
            {po.poRef}
          </span>
          {po.prRef && (
            <p className="text-xs text-gray-400">from {po.prRef}</p>
          )}
        </div>
      ),
    },
    {
      key: "supplier",
      label: "Supplier / Vendor",
      sortable: true,
      filterable: true,
      render: (po) => (
        <div>
          <p className="font-medium text-gray-900">{po.supplier}</p>
          <p className="text-xs text-gray-400">{po.supplierContact}</p>
        </div>
      ),
    },
    {
      key: "description",
      label: "Description / Items",
      sortable: true,
      filterable: true,
      minWidth: 200,
      render: (po) => (
        <div className="text-sm text-gray-600">
          {po.items.length} item{po.items.length > 1 ? "s" : ""}:{" "}
          {po.items.map((it: { material: string }) => it.material).join(", ")}
        </div>
      ),
    },
    {
      key: "totalValue",
      label: "Total ($)",
      sortable: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (po) => (
        <span className="font-semibold text-gray-900">
          {formatNumberByGeneralSettings(po.totalValue)}
        </span>
      ),
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (po) => (
        <span className="text-gray-600 text-sm">{po.expectedDate}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      filterable: true,
      render: (po) => (
        <div className="space-y-1">
          <StatusBadge {...statusDef(PURCHASE_ORDER_STATUS, po.status)} />
          {po.financeRef && (
            <p className="text-xs text-gray-400 font-mono">{po.financeRef}</p>
          )}
          {po.status === "finance_declined" && po.declineReason && (
            <p className="text-xs text-red-600 max-w-48">{po.declineReason}</p>
          )}
        </div>
      ),
    },
    {
      key: "paymentStatus",
      label: "Payment Status",
      sortable: true,
      filterable: true,
      render: (po) => {
        const cfg = paymentStatusFor(po.status);
        return (
          <span
            className={`inline-flex items-center text-xs px-2 py-1 rounded-full font-medium ${cfg.badge}`}
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
      headerClassName: "text-right",
      /**
       * Exactly one button: "Create PO" while the order hasn't been generated
       * yet (draft, or bounced back by Finance for rework), "Goods Receipt"
       * from the point it has — nothing for a cancelled order. Styled as its
       * own filled/bordered pill rather than through RowAction, which only
       * renders a ghost-text style — these two need a solid tone each
       * (blue / amber) to read as the primary next step on the row.
       */
      render: (po) => {
        if (po.status === "cancelled") return null;
        const generated = po.status !== "draft" && po.status !== "finance_declined";
        return (
          <div className="flex items-center justify-end gap-1 flex-wrap">
            {generated ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/apps/procurement/goods-receipt");
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors"
              >
                <Truck className="w-3 h-3" /> Goods Receipt
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCreateFromExisting(po);
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-3 h-3" /> Create PO
              </button>
            )}
          </div>
        );
      },
    },
  ];

  function handleExport() {
    const headers = [
      "PO Ref",
      "PR Ref",
      "Supplier",
      "Contact",
      "Status",
      "Finance Ref",
      csvAmountHeader("Total Value"),
      "Expected Date",
      "Items",
    ];
    const rows = filtered.map((po) => [
      po.poRef,
      po.prRef,
      po.supplier,
      po.supplierContact,
      statusDef(PURCHASE_ORDER_STATUS, po.status).label,
      po.financeRef,
      po.totalValue,
      po.expectedDate,
      po.items
        .map(
          (it: { material: string; qty: number; unit: string; unitCost: number }) =>
            `${it.material} (${it.qty} ${it.unit} @ ${formatCurrencyByGeneralSettings(it.unitCost)})`,
        )
        .join("; "),
    ]);
    exportCSV("purchase-orders", headers, rows);
  }

  const totalValue = poList
    .filter((po) => po.status !== "cancelled")
    .reduce((a, po) => a + po.totalValue, 0);
  // Committed spend that Finance has not yet paid — the orders an accrual has
  // to cover at period end.
  const accrualCandidates = poList.filter((po) =>
    ["draft", "sent_to_finance", "finance_accepted", "finance_declined"].includes(
      po.status,
    ),
  );
  const totalAccrualExposure = accrualCandidates.reduce(
    (s, po) => s + po.totalValue - po.receivedValue,
    0,
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Purchase Orders
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Draft → Finance → paid → confirmed → goods received
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {[
          {
            label: "Total POs",
            value: poList.length,
            sub: "All time",
            color: "bg-gray-50 border-gray-200 text-gray-900",
          },
          {
            label: "With Finance",
            value: poList.filter((p) =>
              ["sent_to_finance", "finance_accepted"].includes(p.status),
            ).length,
            sub: "Awaiting payment",
            color: "bg-indigo-50 border-indigo-200 text-indigo-700",
          },
          {
            label: "Total Open Value",
            value: fmt(totalValue),
            sub: "Outstanding",
            color: "bg-amber-50 border-amber-200 text-amber-700",
          },
          {
            label: "Accrual Exposure",
            value: fmt(totalAccrualExposure),
            sub: `${accrualCandidates.length} POs not yet paid`,
            color: "bg-amber-50 border-amber-200 text-amber-700",
          },
          {
            label: "Goods Received",
            value: poList.filter((p) => p.status === "goods_received").length,
            sub: "Chain complete",
            color: "bg-green-50 border-green-200 text-green-700",
          },
        ].map((s) => (
          <div key={s.label} className={`p-4 rounded-lg border ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm mt-0.5 opacity-80">{s.label}</p>
            <p className="text-xs mt-0.5 opacity-60">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => {
          const count =
            tab.key === "all"
              ? poList.length
              : poList.filter((po) => po.status === tab.key).length;
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

      <DataTable<PurchaseOrder>
        columns={columns}
        data={filtered}
        keyExtractor={(po) => po.id}
        searchPlaceholder="Search by PO ID, supplier, or material..."
        searchFields={[
          (po) => po.poRef,
          (po) => po.prRef,
          (po) => po.supplier,
          (po) => po.items.map((i: { material: string }) => i.material).join(" "),
        ]}
        headerExtra={
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
          >
            <DownloadCloud className="w-3.5 h-3.5" /> Export CSV
          </button>
        }
      />

      {createFromExisting && (
        <NewPOModal
          initial={createFromExisting}
          onClose={() => setCreateFromExisting(null)}
          onSave={handleModalSave}
        />
      )}
      {viewPO && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {viewPO.poRef}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {viewPO.supplier} · raised by {viewPO.createdBy}
                </p>
              </div>
              <button
                onClick={() => setViewPO(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto space-y-5">
              <StatusBadge {...statusDef(PURCHASE_ORDER_STATUS, viewPO.status)} />
              {/* The dates behind the status, so the order says when each step
                  happened rather than only which step it is on. */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: "Purchase request", value: viewPO.prRef || "—" },
                  { label: "Material request", value: viewPO.mrRef || "—" },
                  { label: "Finance invoice", value: viewPO.financeRef || "—" },
                  { label: "Expected delivery", value: viewPO.expectedDate },
                  {
                    label: "Sent to Finance",
                    value: viewPO.sentToFinanceAt || "—",
                  },
                  {
                    label: "Finance decided",
                    value: viewPO.financeDecidedAt || "—",
                  },
                  { label: "Paid", value: viewPO.paidAt || "—" },
                  { label: "Confirmed", value: viewPO.confirmedAt || "—" },
                ].map((f) => (
                  <div key={f.label}>
                    <p className="text-xs text-gray-500">{f.label}</p>
                    <p className="text-gray-900">{f.value}</p>
                  </div>
                ))}
              </div>
              {viewPO.declineReason && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-red-700">
                    Declined by Finance
                  </p>
                  <p className="text-sm text-red-600 mt-0.5">
                    {viewPO.declineReason}
                  </p>
                </div>
              )}
              <div className="border border-gray-200 rounded-xl overflow-x-auto">
                <table className="min-w-[560px] w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                        Material
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">
                        Qty
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">
                        Unit cost
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">
                        Received
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {viewPO.items.map(
                      (
                        it: {
                          material: string;
                          qty: number;
                          unit: string;
                          unitCost: number;
                          received: number;
                        },
                        i: number,
                      ) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-gray-700">
                            {it.material}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {it.qty} {it.unit}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {formatCurrencyByGeneralSettings(it.unitCost)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-500">
                            {it.received} {it.unit}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setViewPO(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancelled, not deleted: deleting an order takes the quote it was
          awarded from, the invoice Finance raised for it and the payment with
          it. */}
      <ConfirmationModal
        isOpen={Boolean(cancelTarget)}
        title="Cancel purchase order"
        description={
          cancelTarget
            ? `Cancel ${cancelTarget.poRef} for ${cancelTarget.supplier}? It stays on record, and any unpaid invoice raised for it in Finance is cancelled too.`
            : ""
        }
        confirmLabel="Cancel order"
        isDangerous
        onConfirm={confirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
