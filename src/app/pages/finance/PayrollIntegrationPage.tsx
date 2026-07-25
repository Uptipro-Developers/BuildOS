import { useState } from "react";
import { Download, CheckCircle, Clock, Send, Users, AlertCircle, Plus, Trash2 } from "lucide-react";
import { exportCSV } from "../../utils/exportCSV";
import { DataTable, type Column } from "../../components/DataTable";
import { useChangelog } from "../../stores/changelogStore";
import { useNumbering } from "../../stores/numberingStore";

type PayrollStatus = "Draft" | "Sent for Approval" | "Approved" | "Paid";

interface PayrollRun {
  id: string;
  period: string;
  department: string;
  headcount: number;
  grossPay: number;
  deductions: number;
  netPay: number;
  status: PayrollStatus;
  submittedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
}

interface PayrollEmployee {
  name: string;
  role: string;
  department: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  net: number;
  bank: string;
  accountNo: string;
}

const statusConfig: Record<PayrollStatus, { badge: string; icon: React.ReactNode }> = {
  Draft:               { badge: "bg-gray-100 text-gray-600",     icon: <Clock className="w-3 h-3" /> },
  "Sent for Approval": { badge: "bg-blue-100 text-blue-700",     icon: <Send className="w-3 h-3" /> },
  Approved:            { badge: "bg-emerald-100 text-emerald-700", icon: <CheckCircle className="w-3 h-3" /> },
  Paid:                { badge: "bg-teal-100 text-teal-700",      icon: <CheckCircle className="w-3 h-3" /> },
};

const mockPayrollRuns: PayrollRun[] = [
  { id: "PRLL-APR26", period: "April 2026", department: "All Departments", headcount: 148, grossPay: 5840000, deductions: 990000, netPay: 4850000, status: "Paid", submittedBy: "Ngozi Okafor", approvedBy: "Amaka Osei", approvedAt: "Apr 8, 2026", paidAt: "Apr 10, 2026" },
  { id: "PRLL-MAR26", period: "March 2026", department: "All Departments", headcount: 145, grossPay: 5720000, deductions: 970000, netPay: 4750000, status: "Paid", submittedBy: "Ngozi Okafor", approvedBy: "Amaka Osei", approvedAt: "Mar 8, 2026", paidAt: "Mar 10, 2026" },
  { id: "PRLL-MAY26", period: "May 2026", department: "All Departments", headcount: 150, grossPay: 5960000, deductions: 1010000, netPay: 4950000, status: "Approved", submittedBy: "Ngozi Okafor", approvedBy: "Amaka Osei", approvedAt: "May 7, 2026" },
  { id: "PRLL-JUN26", period: "June 2026", department: "All Departments", headcount: 152, grossPay: 6010000, deductions: 1020000, netPay: 4990000, status: "Sent for Approval", submittedBy: "Ngozi Okafor" },
  { id: "PRLL-JUL26", period: "July 2026", department: "All Departments", headcount: 152, grossPay: 6010000, deductions: 1020000, netPay: 4990000, status: "Draft" },
];

const mockEmployees: PayrollEmployee[] = [
  { name: "Amaka Osei", role: "Admin", department: "IT", basicSalary: 450000, allowances: 80000, deductions: 82000, net: 448000, bank: "GTBank", accountNo: "****8821" },
  { name: "Chukwudi Eze", role: "Construction Manager", department: "Construction", basicSalary: 380000, allowances: 60000, deductions: 68000, net: 372000, bank: "Access Bank", accountNo: "****4432" },
  { name: "Sola Adeleke", role: "Accountant", department: "Finance", basicSalary: 320000, allowances: 50000, deductions: 58000, net: 312000, bank: "Zenith Bank", accountNo: "****7715" },
  { name: "Musa Ibrahim", role: "Store Manager", department: "Procurement", basicSalary: 280000, allowances: 40000, deductions: 48000, net: 272000, bank: "First Bank", accountNo: "****2290" },
  { name: "Ngozi Okafor", role: "HR Manager", department: "HR", basicSalary: 360000, allowances: 55000, deductions: 62000, net: 353000, bank: "UBA", accountNo: "****6643" },
];

const STATUS_FLOW: PayrollStatus[] = ["Draft", "Sent for Approval", "Approved", "Paid"];

