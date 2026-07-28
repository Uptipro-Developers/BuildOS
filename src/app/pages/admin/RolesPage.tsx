import { useState, useEffect, useRef } from "react";
import {
  getAppRoles,
  getUsers,
  getProcessCatalog,
  createAppRole,
  updateAppRole,
  deleteAppRole,
} from "../../api/admin-extras";
import {
  Shield,
  Edit,
  Copy,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
} from "lucide-react";
import { Fragment } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ConfirmationModal } from "../../components/ConfirmationModal";

// ── Types ─────────────────────────────────────────────────────────────────────
type AppKey =
  | "construction"
  | "finance"
  | "hr"
  | "procurement"
  | "storefront"
  | "admin"
  | "ess";

interface ProcessDef {
  id: string;
  label: string;
  app: AppKey;
}

interface ProcessPerm {
  view: boolean;
  create: boolean;
  edit: boolean;
  approve: boolean;
  delete: boolean;
}

// Mirrors the backend process catalog (single source of truth) so role
// permissions stay linked to the actual developed modules even before the
// live catalog is fetched.
const DEFAULT_PROCESSES: ProcessDef[] = [
  // Procurement
  { id: "p_create_pr", label: "Create Purchase Request", app: "procurement" },
  { id: "p_approve_pr", label: "Approve Purchase Request", app: "procurement" },
  { id: "p_create_po", label: "Create Purchase Order", app: "procurement" },
  { id: "p_approve_po", label: "Approve Purchase Order", app: "procurement" },
  { id: "p_send_rfq", label: "Send RFQ to Supplier", app: "procurement" },
  { id: "p_goods_receipt", label: "Goods Receipt", app: "procurement" },
  { id: "p_issue_mat", label: "Issue Materials", app: "procurement" },
  {
    id: "p_supplier_compliance",
    label: "Supplier Compliance Review",
    app: "procurement",
  },
  // Finance
  { id: "p_create_exp", label: "Create Expense", app: "finance" },
  { id: "p_approve_exp", label: "Approve Expense", app: "finance" },
  { id: "p_journal_entry", label: "Post Journal Entry", app: "finance" },
  { id: "p_record_income", label: "Record Income", app: "finance" },
  { id: "p_budget_alloc", label: "Budget Allocation", app: "finance" },
  { id: "p_approve_payment", label: "Approve Payment", app: "finance" },
  { id: "p_process_claim", label: "Process Claim", app: "finance" },
  {
    id: "p_purchase_invoice",
    label: "Process Purchase Invoice",
    app: "finance",
  },
  { id: "p_bank_recon", label: "Bank Reconciliation", app: "finance" },
  // HR
  { id: "p_create_pay", label: "Create Payroll", app: "hr" },
  { id: "p_process_payroll", label: "Process Payroll", app: "hr" },
  { id: "p_approve_lv", label: "Approve Leave Request", app: "hr" },
  { id: "p_salary_advance", label: "Salary Advance", app: "hr" },
  { id: "p_employee_onboard", label: "Employee Onboarding", app: "hr" },
  { id: "p_workforce_alloc", label: "Workforce Allocation", app: "hr" },
  { id: "p_attendance_approve", label: "Approve Attendance", app: "hr" },
  { id: "p_appraisal", label: "Appraisal Review", app: "hr" },
  // ESS
  { id: "p_ess_submit_request", label: "Submit Request", app: "ess" },
  { id: "p_ess_expense_claim", label: "Expense Claim", app: "ess" },
  { id: "p_ess_leave_request", label: "Leave Request", app: "ess" },
  { id: "p_ess_log_issue", label: "Log Issue", app: "ess" },
  // Construction / Projects
  { id: "p_create_proj", label: "Create Project", app: "construction" },
  { id: "p_approve_bud", label: "Approve Project Budget", app: "construction" },
  { id: "p_assign_wf", label: "Assign Workforce", app: "construction" },
  { id: "p_daily_report", label: "Submit Daily Report", app: "construction" },
  {
    id: "p_milestone_approve",
    label: "Approve Milestone / Progress",
    app: "construction",
  },
  {
    id: "p_change_request",
    label: "Approve Change Request",
    app: "construction",
  },
  { id: "p_resolve_issue", label: "Resolve Site Issue", app: "construction" },
  { id: "p_quality_ncr", label: "Approve Quality NCR", app: "construction" },
  { id: "p_hse_incident", label: "Log HSE Incident", app: "construction" },
  { id: "p_doc_approve", label: "Approve Document", app: "construction" },
  {
    id: "p_funding_release",
    label: "Approve Funding Release",
    app: "construction",
  },
  // Storefront
  { id: "p_material_transfer", label: "Material Transfer", app: "storefront" },
  { id: "p_stock_adjust", label: "Stock Adjustment", app: "storefront" },
  { id: "p_issue_to_site", label: "Issue to Site", app: "storefront" },
  { id: "p_material_return", label: "Material Return", app: "storefront" },
  {
    id: "p_store_to_procurement",
    label: "Send for Procurement",
    app: "storefront",
  },
  // Admin
  { id: "p_gen_rpt", label: "Generate Reports", app: "admin" },
  { id: "p_manage_usr", label: "Manage Users", app: "admin" },
  { id: "p_manage_roles", label: "Manage Roles & Permissions", app: "admin" },
];

