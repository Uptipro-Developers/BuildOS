import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  RotateCcw,
} from "lucide-react";
import {
  getMaterialReturns,
  createMaterialReturn,
  updateMaterialReturn,
  MaterialReturn as ApiMaterialReturn,
} from "../../api/materials";
import { getReferenceData } from "../../api/reference-data";

type ReturnStatus =
  | "Draft"
  | "Pending Approval"
  | "Approved"
  | "Received"
  | "Rejected";

interface MaterialReturn {
  id: string;
  material: string;
  category: string;
  quantity: number;
  unit: string;
  fromStore: string;
  toStore: string;
  reason: string;
  condition: "Good" | "Damaged" | "Partially Damaged";
  requestedBy: string;
  requestDate: string;
  status: ReturnStatus;
  approvedBy: string;
  approvalDate: string;
  receivedDate: string;
}

const STATUS_STYLE: Record<ReturnStatus, string> = {
  Draft: "bg-gray-100 text-gray-600",
  "Pending Approval": "bg-yellow-50 text-yellow-700",
  Approved: "bg-blue-50 text-blue-700",
  Received: "bg-green-50 text-green-700",
  Rejected: "bg-red-50 text-red-700",
};

const CONDITION_STYLE: Record<string, string> = {
  Good: "bg-green-50 text-green-700",
  "Partially Damaged": "bg-yellow-50 text-yellow-700",
  Damaged: "bg-red-50 text-red-700",
};

const BLANK: Omit<
  MaterialReturn,
  "id" | "status" | "approvedBy" | "approvalDate" | "receivedDate"
> = {
  material: "",
  category: "",
  quantity: 1,
  unit: "Units",
  fromStore: "",
  toStore: "",
  reason: "",
  condition: "Good",
  requestedBy: "",
  requestDate: "",
};

const STATUSES: (ReturnStatus | "All")[] = [
  "All",
  "Pending Approval",
  "Approved",
  "Received",
  "Rejected",
];

function fromApi(r: ApiMaterialReturn): MaterialReturn {
  return {
    id: r.id,
    material: r.materialName,
    category: "",
    quantity: r.qty,
    unit: r.unit,
    fromStore: r.fromStoreName,
    toStore: r.toStoreName,
    reason: r.reason ?? "",
    condition: (r.condition as MaterialReturn["condition"]) ?? "Good",
    requestedBy: r.requestedBy ?? "",
    requestDate: r.requestDate,
    status: r.status as ReturnStatus,
    approvedBy: r.approvedBy ?? "",
    approvalDate: r.approvedAt ?? "",
    receivedDate: "",
  };
}

