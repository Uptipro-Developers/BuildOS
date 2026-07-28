import { useState, useEffect } from "react";
import { Plus, Clock, Mail, BarChart3, Trash2 } from "lucide-react";
import { apiFetch } from "../../api/client";
import { getReportTemplates } from "../../api/admin-extras";
import { useNumbering } from "../../stores/numberingStore";

type Frequency = "Daily" | "Weekly" | "Monthly";
type ReportModule =
  | "Finance"
  | "HR"
  | "Procurement"
  | "Projects"
  | "ESS"
  | "Storefront";

interface AvailableReport {
  name: string;
  module: ReportModule;
}

// Maps a Report Builder application key to an automation module bucket.
function toReportModule(app: string): ReportModule {
  const a = (app || "").toLowerCase();
  if (a.includes("hr")) return "HR";
  if (a.includes("procure")) return "Procurement";
  if (a.includes("project") || a.includes("construction")) return "Projects";
  if (a.includes("ess")) return "ESS";
  if (a.includes("store")) return "Storefront";
  return "Finance";
}

interface ReportSchedule {
  id: string;
  name: string;
  module: ReportModule;
  frequency: Frequency;
  sendTime: string;
  recipients: string;
  enabled: boolean;
  lastSent: string;
}

const MODULE_COLORS: Record<ReportModule, string> = {
  Finance: "bg-emerald-50 text-emerald-700",
  HR: "bg-purple-50 text-purple-700",
  Procurement: "bg-blue-50 text-blue-700",
  Projects: "bg-sky-50 text-sky-700",
  ESS: "bg-teal-50 text-teal-700",
  Storefront: "bg-orange-50 text-orange-700",
};

const BLANK_FORM: Omit<ReportSchedule, "id" | "lastSent"> = {
  name: "",
  module: "Finance" as ReportModule,
  frequency: "Daily",
  sendTime: "08:00",
  recipients: "",
  enabled: true,
};

export function ReportAutomationPage() {
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [availableReports, setAvailableReports] = useState<AvailableReport[]>(
    [],
  );
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const { getNextId } = useNumbering();

  useEffect(() => {
    apiFetch("/admin/report-schedules")
      .then(setSchedules)
      .catch(() => setSchedules([]));

    getReportTemplates<{
      name: string;
      application?: string;
      status?: string;
    }>()
      .then((templates) => {
        const deployed = (templates || [])
          .filter((t) => t.status === "deployed" && t.name)
          .map((t) => ({
            name: t.name,
            module: toReportModule(t.application || ""),
          }));
        setAvailableReports(deployed);
      })
      .catch(() => setAvailableReports([]));
  }, []);

  function toggleEnabled(id: string) {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    );
  }

  function deleteSchedule(id: string) {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  }

  function saveSchedule() {
    setSchedules([...schedules, {
      ...form,
      id: getNextId("ReportSchedule"),
      lastSent: "—",
    }]);
    setShowModal(false);
    setForm({ ...BLANK_FORM });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Report Automation
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Schedule automated report delivery to stakeholders
          </p>
        </div>
        <button
          onClick={() => {
            const first = availableReports[0];
            setForm({
              ...BLANK_FORM,
              name: first?.name ?? "",
              module: first?.module ?? BLANK_FORM.module,
            });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm px-4 py-2 rounded-xl"
        >
          <Plus className="w-4 h-4" /> New Schedule
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">
            {schedules.filter((s) => s.enabled).length}
          </p>
          <p className="text-xs text-gray-500">Active Schedules</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">
            {schedules.filter((s) => s.frequency === "Daily").length}
          </p>
          <p className="text-xs text-gray-500">Daily Reports</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">
            {
              new Set(
                schedules
                  .map((s) => s.recipients.split(","))
                  .flat()
                  .map((e) => e.trim()),
              ).size
            }
          </p>
          <p className="text-xs text-gray-500">Unique Recipients</p>
        </div>
      </div>

      {/* Schedule cards */}
      <div className="space-y-3">
        {schedules.map((s) => (
          <div
            key={s.id}
            className={`bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 ${!s.enabled ? "opacity-60" : ""}`}
          >
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-900">{s.name}</p>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${MODULE_COLORS[s.module]}`}
                >
                  {s.module}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {s.frequency} at {s.sendTime}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {s.recipients}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Last sent: {s.lastSent}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => toggleEnabled(s.id)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${s.enabled ? "bg-gray-800" : "bg-gray-200"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${s.enabled ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </button>
              <button
                onClick={() => deleteSchedule(s.id)}
                className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-900">
                New Report Schedule
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Report Name
                </label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500"
                  value={form.name}
                  onChange={(e) => {
                    const selected = availableReports.find(
                      (r) => r.name === e.target.value,
                    );
                    setForm({
                      ...form,
                      name: e.target.value,
                      module: selected?.module ?? form.module,
                    });
                  }}
                  disabled={availableReports.length === 0}
                >
                  {availableReports.length === 0 ? (
                    <option value="">No deployed reports available</option>
                  ) : (
                    <>
                      <option value="" disabled>
                        Select a report…
                      </option>
                      {availableReports.map((r) => (
                        <option key={r.name} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Module
                  </label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500"
                    value={form.module}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        module: e.target.value as ReportModule,
                      })
                    }
                  >
                    {(
                      [
                        "Finance",
                        "HR",
                        "Procurement",
                        "Projects",
                        "ESS",
                        "Storefront",
                      ] as ReportModule[]
                    ).map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Frequency
                  </label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500"
                    value={form.frequency}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        frequency: e.target.value as Frequency,
                      })
                    }
                  >
                    {(["Daily", "Weekly", "Monthly"] as Frequency[]).map(
                      (f) => (
                        <option key={f}>{f}</option>
                      ),
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Send Time
                  </label>
                  <input
                    type="time"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500"
                    value={form.sendTime}
                    onChange={(e) =>
                      setForm({ ...form, sendTime: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Recipients (comma-separated emails)
                </label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500"
                  placeholder="cfo@company.ng, finance@company.ng"
                  value={form.recipients}
                  onChange={(e) =>
                    setForm({ ...form, recipients: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveSchedule}
                disabled={!form.recipients.trim()}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50"
              >
                Create Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
