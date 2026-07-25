import { useState } from "react";
import {
  DollarSign, Download, CheckCircle, Clock, AlertCircle,
  TrendingUp, Users, ChevronUp, ChevronDown, Search, Filter,
} from "lucide-react";
import { exportCSV } from "../../utils/exportCSV";

type PayStatus = "paid" | "pending" | "processing";

interface PayrollEntry {
  id: string; name: string; role: string; department: string;
  gradeLevel: string; grossPay: number; deductions: number; netPay: number;
  status: PayStatus; paymentMethod: string; bankName: string;
}

const payrollData: PayrollEntry[] = [
  { id: "EMP-001", name: "Chukwudi Eze", role: "Site Engineer", department: "Engineering", gradeLevel: "Level 7", grossPay: 320000, deductions: 48000, netPay: 272000, status: "paid", paymentMethod: "Bank Transfer", bankName: "GTBank" },
  { id: "EMP-002", name: "Aisha Bello", role: "Project Manager", department: "Operations", gradeLevel: "Level 9", grossPay: 580000, deductions: 87000, netPay: 493000, status: "paid", paymentMethod: "Bank Transfer", bankName: "Zenith Bank" },
  { id: "EMP-003", name: "Robert Lee", role: "Structural Engineer", department: "Engineering", gradeLevel: "Level 8", grossPay: 420000, deductions: 63000, netPay: 357000, status: "paid", paymentMethod: "Bank Transfer", bankName: "Access Bank" },
  { id: "EMP-004", name: "Sarah Johnson", role: "Accountant", department: "Finance", gradeLevel: "Level 7", grossPay: 290000, deductions: 43500, netPay: 246500, status: "pending", paymentMethod: "Bank Transfer", bankName: "First Bank" },
  { id: "EMP-005", name: "Mike Davis", role: "Site Foreman", department: "Engineering", gradeLevel: "Level 5", grossPay: 195000, deductions: 29250, netPay: 165750, status: "paid", paymentMethod: "Bank Transfer", bankName: "UBA" },
  { id: "EMP-006", name: "Alice Ware", role: "HR Officer", department: "Human Resources", gradeLevel: "Level 6", grossPay: 245000, deductions: 36750, netPay: 208250, status: "paid", paymentMethod: "Bank Transfer", bankName: "GTBank" },
  { id: "EMP-007", name: "Tom Fox", role: "Quantity Surveyor", department: "Procurement", gradeLevel: "Level 7", grossPay: 310000, deductions: 46500, netPay: 263500, status: "paid", paymentMethod: "Bank Transfer", bankName: "Zenith Bank" },
  { id: "EMP-008", name: "Ngozi Eze", role: "Site Supervisor", department: "Engineering", gradeLevel: "Level 6", grossPay: 255000, deductions: 38250, netPay: 216750, status: "processing", paymentMethod: "Bank Transfer", bankName: "Access Bank" },
  { id: "EMP-009", name: "Kwame Asante", role: "Civil Engineer", department: "Engineering", gradeLevel: "Level 7", grossPay: 315000, deductions: 47250, netPay: 267750, status: "paid", paymentMethod: "Bank Transfer", bankName: "Stanbic IBTC" },
  { id: "EMP-010", name: "Emeka Nwosu", role: "HSE Officer", department: "Health & Safety", gradeLevel: "Level 6", grossPay: 250000, deductions: 37500, netPay: 212500, status: "paid", paymentMethod: "Bank Transfer", bankName: "UBA" },
  { id: "EMP-011", name: "Bisi Akinola", role: "Admin Officer", department: "Administration", gradeLevel: "Level 5", grossPay: 175000, deductions: 26250, netPay: 148750, status: "paid", paymentMethod: "Bank Transfer", bankName: "First Bank" },
  { id: "EMP-012", name: "Lawal Musa", role: "MEP Engineer", department: "Engineering", gradeLevel: "Level 7", grossPay: 320000, deductions: 48000, netPay: 272000, status: "pending", paymentMethod: "Bank Transfer", bankName: "GTBank" },
  { id: "EMP-013", name: "Funke Adeyemi", role: "Finance Analyst", department: "Finance", gradeLevel: "Level 6", grossPay: 260000, deductions: 39000, netPay: 221000, status: "paid", paymentMethod: "Bank Transfer", bankName: "Zenith Bank" },
  { id: "EMP-014", name: "David Obi", role: "IT Officer", department: "IT & Systems", gradeLevel: "Level 6", grossPay: 255000, deductions: 38250, netPay: 216750, status: "paid", paymentMethod: "Bank Transfer", bankName: "Access Bank" },
  { id: "EMP-015", name: "Yemi Olusegun", role: "Project Manager", department: "Operations", gradeLevel: "Level 9", grossPay: 560000, deductions: 84000, netPay: 476000, status: "paid", paymentMethod: "Bank Transfer", bankName: "First Bank" },
];

