import { notifyLoadFailure } from "../../utils/loadFailure";
import { useState, useEffect, Fragment } from "react";
import { toast } from "sonner";
import {
  getReceivedQuotes,
  createReceivedQuote,
  updateReceivedQuote,
  getSentRFQs,
  ReceivedQuote as ApiReceivedQuote,
  SentRFQ as ApiSentRFQ,
} from "../../api/procurement-requests";
import { getReferenceData } from "../../api/reference-data";
import { useProcurementUnits } from "../../utils/useProcurementUnits";
import {
  getCurrencySymbol,
  formatDateByGeneralSettings,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";
import {
  Search,
  ChevronDown,
  ChevronRight,
  FileText,
  CheckCircle2,
  ShoppingCart,
  XCircle,
  Eye,
  Plus,
  X,
  Trash2,
  CheckCircle,
  Scale,
  MessageSquare,
  RotateCcw,
  MapPin,
  Layers,
} from "lucide-react";
import { useNumbering } from "../../stores/numberingStore";
import { useNavigate } from "react-router";
import { StatusBadge } from "../../components/StatusBadge";
import { RowAction, RowActions } from "../../components/RowAction";
import {
  RECEIVED_QUOTE_STATUS,
  statusDef,
} from "../../utils/procurementWorkflow";

type VendorDocType = "quote" | "invoice";
type DocStatus = "pending_review" | "approved" | "po_created" | "rejected";
type NegotiationStatus = "open" | "accepted" | "rejected" | "countered";

interface NegotiationRound {
  round: number;
  date: string;
  proposedAmount: number;
  status: NegotiationStatus;
  comment: string;
  by: string;
}

interface VendorDoc {
  id: string;
  rfqRef: string;
  prRef: string;
  vendor: string;
  /** The Supplier record behind `vendor` — a purchase order is keyed on it. */
  supplierId?: string;
  project: string;
  docType: VendorDocType;
  receivedDate: string;
  validUntil?: string;
  status: DocStatus;
  totalAmount: number;
  items: {
    material: string;
    qty: number;
    unit: string;
    unitPrice: number;
    total: number;
    negotiations?: NegotiationRound[];
  }[];
  notes?: string;
  destinationStore?: string;
  storeLevel?: string;
}

// MOCK_DOCS removed — data fetched from API

function fromApi(r: ApiReceivedQuote): VendorDoc {
  const validStatuses: DocStatus[] = [
    "pending_review",
    "approved",
    "po_created",
    "rejected",
  ];
  const rawStatus = (r.status ?? "pending_review")
    .toLowerCase()
    .replace(/ /g, "_") as DocStatus;
  const status: DocStatus = validStatuses.includes(rawStatus)
    ? rawStatus
    : "pending_review";
  return {
    id: r.id,
    rfqRef: r.rfqRef,
    // These four were hardcoded blank because the columns did not exist. `prRef`
    // in particular is what quote comparison groups on, so every stored quote
    // came back ungroupable and the comparison view was permanently empty.
    prRef: r.prRef ?? "",
    vendor: r.supplierName,
    supplierId: r.supplierId,
    project: r.projectName ?? "",
    destinationStore: r.destinationStore ?? undefined,
    storeLevel: r.storeLevel ?? undefined,
    docType: "quote",
    receivedDate: r.receivedDate,
    validUntil: r.validUntil,
    status,
    totalAmount: r.totalValue,
    items: Array.isArray(r.items)
      ? (
          r.items as {
            material?: string;
            materialName?: string;
            qty?: number;
            unit?: string;
            unitPrice?: number;
            total?: number;
            negotiations?: NegotiationRound[];
          }[]
        ).map((it) => ({
          material: it.materialName ?? it.material ?? "",
          qty: it.qty ?? 0,
          unit: it.unit ?? "Units",
          unitPrice: it.unitPrice ?? 0,
          total: it.total ?? (it.qty ?? 0) * (it.unitPrice ?? 0),
          negotiations: it.negotiations,
        }))
      : [],
    notes: r.notes,
  };
}

function fmt(n: number) {
  const symbol = getCurrencySymbol();
  if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${symbol}${(n / 1000).toFixed(0)}K`;
  return `${symbol}${n}`;
}

interface DocItem {
  material: string;
  qty: string;
  unit: string;
  unitPrice: string;
}

function RecordDocModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (doc: VendorDoc) => void;
}) {
  const today = new Date();
  const fmtDate = (d: Date) => formatDateByGeneralSettings(d);
  const addDays = (n: number) => {
    const d2 = new Date(today);
    d2.setDate(d2.getDate() + n);
    return fmtDate(d2);
  };

  const docType: VendorDocType = "quote";
  const [vendors, setVendors] = useState<string[]>([]);
  /** Supplier ids by name, so the saved quote carries the id and not just a label. */
  const [vendorIds, setVendorIds] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<string[]>([]);
  const [stores, setStores] = useState<{ name: string; level: string }[]>([]);
  // The material catalogue, so a line item can only reference a material
  // that already exists rather than a free-typed name.
  const [materialOptions, setMaterialOptions] = useState<
    { name: string; unit: string }[]
  >([]);
  const [vendor, setVendor] = useState("");
  const [rfqRef, setRfqRef] = useState("");
  const [prRef, setPrRef] = useState("");
  /** RFQs already sent, so a quote can be attached to the one it answers. */
  const [sentRfqs, setSentRfqs] = useState<ApiSentRFQ[]>([]);
  const [project, setProject] = useState("");
  const [validDays, setValidDays] = useState("10");
  const [notes, setNotes] = useState("");
  const [destinationStore, setDestinationStore] = useState("");
  const units = useProcurementUnits();
  const [items, setItems] = useState<DocItem[]>([
    { material: "", qty: "", unit: units[0], unitPrice: "" },
  ]);

  useEffect(() => {
    getReferenceData()
      .then((data) => {
        const vendorNames = data.suppliers.map((s) => s.name);
        setVendorIds(
          Object.fromEntries(data.suppliers.map((s) => [s.name, s.id])),
        );
        const projectNames = data.projects.map((p) => p.name);
        const storeOptions = data.stores.map((s) => ({
          name: s.name,
          level: s.type,
        }));
        setVendors(vendorNames);
        setProjects(projectNames);
        setStores(storeOptions);
        setVendor((prev) => prev || vendorNames[0] || "");
        setProject((prev) => prev || projectNames[0] || "");
        setDestinationStore((prev) => prev || storeOptions[0]?.name || "");
        setMaterialOptions(
          (data.materials ?? [])
            .map((m) => ({ name: m.name, unit: m.unit ?? "" }))
            .filter((m) => m.name),
        );
      })
      .catch(() => {});

    getSentRFQs()
      .then((rows) => setSentRfqs(Array.isArray(rows) ? rows : []))
      .catch(() => {});
  }, []);

  /**
   * Attaches the quote to the RFQ it answers, carrying that RFQ's supplier and
   * purchase-request reference across.
   */
  function selectRfq(ref: string) {
    setRfqRef(ref);
    const rfq = sentRfqs.find((r) => r.rfqRef === ref);
    if (!rfq) return;
    setPrRef(rfq.prRef ?? "");
    if (rfq.supplierName) setVendor(rfq.supplierName);
  }

  const addItem = () =>
    setItems((p) => [
      ...p,
      { material: "", qty: "", unit: units[0], unitPrice: "" },
    ]);
  const removeItem = (i: number) =>
    setItems((p) => p.filter((_, j) => j !== i));
  const updateItem = (i: number, k: keyof DocItem, v: string) =>
    setItems((p) => p.map((it, j) => (j === i ? { ...it, [k]: v } : it)));

  const { allocate } = useNumbering();
  const totalAmount = items.reduce(
    (s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.unitPrice) || 0),
    0,
  );
  const valid =
    vendor &&
    items.every(
      (it) => it.material.trim() && it.qty.trim() && it.unitPrice.trim(),
    );

  async function handleSave() {
    if (!valid) return;
    const nextId = await allocate(docType === "quote" ? "Quote" : "PurchaseInvoice");
    const selectedStore = stores.find((s) => s.name === destinationStore);
    onSave({
      id: nextId,
      rfqRef: rfqRef.trim() || "—",
      prRef: prRef.trim() || "—",
      vendor,
      supplierId: vendorIds[vendor],
      project,
      docType,
      receivedDate: fmtDate(today),
      validUntil:
        docType === "quote" ? addDays(parseInt(validDays) || 10) : undefined,
      status: "pending_review",
      totalAmount,
      destinationStore,
      storeLevel: selectedStore?.level,
      items: items.map((it) => ({
        material: it.material,
        qty: parseFloat(it.qty) || 0,
        unit: it.unit,
        unitPrice: parseFloat(it.unitPrice) || 0,
        total: (parseFloat(it.qty) || 0) * (parseFloat(it.unitPrice) || 0),
      })),
      notes: notes.trim() || undefined,
    });
  }

  const fmt = (n: number) => {
    const symbol = getCurrencySymbol();
    return n >= 1_000_000
      ? `${symbol}${(n / 1_000_000).toFixed(2)}M`
      : n >= 1000
        ? `${symbol}${(n / 1000).toFixed(0)}K`
        : `${symbol}${n}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            Record Submission
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
                Vendor <span className="text-red-500">*</span>
              </label>
              <select
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {vendors.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
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
                RFQ Reference
              </label>
              {/* Picked from the RFQs actually sent, not typed. A quote answers
                  an RFQ, and choosing it is what supplies the purchase-request
                  reference below — which the comparison view groups on. Typed
                  free-hand, one transposed digit silently orphaned the quote. */}
              <select
                value={rfqRef}
                onChange={(e) => selectRfq(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Unsolicited — no RFQ</option>
                {sentRfqs.map((r) => (
                  <option key={r.id} value={r.rfqRef}>
                    {r.rfqRef} · {r.supplierName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                PR Reference
              </label>
              <input
                value={prRef}
                onChange={(e) => setPrRef(e.target.value)}
                placeholder="PR-0019"
                readOnly={Boolean(rfqRef)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm read-only:bg-gray-50 read-only:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-0.5">
                {rfqRef
                  ? "Taken from the selected RFQ."
                  : "Quotes sharing a PR reference can be compared side by side."}
              </p>
            </div>
            {docType === "quote" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Valid For (days)
                </label>
                <input
                  type="number"
                  value={validDays}
                  onChange={(e) => setValidDays(e.target.value)}
                  min={1}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-0.5">
                  Valid until: {addDays(parseInt(validDays) || 10)}
                </p>
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <MapPin className="inline w-3 h-3 mr-1 text-gray-400" />
                Delivery Destination Store{" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                value={destinationStore}
                onChange={(e) => setDestinationStore(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {stores.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} — {s.level}
                  </option>
                ))}
              </select>
              {destinationStore && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Layers className="w-3 h-3 text-blue-400" />
                  <p className="text-xs text-blue-600">
                    {stores.find((s) => s.name === destinationStore)?.level}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Line items */}
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
                    value={item.unitPrice}
                    onChange={(e) => updateItem(i, "unitPrice", e.target.value)}
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
            {totalAmount > 0 && (
              <div className="flex justify-end mt-2">
                <span className="text-sm font-semibold text-gray-800">
                  Total: {fmt(totalAmount)}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional notes…"
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
            onClick={handleSave}
            disabled={!valid}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <FileText className="w-4 h-4" /> Save Document
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Negotiate Quote Modal ─────────────────────────────────────────────────────
const NEGO_STATUS_STYLE: Record<NegotiationStatus, string> = {
  open: "bg-amber-100 text-amber-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  countered: "bg-blue-100 text-blue-700",
};

function NegotiateModal({
  doc,
  itemIndex,
  onClose,
  onSave,
}: {
  doc: VendorDoc;
  itemIndex: number;
  onClose: () => void;
  onSave: (rounds: NegotiationRound[]) => void;
}) {
  const item = doc.items[itemIndex];
  const rounds = item.negotiations ?? [];
  const [proposedUnitPrice, setProposedUnitPrice] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<NegotiationStatus>("countered");
  const today = formatDateByGeneralSettings(new Date());

  const parsedUnitPrice = parseFloat(proposedUnitPrice.replace(/,/g, ""));
  const proposedTotal =
    !isNaN(parsedUnitPrice) && parsedUnitPrice > 0
      ? parsedUnitPrice * item.qty
      : 0;

  function addRound() {
    if (!proposedUnitPrice.trim() || !comment.trim() || proposedTotal <= 0)
      return;
    const newRound: NegotiationRound = {
      round: rounds.length + 1,
      date: today,
      proposedAmount: proposedTotal,
      status,
      comment,
      by: "Procurement Team",
    };
    onSave([...rounds, newRound]);
    onClose();
  }

  const currentBestTotal =
    rounds.length > 0 ? rounds[rounds.length - 1].proposedAmount : item.total;
  const currentBestUnitPrice =
    item.qty > 0 ? currentBestTotal / item.qty : item.unitPrice;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Line Item Negotiation — {doc.id}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {doc.vendor} ·{" "}
              <span className="font-medium text-gray-700">{item.material}</span>{" "}
              · {item.qty} {item.unit}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Item summary */}
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-gray-800">{item.material}</p>
              <p className="text-xs text-gray-500">
                {item.qty} {item.unit} × {fmt(item.unitPrice)}/unit
              </p>
            </div>
            <p className="font-bold text-gray-900">{fmt(item.total)}</p>
          </div>

          {/* Negotiation history */}
          {rounds.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Negotiation History ({rounds.length} round
                {rounds.length > 1 ? "s" : ""})
              </p>
              <div className="space-y-2">
                {rounds.map((r) => (
                  <div
                    key={r.round}
                    className="border border-gray-100 rounded-xl px-4 py-3 bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-700">
                            Round {r.round}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${NEGO_STATUS_STYLE[r.status]}`}
                          >
                            {r.status.charAt(0).toUpperCase() +
                              r.status.slice(1)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {r.date}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 italic">
                          "{r.comment}"
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">— {r.by}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-800">
                          {fmt(r.proposedAmount)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {item.qty > 0
                            ? `≈ ${fmt(Math.round(r.proposedAmount / item.qty))}/unit`
                            : ""}
                        </p>
                        <p className="text-xs mt-0.5">
                          {r.proposedAmount < item.total ? (
                            <span className="text-green-600">
                              ↓{" "}
                              {(
                                (1 - r.proposedAmount / item.total) *
                                100
                              ).toFixed(1)}
                              % off
                            </span>
                          ) : (
                            <span className="text-gray-400">same</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-sm">
                <RotateCcw className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="text-blue-700">
                  Current best: <strong>{fmt(currentBestTotal)}</strong>{" "}
                  <span className="font-normal text-blue-500">
                    ({fmt(Math.round(currentBestUnitPrice))}/unit)
                  </span>
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl px-4 py-6 text-center">
              <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                No negotiation rounds yet. Start the first round below.
              </p>
            </div>
          )}

          {/* New round form */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              New Round (Round {rounds.length + 1})
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Proposed Unit Price ({getCurrencySymbol()}){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  value={proposedUnitPrice}
                  onChange={(e) => setProposedUnitPrice(e.target.value)}
                  placeholder={`e.g. ${formatNumberByGeneralSettings(Math.round(currentBestUnitPrice * 0.95))}`}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {proposedTotal > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Total: {fmt(proposedTotal)} ({item.qty} ×{" "}
                    {fmt(parsedUnitPrice)})
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Round Status
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as NegotiationStatus)
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="countered">Counter Offer</option>
                  <option value="accepted">Accept Price</option>
                  <option value="rejected">Reject Price</option>
                  <option value="open">Open / Awaiting Response</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Comment / Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Explain the price change, justify the decision, or add relevant context for audit trail…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
            onClick={addRound}
            disabled={
              !proposedUnitPrice.trim() || !comment.trim() || proposedTotal <= 0
            }
            className="px-4 py-2 text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" /> Add Round
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Compare Quotes Modal ─────────────────────────────────────────────────────
function CompareQuotesModal({
  prRef,
  quotes,
  onClose,
  onApprove,
}: {
  prRef: string;
  quotes: VendorDoc[];
  onClose: () => void;
  /** Approving the winner is what raises the purchase order. */
  onApprove: (doc: VendorDoc) => void;
}) {
  const allMaterials = Array.from(
    new Set(quotes.flatMap((q) => q.items.map((it) => it.material))),
  );
  const lowestAmount = Math.min(...quotes.map((q) => q.totalAmount));
  // Add negotiation modal state
  const [negotiate, setNegotiate] = useState<{
    doc: VendorDoc;
    itemIndex: number;
  } | null>(null);
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Quote Comparison — {prRef}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {quotes.length} supplier quotes received
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Header row */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium w-40">
                    Material
                  </th>
                  {quotes.map((q) => (
                    <th
                      key={q.id}
                      className="text-right px-4 py-3 text-xs font-medium"
                    >
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-gray-800">{q.vendor}</span>
                        <span className="text-gray-400 font-normal">
                          {q.id}
                        </span>
                        <span
                          className={`font-semibold ${q.totalAmount === lowestAmount ? "text-green-600" : "text-gray-500"}`}
                        >
                          {q.totalAmount === lowestAmount ? "★ " : ""}
                          {fmt(q.totalAmount)}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allMaterials.map((mat) => (
                  <tr key={mat} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-700">
                      {mat}
                    </td>
                    {quotes.map((q) => {
                      const item = q.items.find((it) => it.material === mat);
                      const itemNegoCount = item?.negotiations?.length ?? 0;
                      const lastRound =
                        item?.negotiations?.[item.negotiations.length - 1];
                      return (
                        <td
                          key={q.id}
                          className="px-4 py-2.5 text-right text-xs text-gray-600"
                        >
                          {item ? (
                            <>
                              <span className="block font-medium text-gray-800">
                                {fmt(item.total)}
                              </span>
                              <span className="text-gray-400">
                                {fmt(item.unitPrice)} / {item.unit}
                              </span>
                              <button
                                onClick={() =>
                                  setNegotiate({
                                    doc: q,
                                    itemIndex: q.items.findIndex(
                                      (it) => it.material === mat,
                                    ),
                                  })
                                }
                                className={`flex items-center gap-1 ml-auto mt-1 text-xs font-medium ${itemNegoCount > 0 ? "text-purple-700" : "text-purple-500 hover:text-purple-700"}`}
                              >
                                <MessageSquare className="w-3 h-3" />
                                {itemNegoCount > 0
                                  ? `(${itemNegoCount})`
                                  : "Negotiate"}
                                {lastRound && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-xs ${NEGO_STATUS_STYLE[lastRound.status]}`}
                                  >
                                    {lastRound.status.charAt(0).toUpperCase() +
                                      lastRound.status.slice(1)}
                                  </span>
                                )}
                              </button>
                            </>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                  <td className="px-4 py-3 text-xs text-gray-700">Total</td>
                  {quotes.map((q) => (
                    <td
                      key={q.id}
                      className={`px-4 py-3 text-right text-sm ${
                        q.totalAmount === lowestAmount
                          ? "text-green-700"
                          : "text-gray-800"
                      }`}
                    >
                      {fmt(q.totalAmount)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-green-700">
              Lowest bid:{" "}
              <strong>
                {quotes.find((q) => q.totalAmount === lowestAmount)?.vendor}
              </strong>{" "}
              at <strong>{fmt(lowestAmount)}</strong>
            </span>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
          {/* Awarding the comparison is approving the winning quote — there is
              no separate "create the order" step, because approving a quote you
              do not intend to buy from is not a thing anyone does. */}
          {quotes
            .filter((q) => q.status === "pending_review")
            .map((q) => (
              <button
                key={q.id}
                onClick={() => {
                  onApprove(q);
                  onClose();
                }}
                className="px-4 py-2 text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve {q.vendor}
              </button>
            ))}
        </div>
        {/* Negotiation modal for comparison view */}
        {negotiate && (
          <NegotiateModal
            doc={negotiate.doc}
            itemIndex={negotiate.itemIndex}
            onClose={() => setNegotiate(null)}
            onSave={(rounds) => {
              // Update negotiation rounds for the correct doc/item
              const docIdx = quotes.findIndex((q) => q.id === negotiate.doc.id);
              if (docIdx !== -1) {
                const itemIdx = negotiate.itemIndex;
                quotes[docIdx].items[itemIdx].negotiations = rounds;
              }
              setNegotiate(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

export function ReceivedQuotesPage() {
  const [docs, setDocs] = useState<VendorDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReceivedQuotes()
      .then((data) => setDocs(data.map(fromApi)))
      .catch((err) => notifyLoadFailure("received quotes", err))
      .finally(() => setLoading(false));
  }, []);
  const [statusFilter, setStatusFilter] = useState<DocStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [compareRef, setCompareRef] = useState<string | null>(null);
  /** Id of the quote being decided, so a decision cannot be double-fired. */
  const [deciding, setDeciding] = useState<string | null>(null);
  const navigate = useNavigate();
  const [negotiateItem, setNegotiateItem] = useState<{
    doc: VendorDoc;
    itemIndex: number;
  } | null>(null);

  /**
   * Records the decision on a quote.
   *
   * Approving is the award: the server raises the purchase order, closes the
   * losing quotes for the same request and moves the quote to `po_created`. So
   * the response is re-read rather than assumed — an approve that lands as
   * "PO Created" is the order having been raised, and the toast says which one.
   */
  const updateStatus = async (id: string, status: DocStatus) => {
    if (deciding) return;
    const previous = docs;
    setDeciding(id);
    setDocs((p) => p.map((x) => (x.id === id ? { ...x, status } : x)));
    try {
      const saved = await updateReceivedQuote(id, { status });
      const settled = (saved?.status ?? status) as DocStatus;
      setDocs((p) => p.map((x) => (x.id === id ? { ...x, status: settled } : x)));

      if (status === "approved") {
        if (settled === "po_created") {
          // Losing quotes on the same request were closed server-side.
          const quote = previous.find((x) => x.id === id);
          setDocs((p) =>
            p.map((x) =>
              x.id !== id &&
              quote?.prRef &&
              x.prRef === quote.prRef &&
              x.status === "pending_review"
                ? { ...x, status: "rejected" as DocStatus }
                : x,
            ),
          );
          toast.success("Quote approved — purchase order raised.", {
            description:
              "Find it on Purchase Orders, ready to be sent to Finance.",
          });
        } else {
          // The approval stuck but the order did not go up, which is almost
          // always a supplier that is not on the supplier list.
          toast.warning("Quote approved, but no purchase order was raised.", {
            description:
              "Check that the supplier exists in Suppliers, then approve again.",
          });
        }
      } else if (status === "rejected") {
        toast.success("Quote rejected.");
      }
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Could not update the submission. Please try again.",
      );
      setDocs(previous);
    } finally {
      setDeciding(null);
    }
  };

  // Group all submissions by prRef for comparison
  const submissionGroups = docs.reduce<Record<string, VendorDoc[]>>(
    (acc, d) => {
      if (d.prRef && d.prRef !== "—") {
        if (!acc[d.prRef]) acc[d.prRef] = [];
        acc[d.prRef].push(d);
      }
      return acc;
    },
    {},
  );
  const comparablePRs = Object.entries(submissionGroups).filter(
    ([, qs]) => qs.length >= 2,
  );

  const filtered = docs.filter((d) => {
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    const q = search.toLowerCase();
    if (
      q &&
      !d.id.toLowerCase().includes(q) &&
      !d.vendor.toLowerCase().includes(q) &&
      !d.project.toLowerCase().includes(q) &&
      !d.prRef.toLowerCase().includes(q)
    )
      return false;
    return true;
  });

  const pending = docs.filter((d) => d.status === "pending_review").length;
  const approved = docs.filter(
    (d) => d.status === "approved" || d.status === "po_created",
  ).length;
  const totalValue = docs
    .filter((d) => d.status !== "rejected")
    .reduce((s, d) => s + d.totalAmount, 0);

  if (loading)
    return (
      <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
    );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Supplier Submissions
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Quotes and invoices received from suppliers against purchase
            requests
          </p>
        </div>
        <button
          onClick={() => setShowRecordModal(true)}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm px-4 py-2 rounded-xl"
        >
          <Plus className="w-4 h-4" /> Record Submission
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">{docs.length}</p>
          <p className="text-xs text-gray-500">Total Submissions</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-amber-600">{pending}</p>
          <p className="text-xs text-gray-500">Pending Review</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-600">{approved}</p>
          <p className="text-xs text-gray-500">Approved / PO Created</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-blue-600">{fmt(totalValue)}</p>
          <p className="text-xs text-gray-500">Total Value (active)</p>
        </div>
      </div>

      {/* PR Comparison Groups */}
      {comparablePRs.length > 0 && (
        <div className="bg-purple-50 border border-purple-100 rounded-xl px-5 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="w-4 h-4 text-purple-600" />
            <p className="text-sm font-medium text-purple-800">
              PRs with multiple submissions (click to compare)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {comparablePRs.map(([prRef, quotes]) => {
              const lowestAmt = Math.min(...quotes.map((q) => q.totalAmount));
              return (
                <button
                  key={prRef}
                  onClick={() => setCompareRef(prRef)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-xs hover:bg-purple-50"
                >
                  <span className="font-semibold text-purple-700">{prRef}</span>
                  <span className="text-gray-500">{quotes.length} quotes</span>
                  <span className="text-green-600 font-medium">
                    Best: {fmt(lowestAmt)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ID, vendor, project, PR…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as DocStatus | "all")}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="pending_review">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="po_created">PO Created</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="w-8 px-3 py-3" />
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                Document ID
              </th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                RFQ / PR Ref
              </th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                Vendor
              </th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                Project
              </th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                Received
              </th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">
                Total Amount
              </th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                Status
              </th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="text-center py-12 text-sm text-gray-400"
                >
                  No submissions found.
                </td>
              </tr>
            )}
            {filtered.map((d) => {
              const cfg = statusDef(RECEIVED_QUOTE_STATUS, d.status);
              const isOpen = expanded === d.id;
              return (
                // The key belongs on the fragment this callback returns, not on
                // the inner <tr>. React saw an unkeyed list and matched rows by
                // position, so the expanded row could follow the index rather
                // than the quote when the list is filtered or re-sorted.
                <Fragment key={d.id}>
                  <tr className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-3 py-3 text-gray-400">
                      <button onClick={() => setExpanded(isOpen ? null : d.id)}>
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-gray-800 text-xs">
                      {d.id}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-600 font-mono">
                        {d.rfqRef}
                      </p>
                      {submissionGroups[d.prRef]?.length >= 2 ? (
                        <button
                          onClick={() => setCompareRef(d.prRef)}
                          className="text-xs text-purple-600 hover:underline font-mono font-medium"
                        >
                          {d.prRef}
                        </button>
                      ) : (
                        <p className="text-xs text-gray-400">{d.prRef}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {d.vendor}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {d.project}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {d.receivedDate}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      {fmt(d.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge {...cfg} />
                    </td>
                    <td className="px-4 py-3">
                      {/* View, Approve, Reject — nothing else. "Create PO"
                          used to sit here as a fourth action, so a quote could
                          be approved with no order behind it, or turned into an
                          order without ever being approved. Approving is what
                          raises the order now. */}
                      <RowActions>
                        <RowAction
                          icon={<Eye className="w-3.5 h-3.5" />}
                          label="View"
                          tone="primary"
                          onClick={() => setExpanded(isOpen ? null : d.id)}
                        />
                        {d.status === "pending_review" && (
                          <>
                            <RowAction
                              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                              label="Approve"
                              tone="positive"
                              title="Approve this quote and raise the purchase order"
                              busy={deciding === d.id}
                              busyLabel="Approving…"
                              onClick={() => void updateStatus(d.id, "approved")}
                            />
                            <RowAction
                              icon={<XCircle className="w-3.5 h-3.5" />}
                              label="Reject"
                              tone="negative"
                              disabled={deciding === d.id}
                              onClick={() => void updateStatus(d.id, "rejected")}
                            />
                          </>
                        )}
                        {d.status === "po_created" && (
                          <RowAction
                            icon={<ShoppingCart className="w-3.5 h-3.5" />}
                            label="Purchase Order"
                            onClick={() =>
                              navigate("/apps/procurement/purchase-orders")
                            }
                          />
                        )}
                      </RowActions>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${d.id}-detail`}>
                      <td
                        colSpan={9}
                        className="bg-blue-50/30 px-8 py-4 border-b border-gray-100"
                      >
                        <div className="flex gap-8 flex-wrap">
                          <div className="flex-1 min-w-64">
                            <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                              Line Items
                            </p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-400 border-b border-gray-200">
                                  <th className="text-left py-1 pr-4 font-medium">
                                    Material
                                  </th>
                                  <th className="text-right pr-4 font-medium">
                                    Qty
                                  </th>
                                  <th className="text-left pr-4 font-medium">
                                    Unit
                                  </th>
                                  <th className="text-right pr-4 font-medium">
                                    Unit Price
                                  </th>
                                  <th className="text-right pr-4 font-medium">
                                    Total
                                  </th>
                                  {d.docType === "quote" &&
                                    d.status === "pending_review" && (
                                      <th className="text-right font-medium">
                                        Nego.
                                      </th>
                                    )}
                                </tr>
                              </thead>
                              <tbody>
                                {d.items.map((item, i) => {
                                  const itemNegoCount =
                                    item.negotiations?.length ?? 0;
                                  const lastRound =
                                    item.negotiations?.[
                                      item.negotiations.length - 1
                                    ];
                                  return (
                                    <tr
                                      key={i}
                                      className="border-b border-gray-100 last:border-0"
                                    >
                                      <td className="py-1 pr-4 text-gray-700">
                                        {item.material}
                                      </td>
                                      <td className="py-1 pr-4 text-right text-gray-600">
                                        {item.qty}
                                      </td>
                                      <td className="py-1 pr-4 text-gray-500">
                                        {item.unit}
                                      </td>
                                      <td className="py-1 pr-4 text-right text-gray-600">
                                        {fmt(item.unitPrice)}
                                      </td>
                                      <td className="py-1 pr-4 text-right font-medium text-gray-800">
                                        {fmt(item.total)}
                                      </td>
                                      {d.docType === "quote" &&
                                        d.status === "pending_review" && (
                                          <td className="py-1 text-right">
                                            <button
                                              onClick={() =>
                                                setNegotiateItem({
                                                  doc: d,
                                                  itemIndex: i,
                                                })
                                              }
                                              className={`flex items-center gap-1 ml-auto text-xs font-medium ${itemNegoCount > 0 ? "text-purple-700" : "text-purple-500 hover:text-purple-700"}`}
                                            >
                                              <MessageSquare className="w-3 h-3" />
                                              {itemNegoCount > 0
                                                ? `(${itemNegoCount})`
                                                : "Negotiate"}
                                              {lastRound && (
                                                <span
                                                  className={`px-1.5 py-0.5 rounded text-xs ${NEGO_STATUS_STYLE[lastRound.status]}`}
                                                >
                                                  {lastRound.status
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    lastRound.status.slice(1)}
                                                </span>
                                              )}
                                            </button>
                                          </td>
                                        )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr>
                                  <td
                                    colSpan={
                                      d.docType === "quote" &&
                                      d.status === "pending_review"
                                        ? 5
                                        : 4
                                    }
                                    className="pt-2 text-right font-semibold text-gray-700"
                                  >
                                    Total
                                  </td>
                                  <td className="pt-2 pr-4 text-right font-bold text-gray-900">
                                    {fmt(d.totalAmount)}
                                  </td>
                                  {d.docType === "quote" &&
                                    d.status === "pending_review" && <td />}
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                          {d.destinationStore && (
                            <div className="w-52">
                              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                                Delivery Destination
                              </p>
                              <div className="space-y-1.5">
                                <div className="flex items-start gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-xs text-gray-700 font-medium">
                                    {d.destinationStore}
                                  </span>
                                </div>
                                {d.storeLevel && (
                                  <div className="flex items-start gap-1.5 ml-5">
                                    <Layers className="w-3 h-3 text-blue-400 flex-shrink-0" />
                                    <span className="text-xs text-blue-600">
                                      {d.storeLevel}
                                    </span>
                                  </div>
                                )}
                                {d.project && (
                                  <div className="flex items-start gap-1.5 ml-5">
                                    <span className="text-xs text-gray-500">
                                      Project: {d.project}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {d.notes && (
                            <div className="w-56">
                              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                                Notes
                              </p>
                              <div className="flex items-start gap-2 text-xs text-gray-600">
                                <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
                                {d.notes}
                              </div>
                            </div>
                          )}
                          {d.validUntil && (
                            <div className="w-40">
                              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                                Valid Until
                              </p>
                              <p className="text-sm font-medium text-gray-700">
                                {d.validUntil}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {showRecordModal && (
        <RecordDocModal
          onClose={() => setShowRecordModal(false)}
          onSave={async (doc) => {
            try {
              const created = await createReceivedQuote({
                rfqRef: doc.rfqRef,
                // Without this the quote is stored detached from the request it
                // answers and can never be compared against its rivals.
                prRef: doc.prRef && doc.prRef !== "—" ? doc.prRef : undefined,
                supplierName: doc.vendor,
                supplierId: doc.supplierId,
                status: "pending_review",
                items: doc.items,
                receivedDate: doc.receivedDate,
                validUntil: doc.validUntil,
                totalValue: doc.totalAmount,
                notes: doc.notes,
                projectName: doc.project || undefined,
                destinationStore: doc.destinationStore,
                storeLevel: doc.storeLevel,
              });
              setDocs((prev) => [fromApi(created), ...prev]);
            } catch (e) {
              console.error(e);
              setDocs((prev) => [doc, ...prev]);
            }
            setShowRecordModal(false);
          }}
        />
      )}
      {compareRef &&
        (() => {
          const qs = submissionGroups[compareRef] ?? [];
          return (
            <CompareQuotesModal
              prRef={compareRef}
              quotes={qs}
              onClose={() => setCompareRef(null)}
              onApprove={(doc) => {
                setCompareRef(null);
                void updateStatus(doc.id, "approved");
              }}
            />
          );
        })()}
      {negotiateItem && (
        <NegotiateModal
          doc={negotiateItem.doc}
          itemIndex={negotiateItem.itemIndex}
          onClose={() => setNegotiateItem(null)}
          onSave={async (rounds) => {
            const { doc, itemIndex } = negotiateItem;
            const newItems = doc.items.map((it, idx) =>
              idx === itemIndex ? { ...it, negotiations: rounds } : it,
            );
            const previous = docs;
            setDocs((prev) =>
              prev.map((d) =>
                d.id === doc.id ? { ...d, items: newItems } : d,
              ),
            );
            setNegotiateItem(null);
            try {
              await updateReceivedQuote(doc.id, { items: newItems });
            } catch (e) {
              console.error(e);
              toast.error("Could not save the negotiation. Please try again.");
              setDocs(previous);
            }
          }}
        />
      )}
    </div>
  );
}
