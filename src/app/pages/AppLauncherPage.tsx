import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  Building2,
  DollarSign,
  ShoppingCart,
  Users,
  UserCircle,
  Settings,
  Store,
  Search,
  Bell,
  X,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  Layers,
} from "lucide-react";
import { formatCurrencyByGeneralSettings } from "../utils/generalSettings";
import { useAuthUser } from "../utils/useAuthUser";
import { fetchProjects } from "../api/projects";
import { getTasks } from "../api/tasks";
import { getApprovals } from "../api/approvals";
import { fetchBudgets } from "../api/budgets";
import { fetchExpenses } from "../api/expenses";
import { fetchPayments } from "../api/payments";
import { fetchEmployees } from "../api/employees";
import { fetchLeaveRequests } from "../api/leave-requests";
import { getJobRoles } from "../api/job-roles";
import { getPurchaseRequests, getSentRFQs } from "../api/procurement-requests";
import { fetchPurchaseOrders } from "../api/purchase-orders";
import { fetchSuppliers } from "../api/suppliers";
import { getMaterials, getStores, getMaterialRequests } from "../api/materials";
import { fetchClaims } from "../api/claims";
import { getActivityHistory } from "../api/activity-history";
import {
  getAdminSystemSummary,
  getAdminActivityLog,
  getUsers,
} from "../api/admin-extras";
import { fetchAppCatalog, type AppCatalogItem } from "../api/app-catalog";

// ─── Types ────────────────────────────────────────────────────────────────────

type HoverVariant = "stats" | "activity" | "pulse";
interface Metric {
  label: string;
  value: string;
  trend?: "up" | "down" | "neutral";
  delta?: string;
}
interface DetailItem {
  label: string;
  value: string;
  sub: string;
}

interface AppDef {
  id: string;
  name: string;
  full: string;
  tagline: string;
  icon: React.ElementType;
  href: string;
  cardBg: string;
  border: string;
  stripe: string;
  accent: string;
  accentDim: string;
  textPrimary: string;
  textSecondary: string;
  cols: number;
  rows: number;
  metrics: Metric[];
  blurb: string;
  details: DetailItem[];
  recentActivity: string[];
}

const ICON_MAP: Record<string, React.ElementType> = {
  Building2,
  DollarSign,
  ShoppingCart,
  Users,
  UserCircle,
  Settings,
  Store,
};

const DEFAULT_APP_CATALOG: AppCatalogItem[] = [
  {
    id: "construction",
    name: "Projects",
    full: "BuildOS Projects",
    tagline: "Site execution · Timeline · Approvals",
    icon: "Building2",
    href: "/apps/construction",
    cardBg: "#f0f7ff",
    border: "#93c5fd",
    stripe: "#2563eb",
    accent: "#1d4ed8",
    accentDim: "#dbeafe",
    textPrimary: "#1e3a8a",
    textSecondary: "#3b82f6",
    cols: 2,
    rows: 2,
  },
  {
    id: "finance",
    name: "Finance",
    full: "BuildOS Finance",
    tagline: "Budgets · Expenses · Payroll",
    icon: "DollarSign",
    href: "/apps/finance",
    cardBg: "#f0fdf6",
    border: "#6ee7b7",
    stripe: "#059669",
    accent: "#047857",
    accentDim: "#d1fae5",
    textPrimary: "#064e3b",
    textSecondary: "#10b981",
    cols: 1,
    rows: 2,
  },
  {
    id: "hr",
    name: "HR",
    full: "BuildOS HR",
    tagline: "People · Payroll · Leave",
    icon: "Users",
    href: "/apps/hr",
    cardBg: "#fffbeb",
    border: "#fcd34d",
    stripe: "#d97706",
    accent: "#b45309",
    accentDim: "#fef3c7",
    textPrimary: "#78350f",
    textSecondary: "#d97706",
    cols: 1,
    rows: 1,
  },
  {
    id: "procurement",
    name: "Procurement",
    full: "BuildOS Procurement",
    tagline: "RFQ · PO · Vendor Management",
    icon: "ShoppingCart",
    href: "/apps/procurement",
    cardBg: "#faf5ff",
    border: "#c4b5fd",
    stripe: "#7c3aed",
    accent: "#6d28d9",
    accentDim: "#ede9fe",
    textPrimary: "#4c1d95",
    textSecondary: "#7c3aed",
    cols: 1,
    rows: 1,
  },
  {
    id: "storefront",
    name: "Storefront",
    full: "BuildOS Storefront",
    tagline: "Inventory · Materials · Stores",
    icon: "Store",
    href: "/apps/storefront",
    cardBg: "#f0fdfa",
    border: "#5eead4",
    stripe: "#0d9488",
    accent: "#0f766e",
    accentDim: "#ccfbf1",
    textPrimary: "#134e4a",
    textSecondary: "#0d9488",
    cols: 1,
    rows: 1,
  },
  {
    id: "ess",
    name: "ESS",
    full: "BuildOS ESS",
    tagline: "Self-Service · Pay Slips · Requests",
    icon: "UserCircle",
    href: "/apps/ess",
    cardBg: "#eef2ff",
    border: "#a5b4fc",
    stripe: "#4f46e5",
    accent: "#4338ca",
    accentDim: "#e0e7ff",
    textPrimary: "#312e81",
    textSecondary: "#6366f1",
    cols: 1,
    rows: 1,
  },
  {
    id: "admin",
    name: "Admin",
    full: "BuildOS Admin",
    tagline: "Users · Roles · System Settings",
    icon: "Settings",
    href: "/apps/admin",
    cardBg: "#f8fafc",
    border: "#cbd5e1",
    stripe: "#475569",
    accent: "#334155",
    accentDim: "#e2e8f0",
    textPrimary: "#0f172a",
    textSecondary: "#64748b",
    cols: 2,
    rows: 1,
  },
];