interface Role {
  id: string;
  name: string;
  description: string;
  users: number;
  isSuper?: boolean;
  permissions: Record<string, ProcessPerm>; // Layer 3 — process permissions
  appAccess: Record<AppKey, boolean>; // Layer 1 — application access
  navAccess: Record<string, boolean>; // Layer 2 — navigation item access
}

// ── App config ────────────────────────────────────────────────────────────────
const APP_COLORS: Record<AppKey, string> = {
  construction: "bg-orange-100 text-orange-700",
  finance: "bg-emerald-100 text-emerald-700",
  hr: "bg-purple-100 text-purple-700",
  procurement: "bg-blue-100 text-blue-700",
  storefront: "bg-pink-100 text-pink-700",
  admin: "bg-indigo-100 text-indigo-700",
  ess: "bg-teal-100 text-teal-700",
};
const APP_LABELS: Record<AppKey, string> = {
  construction: "Projects",
  finance: "Finance",
  hr: "HR",
  procurement: "Procurement",
  storefront: "Storefront",
  admin: "Admin",
  ess: "ESS",
};

// ── Navigation items per app (Layer 2 catalog) ────────────────────────────────
const NAV_ITEMS: Record<AppKey, { id: string; label: string }[]> = {
  construction: [
    { id: "cs_dashboard", label: "Dashboard" },
    { id: "cs_projects", label: "Projects List" },
    { id: "cs_approvals", label: "Approvals" },
    { id: "cs_tasks", label: "Tasks" },
    { id: "cs_resources", label: "Resource Planning" },
    { id: "cs_timeline", label: "Timeline Planning" },
    { id: "cs_documents", label: "Documents" },
    { id: "cs_reports", label: "Reports" },
  ],
  finance: [
    { id: "fin_dashboard", label: "Dashboard" },
    { id: "fin_expenses", label: "Expenses" },
    { id: "fin_transactions", label: "Transactions" },
    { id: "fin_budget", label: "Budget Tracking" },
  ],
  hr: [
    { id: "hr_dashboard", label: "Dashboard" },
    { id: "hr_employees", label: "Employees" },
    { id: "hr_attendance", label: "Attendance" },
    { id: "hr_leave", label: "Leave Requests" },
    { id: "hr_payroll", label: "Payroll" },
    { id: "hr_payroll_proc", label: "Payroll Processing" },
    { id: "hr_config", label: "HR Configuration" },
    { id: "hr_reports", label: "Reports" },
  ],
  procurement: [
    { id: "pro_dashboard", label: "Dashboard" },
    { id: "pro_inventory", label: "Inventory" },
    { id: "pro_purchase_req", label: "Purchase Requests" },
    { id: "pro_purchase_ord", label: "Purchase Orders" },
    { id: "pro_suppliers", label: "Suppliers" },
    { id: "pro_reports", label: "Reports" },
  ],
  storefront: [
    { id: "sto_dashboard", label: "Dashboard" },
    { id: "sto_inventory", label: "Inventory" },
    { id: "sto_materials", label: "Materials" },
    { id: "sto_requests", label: "Store Requests" },
    { id: "sto_reports", label: "Reports" },
  ],
  admin: [
    { id: "adm_users", label: "Users" },
    { id: "adm_roles", label: "Roles & Permissions" },
    { id: "adm_company", label: "Company Profile" },
    { id: "adm_audit", label: "Audit Logs" },
    { id: "adm_reports", label: "Report Builder" },
  ],
  ess: [
    { id: "ess_dashboard", label: "Dashboard" },
    { id: "ess_requests", label: "My Requests" },
    { id: "ess_submit", label: "Submit Request" },
    { id: "ess_projects", label: "My Projects" },
    { id: "ess_tasks", label: "My Tasks" },
    { id: "ess_profile", label: "My Profile" },
  ],
};

