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
  Plus,
  Edit,
  Hash,
  Trash2,
} from "lucide-react";
import { apiFetch } from "../../api/client";
import {
  useNumbering,
  type ModuleNumbering,
} from "../../stores/numberingStore";
import { ConfirmationModal } from "../../components/ConfirmationModal";

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number" | "select";
  options?: string[];
  suffix?: string;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  options,
  suffix,
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
    </div>
  );
}

export function HRGeneralSetupPage() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
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

  const { configs, updateConfig, addConfig, removeConfig } = useNumbering();

  const [editingNumbering, setEditingNumbering] = useState<string | null>(null);
  const [numberingForm, setNumberingForm] = useState<ModuleNumbering | null>(
    null,
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<ModuleNumbering>({
    module: "",
    prefix: "",
    separator: "-",
    padLength: 4,
    nextNumber: 1,
    description: "",
  });
  const [deleteTargetModule, setDeleteTargetModule] = useState<string | null>(
    null,
  );

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

  function openNumberingEdit(cfg: ModuleNumbering) {
    setEditingNumbering(cfg.module);
    setNumberingForm({ ...cfg });
  }

  function saveNumbering() {
    if (numberingForm) {
      updateConfig(numberingForm.module, numberingForm);
      setEditingNumbering(null);
      setNumberingForm(null);
      toast.success("Numbering entry updated.");
    }
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

        {/* Module Numbering System */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Hash className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">
              Module Numbering System
            </h2>
          </div>
          <div className="p-5">
            <p className="text-xs text-gray-500 mb-4">
              Configure the auto-numbering format for records across HR modules.
              The system uses these patterns when generating new IDs.
            </p>
            <div className="space-y-3">
              {configs
                .filter((cfg) => /^HR/.test(cfg.module))
                .map((cfg) => (
                  <div
                    key={cfg.module}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    {editingNumbering === cfg.module && numberingForm ? (
                      <div className="flex-1 grid grid-cols-5 gap-3 items-end">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Prefix
                          </label>
                          <input
                            value={numberingForm.prefix}
                            onChange={(e) =>
                              setNumberingForm({
                                ...numberingForm,
                                prefix: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Separator
                          </label>
                          <input
                            value={numberingForm.separator}
                            onChange={(e) =>
                              setNumberingForm({
                                ...numberingForm,
                                separator: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            maxLength={2}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Pad Length
                          </label>
                          <input
                            type="number"
                            value={numberingForm.padLength}
                            onChange={(e) =>
                              setNumberingForm({
                                ...numberingForm,
                                padLength: parseInt(e.target.value) || 1,
                              })
                            }
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            min={1}
                            max={10}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Next Number
                          </label>
                          <input
                            type="number"
                            value={numberingForm.nextNumber}
                            onChange={(e) =>
                              setNumberingForm({
                                ...numberingForm,
                                nextNumber: parseInt(e.target.value) || 1,
                              })
                            }
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            min={1}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={saveNumbering}
                            className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                          >
                            <Save className="w-3 h-3 inline mr-1" />
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingNumbering(null);
                              setNumberingForm(null);
                            }}
                            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-sm font-medium text-gray-900 min-w-[140px]">
                            {cfg.module}
                          </span>
                          <span className="font-mono text-xs bg-white border border-gray-200 px-2 py-1 rounded text-gray-700">
                            {cfg.prefix}
                            {cfg.separator}
                            {String(cfg.nextNumber).padStart(
                              cfg.padLength,
                              "0",
                            )}
                          </span>
                          <span className="text-xs text-gray-400">
                            Next: <strong>{cfg.nextNumber}</strong> · Pad:{" "}
                            <strong>{cfg.padLength}</strong>
                          </span>
                          <span className="text-xs text-gray-400 ml-2">
                            {cfg.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openNumberingEdit(cfg)}
                            className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetModule(cfg.module)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                            title="Remove entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
            </div>
            {showAddForm ? (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="grid grid-cols-6 gap-3 items-end">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Module Name
                    </label>
                    <input
                      value={addForm.module}
                      onChange={(e) =>
                        setAddForm({ ...addForm, module: e.target.value })
                      }
                      placeholder="e.g. HRRecruitment"
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Must start with "HR"
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Prefix
                    </label>
                    <input
                      value={addForm.prefix}
                      onChange={(e) =>
                        setAddForm({ ...addForm, prefix: e.target.value })
                      }
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Separator
                    </label>
                    <input
                      value={addForm.separator}
                      onChange={(e) =>
                        setAddForm({ ...addForm, separator: e.target.value })
                      }
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Pad Length
                    </label>
                    <input
                      type="number"
                      value={addForm.padLength}
                      onChange={(e) =>
                        setAddForm({
                          ...addForm,
                          padLength: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      min={1}
                      max={10}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Next Number
                    </label>
                    <input
                      type="number"
                      value={addForm.nextNumber}
                      onChange={(e) =>
                        setAddForm({
                          ...addForm,
                          nextNumber: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      min={1}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        addConfig(addForm);
                        setAddForm({
                          module: "",
                          prefix: "",
                          separator: "-",
                          padLength: 4,
                          nextNumber: 1,
                          description: "",
                        });
                        setShowAddForm(false);
                        toast.success("Numbering entry added.");
                      }}
                      className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      <Save className="w-3 h-3 inline mr-1" />
                      Save
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-xs text-gray-500 mb-1">
                    Description
                  </label>
                  <input
                    value={addForm.description}
                    onChange={(e) =>
                      setAddForm({ ...addForm, description: e.target.value })
                    }
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-4 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Numbering Entry
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteTargetModule !== null}
        title="Delete Numbering Entry?"
        description={
          deleteTargetModule
            ? `This will permanently remove numbering configuration for "${deleteTargetModule}". This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        isDangerous={true}
        onConfirm={() => {
          if (!deleteTargetModule) return;
          removeConfig(deleteTargetModule);
          setDeleteTargetModule(null);
          toast.success("Numbering entry deleted.");
        }}
        onCancel={() => setDeleteTargetModule(null)}
      />
    </div>
  );
}
