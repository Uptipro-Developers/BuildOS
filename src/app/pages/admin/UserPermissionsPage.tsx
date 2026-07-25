import { useState } from "react";
import {
  Search, ChevronDown, ChevronRight, CheckCircle2, XCircle,
  AlertTriangle, Save, Eye, Plus, PenLine, BadgeCheck, Trash2, X,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type AppKey = "construction" | "finance" | "hr" | "procurement" | "admin" | "ess";
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
  overrides: Record<string, ProcessOverride>;
  rolePerms: Record<string, RoleBasePerm>;
}

// ── App config ─────────────────────────────────────────────────────────────────
const APP_COLORS: Record<AppKey, string> = {
  construction: "bg-orange-100 text-orange-700",
  finance:      "bg-emerald-100 text-emerald-700",
  hr:           "bg-purple-100 text-purple-700",
  procurement:  "bg-blue-100 text-blue-700",
  admin:        "bg-indigo-100 text-indigo-700",
  ess:          "bg-teal-100 text-teal-700",
};
const APP_LABELS: Record<AppKey, string> = {
  construction: "Projects",
  finance:      "Finance",
  hr:           "HR",
  procurement:  "Procurement",
  admin:        "Admin",
  ess:          "ESS",
};

// ── Process catalog ────────────────────────────────────────────────────────────
const ALL_PROCESSES: ProcessDef[] = [
  { id: "p_create_pr",   label: "Create Purchase Request",  app: "procurement" },
  { id: "p_approve_po",  label: "Approve Purchase Order",   app: "procurement" },
  { id: "p_issue_mat",   label: "Issue Materials",           app: "procurement" },
  { id: "p_create_exp",  label: "Create Expense",            app: "finance"     },
  { id: "p_approve_exp", label: "Approve Expense",           app: "finance"     },
  { id: "p_create_pay",  label: "Create Payroll",            app: "hr"          },
  { id: "p_approve_lv",  label: "Approve Leave Request",     app: "hr"          },
  { id: "p_assign_wf",   label: "Assign Workforce",          app: "construction"},
  { id: "p_create_proj", label: "Create Project",            app: "construction"},
  { id: "p_approve_bud", label: "Approve Project Budget",    app: "construction"},
  { id: "p_gen_rpt",     label: "Generate Reports",          app: "admin"       },
  { id: "p_manage_usr",  label: "Manage Users",              app: "admin"       },
];

// ── Builder helpers ────────────────────────────────────────────────────────────
const defOverride = (): ProcessOverride => ({
  view: "inherit", create: "inherit", edit: "inherit", approve: "inherit", delete: "inherit",
});

