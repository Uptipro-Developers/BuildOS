import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  fetchPurchaseOrders,
  sendPOToFinance,
  createPO,
  cancelPurchaseOrder,
  type MappedPurchaseOrder,
} from "../../api/purchase-orders";
import { getReferenceData } from "../../api/reference-data";
import { getSignatories } from "../../api/signatories";
import { getPaymentTerms, type DeliverySplit, type TrancheTiming } from "../../api/payment-terms";
import { getCompanyProfile, type CompanyProfile } from "../../api/admin-extras";
import {
  PurchaseOrderPaper,
  printPurchaseOrder,
  BLANK_COMPANY_PROFILE,
  type PaymentTermPreset,
  type PaymentTranche,
  type Signatory,
  type POPreviewItem,
} from "../../components/PurchaseOrderPaper";
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
  FileText,
  Send,
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
  { key: "po_created", label: "Created" },
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
// Picked per order from the list configured in Procurement Settings ›
// Payment Terms (server/src/payment-terms), each split into tranches.
// `deliverySplit` is what lets the order go straight to Finance on creation
// (see handleModalSave) rather than waiting for Goods Receipt — it's set
// explicitly on the term in Settings, not derived from the tranches.

function tranchesLabel(tranches: PaymentTranche[]): string {
  return tranches.map((t) => `${t.percent}% ${t.title}`).join(" + ");
}

/**
 * The "Before Delivery" bucket, by definition, is 100% due before goods
 * ship — there's really only one shape that fits, so rather than depending
 * on Settings having filed a matching preset, this is always available and
 * always selected the moment that bucket is picked.
 */
const FULL_PREDELIVERY_TERM: PaymentTermPreset = {
  id: "full-predelivery",
  name: "100% before delivery",
  description: "Full payment due at PO approval, before goods are shipped.",
  deliverySplit: "pre_delivery",
  tranches: [{ title: "Full payment", percent: 100, timing: "on_po_approval" }],
};

/** Whether Finance can act at PO approval, per how this term is filed in Settings. */
function isPreDeliveryTerm(term: PaymentTermPreset): boolean {
  return term.deliverySplit === "pre_delivery";
}

type TimingBucket = "before" | "after" | "both";

/**
 * Which of the 3 Payment Timing buckets a term falls into, from its actual
 * tranches — not `deliverySplit`, which only distinguishes "has any
 * before-delivery portion" from "none" and can't tell "100% before" apart
 * from a mixed deposit-plus-balance term.
 */
