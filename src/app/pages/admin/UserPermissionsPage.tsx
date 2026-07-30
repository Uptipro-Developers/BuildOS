import { useState, useEffect } from "react";
import {
  getProcessCatalog,
  getUserPermissions,
  getUsers,
  setUserPermissions,
  type EffectivePermissions,
  type PermissionAction,
  type ProcessCatalogItem,
} from "../../api/admin-extras";
import { toast } from "sonner";
import {
  Search,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Save,
  PenLine,
  X,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type AppKey =
  | "construction"
  | "finance"
  | "hr"
  | "procurement"
  | "storefront"
  | "admin"
  | "ess";
type OverrideState = "inherit" | "allow" | "deny";

interface ProcessDef {
  id: string;
  label: string;
  app: AppKey;
}
interface ProcessOverride {
  view: OverrideState;
  create: OverrideState;
  edit: OverrideState;
  approve: OverrideState;
  delete: OverrideState;
}
interface RoleBasePerm {
  view: boolean;
  create: boolean;
  edit: boolean;
  approve: boolean;
  delete: boolean;
}
interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedApps: AppKey[];
  overrides: Record<string, ProcessOverride>;
  rolePerms: Record<string, RoleBasePerm>;
}

// ── App config ─────────────────────────────────────────────────────────────────
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

// ── Process catalog ────────────────────────────────────────────────────────────
// The process catalog is fetched from /admin/process-catalog — the same source
// Process Configuration uses — so this matrix always matches it. It used to be a
// hardcoded list here that had drifted out of step with the configured processes.

// ── Builder helpers ────────────────────────────────────────────────────────────
const defOverride = (): ProcessOverride => ({
  view: "inherit",
  create: "inherit",
  edit: "inherit",
  approve: "inherit",
  delete: "inherit",
});

// Default role base permissions config
// Role and per-user process permissions are resolved by the API
// (GET /admin/users/:id/permissions) rather than hardcoded here: the previous
// hardcoded ROLE_PERMS table only covered a handful of role names and could not
// reflect what an admin had actually configured under Roles & Permissions.

// ── Compute effective permission (override > role) ─────────────────────────────
function effectivePerm(
  procId: string,
  key: keyof ProcessOverride,
  user: UserRecord,
): { effective: boolean; source: "role" | "allow" | "deny" } {
  const ov = user.overrides[procId]?.[key] ?? "inherit";
  if (ov === "allow") return { effective: true, source: "allow" };
  if (ov === "deny") return { effective: false, source: "deny" };
  const base = user.rolePerms[procId]?.[key] ?? false;
  return { effective: base, source: "role" };
}

// ── Permission toggle button ──────────────────────────────────────────────────
const PERM_KEYS: Array<keyof ProcessOverride> = [
  "view",
  "create",
  "edit",
  "approve",
  "delete",
];
const OV_CYCLE: Record<OverrideState, OverrideState> = {
  inherit: "allow",
  allow: "deny",
  deny: "inherit",
};

