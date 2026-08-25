import { notifyLoadFailure } from "../../utils/loadFailure";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useApprovalRights } from "../../utils/useApprovalRights";
import { useAuthUser } from "../../utils/useAuthUser";
import {
  getMaterialRequests,
  createMaterialRequest,
  updateMaterialRequest,
  getStores,
  searchMaterialTypes,
  MaterialRequest as ApiMR,
  MaterialTypeSearchResult,
} from "../../api/materials";
import {
  formatDateByGeneralSettings,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";
import {
  ClipboardList,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  X,
  Trash2,
  ShoppingCart,
} from "lucide-react";
import {
  AdvancedFilter,
  applyFiltersAndSort,
  type FilterFieldDef,
  type ActiveFilters,
  type SortConfig,
} from "../../components/AdvancedFilter";
import { useNumbering } from "../../stores/numberingStore";
import { getReferenceData } from "../../api/reference-data";
import { getAuthUserName } from "../../utils/useAuthUser";
import {
  itemReference,
  baseMaterialRequestRef,
} from "../../utils/materialRequestRef";
import { StatusBadge } from "../../components/StatusBadge";
import { RowAction, RowActionNote } from "../../components/RowAction";
import {
  MATERIAL_REQUEST_STATUS,
  statusDef,
} from "../../utils/procurementWorkflow";

type ReqStatus =
  "pending" | "approved" | "rejected" | "in_procurement" | "fulfilled";

type LocalMR = {
  id: string;
  /**
   * Database ids of every MaterialRequest row behind this card. The API stores
   * one row per material while the UI presents a single multi-item request, so
   * the rows are grouped by shared `reference` and status changes must be
   * applied to all of them.
   */
  apiIds: string[];
  project: string;
  requestedBy: string;
  department: string;
  status: ReqStatus;
  priority: "urgent" | "high" | "normal";
  submittedDate: string;
  /** Display string, formatted to the org's date settings. */
  neededBy: string;
  /** The same date as ISO, which is what gets persisted. */
  neededByIso?: string;
  totalItems: number;
  justification: string;
  /** Fulfilling store — required by the backend MaterialRequest model. */
  storeId?: string;
  storeName?: string;
  /** The Purchase Request auto-raised when this request was approved. */
  prRef?: string;
  items: {
    material: string;
    qty: number;
    unit: string;
    notes: string;
  }[];
};

function fromApiMR(r: ApiMR): LocalMR {
  const validStatuses: ReqStatus[] = [
    "pending",
    "approved",
    "rejected",
    "in_procurement",
    "fulfilled",
  ];
  const rawStatus = r.status?.toLowerCase().replace(/\s+/g, "_") ?? "pending";
  const status: ReqStatus = validStatuses.includes(rawStatus as ReqStatus)
    ? (rawStatus as ReqStatus)
    : "pending";
  const rawPri = r.priority?.toLowerCase() ?? "normal";
  const priority = (
    ["urgent", "high", "normal"].includes(rawPri) ? rawPri : "normal"
  ) as "urgent" | "high" | "normal";
  return {
    id: r.reference ?? r.id,
    apiIds: [r.id],
    project: r.projectName ?? "Unknown Project",
    requestedBy: r.requestedBy ?? "Unknown",
    department: "Site",
    status,
    priority,
    submittedDate: r.requestDate
      ? formatDateByGeneralSettings(r.requestDate)
      : "",
    // Rendered from the stored column. This was hardcoded to "" because the
    // field did not exist server-side, so the Due date went blank on reload.
    neededBy: r.neededBy ? formatDateByGeneralSettings(r.neededBy) : "",
    totalItems: 1,
    justification: r.purpose ?? r.notes ?? "",
    prRef: r.prRef,
    items: [
      {
        material: r.materialName,
        qty: r.qty,
        unit: r.unit,
        notes: r.notes ?? "",
      },
    ],
  };
}

// The `<requestRef>/<n>` convention now lives in utils/materialRequestRef so
// Purchase Requests can resolve it too. Re-exported because this module was the
// published home of `itemReference`.
export { itemReference };

const baseReference = baseMaterialRequestRef;

/**
 * Collapses the API's one-row-per-material records into the multi-item requests
 * the UI shows, grouping the `<ref>/<n>` rows a single submission writes.
 */
function groupApiRequests(rows: ApiMR[]): LocalMR[] {
  const grouped = new Map<string, LocalMR>();
  for (const row of rows) {
    const mapped = fromApiMR(row);
    const key = baseReference(mapped.id);
    mapped.id = key;
    const existing = grouped.get(key);
    if (existing) {
      existing.apiIds.push(...mapped.apiIds);
      existing.items.push(...mapped.items);
      existing.totalItems = existing.items.length;
    } else {
      grouped.set(key, mapped);
    }
  }
  return [...grouped.values()];
}

const priorityConfig = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-gray-100 text-gray-600",
};