const statusConfig: Record<PayStatus, { label: string; badge: string; icon: React.ReactNode }> = {
  paid: { label: "Paid", badge: "bg-green-100 text-green-700", icon: <CheckCircle className="w-3.5 h-3.5 text-green-600" /> },
  pending: { label: "Pending", badge: "bg-amber-100 text-amber-700", icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> },
  processing: { label: "Processing", badge: "bg-blue-100 text-blue-700", icon: <Clock className="w-3.5 h-3.5 text-blue-500" /> },
};

const fmt = (n: number) => `₦${n.toLocaleString()}`;
const depts = ["All Departments", ...Array.from(new Set(payrollData.map(p => p.department))).sort()];

const prevMonthTotal = 27_500_000;
const currentMonth = "April 2025";

type SortKey = "name" | "gross" | "deductions" | "net" | "status";
type SortDir = "asc" | "desc";

export function PayrollPage() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState<PayStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("net");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  }

  const filtered = payrollData
    .filter(p => {
      const matchS = p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase());
      const matchD = deptFilter === "All Departments" || p.department === deptFilter;
      const matchSt = statusFilter === "all" || p.status === statusFilter;
      return matchS && matchD && matchSt;
    })
    .sort((a, b) => {
      let v = 0;
      if (sortKey === "name") v = a.name.localeCompare(b.name);
      else if (sortKey === "gross") v = a.grossPay - b.grossPay;
      else if (sortKey === "deductions") v = a.deductions - b.deductions;
      else if (sortKey === "net") v = a.netPay - b.netPay;
      else if (sortKey === "status") v = a.status.localeCompare(b.status);
      return sortDir === "asc" ? v : -v;
    });

  const totalGross = filtered.reduce((s, p) => s + p.grossPay, 0);
  const totalDed = filtered.reduce((s, p) => s + p.deductions, 0);
  const totalNet = filtered.reduce((s, p) => s + p.netPay, 0);
  const paidCount = filtered.filter(p => p.status === "paid").length;
  const pendingCount = filtered.filter(p => p.status === "pending").length;

  const mthDiff = ((totalGross - prevMonthTotal) / prevMonthTotal * 100).toFixed(1);
  const isUp = totalGross >= prevMonthTotal;

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-indigo-600" /> : <ChevronDown className="w-3 h-3 text-indigo-600" />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payroll Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">{currentMonth} · {payrollData.length} employees</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            const headers = ["Employee ID", "Name", "Role", "Department", "Grade", "Gross Pay", "Deductions", "Net Pay", "Bank", "Payment Method", "Status"];
            const rows = filtered.map(p => [p.id, p.name, p.role, p.department, p.gradeLevel, fmt(p.grossPay), fmt(p.deductions), fmt(p.netPay), p.bankName, p.paymentMethod, statusConfig[p.status].label]);
            exportCSV(`payroll-${currentMonth.replace(/\s/g, "-")}`, headers, rows);
          }} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            <Download className="w-3.5 h-3.5" /> Export Payroll
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 text-white rounded-md text-sm hover:bg-indigo-800">
            Run Payroll Cycle
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">Total Gross Pay</p>
            <div className={`flex items-center gap-0.5 text-xs font-medium ${isUp ? "text-green-600" : "text-red-500"}`}>
              {isUp ? <TrendingUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}{Math.abs(parseFloat(mthDiff))}%
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{fmt(totalGross)}</p>
          <p className="text-xs text-gray-400 mt-0.5">vs ₦27.5M last month</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2">Total Deductions</p>
          <p className="text-2xl font-bold text-red-600">{fmt(totalDed)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{((totalDed / totalGross) * 100).toFixed(1)}% of gross</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2">Total Net Payout</p>
          <p className="text-2xl font-bold text-green-700">{fmt(totalNet)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Disbursed to employees</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2">Payment Status</p>
          <div className="flex items-center gap-3 mt-1">
            <div>
              <p className="text-xl font-bold text-green-700">{paidCount}</p>
              <p className="text-xs text-gray-400">Paid</p>
            </div>
            <div className="h-8 w-px bg-gray-200"></div>
            <div>
              <p className="text-xl font-bold text-amber-600">{pendingCount}</p>
              <p className="text-xs text-gray-400">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dept breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-800 text-sm mb-4">Payroll by Department</h3>
        <div className="space-y-2.5">
          {(["Engineering", "Operations", "Finance", "Procurement", "Human Resources", "Health & Safety", "Administration", "IT & Systems"] as const).map(dept => {
            const deptData = payrollData.filter(p => p.department === dept);
            const deptTotal = deptData.reduce((s, p) => s + p.netPay, 0);
            const pct = ((deptTotal / totalNet) * 100).toFixed(1);
            return (
              <div key={dept} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-32 flex-shrink-0">{dept}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                </div>
                <div className="text-right w-28">
                  <span className="text-xs font-medium text-gray-700">{fmt(deptTotal)}</span>
                  <span className="text-xs text-gray-400 ml-1">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters + table */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white">
          {depts.map(d => <option key={d}>{d}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as PayStatus | "all")}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white">
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer" onClick={() => handleSort("name")}>
                <div className="flex items-center gap-1">Employee<SortIcon col="name" /></div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Department</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Grade</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer text-right" onClick={() => handleSort("gross")}>
                <div className="flex items-center justify-end gap-1">Gross Pay<SortIcon col="gross" /></div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer text-right" onClick={() => handleSort("deductions")}>
                <div className="flex items-center justify-end gap-1">Deductions<SortIcon col="deductions" /></div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer text-right" onClick={() => handleSort("net")}>
                <div className="flex items-center justify-end gap-1">Net Pay<SortIcon col="net" /></div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Bank</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer" onClick={() => handleSort("status")}>
                <div className="flex items-center gap-1">Status<SortIcon col="status" /></div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(emp => {
              const cfg = statusConfig[emp.status];
              return (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-400">{emp.role}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{emp.department}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{emp.gradeLevel}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700">{fmt(emp.grossPay)}</td>
                  <td className="px-4 py-3 text-right text-red-500">-{fmt(emp.deductions)}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">{fmt(emp.netPay)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{emp.bankName}</td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium w-fit ${cfg.badge}`}>
                      {cfg.icon}{cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-gray-200 bg-gray-50">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-700">Totals ({filtered.length} employees)</td>
              <td className="px-4 py-3 text-right font-bold text-gray-800">{fmt(filtered.reduce((s, p) => s + p.grossPay, 0))}</td>
              <td className="px-4 py-3 text-right font-bold text-red-600">-{fmt(filtered.reduce((s, p) => s + p.deductions, 0))}</td>
              <td className="px-4 py-3 text-right font-bold text-green-700">{fmt(filtered.reduce((s, p) => s + p.netPay, 0))}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
