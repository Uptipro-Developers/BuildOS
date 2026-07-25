import { useState } from "react";
import {
  CheckCircle, AlertCircle, Clock, Download, Play, RefreshCw,
  ChevronDown, ChevronUp, Loader, FileText, ArrowRight,
} from "lucide-react";

type RunStatus = "idle" | "running" | "complete" | "error";
type EmpPayStatus = "included" | "excluded" | "on_hold";
type ApprovalStage = "draft" | "sent_for_approval" | "manager_approved" | "sent_to_finance" | "finance_confirmed" | "paid";

interface ProcessEntry {
  id: string; name: string; department: string; gradeLevel: string;
  basicSalary: number; allowances: number; deductions: number; netPay: number;
  status: EmpPayStatus; note: string;
}

const processData: ProcessEntry[] = [
  { id: "EMP-001", name: "Chukwudi Eze", department: "Engineering", gradeLevel: "Level 7", basicSalary: 320000, allowances: 103000, deductions: 48000, netPay: 375000, status: "included", note: "" },
  { id: "EMP-002", name: "Aisha Bello", department: "Operations", gradeLevel: "Level 9", basicSalary: 580000, allowances: 174000, deductions: 87000, netPay: 667000, status: "included", note: "" },
  { id: "EMP-003", name: "Robert Lee", department: "Engineering", gradeLevel: "Level 8", basicSalary: 420000, allowances: 126000, deductions: 63000, netPay: 483000, status: "included", note: "" },
  { id: "EMP-004", name: "Sarah Johnson", department: "Finance", gradeLevel: "Level 7", basicSalary: 290000, allowances: 87000, deductions: 43500, netPay: 333500, status: "on_hold", note: "Missing bank details" },
  { id: "EMP-005", name: "Mike Davis", department: "Engineering", gradeLevel: "Level 5", basicSalary: 195000, allowances: 63000, deductions: 29250, netPay: 228750, status: "included", note: "" },
  { id: "EMP-006", name: "Alice Ware", department: "Human Resources", gradeLevel: "Level 6", basicSalary: 245000, allowances: 73500, deductions: 36750, netPay: 281750, status: "included", note: "" },
  { id: "EMP-007", name: "Tom Fox", department: "Procurement", gradeLevel: "Level 7", basicSalary: 310000, allowances: 93000, deductions: 46500, netPay: 356500, status: "included", note: "" },
  { id: "EMP-008", name: "Ngozi Eze", department: "Engineering", gradeLevel: "Level 6", basicSalary: 255000, allowances: 76500, deductions: 38250, netPay: 293250, status: "included", note: "" },
  { id: "EMP-009", name: "Kwame Asante", department: "Engineering", gradeLevel: "Level 7", basicSalary: 315000, allowances: 94500, deductions: 47250, netPay: 362250, status: "included", note: "" },
  { id: "EMP-010", name: "Emeka Nwosu", department: "Health & Safety", gradeLevel: "Level 6", basicSalary: 250000, allowances: 75000, deductions: 37500, netPay: 287500, status: "included", note: "" },
  { id: "EMP-011", name: "Bisi Akinola", department: "Administration", gradeLevel: "Level 5", basicSalary: 175000, allowances: 63000, deductions: 26250, netPay: 211750, status: "included", note: "" },
  { id: "EMP-012", name: "Lawal Musa", department: "Engineering", gradeLevel: "Level 7", basicSalary: 320000, allowances: 96000, deductions: 48000, netPay: 368000, status: "excluded", note: "Resigned – last day Apr 10" },
  { id: "EMP-013", name: "Funke Adeyemi", department: "Finance", gradeLevel: "Level 6", basicSalary: 260000, allowances: 78000, deductions: 39000, netPay: 299000, status: "included", note: "" },
  { id: "EMP-014", name: "David Obi", department: "IT & Systems", gradeLevel: "Level 6", basicSalary: 255000, allowances: 76500, deductions: 38250, netPay: 293250, status: "included", note: "" },
  { id: "EMP-015", name: "Yemi Olusegun", department: "Operations", gradeLevel: "Level 9", basicSalary: 560000, allowances: 168000, deductions: 84000, netPay: 644000, status: "included", note: "" },
];

const statusConfig: Record<EmpPayStatus, { label: string; badge: string }> = {
  included: { label: "Included", badge: "bg-green-100 text-green-700" },
  excluded: { label: "Excluded", badge: "bg-red-100 text-red-700" },
  on_hold: { label: "On Hold", badge: "bg-amber-100 text-amber-700" },
};