const tabs: { key: ReqStatus | "all"; label: string }[] = [
  { key: "all", label: "All Requests" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "in_procurement", label: "In Procurement" },
  { key: "fulfilled", label: "Fulfilled" },
  { key: "rejected", label: "Rejected" },
];

const MR_FILTER_FIELDS: FilterFieldDef[] = [
  { key: "id", label: "Request ID", type: "text" },
  { key: "project", label: "Project", type: "text" },
  { key: "requestedBy", label: "Requested By", type: "text" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["pending", "approved", "rejected", "in_procurement", "fulfilled"],
  },
  {
    key: "priority",
    label: "Priority",
    type: "select",
    options: ["urgent", "high", "normal"],
  },
];

interface MRItem {
  material: string;
  qty: string;
  unit: string;
  notes: string;
}

/**
 * Searches the MaterialType catalogue (the same rows the Storefront "Add
 * Material" flow searches) and, once one is picked, hands its name and
 * stocking unit back to the caller. A free-text field let requesters type a
 * material that did not exist, or a spelling of one that did, and nothing
 * downstream could match it to stock — this constrains the request to the
 * real catalogue instead.
 */
function MaterialTypeSearchField({
  selectedName,
  excludeNames,
  onPick,
  onClear,
}: {
  selectedName: string;
  excludeNames: Set<string>;
  onPick: (hit: MaterialTypeSearchResult) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MaterialTypeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      searchMaterialTypes(q)
        .then((hits) => setResults(hits.filter((h) => !excludeNames.has(h.name))))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(handle);
    // Re-searching on every keystroke of `excludeNames` (a new Set each
    // render) would spam the endpoint — the filter is applied to whatever
    // the last search returned instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  if (selectedName) {
    return (
      <div className="flex items-center gap-1">
        <input
          value={selectedName}
          disabled
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-gray-50 text-gray-700"
        />
        <button
          type="button"
          onClick={onClear}
          title="Change material"
          className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search material type…"
        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {query.trim() && (
        <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {searching ? (
            <p className="px-3 py-2 text-xs text-gray-400">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-red-500">
              No matching material type found for "{query.trim()}".
            </p>
          ) : (
            results.map((hit) => (
              <button
                key={hit.id}
                type="button"
                onClick={() => {
                  onPick(hit);
                  setQuery("");
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0"
              >
                <span className="font-medium text-gray-900">{hit.name}</span>{" "}
                <span className="text-xs text-gray-400">
                  {hit.material.name} · {hit.material.category}
                  {hit.sku ? ` · ${hit.sku}` : ""}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function NewMRModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (req: LocalMR) => void | Promise<void>;
}) {
  const today = new Date();
  const fmtDate = (d: Date) => formatDateByGeneralSettings(d);
  const addDays = (n: number) => {
    const d2 = new Date(today);
    d2.setDate(d2.getDate() + n);
    return fmtDate(d2);
  };
  /**
   * The same date as an ISO string, for storing.
   * `addDays` returns a display string formatted to the org's date settings, which
   * is not parseable back into a date — so the value that goes to the server has
   * to be computed separately.
   */
  const addDaysIso = (n: number) => {
    const d2 = new Date(today);
    d2.setDate(d2.getDate() + n);
    d2.setHours(0, 0, 0, 0);
    return d2.toISOString();
  };

  const [projects, setProjects] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  // MaterialRequest.storeName is required by the backend, so the fulfilling
  // store has to be captured here rather than defaulted server-side.
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [storeId, setStoreId] = useState("");
  const [project, setProject] = useState("");
  const [department, setDepartment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [neededDays, setNeededDays] = useState("5");
  // "" is the unpicked placeholder state — Project/Fulfilling Store/Priority
  // used to default to the first loaded option, which looked like a real
  // choice the requester never actually made.
  const [priority, setPriority] = useState<"" | "urgent" | "high" | "normal">(
    "",
  );
  const [justification, setJustification] = useState("");
  const [items, setItems] = useState<MRItem[]>([
    { material: "", qty: "", unit: "", notes: "" },
  ]);

  useEffect(() => {
    getReferenceData()
      .then((data) => {
        setProjects(data.projects.map((p) => p.name));
        setDepartments(data.departments.map((d) => d.name));
      })
      .catch(() => { });
    getStores()
      .then((list) => setStores(list.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => setStores([]));
  }, []);

  const addItem = () =>
    setItems((p) => [...p, { material: "", qty: "", unit: "", notes: "" }]);
  const removeItem = (i: number) =>
    setItems((p) => p.filter((_, j) => j !== i));
  const updateItem = (i: number, k: keyof MRItem, v: string) =>
    setItems((p) => p.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  /**
   * Materials picked on every line except `i` — used to keep a material out of
   * the other lines' dropdowns so it can't be requested twice in one request.
   */
  const materialsOnOtherLines = (i: number) =>
    new Set(
      items
        .filter((_, j) => j !== i)
        .map((it) => it.material)
        .filter(Boolean),
    );
  const { allocate } = useNumbering();
  const valid =
    project &&
    storeId &&
    priority &&
    justification.trim() &&
    items.every((it) => it.material.trim() && it.qty.trim());

  async function handleSave() {
    if (!valid || submitting) return;
    setSubmitting(true);
    const nextId = await allocate("MaterialRequest");
    try {
      await onSave({
        id: nextId,
        // Filled in by the caller once the backend rows are created.
        apiIds: [],
        storeId,
        storeName: stores.find((s) => s.id === storeId)?.name ?? "",
        project,
        requestedBy: getAuthUserName() || "Current User",
        department,
        status: "pending",
        // `valid` guarantees this is non-empty by the time handleSave runs.
        priority: priority as "urgent" | "high" | "normal",
        submittedDate: fmtDate(today),
        neededBy: addDays(parseInt(neededDays) || 5),
        neededByIso: addDaysIso(parseInt(neededDays) || 5),
        totalItems: items.length,
        justification: justification.trim(),
        items: items.map((it) => ({
          material: it.material,
          qty: parseFloat(it.qty) || 0,
          unit: it.unit,
          notes: it.notes,
        })),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            New Material Request
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
                Project <span className="text-red-500">*</span>
              </label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select project…</option>
                {projects.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select department…</option>
                {departments.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Fulfilling Store <span className="text-red-500">*</span>
              </label>
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select store…</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select priority…</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Needed In (days)
              </label>
              <input
                type="number"
                min={1}
                value={neededDays}
                onChange={(e) => setNeededDays(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-0.5">
                Due date: {addDays(parseInt(neededDays) || 5)}
              </p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={2}
              placeholder="Why are these materials needed?"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">
                Materials Requested <span className="text-red-500">*</span>
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
                  className="grid grid-cols-[1fr_60px_80px_1fr_28px] gap-1.5 items-start"
                >
                  <MaterialTypeSearchField
                    selectedName={item.material}
                    excludeNames={materialsOnOtherLines(i)}
                    onPick={(hit) => {
                      updateItem(i, "material", hit.name);
                      updateItem(i, "unit", hit.unit);
                    }}
                    onClear={() => {
                      updateItem(i, "material", "");
                      updateItem(i, "unit", "");
                    }}
                  />
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => updateItem(i, "qty", e.target.value)}
                    placeholder="Qty"
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={item.unit}
                    disabled
                    placeholder="—"
                    title="Filled in from the selected material type"
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-gray-50 text-gray-500"
                  />
                  <input
                    value={item.notes}
                    onChange={(e) => updateItem(i, "notes", e.target.value)}
                    placeholder="Notes (optional)"
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(i)}
                      className="text-red-400 hover:text-red-600 mt-1.5"
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
            className="px-4 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!valid}
            className="px-4 py-2 text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ClipboardList className="w-4 h-4" /> Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectMRModal({
  req,
  onClose,
  onDone,
}: {
  req: LocalMR;
  onClose: () => void;
  onDone: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Reject Material Request
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm">
            <span className="font-medium text-red-800">{req.id}</span> ·{" "}
            <span className="text-red-700">{req.project}</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Explain why this request is being rejected…"
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
            onClick={() => reason.trim() && onDone(reason.trim())}
            disabled={!reason.trim()}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" /> Reject
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Sends the requester a question without deciding the request.
 *
 * The "Request More Info" button had no handler at all. The request deliberately
 * stays pending — asking for detail is not an approval or a rejection — and the
 * question is appended to the request's notes so it travels with the record
 * rather than living only in the approver's head.
 */
function MoreInfoMRModal({
  req,
  onClose,
  onDone,
}: {
  req: LocalMR;
  onClose: () => void;
  onDone: (question: string) => void;
}) {
  const [question, setQuestion] = useState("");
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Request More Information
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm">
            <span className="font-medium text-blue-800">{req.id}</span> ·{" "}
            <span className="text-blue-700">{req.project}</span>
            <p className="text-xs text-blue-700/80 mt-1">
              Raised by {req.requestedBy}. The request stays pending.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              What do you need to know?{" "}
              <span className="text-red-500">*</span>
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              placeholder="e.g. Confirm the required grade and whether site delivery is needed…"
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
            onClick={() => question.trim() && onDone(question.trim())}
            disabled={!question.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send Request
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Success toast ──────────────────────────────────────────────────────────────
/**
 * Reports the purchase request that approval raised.
 *
 * Approving a material request *is* the decision to buy, so the purchase
 * request is created for you rather than waiting behind a second "Raise
 * Purchase Request" button — which asked the same person to confirm the same
 * decision twice, and left an approved request going nowhere if they didn't.
 */
function PRRaisedToast({
  prId,
  onClose,
}: {
  prId: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-white border border-green-200 rounded-2xl shadow-xl px-5 py-4 flex items-start gap-3 w-80">
      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900">
          Purchase Request Raised
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          <span className="font-semibold text-blue-600">{prId}</span> was created
          automatically and is waiting to be raised to suppliers.
        </p>
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function MaterialRequestsPage() {
  const [reqList, setReqList] = useState<LocalMR[]>([]);
  const [loading, setLoading] = useState(true);
  const [prToast, setPrToast] = useState<string | null>(null);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ReqStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [advFilters, setAdvFilters] = useState<ActiveFilters>({});
  const [advSort, setAdvSort] = useState<SortConfig>(null);
  const [showNewMR, setShowNewMR] = useState(false);
  const [rejectReq, setRejectReq] = useState<LocalMR | null>(null);
  const [moreInfoReq, setMoreInfoReq] = useState<LocalMR | null>(null);

  const { canApprove } = useApprovalRights();
  const authUser = useAuthUser();
  /** Material Requests process id from the backend process catalog. */
  const mayApproveRequests = canApprove("p_material_requests");

  /**
   * Whether the signed-in user raised this request.
   *
   * `requestedBy` stores a display name, so match on name and fall back to email —
   * the same shapes the workflow configuration is written in.
   */
  function isOwnRequest(req: LocalMR) {
    const mine = [authUser.name, authUser.email]
      .map((v) => String(v ?? "").trim().toLowerCase())
      .filter(Boolean);
    const raisedBy = String(req.requestedBy ?? "").trim().toLowerCase();
    return Boolean(raisedBy) && mine.includes(raisedBy);
  }

  /** Reloads the list, and hands the caller the rows it just stored. */
  function loadRequests() {
    return getMaterialRequests()
      .then((data) => {
        const grouped = groupApiRequests(data);
        setReqList(grouped);
        return grouped;
      })
      .catch((err) => {
        notifyLoadFailure("material requests", err);
        return undefined;
      });
  }

  useEffect(() => {
    loadRequests().finally(() => setLoading(false));
  }, []);

  /** Applies a status change to every API row behind a request card. */
  async function persistStatus(req: LocalMR, status: ReqStatus) {
    const previous = reqList;
    // Optimistic: the card reflects the new status immediately, and rolls back
    // if the backend rejects it.
    setReqList((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status } : r)),
    );
    try {
      await Promise.all(
        req.apiIds.map((apiId) => updateMaterialRequest(apiId, { status })),
      );
      // Approval raises the purchase request server-side, so the card has to be
      // re-read to learn its reference — and to pick up the `in_procurement`
      // status the server moved it to.
      if (status === "approved") {
        const refreshed = await loadRequests();
        const raised = refreshed?.find((r) => r.id === req.id)?.prRef;
        if (raised) {
          setPrToast(raised);
          setTimeout(() => setPrToast(null), 6000);
        }
      }
    } catch (error) {
      setReqList(previous);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update the material request.",
      );
    }
  }

  const filtered = applyFiltersAndSort(
    reqList.filter((r) => {
      const matchTab = activeTab === "all" || r.status === activeTab;
      const matchSearch =
        r.id.toLowerCase().includes(search.toLowerCase()) ||
        r.project.toLowerCase().includes(search.toLowerCase()) ||
        r.requestedBy.toLowerCase().includes(search.toLowerCase());
      return matchTab && matchSearch;
    }),
    advFilters,
    advSort,
  );

  if (loading)
    return (
      <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
    );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Material Requests
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Review, approve, and track material issuance requests from site
          </p>
        </div>
        <button
          onClick={() => setShowNewMR(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-md text-sm hover:bg-blue-800"
        >
          <Plus className="w-3.5 h-3.5" /> New Request
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => {
          const count =
            tab.key === "all"
              ? reqList.length
              : reqList.filter((r) => r.status === tab.key).length;
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

      {/* Search + Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search requests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <AdvancedFilter
          fields={MR_FILTER_FIELDS}
          filters={advFilters}
          onFiltersChange={setAdvFilters}
          sort={advSort}
          onSortChange={setAdvSort}
        />
        <span className="text-xs text-gray-400">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map((req) => {
          const cfg = statusDef(MATERIAL_REQUEST_STATUS, req.status);
          const isExpanded = expanded === req.id;
          return (
            <div
              key={req.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(isExpanded ? null : req.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">
                      {req.id}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${priorityConfig[req.priority]}`}
                    >
                      {req.priority}
                    </span>
                    <StatusBadge {...cfg} />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{req.project}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    By {req.requestedBy} · {req.department} · {req.totalItems}{" "}
                    item{req.totalItems > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-500">
                    Submitted: {req.submittedDate}
                  </p>
                  <p className="text-xs font-medium text-gray-700 mt-0.5">
                    Due date: {req.neededBy}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50">
                  <div className="px-5 py-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Justification
                        </p>
                        <p className="text-sm text-gray-700">
                          {req.justification}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Request Details
                        </p>
                        <div className="space-y-1 text-sm">
                          <div className="flex gap-4">
                            <span className="text-gray-500 w-24">
                              Request ID
                            </span>
                            <span className="font-medium text-gray-900">
                              {req.id}
                            </span>
                          </div>
                          <div className="flex gap-4">
                            <span className="text-gray-500 w-24">Project</span>
                            <span className="font-medium text-gray-900">
                              {req.project}
                            </span>
                          </div>
                          <div className="flex gap-4">
                            <span className="text-gray-500 w-24">
                              Requested by
                            </span>
                            <span className="font-medium text-gray-900">
                              {req.requestedBy}
                            </span>
                          </div>
                          <div className="flex gap-4">
                            <span className="text-gray-500 w-24">
                              Due date
                            </span>
                            <span className="font-medium text-gray-900">
                              {req.neededBy}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Requested Materials
                      </p>
                      <table className="w-full text-sm bg-white rounded-md border border-gray-200">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-left">
                            <th className="px-3 py-2 text-xs font-medium text-gray-500">
                              Material
                            </th>
                            <th className="px-3 py-2 text-xs font-medium text-gray-500 text-right">
                              Requested
                            </th>
                            <th className="px-3 py-2 text-xs font-medium text-gray-500">
                              Notes
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {req.items.map((item, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium text-gray-900">
                                {item.material}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-gray-900">
                                {formatNumberByGeneralSettings(item.qty)}{" "}
                                {item.unit}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-500">
                                {item.notes}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Approval controls appear only for a configured approver on
                        this process, and never for the person who raised the
                        request. Previously every viewer saw Approve and Reject, so
                        a requester could approve their own request. */}
                    {req.status === "pending" &&
                      (mayApproveRequests && !isOwnRequest(req) ? (
                        <div className="flex gap-2 mt-4 justify-end">
                          <button
                            onClick={() => setRejectReq(req)}
                            className="px-4 py-2 text-sm border border-red-200 text-red-700 rounded-md hover:bg-red-50"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => setMoreInfoReq(req)}
                            className="px-4 py-2 text-sm border border-blue-200 text-blue-700 rounded-md hover:bg-blue-50"
                          >
                            Request More Info
                          </button>
                          <button
                            onClick={() => persistStatus(req, "approved")}
                            className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                          >
                            Approve Request
                          </button>
                        </div>
                      ) : (
                        <p className="mt-4 text-xs text-gray-400 italic text-right">
                          {isOwnRequest(req)
                            ? "You raised this request, so it must be approved by someone else."
                            : "Awaiting approval from the approver configured for Material Requests."}
                        </p>
                      ))}
                    {/* Approval already raised the purchase request, so there
                        is nothing to click here — only somewhere to go. */}
                    {(req.status === "approved" ||
                      req.status === "in_procurement") && (
                        <div className="flex items-center justify-end gap-3 mt-4">
                          {req.prRef ? (
                            <>
                              <span className="text-xs text-gray-500">
                                Purchase request{" "}
                                <span className="font-mono font-medium text-gray-700">
                                  {req.prRef}
                                </span>{" "}
                                was raised automatically.
                              </span>
                              <RowAction
                                icon={<ShoppingCart className="w-3.5 h-3.5" />}
                                label="Open Purchase Request"
                                tone="primary"
                                onClick={() =>
                                  navigate(
                                    `/apps/procurement/purchase-requests?pr=${encodeURIComponent(req.prRef!)}`,
                                  )
                                }
                              />
                            </>
                          ) : (
                            <RowActionNote>
                              Raising the purchase request…
                            </RowActionNote>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No requests found</p>
          </div>
        )}
      </div>

      {showNewMR && (
        <NewMRModal
          onClose={() => setShowNewMR(false)}
          onSave={async (req) => {
            // The API stores one row per material; every row of a single
            // submission shares the request's reference so the list can group
            // them back into one card after a reload.
            try {
              await Promise.all(
                req.items.map((item, index) =>
                  createMaterialRequest({
                    // reference is UNIQUE per row, so each item gets `<ref>/<n>`.
                    reference: itemReference(req.id, index),
                    materialName: item.material,
                    unit: item.unit || "unit",
                    qty: item.qty,
                    storeId: req.storeId,
                    storeName: req.storeName,
                    projectName: req.project,
                    purpose: req.justification,
                    priority: req.priority,
                    status: "pending",
                    requestedBy: req.requestedBy,
                    requestDate: new Date().toISOString(),
                    neededBy: req.neededByIso,
                    notes: item.notes || undefined,
                  }),
                ),
              );
              // Re-read so the card carries the real database ids that later
              // status changes need.
              await loadRequests();
              setShowNewMR(false);
              toast.success(`Material request ${req.id} submitted.`);
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Failed to submit the material request.",
              );
            }
          }}
        />
      )}
      {moreInfoReq && (
        <MoreInfoMRModal
          req={moreInfoReq}
          onClose={() => setMoreInfoReq(null)}
          onDone={async (question) => {
            const target = moreInfoReq;
            setMoreInfoReq(null);
            try {
              const asked = `Info requested by ${authUser.name || "approver"}: ${question}`;
              await Promise.all(
                target.apiIds.map((id) =>
                  updateMaterialRequest(id, { notes: asked }),
                ),
              );
              await loadRequests();
              toast.success(`Sent your question to ${target.requestedBy}.`);
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Could not send the information request.",
              );
            }
          }}
        />
      )}
      {rejectReq && (
        <RejectMRModal
          req={rejectReq}
          onClose={() => setRejectReq(null)}
          onDone={(_reason) => {
            void persistStatus(rejectReq, "rejected");
            setRejectReq(null);
          }}
        />
      )}
      {prToast && (
        <PRRaisedToast prId={prToast} onClose={() => setPrToast(null)} />
      )}
    </div>
  );
}
