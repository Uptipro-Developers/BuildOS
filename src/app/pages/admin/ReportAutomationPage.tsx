import { useState, useEffect } from "react";
import {
  Plus,
  Clock,
  Mail,
  BarChart3,
  Trash2,
  Send,
  Pencil,
} from "lucide-react";
import { apiFetch } from "../../api/client";
import { getReportTemplates } from "../../api/admin-extras";
import { toast } from "sonner";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { formatDateTimeByGeneralSettings } from "../../utils/generalSettings";

type Frequency = "Daily" | "Weekly" | "Monthly";
type ReportModule =
  | "Finance"
  | "HR"
  | "Procurement"
  | "Projects"
  | "ESS"
  | "Storefront";

interface AvailableReport {
  /** The deployed template's id, so a schedule binds to a real report. */
  id: string;
  name: string;
  module: ReportModule;
  /** The template's data source, used when running the schedule. */
  dataSource?: string;
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
  /**
   * Anchor day: weekday 0–6 (Sunday–Saturday) for Weekly, day of month 1–31 for
   * Monthly. Without it a weekly or monthly schedule fires on the first send time
   * after its interval elapses, which drifts.
   */
  sendDay?: number;
  recipients: string;
  enabled: boolean;
  lastSent: string | null;
  /** Set when the last automated attempt failed, so the failure is visible. */
  lastError?: string | null;
}

const MODULE_COLORS: Record<ReportModule, string> = {
  Finance: "bg-emerald-50 text-emerald-700",
  HR: "bg-purple-50 text-purple-700",
  Procurement: "bg-blue-50 text-blue-700",
  Projects: "bg-sky-50 text-sky-700",
  ESS: "bg-teal-50 text-teal-700",
  Storefront: "bg-orange-50 text-orange-700",
};

/** Index is the value stored in `sendDay`, matching JavaScript's getDay(). */
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MODULE_OPTIONS: ReportModule[] = [
  "Finance",
  "HR",
  "Procurement",
  "Projects",
  "ESS",
  "Storefront",
];

