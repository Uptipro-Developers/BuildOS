import { notifyLoadFailure } from "../../utils/loadFailure";
import { useState, useEffect, Fragment } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Send,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  FileText,
  Package,
  Plus,
  Eye,
  X,
  Trash2,
} from "lucide-react";
import {
  getSentRFQs,
  createSentRFQ,
  getPurchaseRequests,
  SentRFQ as ApiSentRFQ,
  updateSentRFQ,
} from "../../api/procurement-requests";
import { getReferenceData } from "../../api/reference-data";
import { StatusBadge } from "../../components/StatusBadge";
import { RowAction, RowActions } from "../../components/RowAction";
import {
  SENT_REQUEST_STATUS,
  statusDef,
} from "../../utils/procurementWorkflow";
import { fetchSuppliers } from "../../api/suppliers";
import { formatDateByGeneralSettings } from "../../utils/generalSettings";
import { useProcurementUnits } from "../../utils/useProcurementUnits";

type SRStatus = "sent" | "viewed" | "quote_received" | "declined" | "expired";

interface SentRequest {
  id: string;
  /** The RFQ's own human reference (RFQ-0011), allocated by the server. */
  rfqRef: string;
  /** The purchase request being competed. Rows sharing one are one RFQ. */
  prRef: string;
  vendor: string;
  supplierId?: string;
  vendorEmail: string;
  project: string;
  sentDate: string;
  expiryDate: string;
  status: SRStatus;
  items: { material: string; qty: number; unit: string }[];
  notes?: string;
}

// MOCK_SENT removed — data fetched from API

function fromApi(r: ApiSentRFQ): SentRequest {
  const rawStatus = (r.status ?? "sent").toLowerCase().replace(" ", "_");
  const validStatuses: SRStatus[] = [
    "sent",
    "viewed",
    "quote_received",
    "declined",
    "expired",
  ];
  const status: SRStatus = validStatuses.includes(rawStatus as SRStatus)
    ? (rawStatus as SRStatus)
    : "sent";
  return {
    id: r.id,
    rfqRef: r.rfqRef,
    // Was `r.rfqRef`: the column headed "PR Reference" showed the RFQ's own
    // reference, because the purchase-request link was never stored at all.
    prRef: r.prRef ?? "",
    vendor: r.supplierName,
    supplierId: r.supplierId,
    // Was hardcoded blank, so the email column in the table below was always
    // empty no matter what had been entered.
    vendorEmail: r.contactEmail ?? "",
    project: "",
    sentDate: r.sentDate,
    expiryDate: r.expiryDate ?? "",
    status,
    items: Array.isArray(r.items)
      ? (
          r.items as {
            materialName?: string;
            material?: string;
            qty?: number;
            unit?: string;
          }[]
        ).map((it) => ({
          material: it.materialName ?? it.material ?? "",
          qty: it.qty ?? 0,
          unit: it.unit ?? "",
        }))
      : [],
    notes: r.notes,
  };
}

const TABS: { key: SRStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sent", label: "Sent" },
  { key: "viewed", label: "Viewed" },
  { key: "quote_received", label: "Quote Received" },
  { key: "declined", label: "Declined" },
  { key: "expired", label: "Expired" },
];

interface RFQItem {
  material: string;
  qty: string;
  unit: string;
}

function NewRFQModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (r: SentRequest) => void;
}) {
  const today = new Date();
  const fmtDate = (d: Date) => formatDateByGeneralSettings(d);
  const addDays = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return fmtDate(d);
  };

  /**
   * The supplier list, carrying the contact email so the address field can be
   * prefilled. Reference data only exposes id and name, which is why the email
   * box sat empty with a placeholder for the raiser to retype by hand.
   */
  const [vendorList, setVendorList] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  /** References of purchase requests this RFQ can be competing. */
  const [prRefs, setPrRefs] = useState<string[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  // The material catalogue, so an RFQ can only be raised for materials that
  // already exist rather than a free-typed name a vendor can't match to stock.
  const [materialOptions, setMaterialOptions] = useState<
    { name: string; unit: string }[]
  >([]);
  const [vendor, setVendor] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [prRef, setPrRef] = useState("");
  const [project, setProject] = useState("");
  const [expiryDays, setExpiryDays] = useState("5");
  const [notes, setNotes] = useState("");
  const units = useProcurementUnits();
  const [items, setItems] = useState<RFQItem[]>([
    { material: "", qty: "", unit: units[0] },
  ]);

  useEffect(() => {
    fetchSuppliers()
      .then((rows) => {
        const list = rows.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email ?? "",
        }));
        setVendorList(list);
        // Preselect the first supplier and its address together, so the form
        // opens in a consistent state rather than with a vendor chosen and the
        // email box blank.
        setVendor((prev) => prev || list[0]?.name || "");
        setVendorEmail((prev) => prev || list[0]?.email || "");
      })
      .catch((err) => notifyLoadFailure("suppliers", err));

    getReferenceData()
      .then((data) => {
        const projectNames = data.projects.map((p) => p.name);
        setProjects(projectNames);
        setProject((prev) => prev || projectNames[0] || "");
        setMaterialOptions(
          (data.materials ?? [])
            .map((m) => ({ name: m.name, unit: m.unit ?? "" }))
            .filter((m) => m.name),
        );
      })
      .catch(() => {});

    // A request can be competed once it has been raised. Drafts cannot: a draft
    // is by definition not finished, and the authorisation to spend happened at
    // the Material Request.
    getPurchaseRequests()
      .then((rows) =>
        setPrRefs(
          rows
            .filter((r) =>
              ["not_raised", "raised", "quotes_received"].includes(
                (r.status ?? "").toLowerCase().replace(/[\s-]+/g, "_"),
              ),
            )
            .map((r) => r.prRef)
            .filter(Boolean),
        ),
      )
      .catch(() => {});
  }, []);

  const selectedVendor = vendorList.find((v) => v.name === vendor);

  /**
   * Switching supplier moves the address with it. Leaving a previous supplier's
   * email in the box is worse than blanking it — the RFQ would look correctly
   * addressed and go to the wrong company.
   */
  function selectVendor(name: string) {
    setVendor(name);
    setVendorEmail(vendorList.find((v) => v.name === name)?.email ?? "");
  }

  const addItem = () =>
    setItems((p) => [...p, { material: "", qty: "", unit: units[0] }]);
  const removeItem = (i: number) =>
    setItems((p) => p.filter((_, j) => j !== i));
  const updateItem = (i: number, k: keyof RFQItem, v: string) =>
    setItems((p) => p.map((it, j) => (j === i ? { ...it, [k]: v } : it)));

  const valid =
    vendor &&
    prRef.trim() &&
    items.every((it) => it.material.trim() && it.qty.trim());

  function handleSave() {
    if (!valid) return;
    onSave({
      // Both references come back from the server: it allocates the RFQ number
      // from the numbering config. Allocating one here as well consumed a second
      // number that was then thrown away.
      id: "",
      rfqRef: "",
      prRef: prRef.trim(),
      vendor,
      supplierId: selectedVendor?.id,
      vendorEmail: vendorEmail.trim(),
      project,
      sentDate: fmtDate(today),
      expiryDate: addDays(parseInt(expiryDays) || 5),
      status: "sent",
      items: items.map((it) => ({
        material: it.material,
        qty: parseFloat(it.qty) || 0,
        unit: it.unit,
      })),
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            Send New RFQ
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
                onChange={(e) => selectVendor(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {vendorList.map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Vendor Email
              </label>
              <input
                type="email"
                value={vendorEmail}
                onChange={(e) => setVendorEmail(e.target.value)}
                placeholder="sales@vendor.ng"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedVendor?.email
                  ? vendorEmail === selectedVendor.email
                    ? "From the supplier record. Edit to send elsewhere."
                    : "Overrides the supplier's filed address."
                  : "No address on file for this supplier — enter one to send."}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                PR Reference <span className="text-red-500">*</span>
              </label>
              {/* Chosen from the approved requests, not typed. Free text here
                  produced RFQs that named a request which may not exist, and
                  the reference is what groups the returning quotes for
                  comparison. */}
              <select
                value={prRef}
                onChange={(e) => setPrRef(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an approved request…</option>
                {prRefs.map((ref) => (
                  <option key={ref} value={ref}>
                    {ref}
                  </option>
                ))}
              </select>
              {prRefs.length === 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  No approved purchase requests yet.
                </p>
              )}
            </div>
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
                Response Deadline (days)
              </label>
              <input
                type="number"
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
                min={1}
                max={30}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-0.5">
                Expires: {addDays(parseInt(expiryDays) || 5)}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">
                Items Requested <span className="text-red-500">*</span>
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
                  className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-center"
                >
                  <select
                    value={item.material}
                    onChange={(e) => {
                      const name = e.target.value;
                      updateItem(i, "material", name);
                      // Adopt the catalogue's unit for the chosen material, so the RFQ
                      // is raised in the unit the material is stocked in.
                      const chosen = materialOptions.find((m) => m.name === name);
                      if (chosen?.unit) updateItem(i, "unit", chosen.unit);
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(i, "unit", e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from(
                      new Set([...units, item.unit].filter(Boolean)),
                    ).map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
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

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Notes / Instructions
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any special instructions for the vendor…"
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
            <Send className="w-4 h-4" /> Send RFQ
          </button>
        </div>
      </div>
    </div>
  );
}

export function SentRequestsPage() {
  const [requests, setRequests] = useState<SentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SRStatus | "all">("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  /** Re-sends an RFQ by bumping its sent date, which re-triggers delivery. */
  async function resendRfq(r: SentRequest) {
    setResendingId(r.id);
    try {
      await updateSentRFQ(r.id, {
        sentDate: new Date().toISOString(),
        status: "sent",
      } as any);
      toast.success(`RFQ resent to ${r.vendor}.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not resend the RFQ.",
      );
    } finally {
      setResendingId(null);
    }
  }
  const [showNewRFQ, setShowNewRFQ] = useState(false);

  useEffect(() => {
    getSentRFQs()
      .then((data) => setRequests(data.map(fromApi)))
      .catch((err) => notifyLoadFailure("sent rf qs", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = requests.filter((r) => {
    const matchTab = tab === "all" || r.status === tab;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.id.toLowerCase().includes(q) ||
      r.vendor.toLowerCase().includes(q) ||
      r.project.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  if (loading)
    return (
      <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
    );

  const counts = {
    all: requests.length,
    sent: requests.filter((r) => r.status === "sent").length,
    viewed: requests.filter((r) => r.status === "viewed").length,
    quote_received: requests.filter((r) => r.status === "quote_received")
      .length,
    declined: requests.filter((r) => r.status === "declined").length,
    expired: requests.filter((r) => r.status === "expired").length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Sent Requests
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Purchase request quotations sent to vendors
          </p>
        </div>
        <button
          onClick={() => setShowNewRFQ(true)}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm px-4 py-2 rounded-xl"
        >
          <Plus className="w-4 h-4" /> New RFQ
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
          <p className="text-xs text-gray-500">Total RFQs Sent</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-blue-600">
            {
              requests.filter(
                (r) => r.status === "sent" || r.status === "viewed",
              ).length
            }
          </p>
          <p className="text-xs text-gray-500">Awaiting Response</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-600">
            {requests.filter((r) => r.status === "quote_received").length}
          </p>
          <p className="text-xs text-gray-500">Quotes Received</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-red-500">
            {
              requests.filter(
                (r) => r.status === "declined" || r.status === "expired",
              ).length
            }
          </p>
          <p className="text-xs text-gray-500">Declined / Expired</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search RFQ, vendor, project…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap flex items-center gap-1.5 border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${tab === t.key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}
            >
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="w-8 px-3 py-3" />
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                RFQ ID
              </th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                PR Ref
              </th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                Vendor
              </th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                Project
              </th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                Sent Date
              </th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                Expiry
              </th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                Items
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
                  colSpan={10}
                  className="text-center py-12 text-sm text-gray-400"
                >
                  No requests found.
                </td>
              </tr>
            )}
            {filtered.map((r) => {
              const cfg = statusDef(SENT_REQUEST_STATUS, r.status);
              const isOpen = expanded === r.id;
              return (
                // The key belongs on the fragment, which is what this callback
                // returns. On the inner <tr> React saw an unkeyed list and fell
                // back to matching rows by position, so the expanded row could
                // follow the index rather than the request when the list is
                // filtered or re-sorted.
                <Fragment key={r.id}>
                  <tr className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-3 py-3 text-gray-400">
                      <button onClick={() => setExpanded(isOpen ? null : r.id)}>
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-gray-800 text-xs">
                      {r.rfqRef}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {r.prRef || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 text-sm">
                        {r.vendor}
                      </p>
                      <p className="text-xs text-gray-400">{r.vendorEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {r.project}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {r.sentDate}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {r.expiryDate}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">
                        {r.items.length} item{r.items.length !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge {...cfg} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {/* This page is the record of what went out to suppliers,
                          so the only things to do with a row are read it and
                          send it again. Deciding a quote belongs on Received
                          Quotes, which is where the supplier's answer lives. */}
                      <RowActions>
                        <RowAction
                          icon={<Eye className="w-3.5 h-3.5" />}
                          label="View"
                          tone="primary"
                          onClick={() => setExpanded(isOpen ? null : r.id)}
                        />
                        {r.status === "quote_received" ? (
                          <RowAction
                            icon={<CheckCircle className="w-3.5 h-3.5" />}
                            label="Open Quote"
                            tone="positive"
                            onClick={() =>
                              navigate("/apps/procurement/received-quotes")
                            }
                          />
                        ) : (
                          <RowAction
                            icon={<Send className="w-3.5 h-3.5" />}
                            label="Resend"
                            onClick={() => resendRfq(r)}
                            busy={resendingId === r.id}
                            busyLabel="Sending…"
                            disabled={r.status === "declined"}
                            title={
                              r.status === "declined"
                                ? "This supplier declined the request."
                                : "Send this request to the supplier again"
                            }
                          />
                        )}
                      </RowActions>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${r.id}-detail`}>
                      <td
                        colSpan={10}
                        className="bg-blue-50/40 px-8 py-4 border-b border-gray-100"
                      >
                        <div className="flex gap-8">
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                              Items Requested
                            </p>
                            <div className="space-y-1">
                              {r.items.map((item, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <Package className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="text-gray-700">
                                    {item.material}
                                  </span>
                                  <span className="text-gray-400">—</span>
                                  <span className="font-medium text-gray-800">
                                    {item.qty} {item.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          {r.notes && (
                            <div className="w-64">
                              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                                Notes
                              </p>
                              <div className="flex items-start gap-2 text-sm text-gray-600">
                                <FileText className="w-3.5 h-3.5 mt-0.5 text-gray-400 flex-shrink-0" />
                                {r.notes}
                              </div>
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
      {showNewRFQ && (
        <NewRFQModal
          onClose={() => setShowNewRFQ(false)}
          onSave={async (rfq) => {
            try {
              const created = await createSentRFQ({
                // The RFQ's own reference is allocated server-side from the
                // numbering config; what belongs here is the request being
                // competed, which used to be passed as `rfqRef` and dropped.
                prRef: rfq.prRef,
                supplierName: rfq.vendor,
                supplierId: rfq.supplierId,
                // The address shown in the form is the address used to send.
                contactEmail: rfq.vendorEmail || undefined,
                status: "sent",
                items: rfq.items,
                sentDate: rfq.sentDate,
                expiryDate: rfq.expiryDate,
                notes: rfq.notes,
              });
              setRequests((prev) => [fromApi(created), ...prev]);
              toast.success(`RFQ sent to ${rfq.vendor}.`);
            } catch (e) {
              // The unsaved RFQ used to be pushed into the list on failure, so
              // an RFQ no supplier ever received showed as sent.
              toast.error(
                e instanceof Error ? e.message : "Could not send the RFQ.",
              );
              return;
            }
            setShowNewRFQ(false);
          }}
        />
      )}
    </div>
  );
}
