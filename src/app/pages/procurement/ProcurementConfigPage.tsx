import { useEffect, useState } from "react";
import {
  Settings as SettingsIcon,
  Save,
  ShieldCheck,
  Package,
  Users as UsersIcon,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { NumberingConfigPanel } from "../../components/NumberingConfigPanel";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import {
  getProcessCatalog,
  getProcessWorkflows,
  createProcessWorkflow,
  updateProcessWorkflow,
  getStoreThresholds,
  updateStoreThresholds,
  getUsers,
  getUsersByDeptRole,
  getAppRoles,
  type ProcessCatalogItem,
  type ProcessWorkflow,
  type StoreThresholdRecord,
  type AppUser,
  type AppRole,
} from "../../api/admin-extras";
import { getReferenceData } from "../../api/reference-data";
import {
  getSignatories,
  createSignatory,
  updateSignatory,
  deleteSignatory,
  type Signatory,
} from "../../api/signatories";

// Order follows the design: Numbering, Signatories, Approvals, Thresholds.
const TABS = ["numbering", "signatories", "approvals", "thresholds"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  numbering: "Numbering",
  signatories: "Signatories",
  thresholds: "Thresholds",
  approvals: "Approvals",
};

/**
 * Add/edit a PO signatory.
 *
 * Department and Role are picked first because the Name list depends on
 * them: a user only appears once their own `department` and `role` columns
 * match both selections. Changing either after a name is chosen clears it,
 * rather than silently keeping a name that no longer matches the filter.
 */
function SignatoryModal({
  initial,
  departments,
  roles,
  onClose,
  onSave,
}: {
  initial?: Signatory;
  departments: { id: string; name: string }[];
  roles: AppRole[];
  onClose: () => void;
  onSave: (data: { department: string; role: string; userId: string }) => Promise<void>;
}) {
  const [department, setDepartment] = useState(initial?.department ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [userId, setUserId] = useState(initial?.userId ?? "");
  const [saving, setSaving] = useState(false);

  // The Name list only exists once both picks are made — fetched then, and
  // only then, scoped server-side to that exact department + role rather
  // than pulling every user in the company on open.
  const [matchingUsers, setMatchingUsers] = useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(false);

  useEffect(() => {
    if (!department || !role) {
      setMatchingUsers([]);
      return;
    }
    let cancelled = false;
    setUsersLoading(true);
    setUsersError(false);
    getUsersByDeptRole(department, role)
      .then((list) => {
        if (!cancelled) setMatchingUsers(list);
      })
      .catch(() => {
        if (!cancelled) {
          setUsersError(true);
          setMatchingUsers([]);
        }
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [department, role]);

  function pickDepartment(next: string) {
    setDepartment(next);
    setUserId("");
  }

  function pickRole(next: string) {
    setRole(next);
    setUserId("");
  }

  const valid = !!department && !!role && !!userId;

  async function handleSave() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSave({ department, role, userId });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {initial ? "Edit Signatory" : "New Signatory"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              value={department}
              onChange={(e) => pickDepartment(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a department…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => pickRole(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a role…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={!department || !role || usersLoading}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">
                {!department || !role
                  ? "Pick a department and role first…"
                  : usersLoading
                    ? "Loading people…"
                    : usersError
                      ? "Could not load people for this department and role"
                      : matchingUsers.length === 0
                        ? "No user matches this department and role"
                        : "Select a person…"}
              </option>
              {matchingUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
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
            disabled={!valid || saving}
            className="px-4 py-2 text-sm bg-purple-700 text-white rounded-xl hover:bg-purple-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save Signatory"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * PO signatories: who is authorised to sign a Purchase Order.
 *
 * Kept as its own table (department/role captured at add-time, a real
 * `userId` FK) rather than the free-text name list the create-PO wizard
 * ships with today — Settings is where that list should actually be
 * managed.
 *
 * `getAppRoles`/`getUsersByDeptRole` are Admin-only endpoints
 * (`@Roles('admin')`), so the Role and Name selects in Add Signatory need an
 * admin account even though this page sits under Procurement; Department
 * (`getReferenceData`) does not. Each list loads independently rather than
 * through one `Promise.all` — a non-admin's Roles 403 must not also blank
 * out the signatories table and department list that loaded fine on their
 * own.
 */
function SignatoriesPanel() {
  const [rows, setRows] = useState<Signatory[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [rolesError, setRolesError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Signatory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Signatory | null>(null);

  // Independent, not Promise.all: Roles is Admin-only (@Roles('admin')) and
  // can 403 for a non-admin signed-in user, but that must not also blank out
  // the signatories table and the (unguarded) department list that loaded
  // fine on their own.
  useEffect(() => {
    getSignatories()
      .then(setRows)
      .catch(() => toast.error("Could not load signatories."))
      .finally(() => setLoading(false));
    getReferenceData()
      .then((ref) => setDepartments(ref.departments))
      .catch(() => toast.error("Could not load departments."));
    getAppRoles()
      .then(setRoles)
      .catch(() => setRolesError(true));
  }, []);

  async function handleSave(data: { department: string; role: string; userId: string }) {
    try {
      if (editing) {
        const updated = await updateSignatory(editing.id, data);
        setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        toast.success("Signatory updated.");
      } else {
        const created = await createSignatory(data);
        setRows((prev) => [...prev, created]);
        toast.success("Signatory added.");
      }
      setShowModal(false);
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save the signatory.");
    }
  }

  async function handleDelete() {
    const target = deleteTarget;
    if (!target) return;
    setDeleteTarget(null);
    try {
      await deleteSignatory(target.id);
      setRows((prev) => prev.filter((r) => r.id !== target.id));
      toast.success("Signatory removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove the signatory.");
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">PO Signatories</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            People authorised to sign a Purchase Order.
          </p>
          {rolesError && (
            <p className="text-xs text-amber-600 mt-1">
              Roles could not be loaded — Add Signatory needs an admin account.
            </p>
          )}
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-700 text-white rounded-xl hover:bg-purple-800"
        >
          <Plus className="w-4 h-4" /> Add Signatory
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-sm text-gray-400 text-center">
          No signatories configured yet.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-2.5 font-medium">ID</th>
              <th className="text-left px-5 py-2.5 font-medium">Department</th>
              <th className="text-left px-5 py-2.5 font-medium">Role</th>
              <th className="text-left px-5 py-2.5 font-medium">User</th>
              <th className="text-right px-5 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-5 py-3 font-mono text-xs text-gray-400">{r.id}</td>
                <td className="px-5 py-3 text-gray-700">{r.department}</td>
                <td className="px-5 py-3 text-gray-700">{r.role}</td>
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-900">{r.user?.name ?? "—"}</p>
                  {r.user?.email && <p className="text-xs text-gray-400">{r.user.email}</p>}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => {
                        setEditing(r);
                        setShowModal(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(r)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <SignatoryModal
          initial={editing ?? undefined}
          departments={departments}
          roles={roles}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title="Remove signatory"
        description={
          deleteTarget
            ? `Remove ${deleteTarget.user?.name ?? "this person"} as a PO signatory?`
            : ""
        }
        confirmLabel="Remove"
        isDangerous
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

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
      {tab === "signatories" && <SignatoriesPanel />}
      {tab === "thresholds" && <ThresholdsPanel />}
      {tab === "approvals" && <ApprovalsPanel />}
    </div>
  );
}