function mapCatalogItem(item: AppCatalogItem): AppDef {
  const icon = ICON_MAP[item.icon] ?? Layers;
  return {
    ...item,
    icon,
    metrics: [],
    blurb: "",
    details: [],
    recentActivity: [],
  };
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatCurrency(amount: number) {
  return formatCurrencyByGeneralSettings(Number.isFinite(amount) ? amount : 0, {
    maximumFractionDigits: 0,
  });
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function lower(value: string | undefined | null) {
  return (value ?? "").toLowerCase();
}

function isPendingStatus(status: string | undefined) {
  const s = lower(status).replace(/\s+/g, "");
  return ["pending", "underreview", "open", "requested", "submitted"].includes(
    s,
  );
}

function isClosedStatus(status: string | undefined) {
  const s = lower(status).replace(/\s+/g, "");
  return ["done", "completed", "closed", "resolved", "paid"].includes(s);
}

function toActivityLine(item: {
  action?: string;
  description?: string;
  module?: string;
  createdAt?: string;
}) {
  const action = item.description || item.action || "Updated";
  const module = item.module ? ` (${item.module})` : "";
  return `${action}${module}`;
}

function pickRecent(lines: string[], limit = 3) {
  return lines.filter(Boolean).slice(0, limit);
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

// ─── API composition ──────────────────────────────────────────────────────────

async function buildAppsFromApi(authName?: string): Promise<AppDef[]> {
  const [
    rawCatalog,
    rawProjects,
    rawTasks,
    rawApprovals,
    rawBudgets,
    rawExpenses,
    rawPayments,
    rawEmployees,
    rawLeaveRequests,
    rawJobRoles,
    rawPurchaseRequests,
    rawSentRfqs,
    rawPurchaseOrders,
    rawSuppliers,
    rawMaterials,
    rawStores,
    rawMaterialRequests,
    rawClaims,
    rawActivity,
    adminSummary,
    rawAdminActivity,
    rawUsers,
  ] = await Promise.all([
    safe(() => fetchAppCatalog(), []),
    safe(() => fetchProjects(), []),
    safe(() => getTasks(), []),
    safe(() => getApprovals(), []),
    safe(() => fetchBudgets(), []),
    safe(() => fetchExpenses(), []),
    safe(() => fetchPayments(), []),
    safe(() => fetchEmployees(), []),
    safe(() => fetchLeaveRequests(), []),
    safe(() => getJobRoles(), []),
    safe(() => getPurchaseRequests(), []),
    safe(() => getSentRFQs(), []),
    safe(() => fetchPurchaseOrders(), []),
    safe(() => fetchSuppliers(), []),
    safe(() => getMaterials(), []),
    safe(() => getStores(), []),
    safe(() => getMaterialRequests(), []),
    safe(() => fetchClaims(), []),
    safe(() => getActivityHistory(), []),
    safe(() => getAdminSystemSummary(), null),
    safe(() => getAdminActivityLog(), []),
    safe(() => getUsers(), []),
  ]);

  const asArray = <T,>(value: unknown): T[] =>
    Array.isArray(value) ? (value as T[]) : [];

  const catalog = asArray<AppCatalogItem>(rawCatalog);
  const projects = asArray<any>(rawProjects);
  const tasks = asArray<any>(rawTasks);
  const approvals = asArray<any>(rawApprovals);
  const budgets = asArray<any>(rawBudgets);
  const expenses = asArray<any>(rawExpenses);
  const payments = asArray<any>(rawPayments);
  const employees = asArray<any>(rawEmployees);
  const leaveRequests = asArray<any>(rawLeaveRequests);
  const jobRoles = asArray<any>(rawJobRoles);
  const purchaseRequests = asArray<any>(rawPurchaseRequests);
  const sentRfqs = asArray<any>(rawSentRfqs);
  const purchaseOrders = asArray<any>(rawPurchaseOrders);
  const suppliers = asArray<any>(rawSuppliers);
  const materials = asArray<any>(rawMaterials);
  const stores = asArray<any>(rawStores);
  const materialRequests = asArray<any>(rawMaterialRequests);
  const claims = asArray<any>(rawClaims);
  const activity = asArray<any>(rawActivity);
  const adminActivity = asArray<any>(rawAdminActivity);
  const users = asArray<any>(rawUsers);

  const activityBy = (keys: string[]) =>
    activity
      .filter((a) => keys.some((k) => lower(a.module).includes(k)))
      .map(toActivityLine);

  const constructionProjects = projects;
  const constructionTasks = tasks.filter((t) =>
    lower((t as { projectName?: string }).projectName).includes("project"),
  );
  const projectProgressAvg = Math.round(
    average(
      constructionProjects
        .map((p) => Number((p as { progress?: number }).progress ?? 0))
        .filter((v) => Number.isFinite(v)),
    ),
  );
  const constructionPendingApprovals = approvals.filter((a) =>
    isPendingStatus((a as { status?: string }).status),
  ).length;

  const totalBudget = budgets.reduce(
    (acc, b) => acc + Number((b as { totalBudget?: number }).totalBudget ?? 0),
    0,
  );
  const totalSpent = budgets.reduce(
    (acc, b) => acc + Number((b as { spent?: number }).spent ?? 0),
    0,
  );
  const budgetUsedPct =
    totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const pendingPayments = payments.filter(
    (p) => !isClosedStatus((p as { status?: string }).status),
  );
  const pendingLeave = leaveRequests.filter((r) =>
    isPendingStatus((r as { status?: string }).status),
  ).length;

  const pendingPos = purchaseOrders.filter(
    (po) => !isClosedStatus((po as { status?: string }).status),
  ).length;
  const avgSupplierRating = Math.round(
    average(
      suppliers
        .map((s) => Number((s as { rating?: number }).rating ?? 0))
        .filter((n) => Number.isFinite(n) && n > 0),
    ),
  );

  const lowStock = materials.filter(
    (m) =>
      Number((m as { availableQty?: number }).availableQty ?? 0) <=
      Number((m as { reorderLevel?: number }).reorderLevel ?? 0),
  ).length;

  const authNameLower = lower(authName);
  const myClaims = claims.filter((c) =>
    authNameLower
      ? lower((c as { employee?: string }).employee).includes(authNameLower)
      : true,
  );
  const myLeaves = leaveRequests.filter((r) =>
    authNameLower
      ? lower((r as { employee?: string }).employee).includes(authNameLower)
      : true,
  );

  const dynamicById: Record<
    string,
    Pick<AppDef, "metrics" | "blurb" | "details" | "recentActivity">
  > = {
    construction: {
      metrics: [
        {
          label: "Active Projects",
          value: String(constructionProjects.length),
          trend: "up",
          delta: `${constructionProjects.length} live`,
        },
        {
          label: "Pending Approvals",
          value: String(constructionPendingApprovals),
          trend: "down",
          delta: `${Math.max(0, constructionPendingApprovals - 3)} overdue`,
        },
        {
          label: "On-Time Rate",
          value: `${projectProgressAvg}%`,
          trend: "up",
          delta: "vs 68% avg",
        },
        {
          label: "Punch Items",
          value: String(
            constructionTasks.filter(
              (t) => !isClosedStatus((t as { status?: string }).status),
            ).length,
          ),
          trend: "neutral",
          delta: `${constructionProjects.length} projects`,
        },
      ],
      blurb:
        "Oversee projects, track timelines and manage site approvals end-to-end.",
      details: [
        {
          label: "Active Projects",
          value: String(constructionProjects.length),
          sub: "Site execution in progress",
        },
        {
          label: "Pending Approvals",
          value: String(constructionPendingApprovals),
          sub: `${Math.max(0, constructionPendingApprovals - 2)} overdue by >2 days`,
        },
        {
          label: "On-Time Delivery",
          value: `${projectProgressAvg}%`,
          sub: "Industry avg: 68%",
        },
        {
          label: "Open Punch Items",
          value: String(
            constructionTasks.filter(
              (t) => !isClosedStatus((t as { status?: string }).status),
            ).length,
          ),
          sub: `Across ${constructionProjects.length} projects`,
        },
      ],
      recentActivity: pickRecent([
        ...activityBy(["construction", "project"]),
        ...constructionProjects
          .slice(0, 3)
          .map(
            (p) =>
              `${(p as { name?: string }).name ?? "Project"} — ${(p as { status?: string }).status ?? "updated"}`,
          ),
      ]),
    },
    finance: {
      metrics: [
        {
          label: "Budget Used",
          value: `${budgetUsedPct}%`,
          trend: "neutral",
          delta: `${formatCurrency(totalBudget - totalSpent)} left`,
        },
        {
          label: "Pending Payments",
          value: String(pendingPayments.length),
          trend: "down",
          delta: formatCurrency(
            pendingPayments.reduce(
              (acc, p) => acc + Number((p as { amount?: number }).amount ?? 0),
              0,
            ),
          ),
        },
        {
          label: "Variance",
          value:
            totalBudget > 0
              ? `${((totalSpent / totalBudget - 1) * 100).toFixed(1)}%`
              : "0%",
          trend: totalSpent > totalBudget ? "down" : "up",
          delta: totalSpent > totalBudget ? "above plan" : "under plan",
        },
      ],
      blurb:
        "Track budgets, manage expenses, process payroll and generate financial reports.",
      details: [
        {
          label: "Budget Utilised",
          value: `${budgetUsedPct}%`,
          sub: `${formatCurrency(totalBudget - totalSpent)} remaining`,
        },
        {
          label: "Pending Payments",
          value: String(pendingPayments.length),
          sub: `${formatCurrency(
            pendingPayments.reduce(
              (acc, p) => acc + Number((p as { amount?: number }).amount ?? 0),
              0,
            ),
          )} total outstanding`,
        },
        {
          label: "Expense Claims",
          value: String(expenses.length),
          sub: "Awaiting approval",
        },
        {
          label: "Payroll Status",
          value: "Ready",
          sub: "Run not yet processed",
        },
      ],
      recentActivity: pickRecent([
        ...activityBy(["finance", "payment", "expense", "budget"]),
        ...pendingPayments
          .slice(0, 3)
          .map(
            (p) =>
              `Payment ${(p as { reference?: string }).reference ?? (p as { id?: string }).id ?? ""} — ${(p as { status?: string }).status ?? "pending"}`,
          ),
      ]),
    },
    hr: {
      metrics: [
        {
          label: "Headcount",
          value: String(employees.length),
          trend: "up",
          delta: "live",
        },
        {
          label: "Leave Req.",
          value: String(leaveRequests.length),
          trend: "neutral",
          delta: `${pendingLeave} pending`,
        },
        {
          label: "Open Roles",
          value: String(jobRoles.length),
          trend: "neutral",
          delta: "live",
        },
      ],
      blurb: "Centralise employee records, leave, recruitment and payroll.",
      details: [
        {
          label: "Total Headcount",
          value: String(employees.length),
          sub: "Active employees on record",
        },
        {
          label: "Leave Requests",
          value: String(leaveRequests.length),
          sub: `${pendingLeave} pending manager review`,
        },
        {
          label: "Open Roles",
          value: String(jobRoles.length),
          sub: "Active job role definitions",
        },
        {
          label: "Claims Filed",
          value: String(claims.length),
          sub: "Awaiting sign-off",
        },
      ],
      recentActivity: pickRecent([
        ...activityBy(["hr", "employee", "leave"]),
        ...employees
          .slice(0, 3)
          .map((e) =>
            `${(e as { firstName?: string; lastName?: string }).firstName ?? ""} ${(e as { lastName?: string }).lastName ?? ""}`.trim(),
          )
          .filter(Boolean),
      ]),
    },
    procurement: {
      metrics: [
        {
          label: "Open RFQs",
          value: String(sentRfqs.length),
          trend: "neutral",
          delta: `${sentRfqs.length} pending`,
        },
        {
          label: "Pending POs",
          value: String(pendingPos),
          trend: "neutral",
          delta: formatCurrency(
            purchaseOrders
              .filter(
                (po) => !isClosedStatus((po as { status?: string }).status),
              )
              .reduce(
                (acc, po) =>
                  acc +
                  Number(
                    (po as { totalAmount?: number }).totalAmount ??
                      (po as { amount?: number }).amount ??
                      0,
                  ),
                0,
              ),
          ),
        },
        {
          label: "Supplier Rtg",
          value: `${avgSupplierRating || 0}%`,
          trend: "up",
          delta: "top tier",
        },
      ],
      blurb: "End-to-end procurement from material requests to PO approval.",
      details: [
        {
          label: "Open RFQs",
          value: String(sentRfqs.length),
          sub: `${purchaseRequests.filter((r) => isPendingStatus((r as { status?: string }).status)).length} quotes pending`,
        },
        {
          label: "Pending POs",
          value: String(pendingPos),
          sub: `${formatCurrency(
            purchaseOrders
              .filter(
                (po) => !isClosedStatus((po as { status?: string }).status),
              )
              .reduce(
                (acc, po) =>
                  acc +
                  Number(
                    (po as { totalAmount?: number }).totalAmount ??
                      (po as { amount?: number }).amount ??
                      0,
                  ),
                0,
              ),
          )} combined value`,
        },
        {
          label: "Active Suppliers",
          value: String(suppliers.length),
          sub: "On approved vendor list",
        },
        {
          label: "GRN Awaiting",
          value: String(
            purchaseOrders.filter((po) =>
              ["delivered", "in transit", "in-transit"].some((s) =>
                lower((po as { status?: string }).status).includes(s),
              ),
            ).length,
          ),
          sub: "Goods not yet confirmed",
        },
      ],
      recentActivity: pickRecent([
        ...activityBy(["procurement", "rfq", "purchase"]),
        ...purchaseRequests
          .slice(0, 3)
          .map(
            (r) =>
              `${(r as { prRef?: string }).prRef ?? "Request"} — ${(r as { status?: string }).status ?? "updated"}`,
          ),
      ]),
    },
    storefront: {
      metrics: [
        {
          label: "Total SKUs",
          value: String(materials.length),
          trend: "up",
          delta: `${lowStock} low stock`,
        },
        {
          label: "Stores",
          value: String(stores.length),
          trend: "neutral",
          delta: "active",
        },
        {
          label: "Low Stock",
          value: String(lowStock),
          trend: "down",
          delta: "needs reorder",
        },
      ],
      blurb: "Manage store levels, consumable and reusable material flows.",
      details: [
        {
          label: "Total SKUs",
          value: String(materials.length),
          sub: `${lowStock} at low/out-of-stock`,
        },
        {
          label: "Active Stores",
          value: String(stores.length),
          sub: "Spanning hierarchy levels",
        },
        {
          label: "Reusable Items",
          value: String(
            materials.filter((m) =>
              ["reusable", "equipment", "tool"].some((k) =>
                lower(
                  (m as { type?: string; category?: string }).type ??
                    (m as { type?: string; category?: string }).category,
                ).includes(k),
              ),
            ).length,
          ),
          sub: "Currently tracked in stores",
        },
        {
          label: "Pending Receipts",
          value: String(
            materialRequests.filter((r) =>
              isPendingStatus((r as { status?: string }).status),
            ).length,
          ),
          sub: "Deliveries unconfirmed",
        },
      ],
      recentActivity: pickRecent([
        ...activityBy(["store", "material", "inventory"]),
        ...materials
          .slice(0, 3)
          .map(
            (m) =>
              `${(m as { name?: string }).name ?? "Material"} — ${(m as { availableQty?: number }).availableQty ?? 0} available`,
          ),
      ]),
    },
    ess: {
      metrics: [
        {
          label: "Leave Balance",
          value: `${myLeaves.filter((r) => isClosedStatus((r as { status?: string }).status)).length}d`,
          trend: "neutral",
          delta: `${myLeaves.length} total`,
        },
        {
          label: "My Requests",
          value: String(
            myClaims.length +
              myLeaves.filter((r) =>
                isPendingStatus((r as { status?: string }).status),
              ).length,
          ),
          trend: "neutral",
          delta: `${myLeaves.filter((r) => isPendingStatus((r as { status?: string }).status)).length} pending`,
        },
        {
          label: "Expense Claims",
          value: String(myClaims.length),
          trend: "neutral",
          delta: "live",
        },
      ],
      blurb: "Access pay slips, apply for leave and manage your personal data.",
      details: [
        {
          label: "Leave Balance",
          value: `${myLeaves.filter((r) => isClosedStatus((r as { status?: string }).status)).length}d`,
          sub: `${myLeaves.length} days taken year-to-date`,
        },
        {
          label: "Pending Requests",
          value: String(
            myLeaves.filter((r) =>
              isPendingStatus((r as { status?: string }).status),
            ).length +
              myClaims.filter((c) =>
                isPendingStatus((c as { status?: string }).status),
              ).length,
          ),
          sub: "Awaiting approval",
        },
        {
          label: "Leave Requests",
          value: String(myLeaves.length),
          sub: "Matched by logged-in user",
        },
        {
          label: "Expense Claims",
          value: String(myClaims.length),
          sub: "Filed by logged-in user",
        },
      ],
      recentActivity: pickRecent([
        ...activity
          .filter((a) =>
            authNameLower ? lower(a.userName).includes(authNameLower) : false,
          )
          .map(toActivityLine),
        ...myLeaves
          .slice(0, 3)
          .map(
            (r) =>
              `Leave ${(r as { refId?: string }).refId ?? "request"} — ${(r as { status?: string }).status ?? "updated"}`,
          ),
      ]),
    },
    admin: {
      metrics: [
        {
          label: "Total Users",
          value: String(adminSummary?.users ?? users.length),
          trend: "up",
          delta:
            adminSummary?.usersThisMonth != null
              ? `+${adminSummary.usersThisMonth} this month`
              : "live",
        },
        {
          label: "System Health",
          value:
            adminSummary?.healthPercent != null
              ? `${Math.round(adminSummary.healthPercent)}%`
              : "N/A",
          trend: "neutral",
          delta: "all green",
        },
        {
          label: "Open Tickets",
          value: String(
            adminSummary?.openTickets ?? adminSummary?.pendingApprovals ?? 0,
          ),
          trend: "neutral",
          delta: "live",
        },
      ],
      blurb: "Manage users, roles, permissions and system configuration",
      details: [
        {
          label: "Total Users",
          value: String(adminSummary?.users ?? users.length),
          sub: `${users.filter((u) => !(u as { active?: boolean }).active).length} inactive accounts`,
        },
        {
          label: "System Health",
          value: (adminSummary?.health?.status || "OK").toUpperCase(),
          sub: "All services operational",
        },
        {
          label: "Open Tickets",
          value: String(
            adminSummary?.openTickets ?? adminSummary?.pendingApprovals ?? 0,
          ),
          sub: "Last incident: tracked in audit log",
        },
        {
          label: "Pending Invites",
          value: String(adminSummary?.pendingInvites ?? 0),
          sub: "Awaiting user acceptance",
        },
      ],
      recentActivity: pickRecent([
        ...adminActivity
          .map((a) => `${a.actor} ${a.action} ${a.subject}`.trim())
          .filter(Boolean),
        ...activityBy(["admin", "role", "user"]),
      ]),
    },
  };

  const catalogSource = catalog.length > 0 ? catalog : DEFAULT_APP_CATALOG;

  return catalogSource.map((item) => {
    const meta = mapCatalogItem(item);
    return {
      ...meta,
      ...(dynamicById[meta.id] ?? {
        metrics: [],
        blurb: "",
        details: [],
        recentActivity: [],
      }),
    };
  });
}

// ─── Grid helpers ─────────────────────────────────────────────────────────────

const colSpan: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
};
const rowSpan: Record<number, string> = {
  1: "row-span-1",
  2: "row-span-2",
  3: "row-span-3",
};

// ─── Animated counter ─────────────────────────────────────────────────────────

function Counter({ to, duration = 0.8 }: { to: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / (duration * 1000), 1);
      setDisplay(Math.floor(pct * to));
      if (pct < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [to, duration]);
  return <>{display}</>;
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({
  color,
  values = [3, 5, 4, 8, 6, 9, 7, 11, 10, 13],
}: {
  color: string;
  values?: number[];
}) {
  const max = Math.max(...values);
  const w = 80,
    h = 24;
  const pts = values
    .map(
      (v, i) =>
        `${(i / (values.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`,
    )
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline
        points={pts}
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={w}
        cy={h - (values[values.length - 1] / max) * (h - 4) - 2}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

// ─── Trend badge ──────────────────────────────────────────────────────────────

function TrendBadge({
  trend,
  delta,
}: {
  trend: Metric["trend"];
  delta?: string;
}) {
  const arrow = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  const color =
    trend === "up" ? "#15803d" : trend === "down" ? "#b91c1c" : "#64748b";
  return (
    <span style={{ color }} className="text-[10px] font-semibold">
      {arrow} {delta}
    </span>
  );
}

// ─── Hover variant A — Stats grid ─────────────────────────────────────────────

function HoverStats({ app, isLarge }: { app: AppDef; isLarge: boolean }) {
  return (
    <motion.div
      className="absolute inset-0 p-4 flex flex-col gap-2.5"
      style={{ background: app.cardBg }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: app.accentDim }}
        >
          <app.icon style={{ color: app.accent }} className="w-3.5 h-3.5" />
        </div>
        <span style={{ color: app.textPrimary }} className="text-xs font-bold">
          {app.name}
        </span>
      </div>
      <div
        className={`grid gap-2 flex-1 ${isLarge ? "grid-cols-2" : "grid-cols-1"}`}
      >
        {app.metrics.slice(0, isLarge ? 4 : 2).map((m, i) => (
          <motion.div
            key={m.label}
            className="rounded-xl p-2.5 flex flex-col gap-1"
            style={{
              background: app.accentDim,
              border: `1px solid ${app.border}`,
            }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
          >
            <div
              style={{ color: app.accent }}
              className="text-lg font-black leading-none"
            >
              {m.value}
            </div>
            <div
              style={{ color: app.textSecondary }}
              className="text-[9px] leading-tight"
            >
              {m.label}
            </div>
            <TrendBadge trend={m.trend} delta={m.delta} />
          </motion.div>
        ))}
      </div>
      {isLarge && (
        <div className="pt-2">
          <Sparkline color={app.accent} />
        </div>
      )}
    </motion.div>
  );
}

// ─── Hover variant B — Activity feed ──────────────────────────────────────────

function HoverActivity({ app, isLarge }: { app: AppDef; isLarge: boolean }) {
  return (
    <motion.div
      className="absolute inset-0 p-4 flex flex-col gap-2"
      style={{ background: app.cardBg }}
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 14 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <app.icon style={{ color: app.accent }} className="w-4 h-4" />
        <span
          style={{ color: app.textSecondary }}
          className="text-[10px] font-semibold uppercase tracking-widest"
        >
          Live Activity
        </span>
      </div>
      <div className="flex flex-col gap-2 flex-1">
        {app.recentActivity.map((item, i) => (
          <motion.div
            key={i}
            className="flex items-start gap-2"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
              style={{ background: app.stripe }}
            />
            <p
              style={{ color: app.textPrimary }}
              className="text-[11px] leading-snug"
            >
              {item}
            </p>
          </motion.div>
        ))}
      </div>
      {isLarge && (
        <div
          className="flex gap-2 pt-2 mt-auto"
          style={{ borderTop: `1px solid ${app.border}` }}
        >
          {app.metrics.slice(0, 3).map((m) => (
            <div
              key={m.label}
              className="flex-1 rounded-lg px-2 py-1.5"
              style={{ background: app.accentDim }}
            >
              <div style={{ color: app.accent }} className="text-sm font-black">
                {m.value}
              </div>
              <div style={{ color: app.textSecondary }} className="text-[9px]">
                {m.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Hover variant C — Pulse metric ───────────────────────────────────────────

function HoverPulse({ app, isLarge }: { app: AppDef; isLarge: boolean }) {
  const primary = app.metrics[0];
  const numVal = parseInt((primary?.value ?? "0").replace(/[^0-9]/g, ""));
  const isNumeric = !isNaN(numVal) && numVal > 0;
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4"
      style={{ background: app.cardBg }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="rounded-2xl w-14 h-14 flex items-center justify-center"
        style={{ background: app.accentDim, border: `2px solid ${app.border}` }}
        initial={{ scale: 0.5, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        <app.icon style={{ color: app.accent }} className="w-7 h-7" />
      </motion.div>
      <motion.div
        style={{ color: app.accent }}
        className="text-4xl font-black tracking-tight"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {isNumeric ? <Counter to={numVal} /> : primary?.value}
      </motion.div>
      <motion.p
        style={{ color: app.textSecondary }}
        className="text-[11px] text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.18 }}
      >
        {primary?.label}
      </motion.p>
      <TrendBadge trend={primary?.trend} delta={primary?.delta} />
      {isLarge && (
        <motion.p
          style={{ color: app.textSecondary }}
          className="text-[11px] text-center max-w-[200px] leading-relaxed opacity-70 mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.24 }}
        >
          {app.blurb}
        </motion.p>
      )}
    </motion.div>
  );
}

// ─── Bento Card ───────────────────────────────────────────────────────────────

function BentoCard({
  app,
  onOpen,
  revealIndex,
}: {
  app: AppDef;
  onOpen: (a: AppDef) => void;
  revealIndex: number;
}) {
  const [hovered, setHovered] = useState(false);
  const variantRef = useRef<HoverVariant>("stats");
  const cycleRef = useRef(0);
  const variants: HoverVariant[] = ["stats", "activity", "pulse"];
  const isLarge = app.cols >= 2 || app.rows >= 2;

  return (
    <motion.div
      className={`${colSpan[app.cols]} ${rowSpan[app.rows]} relative rounded-2xl overflow-hidden cursor-pointer`}
      style={{
        background: app.cardBg,
        border: `1.5px solid ${app.border}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
      initial={{ opacity: 0, y: 16, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        opacity: { duration: 0.24, delay: revealIndex * 0.06 },
        y: { duration: 0.28, delay: revealIndex * 0.06, ease: "easeOut" },
        scale: { duration: 0.28, delay: revealIndex * 0.06, ease: "easeOut" },
      }}
      onMouseEnter={() => {
        variantRef.current = variants[cycleRef.current % 3] as HoverVariant;
        cycleRef.current++;
        setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(app)}
      whileHover={{
        scale: 1.012,
        boxShadow: `0 8px 32px ${app.stripe}28, 0 1px 6px rgba(0,0,0,0.08)`,
      }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      {/* Top accent stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: app.stripe }}
      />

      {/* Large ambient icon on big cards */}
      {isLarge && (
        <app.icon
          className="absolute bottom-3 right-3 w-28 h-28 pointer-events-none"
          style={{ color: app.stripe, opacity: 0.07 }}
        />
      )}

      {/* Default face */}
      <motion.div
        className="absolute inset-0 pt-5 p-4 flex flex-col"
        animate={{ opacity: hovered ? 0 : 1, y: hovered ? -6 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-start justify-between">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: app.accentDim }}
          >
            <app.icon
              style={{ color: app.accent }}
              className="w-[18px] h-[18px]"
            />
          </div>
          <ArrowUpRight
            className="w-4 h-4 opacity-25"
            style={{ color: app.accent }}
          />
        </div>
        <div className="mt-2.5">
          <h2
            style={{ color: app.textPrimary }}
            className="text-sm font-bold leading-tight"
          >
            {app.name}
          </h2>
          <p
            style={{ color: app.textSecondary }}
            className="text-[10px] mt-0.5 opacity-70"
          >
            {app.tagline}
          </p>
        </div>
        {isLarge && (
          <p
            style={{ color: app.textSecondary }}
            className="text-xs mt-1.5 leading-relaxed opacity-60 max-w-xs"
          >
            {app.blurb}
          </p>
        )}
        <div className="mt-auto flex flex-wrap gap-1.5">
          {app.metrics.slice(0, isLarge ? 3 : 2).map((m) => (
            <div
              key={m.label}
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold flex items-center gap-1"
              style={{ background: app.accentDim, color: app.textSecondary }}
            >
              <span style={{ color: app.accent }}>{m.value}</span>
              <span className="opacity-60">{m.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Hover content */}
      <AnimatePresence mode="wait">
        {hovered &&
          (variantRef.current === "stats" ? (
            <HoverStats key="s" app={app} isLarge={isLarge} />
          ) : variantRef.current === "activity" ? (
            <HoverActivity key="a" app={app} isLarge={isLarge} />
          ) : (
            <HoverPulse key="p" app={app} isLarge={isLarge} />
          ))}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Detail Overlay ───────────────────────────────────────────────────────────

function DetailOverlay({ app, onClose }: { app: AppDef; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        className="relative w-full max-w-lg z-10 rounded-2xl overflow-hidden bg-white shadow-2xl"
        style={{ border: `1.5px solid ${app.border}` }}
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
      >
        {/* Accent stripe */}
        <div className="h-1" style={{ background: app.stripe }} />

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3.5">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: app.accentDim }}
            >
              <app.icon style={{ color: app.accent }} className="w-5 h-5" />
            </div>
            <div>
              <h2
                style={{ color: app.textPrimary }}
                className="text-base font-bold"
              >
                {app.full}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">{app.blurb}</p>
            </div>
          </div>
          <button
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Detail grid */}
        <div className="grid grid-cols-2 gap-3 px-6 py-4">
          {app.details.map((d, i) => (
            <motion.div
              key={d.label}
              className="rounded-xl p-3.5 border border-gray-100"
              style={{ background: app.accentDim }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div style={{ color: app.accent }} className="text-xl font-black">
                {d.value}
              </div>
              <div
                style={{ color: app.textPrimary }}
                className="text-xs font-semibold mt-0.5"
              >
                {d.label}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">{d.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Activity */}
        <div className="px-6 pb-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">
            Recent Activity
          </p>
          <div className="space-y-2">
            {app.recentActivity.map((item, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-2.5"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + i * 0.06 }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  style={{ background: app.stripe }}
                />
                <p className="text-xs text-gray-500 leading-relaxed">{item}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-5 flex gap-3">
          <button
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            onClick={onClose}
          >
            ← Back
          </button>
          <button
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:brightness-95 transition-all text-white"
            style={{ background: app.accent }}
            onClick={() => navigate(app.href)}
          >
            Enter {app.name} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── App Dropdown ────────────────────────────────────────────────────────────

function AppDropdown({
  onOpen,
  apps,
}: {
  onOpen: (a: AppDef) => void;
  apps: AppDef[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors"
      >
        <Layers className="w-3.5 h-3.5 text-gray-400" />
        Applications
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute left-0 top-full mt-1.5 w-72 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                All Applications
              </p>
            </div>
            <div className="py-1 max-h-80 overflow-y-auto">
              {apps.map((app) => (
                <button
                  key={app.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => {
                    setOpen(false);
                    onOpen(app);
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: app.accentDim }}
                  >
                    <app.icon
                      className="w-4 h-4"
                      style={{ color: app.accent }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">
                      {app.name}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {app.tagline}
                    </p>
                  </div>
                  <div
                    className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: app.stripe }}
                  />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Top Nav ──────────────────────────────────────────────────────────────────

function TopNav({
  searchQuery,
  onSearch,
  onOpen,
  apps,
}: {
  searchQuery: string;
  onSearch: (v: string) => void;
  onOpen: (a: AppDef) => void;
  apps: AppDef[];
}) {
  const { initials } = useAuthUser();

  return (
    <div className="shrink-0 h-14 bg-white border-b border-gray-200 px-5 flex items-center gap-4 z-20">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
          <Building2 className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold text-gray-900">BuildOS</span>
      </div>
      <div className="w-px h-5 bg-gray-200" />
      <AppDropdown onOpen={onOpen} apps={apps} />
      <div className="w-px h-5 bg-gray-200" />
      <div className="flex items-center gap-2 px-3 h-8 rounded-lg bg-gray-50 border border-gray-200 w-52">
        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <input
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search apps…"
          className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none"
        />
      </div>
      <div className="flex-1" />
      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
        <Bell className="w-4 h-4" />
      </button>
      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
        {initials || "?"}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AppLauncherPage() {
  const [activeApp, setActiveApp] = useState<AppDef | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [apps, setApps] = useState<AppDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { name, role, assignedApps } = useAuthUser();
  const normalizedAssignedAppsKey = useMemo(
    () =>
      assignedApps
        .map((app) => String(app).trim().toLowerCase())
        .filter(Boolean)
        .sort()
        .join("|"),
    [assignedApps],
  );

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const nextApps = await buildAppsFromApi(name);
        if (!alive) return;

        const normalizedAssignedApps = normalizedAssignedAppsKey
          ? normalizedAssignedAppsKey.split("|")
          : [];
        const assigned = new Set(
          (normalizedAssignedApps.length > 0
            ? normalizedAssignedApps
            : ["ess"]
          ).map((a) => String(a).trim().toLowerCase()),
        );

        const visible = nextApps.filter((app) =>
          assigned.has(String(app.id).trim().toLowerCase()),
        );
        setApps(visible);
      } catch {
        if (!alive) return;
        setLoadError("Unable to load launcher data.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();

    return () => {
      alive = false;
    };
  }, [name, role, normalizedAssignedAppsKey]);

  const filtered = apps.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.tagline.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Responsive columns: 1-2 apps → 1 col, 3-4 → 2 cols, 5-6 → 3 cols, 7 → 4 cols
  const gridCols = filtered.length >= 7 ? 4 : filtered.length >= 5 ? 3 : filtered.length >= 3 ? 2 : 1;

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      <TopNav
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        onOpen={setActiveApp}
        apps={apps}
      />
      {/* Full-screen bento grid — responsive columns based on app count */}
      <div className="flex-1 min-h-0 p-4">
        {loading ? (
          <div
            aria-busy="true"
            aria-label="Loading app launcher"
            className="h-full grid grid-cols-4 grid-rows-3 gap-3"
          >
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-200 bg-white/70 animate-pulse"
              />
            ))}
          </div>
        ) : loadError ? (
          <div className="h-full rounded-2xl border border-red-200 bg-red-50 text-red-700 p-6 text-sm font-medium">
            {loadError}
          </div>
        ) : (
          <div className={`h-full grid gap-3 auto-rows-fr ${gridCols >= 4 ? "grid-cols-4" : gridCols >= 3 ? "grid-cols-3" : gridCols >= 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {filtered.length === 0 ? (
              <div className="col-span-full flex items-center justify-center text-sm text-gray-400">
                No applications match your search.
              </div>
            ) : (
              filtered.map((app, index) => (
                <BentoCard
                  key={app.id}
                  app={{
                    ...app,
                    cols: Math.min(app.cols, gridCols),
                    rows: Math.min(app.rows, gridCols >= 2 ? app.rows : 1),
                  }}
                  onOpen={setActiveApp}
                  revealIndex={index}
                />
              ))
            )}
          </div>
        )}
      </div>
      <AnimatePresence>
        {activeApp && (
          <DetailOverlay app={activeApp} onClose={() => setActiveApp(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