export function PayrollIntegrationPage() {
  const { logChange } = useChangelog();
  const { getNextId } = useNumbering();
  const [payrolls, setPayrolls] = useState<PayrollRun[]>(mockPayrollRuns);
  const [activeRun, setActiveRun] = useState<PayrollRun>(mockPayrollRuns[0]);

  const fmt = (n: number) => `$${n.toLocaleString()}`;

  function advance(id: string, action: string) {
    setPayrolls((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const idx = STATUS_FLOW.indexOf(p.status);
      if (idx >= STATUS_FLOW.length - 1) return p;
      const next = STATUS_FLOW[idx + 1];
      return {
        ...p,
        status: next,
        submittedBy: next === "Sent for Approval" ? "Current User" : p.submittedBy,
        approvedBy: next === "Approved" ? "Finance Manager" : p.approvedBy,
        approvedAt: next === "Approved" ? "Today" : p.approvedAt,
        paidAt: next === "Paid" ? "Today" : p.paidAt,
      };
    }));
    setActiveRun((prev) => {
      if (prev.id !== id) return prev;
      const idx = STATUS_FLOW.indexOf(prev.status);
      if (idx >= STATUS_FLOW.length - 1) return prev;
      return { ...prev, status: STATUS_FLOW[idx + 1] };
    });

    if (action === "submit") {
      logChange({ module: "Finance", action: "Sent to Finance", entityType: "PayrollRun", entityId: id, summary: "Payroll run sent to finance", performedBy: "Current User" });
    } else if (action === "approve") {
      logChange({ module: "Finance", action: "Approved", entityType: "PayrollRun", entityId: id, summary: "Payroll run approved", performedBy: "Current User" });
    } else if (action === "pay") {
      logChange({ module: "Finance", action: "Paid", entityType: "PayrollRun", entityId: id, summary: "Payroll run marked as paid", performedBy: "Current User" });
    }
  }

  function handleDelete(id: string) {
    setPayrolls((prev) => prev.filter((p) => p.id !== id));
    setActiveRun((prev) => (prev.id === id ? payrolls[0] : prev));
    logChange({ module: "Finance", action: "Deleted", entityType: "PayrollRun", entityId: id, summary: "Payroll run deleted", performedBy: "Current User" });
  }

  function handleCreate() {
    const now = new Date();
    const newRun: PayrollRun = {
      id: getNextId("PayrollRun"),
      period: `${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`,
      department: "All Departments",
      headcount: 0,
      grossPay: 0,
      deductions: 0,
      netPay: 0,
      status: "Draft",
    };
    setPayrolls((prev) => [newRun, ...prev]);
    setActiveRun(newRun);
    logChange({ module: "Finance", action: "Created", entityType: "PayrollRun", entityId: newRun.id, summary: `Payroll run ${newRun.period} created`, performedBy: "Current User" });
  }

  function handleExport() {
    exportCSV("payroll", ["ID", "Period", "Headcount", "Gross Pay", "Deductions", "Net Pay", "Status"],
      payrolls.map((p) => [p.id, p.period, String(p.headcount), fmt(p.grossPay), fmt(p.deductions), fmt(p.netPay), p.status]));
  }

  const payrollColumns: Column<PayrollRun>[] = [
    {
      key: "period",
      label: "Period",
      sortable: true,
      filterable: true,
      render: (r) => <span className="font-medium text-gray-900">{r.period}</span>,
    },
    {
      key: "headcount",
      label: "Headcount",
      sortable: true,
      render: (r) => r.headcount,
    },
    {
      key: "grossPay",
      label: "Gross Pay ($)",
      sortable: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (r) => fmt(r.grossPay),
    },
    {
      key: "deductions",
      label: "Deductions ($)",
      sortable: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (r) => fmt(r.deductions),
    },
    {
      key: "netPay",
      label: "Net Pay ($)",
      sortable: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (r) => fmt(r.netPay),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      filterable: true,
      render: (r) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium ${statusConfig[r.status].badge}`}>
          {statusConfig[r.status].icon}{r.status}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      filterable: false,
      render: (r) => (
        <div className="flex items-center gap-1">
          {r.status === "Draft" && (
            <>
              <button onClick={() => advance(r.id, "submit")} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Submit</button>
              <button onClick={() => handleDelete(r.id)} className="p-1 text-xs text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
            </>
          )}
          {r.status === "Sent for Approval" && (
            <button onClick={() => advance(r.id, "approve")} className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">Approve</button>
          )}
          {r.status === "Approved" && (
            <button onClick={() => advance(r.id, "pay")} className="px-2 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700">Pay</button>
          )}
          {r.status === "Paid" && (
            <span className="text-xs text-gray-400">—</span>
          )}
        </div>
      ),
    },
  ];

  const employeeColumns: Column<PayrollEmployee>[] = [
    {
      key: "employee",
      label: "Employee",
      render: (e) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{e.name}</p>
          <p className="text-xs text-gray-400">{e.role}</p>
        </div>
      ),
    },
    {
      key: "basic",
      label: "Basic",
      className: "text-right",
      headerClassName: "text-right",
      render: (e) => <span className="text-sm text-gray-700">{fmt(e.basicSalary)}</span>,
    },
    {
      key: "allowances",
      label: "Allowances",
      className: "text-right",
      headerClassName: "text-right",
      render: (e) => <span className="text-sm text-emerald-600">+{fmt(e.allowances)}</span>,
    },
    {
      key: "deductions",
      label: "Deductions",
      className: "text-right",
      headerClassName: "text-right",
      render: (e) => <span className="text-sm text-red-600">−{fmt(e.deductions)}</span>,
    },
    {
      key: "net",
      label: "Net",
      className: "text-right font-semibold text-gray-900",
      headerClassName: "text-right",
      render: (e) => <span>{fmt(e.net)}</span>,
    },
    {
      key: "bank",
      label: "Bank",
      render: (e) => <span className="text-xs text-gray-500">{e.bank} {e.accountNo}</span>,
    },
  ];

  const totalNet = payrolls.filter((p) => p.status === "Paid").reduce((s, p) => s + p.netPay, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Payroll Integration</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review, approve and process payroll from HR</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCreate} className="flex items-center gap-2 px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> New Run
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-800">Payroll data is received from the <strong>HR module</strong>. Review and approve here before initiating payment.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Total Paid (YTD)</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{fmt(totalNet)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Current Month</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(mockPayrollRuns[0]?.netPay ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{mockPayrollRuns[0]?.period}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Headcount</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{activeRun.headcount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Pending</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{payrolls.filter((p) => !["Paid"].includes(p.status)).length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Runs awaiting payment</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Payroll runs */}
        <div className="col-span-1">
          <DataTable
            columns={payrollColumns}
            data={payrolls}
            keyExtractor={(r) => r.id}
            searchPlaceholder="Search payroll..."
            searchFields={[(r) => r.period, (r) => r.id]}
            onRowClick={(r) => setActiveRun(r)}
            headerExtra={
              <button onClick={handleExport} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            }
            pageSize={10}
          />
        </div>

        {/* Run detail */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{activeRun.period} Payroll</h3>
                <p className="text-xs text-gray-500">{activeRun.id} · {activeRun.department}</p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-medium ${statusConfig[activeRun.status].badge}`}>
                {statusConfig[activeRun.status].icon}{activeRun.status}
              </span>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">Gross Pay</p><p className="text-lg font-bold text-gray-900">{fmt(activeRun.grossPay)}</p></div>
              <div className="bg-red-50 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">Deductions</p><p className="text-lg font-bold text-red-600">−{fmt(activeRun.deductions)}</p></div>
              <div className="bg-emerald-50 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">Net Pay</p><p className="text-lg font-bold text-emerald-700">{fmt(activeRun.netPay)}</p></div>
            </div>

            {/* Status trail */}
            <div className="space-y-2 border-t border-gray-100 pt-4 mb-4">
              {activeRun.submittedBy && <p className="text-xs text-gray-500">Submitted by <span className="font-medium text-gray-700">{activeRun.submittedBy}</span></p>}
              {activeRun.approvedBy && <p className="text-xs text-gray-500">Approved by <span className="font-medium text-gray-700">{activeRun.approvedBy}</span> on {activeRun.approvedAt}</p>}
              {activeRun.paidAt && <p className="text-xs text-emerald-600 font-medium">✓ Payment disbursed on {activeRun.paidAt}</p>}
            </div>

            {/* Action */}
            <div className="flex gap-2">
              {activeRun.status === "Draft" && (
                <button onClick={() => advance(activeRun.id, "submit")} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <span className="flex items-center gap-1.5"><Send className="w-3.5 h-3.5" /> Submit for Approval</span>
                </button>
              )}
              {activeRun.status === "Sent for Approval" && (
                <button onClick={() => advance(activeRun.id, "approve")} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                  <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Approve Payroll</span>
                </button>
              )}
              {activeRun.status === "Approved" && (
                <button onClick={() => advance(activeRun.id, "pay")} className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700">
                  <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Mark as Paid</span>
                </button>
              )}
            </div>
          </div>

          {/* Employee breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900">Employee Pay Breakdown (Sample)</h3>
            </div>
            <DataTable
              columns={employeeColumns}
              data={mockEmployees}
              keyExtractor={(e) => e.name}
              pageSize={50}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
