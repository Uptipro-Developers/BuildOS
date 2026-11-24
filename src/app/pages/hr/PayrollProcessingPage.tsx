import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  formatCurrencyByGeneralSettings,
  formatDateByGeneralSettings,
  formatTimeByGeneralSettings,
} from "../../utils/generalSettings";
import {
  documentFooter,
  documentHeader,
  escapeHtml,
  printDocument,
} from "../../utils/printDocument";
import { createPayrollRun, getPayrollRuns, getPayrollEntries, getPayrollPeriods, getPayrollInputs, createPayrollInput, deletePayrollInput, type PayrollPeriod, type PayrollInput } from "../../api/hr-extras";
import { getSalaryFrequencies, type SalaryFrequencyConfig } from "../../api/employment-types";
import { fetchProjects } from "../../api/projects";
import { fetchEmployees } from "../../api/employees";
import {
  CheckCircle,
  AlertCircle,
  Download,
  Play,
  RefreshCw,
  FileText,
  ArrowRight,
  Clock,
  Plus,
  Trash2,
} from "lucide-react";

type RunStatus = "idle" | "running" | "complete" | "error";
type EmpPayStatus = "included" | "excluded" | "on_hold";
type ApprovalStage =
  | "draft"
  | "sent_for_approval"
  | "manager_approved"
  | "sent_to_finance"
  | "finance_confirmed"
  | "paid";

const STAGE_MESSAGES: Record<ApprovalStage, string> = {
  draft: "Payroll draft created.",
  sent_for_approval: "Payroll processed and sent for approval.",
  manager_approved: "Payroll approved as manager.",
  sent_to_finance: "Payroll sent to Finance.",
  finance_confirmed: "Payment confirmed by Finance.",
  paid: "Payroll marked as paid.",
};

interface ProcessEntry {
  id: string;
  name: string;
  department: string;
  gradeLevel: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
  status: EmpPayStatus;
  note: string;
}

// depts and grades computed inside component from state

const statusConfig: Record<EmpPayStatus, { label: string; badge: string }> = {
  included: { label: "Included", badge: "bg-green-100 text-green-700" },
  excluded: { label: "Excluded", badge: "bg-red-100 text-red-700" },
  on_hold: { label: "On Hold", badge: "bg-amber-100 text-amber-700" },
};

const fmt = (n: number) =>
  formatCurrencyByGeneralSettings(n, { minimumFractionDigits: 0 });

