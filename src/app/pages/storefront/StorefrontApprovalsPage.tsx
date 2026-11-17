import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Eye, Search } from "lucide-react";
import { toast } from "sonner";
import {
  getConstructionApprovals,
  updateConstructionApproval,
  ConstructionApproval as ApiApproval,
} from "../../api/construction-extras";
import {
  getMaterialRequests,
  updateMaterialRequest,
  getStores,
  getMaterialAmendments,
  decideMaterialAmendment,
  type MaterialRequest as ApiMaterialRequest,
  type MaterialAmendment,
  type Store,
} from "../../api/materials";
import { formatDateByGeneralSettings } from "../../utils/generalSettings";
import { baseMaterialRequestRef } from "../../utils/materialRequestRef";

type ApprovalType = "Material Request" | "Material Amendment" | "Transfer" | "Return";
type ApprovalStatus = "Pending" | "Approved" | "Rejected";

interface ApprovalItem {
  id: string;
  type: ApprovalType;
  reference: string;
  description: string;
  requestedBy: string;
  requestDate: string;
  status: ApprovalStatus;
  approvedBy: string;
  approvalDate: string;
  details: Record<string, string>;
  materialRequest?: ApiMaterialRequest;
  amendment?: MaterialAmendment;
  materials?: ApiMaterialRequest[];
  fulfillmentRoute?: "Stock Movement" | "Procurement" | "Stock Movement + Procurement";
}

type FulfilmentDraft = Record<string, {
  method: "stock_movement" | "procurement" | "";
  sourceStoreId: string;
}>;

const TYPE_STYLE: Record<ApprovalType, string> = {
  "Material Request": "bg-blue-50 text-blue-700",
  "Material Amendment": "bg-amber-50 text-amber-700",
  Transfer: "bg-purple-50 text-purple-700",
  Return: "bg-yellow-50 text-yellow-700",
};

const STATUS_STYLE: Record<ApprovalStatus, string> = {
  Pending: "bg-yellow-50 text-yellow-700",
  Approved: "bg-green-50 text-green-700",
  Rejected: "bg-red-50 text-red-700",
};

// MOCK removed — data now from API

function fromApi(a: ApiApproval): ApprovalItem {
  return {
    id: a.id,
    type: a.type as ApprovalType,
    reference: a.reference,
    description: a.description ?? "",
    requestedBy: a.requestedBy ?? "",
    requestDate: a.requestDate,
    status: a.status as ApprovalStatus,
    approvedBy: a.reviewedBy ?? "",
    approvalDate: a.reviewedAt ?? "",
    details: { Notes: a.notes ?? "" },
  };
}

