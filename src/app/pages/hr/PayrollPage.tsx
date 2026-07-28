import { useState, useEffect } from "react";
import { formatCurrencyByGeneralSettings } from "../../utils/generalSettings";
import { getPayslips } from "../../api/hr-extras";
import {
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  Search,
} from "lucide-react";
import { exportCSV } from "../../utils/exportCSV";

type PayStatus = "paid" | "pending" | "processing";

interface PayrollEntry {
  id: string;
  name: string;
  role: string;
  department: string;
  gradeLevel: string;
  grossPay: number;
  deductions: number;
  netPay: number;
  status: PayStatus;
  paymentMethod: string;
  bankName: string;
  period?: string;
}

const statusConfig: Record<
  PayStatus,
  { label: string; badge: string; icon: React.ReactNode }
> = {
  paid: {
    label: "Paid",
    badge: "bg-green-100 text-green-700",
    icon: <CheckCircle className="w-3.5 h-3.5 text-green-600" />,
  },
  pending: {
    label: "Pending",
    badge: "bg-amber-100 text-amber-700",
    icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />,
  },
  processing: {
    label: "Processing",
    badge: "bg-blue-100 text-blue-700",
    icon: <Clock className="w-3.5 h-3.5 text-blue-500" />,
  },
};

const fmt = (n: number) =>
  formatCurrencyByGeneralSettings(n, { minimumFractionDigits: 0 });

type SortKey = "name" | "gross" | "deductions" | "net" | "status";
type SortDir = "asc" | "desc";

export function PayrollPage() {
  const [payrollData, setPayrollData] = useState<PayrollEntry[]>([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState<PayStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("net");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const depts = [
    "All Departments",
    ...Array.from(new Set(payrollData.map((p) => p.department))).sort(),
  ];

  useEffect(() => {
    getPayslips()
      .then((data) =>
        setPayrollData(
          data.map((s) => ({
            id: s.employeeId,
            name: s.employeeName,
            role: "—",
            department: s.department ?? "—",
            gradeLevel: "—",
            grossPay: s.grossPay,
            deductions: s.deductions,
            netPay: s.netPay,
            status: (["paid", "pending", "processing"] as const).includes(
              s.status as PayStatus,
            )
              ? (s.status as PayStatus)
              : "pending",
            paymentMethod: "Bank Transfer",
            bankName: "—",
            period: s.period,
          })),
        ),
      )
      .catch(() => {});
  }, []);

  function handleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  }

  const filtered = payrollData
    .filter((p) => {
      const matchS =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase());
      const matchD =
        deptFilter === "All Departments" || p.department === deptFilter;
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
  const paidCount = filtered.filter((p) => p.status === "paid").length;
  const pendingCount = filtered.filter((p) => p.status === "pending").length;
  const currentMonth =
    payrollData[0]?.period ??
    new Date().toLocaleString("default", { month: "long", year: "numeric" });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-indigo-600" />
    ) : (
      <ChevronDown className="w-3 h-3 text-indigo-600" />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Payroll Overview
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {currentMonth} · {payrollData.length} employees
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const headers = [
                "Employee ID",
                "Name",
                "Role",
                "Department",
                "Grade",
                "Gross Pay",
                "Deductions",
                "Net Pay",
                "Bank",
                "Payment Method",
                "Status",
              ];
              const rows = filtered.map((p) => [
                p.id,
                p.name,
                p.role,
                p.department,
                p.gradeLevel,
                fmt(p.grossPay),
                fmt(p.deductions),
                fmt(p.netPay),
                p.bankName,
                p.paymentMethod,
                statusConfig[p.status].label,
              ]);
              exportCSV(
                `payroll-${currentMonth.replace(/\s/g, "-")}`,
                headers,
                rows,
              );
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
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
            <TrendingUp className="w-3 h-3 text-gray-300" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{fmt(totalGross)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{currentMonth}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2">Total Deductions</p>
          <p className="text-2xl font-bold text-red-600">{fmt(totalDed)}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {((totalDed / totalGross) * 100).toFixed(1)}% of gross
          </p>
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
        <h3 className="font-medium text-gray-800 text-sm mb-4">
          Payroll by Department
        </h3>
        <div className="space-y-2.5">
          {(
            [
              "Engineering",
              "Operations",
              "Finance",
              "Procurement",
              "Human Resources",
              "Health & Safety",
              "Administration",
              "IT & Systems",
            ] as const
          ).map((dept) => {
            const deptData = payrollData.filter((p) => p.department === dept);
            const deptTotal = deptData.reduce((s, p) => s + p.netPay, 0);
            const pct = ((deptTotal / totalNet) * 100).toFixed(1);
            return (
              <div key={dept} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-32 flex-shrink-0">
                  {dept}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full"
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
                <div className="text-right w-28">
                  <span className="text-xs font-medium text-gray-700">
                    {fmt(deptTotal)}
                  </span>
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
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
        >
          {depts.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PayStatus | "all")}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
        >
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
              <th
                className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-1">
                  Employee
                  <SortIcon col="name" />
                </div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                Department
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                Grade
              </th>
              <th
                className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer text-right"
                onClick={() => handleSort("gross")}
              >
                <div className="flex items-center justify-end gap-1">
                  Gross Pay
                  <SortIcon col="gross" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer text-right"
                onClick={() => handleSort("deductions")}
              >
                <div className="flex items-center justify-end gap-1">
                  Deductions
                  <SortIcon col="deductions" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer text-right"
                onClick={() => handleSort("net")}
              >
                <div className="flex items-center justify-end gap-1">
                  Net Pay
                  <SortIcon col="net" />
                </div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                Bank
              </th>
              <th
                className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-1">
                  Status
                  <SortIcon col="status" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((emp) => {
              const cfg = statusConfig[emp.status] ?? {
                badge: "bg-gray-100 text-gray-700",
                icon: <Clock className="w-3.5 h-3.5 text-gray-500" />,
                label: String(emp.status ?? "Unknown"),
              };
              return (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-400">{emp.role}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {emp.department}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {emp.gradeLevel}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700">
                    {fmt(emp.grossPay)}
                  </td>
                  <td className="px-4 py-3 text-right text-red-500">
                    -{fmt(emp.deductions)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">
                    {fmt(emp.netPay)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {emp.bankName}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium w-fit ${cfg.badge}`}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-gray-200 bg-gray-50">
            <tr>
              <td
                colSpan={3}
                className="px-4 py-3 text-sm font-semibold text-gray-700"
              >
                Totals ({filtered.length} employees)
              </td>
              <td className="px-4 py-3 text-right font-bold text-gray-800">
                {fmt(filtered.reduce((s, p) => s + p.grossPay, 0))}
              </td>
              <td className="px-4 py-3 text-right font-bold text-red-600">
                -{fmt(filtered.reduce((s, p) => s + p.deductions, 0))}
              </td>
              <td className="px-4 py-3 text-right font-bold text-green-700">
                {fmt(filtered.reduce((s, p) => s + p.netPay, 0))}
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
