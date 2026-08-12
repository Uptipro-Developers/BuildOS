/**
 * navCatalog — the single source of truth for Layer 2 (navigation) permissions.
 *
 * Layer 2 used to be a hand-maintained list of synthetic ids ("hr_dashboard")
 * inside RolesPage. Those ids appeared nowhere else in the codebase, so nothing
 * could enforce them, and the list had drifted badly out of step with the real
 * sidebars — it named 45 items where the app renders 115. Configuring a role
 * therefore could not restrict navigation, and enforcing the old list would have
 * hidden pages it had simply never listed.
 *
 * The permission id here is the route href. It is already unique and stable, and
 * it is the same string the sidebars and the router use, so a configured
 * permission and a real page can no longer drift apart. `navCatalogCoversLayouts`
 * in e2e keeps this file honest as sidebars change.
 */

export type NavAppKey =
  | "construction"
  | "finance"
  | "hr"
  | "procurement"
  | "storefront"
  | "admin"
  | "ess";

export interface NavCatalogItem {
  /** Route href — doubles as the Layer 2 permission id. */
  id: string;
  label: string;
  /** Sidebar group this item sits under ("" for the ungrouped top item). */
  section: string;
}

export const NAV_CATALOG: Record<NavAppKey, NavCatalogItem[]> = {
  construction: [
    { id: "/apps/construction/dashboard", label: "Dashboard", section: "" },
    { id: "/apps/construction/projects", label: "All Projects", section: "Projects" },
    { id: "/apps/construction/tasks", label: "Task Board", section: "Tasks" },
    { id: "/apps/construction/my-tasks", label: "My Tasks", section: "Tasks" },
    { id: "/apps/construction/schedule", label: "Schedule", section: "Management" },
    { id: "/apps/construction/daily-reports", label: "Daily Reports", section: "Management" },
    { id: "/apps/construction/resources", label: "Resources", section: "Management" },
    { id: "/apps/construction/issues", label: "Issues", section: "Management" },
    { id: "/apps/construction/change-requests", label: "Change Requests", section: "Management" },
    { id: "/apps/construction/delays", label: "Delays", section: "Management" },
    { id: "/apps/construction/quality", label: "Quality", section: "Management" },
    { id: "/apps/construction/hse", label: "HSE", section: "Management" },
    { id: "/apps/construction/documents", label: "Documents", section: "Management" },
    { id: "/apps/construction/finance", label: "Finance", section: "Management" },
    { id: "/apps/construction/communications", label: "Communications", section: "Management" },
    { id: "/apps/construction/stakeholders", label: "Stakeholders", section: "Management" },
    { id: "/apps/construction/resource-hub", label: "Resource Hub", section: "Resources" },
    { id: "/apps/construction/reports", label: "Reports", section: "Reports" },
    { id: "/apps/construction/settings", label: "Settings", section: "Settings" },
  ],
  finance: [
    { id: "/apps/finance/dashboard", label: "Dashboard", section: "" },
    { id: "/apps/finance/tasks", label: "Tasks", section: "Tasks" },
    { id: "/apps/finance/my-tasks", label: "My Tasks", section: "Tasks" },
    { id: "/apps/finance/chart-of-accounts", label: "Chart of Accounts", section: "Accounting" },
    { id: "/apps/finance/journal", label: "Journal Entries", section: "Accounting" },
    { id: "/apps/finance/accruals", label: "Accruals", section: "Accounting" },
    { id: "/apps/finance/expenses", label: "Expense Management", section: "Expenses & Income" },
    { id: "/apps/finance/income", label: "Income Management", section: "Expenses & Income" },
    { id: "/apps/finance/budget", label: "Budget Management", section: "Financial Management" },
    { id: "/apps/finance/payments", label: "Payment Management", section: "Financial Management" },
    { id: "/apps/finance/purchase-invoice", label: "Purchase Invoice", section: "Financial Management" },
    { id: "/apps/finance/payroll", label: "Payroll Overview", section: "Payroll & Claims" },
    { id: "/apps/finance/claims", label: "Claims Management", section: "Payroll & Claims" },
    { id: "/apps/finance/year-end-close", label: "Year-End Close", section: "Period End" },
    { id: "/apps/finance/fiscal-years", label: "Fiscal Years", section: "Period End" },
    { id: "/apps/finance/approvals", label: "Approvals", section: "Approvals" },
    { id: "/apps/finance/general-ledger", label: "General Ledger", section: "Ledger & Reports" },
    { id: "/apps/finance/ledger", label: "Transactions Ledger", section: "Ledger & Reports" },
    { id: "/apps/finance/posting-engine", label: "Posting Engine", section: "Ledger & Reports" },
    { id: "/apps/finance/reports", label: "Reports", section: "Ledger & Reports" },
    { id: "/apps/finance/config", label: "Settings", section: "Settings" },
    { id: "/apps/finance/process-mapping", label: "Process Mapping", section: "Settings" },
  ],
  hr: [
    { id: "/apps/hr/dashboard", label: "Dashboard", section: "" },
    { id: "/apps/hr/hr-tasks", label: "Tasks", section: "Tasks" },
    { id: "/apps/hr/my-tasks", label: "My Tasks", section: "Tasks" },
    { id: "/apps/hr/employees", label: "All Employees", section: "Employee Management" },
    { id: "/apps/hr/departments", label: "Departments", section: "Employee Management" },
    { id: "/apps/hr/org-structure", label: "Organization Structure", section: "Organization" },
    { id: "/apps/hr/leave-requests", label: "Leave Requests", section: "Leave & Attendance" },
    { id: "/apps/hr/leave-balances", label: "Leave Balances", section: "Leave & Attendance" },
    { id: "/apps/hr/attendance", label: "Daily Attendance", section: "Leave & Attendance" },
    { id: "/apps/hr/attendance-logs", label: "Attendance Logs", section: "Leave & Attendance" },
    { id: "/apps/hr/payroll", label: "Payroll Overview", section: "Payroll" },
    { id: "/apps/hr/payroll-processing", label: "Payroll Processing", section: "Payroll" },
    { id: "/apps/hr/workforce", label: "Workforce Allocation", section: "Workforce" },
    { id: "/apps/hr/payroll-periods", label: "Payroll Period", section: "Payroll Setup" },
    { id: "/apps/hr/bank-names", label: "Bank Names", section: "Payroll Setup" },
    { id: "/apps/hr/salary-structure", label: "Salary Structure", section: "Payroll Setup" },
    { id: "/apps/hr/approvals", label: "Approvals", section: "Approvals" },
    { id: "/apps/hr/reports", label: "HR Reports", section: "Reports" },
    { id: "/apps/hr/settings", label: "Settings", section: "Settings" },
    { id: "/apps/hr/base-calendar", label: "Base Calendar", section: "Settings" },
  ],
  procurement: [
    { id: "/apps/procurement/dashboard", label: "Dashboard", section: "" },
    { id: "/apps/procurement/tasks", label: "Tasks", section: "Tasks" },
    { id: "/apps/procurement/my-tasks", label: "My Tasks", section: "Tasks" },
    { id: "/apps/procurement/inventory", label: "All Materials", section: "Inventory" },
    { id: "/apps/procurement/stock-movement", label: "Stock Movement", section: "Inventory" },
    { id: "/apps/procurement/material-requests", label: "Material Requests", section: "Requests" },
    { id: "/apps/procurement/purchase-requests", label: "Purchase Requests", section: "Requests" },
    { id: "/apps/procurement/sent-requests", label: "Sent Requests", section: "Requests" },
    { id: "/apps/procurement/received-quotes", label: "Received Quotes & Invoices", section: "Vendor Communication" },
    { id: "/apps/procurement/purchase-orders", label: "Purchase Orders", section: "Purchasing" },
    { id: "/apps/procurement/goods-receipt", label: "Goods Receipt", section: "Purchasing" },
    { id: "/apps/procurement/suppliers", label: "Suppliers", section: "Suppliers" },
    { id: "/apps/procurement/supplier-compliance", label: "Supplier Compliance", section: "Suppliers" },
    { id: "/apps/procurement/approvals", label: "Approvals", section: "Management" },
    { id: "/apps/procurement/reports", label: "Reports", section: "Reports" },
    { id: "/apps/procurement/config", label: "Settings", section: "Settings" },
  ],
  storefront: [
    { id: "/apps/storefront/dashboard", label: "Dashboard", section: "" },
    { id: "/apps/storefront/tasks", label: "Tasks", section: "Tasks" },
    { id: "/apps/storefront/my-tasks", label: "My Tasks", section: "Tasks" },
    { id: "/apps/storefront/all-materials", label: "All Materials", section: "Inventory" },
    { id: "/apps/storefront/general-store", label: "General Store", section: "Inventory" },
    { id: "/apps/storefront/project-stores", label: "Project Stores", section: "Inventory" },
    { id: "/apps/storefront/incoming-requests", label: "Incoming Requests", section: "Distribution" },
    { id: "/apps/storefront/stock-movement", label: "Stock Movement", section: "Distribution" },
    { id: "/apps/storefront/approvals", label: "Approvals", section: "Approvals" },
    { id: "/apps/storefront/reports", label: "Reports", section: "Reports" },
    { id: "/apps/storefront/config", label: "Settings", section: "Settings" },
  ],
  admin: [
    { id: "/apps/admin/dashboard", label: "Dashboard", section: "" },
    { id: "/apps/admin/company-profile", label: "Company Profile", section: "Organization" },
    { id: "/apps/admin/board-of-directors", label: "Board of Directors", section: "Organization" },
    { id: "/apps/admin/users", label: "Users", section: "User Management" },
    { id: "/apps/admin/roles", label: "Roles & Permissions", section: "User Management" },
    { id: "/apps/admin/user-permissions", label: "User Permissions", section: "User Management" },
    { id: "/apps/admin/general-settings", label: "General Settings", section: "System Configuration" },
    { id: "/apps/admin/project-config", label: "Process Configuration", section: "System Configuration" },
    { id: "/apps/admin/email-config", label: "Email Configuration", section: "System Configuration" },
    { id: "/apps/admin/report-builder", label: "Report Builder", section: "Reports" },
    { id: "/apps/admin/report-automation", label: "Report Automation", section: "Reports" },
    { id: "/apps/admin/notifications", label: "Notifications", section: "System" },
    { id: "/apps/admin/audit-logs", label: "Audit & Logs", section: "System" },
    { id: "/apps/admin/integrations", label: "Integrations", section: "System" },
    { id: "/apps/admin/approvals", label: "Approvals", section: "Approvals" },
  ],
  ess: [
    { id: "/apps/ess/dashboard", label: "Dashboard", section: "" },
    { id: "/apps/ess/projects", label: "My Projects", section: "My Work" },
    { id: "/apps/ess/tasks", label: "My Tasks", section: "My Work" },
    { id: "/apps/ess/requests", label: "My Requests", section: "Requests" },
    { id: "/apps/ess/submit", label: "Create Request", section: "Requests" },
    { id: "/apps/ess/approvals", label: "Approvals", section: "Requests" },
    { id: "/apps/ess/attendance", label: "My Attendance", section: "Attendance" },
    { id: "/apps/ess/payslips", label: "Payslip History", section: "Payroll" },
    { id: "/apps/ess/appraisals", label: "Appraisals", section: "Performance" },
    { id: "/apps/ess/log-issues", label: "Log Issues", section: "Performance" },
    { id: "/apps/ess/profile", label: "My Profile", section: "Account" },
    { id: "/apps/ess/activity", label: "Activity History", section: "Account" },
  ],
};

/** Every nav permission id in the catalog, across all apps. */
export const ALL_NAV_IDS: string[] = Object.values(NAV_CATALOG).flatMap((items) =>
  items.map((i) => i.id),
);

/** Looks up the app a nav id belongs to, or null if it is not in the catalog. */
export function navAppFor(id: string): NavAppKey | null {
  for (const [app, items] of Object.entries(NAV_CATALOG)) {
    if (items.some((i) => i.id === id)) return app as NavAppKey;
  }
  return null;
}
