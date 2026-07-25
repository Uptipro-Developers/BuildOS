import React, { useState, useRef } from "react";
import {
  Play, Download, Plus, Trash2, Code, Eye, ChevronDown, BarChart2,
  PieChart, LineChart, LayoutGrid, Copy, FileText, GripVertical, X,
  Hash, Calendar, Type, ChevronUp, Layers, Printer, ArrowLeft, Rocket,
  Archive, MoreHorizontal, Pencil, Search, SlidersHorizontal,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────
type FieldType = "text" | "number" | "date" | "status";
type FilterOperator = "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "between" | "is_empty" | "in_list";
type Aggregation = "none" | "sum" | "count" | "avg" | "max" | "min";
type SortDirection = "asc" | "desc";
type VizType = "table" | "bar" | "line" | "pie" | "cards";
type BuilderMode = "visual" | "sql";
type LogicOperator = "AND" | "OR";
type ReportStatus = "draft" | "deployed" | "archived";
type ReportType = "summary" | "detailed" | "analytical";
type DocumentType = "Finance" | "HR" | "Procurement" | "Construction" | "Storefront" | "ESS" | "Admin";
type PageView = "library" | "builder";

interface Field { key: string; label: string; type: FieldType; }
interface DataSource {
  value: string; label: string; module: string; moduleColor: string; appKey: string;
  fields: Field[]; mockData: Record<string, string | number>[];
}
interface SelectedField { key: string; displayLabel: string; aggregation: Aggregation; }
interface FilterRow { id: string; field: string; operator: FilterOperator; value: string; valueTo: string; logic: LogicOperator; }
interface SortRule { field: string; direction: SortDirection; }
interface ReportTemplate {
  id: string; name: string; description: string; application: string;
  reportType: ReportType; documentType: DocumentType; dataSource: string; builderType: BuilderMode;
  status: ReportStatus; createdBy: string; lastUpdated: string; vizType: VizType;
  selectedFields: SelectedField[]; filters: FilterRow[]; sortRules: SortRule[];
  rowLimit: number; sqlQuery: string;
}

// ─── Applications ──────────────────────────────────────────────────────────
const APPLICATIONS = [
  { key: "construction", label: "Construction", color: "bg-orange-100 text-orange-700", icon: "🏗️" },
  { key: "finance",      label: "Finance",      color: "bg-emerald-100 text-emerald-700", icon: "💰" },
  { key: "procurement",  label: "Procurement",  color: "bg-blue-100 text-blue-700",       icon: "📦" },
  { key: "hr",           label: "HR",           color: "bg-purple-100 text-purple-700",   icon: "👥" },
  { key: "admin",        label: "Admin",        color: "bg-indigo-100 text-indigo-700",   icon: "⚙️" },
];

// ─── Data Sources ──────────────────────────────────────────────────────────
const DATA_SOURCES: DataSource[] = [
  {
    value: "projects", label: "Projects", module: "Construction",
    moduleColor: "bg-orange-100 text-orange-700", appKey: "construction",
    fields: [
      { key: "name", label: "Project Name", type: "text" },
      { key: "location", label: "Location", type: "text" },
      { key: "status", label: "Status", type: "status" },
      { key: "budget", label: "Budget ($)", type: "number" },
      { key: "spent", label: "Amount Spent ($)", type: "number" },
      { key: "start_date", label: "Start Date", type: "date" },
      { key: "end_date", label: "End Date", type: "date" },
      { key: "progress", label: "Progress (%)", type: "number" },
      { key: "manager", label: "Project Manager", type: "text" },
    ],
    mockData: [
      { name: "Lekki Tower A", location: "Lagos", status: "Active", budget: 5200000, spent: 3100000, start_date: "2025-01-10", end_date: "2026-06-30", progress: 60, manager: "Tunde Okafor" },
      { name: "Abuja HQ Renovation", location: "Abuja", status: "Active", budget: 1800000, spent: 900000, start_date: "2025-03-01", end_date: "2025-12-31", progress: 50, manager: "Amina Bello" },
      { name: "Port Harcourt Mall", location: "PH", status: "Completed", budget: 8400000, spent: 8100000, start_date: "2023-06-01", end_date: "2025-02-28", progress: 100, manager: "Chidi Nwosu" },
      { name: "Ibadan Road Phase 2", location: "Ibadan", status: "On Hold", budget: 3600000, spent: 400000, start_date: "2025-07-01", end_date: "2027-01-31", progress: 11, manager: "Sola Adeleke" },
      { name: "Kano Industrial Complex", location: "Kano", status: "Active", budget: 12000000, spent: 2200000, start_date: "2025-09-01", end_date: "2028-03-31", progress: 18, manager: "Musa Ibrahim" },
    ],
  },
  {
    value: "expenses", label: "Expenses", module: "Finance",
    moduleColor: "bg-emerald-100 text-emerald-700", appKey: "finance",
    fields: [
      { key: "date", label: "Date", type: "date" },
      { key: "category", label: "Category", type: "text" },
      { key: "amount", label: "Amount ($)", type: "number" },
      { key: "project", label: "Project", type: "text" },
      { key: "vendor", label: "Vendor", type: "text" },
      { key: "status", label: "Status", type: "status" },
      { key: "approved_by", label: "Approved By", type: "text" },
    ],
    mockData: [
      { date: "2026-04-01", category: "Materials", amount: 45000, project: "Lekki Tower A", vendor: "BuildMart Ltd", status: "Approved", approved_by: "Finance Manager" },
      { date: "2026-04-03", category: "Labour", amount: 22000, project: "Abuja HQ Renovation", vendor: "WorkForce Co", status: "Pending", approved_by: "" },
      { date: "2026-04-05", category: "Equipment", amount: 78000, project: "Lekki Tower A", vendor: "AluMach Nigeria", status: "Approved", approved_by: "Finance Manager" },
      { date: "2026-04-07", category: "Transport", amount: 8500, project: "Kano Industrial Complex", vendor: "FastHaul Ltd", status: "Approved", approved_by: "Site Manager" },
      { date: "2026-04-08", category: "Materials", amount: 31000, project: "Port Harcourt Mall", vendor: "BuildMart Ltd", status: "Rejected", approved_by: "" },
    ],
  },
  {
    value: "purchase_orders", label: "Purchase Orders", module: "Procurement",
    moduleColor: "bg-blue-100 text-blue-700", appKey: "procurement",
    fields: [
      { key: "po_number", label: "PO Number", type: "text" },
      { key: "supplier", label: "Supplier", type: "text" },
      { key: "items", label: "Items Count", type: "number" },
      { key: "total", label: "Total ($)", type: "number" },
      { key: "status", label: "Status", type: "status" },
      { key: "created_date", label: "Created Date", type: "date" },
      { key: "delivery_date", label: "Delivery Date", type: "date" },
      { key: "project", label: "Project", type: "text" },
    ],
    mockData: [
      { po_number: "PO-2026-0041", supplier: "BuildMart Ltd", items: 12, total: 134000, status: "Approved", created_date: "2026-03-10", delivery_date: "2026-04-15", project: "Lekki Tower A" },
      { po_number: "PO-2026-0042", supplier: "SteelCo Nigeria", items: 3, total: 280000, status: "Pending", created_date: "2026-03-25", delivery_date: "2026-04-30", project: "Kano Industrial Complex" },
      { po_number: "PO-2026-0043", supplier: "WoodWorks Ltd", items: 8, total: 45000, status: "Delivered", created_date: "2026-02-14", delivery_date: "2026-03-20", project: "Abuja HQ Renovation" },
      { po_number: "PO-2026-0044", supplier: "AluMach Nigeria", items: 2, total: 90000, status: "Approved", created_date: "2026-04-01", delivery_date: "2026-04-20", project: "Lekki Tower A" },
      { po_number: "PO-2026-0045", supplier: "FastHaul Ltd", items: 1, total: 22000, status: "Pending", created_date: "2026-04-05", delivery_date: "2026-04-12", project: "Ibadan Road Phase 2" },
    ],
  },
  {
    value: "inventory", label: "Inventory", module: "Procurement",
    moduleColor: "bg-blue-100 text-blue-700", appKey: "procurement",
    fields: [
      { key: "item_name", label: "Item Name", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "unit", label: "Unit", type: "text" },
      { key: "unit_price", label: "Unit Price ($)", type: "number" },
      { key: "total_value", label: "Total Value ($)", type: "number" },
      { key: "supplier", label: "Supplier", type: "text" },
      { key: "reorder_level", label: "Reorder Level", type: "number" },
    ],
    mockData: [
      { item_name: "Portland Cement", category: "Materials", quantity: 2400, unit: "Bags", unit_price: 8.5, total_value: 20400, supplier: "BuildMart Ltd", reorder_level: 500 },
      { item_name: "Steel Rebar 12mm", category: "Metals", quantity: 180, unit: "Tons", unit_price: 850, total_value: 153000, supplier: "SteelCo Nigeria", reorder_level: 30 },
      { item_name: "Granite 20mm", category: "Aggregates", quantity: 320, unit: "m3", unit_price: 45, total_value: 14400, supplier: "QuarryMine Ltd", reorder_level: 80 },
      { item_name: "PVC Pipes 110mm", category: "Plumbing", quantity: 850, unit: "Length", unit_price: 12, total_value: 10200, supplier: "PlumbiCo", reorder_level: 200 },
      { item_name: "Electrical Cable 6mm", category: "Electrical", quantity: 4200, unit: "Metres", unit_price: 3.2, total_value: 13440, supplier: "PowerLink", reorder_level: 1000 },
    ],
  },
  {
    value: "employees", label: "Employees", module: "HR",
    moduleColor: "bg-purple-100 text-purple-700", appKey: "hr",
    fields: [
      { key: "name", label: "Full Name", type: "text" },
      { key: "department", label: "Department", type: "text" },
      { key: "role", label: "Role", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "join_date", label: "Join Date", type: "date" },
      { key: "status", label: "Status", type: "status" },
      { key: "salary", label: "Salary ($)", type: "number" },
      { key: "location", label: "Office", type: "text" },
    ],
    mockData: [
      { name: "Tunde Okafor", department: "Construction", role: "Project Manager", email: "t.okafor@buildos.com", join_date: "2022-03-15", status: "Active", salary: 8500, location: "Lagos" },
      { name: "Amina Bello", department: "Engineering", role: "Site Engineer", email: "a.bello@buildos.com", join_date: "2021-07-01", status: "Active", salary: 7200, location: "Abuja" },
      { name: "Chidi Nwosu", department: "Construction", role: "Project Manager", email: "c.nwosu@buildos.com", join_date: "2020-01-10", status: "Active", salary: 9000, location: "Port Harcourt" },
      { name: "Sola Adeleke", department: "Finance", role: "Accountant", email: "s.adeleke@buildos.com", join_date: "2023-06-20", status: "Active", salary: 6500, location: "Ibadan" },
      { name: "Musa Ibrahim", department: "Procurement", role: "Store Manager", email: "m.ibrahim@buildos.com", join_date: "2022-11-03", status: "Active", salary: 5800, location: "Kano" },
    ],
  },
  {
    value: "audit_logs", label: "Audit Logs", module: "Admin",
    moduleColor: "bg-indigo-100 text-indigo-700", appKey: "admin",
    fields: [
      { key: "user", label: "User", type: "text" },
      { key: "action", label: "Action", type: "text" },
      { key: "module", label: "Module", type: "text" },
      { key: "record", label: "Record", type: "text" },
      { key: "timestamp", label: "Timestamp", type: "date" },
      { key: "ip_address", label: "IP Address", type: "text" },
      { key: "result", label: "Result", type: "status" },
    ],
    mockData: [
      { user: "Admin User", action: "Created", module: "Users", record: "Jane Doe", timestamp: "2026-04-08 09:14", ip_address: "192.168.1.10", result: "Success" },
      { user: "Tunde Okafor", action: "Updated", module: "Projects", record: "Lekki Tower A", timestamp: "2026-04-08 08:55", ip_address: "192.168.1.22", result: "Success" },
      { user: "Sola Adeleke", action: "Deleted", module: "Expenses", record: "EXP-0041", timestamp: "2026-04-07 17:30", ip_address: "10.0.0.5", result: "Success" },
      { user: "Amina Bello", action: "Login", module: "Auth", record: "", timestamp: "2026-04-07 08:01", ip_address: "10.0.0.12", result: "Success" },
      { user: "Unknown", action: "Login", module: "Auth", record: "", timestamp: "2026-04-06 23:44", ip_address: "45.88.201.3", result: "Failed" },
    ],
  },
];

// ─── Seed Templates ────────────────────────────────────────────────────────
const SEED_TEMPLATES: ReportTemplate[] = [
  {
    id: "tpl-001", name: "Project Status Summary",
    description: "Monthly overview of all active construction projects including progress and budget status.",
    application: "construction", reportType: "summary", documentType: "Construction", dataSource: "projects",
    builderType: "visual", status: "deployed", createdBy: "Admin User", lastUpdated: "2 hours ago",
    vizType: "table",
    selectedFields: [
      { key: "name", displayLabel: "Project Name", aggregation: "none" },
      { key: "status", displayLabel: "Status", aggregation: "none" },
      { key: "progress", displayLabel: "Progress %", aggregation: "none" },
      { key: "budget", displayLabel: "Budget ($)", aggregation: "none" },
      { key: "manager", displayLabel: "Manager", aggregation: "none" },
    ],
    filters: [], sortRules: [{ field: "progress", direction: "desc" }], rowLimit: 50, sqlQuery: "",
  },
  {
    id: "tpl-002", name: "Budget vs Spent Analysis",
    description: "Comparative bar chart showing budgeted versus actual spend per project.",
    application: "construction", reportType: "analytical", documentType: "Construction", dataSource: "projects",
    builderType: "visual", status: "deployed", createdBy: "Admin User", lastUpdated: "Yesterday",
    vizType: "bar",
    selectedFields: [
      { key: "name", displayLabel: "Project Name", aggregation: "none" },
      { key: "budget", displayLabel: "Budget ($)", aggregation: "sum" },
      { key: "spent", displayLabel: "Spent ($)", aggregation: "sum" },
    ],
    filters: [], sortRules: [], rowLimit: 50, sqlQuery: "",
  },
  {
    id: "tpl-003", name: "Delayed Projects Report",
    description: "SQL-driven list of projects currently on hold or delayed with manager details.",
    application: "construction", reportType: "detailed", documentType: "Construction", dataSource: "projects",
    builderType: "sql", status: "draft", createdBy: "Admin User", lastUpdated: "3 days ago",
    vizType: "table", selectedFields: [], filters: [], sortRules: [], rowLimit: 100,
    sqlQuery: "SELECT name, location, status, progress, manager\nFROM projects\nWHERE status IN ('On Hold', 'Delayed')\nORDER BY progress ASC;",
  },
  {
    id: "tpl-004", name: "Monthly Expense Summary",
    description: "Breakdown of expenses by category for the current month as a pie chart.",
    application: "finance", reportType: "summary", documentType: "Finance", dataSource: "expenses",
    builderType: "visual", status: "deployed", createdBy: "Admin User", lastUpdated: "5 hours ago",
    vizType: "pie",
    selectedFields: [
      { key: "category", displayLabel: "Category", aggregation: "none" },
      { key: "amount", displayLabel: "Amount ($)", aggregation: "sum" },
      { key: "status", displayLabel: "Status", aggregation: "none" },
    ],
    filters: [], sortRules: [{ field: "amount", direction: "desc" }], rowLimit: 50, sqlQuery: "",
  },
  {
    id: "tpl-005", name: "Pending Approval Expenses",
    description: "All expenses currently awaiting finance manager approval.",
    application: "finance", reportType: "detailed", documentType: "Finance", dataSource: "expenses",
    builderType: "visual", status: "draft", createdBy: "Finance Manager", lastUpdated: "1 day ago",
    vizType: "table",
    selectedFields: [
      { key: "date", displayLabel: "Date", aggregation: "none" },
      { key: "category", displayLabel: "Category", aggregation: "none" },
      { key: "amount", displayLabel: "Amount ($)", aggregation: "none" },
      { key: "vendor", displayLabel: "Vendor", aggregation: "none" },
    ],
    filters: [{ id: "f1", field: "status", operator: "equals", value: "Pending", valueTo: "", logic: "AND" }],
    sortRules: [{ field: "amount", direction: "desc" }], rowLimit: 100, sqlQuery: "",
  },
  {
    id: "tpl-006", name: "PO Pipeline Report",
    description: "Active purchase orders by supplier showing delivery status and totals.",
    application: "procurement", reportType: "summary", documentType: "Procurement", dataSource: "purchase_orders",
    builderType: "visual", status: "deployed", createdBy: "Admin User", lastUpdated: "3 hours ago",
    vizType: "table",
    selectedFields: [
      { key: "po_number", displayLabel: "PO #", aggregation: "none" },
      { key: "supplier", displayLabel: "Supplier", aggregation: "none" },
      { key: "total", displayLabel: "Total ($)", aggregation: "none" },
      { key: "status", displayLabel: "Status", aggregation: "none" },
      { key: "delivery_date", displayLabel: "Delivery Date", aggregation: "none" },
    ],
    filters: [], sortRules: [{ field: "delivery_date", direction: "asc" }], rowLimit: 50, sqlQuery: "",
  },
  {
    id: "tpl-007", name: "Low Stock Alert Report",
    description: "Inventory items at or below reorder level thresholds.",
    application: "procurement", reportType: "analytical", documentType: "Procurement", dataSource: "inventory",
    builderType: "sql", status: "archived", createdBy: "Store Manager", lastUpdated: "2 weeks ago",
    vizType: "table", selectedFields: [], filters: [], sortRules: [], rowLimit: 50,
    sqlQuery: "SELECT item_name, quantity, reorder_level, supplier\nFROM inventory\nWHERE quantity <= reorder_level\nORDER BY quantity ASC;",
  },
  {
    id: "tpl-008", name: "Employee Headcount by Department",
    description: "Staff count and salary distribution across all active departments.",
    application: "hr", reportType: "summary", documentType: "HR", dataSource: "employees",
    builderType: "visual", status: "deployed", createdBy: "HR Manager", lastUpdated: "1 week ago",
    vizType: "bar",
    selectedFields: [
      { key: "department", displayLabel: "Department", aggregation: "none" },
      { key: "name", displayLabel: "Employee", aggregation: "none" },
      { key: "salary", displayLabel: "Salary ($)", aggregation: "sum" },
    ],
    filters: [{ id: "f1", field: "status", operator: "equals", value: "Active", valueTo: "", logic: "AND" }],
    sortRules: [{ field: "department", direction: "asc" }], rowLimit: 100, sqlQuery: "",
  },
  {
    id: "tpl-009", name: "System Activity Audit",
    description: "Full audit trail of user actions across all modules for compliance.",
    application: "admin", reportType: "detailed", documentType: "Admin", dataSource: "audit_logs",
    builderType: "visual", status: "deployed", createdBy: "Admin User", lastUpdated: "30 minutes ago",
    vizType: "table",
    selectedFields: [
      { key: "user", displayLabel: "User", aggregation: "none" },
      { key: "action", displayLabel: "Action", aggregation: "none" },
      { key: "module", displayLabel: "Module", aggregation: "none" },
      { key: "timestamp", displayLabel: "Timestamp", aggregation: "none" },
      { key: "result", displayLabel: "Result", aggregation: "none" },
    ],
    filters: [], sortRules: [{ field: "timestamp", direction: "desc" }], rowLimit: 100, sqlQuery: "",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: "=", not_equals: "≠", contains: "contains", greater_than: ">",
  less_than: "<", between: "between", is_empty: "is empty", in_list: "in list",
};
const TEXT_OPS: FilterOperator[] = ["equals", "not_equals", "contains", "is_empty"];
const NUM_OPS: FilterOperator[] = ["equals", "not_equals", "greater_than", "less_than", "between"];
const DATE_OPS: FilterOperator[] = ["equals", "not_equals", "greater_than", "less_than", "between"];
const STATUS_OPS: FilterOperator[] = ["equals", "not_equals", "is_empty"];
function getOps(type: FieldType): FilterOperator[] {
  if (type === "number") return NUM_OPS;
  if (type === "date") return DATE_OPS;
  if (type === "status") return STATUS_OPS;
  return TEXT_OPS;
}
const TYPE_ICON: Record<FieldType, React.FC<{ className?: string }>> = {
  text: Type, number: Hash, date: Calendar, status: Layers,
};
function statusBadge(s: ReportStatus) {
  if (s === "deployed") return "bg-emerald-100 text-emerald-700";
  if (s === "draft") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-500";
}
function reportTypeBadge(t: ReportType) {
  if (t === "analytical") return "bg-violet-50 text-violet-600";
  if (t === "summary") return "bg-blue-50 text-blue-600";
  return "bg-gray-50 text-gray-600";
}
function cellStatusColor(val: string | number) {
  const v = String(val);
  if (["Active", "Approved", "Delivered", "Success"].includes(v)) return "bg-emerald-100 text-emerald-700";
  if (["Pending"].includes(v)) return "bg-amber-100 text-amber-700";
  if (["Rejected", "Failed"].includes(v)) return "bg-red-100 text-red-700";
  if (["Completed"].includes(v)) return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-600";
}

// ─── Viz Components ─────────────────────────────────────────────────────────
function BarChartViz({ data, fieldX, fieldY }: { data: Record<string, string | number>[]; fieldX: string; fieldY: string }) {
  if (!fieldX || !fieldY) return <p className="text-sm text-gray-500 p-8 text-center">Select a text and a numeric column to visualize</p>;
  const max = Math.max(...data.map((r) => Number(r[fieldY]) || 0));
  if (!max) return <p className="text-sm text-gray-500 p-8 text-center">No numeric data in selected column</p>;
  return (
    <div className="p-5 space-y-2.5">
      {data.map((row, i) => {
        const val = Number(row[fieldY]) || 0;
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="w-32 text-xs text-gray-600 truncate text-right shrink-0">{String(row[fieldX]).slice(0, 18)}</div>
            <div className="flex-1 bg-gray-100 rounded-full h-7 relative overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(val / max) * 100}%` }} />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-700">{val.toLocaleString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
function PieChartViz({ data, fieldLabel, fieldValue }: { data: Record<string, string | number>[]; fieldLabel: string; fieldValue: string }) {
  if (!fieldLabel || !fieldValue) return <p className="text-sm text-gray-500 p-8 text-center">Select a label and a numeric column to visualize</p>;
  const total = data.reduce((s, r) => s + (Number(r[fieldValue]) || 0), 0);
  if (!total) return <p className="text-sm text-gray-500 p-8 text-center">No numeric data</p>;
  const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];
  let cum = 0;
  const slices = data.map((row, i) => {
    const pct = (Number(row[fieldValue]) || 0) / total;
    const s = cum * 2 * Math.PI, e = (cum + pct) * 2 * Math.PI;
    cum += pct;
    return {
      d: `M50 50 L${50 + 40 * Math.sin(s)} ${50 - 40 * Math.cos(s)} A40 40 0 ${pct > 0.5 ? 1 : 0} 1 ${50 + 40 * Math.sin(e)} ${50 - 40 * Math.cos(e)} Z`,
      color: COLORS[i % COLORS.length], label: String(row[fieldLabel]), pct,
    };
  });
  return (
    <div className="flex items-center gap-8 p-5">
      <svg viewBox="0 0 100 100" className="w-40 h-40 shrink-0">
        {slices.map((s, i) => <path key={i} d={s.d} fill={s.color} />)}
        <circle cx="50" cy="50" r="22" fill="white" />
      </svg>
      <div className="space-y-2">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-gray-700">{s.label}</span>
            <span className="ml-2 text-gray-500 font-medium">{(s.pct * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
function CardsViz({ data, fields, sourceFields }: { data: Record<string, string | number>[]; fields: SelectedField[]; sourceFields: Field[] }) {
  const numFields = fields.filter((f) => sourceFields.find((sf) => sf.key === f.key)?.type === "number");
  if (!numFields.length) return <p className="text-sm text-gray-500 p-8 text-center">Select numeric columns to show summary cards</p>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-5">
      {numFields.map((f) => {
        const vals = data.map((r) => Number(r[f.key]) || 0);
        const total = vals.reduce((a, b) => a + b, 0);
        return (
          <div key={f.key} className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <p className="text-xs font-medium text-indigo-600 mb-1">{f.displayLabel}</p>
            <p className="text-2xl font-bold text-gray-900">{total > 9999 ? `${(total / 1000).toFixed(1)}k` : total.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Avg: {(total / vals.length).toFixed(1)} · Max: {Math.max(...vals).toLocaleString()}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export function ReportBuilderPage() {
  // ── Page view ──
  const [view, setView] = useState<PageView>("library");

  // ── Template library state ──
  const [templates, setTemplates] = useState<ReportTemplate[]>(SEED_TEMPLATES);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // ── Builder form state ──
  const [tplName, setTplName] = useState("");
  const [tplDescription, setTplDescription] = useState("");
  const [tplApp, setTplApp] = useState("construction");
  const [tplDataSource, setTplDataSource] = useState("projects");
  const [tplReportType, setTplReportType] = useState<ReportType>("summary");
  const [tplDocumentType, setTplDocumentType] = useState<DocumentType>("Construction");
  const [builderMode, setBuilderMode] = useState<BuilderMode>("visual");
  const [selectedFields, setSelectedFields] = useState<SelectedField[]>([]);
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [sortRules, setSortRules] = useState<SortRule[]>([]);
  const [rowLimit, setRowLimit] = useState(50);
  const [vizType, setVizType] = useState<VizType>("table");
  const [sqlQuery, setSqlQuery] = useState("");
  const [hasRun, setHasRun] = useState(false);
  const [activeTab, setActiveTab] = useState<"fields" | "filters" | "sort" | "viz">("fields");
  const [showConfigPanel, setShowConfigPanel] = useState(true);
  const [deployedNotice, setDeployedNotice] = useState<string | null>(null);
  const dragIdx = useRef<number | null>(null);

  const source = DATA_SOURCES.find((s) => s.value === tplDataSource) ?? DATA_SOURCES[0];

  // ── Library helpers ──
  const openNewTemplate = () => {
    setEditingId(null);
    setTplName(""); setTplDescription(""); setTplApp("construction");
    setTplDataSource("projects"); setTplReportType("summary"); setTplDocumentType("Construction");
    setBuilderMode("visual"); setSelectedFields([]); setFilters([]);
    setSortRules([]); setRowLimit(50); setVizType("table"); setSqlQuery("");
    setHasRun(false); setActiveTab("fields"); setShowConfigPanel(true);
    setView("builder");
  };

  const openEditTemplate = (tpl: ReportTemplate) => {
    setEditingId(tpl.id);
    setTplName(tpl.name); setTplDescription(tpl.description); setTplApp(tpl.application);
    setTplDataSource(tpl.dataSource); setTplReportType(tpl.reportType); setTplDocumentType(tpl.documentType);
    setBuilderMode(tpl.builderType); setSelectedFields(tpl.selectedFields);
    setFilters(tpl.filters); setSortRules(tpl.sortRules); setRowLimit(tpl.rowLimit);
    setVizType(tpl.vizType); setSqlQuery(tpl.sqlQuery);
    setHasRun(false); setActiveTab("fields"); setShowConfigPanel(true);
    setView("builder");
  };

  const duplicateTemplate = (tpl: ReportTemplate) => {
    const copy: ReportTemplate = {
      ...tpl,
      id: Date.now().toString(),
      name: `${tpl.name} (Copy)`,
      status: "draft",
      lastUpdated: "Just now",
    };
    setTemplates((prev) => [...prev, copy]);
    setOpenDropdownId(null);
  };

  const archiveTemplate = (id: string) => {
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, status: "archived", lastUpdated: "Just now" } : t));
    setOpenDropdownId(null);
  };

  const restoreTemplate = (id: string) => {
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, status: "draft", lastUpdated: "Just now" } : t));
    setOpenDropdownId(null);
  };

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setOpenDropdownId(null);
  };

  // ── Builder helpers ──
  const buildTemplateData = (status: ReportStatus): ReportTemplate => ({
    id: editingId ?? Date.now().toString(),
    name: tplName.trim() || "Untitled Report",
    description: tplDescription,
    application: tplApp,
    reportType: tplReportType,
    documentType: tplDocumentType,
    dataSource: tplDataSource,
    builderType: builderMode,
    status,
    createdBy: "Admin User",
    lastUpdated: "Just now",
    vizType,
    selectedFields,
    filters,
    sortRules,
    rowLimit,
    sqlQuery,
  });

  const saveDraft = () => {
    const tpl = buildTemplateData("draft");
    setTemplates((prev) => editingId ? prev.map((t) => t.id === editingId ? tpl : t) : [...prev, tpl]);
    setView("library");
  };

  const deployTemplate = () => {
    const tpl = buildTemplateData("deployed");
    setTemplates((prev) => editingId ? prev.map((t) => t.id === editingId ? tpl : t) : [...prev, tpl]);
    setDeployedNotice(tpl.name);
    setTimeout(() => setDeployedNotice(null), 3500);
    setView("library");
  };

  const isSelected = (key: string) => selectedFields.some((f) => f.key === key);
  const toggleField = (field: Field) => {
    if (isSelected(field.key)) {
      setSelectedFields((prev) => prev.filter((f) => f.key !== field.key));
    } else {
      setSelectedFields((prev) => [...prev, { key: field.key, displayLabel: field.label, aggregation: "none" }]);
    }
  };
  const reorderField = (from: number, to: number) => {
    setSelectedFields((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };
  const addFilter = () => {
    setFilters((prev) => [...prev, { id: Date.now().toString(), field: source.fields[0].key, operator: "equals", value: "", valueTo: "", logic: "AND" }]);
  };
  const updateFilter = (id: string, patch: Partial<FilterRow>) =>
    setFilters((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const displayColumns = selectedFields.length > 0
    ? selectedFields
    : source.fields.map((f) => ({ key: f.key, displayLabel: f.label, aggregation: "none" as Aggregation }));

  const firstText = selectedFields.find((f) => ["text", "status"].includes(source.fields.find((sf) => sf.key === f.key)?.type ?? ""));
  const firstNum = selectedFields.find((f) => source.fields.find((sf) => sf.key === f.key)?.type === "number");

  const previewData = (() => {
    let rows = [...source.mockData];
    for (const f of filters) {
      if (!f.field) continue;
      rows = rows.filter((row) => {
        const val = row[f.field];
        const v = String(val ?? "").toLowerCase();
        const fv = f.value.toLowerCase();
        switch (f.operator) {
          case "equals": return v === fv;
          case "not_equals": return v !== fv;
          case "contains": return v.includes(fv);
          case "greater_than": return Number(val) > Number(f.value);
          case "less_than": return Number(val) < Number(f.value);
          case "is_empty": return !val || val === "";
          case "between": return Number(val) >= Number(f.value) && Number(val) <= Number(f.valueTo);
          default: return true;
        }
      });
    }
    for (const rule of [...sortRules].reverse()) {
      rows.sort((a, b) => {
        const av = a[rule.field], bv = b[rule.field];
        const cmp = typeof av === "number" ? (av as number) - (bv as number) : String(av).localeCompare(String(bv));
        return rule.direction === "asc" ? cmp : -cmp;
      });
    }
    return rows.slice(0, rowLimit);
  })();

  // ── Filtered templates for library ──
  const visibleTemplates = templates.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    }
    return true;
  });

  const totalDeployed = templates.filter((t) => t.status === "deployed").length;
  const totalDraft = templates.filter((t) => t.status === "draft").length;
  const totalArchived = templates.filter((t) => t.status === "archived").length;

  // ─────────────────────────────────────────────────────────────────────────
  // BUILDER VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (view === "builder") {
    const currentApp = APPLICATIONS.find((a) => a.key === tplApp);
    return (
      <div className="flex h-[calc(100vh-56px)] -m-6 overflow-hidden">

        {/* Config panel */}
        {showConfigPanel && (
          <div className="w-72 bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0">

            {/* Metadata section */}
            <div className="px-4 py-4 border-b border-gray-100 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Report Name</label>
                <input
                  type="text"
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  placeholder="Untitled Report"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Application</label>
                <select
                  value={tplApp}
                  onChange={(e) => setTplApp(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {APPLICATIONS.map((a) => <option key={a.key} value={a.key}>{a.icon} {a.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Report Type</label>
                <div className="flex gap-1.5">
                  {(["summary", "detailed", "analytical"] as ReportType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTplReportType(t)}
                      className={`flex-1 py-1.5 text-xs rounded-lg font-medium capitalize transition-colors ${tplReportType === t ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Document Type</label>
                <select
                  value={tplDocumentType}
                  onChange={(e) => setTplDocumentType(e.target.value as DocumentType)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {(["Finance", "HR", "Procurement", "Construction", "Storefront", "ESS", "Admin"] as DocumentType[]).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Description</label>
                <textarea
                  value={tplDescription}
                  onChange={(e) => setTplDescription(e.target.value)}
                  rows={2}
                  placeholder="Describe what this report shows..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-gray-700"
                />
              </div>
            </div>

            {/* Data source */}
            <div className="px-4 py-3 border-b border-gray-100">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Data Source</label>
              <select
                value={tplDataSource}
                onChange={(e) => { setTplDataSource(e.target.value); setSelectedFields([]); setFilters([]); setSortRules([]); setHasRun(false); }}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {DATA_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.module} — {s.label}</option>)}
              </select>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 shrink-0">
              {(["fields", "filters", "sort", "viz"] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 text-xs font-medium capitalize transition-colors border-b-2 ${activeTab === tab ? "border-indigo-500 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                  {tab}
                  {tab === "filters" && filters.length > 0 && <span className="ml-1 px-1 bg-indigo-100 text-indigo-600 rounded text-xs">{filters.length}</span>}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3">

              {/* Fields tab */}
              {activeTab === "fields" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Available fields</span>
                    <div className="flex gap-1.5">
                      <button onClick={() => setSelectedFields(source.fields.map((f) => ({ key: f.key, displayLabel: f.label, aggregation: "none" })))} className="text-xs text-indigo-600 hover:underline">All</button>
                      <span className="text-gray-300">·</span>
                      <button onClick={() => setSelectedFields([])} className="text-xs text-gray-500 hover:underline">Clear</button>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    {source.fields.map((field) => {
                      const Icon = TYPE_ICON[field.type];
                      const sel = isSelected(field.key);
                      return (
                        <button key={field.key} onClick={() => toggleField(field)} className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${sel ? "bg-indigo-50 text-indigo-700" : "hover:bg-gray-50 text-gray-700"}`}>
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${sel ? "text-indigo-500" : "text-gray-400"}`} />
                          <span className="text-xs flex-1">{field.label}</span>
                          {sel && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                        </button>
                      );
                    })}
                  </div>
                  {selectedFields.length > 0 && (
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">Selected — drag to reorder</p>
                      <div className="space-y-1">
                        {selectedFields.map((sf, idx) => (
                          <div
                            key={sf.key}
                            draggable
                            onDragStart={() => { dragIdx.current = idx; }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => { if (dragIdx.current !== null) reorderField(dragIdx.current, idx); dragIdx.current = null; }}
                            className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg"
                          >
                            <GripVertical className="w-3.5 h-3.5 text-gray-300 cursor-grab shrink-0" />
                            <input value={sf.displayLabel} onChange={(e) => setSelectedFields((prev) => prev.map((f, i) => i === idx ? { ...f, displayLabel: e.target.value } : f))} className="flex-1 text-xs bg-transparent outline-none text-gray-700 min-w-0" />
                            <button onClick={() => setSelectedFields((prev) => prev.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-400"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Filters tab */}
              {activeTab === "filters" && (
                <div className="space-y-3">
                  {!filters.length && <p className="text-xs text-gray-500 text-center py-4">No filters. All rows will be shown.</p>}
                  {filters.map((filter, idx) => {
                    const meta = source.fields.find((f) => f.key === filter.field);
                    const ops = getOps(meta?.type ?? "text");
                    return (
                      <div key={filter.id} className="space-y-1.5 bg-gray-50 rounded-lg p-2.5 border border-gray-200">
                        {idx > 0 && (
                          <div className="flex gap-1 mb-1">
                            {(["AND", "OR"] as LogicOperator[]).map((l) => (
                              <button key={l} onClick={() => updateFilter(filter.id, { logic: l })} className={`px-2 py-0.5 text-xs rounded font-medium ${filter.logic === l ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-600"}`}>{l}</button>
                            ))}
                          </div>
                        )}
                        <select value={filter.field} onChange={(e) => updateFilter(filter.id, { field: e.target.value, operator: "equals", value: "" })} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400">
                          {source.fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                        </select>
                        <select value={filter.operator} onChange={(e) => updateFilter(filter.id, { operator: e.target.value as FilterOperator })} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400">
                          {ops.map((op) => <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>)}
                        </select>
                        {filter.operator !== "is_empty" && (
                          <input value={filter.value} onChange={(e) => updateFilter(filter.id, { value: e.target.value })} placeholder="Value..." className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                        )}
                        {filter.operator === "between" && (
                          <input value={filter.valueTo} onChange={(e) => updateFilter(filter.id, { valueTo: e.target.value })} placeholder="To..." className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                        )}
                        <button onClick={() => setFilters((prev) => prev.filter((f) => f.id !== filter.id))} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"><Trash2 className="w-3 h-3" />Remove</button>
                      </div>
                    );
                  })}
                  <button onClick={addFilter} className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                    <Plus className="w-3.5 h-3.5" />Add Filter
                  </button>
                </div>
              )}

              {/* Sort tab */}
              {activeTab === "sort" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">Row Limit</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {[25, 50, 100, 500].map((n) => (
                        <button key={n} onClick={() => setRowLimit(n)} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${rowLimit === n ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-3">
                    <label className="block text-xs font-medium text-gray-500 mb-2">Sort Rules</label>
                    {!sortRules.length && <p className="text-xs text-gray-500 mb-2">Rows returned in natural order.</p>}
                    <div className="space-y-2">
                      {sortRules.map((rule, idx) => (
                        <div key={idx} className="flex gap-1.5 items-center">
                          <select value={rule.field} onChange={(e) => setSortRules((prev) => prev.map((r, i) => i === idx ? { ...r, field: e.target.value } : r))} className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400">
                            {source.fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                          </select>
                          <button onClick={() => setSortRules((prev) => prev.map((r, i) => i === idx ? { ...r, direction: r.direction === "asc" ? "desc" : "asc" } : r))} className="px-2 py-1.5 border border-gray-200 rounded text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                            {rule.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {rule.direction.toUpperCase()}
                          </button>
                          <button onClick={() => setSortRules((prev) => prev.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                    {sortRules.length < 3 && (
                      <button onClick={() => setSortRules((prev) => [...prev, { field: source.fields[0].key, direction: "asc" }])} className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                        <Plus className="w-3.5 h-3.5" />Add Sort Rule
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Viz tab */}
              {activeTab === "viz" && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-3">Visualization Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: "table", label: "Table", Icon: LayoutGrid },
                      { key: "bar", label: "Bar Chart", Icon: BarChart2 },
                      { key: "line", label: "Line Chart", Icon: LineChart },
                      { key: "pie", label: "Pie Chart", Icon: PieChart },
                      { key: "cards", label: "KPI Cards", Icon: Layers },
                    ] as const).map(({ key, label, Icon }) => (
                      <button key={key} onClick={() => setVizType(key)} className={`flex flex-col items-center gap-1.5 p-3 border rounded-xl text-xs transition-colors ${vizType === key ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                        <Icon className="w-5 h-5" />{label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right: toolbar + preview */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3 shrink-0">
            <button onClick={() => setView("library")} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Report Library</span>
            </button>
            <div className="w-px h-5 bg-gray-200 shrink-0" />
            <button onClick={() => setShowConfigPanel((v) => !v)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="Template name..."
              className="flex-1 min-w-0 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {currentApp && (
              <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 ${currentApp.color}`}>
                {currentApp.icon} {currentApp.label}
              </span>
            )}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm shrink-0">
              <button onClick={() => setBuilderMode("visual")} className={`flex items-center gap-1.5 px-3 py-1.5 ${builderMode === "visual" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                <Eye className="w-3.5 h-3.5" />Visual
              </button>
              <button onClick={() => setBuilderMode("sql")} className={`flex items-center gap-1.5 px-3 py-1.5 border-l border-gray-200 ${builderMode === "sql" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                <Code className="w-3.5 h-3.5" />SQL
              </button>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setHasRun(true)} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                <Play className="w-3.5 h-3.5" />Run
              </button>
              <button onClick={saveDraft} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Save Draft
              </button>
              <button onClick={deployTemplate} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors font-medium">
                <Rocket className="w-3.5 h-3.5" />Deploy
              </button>
            </div>
          </div>

          {/* Content */}
          {builderMode === "visual" ? (
            <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
              <div className="bg-white border-b border-gray-100 px-5 py-2.5 flex items-center gap-3 shrink-0">
                <span className="text-xs text-gray-500">{hasRun ? `${previewData.length} rows` : "Click Run to preview data"}</span>
                {hasRun && (
                  <div className="ml-auto flex gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50"><Download className="w-3.5 h-3.5" />CSV</button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50"><Printer className="w-3.5 h-3.5" />Print</button>
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-auto p-5">
                {!hasRun ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
                      <FileText className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Configure your report template</p>
                      <p className="text-xs text-gray-500 mt-1">Select fields, add filters, then click Run to preview</p>
                    </div>
                    <button onClick={() => setHasRun(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
                      <Play className="w-4 h-4" />Run Preview
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
                      {currentApp && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${currentApp.color}`}>{currentApp.label}</span>}
                      <span className="text-sm font-semibold text-gray-900">{tplName || source.label}</span>
                      <span className="text-xs text-gray-500">· {previewData.length} rows</span>
                      {filters.length > 0 && <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs rounded-full">{filters.length} filter{filters.length > 1 ? "s" : ""} active</span>}
                    </div>
                    {vizType === "table" && (
                      <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
                        <table className="w-full">
                          <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                            <tr>{displayColumns.map((col) => <th key={col.key} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{col.displayLabel}</th>)}</tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {previewData.map((row, i) => (
                              <tr key={i} className="hover:bg-gray-50/60">
                                {displayColumns.map((col) => {
                                  const val = row[col.key];
                                  const fieldType = source.fields.find((f) => f.key === col.key)?.type;
                                  return (
                                    <td key={col.key} className="px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap">
                                      {fieldType === "status" ? (
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cellStatusColor(val)}`}>{String(val)}</span>
                                      ) : fieldType === "number" ? (
                                        <span className="font-mono">{typeof val === "number" ? val.toLocaleString() : val}</span>
                                      ) : String(val ?? "—")}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {(vizType === "bar" || vizType === "line") && <BarChartViz data={previewData} fieldX={firstText?.key ?? ""} fieldY={firstNum?.key ?? ""} />}
                    {vizType === "pie" && <PieChartViz data={previewData} fieldLabel={firstText?.key ?? ""} fieldValue={firstNum?.key ?? ""} />}
                    {vizType === "cards" && <CardsViz data={previewData} fields={displayColumns} sourceFields={source.fields} />}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* SQL mode */
            <div className="flex-1 flex overflow-hidden">
              <div className="w-52 bg-white border-r border-gray-200 overflow-y-auto p-3 shrink-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Schema Reference</p>
                <p className="text-[10px] text-gray-400 mb-3">Click a field to insert into SQL</p>
                {DATA_SOURCES.map((src) => {
                  const app = APPLICATIONS.find((a) => a.key === src.appKey);
                  return (
                    <div key={src.value} className="mb-4">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${src.moduleColor}`}>{app?.icon}</span>
                        <button
                          onClick={() => {
                            const insert = `${src.value}`;
                            const ta = document.getElementById('sql-editor') as HTMLTextAreaElement | null;
                            if (ta) {
                              const start = ta.selectionStart;
                              const end = ta.selectionEnd;
                              const newVal = sqlQuery.slice(0, start) + insert + sqlQuery.slice(end);
                              setSqlQuery(newVal);
                              setTimeout(() => { ta.focus(); ta.setSelectionRange(start + insert.length, start + insert.length); }, 0);
                            } else {
                              setSqlQuery((prev) => prev + insert);
                            }
                          }}
                          className="text-xs font-semibold text-gray-700 hover:text-indigo-600 hover:underline transition-colors"
                          title={`Insert table: ${src.value}`}
                        >{src.value}</button>
                      </div>
                      <div className="pl-3 space-y-0.5">
                        {src.fields.map((f) => (
                          <button
                            key={f.key}
                            onClick={() => {
                              const insert = `${src.value}.${f.key}`;
                              const ta = document.getElementById('sql-editor') as HTMLTextAreaElement | null;
                              if (ta) {
                                const start = ta.selectionStart;
                                const end = ta.selectionEnd;
                                const newVal = sqlQuery.slice(0, start) + insert + sqlQuery.slice(end);
                                setSqlQuery(newVal);
                                setTimeout(() => { ta.focus(); ta.setSelectionRange(start + insert.length, start + insert.length); }, 0);
                              } else {
                                setSqlQuery((prev) => prev + insert);
                              }
                            }}
                            className="w-full text-left text-xs hover:bg-indigo-50 rounded px-1 py-0.5 group transition-colors"
                            title={`Insert: ${src.value}.${f.key}`}
                          >
                            <span className="text-indigo-500 group-hover:text-indigo-700">{f.key}</span>
                            <span className="text-gray-300 ml-1">({f.type})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
                <div className="bg-white border-b border-gray-100 p-4 shrink-0">
                  <textarea
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    rows={7}
                    spellCheck={false}
                  id="sql-editor"
                    className="w-full px-4 py-3 bg-gray-950 text-emerald-400 border border-gray-800 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-gray-500">Tables: {DATA_SOURCES.map((s) => s.value).join(", ")}</p>
                    <button onClick={() => setHasRun(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
                      <Play className="w-3.5 h-3.5" />Run Query
                    </button>
                  </div>
                </div>
                {hasRun && (
                  <div className="flex-1 overflow-auto p-4">
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                        <span className="text-xs text-gray-500">{source.mockData.length} rows (mock)</span>
                        <button className="ml-auto flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50"><Download className="w-3.5 h-3.5" />Export CSV</button>
                      </div>
                      <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 400px)" }}>
                        <table className="w-full">
                          <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                            <tr>{source.fields.map((f) => <th key={f.key} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{f.label}</th>)}</tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {source.mockData.map((row, i) => (
                              <tr key={i} className="hover:bg-gray-50/60">
                                {source.fields.map((f) => <td key={f.key} className="px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap font-mono">{String(row[f.key] ?? "")}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LIBRARY VIEW
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6" onClick={() => openDropdownId && setOpenDropdownId(null)}>

      {/* Deploy success notice */}
      {deployedNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 text-sm font-medium">
          <Rocket className="w-4 h-4" />
          <span>"{deployedNotice}" deployed successfully</span>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Report Builder</h1>
          <p className="text-sm text-gray-600 mt-1">Design and deploy reusable report templates across all applications</p>
        </div>
        <button
          onClick={openNewTemplate}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shrink-0"
        >
          <Plus className="w-4 h-4" />New Template
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Templates", value: templates.length, color: "text-gray-900" },
          { label: "Deployed", value: totalDeployed, color: "text-emerald-600" },
          { label: "Draft", value: totalDraft, color: "text-amber-500" },
          { label: "Archived", value: totalArchived, color: "text-gray-400" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm">
          {(["all", "deployed", "draft", "archived"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 capitalize font-medium transition-colors ${statusFilter === s ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50 border-r border-gray-200 last:border-0"}`}
            >{s}</button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Application groups */}
      {APPLICATIONS.map((app) => {
        const appTemplates = visibleTemplates.filter((t) => t.application === app.key);
        if (!appTemplates.length) return null;
        return (
          <div key={app.key}>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="text-base">{app.icon}</span>
              <h2 className="text-sm font-semibold text-gray-900">{app.label} Reports</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${app.color}`}>{appTemplates.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {appTemplates.map((tpl) => (
                <div key={tpl.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all group">
                  <div className="px-5 py-4">
                    {/* Badges row */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${statusBadge(tpl.status)}`}>{tpl.status}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${reportTypeBadge(tpl.reportType)}`}>{tpl.reportType}</span>
                      <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                        {tpl.builderType === "visual" ? <Eye className="w-3 h-3" /> : <Code className="w-3 h-3" />}
                        {tpl.builderType === "visual" ? "Visual" : "SQL"}
                      </span>
                    </div>
                    {/* Name & description */}
                    <p className="text-sm font-semibold text-gray-900 mb-1">{tpl.name}</p>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{tpl.description}</p>
                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${DATA_SOURCES.find(s => s.value === tpl.dataSource)?.moduleColor ?? "bg-gray-100 text-gray-500"}`}>
                        {DATA_SOURCES.find(s => s.value === tpl.dataSource)?.label}
                      </span>
                      <span>Updated {tpl.lastUpdated}</span>
                      <span>by {tpl.createdBy}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center gap-2">
                    {tpl.status === "deployed" && (
                      <button onClick={() => { openEditTemplate(tpl); setTimeout(() => setHasRun(true), 50); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">
                        <Play className="w-3 h-3" />Run
                      </button>
                    )}
                    {tpl.status === "draft" && (
                      <button onClick={() => { const updated = { ...tpl, status: "deployed" as ReportStatus, lastUpdated: "Just now" }; setTemplates(prev => prev.map(t => t.id === tpl.id ? updated : t)); setDeployedNotice(tpl.name); setTimeout(() => setDeployedNotice(null), 3500); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors">
                        <Rocket className="w-3 h-3" />Deploy
                      </button>
                    )}
                    {tpl.status === "archived" && (
                      <button onClick={() => restoreTemplate(tpl.id)} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors">
                        Restore
                      </button>
                    )}
                    <button onClick={() => openEditTemplate(tpl)} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
                      <Pencil className="w-3 h-3" />Edit
                    </button>
                    {/* More dropdown */}
                    <div className="relative ml-auto">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === tpl.id ? null : tpl.id); }}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {openDropdownId === tpl.id && (
                        <div onClick={(e) => e.stopPropagation()} className="absolute right-0 bottom-full mb-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                          <button onClick={() => duplicateTemplate(tpl)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
                            <Copy className="w-3.5 h-3.5 text-gray-400" />Duplicate
                          </button>
                          {tpl.status !== "archived" ? (
                            <button onClick={() => archiveTemplate(tpl.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
                              <Archive className="w-3.5 h-3.5 text-gray-400" />Archive
                            </button>
                          ) : (
                            <button onClick={() => deleteTemplate(tpl.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50">
                              <Trash2 className="w-3.5 h-3.5" />Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {visibleTemplates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-900">No templates found</p>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            {searchQuery ? `No results for "${searchQuery}"` : "No templates match the selected filter"}
          </p>
          <button onClick={openNewTemplate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" />New Template
          </button>
        </div>
      )}
    </div>
  );
}
