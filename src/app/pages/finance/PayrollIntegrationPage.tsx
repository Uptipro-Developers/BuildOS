import { useState, useEffect } from "react";
import { formatCurrencyByGeneralSettings } from "../../utils/generalSettings";
import { getAuthUserName } from "../../utils/useAuthUser";
import {
  getPayrollEntries,
  getPayrollRuns,
  PayrollRun as ApiPayrollRun,
} from "../../api/hr-extras";
import {
  Download,
  CheckCircle,
  Clock,
  Send,
  Users,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
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
  department: string;
  grossPay: number;
  allowances: number;
  deductions: number;
  netPay: number;
}

const statusConfig: Record<
  PayrollStatus,
  { badge: string; icon: React.ReactNode }
> = {
  Draft: {
    badge: "bg-gray-100 text-gray-600",
    icon: <Clock className="w-3 h-3" />,
  },
  "Sent for Approval": {
    badge: "bg-blue-100 text-blue-700",
    icon: <Send className="w-3 h-3" />,
  },
  Approved: {
    badge: "bg-emerald-100 text-emerald-700",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  Paid: {
    badge: "bg-teal-100 text-teal-700",
    icon: <CheckCircle className="w-3 h-3" />,
  },
};

const STATUS_FLOW: PayrollStatus[] = [
  "Draft",
  "Sent for Approval",
  "Approved",
  "Paid",
];

export function PayrollIntegrationPage() {
  const { logChange } = useChangelog();
  const { getNextId } = useNumbering();
  const [payrolls, setPayrolls] = useState<PayrollRun[]>([]);
  const [activeRun, setActiveRun] = useState<PayrollRun | null>(null);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);

  useEffect(() => {
    getPayrollRuns()
      .then((data: ApiPayrollRun[]) => {
        const mapped: PayrollRun[] = data.map((r) => ({
          id: r.id,
          period: r.periodName,
          department: "All Departments",
          headcount: r.employeeCount,
          grossPay: r.totalGross,
          deductions: r.totalGross - r.totalNet,
          netPay: r.totalNet,
          status: (["Draft", "Sent for Approval", "Approved", "Paid"].includes(
            r.status,
          )
            ? r.status
            : "Draft") as PayrollStatus,
          submittedBy: r.processedBy ?? undefined,
        }));
        setPayrolls(mapped);
        if (mapped.length > 0) setActiveRun(mapped[0]);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!activeRun) {
      setEmployees([]);
      return;
    }
    getPayrollEntries(activeRun.id)
      .then((entries) =>
        setEmployees(
          entries.map((e) => ({
            name: e.employeeName,
            department: e.department ?? "",
            grossPay: e.grossPay,
            allowances: e.allowances,
            deductions: e.deductions,
            netPay: e.netPay,
          })),
        ),
      )
      .catch(() => setEmployees([]));
  }, [activeRun?.id]);

  const fmt = (n: number) =>
    formatCurrencyByGeneralSettings(n, { minimumFractionDigits: 0 });

  function advance(id: string, action: string) {
    setPayrolls((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const idx = STATUS_FLOW.indexOf(p.status);
      if (idx >= STATUS_FLOW.length - 1) return p;
      const next = STATUS_FLOW[idx + 1];
      return {
        ...p,
        status: next,
        submittedBy: next === "Sent for Approval" ? (getAuthUserName() || "Current User") : p.submittedBy,
        approvedBy: next === "Approved" ? (getAuthUserName() || "Finance Manager") : p.approvedBy,
        approvedAt: next === "Approved"
          ? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : p.approvedAt,
        paidAt: next === "Paid"
          ? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : p.paidAt,
      };
    }));
    setActiveRun((prev) => {
      if (!prev) return prev;
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
    setActiveRun((prev) => (prev && prev.id === id ? payrolls.find((p) => p.id !== id) ?? null : prev));
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
    exportCSV(
      "payroll",
      [
        "ID",
        "Period",
        "Headcount",
        "Gross Pay",
        "Deductions",
        "Net Pay",
        "Status",
      ],
      payrolls.map((p) => [
        p.id,
        p.period,
        String(p.headcount),
        fmt(p.grossPay),
        fmt(p.deductions),
        fmt(p.netPay),
        p.status,
      ]),
    );
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
          <p className="text-xs text-gray-400">{e.department || "—"}</p>
        </div>
      ),
    },
    {
      key: "basic",
      label: "Basic",
      className: "text-right",
      headerClassName: "text-right",
      render: (e) => <span className="text-sm text-gray-700">{fmt(e.grossPay - e.allowances)}</span>,
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
      render: (e) => <span>{fmt(e.netPay)}</span>,
    },
    {
      key: "bank",
      label: "Bank",
      render: () => <span className="text-xs text-gray-500">Not available</span>,
    },
  ];

  const totalNet = payrolls.filter((p) => p.status === "Paid").reduce((s, p) => s + p.netPay, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Payroll Integration
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Review, approve and process payroll from HR
          </p>
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
        <p className="text-sm text-blue-800">
          Payroll data is received from the <strong>HR module</strong>. Review
          and approve here before initiating payment.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Total Paid (YTD)</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {fmt(totalNet)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Current Month</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {fmt(activeRun?.netPay ?? 0)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {activeRun?.period ?? "—"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Headcount</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {activeRun?.headcount ?? "—"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Pending</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {payrolls.filter((p) => !["Paid"].includes(p.status)).length}
          </p>
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
          {activeRun && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {activeRun.period} Payroll
                  </h3>
                  <p className="text-xs text-gray-500">
                    {activeRun.id} · {activeRun.department}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-medium ${statusConfig[activeRun.status].badge}`}
                >
                  {statusConfig[activeRun.status].icon}
                  {activeRun.status}
                </span>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Gross Pay</p>
                  <p className="text-lg font-bold text-gray-900">
                    {fmt(activeRun.grossPay)}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Deductions</p>
                  <p className="text-lg font-bold text-red-600">
                    −{fmt(activeRun.deductions)}
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Net Pay</p>
                  <p className="text-lg font-bold text-emerald-700">
                    {fmt(activeRun.netPay)}
                  </p>
                </div>
              </div>

              {/* Status trail */}
              <div className="space-y-2 border-t border-gray-100 pt-4 mb-4">
                {activeRun.submittedBy && (
                  <p className="text-xs text-gray-500">
                    Submitted by{" "}
                    <span className="font-medium text-gray-700">
                      {activeRun.submittedBy}
                    </span>
                  </p>
                )}
                {activeRun.approvedBy && (
                  <p className="text-xs text-gray-500">
                    Approved by{" "}
                    <span className="font-medium text-gray-700">
                      {activeRun.approvedBy}
                    </span>{" "}
                    on {activeRun.approvedAt}
                  </p>
                )}
                {activeRun.paidAt && (
                  <p className="text-xs text-emerald-600 font-medium">
                    ✓ Payment disbursed on {activeRun.paidAt}
                  </p>
                )}
              </div>

              {/* Action */}
              <div className="flex gap-2">
                {activeRun.status === "Draft" && (
                  <button
                    onClick={() => advance(activeRun.id, "submit")}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <span className="flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" /> Submit for Approval
                    </span>
                  </button>
                )}
                {activeRun.status === "Sent for Approval" && (
                  <button
                    onClick={() => advance(activeRun.id, "approve")}
                    className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Approve Payroll
                    </span>
                  </button>
                )}
                {activeRun.status === "Approved" && (
                  <button
                    onClick={() => advance(activeRun.id, "pay")}
                    className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                  >
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Mark as Paid
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Employee breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900">
                Employee Pay Breakdown
              </h3>
            </div>
            <DataTable
              columns={employeeColumns}
              data={employees}
              keyExtractor={(e) => e.name}
              pageSize={50}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