// ── User Detail Pane ──────────────────────────────────────────────────────────
function UserPermPane({
  user,
  setUser,
  onClose,
  onSave,
  catalog,
  saving,
}: {
  user: UserRecord;
  setUser: (u: UserRecord) => void;
  onClose: () => void;
  onSave: () => void;
  /** The live process catalog, so this matrix matches Process Configuration. */
  catalog: ProcessDef[];
  saving: boolean;
}) {
  const [expandedApp, setExpandedApp] = useState<AppKey | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const overrideCount = Object.values(user.overrides).reduce((s, ov) => {
    return s + Object.values(ov).filter((v) => v !== "inherit").length;
  }, 0);

  const cycleOverride = (procId: string, key: keyof ProcessOverride) => {
    const current = user.overrides[procId]?.[key] ?? "inherit";
    const nextState = OV_CYCLE[current];
    setUser({
      ...user,
      overrides: {
        ...user.overrides,
        [procId]: {
          ...(user.overrides[procId] ?? defOverride()),
          [key]: nextState,
        },
      },
    });
    setHasChanges(true);
  };

  // Group processes by app — only show apps assigned to this user
  const assignedApps = user.assignedApps ?? [];
  const groupedProcesses = (Object.keys(APP_LABELS) as AppKey[])
    .filter((app) => assignedApps.includes(app))
    .map((app) => ({
      app,
      processes: catalog.filter((p) => p.app === app),
    }))
    .filter((g) => g.processes.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-[600px] bg-white border-l border-gray-200 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 truncate">
              {user.name}
            </h2>
            <p className="text-sm text-gray-500">
              Role:{" "}
              <span className="font-medium text-gray-700">{user.role}</span>
              {overrideCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded font-medium">
                  {overrideCount} override{overrideCount > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Legend */}
        <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-100 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Click a permission cell to cycle:{" "}
            <span className="font-semibold">
              Inherit → Allow → Deny → Inherit
            </span>
            . Allow/Deny overrides the role default.
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {groupedProcesses.length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              This user has no applications assigned, so there are no processes
              to configure. Assign applications to the user first.
            </div>
          )}
          {groupedProcesses.map(({ app, processes }) => {
            const isExpanded = expandedApp === null || expandedApp === app;
            return (
              <div key={app} className="border-b border-gray-100 last:border-0">
                <button
                  onClick={() =>
                    setExpandedApp(
                      isExpanded && expandedApp !== null ? null : app,
                    )
                  }
                  className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${APP_COLORS[app]}`}
                  >
                    {APP_LABELS[app]}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${!isExpanded ? "-rotate-90" : ""}`}
                  />
                </button>

                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-y border-gray-100">
                        <tr>
                          <th className="text-left px-6 py-2 text-gray-500 font-medium w-48">
                            Process
                          </th>
                          {PERM_KEYS.map((k) => (
                            <th
                              key={k}
                              className="px-2 py-2 text-center text-gray-500 font-medium w-16 capitalize"
                            >
                              {k}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {processes.map((proc) => (
                          <tr key={proc.id} className="hover:bg-gray-50/60">
                            <td className="px-6 py-2.5 text-gray-700 font-medium">
                              {proc.label}
                            </td>
                            {PERM_KEYS.map((k) => {
                              const { effective } = effectivePerm(
                                proc.id,
                                k,
                                user,
                              );
                              const ov =
                                user.overrides[proc.id]?.[k] ?? "inherit";

                              let cellClass =
                                "bg-gray-50 border border-gray-200 text-gray-400";
                              let iconEl = (
                                <XCircle className="w-3.5 h-3.5 mx-auto" />
                              );

                              if (ov === "allow") {
                                cellClass =
                                  "bg-emerald-100 border border-emerald-400 text-emerald-700";
                                iconEl = (
                                  <CheckCircle2 className="w-3.5 h-3.5 mx-auto" />
                                );
                              } else if (ov === "deny") {
                                cellClass =
                                  "bg-red-100 border border-red-400 text-red-600";
                                iconEl = (
                                  <XCircle className="w-3.5 h-3.5 mx-auto" />
                                );
                              } else if (effective) {
                                cellClass =
                                  "bg-indigo-50 border border-indigo-200 text-indigo-600";
                                iconEl = (
                                  <CheckCircle2 className="w-3.5 h-3.5 mx-auto opacity-70" />
                                );
                              }

                              return (
                                <td key={k} className="px-2 py-2.5 text-center">
                                  <button
                                    onClick={() => cycleOverride(proc.id, k)}
                                    title={`${ov === "inherit" ? `Inherited from role (${effective ? "✓" : "✗"})` : ov === "allow" ? "Override: Allow" : "Override: Deny"}`}
                                    className={`w-7 h-7 rounded flex items-center justify-center transition-colors hover:opacity-80 mx-auto ${cellClass}`}
                                  >
                                    {iconEl}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-3 shrink-0 bg-gray-50">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-indigo-50 border border-indigo-200 inline-block" />{" "}
              Inherited (role)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-emerald-100 border border-emerald-400 inline-block" />{" "}
              Allow (override)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded bg-red-100 border border-red-400 inline-block" />{" "}
              Deny (override)
            </span>
          </div>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-white"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!hasChanges || saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save Overrides"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function UserPermissionsPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  // The process catalog comes from the same endpoint Process Configuration uses,
  // so this matrix lists exactly the processes configured there rather than a
  // hardcoded subset that had drifted out of step with it.
  const [catalog, setCatalog] = useState<ProcessDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getUsers(), getProcessCatalog()])
      .then(([data, processCatalog]) => {
        setCatalog(
          processCatalog
            .filter((proc: ProcessCatalogItem) =>
              (Object.keys(APP_LABELS) as string[]).includes(
                String(proc.app ?? "").toLowerCase(),
              ),
            )
            .map((proc: ProcessCatalogItem) => ({
              id: proc.id,
              label: proc.label,
              app: String(proc.app).toLowerCase() as AppKey,
            })),
        );

        setUsers(
          data.map((u) => {
            const assignedApps: AppKey[] = Array.isArray(u.assignedApps)
              ? (u.assignedApps.filter((app): app is AppKey =>
                  (Object.keys(APP_LABELS) as string[]).includes(app),
                ) as AppKey[])
              : (["ess"] as AppKey[]);
            return {
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              assignedApps:
                assignedApps.length > 0 ? assignedApps : (["ess"] as AppKey[]),
              department: u.department || "—",
              status:
                (u.status ?? "").toLowerCase() === "active"
                  ? "active"
                  : "inactive",
              lastLogin: u.lastLogin || "Never",
              // Resolved per user when the pane opens — one call per user opened
              // rather than one per row on load.
              rolePerms: {},
              overrides: {},
            };
          }),
        );
        setLoadError(null);
      })
      .catch((err: unknown) => {
        setLoadError(
          err instanceof Error ? err.message : "Failed to load users.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const roles = Array.from(new Set(users.map((u) => u.role)));

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  /**
   * Translates a resolved permission set into the pane's two inputs: what the
   * role alone grants, and which cells an admin has explicitly overridden.
   *
   * `processSources` carries the provenance of every decision, so a cell marked
   * `allow`/`deny` is a user-level override while `role`/`open` is inherited.
   */
  const fromEffective = (effective: EffectivePermissions) => {
    const rolePerms: Record<string, RoleBasePerm> = {};
    const overrides: Record<string, ProcessOverride> = {};

    for (const [procId, sources] of Object.entries(effective.processSources)) {
      const base: RoleBasePerm = {
        view: false,
        create: false,
        edit: false,
        approve: false,
        delete: false,
      };
      let hasOverride = false;
      const override = defOverride();

      for (const key of PERM_KEYS) {
        const action = key as PermissionAction;
        const source = sources[action];
        if (source === "allow" || source === "deny") {
          override[key] = source;
          hasOverride = true;
        }
        // Always the role's own answer, so clearing an override reveals the
        // inherited value rather than a guess.
        base[key] = Boolean(
          effective.roleProcessPermissions[procId]?.[action],
        );
      }

      rolePerms[procId] = base;
      if (hasOverride) overrides[procId] = override;
    }

    return { rolePerms, overrides };
  };

  const openUser = async (u: UserRecord) => {
    setOpening(true);
    try {
      const effective = await getUserPermissions(u.id);
      const { rolePerms, overrides } = fromEffective(effective);
      setSelectedUser({ ...u, role: effective.role || u.role, rolePerms, overrides });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load this user's permissions.",
      );
    } finally {
      setOpening(false);
    }
  };

  const saveUserOverrides = async () => {
    if (!selectedUser) return;
    setSaving(true);

    // Only explicit allow/deny is persisted — leaving a cell on "inherit" is what
    // lets a later change to the role flow through to this user.
    const processOverrides: Record<
      string,
      Partial<Record<PermissionAction, "allow" | "deny">>
    > = {};
    for (const [procId, override] of Object.entries(selectedUser.overrides)) {
      for (const key of PERM_KEYS) {
        const state = override[key];
        if (state === "allow" || state === "deny") {
          (processOverrides[procId] ??= {})[key as PermissionAction] = state;
        }
      }
    }

    try {
      const effective = await setUserPermissions(selectedUser.id, {
        processOverrides,
      });
      const { rolePerms, overrides } = fromEffective(effective);
      const updated = { ...selectedUser, rolePerms, overrides };
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setSelectedUser(null);

      const count = Object.values(processOverrides).reduce(
        (sum, actions) => sum + Object.keys(actions).length,
        0,
      );
      toast.success(
        count === 0
          ? "Overrides cleared — this user now follows their role."
          : `Saved ${count} permission override${count > 1 ? "s" : ""}.`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save permissions.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          User Permissions
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Override process-level permissions per user on top of their role
          defaults
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-800">
          <span className="font-semibold">Process-based overrides</span> take
          precedence over role permissions. Only processes for applications
          assigned to the user are shown. Cells not overridden inherit from the
          user's role.
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* User table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                User
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Role
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Active Overrides
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                  Loading users and process catalog…
                </td>
              </tr>
            )}
            {loadError && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-red-600">
                  {loadError}
                </td>
              </tr>
            )}
            {!loading && !loadError && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                  No users match this search.
                </td>
              </tr>
            )}
            {filtered.map((user) => {
              const overrideCount = Object.values(user.overrides).reduce(
                (s, ov) => {
                  return (
                    s + Object.values(ov).filter((v) => v !== "inherit").length
                  );
                },
                0,
              );
              return (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => void openUser(user)}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-gray-700">{user.role}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    {overrideCount === 0 ? (
                      <span className="text-xs text-gray-400 italic">
                        No overrides — inheriting from role
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded font-medium">
                        {overrideCount} override{overrideCount > 1 ? "s" : ""}{" "}
                        active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void openUser(user);
                      }}
                      disabled={opening}
                      className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium hover:text-indigo-800 ml-auto disabled:opacity-50"
                    >
                      <PenLine className="w-3.5 h-3.5" />
                      {opening ? "Loading…" : "Edit Permissions"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Slide-over panel */}
      {selectedUser && (
        <UserPermPane
          user={selectedUser}
          setUser={setSelectedUser}
          onClose={() => setSelectedUser(null)}
          onSave={() => void saveUserOverrides()}
          catalog={catalog}
          saving={saving}
        />
      )}
    </div>
  );
}
