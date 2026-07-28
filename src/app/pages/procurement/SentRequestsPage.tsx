import { useState, useEffect } from "react";
import {
  Send,
  Search,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  MailOpen,
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
  SentRFQ as ApiSentRFQ,
} from "../../api/procurement-requests";
import { getReferenceData } from "../../api/reference-data";
import { formatDateByGeneralSettings } from "../../utils/generalSettings";
import { useNumbering } from "../../stores/numberingStore";

type SRStatus = "sent" | "viewed" | "quote_received" | "declined" | "expired";

interface SentRequest {
  id: string;
  prRef: string;
  vendor: string;
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
    prRef: r.rfqRef,
    vendor: r.supplierName,
    vendorEmail: "",
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

const STATUS_CFG: Record<
  SRStatus,
  { label: string; badge: string; icon: React.ReactNode }
> = {
  sent: {
    label: "Sent",
    badge: "bg-blue-100 text-blue-700",
    icon: <Send className="w-3.5 h-3.5" />,
  },
  viewed: {
    label: "Viewed",
    badge: "bg-purple-100 text-purple-700",
    icon: <MailOpen className="w-3.5 h-3.5" />,
  },
  quote_received: {
    label: "Quote Received",
    badge: "bg-green-100 text-green-700",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  declined: {
    label: "Declined",
    badge: "bg-red-100 text-red-700",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  expired: {
    label: "Expired",
    badge: "bg-gray-100 text-gray-500",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
};

const TABS: { key: SRStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sent", label: "Sent" },
  { key: "viewed", label: "Viewed" },
  { key: "quote_received", label: "Quote Received" },
  { key: "declined", label: "Declined" },
  { key: "expired", label: "Expired" },
];

const UNITS = [
  "Tonnes",
  "Bags",
  "Metres",
  "Sheets",
  "Rolls",
  "Units",
  "Cartons",
  "Litres",
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

  const [vendors, setVendors] = useState<string[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [vendor, setVendor] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [prRef, setPrRef] = useState("");
  const [project, setProject] = useState("");
  const [expiryDays, setExpiryDays] = useState("5");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<RFQItem[]>([
    { material: "", qty: "", unit: UNITS[0] },
  ]);

  useEffect(() => {
    getReferenceData()
      .then((data) => {
        const vendorNames = data.suppliers.map((s) => s.name);
        const projectNames = data.projects.map((p) => p.name);
        setVendors(vendorNames);
        setProjects(projectNames);
        setVendor((prev) => prev || vendorNames[0] || "");
        setProject((prev) => prev || projectNames[0] || "");
      })
      .catch(() => {});
  }, []);

  const addItem = () =>
    setItems((p) => [...p, { material: "", qty: "", unit: UNITS[0] }]);
  const removeItem = (i: number) =>
    setItems((p) => p.filter((_, j) => j !== i));
  const updateItem = (i: number, k: keyof RFQItem, v: string) =>
    setItems((p) => p.map((it, j) => (j === i ? { ...it, [k]: v } : it)));

  const { getNextId } = useNumbering();
  const valid =
    vendor &&
    prRef.trim() &&
    items.every((it) => it.material.trim() && it.qty.trim());

  function handleSave() {
    if (!valid) return;
    const nextId = getNextId("RFQ");
    onSave({
      id: nextId,
      prRef: prRef.trim(),
      vendor,
      vendorEmail,
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
                Vendor Email
              </label>
              <input
                value={vendorEmail}
                onChange={(e) => setVendorEmail(e.target.value)}
                placeholder="sales@vendor.ng"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                PR Reference <span className="text-red-500">*</span>
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
                  <input
                    value={item.material}
                    onChange={(e) => updateItem(i, "material", e.target.value)}
                    placeholder="Material name"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
                    {UNITS.map((u) => (
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showNewRFQ, setShowNewRFQ] = useState(false);

  useEffect(() => {
    getSentRFQs()
      .then((data) => setRequests(data.map(fromApi)))
      .catch(console.error)
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
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
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
              const cfg = STATUS_CFG[r.status] ?? {
                badge: "bg-gray-100 text-gray-700",
                icon: null,
                label: String(r.status ?? "Unknown"),
              };
              const isOpen = expanded === r.id;
              return (
                <>
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50/70 transition-colors"
                  >
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
                      {r.id}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {r.prRef}
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
                      <span
                        className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}
                      >
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        {r.status === "quote_received" && (
                          <button className="flex items-center gap-1 text-green-600 hover:text-green-800 text-xs font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> Open Quote
                          </button>
                        )}
                        {(r.status === "sent" || r.status === "viewed") && (
                          <button className="flex items-center gap-1 text-purple-600 hover:text-purple-800 text-xs font-medium">
                            <Send className="w-3.5 h-3.5" /> Resend
                          </button>
                        )}
                      </div>
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
                </>
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
                rfqRef: rfq.prRef,
                supplierName: rfq.vendor,
                status: "sent",
                items: rfq.items,
                sentDate: rfq.sentDate,
                expiryDate: rfq.expiryDate,
                notes: rfq.notes,
              });
              setRequests((prev) => [fromApi(created), ...prev]);
            } catch (e) {
              console.error(e);
              setRequests((prev) => [rfq, ...prev]);
            }
            setShowNewRFQ(false);
          }}
        />
      )}
    </div>
  );
}