function fromMaterialRequestGroup(rows: ApiMaterialRequest[]): ApprovalItem {
  const r = rows[0];
  const normalized = String(r.status ?? "pending").toLowerCase();
  const status: ApprovalStatus = normalized === "rejected" ? "Rejected" : normalized === "pending" ? "Pending" : "Approved";
  const fulfillmentRoute = r.fulfillmentMethod === "stock_movement"
    ? "Stock Movement"
    : r.fulfillmentMethod === "procurement"
      ? "Procurement"
      : r.fulfillmentMethod === "mixed"
        ? "Stock Movement + Procurement"
      : undefined;
  const lifecycleStatus = String(r.fulfillmentStatus || r.status || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  return {
    id: r.id,
    type: "Material Request",
    reference: baseMaterialRequestRef(r.reference),
    description: rows.length === 1 ? `${r.materialName} — ${r.qty} ${r.unit}` : `${rows.length} materials requested`,
    requestedBy: r.requestedBy ?? "",
    requestDate: formatDateByGeneralSettings(r.requestDate),
    status,
    approvedBy: r.approvedBy ?? "",
    approvalDate: r.approvedAt ? formatDateByGeneralSettings(r.approvedAt) : "",
    details: {
      "Requesting Store": r.storeName,
      Project: r.projectName ?? "—",
      Purpose: r.purpose ?? "—",
      "Fulfilment Route": fulfillmentRoute ?? "Awaiting approval decision",
      "Lifecycle Status": lifecycleStatus,
      Notes: r.notes ?? "—",
    },
    materialRequest: r,
    materials: rows,
    fulfillmentRoute,
  };
}

function fromAmendment(a: MaterialAmendment): ApprovalItem {
  const changes = Object.entries(a.proposedValue ?? {}).map(([field, value]) => `${field}: ${String(value)}`);
  return {
    id: a.id,
    type: "Material Amendment",
    reference: `AMD-${a.id.slice(-8).toUpperCase()}`,
    description: `${a.materialName}${a.storeName ? ` — ${a.storeName}` : ""}`,
    requestedBy: a.requestedBy,
    requestDate: formatDateByGeneralSettings(a.createdAt),
    status: a.status === "approved" ? "Approved" : a.status === "rejected" ? "Rejected" : "Pending",
    approvedBy: a.reviewedBy ?? "",
    approvalDate: a.reviewedAt ? formatDateByGeneralSettings(a.reviewedAt) : "",
    details: {
      "Record Type": a.entityType === "StoreItem" ? "Store material" : "Material catalogue",
      Store: a.storeName ?? "—",
      "Proposed Changes": changes.join(" · ") || "—",
      Reason: a.reason ?? "—",
    },
    amendment: a,
  };
}

export function StorefrontApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ApprovalType | "All">("All");
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "All">(
    "Pending",
  );
  const [selected, setSelected] = useState<ApprovalItem | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [fulfilmentDraft, setFulfilmentDraft] = useState<FulfilmentDraft>({});
  const [saving, setSaving] = useState(false);

  async function loadApprovals() {
    const [approvalRows, materialRequests, storeRows, amendments] = await Promise.all([
      getConstructionApprovals(),
      getMaterialRequests(),
      getStores(),
      getMaterialAmendments(),
    ]);
    const groups = new Map<string, ApiMaterialRequest[]>();
    materialRequests.forEach((request) => {
      const base = baseMaterialRequestRef(request.reference);
      groups.set(base, [...(groups.get(base) ?? []), request]);
    });
    setItems([
      ...Array.from(groups.values()).map(fromMaterialRequestGroup),
      ...amendments.map(fromAmendment),
      ...approvalRows.filter((row) => row.type !== "Material Request").map(fromApi),
    ]);
    setStores(storeRows);
  }

  useEffect(() => {
    loadApprovals()
      .catch((err: unknown) =>
        toast.error(
          err instanceof Error ? err.message : "Failed to load approvals.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch =
      a.reference.toLowerCase().includes(q) ||
      a.requestedBy.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q);
    const matchType = typeFilter === "All" || a.type === typeFilter;
    const matchStatus = statusFilter === "All" || a.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  function openDetails(item: ApprovalItem) {
    const draft: FulfilmentDraft = {};
    (item.materials ?? []).forEach((material) => {
      draft[material.id] = { method: "", sourceStoreId: "" };
    });
    setFulfilmentDraft(draft);
    setSelected(item);
  }

  const allocationValid = Boolean(selected?.materials?.length) && selected!.materials!.every((material) => {
    const decision = fulfilmentDraft[material.id];
    return decision?.method === "procurement" || (decision?.method === "stock_movement" && Boolean(decision.sourceStoreId));
  });

  async function approve(item: ApprovalItem) {
    if (item.materialRequest && !allocationValid) {
      toast.error("Allocate the full requested quantity for every material.");
      return;
    }
    setSaving(true);
    try {
      if (item.amendment) {
        await decideMaterialAmendment(item.id, "approved");
        await loadApprovals();
      } else if (item.materialRequest) {
        await updateMaterialRequest(item.id, {
          status: "approved",
          fulfillmentPlans: (item.materials ?? []).map((material) => ({
            requestId: material.id,
            allocations: fulfilmentDraft[material.id]?.method === "stock_movement"
              ? [{ storeId: fulfilmentDraft[material.id].sourceStoreId, qty: material.qty }]
              : [],
            procurementQty: fulfilmentDraft[material.id]?.method === "procurement" ? material.qty : 0,
          })),
        });
        await loadApprovals();
      } else {
        const updated = await updateConstructionApproval(item.id, {
          status: "Approved",
          reviewedBy: "Store Manager",
        });
        setItems((prev) => prev.map((a) => (a.id === item.id ? fromApi(updated) : a)));
      }
      setSelected(null);
      setFulfilmentDraft({});
      toast.success(item.amendment ? "Material amendment approved and applied." : item.materialRequest ? "Material request approved and routed." : "Request approved.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to approve the request.",
      );
    } finally { setSaving(false); }
  }

  async function reject(item: ApprovalItem) {
    try {
      if (item.amendment) {
        await decideMaterialAmendment(item.id, "rejected");
        await loadApprovals();
      } else if (item.materialRequest) {
        await updateMaterialRequest(item.id, { status: "rejected" });
        await loadApprovals();
      } else {
        const updated = await updateConstructionApproval(item.id, {
          status: "Rejected",
          reviewedBy: "Store Manager",
        });
        setItems((prev) => prev.map((a) => (a.id === item.id ? fromApi(updated) : a)));
      }
      setSelected(null);
      toast.success("Request rejected.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reject the request.",
      );
    }
  }

  const pendingCount = items.filter((a) => a.status === "Pending").length;

  if (loading)
    return (
      <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
    );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Approvals</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Review and action material requests, transfers, and returns
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-sm px-3 py-1.5 rounded-xl font-medium">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Summary tabs */}
      <div className="flex items-center gap-3">
        {(["All", "Pending", "Approved", "Rejected"] as const).map((s) => {
          const count =
            s === "All"
              ? items.length
              : items.filter((a) => a.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 text-sm rounded-xl border font-medium ${statusFilter === s ? "bg-teal-700 text-white border-teal-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
            >
              {s}{" "}
              {count > 0 && (
                <span className="ml-1.5 bg-white/20 px-1.5 rounded-full text-xs">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Search reference, requester…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {(["All", "Material Request", "Material Amendment", "Transfer", "Return"] as const).map(
          (t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1.5 text-xs rounded-lg border font-medium ${typeFilter === t ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
            >
              {t}
            </button>
          ),
        )}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl px-6 py-12 text-center text-gray-400 text-sm">
            No approvals found.
          </div>
        )}
        {filtered.map((a) => (
          <div
            key={a.id}
            className="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLE[a.type]}`}
                >
                  {a.type}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  {a.reference}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {a.description}
              </p>
              {a.fulfillmentRoute && (
                <p className="text-xs text-gray-500 mt-1">
                  Approved for <span className="font-semibold text-gray-700">{a.fulfillmentRoute}</span>
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Requested by{" "}
                <span className="text-gray-700 font-medium">
                  {a.requestedBy}
                </span>{" "}
                · {a.requestDate}
              </p>
              {a.approvedBy && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {a.status} by {a.approvedBy} on {a.approvalDate}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[a.status]}`}
              >
                {a.status}
              </span>
              {a.status === "Pending" && (
                <>
                  <button
                    onClick={() => {
                      if (a.materialRequest) {
                        openDetails(a);
                      } else {
                        void approve(a);
                      }
                    }}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Plan &amp; Approve
                  </button>
                  <button
                    onClick={() => reject(a)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  openDetails(a);
                }}
                className="p-1.5 text-gray-400 hover:text-teal-600 rounded-lg hover:bg-teal-50"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLE[selected.type]}`}
                  >
                    {selected.type}
                  </span>
                  <span className="text-xs font-mono text-gray-500">
                    {selected.reference}
                  </span>
                </div>
                <h2 className="text-base font-semibold text-gray-900 mt-1">
                  {selected.description}
                </h2>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              {selected.materials && selected.materials.length > 0 && (
                <section className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between gap-3 bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Requested materials
                    </h3>
                    <span className="text-xs font-medium text-gray-500">
                      {selected.materials.length} {selected.materials.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto bg-gray-50/60 p-3">
                    {selected.materials.map((material, index) => (
                      <div
                        key={material.id}
                        className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                      >
                        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-blue-50 text-xs font-semibold text-blue-700">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900" title={material.materialName}>
                            {material.materialName}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">Material {index + 1}</p>
                        </div>
                        <div className="flex-none rounded-lg bg-gray-100 px-2.5 py-1.5 text-right">
                          <p className="text-sm font-semibold text-gray-800">{material.qty}</p>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{material.unit}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {Object.entries(selected.details).map(([k, v]) => (
                <div key={k} className="flex gap-4">
                  <span className="text-xs text-gray-400 w-36 flex-shrink-0 mt-0.5">
                    {k}
                  </span>
                  <span className="text-sm text-gray-800 font-medium">{v}</span>
                </div>
              ))}
              <div className="flex gap-4">
                <span className="text-xs text-gray-400 w-36 flex-shrink-0 mt-0.5">
                  Requested By
                </span>
                <span className="text-sm text-gray-800 font-medium">
                  {selected.requestedBy} · {selected.requestDate}
                </span>
              </div>
              {selected.approvedBy && (
                <div className="flex gap-4">
                  <span className="text-xs text-gray-400 w-36 flex-shrink-0 mt-0.5">
                    Actioned By
                  </span>
                  <span className="text-sm text-gray-800 font-medium">
                    {selected.approvedBy} on {selected.approvalDate}
                  </span>
                </div>
              )}
            </div>
            {selected.status === "Pending" && selected.materialRequest && (
              <div className="px-6 py-4 space-y-3 flex-none max-h-[52vh] overflow-y-auto border-t border-gray-200 bg-gray-50/60">
                <div className="sticky -top-4 z-10 bg-gray-50 py-2">
                  <p className="text-sm font-semibold text-gray-900">Choose fulfilment route</p>
                  <p className="text-xs text-gray-500 mt-1">Store balances are shown for reference. Choose one supplying store, or send the full material line to Procurement.</p>
                </div>
                {(selected.materials ?? []).map((material) => {
                  const allStockRows = stores.flatMap((store) => (store.storeItems ?? [])
                    .filter((storeItem) => storeItem.materialName.toLowerCase() === material.materialName.toLowerCase())
                    .map((storeItem) => ({ store, storeItem, available: Math.max(0, storeItem.qty - (storeItem.reservedQty ?? 0)) })))
                    .filter((row) => row.storeItem.qty > 0 || row.storeItem.reservedQty);
                  const stockRows = allStockRows.filter((row) => row.store.id !== material.storeId);
                  const decision = fulfilmentDraft[material.id] ?? { method: "", sourceStoreId: "" };
                  const organizationTotal = allStockRows.reduce((sum, row) => sum + row.available, 0);
                  return (
                    <section key={material.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-3">
                        <div><p className="text-sm font-semibold text-gray-900">{material.materialName}</p><p className="text-xs text-gray-500">Requested: {material.qty} {material.unit}</p></div>
                        <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-blue-50 text-blue-700">Organization available: {organizationTotal} {material.unit}</span>
                      </div>
                      <div className="p-3 space-y-2">
                        {stockRows.length === 0 && <p className="text-xs text-gray-500 rounded-lg bg-gray-50 p-3">No stock is available in another store.</p>}
                        {stockRows.map(({ store, storeItem, available }) => {
                          const canSupply = available >= material.qty;
                          return <div key={store.id} className={`grid grid-cols-[auto_1fr_auto] gap-3 items-center rounded-lg border p-2.5 ${decision.sourceStoreId === store.id ? "border-teal-500 bg-teal-50" : "border-gray-100"}`}>
                            <input type="radio" name={`route-${material.id}`} checked={decision.method === "stock_movement" && decision.sourceStoreId === store.id} disabled={!canSupply}
                              onChange={() => setFulfilmentDraft((current) => ({ ...current, [material.id]: { method: "stock_movement", sourceStoreId: store.id } }))} />
                            <div className="min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{store.name}</p><p className="text-[11px] text-gray-500">On hand {storeItem.qty} · Reserved {storeItem.reservedQty ?? 0} · <span className="font-semibold text-teal-700">Available {available}</span></p></div>
                            <span className={`text-[11px] font-medium ${canSupply ? "text-teal-700" : "text-gray-400"}`}>{canSupply ? "Can supply full request" : "Insufficient for full request"}</span>
                          </div>;
                        })}
                        <label className={`grid grid-cols-[auto_1fr] gap-3 items-center rounded-lg border p-2.5 cursor-pointer ${decision.method === "procurement" ? "border-purple-500 bg-purple-50" : "border-purple-100 bg-purple-50/50"}`}>
                          <input type="radio" name={`route-${material.id}`} checked={decision.method === "procurement"}
                            onChange={() => setFulfilmentDraft((current) => ({ ...current, [material.id]: { method: "procurement", sourceStoreId: "" } }))} />
                          <div><p className="text-sm font-medium text-purple-900">Procurement</p><p className="text-[11px] text-purple-700">Requires separate Procurement approval</p></div>
                        </label>
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
              {selected.status === "Pending" && (
                <>
                  <button
                    onClick={() => approve(selected)}
                    disabled={saving || Boolean(selected.materialRequest && !allocationValid)}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-xl disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" /> {saving ? "Routing…" : selected.materialRequest ? "Approve Fulfilment" : "Approve"}
                  </button>
                  <button
                    onClick={() => reject(selected)}
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </>
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