const BLANK_FORM: Omit<ReportSchedule, "id" | "lastSent"> = {
  name: "",
  module: "Finance" as ReportModule,
  frequency: "Daily",
  sendTime: "08:00",
  sendDay: 1,
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

  useEffect(() => {
    apiFetch("/admin/report-schedules")
      .then(setSchedules)
      .catch(() => setSchedules([]));

    getReportTemplates<{
      id: string;
      name: string;
      application?: string;
      status?: string;
      dataSource?: string;
    }>()
      .then((templates) => {
        // Only deployed templates can be automated — a draft is still being built.
        const deployed = (templates || [])
          .filter((t) => t.status === "deployed" && t.name)
          .map((t) => ({
            id: t.id,
            name: t.name,
            module: toReportModule(t.application || ""),
            dataSource: t.dataSource,
          }));
        setAvailableReports(deployed);
      })
      .catch(() => setAvailableReports([]));
  }, []);

  const [deleteTarget, setDeleteTarget] = useState<ReportSchedule | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** Schedule being edited; null means the modal is creating a new one. */
  const [editingId, setEditingId] = useState<string | null>(null);

  /**
   * Deployed templates for the module currently chosen on the form.
   *
   * Module is the primary selector: picking HR narrows Report Name to HR's
   * deployed templates. It used to work the other way round — you picked a report
   * from every module at once and the module field was then overwritten to match
   * — which made the module dropdown look editable while it was really a readout.
   */
  const reportsForModule = availableReports.filter(
    (r) => r.module === form.module,
  );

  /** Modules that actually have a deployed template to schedule. */
  const modulesWithReports = MODULE_OPTIONS.filter((m) =>
    availableReports.some((r) => r.module === m),
  );

  function openCreate() {
    const firstModule = modulesWithReports[0] ?? BLANK_FORM.module;
    const firstReport = availableReports.find((r) => r.module === firstModule);
    setEditingId(null);
    setForm({
      ...BLANK_FORM,
      module: firstModule,
      name: firstReport?.name ?? "",
    });
    setShowModal(true);
  }

  function openEdit(schedule: ReportSchedule) {
    setEditingId(schedule.id);
    setForm({
      name: schedule.name,
      module: schedule.module,
      frequency: schedule.frequency,
      sendTime: schedule.sendTime || BLANK_FORM.sendTime,
      sendDay: schedule.sendDay ?? BLANK_FORM.sendDay,
      recipients: schedule.recipients,
      enabled: schedule.enabled,
    });
    setShowModal(true);
  }

  // Every action here used to mutate local state only — schedules, toggles and
  // deletions all vanished on refresh because the page had no write endpoints to
  // call. They now persist, and the backend scheduler is what actually delivers.
  async function toggleEnabled(id: string) {
    const target = schedules.find((s) => s.id === id);
    if (!target) return;
    const enabled = !target.enabled;

    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled } : s)),
    );
    try {
      await apiFetch(`/admin/report-schedules/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      });
      toast.success(
        `"${target.name}" ${enabled ? "enabled" : "paused"}.`,
      );
    } catch (err) {
      setSchedules((prev) =>
        prev.map((s) => (s.id === id ? { ...s, enabled: target.enabled } : s)),
      );
      toast.error(
        err instanceof Error ? err.message : "Failed to update the schedule.",
      );
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    setBusyId(id);
    try {
      await apiFetch(`/admin/report-schedules/${id}`, { method: "DELETE" });
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      toast.success(`Schedule "${name}" deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to delete "${name}".`,
      );
    } finally {
      setBusyId(null);
    }
  }

  async function saveSchedule() {
    const chosen = availableReports.find((r) => r.name === form.name);
    setSaving(true);
    try {
      const payload = {
        ...form,
        // Rebind to the deployed template on every save, so editing a schedule
        // onto a different report repoints what the scheduler runs instead of
        // leaving it on the old template.
        templateId: chosen?.id,
        source: chosen?.dataSource,
      };

      if (editingId) {
        const updated = await apiFetch<ReportSchedule>(
          `/admin/report-schedules/${editingId}`,
          { method: "PATCH", body: JSON.stringify(payload) },
        );
        setSchedules((prev) =>
          prev.map((s) => (s.id === editingId ? { ...s, ...updated } : s)),
        );
        toast.success(`"${form.name}" updated.`);
      } else {
        const created = await apiFetch<ReportSchedule>(
          "/admin/report-schedules",
          { method: "POST", body: JSON.stringify(payload) },
        );
        setSchedules((prev) => [...prev, created]);
        toast.success(
          `"${form.name}" scheduled ${form.frequency.toLowerCase()} to ${form.recipients}.`,
        );
      }

      setShowModal(false);
      setEditingId(null);
      setForm({ ...BLANK_FORM });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save the schedule.",
      );
    } finally {
      setSaving(false);
    }
  }

  /** Runs a schedule immediately, so a new one can be proven without waiting. */
  async function sendNow(schedule: ReportSchedule) {
    setBusyId(schedule.id);
    try {
      const result = await apiFetch<{ recipients: string[]; total: number }>(
        `/admin/report-schedules/${schedule.id}/send-now`,
        { method: "POST" },
      );
      toast.success(
        `Sent ${result.total} record${result.total === 1 ? "" : "s"} to ${result.recipients.join(", ")}.`,
      );
      const refreshed = await apiFetch<ReportSchedule[]>("/admin/report-schedules");
      setSchedules(refreshed);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send the report.",
      );
    } finally {
      setBusyId(null);
    }
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
          onClick={openCreate}
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
                  <Clock className="w-3 h-3" /> {s.frequency}
                  {s.frequency === "Weekly" && Number.isInteger(s.sendDay)
                    ? ` on ${WEEKDAYS[(s.sendDay as number) % 7]}`
                    : s.frequency === "Monthly" && Number.isInteger(s.sendDay)
                      ? ` on day ${s.sendDay}`
                      : ""}{" "}
                  at {s.sendTime}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {s.recipients}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Last sent:{" "}
                {s.lastSent && s.lastSent !== "—"
                  ? formatDateTimeByGeneralSettings(s.lastSent)
                  : "never"}
              </p>
              {s.lastError && (
                <p className="text-xs text-red-600 mt-0.5">
                  Last attempt failed: {s.lastError}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => void toggleEnabled(s.id)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${s.enabled ? "bg-gray-800" : "bg-gray-200"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${s.enabled ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </button>
              <button
                onClick={() => void sendNow(s)}
                disabled={busyId === s.id}
                title="Run this report now and email it"
                className="flex items-center gap-1.5 px-2.5 py-1 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {busyId === s.id ? "Sending…" : "Send now"}
              </button>
              <button
                onClick={() => openEdit(s)}
                title="View and edit this schedule"
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteTarget(s)}
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
                {editingId ? "Edit Report Schedule" : "New Report Schedule"}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                }}
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
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500 disabled:bg-gray-50 disabled:text-gray-400"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={reportsForModule.length === 0}
                >
                  {reportsForModule.length === 0 ? (
                    <option value="">
                      No deployed reports for {form.module}
                    </option>
                  ) : (
                    <>
                      <option value="" disabled>
                        Select a report…
                      </option>
                      {reportsForModule.map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Deployed templates for {form.module}. Change the module to see
                  others.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Module
                  </label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500"
                    value={form.module}
                    onChange={(e) => {
                      const module = e.target.value as ReportModule;
                      // Point Report Name at this module's first deployed
                      // template. Keeping the old name would leave the form
                      // showing a report that belongs to a different module.
                      const first = availableReports.find(
                        (r) => r.module === module,
                      );
                      setForm({
                        ...form,
                        module,
                        name: first?.name ?? "",
                      });
                    }}
                  >
                    {MODULE_OPTIONS.map((m) => {
                      const count = availableReports.filter(
                        (r) => r.module === m,
                      ).length;
                      return (
                        <option key={m} value={m}>
                          {m}
                          {count === 0 ? " — no deployed reports" : ` (${count})`}
                        </option>
                      );
                    })}
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
                  <p className="text-[11px] text-gray-400 mt-1">
                    In the organisation's timezone.
                  </p>
                </div>
              </div>

              {/* Which day the period lands on. Daily needs no anchor; without one
                  a weekly or monthly schedule fires on the first send time after
                  its interval elapses, which drifts away from the intended day. */}
              {form.frequency !== "Daily" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {form.frequency === "Weekly" ? "Day of week" : "Day of month"}
                  </label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500"
                    value={form.sendDay ?? 1}
                    onChange={(e) =>
                      setForm({ ...form, sendDay: Number(e.target.value) })
                    }
                  >
                    {form.frequency === "Weekly"
                      ? WEEKDAYS.map((label, value) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))
                      : Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                  </select>
                  {form.frequency === "Monthly" && (form.sendDay ?? 1) > 28 && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      Months shorter than this send on their last day instead.
                    </p>
                  )}
                </div>
              )}
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
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void saveSchedule()}
                disabled={saving || !form.name.trim() || !form.recipients.trim()}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50"
              >
                {saving
                  ? editingId
                    ? "Saving…"
                    : "Creating…"
                  : editingId
                    ? "Save Changes"
                    : "Create Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title="Delete report schedule"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will stop being sent automatically. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        isDangerous
        isLoading={busyId === deleteTarget?.id}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