function navPartial(items: string[]): Record<string, boolean> {
  return Object.fromEntries(
    Object.values(NAV_ITEMS)
      .flat()
      .map((n) => [n.id, items.includes(n.id)]),
  );
}

function toRoleProcessDefs(
  input: Array<{ id: string; label: string; app: string }>,
): ProcessDef[] {
  const allowedApps = new Set<AppKey>([
    "construction",
    "finance",
    "hr",
    "procurement",
    "storefront",
    "admin",
    "ess",
  ]);

  return input
    .map((item) => ({
      id: String(item.id),
      label: String(item.label),
      app: String(item.app).toLowerCase() as AppKey,
    }))
    .filter((item) => allowedApps.has(item.app));
}

function mergeProcessCatalog(fetched: ProcessDef[]): ProcessDef[] {
  const byId = new Map<string, ProcessDef>();
  DEFAULT_PROCESSES.forEach((item) => byId.set(item.id, item));
  fetched.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values());
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const PERM_KEYS: Array<keyof ProcessPerm> = [
  "view",
  "create",
  "edit",
  "approve",
  "delete",
];
const PERM_SHORT: Record<keyof ProcessPerm, string> = {
  view: "V",
  create: "C",
  edit: "E",
  approve: "A",
  delete: "D",
};

function emptyPerm(): ProcessPerm {
  return {
    view: false,
    create: false,
    edit: false,
    approve: false,
    delete: false,
  };
}

