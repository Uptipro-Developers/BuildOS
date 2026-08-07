import { Plus, Edit, Trash2, Mail, Bell, X, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { apiFetch } from "../../api/client";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import {
  getEmailConfigs,
  getNotificationEvents,
  getNotificationRules,
  type EmailConfigRecord,
  type NotificationEventDef,
} from "../../api/admin-extras";

type NotificationRule = {
  id: string;
  name: string;
  event: string;
  recipients: string;
  channels: string[];
  enabled: boolean;
};

/**
 * Recipient groups the dispatcher resolves. Anything else is treated as a role
 * name or a list of email addresses, which the field still accepts.
 */
const RECIPIENT_GROUPS = ["All Users", "Administrators", "The requester"];

export function NotificationsPage() {
  // The emails the system actually sends, from Admin › Email Configuration.
  // This panel used to manage a second, parallel template list that nothing
  // composed from: templates added here were never used by any email.
  const [emailConfigs, setEmailConfigs] = useState<EmailConfigRecord[]>([]);
  const [notificationRules, setNotificationRules] = useState<
    NotificationRule[]
  >([]);
  const [events, setEvents] = useState<NotificationEventDef[]>([]);

  useEffect(() => {
    Promise.all([getEmailConfigs(), getNotificationRules(), getNotificationEvents()])
      .then(([configs, rules, eventDefs]) => {
        setEmailConfigs(configs);
        setNotificationRules(rules as NotificationRule[]);
        setEvents(eventDefs);
      })
      .catch((err: unknown) => {
        setEmailConfigs([]);
        setNotificationRules([]);
        setEvents([]);
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to load templates and rules.",
        );
      });
  }, []);

  // ── Modal state ──
  // Every action here used to run through window.prompt/confirm — one browser
  // dialog per field, no validation, and no way to cancel halfway. Each catch also
  // swallowed the error and kept the local change, so a failed save looked
  // successful and vanished on refresh.
  const [ruleForm, setRuleForm] = useState<NotificationRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    { id: string; name: string } | null
  >(null);
  const [busy, setBusy] = useState(false);

  const BLANK_RULE: NotificationRule = {
    id: "",
    name: "",
    event: "",
    recipients: RECIPIENT_GROUPS[0],
    channels: ["Email"],
    enabled: true,
  };

  const saveRule = async () => {
    if (!ruleForm) return;
    const { id, ...payload } = ruleForm;
    setBusy(true);
    try {
      if (id) {
        const updated = await apiFetch<NotificationRule>(
          `/admin/notification-rules/${id}`,
          { method: "PATCH", body: JSON.stringify(payload) },
        );
        setNotificationRules((prev) =>
          prev.map((r) => (r.id === id ? { ...r, ...updated } : r)),
        );
        toast.success(`Rule "${payload.name}" updated.`);
      } else {
        const created = await apiFetch<NotificationRule>(
          "/admin/notification-rules",
          { method: "POST", body: JSON.stringify(payload) },
        );
        setNotificationRules((prev) => [created, ...prev]);
        toast.success(`Rule "${payload.name}" created.`);
      }
      setRuleForm(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save the rule.",
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    setBusy(true);
    try {
      await apiFetch(`/admin/notification-rules/${id}`, { method: "DELETE" });
      setNotificationRules((prev) => prev.filter((r) => r.id !== id));
      toast.success(`"${name}" deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to delete "${name}".`,
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleRuleEnabled = async (id: string) => {
    const target = notificationRules.find((r) => r.id === id);
    if (!target) return;
    const nextEnabled = !target.enabled;

    // Optimistic, then reverted on failure — the previous version kept the toggle
    // regardless, so a rule could appear enabled while the server had it off.
    setNotificationRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: nextEnabled } : r)),
    );
    try {
      await apiFetch(`/admin/notification-rules/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      toast.success(
        `"${target.name}" ${nextEnabled ? "enabled" : "disabled"}.`,
      );
    } catch (err) {
      setNotificationRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled: target.enabled } : r)),
      );
      toast.error(
        err instanceof Error ? err.message : "Failed to update the rule.",
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Notifications & Communication
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Configure email templates and notification rules
        </p>
      </div>

      {/* Email Templates.

          Read-only, and sourced from Email Configuration — the store the mail
          composer actually reads. This panel used to add, edit and delete
          entries in a second list that composed no email at all. */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Email Templates
            </h2>
          </div>
          <Link
            to="/apps/admin/email-config"
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Manage in Email Configuration
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="space-y-2">
          {emailConfigs.length === 0 && (
            <p className="text-sm text-gray-500">
              No email templates configured yet.
            </p>
          )}
          {emailConfigs.map((config) => (
            <div
              key={config.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-md"
            >
              <div>
                <p className="font-medium text-gray-900">{config.name}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Subject: {config.subject}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Trigger: {config.trigger}
                </p>
              </div>
              <span
                className={`px-2 py-1 text-xs rounded ${config.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
              >
                {config.enabled ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Rules */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Notification Rules
            </h2>
          </div>
          <button
            onClick={() => setRuleForm({ ...BLANK_RULE })}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </div>

        <div className="space-y-2">
          {notificationRules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => toggleRuleEnabled(rule.id)}
                  className="mt-1 w-4 h-4 text-gray-700 border-gray-300 rounded focus:ring-gray-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{rule.name}</p>
                    {rule.enabled ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Event:{" "}
                    {events.find((e) => e.key === rule.event)?.label ??
                      rule.event}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>To: {rule.recipients}</span>
                    <span>Via: {rule.channels.join(", ")}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRuleForm({ ...rule })}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    setDeleteTarget({ id: rule.id, name: rule.name })
                  }
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Channel Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Notification Channels
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Email</p>
                <p className="text-sm text-gray-600">
                  Send notifications via email
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 text-gray-700 border-gray-300 rounded focus:ring-gray-500"
            />
          </div>

          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">
                  In-App Notifications
                </p>
                <p className="text-sm text-gray-600">
                  Show notifications in the application
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 text-gray-700 border-gray-300 rounded focus:ring-gray-500"
            />
          </div>
        </div>
      </div>

      {/* ── Add / Edit notification rule ── */}
      {ruleForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                {ruleForm.id ? "Edit Notification Rule" : "Add Notification Rule"}
              </h2>
              <button
                onClick={() => setRuleForm(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Rule Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={ruleForm.name}
                  placeholder="Notify finance of new purchase requests"
                  onChange={(e) =>
                    setRuleForm((prev) =>
                      prev ? { ...prev, name: e.target.value } : prev,
                    )
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Chosen from the events the system dispatches. This was a free
                  text box, so a rule could name an event nothing ever emits and
                  would then never fire. */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Event <span className="text-red-500">*</span>
                </label>
                <select
                  value={ruleForm.event}
                  onChange={(e) =>
                    setRuleForm((prev) =>
                      prev ? { ...prev, event: e.target.value } : prev,
                    )
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Select an event…</option>
                  {events.map((event) => (
                    <option key={event.key} value={event.key}>
                      {event.label} ({event.app})
                    </option>
                  ))}
                </select>
                {ruleForm.event && (
                  <p className="mt-1 text-[11px] text-gray-400">
                    {events.find((e) => e.key === ruleForm.event)?.description}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Recipients <span className="text-red-500">*</span>
                </label>
                <input
                  value={ruleForm.recipients}
                  list="notification-recipient-groups"
                  placeholder="All Users"
                  onChange={(e) =>
                    setRuleForm((prev) =>
                      prev ? { ...prev, recipients: e.target.value } : prev,
                    )
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="notification-recipient-groups">
                  {RECIPIENT_GROUPS.map((group) => (
                    <option key={group} value={group} />
                  ))}
                </datalist>
                <p className="mt-1 text-[11px] text-gray-400">
                  A group, a role name, or a comma-separated list of email
                  addresses.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Channels
                </label>
                {/* Checkboxes rather than the old comma-separated prompt, which
                    accepted any text and silently produced invalid channels. */}
                <div className="flex flex-wrap gap-3">
                  {["Email", "In-App", "SMS"].map((channel) => {
                    const on = ruleForm.channels.includes(channel);
                    return (
                      <label
                        key={channel}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            setRuleForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    channels: on
                                      ? prev.channels.filter((c) => c !== channel)
                                      : [...prev.channels, channel],
                                  }
                                : prev,
                            )
                          }
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        {channel}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                onClick={() => setRuleForm(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void saveRule()}
                disabled={
                  busy ||
                  !ruleForm.name.trim() ||
                  !ruleForm.event.trim() ||
                  !ruleForm.recipients.trim() ||
                  ruleForm.channels.length === 0
                }
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? "Saving…" : ruleForm.id ? "Save Changes" : "Add Rule"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title="Delete notification rule"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will be permanently removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        isDangerous
        isLoading={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
