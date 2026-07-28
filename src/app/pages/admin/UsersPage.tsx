import { useState, useEffect } from "react";
import {
  getUsers,
  inviteUser,
  resendInvite,
  updateUser,
  activateUser,
  deactivateUser,
  deleteUser,
  AppUser,
} from "../../api/admin-extras";
import { formatDateByGeneralSettings } from "../../utils/generalSettings";
import {
  Search,
  Plus,
  Shield,
  MoreVertical,
  X,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Edit,
  Trash2,
  Lock,
  Eye,
  PenLine,
  BadgeCheck,
} from "lucide-react";
import { getReferenceData } from "../../api/reference-data";
import { toast } from "sonner";
import { ConfirmationModal } from "../../components/ConfirmationModal";

// ── Types ────────────────────────────────────────────────────────────────────
type AppKey =
  | "construction"
  | "finance"
  | "hr"
  | "procurement"
  | "storefront"
  | "admin"
  | "ess";
type UserStatus = "Active" | "Inactive" | "Pending";
interface AppDef {
  key: AppKey;
  label: string;
  color: string;
  abbr: string;
}
const ALL_APPS: AppDef[] = [
  {
    key: "construction",
    label: "Projects",
    color: "bg-orange-100 text-orange-700",
    abbr: "PROJ",
  },
  {
    key: "finance",
    label: "Finance",
    color: "bg-emerald-100 text-emerald-700",
    abbr: "FIN",
  },
  {
    key: "hr",
    label: "HR",
    color: "bg-purple-100 text-purple-700",
    abbr: "HR",
  },
  {
    key: "procurement",
    label: "Procurement",
    color: "bg-blue-100 text-blue-700",
    abbr: "PROC",
  },
  {
    key: "storefront",
    label: "Storefront",
    color: "bg-pink-100 text-pink-700",
    abbr: "STO",
  },
  {
    key: "admin",
    label: "Admin",
    color: "bg-indigo-100 text-indigo-700",
    abbr: "ADMIN",
  },
  { key: "ess", label: "ESS", color: "bg-teal-100 text-teal-700", abbr: "ESS" },
];

interface Process {
  id: string;
  label: string;
  app: AppKey;
  permissions: {
    view: boolean;
    create: boolean;
    edit: boolean;
    approve: boolean;
    delete: boolean;
  };
}

interface ActivityEntry {
  date: string;
  action: string;
  module: string;
  app: AppKey;
}
interface RequestEntry {
  type: "submitted" | "approved" | "rejected";
  label: string;
  date: string;
}

interface UserRecord {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  role: string;
  department: string;
  joinDate: string;
  status: UserStatus;
  apps: AppKey[];
  lastActive: string;
  processes: Process[];
  activity: ActivityEntry[];
  requests: RequestEntry[];
  hasSignature?: boolean;
  signatureInitials?: string;
}

function deriveFallbackUserId(u: AppUser): string {
  const created = u.createdAt ? new Date(u.createdAt) : new Date();
  const yymm = `${String(created.getUTCFullYear()).slice(-2)}${String(created.getUTCMonth() + 1).padStart(2, "0")}`;
  const suffix = String(u.id || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-4)
    .toUpperCase();
  return `BOS-${yymm}-${suffix || "0000"}`;
}

