import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Save, ShieldCheck, Package } from "lucide-react";
import { toast } from "sonner";
import { NumberingConfigPanel } from "../../components/NumberingConfigPanel";
import {
  getProcessCatalog,
  getProcessWorkflows,
  createProcessWorkflow,
  updateProcessWorkflow,
  getStoreThresholds,
  updateStoreThresholds,
  getUsers,
  type ProcessCatalogItem,
  type ProcessWorkflow,
  type StoreThresholdRecord,
} from "../../api/admin-extras";

const TABS = ["numbering", "thresholds", "approvals"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  numbering: "Numbering",
  thresholds: "Thresholds",
  approvals: "Approvals",
};

/**
 * Approver configuration for the Procurement processes.
 *
 * Writes the same `ProcessWorkflow` records Admin › Workflow Approval writes, so
 * an approver set here is the one `findMyApprovalProcesses` matches against and
 * the one whose queue a request lands in — rather than a second, parallel
 * configuration that nothing enforces.
 */
function ApprovalsPanel() {
  const [processes, setProcesses] = useState<ProcessCatalogItem[]>([]);
  const [workflows, setWorkflows] = useState<ProcessWorkflow[]>([]);
  const [people, setPeople] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getProcessCatalog(), getProcessWorkflows(), getUsers()])
      .then(([catalog, flows, users]) => {
        setProcesses(
          catalog.filter(
            (p) =>
              String(p.app ?? "").toLowerCase() === "procurement" &&
              (p.actions?.includes("approve") ?? true),
          ),
        );
        setWorkflows(flows);
        setPeople(
          users
            .map((u: any) => String(u.name ?? u.email ?? "").trim())
            .filter(Boolean),
        );
      })
      .catch(() =>
        toast.error("Could not load the approval configuration."),
      )
      .finally(() => setLoading(false));
  }, []);

  const approverFor = (processId: string) =>
    workflows.find((w) => w.processId === processId)?.approver ?? "";

  async function setApprover(proc: ProcessCatalogItem, approver: string) {
    setSavingId(proc.id);
    const existing = workflows.find((w) => w.processId === proc.id);
    try {
      if (existing) {
        const updated = await updateProcessWorkflow(existing.id, {
          approver,
          workflowType: "single",
        });
        setWorkflows((prev) =>
          prev.map((w) => (w.id === existing.id ? updated : w)),
        );
      } else {
        const created = await createProcessWorkflow({
          processId: proc.id,
          process: proc.label,
          app: "procurement",
          workflowType: "single",
          approver,
        });
        setWorkflows((prev) => [...prev, created]);
      }
      toast.success(`Approver updated for ${proc.label}.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save the approver.",
      );
    } finally {
      setSavingId(null);
    }
  }

  if (loading)
    return <div className="p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900">
            Procurement Approvals
          </h2>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Who approves each Procurement process. A process with no approver falls
          back to any role granted approve rights for it.
        </p>
      </div>
      {processes.length === 0 ? (
        <p className="px-5 py-8 text-sm text-gray-400 text-center">
          No approvable Procurement processes are defined.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-2.5 font-medium">Process</th>
              <th className="text-left px-5 py-2.5 font-medium">Approver</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {processes.map((proc) => (
              <tr key={proc.id}>
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-900">{proc.label}</p>
                  {proc.description && (
                    <p className="text-xs text-gray-500">{proc.description}</p>
                  )}
                </td>
                <td className="px-5 py-3">
                  <select
                    value={approverFor(proc.id)}
                    disabled={savingId === proc.id}
                    onChange={(e) => setApprover(proc, e.target.value)}
                    className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  >
                    <option value="">No approver configured</option>
                    {people.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/**
 * The stock thresholds that drive replenishment. Procurement acts on these, so
 * they are editable here as well as in Storefront settings; both write the same
 * `storeThresholds` record.
 */
function ThresholdsPanel() {
  const [rows, setRows] = useState<StoreThresholdRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getStoreThresholds()
      .then(setRows)
      .catch(() => toast.error("Could not load stock thresholds."))
      .finally(() => setLoading(false));
  }, []);

  function edit(id: string, key: "lowStockQty" | "outOfStockQty", value: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, [key]: Number(value) || 0 } : r,
      ),
    );
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await updateStoreThresholds(rows);
      setRows(updated);
      toast.success("Stock thresholds saved.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save thresholds.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return <div className="p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">
              Stock Thresholds
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            The levels at which a store is treated as low or out of stock.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving || rows.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-sm text-gray-400 text-center">
          No stores have thresholds configured yet.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-2.5 font-medium">Store</th>
              <th className="text-left px-5 py-2.5 font-medium">Type</th>
              <th className="text-left px-5 py-2.5 font-medium">Low Stock</th>
              <th className="text-left px-5 py-2.5 font-medium">Out of Stock</th>
              <th className="text-left px-5 py-2.5 font-medium">Unit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-5 py-3 font-medium text-gray-900">
                  {r.storeName}
                </td>
                <td className="px-5 py-3 text-gray-500">{r.storeType}</td>
                <td className="px-5 py-3">
                  <input
                    type="number"
                    value={r.lowStockQty}
                    onChange={(e) => edit(r.id, "lowStockQty", e.target.value)}
                    className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="px-5 py-3">
                  <input
                    type="number"
                    value={r.outOfStockQty}
                    onChange={(e) =>
                      edit(r.id, "outOfStockQty", e.target.value)
                    }
                    className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="px-5 py-3 text-gray-500">{r.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function ProcurementConfigPage() {
  const [tab, setTab] = useState<Tab>("numbering");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SettingsIcon className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">
              Procurement Settings
            </h1>
          </div>
          <p className="text-sm text-gray-500">
            Module-specific configuration for the Procurement module. Access is
            permission-controlled.
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* The numbering panel selects sequences by the `app` they belong to.
          An earlier version filtered on `cfg.module.startsWith("Procurement")`,
          and no module is named that way — the sequences are MaterialRequest,
          PurchaseOrder, PurchaseRequest, RFQ, Quote, PurchaseInvoice and
          GoodsReceipt — so the list rendered empty. */}
      {tab === "numbering" && (
        <NumberingConfigPanel app="procurement" accent="blue" />
      )}
      {tab === "thresholds" && <ThresholdsPanel />}
      {tab === "approvals" && <ApprovalsPanel />}
    </div>
  );
}