export function PayrollProcessingPage() {
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [approvalStage, setApprovalStage] = useState<ApprovalStage>("draft");
  const [stageTimestamps, setStageTimestamps] = useState<
    Partial<Record<ApprovalStage, string>>
  >({});
  const [month, setMonth] = useState("April 2025");
  const [entries, setEntries] = useState<ProcessEntry[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [scope, setScope] = useState<"company" | "project">("company");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [frequencies, setFrequencies] = useState<SalaryFrequencyConfig[]>([]);
  const [frequencyId, setFrequencyId] = useState("salary-frequency-monthly");
  const [payrollInputs, setPayrollInputs] = useState<PayrollInput[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [showInputForm, setShowInputForm] = useState(false);
  const [inputDraft, setInputDraft] = useState({ employeeId: "", type: "overtime", amount: "", quantity: "", effectiveDate: new Date().toISOString().slice(0, 10), notes: "" });

  useEffect(() => {
    getPayrollRuns()
      .then((runs) => {
        const latest = runs[0];
        if (!latest) return Promise.resolve(undefined);
        return getPayrollEntries(latest.id);
      })
      .then((ents) => {
        if (!ents) return;
        setEntries(
          ents.map((e) => ({
            id: e.employeeId,
            name: e.employeeName,
            department: e.department ?? "",
            gradeLevel: "",
            basicSalary: e.grossPay - e.allowances,
            allowances: e.allowances,
            deductions: e.deductions,
            netPay: e.netPay,
            status: "included" as EmpPayStatus,
            note: "",
          })),
        );
      })
      .catch(() =>
      toast.error("Could not load the payroll run."),
    );
  }, []);
  useEffect(() => {
    Promise.all([getPayrollPeriods(), fetchProjects(), getSalaryFrequencies(), getPayrollInputs("pending"), fetchEmployees({ status: "active" })])
      .then(([periodRows, projectRows, frequencyRows, inputRows, employeeRows]) => {
        setPeriods(periodRows.filter((period) => period.status.toLowerCase() !== "closed"));
        setProjects(projectRows.map((project) => ({ id: project.id, name: project.name })));
        setFrequencies(frequencyRows);
        setPayrollInputs(inputRows);
        setEmployees(employeeRows.map((employee: any) => ({ id: employee.id, name: `${employee.firstName} ${employee.lastName}`.trim() })));
        const first = periodRows.find((period) => period.status.toLowerCase() !== "closed");
        if (first) { setSelectedPeriodId(first.id); setMonth(first.name); if (first.salaryFrequencyId) setFrequencyId(first.salaryFrequencyId); }
      })
      .catch(() => toast.error("Could not load payroll configuration."));
  }, []);

  async function savePayrollInput() {
    if (!inputDraft.employeeId || !inputDraft.effectiveDate) { toast.error("Select an employee and effective date."); return; }
    try { const created = await createPayrollInput({ ...inputDraft, amount: Number(inputDraft.amount || 0), quantity: Number(inputDraft.quantity || 0) } as any); setPayrollInputs((current) => [created, ...current]); setShowInputForm(false); setInputDraft((current) => ({ ...current, employeeId: "", amount: "", quantity: "", notes: "" })); toast.success("Payroll input recorded."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save payroll input."); }
  }

  async function removePayrollInput(id: string) {
    try { await deletePayrollInput(id); setPayrollInputs((current) => current.filter((input) => input.id !== id)); toast.success("Payroll input removed."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not remove payroll input."); }
  }
  const [, setShowPreview] = useState(false);

  const included = entries.filter((e) => e.status === "included");
  const onHold = entries.filter((e) => e.status === "on_hold");
  const excluded = entries.filter((e) => e.status === "excluded");

  const totalGross = included.reduce(
    (s, e) => s + (e.basicSalary + e.allowances),
    0,
  );
  const totalDed = included.reduce((s, e) => s + e.deductions, 0);
  const totalNet = included.reduce((s, e) => s + e.netPay, 0);

  const now = () => formatTimeByGeneralSettings(new Date()) + " — Apr 10, 2026";

  /**
   * Renders the completed payroll run as a printable summary. "Download PDF"
   * goes through the browser's print dialog, where "Save as PDF" produces the
   * actual file.
   */
  function downloadRunSummary() {
    const rows = included
      .map(
        (e) =>
          `<tr><td>${escapeHtml(e.name)}</td>` +
          `<td>${escapeHtml(e.department || "—")}</td>` +
          `<td>${escapeHtml(e.gradeLevel || "—")}</td>` +
          `<td class="num">${escapeHtml(fmt(e.basicSalary + e.allowances))}</td>` +
          `<td class="num negative">-${escapeHtml(fmt(e.deductions))}</td>` +
          `<td class="num">${escapeHtml(fmt(e.netPay))}</td></tr>`,
      )
      .join("");

    const body =
      documentHeader("Payroll Run Summary", month, [
        ["Employees paid", String(included.length)],
        ["On hold", String(onHold.length)],
        ["Excluded", String(excluded.length)],
        ["Stage", STAGE_MESSAGES[approvalStage]],
      ]) +
      `<div class="doc-section"><h2>Employees paid</h2><table>` +
      `<thead><tr><th>Employee</th><th>Department</th><th>Grade</th>` +
      `<th class="num">Gross</th><th class="num">Deductions</th>` +
      `<th class="num">Net Pay</th></tr></thead><tbody>` +
      (rows ||
        `<tr><td colspan="6">No employees included in this run.</td></tr>`) +
      `<tr class="total"><td colspan="3">Totals</td>` +
      `<td class="num">${escapeHtml(fmt(totalGross))}</td>` +
      `<td class="num negative">-${escapeHtml(fmt(totalDed))}</td>` +
      `<td class="num">${escapeHtml(fmt(totalNet))}</td></tr>` +
      `<tr class="net"><td colspan="5">Total disbursed</td>` +
      `<td class="num">${escapeHtml(fmt(totalNet))}</td></tr>` +
      `</tbody></table></div>` +
      documentFooter(formatDateByGeneralSettings(new Date()));

    try {
      printDocument(`Payroll Summary ${month}`, body);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Unable to open the payroll summary.",
      );
    }
  }

  function advanceStage(to: ApprovalStage) {
    setApprovalStage(to);
    setStageTimestamps((t) => ({ ...t, [to]: now() }));
    toast.success(STAGE_MESSAGES[to]);
  }

  async function runPayroll() {
    if (!selectedPeriodId) { toast.error("Select an open payroll period."); return; }
    if (scope === "project" && !projectId) { toast.error("Select the project to process."); return; }
    setRunStatus("running");
    try {
      const run = await createPayrollRun({ periodId: selectedPeriodId, scope, projectId: scope === "project" ? projectId : undefined, salaryFrequencyId: frequencyId } as any);
      const generated = run.entries ?? await getPayrollEntries(run.id);
      setEntries(generated.map((e) => ({ id: e.employeeId, name: e.employeeName, department: e.department ?? "", gradeLevel: "", basicSalary: e.grossPay - e.allowances, allowances: e.allowances, deductions: e.deductions, netPay: e.netPay, status: "included" as EmpPayStatus, note: "" })));
      setRunStatus("complete");
      advanceStage("sent_for_approval");
      toast.success(`${run.employeeCount} paid employee${run.employeeCount === 1 ? "" : "s"} added to the payroll run.`);
    } catch (error) {
      setRunStatus("error");
      toast.error(error instanceof Error ? error.message : "Payroll generation failed.");
    }
  }

  function toggleStatus(id: string, status: EmpPayStatus) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
  }

  // Approval pipeline definition
  const APPROVAL_STAGES: {
    key: ApprovalStage;
    label: string;
    actor: string;
  }[] = [
    { key: "draft", label: "Payroll Created", actor: "System" },
    {
      key: "sent_for_approval",
      label: "Sent for Approval",
      actor: "HR Manager",
    },
    {
      key: "manager_approved",
      label: "Manager Approved",
      actor: "Finance Manager",
    },
    { key: "sent_to_finance", label: "Sent to Finance", actor: "Finance Team" },
    {
      key: "finance_confirmed",
      label: "Finance Confirmed",
      actor: "Finance Director",
    },
    { key: "paid", label: "Paid", actor: "Bank / System" },
  ];

  const stageIndex = APPROVAL_STAGES.findIndex((s) => s.key === approvalStage);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Payroll Processing
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Generate, validate, and disburse payroll for the selected pay period
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriodId}
            onChange={(e) => { const period = periods.find((item) => item.id === e.target.value); setSelectedPeriodId(e.target.value); if (period) { setMonth(period.name); if (period.salaryFrequencyId) setFrequencyId(period.salaryFrequencyId); } setRunStatus("idle"); }}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
          >
            <option value="">Select period…</option>{periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}
          </select>
          <select value={frequencyId} onChange={(e) => { setFrequencyId(e.target.value); setRunStatus("idle"); }} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white">{frequencies.map((frequency) => <option key={frequency.id} value={frequency.id}>{frequency.name}</option>)}</select>
          <select value={scope} onChange={(e) => { setScope(e.target.value as "company" | "project"); setProjectId(""); setRunStatus("idle"); }} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white"><option value="company">Company employees</option><option value="project">Project employees</option></select>
          {scope === "project" && <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setRunStatus("idle"); }} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white"><option value="">Select project…</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>}
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            <FileText className="w-3.5 h-3.5" /> Preview Report
          </button>
          <button
            onClick={runPayroll}
            disabled={runStatus === "running" || runStatus === "complete"}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-700 text-white rounded-md text-sm hover:bg-indigo-800 disabled:opacity-60"
          >
            {runStatus === "running" ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing...
              </>
            ) : runStatus === "complete" ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" /> Completed
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Run Payroll
              </>
            )}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-gray-900">Payroll Inputs</h3><p className="text-xs text-gray-500">Overtime, incentives, employee status events, loans, penalties and salary variables applied before generation.</p></div><button onClick={() => setShowInputForm((value) => !value)} className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><Plus className="h-4 w-4" />Add Input</button></div>{showInputForm && <div className="mt-4 grid grid-cols-6 gap-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-4"><select value={inputDraft.employeeId} onChange={(e) => setInputDraft((current) => ({ ...current, employeeId: e.target.value }))} className="col-span-2 rounded-md border px-3 py-2 text-sm"><option value="">Select employee…</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select><select value={inputDraft.type} onChange={(e) => setInputDraft((current) => ({ ...current, type: e.target.value }))} className="col-span-2 rounded-md border px-3 py-2 text-sm">{["abscondment","absenteeism","dismissal","incentive","new_hire","overtime","penalty","loan","reinstatement","resignation","salary_variable","suspension","termination","voluntary_contribution"].map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select><input type="date" value={inputDraft.effectiveDate} onChange={(e) => setInputDraft((current) => ({ ...current, effectiveDate: e.target.value }))} className="rounded-md border px-3 py-2 text-sm" /><input type="number" placeholder="Amount" value={inputDraft.amount} onChange={(e) => setInputDraft((current) => ({ ...current, amount: e.target.value }))} className="rounded-md border px-3 py-2 text-sm" /><input type="number" placeholder="Hours / quantity" value={inputDraft.quantity} onChange={(e) => setInputDraft((current) => ({ ...current, quantity: e.target.value }))} className="rounded-md border px-3 py-2 text-sm" /><input placeholder="Notes" value={inputDraft.notes} onChange={(e) => setInputDraft((current) => ({ ...current, notes: e.target.value }))} className="col-span-4 rounded-md border px-3 py-2 text-sm" /><button onClick={() => void savePayrollInput()} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white">Save Input</button></div>}<div className="mt-4 flex flex-wrap gap-2">{payrollInputs.length === 0 ? <p className="text-sm text-gray-400">No pending payroll inputs.</p> : payrollInputs.map((input) => <div key={input.id} className="flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2 text-xs"><span className="font-medium text-gray-800">{input.employeeName}</span><span className="capitalize text-gray-500">{input.type.replaceAll("_", " ")}</span>{input.amount > 0 && <span>{fmt(input.amount)}</span>}<button onClick={() => void removePayrollInput(input.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div></div>

      {/* Approval Pipeline */}
      {approvalStage !== "draft" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Approval Flow — {month}
          </h3>
          <div className="flex items-start gap-0">
            {APPROVAL_STAGES.map((stage, i) => {
              const done = i < stageIndex;
              const active = i === stageIndex;
              return (
                <div
                  key={stage.key}
                  className="flex-1 flex flex-col items-center"
                >
                  {/* Step circle + connector */}
                  <div className="flex items-center w-full">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-xs font-bold border-2 transition-colors ${
                        done
                          ? "bg-green-500 border-green-500 text-white"
                          : active
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "bg-white border-gray-200 text-gray-400"
                      }`}
                    >
                      {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
                    </div>
                    {i < APPROVAL_STAGES.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 ${done ? "bg-green-400" : "bg-gray-200"}`}
                      />
                    )}
                  </div>
                  {/* Label */}
                  <div className="mt-2 text-center px-1">
                    <p
                      className={`text-xs font-medium ${active ? "text-indigo-700" : done ? "text-gray-700" : "text-gray-400"}`}
                    >
                      {stage.label}
                    </p>
                    {(done || active) &&
                      stageTimestamps[stage.key as ApprovalStage] && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {stageTimestamps[stage.key as ApprovalStage]}
                        </p>
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
              <button
                onClick={() => advanceStage("manager_approved")}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                <CheckCircle className="w-4 h-4" /> Approve as Manager
              </button>
            )}
            {approvalStage === "manager_approved" && (
              <button
                onClick={() => advanceStage("sent_to_finance")}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                <ArrowRight className="w-4 h-4" /> Send to Finance
              </button>
            )}
            {approvalStage === "sent_to_finance" && (
              <button
                onClick={() => advanceStage("finance_confirmed")}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700"
              >
                <CheckCircle className="w-4 h-4" /> Confirm Payment (Finance)
              </button>
            )}
            {approvalStage === "finance_confirmed" && (
              <button
                onClick={() => advanceStage("paid")}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
              >
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
          <span>
            Payroll for <strong>{month}</strong> has been processed
            successfully. {included.length} employees paid. Total disbursed:{" "}
            <strong>{fmt(totalNet)}</strong>.
          </span>
          <button
            onClick={downloadRunSummary}
            className="ml-auto flex items-center gap-1 text-green-700 hover:underline text-xs"
          >
            <Download className="w-3 h-3" /> Download PDF
          </button>
        </div>
      )}
      {onHold.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-amber-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>
              {onHold.length} employee{onHold.length > 1 ? "s" : ""}
            </strong>{" "}
            on hold. Resolve issues before running payroll.
          </span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Employees Included",
            value: included.length,
            sub: `${onHold.length} on hold, ${excluded.length} excluded`,
            color: "text-indigo-700 bg-indigo-50",
          },
          {
            label: "Total Gross Pay",
            value: fmt(totalGross),
            sub: "Basic + Allowances",
            color: "text-gray-800 bg-gray-50",
          },
          {
            label: "Total Deductions",
            value: fmt(totalDed),
            sub: "Tax + Pension + NHF",
            color: "text-red-700 bg-red-50",
          },
          {
            label: "Total Net Payout",
            value: fmt(totalNet),
            sub: "To be disbursed",
            color: "text-green-700 bg-green-50",
          },
        ].map((s) => (
          <div key={s.label} className={`rounded-lg p-4 ${s.color}`}>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
            <p className="text-xs mt-0.5 opacity-60">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-800 text-sm mb-3">
          Pre-Run Checklist
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "All salary bands configured", done: true },
            { label: "Attendance data for April imported", done: true },
            {
              label: "Bank account details verified",
              done: onHold.length === 0,
            },
            { label: "Deduction schedules updated", done: true },
            { label: "Previous month payroll reconciled", done: true },
            { label: "Tax rates up to date", done: true },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2 text-sm px-3 py-2 rounded ${item.done ? "text-green-700" : "text-amber-600"}`}
            >
              {item.done ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* Employee list */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">
            {entries.length} Employees · {month}
          </p>
          <div className="flex gap-2 text-xs">
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
              {included.length} Included
            </span>
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
              {onHold.length} On Hold
            </span>
            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
              {excluded.length} Excluded
            </span>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500">
                Employee
              </th>
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500">
                Department
              </th>
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right">
                Basic
              </th>
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right">
                Allowances
              </th>
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right">
                Deductions
              </th>
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right">
                Net Pay
              </th>
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {entries.map((emp) => {
              const cfg = statusConfig[emp.status] ?? {
                badge: "bg-gray-100 text-gray-700",
                icon: <Clock className="w-3.5 h-3.5 text-gray-500" />,
                label: String(emp.status ?? "Unknown"),
              };
              return (
                <tr
                  key={emp.id}
                  className={`hover:bg-gray-50 ${emp.status === "excluded" ? "opacity-50" : ""}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{emp.id}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {emp.department}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {fmt(emp.basicSalary)}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">
                    +{fmt(emp.allowances)}
                  </td>
                  <td className="px-4 py-3 text-right text-red-500">
                    -{fmt(emp.deductions)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">
                    {fmt(emp.netPay)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}
                      >
                        {cfg.label}
                      </span>
                      {emp.note && (
                        <span
                          className="text-xs text-amber-600 italic truncate max-w-28"
                          title={emp.note}
                        >
                          {emp.note}
                        </span>
                      )}
                      <select
                        value={emp.status}
                        onChange={(e) =>
                          toggleStatus(emp.id, e.target.value as EmpPayStatus)
                        }
                        className="ml-auto text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white"
                      >
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
