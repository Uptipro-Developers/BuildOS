import { useState } from "react";
import { Plus, ArrowRight, Search } from "lucide-react";
import { useNumbering } from "../../stores/numberingStore";

type TransferStatus = "Pending" | "In Transit" | "Completed" | "Rejected";

interface TransferItem {
  name: string;
  qty: number;
  unit: string;
}

interface StockTransfer {
  id: string;
  from: string;
  to: string;
  requestedBy: string;
  date: string;
  status: TransferStatus;
  items: TransferItem[];
  notes: string;
}

const STATUS_STYLES: Record<TransferStatus, string> = {
  Pending:     "bg-yellow-50 text-yellow-700",
  "In Transit":"bg-blue-50 text-blue-700",
  Completed:   "bg-green-50 text-green-700",
  Rejected:    "bg-red-50 text-red-700",
};

const STORES = ["General Store", "Block A Project Store", "Block B Project Store", "Block C Project Store"];

const MOCK_TRANSFERS: StockTransfer[] = [
  {
    id: "TRF-041", from: "General Store", to: "Block A Project Store",
    requestedBy: "Emeka Nwosu", date: "Jun 4, 2025", status: "Completed",
    items: [
      { name: "Cement (50kg)", qty: 100, unit: "Bags" },
      { name: "Binding Wire",  qty: 10,  unit: "Rolls" },
    ],
    notes: "Weekly replenishment for Block A.",
  },
  {
    id: "TRF-040", from: "General Store", to: "Block B Project Store",
    requestedBy: "Aisha Ibrahim", date: "Jun 3, 2025", status: "In Transit",
    items: [
      { name: "Concrete Block 9\"", qty: 500, unit: "Units" },
    ],
    notes: "",
  },
  {
    id: "TRF-039", from: "Block A Project Store", to: "Block C Project Store",
    requestedBy: "Tunde Bello", date: "Jun 2, 2025", status: "Pending",
    items: [
      { name: "Formwork Plywood", qty: 5, unit: "Sheets" },
    ],
    notes: "Temporary transfer — will return next week.",
  },
  {
    id: "TRF-038", from: "General Store", to: "Block A Project Store",
    requestedBy: "Emeka Nwosu", date: "May 28, 2025", status: "Completed",
    items: [
      { name: "Steel Rebar Y16", qty: 2, unit: "Tonnes" },
    ],
    notes: "",
  },
];

const BLANK_FORM = {
  from: STORES[0], to: STORES[1], requestedBy: "",
  notes: "", items: [{ name: "", qty: 1, unit: "Units" }],
};

export function StockTransferPage() {
  const [transfers, setTransfers] = useState<StockTransfer[]>(MOCK_TRANSFERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TransferStatus | "All">("All");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [expanded, setExpanded] = useState<string | null>(null);
  const { getNextId } = useNumbering();

  const filtered = transfers.filter((t) => {
    const matchSearch = t.from.toLowerCase().includes(search.toLowerCase()) || t.to.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, { name: "", qty: 1, unit: "Units" }] }));
  }

  function removeItem(i: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  }

  function updateItem(i: number, key: keyof TransferItem, value: string | number) {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, idx) => (idx === i ? { ...item, [key]: value } : item)),
    }));
  }

  function submitTransfer() {
    const newT: StockTransfer = {
      ...form,
      id: getNextId("StockTransfer"),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: "Pending",
    };
    setTransfers([newT, ...transfers]);
    setShowModal(false);
    setForm({ ...BLANK_FORM });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Stock Transfers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Move items between stores and project sites</p>
        </div>
        <button onClick={() => { setForm({ ...BLANK_FORM }); setShowModal(true); }}
          className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm px-4 py-2 rounded-xl">
          <Plus className="w-4 h-4" /> New Transfer
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Search transfers…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {(["All", "Pending", "In Transit", "Completed", "Rejected"] as const).map((f) => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`px-2.5 py-1.5 text-xs rounded-lg border font-medium ${statusFilter === f ? "bg-teal-700 text-white border-teal-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map((t) => (
          <div key={t.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 text-left"
              onClick={() => setExpanded((p) => (p === t.id ? null : t.id))}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">{t.from}</span>
                  <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900">{t.to}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{t.id} · {t.items.length} item{t.items.length !== 1 ? "s" : ""} · {t.date} · {t.requestedBy}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_STYLES[t.status]}`}>
                {t.status}
              </span>
            </button>
            {expanded === t.id && (
              <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="pb-2 text-left font-medium">Item</th>
                      <th className="pb-2 text-right font-medium">Qty</th>
                      <th className="pb-2 text-right font-medium">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {t.items.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2 text-gray-800">{item.name}</td>
                        <td className="py-2 text-right font-medium text-gray-900">{item.qty}</td>
                        <td className="py-2 text-right text-gray-500">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {t.notes && <p className="text-xs text-gray-500 italic">{t.notes}</p>}
                {t.status === "Pending" && (
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setTransfers((prev) => prev.map((tr) => tr.id === t.id ? { ...tr, status: "Rejected" }  : tr))}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-red-600">
                      Reject
                    </button>
                    <button
                      onClick={() => setTransfers((prev) => prev.map((tr) => tr.id === t.id ? { ...tr, status: "In Transit" } : tr))}
                      className="px-3 py-1.5 text-xs bg-teal-700 text-white rounded-lg hover:bg-teal-800">
                      Approve & Dispatch
                    </button>
                  </div>
                )}
                {t.status === "In Transit" && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setTransfers((prev) => prev.map((tr) => tr.id === t.id ? { ...tr, status: "Completed" } : tr))}
                      className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">
                      Mark as Received
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Transfer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-900">New Stock Transfer</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">From Store</label>
                  <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                    value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })}>
                    {STORES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">To Store</label>
                  <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                    value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })}>
                    {STORES.filter((s) => s !== form.from).map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Requested By</label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Name of requester" value={form.requestedBy} onChange={(e) => setForm({ ...form, requestedBy: e.target.value })} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Items</p>
                  <button onClick={addItem} className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-9 gap-2 mb-2 items-center">
                    <div className="col-span-5">
                      <input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="Item name" value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <input type="number" min={1} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                        value={item.qty} onChange={(e) => updateItem(i, "qty", Number(e.target.value))} />
                    </div>
                    <div className="col-span-1">
                      <input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="Unit" value={item.unit} onChange={(e) => updateItem(i, "unit", e.target.value)} />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button disabled={form.items.length === 1} onClick={() => removeItem(i)}
                        className="text-gray-400 hover:text-red-500 disabled:opacity-30">✕</button>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={submitTransfer} disabled={!form.requestedBy.trim() || form.items.some((i) => !i.name.trim())}
                className="px-4 py-2 text-sm bg-teal-700 text-white rounded-xl hover:bg-teal-800 disabled:opacity-50">
                Submit Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
