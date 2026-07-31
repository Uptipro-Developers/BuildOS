import { useState } from "react";
import { toast } from "sonner";
import {
  Save,
  CheckCircle,
  Clock,
  Users,
  Banknote,
  Settings2,
  Mail,
} from "lucide-react";
import { apiFetch } from "../../api/client";
import { NumberingConfigPanel } from "../../components/NumberingConfigPanel";

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number" | "select" | "time";
  options?: string[];
  suffix?: string;
  /** Explanatory note under the input, for settings whose effect is not obvious. */
  hint?: string;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  options,
  suffix,
  hint,
}: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      <div className="relative">
        {type === "select" ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {options?.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${suffix ? "pr-16" : ""}`}
          />
        )}
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

export function HRGeneralSetupPage() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    // Drives whether a self-service clock-in is recorded as present or late.
    // Blank means "do not judge lateness" — the backend records everyone present
    // rather than marking staff late against a start time nobody configured.
    workDayStart: "",
    lateGraceMinutes: "0",
    workHoursPerDay: "8",
    workDaysPerWeek: "5",
    weekStartDay: "Monday",
    overtimeMultiplier: "1.5",
    probationMonths: "3",
    noticePeriodDays: "30",
    retirementAge: "60",
    currency: "USD",
    fiscalYearStart: "January",
    payrollFrequency: "Monthly",
    taxRate: "15",
    pensionRate: "8",
    hrEmail: "",
    notificationEmail: "",
    senderEmail: "",
  });


  function f(key: keyof typeof form) {
    return (v: string) => setForm((prev) => ({ ...prev, [key]: v }));
  }

  function save() {
    apiFetch("/setup", {
      method: "POST",
      body: JSON.stringify(form),
    })
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        toast.success("General setup saved.");
      })
      .catch((err) => {
        toast.error(
          err instanceof Error ? err.message : "Failed to save setup.",
        );
        console.error(err);
      });
  }



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            General Setup
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure core HR parameters and policies
          </p>
        </div>
        <button
          onClick={save}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${saved ? "bg-green-600 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
        >
          {saved ? (
            <>
              <CheckCircle className="w-4 h-4" /> Saved
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Save Changes
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Work Schedule */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" /> Work Schedule
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Work Day Start"
              value={form.workDayStart}
              onChange={f("workDayStart")}
              type="time"
              hint="Clock-ins after this (plus grace) are marked late. Leave blank to record everyone as present."
            />
            <Field
              label="Late After (grace)"
              value={form.lateGraceMinutes}
              onChange={f("lateGraceMinutes")}
              type="number"
              suffix="mins"
            />
            <Field
              label="Work Hours / Day"
              value={form.workHoursPerDay}
              onChange={f("workHoursPerDay")}
              type="number"
              suffix="hrs"
            />
            <Field
              label="Work Days / Week"
              value={form.workDaysPerWeek}
              onChange={f("workDaysPerWeek")}
              type="number"
              suffix="days"
            />
            <Field
              label="Week Start Day"
              value={form.weekStartDay}
              onChange={f("weekStartDay")}
              type="select"
              options={["Monday", "Sunday"]}
            />
            <Field
              label="Overtime Multiplier"
              value={form.overtimeMultiplier}
              onChange={f("overtimeMultiplier")}
              type="number"
              suffix="×"
            />
          </div>
        </div>

        {/* Employment Policies */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" /> Employment Policies
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Probation Period"
              value={form.probationMonths}
              onChange={f("probationMonths")}
              type="number"
              suffix="months"
            />
            <Field
              label="Notice Period"
              value={form.noticePeriodDays}
              onChange={f("noticePeriodDays")}
              type="number"
              suffix="days"
            />
            <Field
              label="Retirement Age"
              value={form.retirementAge}
              onChange={f("retirementAge")}
              type="number"
              suffix="yrs"
            />
            <Field
              label="Currency"
              value={form.currency}
              onChange={f("currency")}
              type="select"
              options={["USD", "NGN", "GBP", "EUR", "GHS"]}
            />
          </div>
        </div>

        {/* Payroll Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Banknote className="w-4 h-4 text-indigo-600" /> Payroll Settings
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Payroll Frequency"
              value={form.payrollFrequency}
              onChange={f("payrollFrequency")}
              type="select"
              options={["Monthly", "Bi-Weekly", "Weekly"]}
            />
            <Field
              label="Fiscal Year Start"
              value={form.fiscalYearStart}
              onChange={f("fiscalYearStart")}
              type="select"
              options={[
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
              ]}
            />
            <Field
              label="Default Tax Rate"
              value={form.taxRate}
              onChange={f("taxRate")}
              type="number"
              suffix="%"
            />
            <Field
              label="Pension Contribution"
              value={form.pensionRate}
              onChange={f("pensionRate")}
              type="number"
              suffix="%"
            />
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-indigo-600" /> System Information
          </h2>
          <div className="space-y-3">
            {[
              { key: "Module Version", val: "HR v2.4.1" },
              { key: "Last Configured By", val: "Ngozi Okafor" },
              { key: "Last Modified", val: "Apr 9, 2026 14:32" },
              { key: "Total Employees", val: "156" },
              { key: "Active Departments", val: "8" },
            ].map((row) => (
              <div key={row.key} className="flex justify-between text-sm">
                <span className="text-gray-500">{row.key}</span>
                <span className="font-medium text-gray-900">{row.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Email & Notifications */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-600" /> Email & Notifications
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <Field
              label="HR Email Address"
              value={form.hrEmail}
              onChange={f("hrEmail")}
              type="text"
            />
            <Field
              label="Notification Email (optional)"
              value={form.notificationEmail}
              onChange={f("notificationEmail")}
              type="text"
            />
            <Field
              label="System Sender Email"
              value={form.senderEmail}
              onChange={f("senderEmail")}
              type="text"
            />
          </div>
        </div>

        {/* Module numbering.

            This card filtered with `/^HR/.test(cfg.module)`, which matched only
            HRRole — Employee, PayrollPeriod, LeaveType, ClaimType, BankName and
            Holiday are all HR sequences that were simply invisible here. The shared
            panel selects by the `app` a sequence belongs to, and persists to the
            server. */}
        <div className="col-span-2">
          <NumberingConfigPanel app="hr" accent="purple" />
        </div>
      </div>
    </div>
  );
}