// Mock role base permissions
const ROLE_PERMS: Record<string, Record<string, RoleBasePerm>> = {
  "Construction Manager": {
    p_create_pr:   { view: true,  create: true,  edit: true,  approve: false, delete: false },
    p_approve_po:  { view: true,  create: false, edit: false, approve: false, delete: false },
    p_issue_mat:   { view: true,  create: true,  edit: false, approve: false, delete: false },
    p_create_exp:  { view: true,  create: true,  edit: false, approve: false, delete: false },
    p_approve_exp: { view: true,  create: false, edit: false, approve: false, delete: false },
    p_create_pay:  { view: false, create: false, edit: false, approve: false, delete: false },
    p_approve_lv:  { view: false, create: false, edit: false, approve: false, delete: false },
    p_assign_wf:   { view: true,  create: true,  edit: true,  approve: false, delete: false },
    p_create_proj: { view: true,  create: true,  edit: true,  approve: false, delete: false },
    p_approve_bud: { view: true,  create: false, edit: false, approve: true,  delete: false },
    p_gen_rpt:     { view: true,  create: false, edit: false, approve: false, delete: false },
    p_manage_usr:  { view: false, create: false, edit: false, approve: false, delete: false },
  },
  "Accountant": {
    p_create_pr:   { view: false, create: false, edit: false, approve: false, delete: false },
    p_approve_po:  { view: true,  create: false, edit: false, approve: false, delete: false },
    p_issue_mat:   { view: false, create: false, edit: false, approve: false, delete: false },
    p_create_exp:  { view: true,  create: true,  edit: true,  approve: false, delete: false },
    p_approve_exp: { view: true,  create: false, edit: false, approve: true,  delete: false },
    p_create_pay:  { view: true,  create: false, edit: false, approve: false, delete: false },
    p_approve_lv:  { view: false, create: false, edit: false, approve: false, delete: false },
    p_assign_wf:   { view: false, create: false, edit: false, approve: false, delete: false },
    p_create_proj: { view: false, create: false, edit: false, approve: false, delete: false },
    p_approve_bud: { view: false, create: false, edit: false, approve: false, delete: false },
    p_gen_rpt:     { view: true,  create: true,  edit: false, approve: false, delete: false },
    p_manage_usr:  { view: false, create: false, edit: false, approve: false, delete: false },
  },
  "Procurement Officer": {
    p_create_pr:   { view: true,  create: true,  edit: true,  approve: false, delete: false },
    p_approve_po:  { view: true,  create: false, edit: false, approve: false, delete: false },
    p_issue_mat:   { view: true,  create: true,  edit: false, approve: false, delete: false },
    p_create_exp:  { view: false, create: false, edit: false, approve: false, delete: false },
    p_approve_exp: { view: false, create: false, edit: false, approve: false, delete: false },
    p_create_pay:  { view: false, create: false, edit: false, approve: false, delete: false },
    p_approve_lv:  { view: false, create: false, edit: false, approve: false, delete: false },
    p_assign_wf:   { view: false, create: false, edit: false, approve: false, delete: false },
    p_create_proj: { view: false, create: false, edit: false, approve: false, delete: false },
    p_approve_bud: { view: false, create: false, edit: false, approve: false, delete: false },
    p_gen_rpt:     { view: false, create: false, edit: false, approve: false, delete: false },
    p_manage_usr:  { view: false, create: false, edit: false, approve: false, delete: false },
  },
  "HR Manager": {
    p_create_pr:   { view: false, create: false, edit: false, approve: false, delete: false },
    p_approve_po:  { view: false, create: false, edit: false, approve: false, delete: false },
    p_issue_mat:   { view: false, create: false, edit: false, approve: false, delete: false },
    p_create_exp:  { view: false, create: false, edit: false, approve: false, delete: false },
    p_approve_exp: { view: false, create: false, edit: false, approve: false, delete: false },
    p_create_pay:  { view: true,  create: true,  edit: false, approve: false, delete: false },
    p_approve_lv:  { view: true,  create: false, edit: false, approve: true,  delete: false },
    p_assign_wf:   { view: false, create: false, edit: false, approve: false, delete: false },
    p_create_proj: { view: false, create: false, edit: false, approve: false, delete: false },
    p_approve_bud: { view: false, create: false, edit: false, approve: false, delete: false },
    p_gen_rpt:     { view: true,  create: true,  edit: false, approve: false, delete: false },
    p_manage_usr:  { view: false, create: false, edit: false, approve: false, delete: false },
  },
  "Employee": Object.fromEntries(ALL_PROCESSES.map((p) => [p.id, { view: false, create: false, edit: false, approve: false, delete: false }])),
};

// ── Seed users ────────────────────────────────────────────────────────────────
const SEED_USERS: UserRecord[] = [
  {
    id: "u1", name: "Chukwudi Eze", email: "c.eze@buildos.com",
    role: "Construction Manager",
    rolePerms: ROLE_PERMS["Construction Manager"],
    overrides: {
      p_approve_po: { ...defOverride(), approve: "allow" },   // override: can approve PO
      p_create_exp: { ...defOverride(), edit: "deny" },        // override: cannot edit expense
    },
  },
  {
    id: "u2", name: "Sola Adeleke", email: "s.adeleke@buildos.com",
    role: "Accountant",
    rolePerms: ROLE_PERMS["Accountant"],
    overrides: {},
  },
  {
    id: "u3", name: "Musa Ibrahim", email: "m.ibrahim@buildos.com",
    role: "Procurement Officer",
    rolePerms: ROLE_PERMS["Procurement Officer"],
    overrides: {
      p_gen_rpt: { ...defOverride(), view: "allow", create: "allow" }, // override: can generate reports
    },
  },
  {
    id: "u4", name: "Ngozi Okafor", email: "n.okafor@buildos.com",
    role: "HR Manager",
    rolePerms: ROLE_PERMS["HR Manager"],
    overrides: {},
  },
  {
    id: "u5", name: "Tunde Bello", email: "t.bello@buildos.com",
    role: "Employee",
    rolePerms: ROLE_PERMS["Employee"],
    overrides: {},
  },
];

// ── Compute effective permission (override > role) ─────────────────────────────
function effectivePerm(
  procId: string,
  key: keyof ProcessOverride,
  user: UserRecord
): { effective: boolean; source: "role" | "allow" | "deny" } {
  const ov = user.overrides[procId]?.[key] ?? "inherit";
  if (ov === "allow") return { effective: true, source: "allow" };
  if (ov === "deny") return { effective: false, source: "deny" };
  const base = user.rolePerms[procId]?.[key] ?? false;
  return { effective: base, source: "role" };
}

// ── Permission toggle button ──────────────────────────────────────────────────
const PERM_KEYS: Array<keyof ProcessOverride> = ["view", "create", "edit", "approve", "delete"];
const PERM_SHORT: Record<keyof ProcessOverride, string> = { view: "V", create: "C", edit: "E", approve: "A", delete: "D" };

const OV_CYCLE: Record<OverrideState, OverrideState> = { inherit: "allow", allow: "deny", deny: "inherit" };

