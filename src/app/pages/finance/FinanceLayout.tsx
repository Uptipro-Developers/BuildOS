import { Outlet } from "react-router";
import { AppHeader } from "../../components/AppHeader";
import { CollapsibleSidebar } from "../../components/CollapsibleSidebar";
import { FinanceProvider } from "../../stores/financeStore";
import {
  LayoutDashboard, BookOpen, Receipt, TrendingDown, TrendingUp,
  CreditCard, Users2, FileText, CheckSquare, List, BarChart3, Settings2, ListTodo, PenLine, User,
  Zap, GitBranch, CalendarCheck, RefreshCw, ScrollText,
} from "lucide-react";

const sidebarSections = [
  {
    label: "",
    items: [
      { label: "Dashboard", href: "/apps/finance/dashboard", icon: <LayoutDashboard className="w-4 h-4" />, end: true },
    ],
  },
  {
    label: "Tasks",
    items: [
      { label: "Tasks",    href: "/apps/finance/tasks",    icon: <ListTodo className="w-4 h-4" />, end: true },
      { label: "My Tasks", href: "/apps/finance/my-tasks", icon: <User     className="w-4 h-4" />, end: true },
    ],
  },
  {
    label: "Accounting",
    items: [
      { label: "Chart of Accounts", href: "/apps/finance/chart-of-accounts", icon: <BookOpen className="w-4 h-4" />, end: true },
      { label: "Journal Entries",   href: "/apps/finance/journal",            icon: <PenLine  className="w-4 h-4" />, end: true },
      { label: "Accruals",          href: "/apps/finance/accruals",           icon: <ScrollText className="w-4 h-4" />, end: true },
    ],
  },
  {
    label: "Expenses & Income",
    items: [
      { label: "Expense Management", href: "/apps/finance/expenses", icon: <Receipt      className="w-4 h-4" />, end: true },
      { label: "Income Management",  href: "/apps/finance/income",   icon: <TrendingDown className="w-4 h-4" />, end: true },
    ],
  },
  {
    label: "Financial Management",
    items: [
      { label: "Budget Management",  href: "/apps/finance/budget",            icon: <TrendingUp className="w-4 h-4" />, end: true },
      { label: "Payment Management", href: "/apps/finance/payments",          icon: <CreditCard  className="w-4 h-4" />, end: true },
      { label: "Purchase Invoice",   href: "/apps/finance/purchase-invoice", icon: <Receipt     className="w-4 h-4" />, end: true },
    ],
  },
  {
    label: "Payroll & Claims",
    items: [
      { label: "Payroll Integration", href: "/apps/finance/payroll", icon: <Users2   className="w-4 h-4" />, end: true },
      { label: "Claims Management",   href: "/apps/finance/claims",  icon: <FileText className="w-4 h-4" />, end: true },
    ],
  },
  {
    label: "Period End",
    items: [
      { label: "Year-End Close",      href: "/apps/finance/year-end-close", icon: <CalendarCheck className="w-4 h-4" />, end: true },
      { label: "Fiscal Years",        href: "/apps/finance/fiscal-years",   icon: <RefreshCw     className="w-4 h-4" />, end: true },
    ],
  },
  {
    label: "Approvals",
    items: [
      { label: "Approvals", href: "/apps/finance/approvals", icon: <CheckSquare className="w-4 h-4" />, end: true },
    ],
  },
  {
    label: "Ledger & Reports",
    items: [
      { label: "Transactions Ledger",  href: "/apps/finance/ledger",           icon: <List     className="w-4 h-4" />, end: true },
      { label: "Posting Engine",        href: "/apps/finance/posting-engine",    icon: <Zap      className="w-4 h-4" />, end: true },
      { label: "Reports",              href: "/apps/finance/reports",           icon: <BarChart3  className="w-4 h-4" />, end: true },
    ],
  },
  {
    label: "Configuration",
    items: [
      { label: "Finance Configuration", href: "/apps/finance/config",          icon: <Settings2    className="w-4 h-4" />, end: true },
      { label: "Process Mapping",       href: "/apps/finance/process-mapping", icon: <GitBranch    className="w-4 h-4" />, end: true },
    ],
  },
];

export function FinanceLayout() {
  return (
    <FinanceProvider>
      <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
        <AppHeader currentApp="finance" appColor="bg-emerald-600" />
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-56 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto">
            <CollapsibleSidebar
              sections={sidebarSections}
              activeClass="bg-emerald-50 text-emerald-700 font-medium [&_svg]:text-emerald-600"
              baseClass="text-gray-600 hover:bg-gray-50 hover:text-gray-900 [&_svg]:text-gray-400"
            />
          </aside>
          <main className="flex-1 overflow-y-auto p-6 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </FinanceProvider>
  );
}

