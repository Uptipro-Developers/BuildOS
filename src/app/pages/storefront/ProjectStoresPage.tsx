import { useState, useEffect } from "react";
import {
  FolderOpen,
  Package,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  CheckCircle,
  X,
} from "lucide-react";
import { getStores, type Store } from "../../api/materials";

type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

function getStatus(item: { qty: number; reorderLevel: number }): StockStatus {
  if (item.qty === 0) return "Out of Stock";
  if (item.qty <= item.reorderLevel) return "Low Stock";
  return "In Stock";
}

const STATUS_STYLE: Record<StockStatus, string> = {
  "In Stock": "bg-green-50 text-green-700",
  "Low Stock": "bg-yellow-50 text-yellow-700",
  "Out of Stock": "bg-red-50 text-red-700",
};

interface ProjectStore {
  id: string;
  project: string;
  location: string;
  custodian: string;
  items: { name: string; qty: number; unit: string; reorderLevel: number }[];
}

function toProjectStore(s: Store): ProjectStore {
  return {
    id: s.id,
    project: s.name,
    location: s.location ?? "",
    custodian: s.manager ?? "",
    items: (s.storeItems || []).map((it: any) => ({
      name: it.materialName,
      qty: it.qty,
      unit: it.unit,
      reorderLevel: it.reorderLevel,
    })),
  };
}

export function ProjectStoresPage() {
  const [stores, setStores] = useState<ProjectStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [procurementTarget, setProcurementTarget] = useState<{
    storeId: string;
    itemIndex: number;
    name: string;
    qty: number;
    unit: string;
    reorderLevel: number;
  } | null>(null);
  const [procurementQty, setProcurementQty] = useState("");
  const [sentToProcurement, setSentToProcurement] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    getStores()
      .then((data) => {
        const ps = data.map(toProjectStore);
        setStores(ps);
        if (ps.length > 0) setExpanded(ps[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <div className="p-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Project Stores</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Site-level stores assigned to active projects
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">{stores.length}</p>
          <p className="text-xs text-gray-500">Active Project Stores</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">
            {stores.reduce((acc, s) => acc + s.items.length, 0)}
          </p>
          <p className="text-xs text-gray-500">Total Items Tracked</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-yellow-600">
            {stores.reduce(
              (acc, s) =>
                acc +
                s.items.filter((i) => getStatus(i) === "Low Stock").length,
              0,
            )}
          </p>
          <p className="text-xs text-gray-500">Low Stock Items</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-red-600">
            {stores.reduce(
              (acc, s) =>
                acc +
                s.items.filter((i) => getStatus(i) === "Out of Stock").length,
              0,
            )}
          </p>
          <p className="text-xs text-gray-500">Out of Stock</p>
        </div>
      </div>

      {/* Store cards */}
      <div className="space-y-3">
        {stores.map((store) => {
          const lowCount = store.items.filter(
            (i) => getStatus(i) !== "In Stock",
          ).length;
          const isOpen = expanded === store.id;
          return (
            <div
              key={store.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            >
              <button
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 text-left"
                onClick={() => setExpanded(isOpen ? null : store.id)}
              >
                <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FolderOpen className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {store.project} Project Store
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {store.location} · Custodian: {store.custodian}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-gray-500">
                    {store.items.length} items
                  </span>
                  {lowCount > 0 && (
                    <span className="flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                      <AlertTriangle className="w-3 h-3" /> {lowCount} need
                      attention
                    </span>
                  )}
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 px-5 py-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                        <th className="pb-2 text-left font-medium">Item</th>
                        <th className="pb-2 text-right font-medium">Qty</th>
                        <th className="pb-2 text-right font-medium">Unit</th>
                        <th className="pb-2 text-right font-medium">
                          Reorder Level
                        </th>
                        <th className="pb-2 text-right font-medium">Status</th>
                        <th className="pb-2 text-right font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {store.items.map((item, i) => {
                        const status = getStatus(item);
                        const procKey = `${store.id}-${i}`;
                        return (
                          <tr key={i} className="group">
                            <td className="py-2.5 flex items-center gap-2">
                              <Package className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                              <span className="text-gray-800">{item.name}</span>
                            </td>
                            <td className="py-2.5 text-right font-semibold text-gray-900">
                              {item.qty}
                            </td>
                            <td className="py-2.5 text-right text-gray-500">
                              {item.unit}
                            </td>
                            <td className="py-2.5 text-right text-gray-500">
                              {item.reorderLevel}
                            </td>
                            <td className="py-2.5 text-right">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[status]}`}
                              >
                                {status}
                              </span>
                            </td>
                            <td className="py-2.5 text-right">
                              <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                {(status === "Low Stock" ||
                                  status === "Out of Stock") &&
                                  (sentToProcurement.has(procKey) ? (
                                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                                      <CheckCircle className="w-3.5 h-3.5" />{" "}
                                      Sent
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setProcurementTarget({
                                          storeId: store.id,
                                          itemIndex: i,
                                          name: item.name,
                                          qty: item.qty,
                                          unit: item.unit,
                                          reorderLevel: item.reorderLevel,
                                        });
                                        setProcurementQty("");
                                      }}
                                      className="p-1.5 text-amber-500 hover:text-amber-700 rounded-lg hover:bg-amber-50"
                                      title="Send for Procurement"
                                    >
                                      <ShoppingCart className="w-3.5 h-3.5" />
                                    </button>
                                  ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Send for Procurement Modal */}
      {procurementTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Send for Procurement
              </h2>
              <button
                onClick={() => setProcurementTarget(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {getStatus(procurementTarget)}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  <span className="font-medium">{procurementTarget.name}</span>{" "}
                  — {procurementTarget.qty} {procurementTarget.unit} in stock,
                  reorder level {procurementTarget.reorderLevel}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Quantity to Procure<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={procurementQty}
                onChange={(e) => setProcurementQty(e.target.value)}
                placeholder="Enter quantity…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <p className="text-xs text-gray-500">
              A procurement request will be raised and sent to the Procurement
              team for sourcing.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setProcurementTarget(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={!procurementQty || Number(procurementQty) <= 0}
                onClick={() => {
                  const key = `${procurementTarget.storeId}-${procurementTarget.itemIndex}`;
                  setSentToProcurement((prev) => new Set([...prev, key]));
                  setProcurementTarget(null);
                }}
                className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" /> Send to Procurement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