function userFromApi(u: AppUser): UserRecord {
  const rawStatus = (u.status ?? "").toLowerCase();
  const status: UserStatus =
    rawStatus === "active"
      ? "Active"
      : ["pending", "pending_invite", "invited", "pending invite"].includes(
            rawStatus,
          )
        ? "Pending"
        : "Inactive";

  const apps: AppKey[] = Array.isArray(u.assignedApps)
    ? (u.assignedApps.filter((app): app is AppKey =>
        [
          "construction",
          "finance",
          "hr",
          "procurement",
          "storefront",
          "admin",
          "ess",
        ].includes(app),
      ) as AppKey[])
    : (["ess"] as AppKey[]);

  return {
    id: u.id,
    userId: String(u.userId || "").trim() || deriveFallbackUserId(u),
    name: u.name,
    email: u.email,
    phone: u.phone ?? "",
    location: "",
    role: u.role,
    department: u.department ?? "",
    joinDate: u.createdAt ? formatDateByGeneralSettings(u.createdAt) : "",
    status,
    apps: apps.length > 0 ? apps : (["ess"] as AppKey[]),
    lastActive: u.lastLogin
      ? formatDateByGeneralSettings(u.lastLogin)
      : "Never",
    processes: [],
    activity: [],
    requests: [],
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<UserStatus, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Inactive: "bg-gray-100 text-gray-500",
  Pending: "bg-amber-100 text-amber-700",
};
const PERM_ACTIONS: Array<{
  key: keyof Process["permissions"];
  label: string;
  Icon: React.FC<{ className?: string }>;
}> = [
  { key: "view", label: "View", Icon: Eye },
  { key: "create", label: "Create", Icon: Plus },
  { key: "edit", label: "Edit", Icon: PenLine },
  { key: "approve", label: "Approve", Icon: BadgeCheck },
  { key: "delete", label: "Delete", Icon: Trash2 },
];

const USERS_PER_PAGE = 20;
const NAME_PATTERN = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_PATTERN = /^\d+$/;

function AppBadge({
  appKey,
  size = "sm",
}: {
  appKey: AppKey;
  size?: "sm" | "xs";
}) {
  const app = ALL_APPS.find((a) => a.key === appKey);
  if (!app) return null;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${app.color} ${size === "xs" ? "text-[10px]" : ""}`}
    >
      {size === "sm" ? app.label : app.abbr}
    </span>
  );
}

// ── User Detail Slide-over ───────────────────────────────────────────────────
function UserDetailPanel({
  user,
  onClose,
  onUpdateSignature,
  onUpdateApps,
  onEditUser,
  onResetPassword,
  onDeactivateUser,
  onActivateUser,
}: {
  user: UserRecord;
  onClose: () => void;
  onUpdateSignature: (id: string, has: boolean, initials?: string) => void;
  onUpdateApps: (id: string, apps: AppKey[]) => Promise<void>;
  onEditUser: (
    id: string,
    payload: {
      name: string;
      email: string;
      phone: string;
      role: string;
      department: string;
    },
  ) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
  onDeactivateUser: (id: string) => Promise<void>;
  onActivateUser: (id: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<
    "info" | "apps" | "permissions" | "activity" | "requests" | "signature"
  >("info");
  const [signatureInitials, setSignatureInitials] = useState(
    user.signatureInitials ??
      user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 3),
  );
  const [hasSignature, setHasSignature] = useState(user.hasSignature ?? false);
  const [uploadSimulated, setUploadSimulated] = useState(false);
  const [selectedApps, setSelectedApps] = useState<AppKey[]>(
    user.apps.length > 0 ? user.apps : ["ess"],
  );
  const [savingApps, setSavingApps] = useState(false);
  const [ctaBusy, setCtaBusy] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const tabs = [
    { key: "info", label: "Basic Info" },
    { key: "apps", label: "App Access" },
    { key: "permissions", label: "Permissions" },
    { key: "activity", label: "Activity" },
    { key: "requests", label: "Requests" },
  ] as const;

  // Group processes by app
  const processesByApp = ALL_APPS.map((app) => ({
    app,
    processes: user.processes.filter((p) => p.app === app.key),
  })).filter((g) => g.processes.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/30" onClick={onClose} />
      {/* Panel */}
      <div className="w-[640px] bg-white border-l border-gray-200 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-bold shrink-0">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900 truncate">
                {user.name}
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLOR[user.status]}`}
              >
                {user.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {user.role} · {user.department}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0 px-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-2.5 px-3 text-xs font-medium transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? "border-indigo-500 text-indigo-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ── Basic Info ── */}
          {tab === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { Icon: Mail, label: "Email", value: user.email },
                  { Icon: Phone, label: "Phone", value: user.phone },
                  { Icon: MapPin, label: "Location", value: user.location },
                  {
                    Icon: Briefcase,
                    label: "Department",
                    value: user.department,
                  },
                  { Icon: Shield, label: "Role", value: user.role },
                  { Icon: Calendar, label: "Joined", value: user.joinDate },
                ].map(({ Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100"
                  >
                    <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <Activity className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-xs text-indigo-700">
                  Last active:{" "}
                  <span className="font-medium">{user.lastActive}</span>
                </span>
              </div>
            </div>
          )}

          {/* ── App Access ── */}
          {tab === "apps" && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-4">
                {selectedApps.length} of {ALL_APPS.length} applications
                assigned.
              </p>
              {ALL_APPS.map((app) => {
                const has = selectedApps.includes(app.key);
                return (
                  <div
                    key={app.key}
                    className={`flex items-center justify-between p-3 rounded-lg border ${has ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-gray-50"}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={has}
                        disabled={app.key === "ess"}
                        onChange={() => {
                          if (app.key === "ess") return;
                          setSelectedApps((prev) =>
                            prev.includes(app.key)
                              ? prev.filter((key) => key !== app.key)
                              : [...prev, app.key],
                          );
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${app.color}`}
                      >
                        {app.abbr}
                      </span>
                      <span className="text-sm font-medium text-gray-800">
                        {app.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {has ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs text-emerald-700 font-medium">
                            Assigned
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-gray-300" />
                          <span className="text-xs text-gray-400">
                            No access
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={async () => {
                    setSavingApps(true);
                    const next = Array.from(
                      new Set(["ess", ...selectedApps]),
                    ) as AppKey[];
                    try {
                      await onUpdateApps(user.id, next);
                    } finally {
                      setSavingApps(false);
                    }
                  }}
                  disabled={savingApps}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {savingApps ? "Saving..." : "Save App Access"}
                </button>
              </div>
            </div>
          )}

          {/* ── Permissions ── */}
          {tab === "permissions" && (
            <div className="space-y-6">
              <p className="text-xs text-gray-500">
                Process-level permissions across all applications.
              </p>
              {processesByApp.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No processes assigned to this user.
                </div>
              )}
              {processesByApp.map(({ app, processes }) => (
                <div key={app.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${app.color}`}
                    >
                      {app.label}
                    </span>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-3 py-2 text-gray-500 font-medium">
                            Process
                          </th>
                          {PERM_ACTIONS.map((a) => (
                            <th
                              key={a.key}
                              className="px-2 py-2 text-gray-500 font-medium text-center"
                            >
                              {a.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {processes.map((proc) => (
                          <tr key={proc.id} className="hover:bg-gray-50/50">
                            <td className="px-3 py-2 text-gray-700 font-medium">
                              {proc.label}
                            </td>
                            {PERM_ACTIONS.map((a) => (
                              <td key={a.key} className="px-2 py-2 text-center">
                                {proc.permissions[a.key] ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-gray-200 mx-auto" />
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Activity ── */}
          {tab === "activity" && (
            <div className="space-y-2">
              {user.activity.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">
                  No activity recorded.
                </p>
              )}
              {user.activity.map((a, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <div
                    className={`mt-[5px] w-1.5 h-1.5 rounded-full shrink-0 ${
                      ALL_APPS.find((ap) => ap.key === a.app)
                        ?.color.replace("text-", "bg-")
                        .split(" ")[0]
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{a.action}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <AppBadge appKey={a.app} size="xs" />
                      <span className="text-xs text-gray-400">{a.module}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{a.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Requests ── */}
          {tab === "requests" && (
            <div className="space-y-2">
              {user.requests.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">
                  No request history.
                </p>
              )}
              {user.requests.map((r, i) => {
                const cfg = {
                  submitted: {
                    icon: <Clock className="w-4 h-4 text-amber-500" />,
                    badge: "bg-amber-100 text-amber-700",
                    label: "Submitted",
                  },
                  approved: {
                    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
                    badge: "bg-emerald-100 text-emerald-700",
                    label: "Approved",
                  },
                  rejected: {
                    icon: <XCircle className="w-4 h-4 text-red-400" />,
                    badge: "bg-red-100 text-red-700",
                    label: "Rejected",
                  },
                }[r.type] ?? {
                  icon: <Clock className="w-4 h-4 text-gray-500" />,
                  badge: "bg-gray-100 text-gray-700",
                  label: String(r.type ?? "Unknown"),
                };
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50"
                  >
                    {cfg.icon}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">
                        {r.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{r.date}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${cfg.badge}`}
                    >
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Signature ── */}
          {tab === "signature" && (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium text-gray-800 mb-1">
                  Digital Signature
                </p>
                <p className="text-xs text-gray-500">
                  Used on official documents: RFQs, Purchase Orders, Payment
                  Confirmations, and other outgoing documents. Signatures appear
                  in "Sent By" and "Approved By" sections.
                </p>
              </div>

              {/* Current signature display */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Current Signature
                </p>
                {hasSignature || uploadSimulated ? (
                  <div className="space-y-3">
                    {/* Signature preview — stylised initials as a simulated signature */}
                    <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-6 flex items-center justify-center min-h-[100px]">
                      <p
                        style={{ fontFamily: "cursive" }}
                        className="text-3xl text-gray-700 select-none"
                      >
                        {signatureInitials}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {user.role} · {user.department}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Signature on
                        file
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-2">
                    <PenLine className="w-8 h-8 text-gray-300" />
                    <p className="text-sm text-gray-400">
                      No signature uploaded yet
                    </p>
                    <p className="text-xs text-gray-400">
                      Upload a signature image or use the signature pad below
                    </p>
                  </div>
                )}
              </div>

              {/* Signature customisation */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Signature Text / Initials
                </p>
                <div className="flex items-center gap-3">
                  <input
                    value={signatureInitials}
                    onChange={(e) => setSignatureInitials(e.target.value)}
                    maxLength={8}
                    placeholder="e.g. A.O or signature text"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 min-w-[80px] text-center">
                    <p
                      style={{ fontFamily: "cursive" }}
                      className="text-lg text-gray-700"
                    >
                      {signatureInitials || "…"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload simulation */}
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Upload Signature Image
                </p>
                <div
                  className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
                  onClick={() => {
                    setUploadSimulated(true);
                  }}
                >
                  <PenLine className="w-5 h-5 text-gray-400" />
                  <p className="text-xs text-gray-500">
                    Click to upload signature file{" "}
                    <span className="text-gray-400">
                      (PNG, JPG — white background preferred)
                    </span>
                  </p>
                  {uploadSimulated && (
                    <p className="text-xs text-green-600 font-medium">
                      ✓ signature_file.png uploaded
                    </p>
                  )}
                </div>
              </div>

              {/* Document section preview */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                  How this appears on documents
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {["Sent By", "Approved By"].map((label) => (
                    <div
                      key={label}
                      className="bg-white border border-blue-100 rounded-lg p-3 space-y-1"
                    >
                      <p className="text-xs text-gray-400 uppercase tracking-wide">
                        {label}
                      </p>
                      <div className="border-b border-gray-200 pb-2 mb-2">
                        <p
                          style={{ fontFamily: "cursive" }}
                          className="text-lg text-gray-600"
                        >
                          {signatureInitials || "…"}
                        </p>
                      </div>
                      <p className="text-xs font-semibold text-gray-700">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500">{user.role}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                {(hasSignature || uploadSimulated) && (
                  <button
                    onClick={() => {
                      setHasSignature(false);
                      setUploadSimulated(false);
                      onUpdateSignature(user.id, false);
                    }}
                    className="px-4 py-2 text-sm border border-red-200 rounded-xl text-red-600 hover:bg-red-50"
                  >
                    Remove Signature
                  </button>
                )}
                <button
                  onClick={() => {
                    onUpdateSignature(user.id, true, signatureInitials);
                    setHasSignature(true);
                  }}
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2"
                >
                  <BadgeCheck className="w-4 h-4" /> Save Signature
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-2 shrink-0 bg-gray-50">
          <button
            onClick={() => setShowEditModal(true)}
            disabled={ctaBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-white transition-colors disabled:opacity-60"
          >
            <Edit className="w-4 h-4" />
            Edit User
          </button>
          <button
            onClick={async () => {
              setCtaBusy(true);
              try {
                await onResetPassword(user.email);
              } finally {
                setCtaBusy(false);
              }
            }}
            disabled={ctaBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-white transition-colors disabled:opacity-60"
          >
            <Lock className="w-4 h-4" />
            Reset Password
          </button>
          <div className="flex-1" />
          {user.status === "Active" && (
            <button
              onClick={async () => {
                setCtaBusy(true);
                try {
                  await onDeactivateUser(user.id);
                } finally {
                  setCtaBusy(false);
                }
              }}
              disabled={ctaBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
            >
              <XCircle className="w-4 h-4" />
              Deactivate User
            </button>
          )}
          {user.status === "Inactive" && (
            <button
              onClick={async () => {
                setCtaBusy(true);
                try {
                  await onActivateUser(user.id);
                } finally {
                  setCtaBusy(false);
                }
              }}
              disabled={ctaBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-emerald-200 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              Activate User
            </button>
          )}
        </div>
      </div>

      {showEditModal && (
        <EditUserModal
          user={user}
          onClose={() => setShowEditModal(false)}
          onSave={async (payload) => {
            await onEditUser(user.id, payload);
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}

// ── Edit User Modal ───────────────────────────────────────────────────────────
function EditUserModal({
  user,
  onClose,
  onSave,
}: {
  user: UserRecord;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    email: string;
    phone: string;
    role: string;
    department: string;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    department: user.department,
  });
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);
  const [roleOptions, setRoleOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      import("../../api/admin-extras").then(({ getAppRoles }) => getAppRoles()),
      getReferenceData(),
    ])
      .then(([roles, referenceData]) => {
        setRoleOptions(roles.map((r) => ({ id: r.id, name: r.name })));
        setDepartments(referenceData.departments);
      })
      .catch(() => {
        setError("Failed to load role and department options.");
      });
  }, []);

  const handleSubmit = async () => {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const role = form.role.trim();
    const department = form.department.trim();

    if (!name || !email || !role || !department) {
      setError("Name, email, role, and department are required.");
      return;
    }
    if (!NAME_PATTERN.test(name)) {
      setError(
        "Name can only include letters, spaces, hyphens, and apostrophes.",
      );
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (phone && !PHONE_PATTERN.test(phone)) {
      setError("Phone number can only contain digits.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onSave({
        name,
        email,
        phone,
        role,
        department,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update user profile.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Edit User</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value.replace(/[^A-Za-z\s'-]/g, ""),
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) =>
                setForm({
                  ...form,
                  phone: e.target.value.replace(/\D/g, ""),
                })
              }
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="+234 800 000 0000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
              {form.department &&
                !departments.some((d) => d.name === form.department) && (
                  <option value={form.department}>{form.department}</option>
                )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select role</option>
              {roleOptions.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
              {form.role && !roleOptions.some((r) => r.name === form.role) && (
                <option value={form.role}>{form.role}</option>
              )}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {loading ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add User Modal ────────────────────────────────────────────────────────────
function AddUserModal({
  onClose,
  onCreated,
  onInviteWarning,
}: {
  onClose: () => void;
  onCreated: (u: UserRecord) => void;
  onInviteWarning: (message: string) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "",
    department: "",
    assignedApps: ["ess"] as AppKey[],
  });
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roleOptions, setRoleOptions] = useState<
    { id: string; name: string }[]
  >([]);

  useEffect(() => {
    Promise.all([
      import("../../api/admin-extras").then(({ getAppRoles }) => getAppRoles()),
      getReferenceData(),
    ])
      .then(([roles, referenceData]) => {
        setRoleOptions(roles.map((r) => ({ id: r.id, name: r.name })));
        setDepartments(referenceData.departments);
        setForm((f) => ({
          ...f,
          role: f.role || "",
          department: f.department || referenceData.departments[0]?.name || "",
        }));
      })
      .catch(() => {
        setError("Failed to load role and department options.");
      });
  }, []);

  const toReadableError = (err: unknown) => {
    const fallback = "Failed to send invite. Please try again.";
    if (!(err instanceof Error)) return fallback;

    const text = err.message;
    const lower = text.toLowerCase();
    const match = text.match(/API error\s+\d+\s*:\s*(.+)$/i);
    if (!match?.[1]) {
      if (lower.includes("email already") || lower.includes("duplicate")) {
        return "This email is already in use. Try another email address.";
      }
      return text;
    }

    try {
      const payload = JSON.parse(match[1]) as {
        message?: string | string[];
      };
      if (Array.isArray(payload.message)) {
        const parsed = payload.message.join(" ");
        if (
          parsed.toLowerCase().includes("email already") ||
          parsed.toLowerCase().includes("duplicate")
        ) {
          return "This email is already in use. Try another email address.";
        }
        return parsed;
      }
      if (typeof payload.message === "string") {
        const parsed = payload.message;
        if (
          parsed.toLowerCase().includes("email already") ||
          parsed.toLowerCase().includes("duplicate")
        ) {
          return "This email is already in use. Try another email address.";
        }
        return parsed;
      }
      return text;
    } catch {
      if (lower.includes("email already") || lower.includes("duplicate")) {
        return "This email is already in use. Try another email address.";
      }
      return text;
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.role || !form.department) {
      setError("Name, email, role, and department are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const inviteResult = await inviteUser({
        name: form.name,
        email: form.email,
        role: form.role,
        department: form.department,
        assignedApps: form.assignedApps,
      });

      if (inviteResult.inviteEmailSent === false) {
        const inviteResultWithWarning = inviteResult as typeof inviteResult & {
          inviteEmailWarning?: string;
        };
        const warning =
          inviteResultWithWarning.inviteEmailWarning ||
          "Invite created, but email delivery failed.";
        const message = `${warning} Activation link: ${inviteResult.activationLink}`;
        onInviteWarning(message);
        console.warn("Invite email delivery warning:", message);
      }

      onCreated({
        id: inviteResult.id,
        userId:
          String((inviteResult as { userId?: string }).userId || "").trim() ||
          `BOS-${new Date().getUTCFullYear().toString().slice(-2)}${String(new Date().getUTCMonth() + 1).padStart(2, "0")}-${
            inviteResult.id
              .replace(/[^a-zA-Z0-9]/g, "")
              .slice(-4)
              .toUpperCase() || "0000"
          }`,
        name: form.name,
        email: form.email,
        phone: "",
        location: "",
        role: form.role,
        department: form.department,
        joinDate: formatDateByGeneralSettings(new Date()),
        status: "Pending",
        apps: form.assignedApps,
        lastActive: "Never",
        processes: [],
        activity: [],
        requests: [],
      });
      onClose();
    } catch (err) {
      setError(toReadableError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Add New User</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          {[
            {
              label: "Full Name",
              key: "name",
              type: "text",
              placeholder: "Jane Smith",
            },
            {
              label: "Email",
              key: "email",
              type: "email",
              placeholder: "jane@company.com",
            },
            {
              label: "Department",
              key: "department",
              type: "text",
              placeholder: "",
            },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
              </label>
              {key === "department" ? (
                <select
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={type}
                  placeholder={placeholder}
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select role</option>
              {roleOptions.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigned Applications
            </label>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 p-3">
              {ALL_APPS.map((app) => {
                const checked = form.assignedApps.includes(app.key);
                return (
                  <label
                    key={app.key}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={app.key === "ess"}
                      onChange={() => {
                        if (app.key === "ess") return;
                        setForm((prev) => ({
                          ...prev,
                          assignedApps: checked
                            ? prev.assignedApps.filter((k) => k !== app.key)
                            : [...prev.assignedApps, app.key],
                        }));
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{app.label}</span>
                    {app.key === "ess" && (
                      <span className="text-xs text-gray-400">(Default)</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {loading ? "Sending…" : "Send Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [appFilter, setAppFilter] = useState<AppKey | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [inviteWarning, setInviteWarning] = useState("");
  const [pendingDeleteUser, setPendingDeleteUser] = useState<UserRecord | null>(
    null,
  );
  const [deleteLoading, setDeleteLoading] = useState(false);

  const requestPasswordReset = async (email: string) => {
    const baseUrl = (
      import.meta.env.VITE_API_URL || "http://localhost:3001/api"
    ).replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      const raw = await response.text();
      throw new Error(raw || "Failed to send reset password email.");
    }
  };

  useEffect(() => {
    getUsers()
      .then((data) => setUsers(data.map(userFromApi)))
      .catch((error) => {
        console.error(error);
        toast.error("Failed to load users.");
      });
  }, []);

  useEffect(() => {
    if (!openMenuId) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-users-action-menu]")) return;
      setOpenMenuId(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenuId(null);
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuId]);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    const matchApp = appFilter === "all" || u.apps.includes(appFilter);
    return matchSearch && matchStatus && matchApp;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / USERS_PER_PAGE));
  const pageStartIndex = (currentPage - 1) * USERS_PER_PAGE;
  const paginatedUsers = filtered.slice(
    pageStartIndex,
    pageStartIndex + USERS_PER_PAGE,
  );
  const pageStart = filtered.length === 0 ? 0 : pageStartIndex + 1;
  const pageEnd = Math.min(pageStartIndex + USERS_PER_PAGE, filtered.length);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, appFilter]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "Active").length,
    pending: users.filter((u) => u.status === "Pending").length,
    inactive: users.filter((u) => u.status === "Inactive").length,
  };

  return (
    <div>
      {inviteWarning && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {inviteWarning}
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onCreated={(newUser) => {
            setUsers((prev) => [newUser, ...prev]);
            toast.success(`Invite sent to ${newUser.email}.`);
          }}
          onInviteWarning={(message) => setInviteWarning(message)}
        />
      )}

      <ConfirmationModal
        isOpen={Boolean(pendingDeleteUser)}
        title="Delete pending user?"
        description={
          pendingDeleteUser
            ? `This will permanently remove ${pendingDeleteUser.name}'s pending invite.`
            : ""
        }
        confirmLabel="Delete User"
        cancelLabel="Cancel"
        isDangerous={true}
        isLoading={deleteLoading}
        onCancel={() => {
          if (deleteLoading) return;
          setPendingDeleteUser(null);
        }}
        onConfirm={async () => {
          if (!pendingDeleteUser) return;
          setDeleteLoading(true);
          try {
            await deleteUser(pendingDeleteUser.id);
            setUsers((prev) =>
              prev.filter((u) => u.id !== pendingDeleteUser.id),
            );
            toast.success("Pending user deleted.");
            setPendingDeleteUser(null);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Failed to delete user.";
            toast.error(message);
          } finally {
            setDeleteLoading(false);
          }
        }}
      />

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailPanel
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdateSignature={() => {}}
          onUpdateApps={async (id, apps) => {
            try {
              const updated = await updateUser(id, { assignedApps: apps });
              const next = userFromApi(updated);
              setUsers((prev) => prev.map((u) => (u.id === id ? next : u)));
              setSelectedUser(next);
              toast.success("App access updated.");
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Failed to update app access.";
              toast.error(message);
            }
          }}
          onEditUser={async (id, payload) => {
            try {
              // Pass the user's existing app assignments so the backend does
              // not reset them when a role is included in the update.
              const current = users.find((u) => u.id === id);
              const updated = await updateUser(id, {
                ...payload,
                assignedApps: current?.apps,
              });
              const next = userFromApi(updated);
              setUsers((prev) => prev.map((u) => (u.id === id ? next : u)));
              setSelectedUser(next);
              toast.success("User profile updated.");
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Failed to update user profile.";
              toast.error(message);
              throw error instanceof Error ? error : new Error(message);
            }
          }}
          onResetPassword={async (email) => {
            try {
              await requestPasswordReset(email);
              toast.success("Password reset email sent.");
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Failed to send password reset email.";
              toast.error(message);
            }
          }}
          onDeactivateUser={async (id) => {
            try {
              const updated = await deactivateUser(id);
              const next = userFromApi(updated);
              setUsers((prev) => prev.map((u) => (u.id === id ? next : u)));
              setSelectedUser(next);
              toast.success("User deactivated.");
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Failed to deactivate user.";
              toast.error(message);
            }
          }}
          onActivateUser={async (id) => {
            try {
              const updated = await activateUser(id);
              const next = userFromApi(updated);
              setUsers((prev) => prev.map((u) => (u.id === id ? next : u)));
              setSelectedUser(next);
              toast.success("User activated.");
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Failed to activate user.";
              toast.error(message);
            }
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage users, app access, and process-level permissions
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Users", value: stats.total, color: "text-gray-900" },
          { label: "Active", value: stats.active, color: "text-emerald-600" },
          {
            label: "Pending Invite",
            value: stats.pending,
            color: "text-amber-500",
          },
          { label: "Inactive", value: stats.inactive, color: "text-gray-400" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              {s.label}
            </p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, email, role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as UserStatus | "all")
          }
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Inactive">Inactive</option>
        </select>
        <select
          value={appFilter}
          onChange={(e) => setAppFilter(e.target.value as AppKey | "all")}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Applications</option>
          {ALL_APPS.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-visible">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                User
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                User ID
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Role
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Assigned Applications
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Last Active
              </th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedUsers.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedUser(user)}
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
                  <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold tracking-wide text-gray-700">
                    {user.userId}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-700">{user.role}</span>
                    {user.hasSignature && (
                      <BadgeCheck
                        className="w-3.5 h-3.5 text-indigo-500 shrink-0"
                        aria-label="Signature on file"
                      />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[user.status]}`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  {user.apps.length === 0 ? (
                    <span className="text-xs text-gray-400 italic">
                      No access
                    </span>
                  ) : (
                    <div className="flex items-center gap-1 flex-wrap">
                      {user.apps.slice(0, 4).map((a) => (
                        <AppBadge key={a} appKey={a} size="xs" />
                      ))}
                      {user.apps.length > 4 && (
                        <span className="text-xs text-gray-400">
                          +{user.apps.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-sm text-gray-500">
                    {user.lastActive}
                  </span>
                </td>
                <td
                  className="px-4 py-3.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="relative flex justify-end"
                    data-users-action-menu
                  >
                    <button
                      onClick={() =>
                        setOpenMenuId(openMenuId === user.id ? null : user.id)
                      }
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {openMenuId === user.id && (
                      <div className="absolute right-0 top-8 z-20 w-44 rounded-lg border border-gray-200 bg-white shadow-lg p-1.5">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded text-sm text-gray-700 hover:bg-gray-50"
                        >
                          View profile
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard
                              .writeText(user.email)
                              .then(() => toast.success("Email copied."))
                              .catch(() =>
                                toast.error("Failed to copy email."),
                              );
                            setOpenMenuId(null);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Copy email
                        </button>
                        {user.status === "Active" && (
                          <button
                            onClick={async () => {
                              try {
                                const updated = await deactivateUser(user.id);
                                const next = userFromApi(updated);
                                setUsers((prev) =>
                                  prev.map((u) =>
                                    u.id === user.id ? next : u,
                                  ),
                                );
                                if (selectedUser?.id === user.id) {
                                  setSelectedUser(next);
                                }
                                toast.success(`${user.name} deactivated.`);
                              } catch (error) {
                                const message =
                                  error instanceof Error
                                    ? error.message
                                    : "Failed to deactivate user.";
                                toast.error(message);
                              } finally {
                                setOpenMenuId(null);
                              }
                            }}
                            className="w-full text-left px-2.5 py-2 rounded text-sm text-amber-700 hover:bg-amber-50"
                          >
                            Deactivate user
                          </button>
                        )}
                        {user.status === "Inactive" && (
                          <button
                            onClick={async () => {
                              try {
                                const updated = await activateUser(user.id);
                                const next = userFromApi(updated);
                                setUsers((prev) =>
                                  prev.map((u) =>
                                    u.id === user.id ? next : u,
                                  ),
                                );
                                if (selectedUser?.id === user.id) {
                                  setSelectedUser(next);
                                }
                                toast.success(`${user.name} activated.`);
                              } catch (error) {
                                const message =
                                  error instanceof Error
                                    ? error.message
                                    : "Failed to activate user.";
                                toast.error(message);
                              } finally {
                                setOpenMenuId(null);
                              }
                            }}
                            className="w-full text-left px-2.5 py-2 rounded text-sm text-emerald-700 hover:bg-emerald-50"
                          >
                            Activate user
                          </button>
                        )}
                        {user.status === "Pending" && (
                          <>
                            <button
                              onClick={async () => {
                                try {
                                  await resendInvite(user.id);
                                  setInviteWarning(
                                    `Invite resent to ${user.email}.`,
                                  );
                                  toast.success(
                                    `Invite resent to ${user.email}.`,
                                  );
                                } catch (err) {
                                  const message =
                                    err instanceof Error
                                      ? err.message
                                      : "Failed to resend invite.";
                                  setInviteWarning(message);
                                  toast.error(message);
                                } finally {
                                  setOpenMenuId(null);
                                }
                              }}
                              className="w-full text-left px-2.5 py-2 rounded text-sm text-indigo-700 hover:bg-indigo-50"
                            >
                              Resend invite
                            </button>
                            <button
                              onClick={() => {
                                setPendingDeleteUser(user);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-2.5 py-2 rounded text-sm text-red-600 hover:bg-red-50"
                            >
                              Delete user
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {paginatedUsers.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-10 text-center text-sm text-gray-400"
                >
                  No users found for the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
          <p className="text-sm text-gray-500">
            Showing {pageStart}-{pageEnd} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {pageNumbers.map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`min-w-8 px-2 py-1.5 text-sm rounded-lg border transition-colors ${
                    currentPage === page
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