const fmt = (n: number) => `₦${n.toLocaleString()}`;

export function PayrollProcessingPage() {
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [approvalStage, setApprovalStage] = useState<ApprovalStage>("draft");
  const [stageTimestamps, setStageTimestamps] = useState<Partial<Record<ApprovalStage, string>>>({});
  const [month, setMonth] = useState("April 2025");
  const [entries, setEntries] = useState<ProcessEntry[]>(processData);
  const [showPreview, setShowPreview] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const included = entries.filter(e => e.status === "included");
  const onHold = entries.filter(e => e.status === "on_hold");
  const excluded = entries.filter(e => e.status === "excluded");

  const totalGross = included.reduce((s, e) => s + (e.basicSalary + e.allowances), 0);
  const totalDed = included.reduce((s, e) => s + e.deductions, 0);
  const totalNet = included.reduce((s, e) => s + e.netPay, 0);

  const now = () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) + " — Apr 10, 2026";

  function advanceStage(from: ApprovalStage, to: ApprovalStage) {
    setApprovalStage(to);
    setStageTimestamps(t => ({ ...t, [to]: now() }));
  }

  function runPayroll() {
    setRunStatus("running");
    setTimeout(() => {
      setRunStatus("complete");
      advanceStage("draft", "sent_for_approval");
    }, 2500);
  }

  function toggleStatus(id: string, status: EmpPayStatus) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  }

  const months = ["January 2025", "February 2025", "March 2025", "April 2025", "May 2025", "June 2025"];

  // Approval pipeline definition
  const APPROVAL_STAGES: { key: ApprovalStage; label: string; actor: string }[] = [
    { key: "draft",            label: "Payroll Created",    actor: "System"             },
    { key: "sent_for_approval",label: "Sent for Approval",  actor: "HR Manager"         },
    { key: "manager_approved", label: "Manager Approved",   actor: "Finance Manager"    },
    { key: "sent_to_finance",  label: "Sent to Finance",    actor: "Finance Team"       },
    { key: "finance_confirmed",label: "Finance Confirmed",  actor: "Finance Director"   },
    { key: "paid",             label: "Paid",               actor: "Bank / System"      },
  ];

  const stageIndex = APPROVAL_STAGES.findIndex(s => s.key === approvalStage);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payroll Processing</h1>
          <p className="text-sm text-gray-500 mt-0.5">Generate, validate, and disburse payroll for the selected pay period</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e => setMonth(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white">
            {months.map(m => <option key={m}>{m}</option>)}
          </select>
          <button onClick={() => setShowPreview(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            <FileText className="w-3.5 h-3.5" /> Preview Report
          </button>
          <button onClick={runPayroll} disabled={runStatus === "running" || runStatus === "complete"}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-700 text-white rounded-md text-sm hover:bg-indigo-800 disabled:opacity-60">
            {runStatus === "running" ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing...</>
              : runStatus === "complete" ? <><CheckCircle className="w-3.5 h-3.5" /> Completed</>
              : <><Play className="w-3.5 h-3.5" /> Run Payroll</>}
          </button>
        </div>
      </div>

      {/* Approval Pipeline */}
      {approvalStage !== "draft" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Approval Flow — {month}</h3>
          <div className="flex items-start gap-0">
            {APPROVAL_STAGES.map((stage, i) => {
              const done = i < stageIndex;
              const active = i === stageIndex;
              const future = i > stageIndex;
              return (
                <div key={stage.key} className="flex-1 flex flex-col items-center">
                  {/* Step circle + connector */}
                  <div className="flex items-center w-full">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-xs font-bold border-2 transition-colors ${
                      done   ? "bg-green-500 border-green-500 text-white" :
                      active ? "bg-indigo-600 border-indigo-600 text-white" :
                               "bg-white border-gray-200 text-gray-400"
                    }`}>
                      {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
                    </div>
                    {i < APPROVAL_STAGES.length - 1 && (
                      <div className={`flex-1 h-0.5 ${done ? "bg-green-400" : "bg-gray-200"}`} />
                    )}
                  </div>
                  {/* Label */}
                  <div className="mt-2 text-center px-1">
                    <p className={`text-xs font-medium ${active ? "text-indigo-700" : done ? "text-gray-700" : "text-gray-400"}`}>{stage.label}</p>
                    {(done || active) && stageTimestamps[stage.key as ApprovalStage] && (
                      <p className="text-[10px] text-gray-400 mt-0.5">{stageTimestamps[stage.key as ApprovalStage]}</p>
                    )}
                    <p className="text-[10px] text-gray-400">{stage.actor}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-4">
            {approvalStage === "sent_for_approval" && (
              <button onClick={() => advanceStage("sent_for_approval", "manager_approved")}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">
                <CheckCircle className="w-4 h-4" /> Approve as Manager
              </button>
            )}
            {approvalStage === "manager_approved" && (
              <button onClick={() => advanceStage("manager_approved", "sent_to_finance")}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">
                <ArrowRight className="w-4 h-4" /> Send to Finance
              </button>
            )}
            {approvalStage === "sent_to_finance" && (
              <button onClick={() => advanceStage("sent_to_finance", "finance_confirmed")}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700">
                <CheckCircle className="w-4 h-4" /> Confirm Payment (Finance)
              </button>
            )}
            {approvalStage === "finance_confirmed" && (
              <button onClick={() => advanceStage("finance_confirmed", "paid")}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700">
                <CheckCircle className="w-4 h-4" /> Mark as Paid
              </button>
            )}
            {approvalStage === "paid" && (
              <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                <CheckCircle className="w-4 h-4" /> Payroll fully disbursed
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status banner */}
      {runStatus === "complete" && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-green-700">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>Payroll for <strong>{month}</strong> has been processed successfully. {included.length} employees paid. Total disbursed: <strong>{fmt(totalNet)}</strong>.</span>
          <button className="ml-auto flex items-center gap-1 text-green-700 hover:underline text-xs"><Download className="w-3 h-3" /> Download PDF</button>
        </div>
      )}
      {onHold.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-amber-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span><strong>{onHold.length} employee{onHold.length > 1 ? "s" : ""}</strong> on hold. Resolve issues before running payroll.</span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Employees Included", value: included.length, sub: `${onHold.length} on hold, ${excluded.length} excluded`, color: "text-indigo-700 bg-indigo-50" },
          { label: "Total Gross Pay", value: fmt(totalGross), sub: "Basic + Allowances", color: "text-gray-800 bg-gray-50" },
          { label: "Total Deductions", value: fmt(totalDed), sub: "Tax + Pension + NHF", color: "text-red-700 bg-red-50" },
          { label: "Total Net Payout", value: fmt(totalNet), sub: "To be disbursed", color: "text-green-700 bg-green-50" },
        ].map(s => (
          <div key={s.label} className={`rounded-lg p-4 ${s.color}`}>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
            <p className="text-xs mt-0.5 opacity-60">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-800 text-sm mb-3">Pre-Run Checklist</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "All salary bands configured", done: true },
            { label: "Attendance data for April imported", done: true },
            { label: "Bank account details verified", done: onHold.length === 0 },
            { label: "Deduction schedules updated", done: true },
            { label: "Previous month payroll reconciled", done: true },
            { label: "Tax rates up to date", done: true },
          ].map(item => (
            <div key={item.label} className={`flex items-center gap-2 text-sm px-3 py-2 rounded ${item.done ? "text-green-700" : "text-amber-600"}`}>
              {item.done ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* Employee list */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">{entries.length} Employees · {month}</p>
          <div className="flex gap-2 text-xs">
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">{included.length} Included</span>
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">{onHold.length} On Hold</span>
            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">{excluded.length} Excluded</span>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Employee</th>
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Department</th>
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right">Basic</th>
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right">Allowances</th>
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right">Deductions</th>
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right">Net Pay</th>
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {entries.map(emp => {
              const cfg = statusConfig[emp.status];
              return (
                <tr key={emp.id} className={`hover:bg-gray-50 ${emp.status === "excluded" ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{emp.id}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{emp.department}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmt(emp.basicSalary)}</td>
                  <td className="px-4 py-3 text-right text-green-600">+{fmt(emp.allowances)}</td>
                  <td className="px-4 py-3 text-right text-red-500">-{fmt(emp.deductions)}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">{fmt(emp.netPay)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>{cfg.label}</span>
                      {emp.note && <span className="text-xs text-amber-600 italic truncate max-w-28" title={emp.note}>{emp.note}</span>}
                      <select value={emp.status} onChange={e => toggleStatus(emp.id, e.target.value as EmpPayStatus)}
                        className="ml-auto text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white">
                        <option value="included">Include</option>
                        <option value="on_hold">Hold</option>
                        <option value="excluded">Exclude</option>
                      </select>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