// ── User Detail Pane ──────────────────────────────────────────────────────────
function UserPermPane({
  user,
  setUser,
  onClose,
  onSave,
}: {
  user: UserRecord;
  setUser: (u: UserRecord) => void;
  onClose: () => void;
  onSave: () => void;
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

  // Group processes by app
  const groupedProcesses = (Object.keys(APP_LABELS) as AppKey[]).map((app) => ({
    app,
    processes: ALL_PROCESSES.filter((p) => p.app === app),
  })).filter((g) => g.processes.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-[600px] bg-white border-l border-gray-200 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
            {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 truncate">{user.name}</h2>
            <p className="text-sm text-gray-500">Role: <span className="font-medium text-gray-700">{user.role}</span>
              {overrideCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded font-medium">{overrideCount} override{overrideCount > 1 ? "s" : ""}</span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {/* Legend */}
        <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-100 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Click a permission cell to cycle: <span className="font-semibold">Inherit → Allow → Deny → Inherit</span>.
            Allow/Deny overrides the role default.
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {groupedProcesses.map(({ app, processes }) => {
            const isExpanded = expandedApp === null || expandedApp === app;
            return (
              <div key={app} className="border-b border-gray-100 last:border-0">
                <button
                  onClick={() => setExpandedApp(isExpanded && expandedApp !== null ? null : app)}
                  className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${APP_COLORS[app]}`}>{APP_LABELS[app]}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${!isExpanded ? "-rotate-90" : ""}`} />
                </button>

                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-y border-gray-100">
                        <tr>
                          <th className="text-left px-6 py-2 text-gray-500 font-medium w-48">Process</th>
                          {PERM_KEYS.map((k) => (
                            <th key={k} className="px-2 py-2 text-center text-gray-500 font-medium w-16 capitalize">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {processes.map((proc) => (
                          <tr key={proc.id} className="hover:bg-gray-50/60">
                            <td className="px-6 py-2.5 text-gray-700 font-medium">{proc.label}</td>
                            {PERM_KEYS.map((k) => {
                              const { effective, source } = effectivePerm(proc.id, k, user);
                              const ov = user.overrides[proc.id]?.[k] ?? "inherit";

                              let cellClass = "bg-gray-50 border border-gray-200 text-gray-400";
                              let iconEl = <XCircle className="w-3.5 h-3.5 mx-auto" />;

                              if (ov === "allow") {
                                cellClass = "bg-emerald-100 border border-emerald-400 text-emerald-700";
                                iconEl = <CheckCircle2 className="w-3.5 h-3.5 mx-auto" />;
                              } else if (ov === "deny") {
                                cellClass = "bg-red-100 border border-red-400 text-red-600";
                                iconEl = <XCircle className="w-3.5 h-3.5 mx-auto" />;
                              } else if (effective) {
                                cellClass = "bg-indigo-50 border border-indigo-200 text-indigo-600";
                                iconEl = <CheckCircle2 className="w-3.5 h-3.5 mx-auto opacity-70" />;
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
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-indigo-50 border border-indigo-200 inline-block" /> Inherited (role)</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-emerald-100 border border-emerald-400 inline-block" /> Allow (override)</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-red-100 border border-red-400 inline-block" /> Deny (override)</span>
          </div>
          <div className="flex-1" />
          <button onClick={onClose} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-white">Cancel</button>
          <button onClick={onSave} disabled={!hasChanges} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            <Save className="w-4 h-4" />Save Overrides
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function UserPermissionsPage() {
  const [users, setUsers] = useState<UserRecord[]>(SEED_USERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  const roles = Array.from(new Set(users.map((u) => u.role)));

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const openUser = (u: UserRecord) => {
    setSelectedUser({ ...u, overrides: { ...u.overrides } });
  };

  const saveUserOverrides = () => {
    if (!selectedUser) return;
    setUsers((prev) => prev.map((u) => u.id === selectedUser.id ? selectedUser : u));
    setSelectedUser(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">User Permissions</h1>
        <p className="text-sm text-gray-500 mt-0.5">Override process-level permissions per user on top of their role defaults</p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-800">
          <span className="font-semibold">Process-based overrides</span> take precedence over role permissions.
          All processes across all applications are shown. Cells not overridden inherit from the user's role.
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Search users…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Roles</option>
          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* User table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Overrides</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((user) => {
              const overrideCount = Object.values(user.overrides).reduce((s, ov) => {
                return s + Object.values(ov).filter((v) => v !== "inherit").length;
              }, 0);
              return (
                <tr key={user.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openUser(user)}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-gray-700">{user.role}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    {overrideCount === 0 ? (
                      <span className="text-xs text-gray-400 italic">No overrides — inheriting from role</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded font-medium">
                        {overrideCount} override{overrideCount > 1 ? "s" : ""} active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); openUser(user); }}
                      className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium hover:text-indigo-800 ml-auto"
                    >
                      <PenLine className="w-3.5 h-3.5" />Edit Permissions
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
          onSave={saveUserOverrides}
        />
      )}
    </div>
  );
}