export function MaterialReturnsPage() {
  const [returns, setReturns] = useState<MaterialReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | "All">("All");
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<MaterialReturn | null>(null);
  const [form, setForm] = useState<typeof BLANK>({ ...BLANK });
  const [materials, setMaterials] = useState<string[]>([]);
  const [stores, setStores] = useState<string[]>([]);

  useEffect(() => {
    getMaterialReturns()
      .then((data) => setReturns(data.map(fromApi)))
      .catch(console.error)
      .finally(() => setLoading(false));
    getReferenceData()
      .then((data) => {
        const materialNames = data.materials.map((m) => m.name);
        const storeNames = data.stores.map((s) => s.name);
        setMaterials(materialNames);
        setStores(storeNames);
        setForm((prev) => ({
          ...prev,
          material: prev.material || materialNames[0] || "",
          fromStore: prev.fromStore || storeNames[0] || "",
          toStore: prev.toStore || storeNames[1] || storeNames[0] || "",
        }));
      })
      .catch(() => {});
  }, []);

  const filtered = returns.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      r.id.toLowerCase().includes(q) ||
      r.material.toLowerCase().includes(q) ||
      r.requestedBy.toLowerCase().includes(q);
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function submitReturn() {
    try {
      const created = await createMaterialReturn({
        materialName: form.material,
        unit: form.unit,
        qty: form.quantity,
        fromStoreName: form.fromStore,
        toStoreName: form.toStore,
        reason: form.reason,
        condition: form.condition,
        requestedBy: form.requestedBy,
        status: "Pending Approval",
      });
      setReturns((prev) => [fromApi(created), ...prev]);
      setShowModal(false);
      setForm({ ...BLANK });
    } catch (e) {
      console.error(e);
    }
  }

  async function approve(id: string) {
    try {
      const updated = await updateMaterialReturn(id, {
        status: "Approved",
        approvedBy: "Store Manager",
      });
      setReturns((prev) =>
        prev.map((r) => (r.id === id ? fromApi(updated) : r)),
      );
      setSelected(null);
    } catch (e) {
      console.error(e);
    }
  }

  async function markReceived(id: string) {
    try {
      const updated = await updateMaterialReturn(id, { status: "Received" });
      setReturns((prev) =>
        prev.map((r) => (r.id === id ? fromApi(updated) : r)),
      );
      setSelected(null);
    } catch (e) {
      console.error(e);
    }
  }

  async function reject(id: string) {
    try {
      const updated = await updateMaterialReturn(id, {
        status: "Rejected",
        approvedBy: "Store Manager",
      });
      setReturns((prev) =>
        prev.map((r) => (r.id === id ? fromApi(updated) : r)),
      );
      setSelected(null);
    } catch (e) {
      console.error(e);
    }
  }

  function exportCSV() {
    const rows = [
      [
        "Return ID",
        "Material",
        "Qty",
        "Unit",
        "From Store",
        "To Store",
        "Reason",
        "Condition",
        "Requested By",
        "Date",
        "Status",
      ],
      ...filtered.map((r) => [
        r.id,
        r.material,
        r.quantity,
        r.unit,
        r.fromStore,
        r.toStore,
        r.reason,
        r.condition,
        r.requestedBy,
        r.requestDate,
        r.status,
      ]),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = "material_returns.csv";
    a.click();
  }

  const pendingCount = returns.filter(
    (r) => r.status === "Pending Approval",
  ).length;

  if (loading)
    return (
      <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
    );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Material Returns
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Return unused or incorrect materials back to store
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm px-3 py-2 rounded-xl hover:bg-gray-50"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => {
              setForm({ ...BLANK });
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm px-4 py-2 rounded-xl"
          >
            <Plus className="w-4 h-4" /> New Return
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-5 gap-3">
        {STATUSES.map((s) => {
          const count =
            s === "All"
              ? returns.length
              : returns.filter((r) => r.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-xl border px-3 py-3 text-left transition-colors ${statusFilter === s ? "border-teal-600 bg-teal-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}
            >
              <p className="text-xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s}</p>
            </button>
          );
        })}
      </div>

      {pendingCount > 0 && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5">
          <RotateCcw className="w-4 h-4 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">
              {pendingCount} return{pendingCount > 1 ? "s" : ""}
            </span>{" "}
            awaiting your approval.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Search return ID, material, requester…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <tr>
              {[
                "Return ID",
                "Material",
                "Qty",
                "From Store",
                "To Store",
                "Reason",
                "Condition",
                "Requested By",
                "Date",
                "Status",
                "",
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-8 text-center text-gray-400 text-sm"
                >
                  No returns found.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {r.id}
                </td>
                <td className="px-4 py-3 text-gray-900 font-medium">
                  {r.material}
                </td>
                <td className="px-4 py-3 text-gray-900 font-medium">
                  {r.quantity}{" "}
                  <span className="text-gray-400 font-normal text-xs">
                    {r.unit}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {r.fromStore}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">{r.toStore}</td>
                <td
                  className="px-4 py-3 text-gray-500 text-xs max-w-40 truncate"
                  title={r.reason}
                >
                  {r.reason}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONDITION_STYLE[r.condition]}`}
                  >
                    {r.condition}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">{r.requestedBy}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {r.requestDate}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[r.status]}`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelected(r)}
                    className="text-teal-600 hover:text-teal-800"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Return Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                New Material Return
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Material
                </label>
                <select
                  value={form.material}
                  onChange={(e) =>
                    setForm({ ...form, material: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {materials.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={form.quantity}
                    min={1}
                    onChange={(e) =>
                      setForm({ ...form, quantity: Number(e.target.value) })
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Unit
                  </label>
                  <input
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  From Project Store
                </label>
                <select
                  value={form.fromStore}
                  onChange={(e) =>
                    setForm({ ...form, fromStore: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {stores.filter((s) => s !== form.toStore).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  To Store (Return Destination)
                </label>
                <select
                  value={form.toStore}
                  onChange={(e) =>
                    setForm({ ...form, toStore: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {stores.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Material Condition
                </label>
                <select
                  value={form.condition}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      condition: e.target.value as MaterialReturn["condition"],
                    })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {["Good", "Partially Damaged", "Damaged"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Reason for Return
                </label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. Excess materials, wrong specification, project completed…"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Requested By
                </label>
                <input
                  value={form.requestedBy}
                  onChange={(e) =>
                    setForm({ ...form, requestedBy: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitReturn}
                className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl"
              >
                Submit Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Return {selected.id}
                </h2>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${STATUS_STYLE[selected.status]}`}
                >
                  {selected.status}
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-3">
              {(
                [
                  ["Material", `${selected.material}`],
                  ["Quantity", `${selected.quantity} ${selected.unit}`],
                  ["From Store", selected.fromStore],
                  ["To Store", selected.toStore],
                  ["Condition", selected.condition],
                  ["Reason", selected.reason],
                  ["Requested By", selected.requestedBy],
                  ["Request Date", selected.requestDate],
                  ...(selected.approvedBy
                    ? [
                        [
                          "Approved By",
                          `${selected.approvedBy} on ${selected.approvalDate}`,
                        ],
                      ]
                    : []),
                  ...(selected.receivedDate
                    ? [["Received Date", selected.receivedDate]]
                    : []),
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="flex gap-4">
                  <span className="text-xs text-gray-400 w-36 flex-shrink-0 mt-0.5">
                    {label}
                  </span>
                  <span className="text-sm text-gray-800 font-medium">
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-2 flex-wrap">
              {selected.status === "Pending Approval" && (
                <>
                  <button
                    onClick={() => approve(selected.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-xl"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => reject(selected.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </>
              )}
              {selected.status === "Approved" && (
                <button
                  onClick={() => markReceived(selected.id)}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl"
                >
                  <CheckCircle className="w-4 h-4" /> Mark as Received
                </button>
              )}
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