function timingBucketFor(term: { tranches: PaymentTranche[] }): TimingBucket {
  const total = term.tranches.length;
  if (total === 0) return "after";
  const beforeCount = term.tranches.filter((t) => t.timing === "on_po_approval").length;
  if (beforeCount === 0) return "after";
  if (beforeCount === total) return "before";
  return "both";
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
  onSendToFinance,
}: {
  /**
   * An existing draft order to carry forward rather than build from scratch —
   * it was already raised from an accepted quote (or created directly), so its
   * supplier and items are real and not re-collected. When set, Step 1 (PO
   * setup) is skipped entirely: the wizard opens straight on payment terms.
   */
  initial?: PurchaseOrder;
  onClose: () => void;
  /**
   * Called from "Save and Preview PO" — the PO is actually saved (and Goods
   * Receipt opened) before the preview shows, not after. Resolves `true` to
   * advance to the preview, `false` to stay on step 2 (the caller has
   * already shown the error toast).
   */
  onSave: (
    payload: NewPOPayload,
    meta: {
      paymentTerm: PaymentTermPreset;
      signatories: Signatory[];
      /** Set when carrying an existing order forward — skips creating a new one. */
      existingId?: string;
    },
  ) => Promise<boolean>;
  /**
   * Called from the step-3 button when the term needs Finance's approval up
   * front (Before / Before-and-After delivery) — resolves `true` on success,
   * in which case the modal closes; `false` leaves it open (the caller has
   * already shown the error toast).
   */
  onSendToFinance: (po: PurchaseOrder) => Promise<boolean>;
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
  const [timingCat, setTimingCat] = useState<TimingBucket>("before");
  const [paymentTermId, setPaymentTermId] = useState("");
  const [customMode, setCustomMode] = useState(false);
  // Terms defined inline this session — not persisted anywhere once the modal closes.
  const [customTerms, setCustomTerms] = useState<PaymentTermPreset[]>([]);
  const [customForm, setCustomForm] = useState<{
    name: string;
    description: string;
    tranches: { title: string; percent: string; timing: TrancheTiming }[];
  }>({
    name: "",
    description: "",
    tranches: [{ title: "", percent: "100", timing: "on_delivery" }],
  });
  // The real list configured in Procurement Settings › Payment Terms, not
  // the hardcoded 5 presets every PO used to pick from before Settings had
  // a real place to manage them.
  const [termOptions, setTermOptions] = useState<PaymentTermPreset[]>([]);
  const [termsLoading, setTermsLoading] = useState(true);
  const [termsError, setTermsError] = useState(false);
  // The real list configured in Procurement Settings › Signatories, not a
  // fixed set every PO used to pick from regardless of who's actually on
  // file.
  const [signatoryOptions, setSignatoryOptions] = useState<Signatory[]>([]);
  const [signatoriesLoading, setSignatoriesLoading] = useState(true);
  const [signatoriesError, setSignatoriesError] = useState(false);
  const [selectedSignatories, setSelectedSignatories] = useState<string[]>([]);

  useEffect(() => {
    getPaymentTerms()
      .then((rows) => {
        setTermOptions(
          rows.map((r) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            deliverySplit: r.deliverySplit,
            tranches: r.tranches,
          })),
        );
        setPaymentTermId((prev) => prev || (rows.find((r) => r.isDefault) ?? rows[0])?.id || "");
      })
      .catch(() => setTermsError(true))
      .finally(() => setTermsLoading(false));
  }, []);

  useEffect(() => {
    getSignatories()
      .then((rows) => {
        const options: Signatory[] = rows.map((r) => ({
          id: r.id,
          name: r.user?.name ?? "Unknown",
          role: r.role,
          signature: r.user?.signature ?? null,
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

  // Letterhead for the preview/PDF — falls back to BLANK_COMPANY_PROFILE
  // while this is loading (or if it fails) rather than blocking the wizard.
  const [company, setCompany] = useState<CompanyProfile>(BLANK_COMPANY_PROFILE);
  useEffect(() => {
    getCompanyProfile()
      .then(setCompany)
      .catch(() => { });
  }, []);

  const allTerms = [FULL_PREDELIVERY_TERM, ...termOptions, ...customTerms];
  const filteredTerms = allTerms.filter((t) => timingBucketFor(t) === timingCat);
  // Falls back to an empty placeholder only while the real list is still
  // loading (or failed) — canPreview keeps the wizard from reaching step 3
  // in that state, so this is never actually shown to the buyer.
  const term = allTerms.find((t) => t.id === paymentTermId) ??
    allTerms[0] ?? { id: "", name: "", description: "", deliverySplit: "post_delivery" as DeliverySplit, tranches: [] };

  // When the timing bucket changes, keep the selected term valid for it —
  // otherwise the detail card below would show a term the filter just hid.
  // If nothing is filed under that bucket at all, switch straight to custom
  // mode instead of leaving "Save and Preview PO" dead with no way forward
  // beyond noticing the empty-state hint and ticking the checkbox by hand.
  function pickTermForCat(cat: TimingBucket): { id: string; useCustom: boolean } {
    const matches = allTerms.filter((t) => timingBucketFor(t) === cat);
    return { id: matches[0]?.id ?? "", useCustom: matches.length === 0 };
  }

  const customTotal = customForm.tranches.reduce((s, t) => s + (parseFloat(t.percent) || 0), 0);
  const customValid =
    !!customForm.name.trim() &&
    customForm.tranches.length > 0 &&
    customForm.tranches.every((t) => t.title.trim() && parseFloat(t.percent) > 0) &&
    Math.round(customTotal) === 100;
  const canPreview = customMode
    ? customValid
    : !termsLoading && !termsError && filteredTerms.length > 0;

  const toggleSignatory = (name: string) =>
    setSelectedSignatories((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );

  const [saving, setSaving] = useState(false);
  const [sendingToFinance, setSendingToFinance] = useState(false);

  /**
   * "Save and Preview PO" — the order is actually saved here, before the
   * preview shows, not after. `term` (derived from state) can't be trusted
   * yet for a fresh custom term: the setCustomTerms/setPaymentTermId calls
   * below only take effect on the next render, so the object built here is
   * used directly for the save instead of relying on the stale `term`.
   */
  async function continueToPreview() {
    let termToSave = term;
    if (customMode) {
      const id = `custom-${Date.now()}`;
      // No manual Delivery Split field for an ad-hoc custom term (that's a
      // Settings-page concept) — derived instead from whether any tranche is
      // due before delivery.
      const deliverySplit: DeliverySplit = customForm.tranches.some(
        (t) => t.timing === "on_po_approval",
      )
        ? "pre_delivery"
        : "post_delivery";
      const builtTerm: PaymentTermPreset = {
        id,
        name: customForm.name.trim(),
        description: customForm.description.trim(),
        deliverySplit,
        tranches: customForm.tranches.map((t) => ({
          title: t.title.trim(),
          percent: parseFloat(t.percent) || 0,
          timing: t.timing,
        })),
      };
      setCustomTerms((prev) => [...prev, builtTerm]);
      setPaymentTermId(id);
      termToSave = builtTerm;
    }
    if (!initial?.id) return;
    setSaving(true);
    try {
      const ok = await onSave(
        {
          supplierId,
          prRef: prRef.trim() || undefined,
          createdBy: getAuthUserName() || "Current User",
          expectedDate: addDaysIso(parseInt(deliveryDays) || 7),
          totalValue,
          items: previewItems(),
        },
        { paymentTerm: termToSave, signatories: previewSignatories, existingId: initial.id },
      );
      if (ok) setStep(3);
    } finally {
      setSaving(false);
    }
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
  // Whether Finance can act at PO approval, per this term's Delivery Split.
  const sendToFinanceNow = isPreDeliveryTerm(term);

  function previewItems(): POPreviewItem[] {
    return items.map((it) => ({
      material: it.material,
      qty: parseFloat(it.qty) || 0,
      unit: it.unit,
      unitCost: parseFloat(it.unitCost) || 0,
    }));
  }


  function handleDownload() {
    printPurchaseOrder({
      company,
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
                    { key: "before", label: "Before Delivery", desc: "100% before delivery" },
                    { key: "after", label: "After Delivery", desc: "Due after goods received" },
                    { key: "both", label: "Before and After Delivery", desc: "Split across delivery" },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      setTimingCat(c.key);
                      const picked = pickTermForCat(c.key);
                      setCustomMode(picked.useCustom);
                      setPaymentTermId(picked.id);
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
                    <div
                      key={i}
                      className="grid grid-cols-[minmax(0,1.4fr)_64px_minmax(0,1fr)_28px] gap-1.5 items-center"
                    >
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
                        className="w-full min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="relative min-w-0">
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
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm pr-5 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                ? { ...x, timing: e.target.value as TrancheTiming }
                                : x,
                            ),
                          })
                        }
                        className="w-full min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg disabled:text-gray-300 disabled:hover:text-gray-300 disabled:cursor-not-allowed"
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
                  {termsLoading ? (
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-400">
                      Loading payment terms…
                    </div>
                  ) : termsError ? (
                    <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-500">
                      Could not load payment terms from Procurement Settings.
                    </div>
                  ) : filteredTerms.length === 0 ? (
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-500">
                      No payment terms filed as{" "}
                      {timingCat === "before"
                        ? "100% before delivery"
                        : timingCat === "after"
                          ? "paid after delivery"
                          : "split before and after delivery"}{" "}
                      — add one in Procurement Settings › Payment Terms, or tick "Create custom
                      terms" to define one here.
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
                  {!termsLoading && !termsError && filteredTerms.length > 0 && (
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
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 mb-4 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {sendToFinanceNow
                ? "PO created — Goods Receipt is now open. Use Send to Finance on the Purchase Orders table when ready."
                : "PO created — Goods Receipt is now open. Finance is invoiced automatically once the order is fully received."}
            </div>
            <PurchaseOrderPaper
              company={company}
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
              disabled={!canPreview || saving}
              className="px-4 py-2 text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? "Saving…" : "Save and Preview PO"} <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              disabled={sendingToFinance}
              onClick={async () => {
                if (!sendToFinanceNow) {
                  onClose();
                  return;
                }
                if (!initial) return;
                setSendingToFinance(true);
                try {
                  const ok = await onSendToFinance(initial);
                  if (ok) onClose();
                } finally {
                  setSendingToFinance(false);
                }
              }}
              className="px-4 py-2 text-sm bg-indigo-700 text-white rounded-xl hover:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sendToFinanceNow ? (
                <>
                  <Send className="w-4 h-4" /> {sendingToFinance ? "Sending…" : "Send to Finance"}
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" /> Done
                </>
              )}
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
  /** The order the file icon was clicked on — the read-only PurchaseOrderPaper view. */
  const [previewPO, setPreviewPO] = useState<PurchaseOrder | null>(null);
  const [previewCompany, setPreviewCompany] = useState<CompanyProfile>(BLANK_COMPANY_PROFILE);
  useEffect(() => {
    if (!previewPO) return;
    getCompanyProfile().then(setPreviewCompany).catch(() => { });
  }, [previewPO]);
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
   * Shared by both `NewPOModal` instances below — called from "Save and
   * Preview PO", before the preview shows. `meta.existingId` set means the
   * wizard was opened on an order that already exists (raised from an
   * accepted quote, sitting in draft) — nothing new is created, the
   * existing order is just carried forward.
   *
   * Returns whether the save succeeded — the modal only advances to the
   * preview on `true`, and stays on step 2 (with the error already toasted)
   * on `false`. Deliberately doesn't close the modal either way: the
   * preview is the point of clicking this button, not a side effect of it.
   */
  async function handleModalSave(
    // Only reachable via createFromExisting now — nothing here builds a new
    // order from this payload, but NewPOModal's onSave still passes one.
    _payload: NewPOPayload,
    meta: {
      paymentTerm: PaymentTermPreset;
      signatories: Signatory[];
      existingId?: string;
    },
  ): Promise<boolean> {
    if (!meta.existingId) return false;
    try {
      // createPO already maps the response — no need to map it again.
      const po = await createPO(meta.existingId, {
        paymentTermId: meta.paymentTerm.id,
        deliverySplit: meta.paymentTerm.deliverySplit,
        signatories: meta.signatories.map((s) => ({
          id: s.id,
          name: s.name,
          role: s.role,
          signature: s.signature ?? null,
        })),
        paymentTermSnapshot: {
          name: meta.paymentTerm.name,
          description: meta.paymentTerm.description,
          deliverySplit: meta.paymentTerm.deliverySplit,
          tranches: meta.paymentTerm.tranches,
        },
      });
      setPoList((prev) => prev.map((p) => (p.id === po.id ? po : p)));
      logChange({
        module: "Procurement",
        action: "PO created",
        entityType: "PurchaseOrder",
        entityId: po.id,
        summary: `PO ${po.poRef} created — ${meta.paymentTerm.name}`,
        performedBy: "Current User",
      });
      toast.success(`${po.poRef} created.`, {
        description: "Goods Receipt is now open for this order.",
      });
      return true;
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to create the purchase order.",
      );
      return false;
    }
  }

  /**
   * The row action for an order that still needs Finance's approval up
   * front — also called directly from the wizard's step-3 button, so its
   * return value (the updated order, or undefined on failure — `step`
   * already toasted the error) tells the caller whether to close the modal.
   */
  async function handleSendToFinance(po: PurchaseOrder) {
    return step(
      po,
      () => sendPOToFinance(po.id, getAuthUserName() || undefined),
      "Sent to Finance",
      `PO ${po.poRef} sent to Finance`,
      `${po.poRef} sent to Finance.`,
    );
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
       * "Create PO" while the order hasn't been created yet (draft, or
       * bounced back by Finance for rework). Once created: "Send to
       * Finance" for a Before/Before-and-After-delivery order that hasn't
       * gone to Finance yet — the deposit portion needs approving before
       * anything else can happen. Otherwise "Goods Receipt" — either the
       * order is After-delivery (nothing for Finance to approve up front) or
       * it's already been sent. Nothing for a cancelled order. The file icon
       * is additive, shown on any order that's been created, regardless of
       * which of the two the main button is.
       */
      render: (po) => {
        if (po.status === "cancelled") return null;
        const created = po.status !== "draft" && po.status !== "finance_declined";
        const needsFinanceFirst = created && po.deliverySplit === "pre_delivery" && !po.sentToFinance;
        return (
          <div className="flex items-center justify-end gap-1 flex-wrap">
            {!created ? (
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
            ) : needsFinanceFirst ? (
              <button
                type="button"
                disabled={working === po.id}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleSendToFinance(po);
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3 h-3" /> Send to Finance
              </button>
            ) : (
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
            )}
            {created && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewPO(po);
                }}
                title="Preview PO"
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
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
          onSendToFinance={async (po) => !!(await handleSendToFinance(po))}
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

      {/* The file icon — a read-only re-view of the PO exactly as it was
          created, from the snapshots taken at that point rather than
          whatever's current in Settings. */}
      {previewPO && (() => {
        const snap = previewPO.paymentTermSnapshot;
        const previewTerm: PaymentTermPreset = {
          id: previewPO.paymentTermId || "snapshot",
          name: snap?.name || "—",
          description: snap?.description || "",
          deliverySplit: (snap?.deliverySplit as DeliverySplit) || "post_delivery",
          tranches: snap?.tranches || [],
        };
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                <h2 className="text-base font-semibold text-gray-900">{previewPO.poRef}</h2>
                <button
                  onClick={() => setPreviewPO(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 py-6 bg-gray-50/50">
                <PurchaseOrderPaper
                  company={previewCompany}
                  poRef={previewPO.poRef}
                  createdDate={previewPO.createdDate}
                  supplier={previewPO.supplier}
                  supplierContact={previewPO.supplierContact || previewPO.supplier}
                  expectedDate={previewPO.expectedDate}
                  items={previewPO.items}
                  totalValue={previewPO.totalValue}
                  term={previewTerm}
                  signatories={previewPO.signatories}
                />
              </div>
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() =>
                    printPurchaseOrder({
                      company: previewCompany,
                      poRef: previewPO.poRef,
                      createdDate: previewPO.createdDate,
                      supplier: previewPO.supplier,
                      supplierContact: previewPO.supplierContact || previewPO.supplier,
                      expectedDate: previewPO.expectedDate,
                      items: previewPO.items,
                      totalValue: previewPO.totalValue,
                      term: previewTerm,
                      signatories: previewPO.signatories,
                    })
                  }
                  title="Download PDF"
                  className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                >
                  <DownloadCloud className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setPreviewPO(null)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