// ── AddRoleModal ──────────────────────────────────────────────────────────────
function AddRoleModal({
  onAdd,
  onClose,
}: {
  onAdd: (data: { name: string; description: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Role name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onAdd({ name: name.trim(), description: desc.trim() });
      toast.success("Role created successfully.");
      onClose();
    } catch (err: any) {
      const message = err?.message || "Failed to create role.";
      if (message.toLowerCase().includes("already exists")) {
        setError("Role with this name already exists.");
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Create New Role
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Role Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Site Supervisor"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              placeholder="Brief role description…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create Role"}
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function EditRoleModal({
  role,
  onSave,
  onClose,
}: {
  role: Role;
  onSave: (data: { name: string; description: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(role.name);
  const [desc, setDesc] = useState(role.description);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Role name is required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave({ name: name.trim(), description: desc.trim() });
      onClose();
    } catch (err: any) {
      const message = err?.message || "Failed to update role.";
      if (message.includes("409") || message.includes("already exists")) {
        setError("Role with this name already exists.");
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Edit Role</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Role Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function RolesPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleUserCounts, setRoleUserCounts] = useState<Record<string, number>>(
    {},
  );
  const [roleStatus, setRoleStatus] = useState<
    Record<string, "saving" | "saved" | "error">
  >({});
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const roleSaveQueueRef = useRef<Record<string, Promise<void>>>({});
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const rolePayload = (role: Role) => ({
    name: role.name,
    description: role.description,
    isSuper: !!role.isSuper,
    permissions: {
      processPermissions: role.permissions,
      appAccess: role.appAccess,
      navAccess: role.navAccess,
    },
  });

  const normalizeRoleKey = (value: string) => value.trim().toLowerCase();

  useEffect(() => {
    Promise.all([getAppRoles(), getUsers()])
      .then(([apiRoles, users]) => {
        const counts = users.reduce<Record<string, number>>((acc, user) => {
          const key = normalizeRoleKey(String(user.role ?? ""));
          if (!key) return acc;
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {});

        setRoleUserCounts(counts);
        setRoles(
          apiRoles.map((r) => {
            const persisted =
              r.permissions &&
              typeof r.permissions === "object" &&
              !Array.isArray(r.permissions)
                ? (r.permissions as {
                    processPermissions?: Record<string, ProcessPerm>;
                    appAccess?: Record<AppKey, boolean>;
                    navAccess?: Record<string, boolean>;
                  })
                : {};

            return {
              id: r.id,
              name: r.name,
              description: r.description ?? "",
              users: counts[normalizeRoleKey(r.name)] ?? 0,
              isSuper: Boolean(
                r.isSuper ??
                r.isSystem ??
                String(r.name ?? "")
                  .trim()
                  .toLowerCase() === "admin",
              ),
              permissions: persisted.processPermissions ?? {},
              appAccess: {
                construction: false,
                finance: false,
                hr: false,
                procurement: false,
                storefront: false,
                admin: Boolean(r.isSuper ?? r.isSystem),
                ess: false,
                ...(persisted.appAccess ?? {}),
              },
              navAccess: persisted.navAccess ?? {},
            } as Role;
          }),
        );
      })
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : "Failed to load roles.";
        toast.error(message);
      });
  }, []);
  const [processes, setProcesses] = useState<ProcessDef[]>(DEFAULT_PROCESSES);
  const [processesLoading, setProcessesLoading] = useState(true);

  useEffect(() => {
    getProcessCatalog()
      .then((items) => {
        const fetched = toRoleProcessDefs(items);
        setProcesses(
          fetched.length > 0 ? mergeProcessCatalog(fetched) : DEFAULT_PROCESSES,
        );
      })
      .catch(() => setProcesses(DEFAULT_PROCESSES))
      .finally(() => setProcessesLoading(false));
  }, []);

  const [showAddRole, setShowAddRole] = useState(false);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [expandedRoleTab, setExpandedRoleTab] = useState<
    Record<string, "app" | "nav">
  >({});

  // Group shown processes by app
  const processesByApp = (
    Array.from(new Set(processes.map((p) => p.app))) as AppKey[]
  ).map((app) => ({
    app,
    items: processes.filter((p) => p.app === app),
  }));

  const updateAndPersistRole = (
    roleId: string,
    transform: (role: Role) => Role,
  ) => {
    let nextRole: Role | null = null;
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== roleId) return r;
        nextRole = transform(r);
        return nextRole;
      }),
    );
    if (nextRole) {
      setRoleStatus((s) => ({ ...s, [roleId]: "saving" }));

      const queuedSave = (roleSaveQueueRef.current[roleId] ?? Promise.resolve())
        .catch(() => {
          // Continue the queue even if a previous request failed.
        })
        .then(() =>
          updateAppRole((nextRole as Role).id, rolePayload(nextRole as Role)),
        )
        .then(() => {
          setRoleStatus((s) => ({ ...s, [roleId]: "saved" }));
          setTimeout(
            () =>
              setRoleStatus((s) => {
                const copy = { ...s };
                delete copy[roleId];
                return copy;
              }),
            2000,
          );
        })
        .catch(() => {
          setRoleStatus((s) => ({ ...s, [roleId]: "error" }));
          throw new Error("Failed to persist role updates");
        });

      roleSaveQueueRef.current[roleId] = queuedSave;
    }
  };

  const togglePerm = (
    roleId: string,
    procId: string,
    key: keyof ProcessPerm,
  ) => {
    updateAndPersistRole(roleId, (r) => ({
      ...r,
      permissions: {
        ...r.permissions,
        [procId]: {
          ...r.permissions[procId],
          [key]: !r.permissions[procId]?.[key],
        },
      },
    }));
  };

  const toggleAppAccess = (roleId: string, app: AppKey) => {
    updateAndPersistRole(roleId, (r) => ({
      ...r,
      appAccess: { ...r.appAccess, [app]: !r.appAccess[app] },
    }));
  };

  const toggleNavAccess = (roleId: string, navId: string) => {
    updateAndPersistRole(roleId, (r) => ({
      ...r,
      navAccess: { ...r.navAccess, [navId]: !r.navAccess[navId] },
    }));
  };

  const duplicateRole = async (role: Role) => {
    const actionId = `duplicate-${role.id}`;
    setActionLoading((prev) => new Set(prev).add(actionId));
    const permissions = { ...role.permissions };
    const appAccess = { ...role.appAccess };
    const navAccess = { ...role.navAccess };
    try {
      const created = await createAppRole({
        name: `${role.name} (Copy)`,
        description: role.description,
        isSuper: false,
        permissions: {
          processPermissions: permissions,
          appAccess,
          navAccess,
        },
      });
      setRoles((prev) => [
        ...prev,
        {
          id: created.id,
          name: created.name,
          description: created.description ?? "",
          users: 0,
          isSuper: false,
          permissions,
          appAccess,
          navAccess,
        },
      ]);
      toast.success("Role duplicated successfully.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to duplicate role.");
    } finally {
      setActionLoading((prev) => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
  };

  const deleteRole = async (roleId: string) => {
    const actionId = `delete-${roleId}`;
    setActionLoading((prev) => new Set(prev).add(actionId));
    const previous = roles;
    setRoles((prev) => prev.filter((r) => r.id !== roleId));
    try {
      await deleteAppRole(roleId);
      toast.success("Role deleted successfully.");
    } catch (err: any) {
      setRoles(previous);
      toast.error(err?.message || "Failed to delete role.");
    } finally {
      setActionLoading((prev) => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
  };

  const requestDeleteRole = (role: Role) => {
    setRoleToDelete(role);
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;
    await deleteRole(roleToDelete.id);
    setRoleToDelete(null);
  };

  const saveRoleMeta = async (
    roleId: string,
    data: { name: string; description: string },
  ) => {
    const original = roles.find((r) => r.id === roleId);
    if (!original) return;

    const nextRole: Role = {
      ...original,
      name: data.name,
      description: data.description,
    };

    setRoles((prev) => prev.map((r) => (r.id === roleId ? nextRole : r)));
    setRoleStatus((s) => ({ ...s, [roleId]: "saving" }));

    try {
      await updateAppRole(roleId, rolePayload(nextRole));
      setRoleStatus((s) => ({ ...s, [roleId]: "saved" }));
      setTimeout(
        () =>
          setRoleStatus((s) => {
            const copy = { ...s };
            delete copy[roleId];
            return copy;
          }),
        2000,
      );
    } catch {
      setRoles((prev) => prev.map((r) => (r.id === roleId ? original : r)));
      setRoleStatus((s) => ({ ...s, [roleId]: "error" }));
      throw new Error("Failed to update role");
    }
  };

  const saveRolePermissions = async (roleId: string) => {
    const current = roles.find((r) => r.id === roleId);
    if (!current) return;

    setRoleStatus((s) => ({ ...s, [roleId]: "saving" }));
    try {
      await updateAppRole(roleId, rolePayload(current));
      setRoleStatus((s) => ({ ...s, [roleId]: "saved" }));
      setTimeout(
        () =>
          setRoleStatus((s) => {
            const copy = { ...s };
            delete copy[roleId];
            return copy;
          }),
        2000,
      );
    } catch {
      setRoleStatus((s) => ({ ...s, [roleId]: "error" }));
      toast.error("Failed to save role permissions.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Roles & Permissions
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Process-based permission matrix — rows are roles, columns are
            processes
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddRole(true)}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Shield className="w-4 h-4" />
            New Role
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
        {PERM_KEYS.map((k) => (
          <span key={k} className="flex items-center gap-1">
            <span className="w-5 h-5 rounded bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
              {PERM_SHORT[k]}
            </span>
            {k.charAt(0).toUpperCase() + k.slice(1)}
          </span>
        ))}
        <span className="ml-2 text-gray-400">
          Click any cell to toggle permission
        </span>
      </div>

      {/* Matrix — horizontally scrollable */}
      {processesLoading && (
        <p className="text-sm text-gray-500">Loading process catalog...</p>
      )}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              {/* Row 1: App group headers */}
              <tr className="bg-gray-50 border-b border-gray-200">
                <th
                  rowSpan={3}
                  className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 min-w-[160px] w-[180px] align-bottom"
                >
                  Role
                </th>
                {processesByApp.map(({ app, items }) => (
                  <th
                    key={app}
                    colSpan={items.length * PERM_KEYS.length}
                    className={`px-3 py-2 text-center text-xs font-semibold border-r border-gray-200 ${APP_COLORS[app]}`}
                  >
                    {APP_LABELS[app]}
                  </th>
                ))}
              </tr>
              {/* Row 2: Process name headers */}
              <tr className="bg-gray-50 border-b border-gray-100">
                {processes.map((proc, pi) => (
                  <th
                    key={proc.id}
                    colSpan={PERM_KEYS.length}
                    className={`px-2 py-1.5 text-center text-xs font-medium text-gray-600 whitespace-nowrap group ${
                      pi < processes.length - 1
                        ? "border-r border-gray-200"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-1 justify-center">
                      <span
                        className="truncate max-w-[110px]"
                        title={proc.label}
                      >
                        {proc.label}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
              {/* Row 3: V / C / E / A / D sub-headers */}
              <tr className="bg-gray-50 border-b border-gray-200">
                {processes.map((proc, pi) =>
                  PERM_KEYS.map((k, ki) => (
                    <th
                      key={`${proc.id}_${k}`}
                      className={`w-7 py-1.5 text-center text-[10px] font-semibold text-gray-400 uppercase ${
                        ki === PERM_KEYS.length - 1 && pi < processes.length - 1
                          ? "border-r border-gray-200"
                          : ""
                      }`}
                      title={k}
                    >
                      {PERM_SHORT[k]}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roles.map((role) => (
                <Fragment key={role.id}>
                  <tr key={role.id} className="hover:bg-gray-50/70 group">
                    {/* Role name cell — sticky */}
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/70 border-r border-gray-200 px-4 py-3 min-w-[160px] w-[180px]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            onClick={() =>
                              setExpandedRoleId(
                                expandedRoleId === role.id ? null : role.id,
                              )
                            }
                            className="text-gray-400 hover:text-gray-600 shrink-0"
                          >
                            {expandedRoleId === role.id ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {role.name}
                              </span>
                              {role.isSuper && (
                                <span className="text-xs bg-indigo-100 text-indigo-700 px-1 rounded font-medium shrink-0">
                                  Super
                                </span>
                              )}
                              {roleStatus[role.id] === "saving" && (
                                <span className="text-[10px] text-gray-400 shrink-0">
                                  saving…
                                </span>
                              )}
                              {roleStatus[role.id] === "saved" && (
                                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                              )}
                              {roleStatus[role.id] === "error" && (
                                <span className="text-[10px] text-red-500 shrink-0 flex items-center gap-0.5">
                                  <XCircle className="w-3 h-3" /> Save failed
                                </span>
                              )}
                            </div>
                            <span className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                              <Users className="w-3 h-3" />
                              {roleUserCounts[normalizeRoleKey(role.name)] ?? 0}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => setEditingRole(role)}
                            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => void duplicateRole(role)}
                            disabled={actionLoading.has(`duplicate-${role.id}`)}
                            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {!role.isSuper &&
                            (roleUserCounts[normalizeRoleKey(role.name)] ??
                              0) === 0 && (
                              <button
                                onClick={() => requestDeleteRole(role)}
                                disabled={actionLoading.has(
                                  `delete-${role.id}`,
                                )}
                                className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                        </div>
                      </div>
                    </td>

                    {/* Permission cells — one td per perm key per process */}
                    {processes.map((proc, pi) =>
                      PERM_KEYS.map((k, ki) => {
                        const val = role.isSuper
                          ? true
                          : (role.permissions[proc.id]?.[k] ?? false);
                        return (
                          <td
                            key={`${proc.id}_${k}`}
                            className={`py-3 text-center ${
                              ki === PERM_KEYS.length - 1 &&
                              pi < processes.length - 1
                                ? "border-r border-gray-100"
                                : ""
                            }`}
                          >
                            <button
                              onClick={() =>
                                !role.isSuper && togglePerm(role.id, proc.id, k)
                              }
                              disabled={role.isSuper}
                              title={`${k} — ${proc.label}`}
                              className={`w-6 h-6 rounded text-[10px] font-bold transition-colors mx-auto flex items-center justify-center ${
                                val
                                  ? "bg-indigo-600 text-white"
                                  : "bg-gray-100 text-gray-300 hover:bg-gray-200"
                              } ${role.isSuper ? "cursor-not-allowed" : "cursor-pointer"}`}
                            >
                              {PERM_SHORT[k]}
                            </button>
                          </td>
                        );
                      }),
                    )}
                  </tr>

                  {/* Expanded role config moved out of the matrix — it now
                      renders in a full-width panel below so Layer 1 (App
                      Access) and Layer 2 (Navigation) stay on one page,
                      unaffected by the matrix's horizontal scroll. */}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded role config — rendered outside the horizontally-scrolling
          matrix so Layer 1 (App Access) and Layer 2 (Navigation) always show
          on a single page, unaffected by the matrix's horizontal scroll. */}
      {expandedRoleId &&
        roles
          .filter((r) => r.id === expandedRoleId)
          .map((role) => (
            <div
              key={role.id}
              className="mt-4 bg-white rounded-xl border border-indigo-100 shadow-sm"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-indigo-100 bg-indigo-50/40 rounded-t-xl">
                <div className="flex items-center gap-2 min-w-0">
                  <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {role.name}
                    </p>
                    {role.description && (
                      <p className="text-xs text-gray-500 italic truncate">
                        {role.description}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setExpandedRoleId(null)}
                  className="p-1.5 rounded-lg hover:bg-white/70 text-gray-400 shrink-0"
                  aria-label="Collapse role configuration"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 py-4">
                {/* Layer tabs */}
                <div className="flex flex-wrap items-center gap-1 mb-4 border-b border-indigo-100">
                  {(["app", "nav"] as const).map((tabKey) => (
                    <button
                      key={tabKey}
                      onClick={() =>
                        setExpandedRoleTab((t) => ({
                          ...t,
                          [role.id]: tabKey,
                        }))
                      }
                      className={`px-3 py-1.5 text-xs font-medium rounded-t border-b-2 -mb-px transition-colors ${
                        (expandedRoleTab[role.id] ?? "app") === tabKey
                          ? "border-indigo-600 text-indigo-700 bg-white"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tabKey === "app"
                        ? "Layer 1 — App Access"
                        : "Layer 2 — Navigation"}
                    </button>
                  ))}
                  <span className="px-3 py-1.5 text-xs text-gray-400 ml-auto italic">
                    Layer 3 — Process Permissions visible in matrix above
                  </span>
                  <button
                    onClick={() => void saveRolePermissions(role.id)}
                    disabled={roleStatus[role.id] === "saving"}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {roleStatus[role.id] === "saving"
                      ? "Saving…"
                      : "Save Modifications"}
                  </button>
                </div>

                {/* Layer 1: Application Access */}
                {(expandedRoleTab[role.id] ?? "app") === "app" && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {(Object.keys(APP_LABELS) as AppKey[]).map((app) => {
                      const granted = role.isSuper
                        ? true
                        : role.appAccess[app];
                      return (
                        <button
                          key={app}
                          onClick={() =>
                            !role.isSuper && toggleAppAccess(role.id, app)
                          }
                          disabled={role.isSuper}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-center transition-colors ${
                            granted
                              ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                              : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                          } ${role.isSuper ? "cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${APP_COLORS[app]}`}
                          >
                            {APP_LABELS[app]}
                          </span>
                          <span className="text-xs">
                            {granted ? "✓ Access" : "No Access"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Layer 2: Navigation Access */}
                {(expandedRoleTab[role.id] ?? "app") === "nav" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(Object.keys(NAV_ITEMS) as AppKey[])
                      .filter((app) => role.isSuper || role.appAccess[app])
                      .map((app) => (
                        <div key={app} className="space-y-1.5">
                          <p
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block ${APP_COLORS[app]}`}
                          >
                            {APP_LABELS[app]}
                          </p>
                          <div className="space-y-1">
                            {NAV_ITEMS[app].map((item) => {
                              const granted = role.isSuper
                                ? true
                                : (role.navAccess[item.id] ?? false);
                              return (
                                <label
                                  key={item.id}
                                  className={`flex items-center gap-2 text-xs cursor-pointer ${role.isSuper ? "cursor-not-allowed" : ""}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={granted}
                                    onChange={() =>
                                      !role.isSuper &&
                                      toggleNavAccess(role.id, item.id)
                                    }
                                    disabled={role.isSuper}
                                    className="rounded accent-indigo-600 w-3 h-3"
                                  />
                                  <span
                                    className={
                                      granted ? "text-gray-700" : "text-gray-400"
                                    }
                                  >
                                    {item.label}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    {(Object.keys(NAV_ITEMS) as AppKey[]).filter(
                      (app) => !role.isSuper && !role.appAccess[app],
                    ).length > 0 && (
                      <div className="col-span-full text-xs text-gray-400 italic">
                        {(Object.keys(NAV_ITEMS) as AppKey[])
                          .filter((app) => !role.isSuper && !role.appAccess[app])
                          .map((a) => APP_LABELS[a])
                          .join(", ")}{" "}
                        app(s) not accessible — grant app access in Layer 1
                        first.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

      {processes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center bg-white rounded-xl border border-dashed border-gray-300">
          <AlertCircle className="w-8 h-8 text-gray-300" />
          <p className="text-sm text-gray-500">
            No processes configured yet for role permissions.
          </p>
          <button
            onClick={() => navigate("/apps/admin/project-config")}
            className="text-sm text-indigo-600 font-medium hover:underline"
          >
            Go to Process Configuration
          </button>
        </div>
      )}

      {/* Modals */}
      {showAddRole && (
        <AddRoleModal
          onAdd={async ({ name, description }) => {
            if (
              roles.some(
                (r) =>
                  r.name.trim().toLowerCase() === name.trim().toLowerCase(),
              )
            ) {
              throw new Error(`Role with name '${name.trim()}' already exists`);
            }

            const appAccess = {
              construction: false,
              finance: false,
              hr: false,
              procurement: false,
              storefront: false,
              admin: false,
              ess: true,
            };
            const permissions = Object.fromEntries(
              processes.map((p) => [p.id, emptyPerm()]),
            );
            const navAccess = navPartial([
              "ess_dashboard",
              "ess_requests",
              "ess_submit",
              "ess_profile",
            ]);

            const created = await createAppRole({
              name,
              description,
              isSuper: false,
              permissions: {
                processPermissions: permissions,
                appAccess,
                navAccess,
              },
            });
            setRoles((prev) => [
              ...prev,
              {
                id: created.id,
                name: created.name,
                description: created.description ?? "",
                users: 0,
                isSuper: Boolean(created.isSuper ?? created.isSystem),
                permissions,
                appAccess,
                navAccess,
              },
            ]);
          }}
          onClose={() => setShowAddRole(false)}
        />
      )}
      {editingRole && (
        <EditRoleModal
          role={editingRole}
          onSave={(data) => saveRoleMeta(editingRole.id, data)}
          onClose={() => setEditingRole(null)}
        />
      )}
      <ConfirmationModal
        isOpen={Boolean(roleToDelete)}
        title="Delete Role?"
        description={
          roleToDelete
            ? `Are you sure you want to delete "${roleToDelete.name}"? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDangerous
        isLoading={
          roleToDelete ? actionLoading.has(`delete-${roleToDelete.id}`) : false
        }
        onConfirm={confirmDeleteRole}
        onCancel={() => setRoleToDelete(null)}
      />
    </div>
  );
}
