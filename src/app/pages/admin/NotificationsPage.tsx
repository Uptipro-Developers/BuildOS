import { Plus, Edit, Trash2, Mail, Bell, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "../../api/client";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import {
  getEmailTemplates,
  getNotificationRules,
} from "../../api/admin-extras";

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  trigger: string;
};

type NotificationRule = {
  id: string;
  name: string;
  event: string;
  recipients: string;
  channels: string[];
  enabled: boolean;
};

export function NotificationsPage() {
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [notificationRules, setNotificationRules] = useState<
    NotificationRule[]
  >([]);

  useEffect(() => {
    Promise.all([getEmailTemplates(), getNotificationRules()])
      .then(([templates, rules]) => {
        setEmailTemplates(templates as EmailTemplate[]);
        setNotificationRules(rules as NotificationRule[]);
      })
      .catch((err: unknown) => {
        setEmailTemplates([]);
        setNotificationRules([]);
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
  const [templateForm, setTemplateForm] = useState<EmailTemplate | null>(null);
  const [ruleForm, setRuleForm] = useState<NotificationRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: "template" | "rule"; id: string; name: string } | null
  >(null);
  const [busy, setBusy] = useState(false);

  const BLANK_TEMPLATE: EmailTemplate = {
    id: "",
    name: "",
    subject: "",
    trigger: "",
  };
  const BLANK_RULE: NotificationRule = {
    id: "",
    name: "",
    event: "",
    recipients: "",
    channels: ["Email"],
    enabled: true,
  };

  const saveTemplate = async () => {
    if (!templateForm) return;
    const { id, ...payload } = templateForm;
    setBusy(true);
    try {
      if (id) {
        const updated = await apiFetch<EmailTemplate>(
          `/admin/email-templates/${id}`,
          { method: "PATCH", body: JSON.stringify(payload) },
        );
        setEmailTemplates((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...updated } : t)),
        );
        toast.success(`Template "${payload.name}" updated.`);
      } else {
        const created = await apiFetch<EmailTemplate>("/admin/email-templates", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setEmailTemplates((prev) => [created, ...prev]);
        toast.success(`Template "${payload.name}" created.`);
      }
      setTemplateForm(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save the template.",
      );
    } finally {
      setBusy(false);
    }
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
    const { kind, id, name } = deleteTarget;
    const path =
      kind === "template"
        ? `/admin/email-templates/${id}`
        : `/admin/notification-rules/${id}`;
    setBusy(true);
    try {
      await apiFetch(path, { method: "DELETE" });
      if (kind === "template") {
        setEmailTemplates((prev) => prev.filter((t) => t.id !== id));
      } else {
        setNotificationRules((prev) => prev.filter((r) => r.id !== id));
      }
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

      {/* Email Templates */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Email Templates
            </h2>
          </div>
          <button
            onClick={() => setTemplateForm({ ...BLANK_TEMPLATE })}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Template
          </button>
        </div>

        <div className="space-y-2">
          {emailTemplates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-medium text-gray-900">{template.name}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Subject: {template.subject}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Trigger: {template.trigger}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTemplateForm({ ...template })}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    setDeleteTarget({
                      kind: "template",
                      id: template.id,
                      name: template.name,
                    })
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
                    Event: {rule.event}
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
                    setDeleteTarget({
                      kind: "rule",
                      id: rule.id,
                      name: rule.name,
                    })
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

      {/* ── Add / Edit template ── */}
      {templateForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                {templateForm.id ? "Edit Email Template" : "Add Email Template"}
              </h2>
              <button
                onClick={() => setTemplateForm(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {(
                [
                  { key: "name", label: "Template Name", placeholder: "Leave Approved" },
                  { key: "subject", label: "Email Subject", placeholder: "Your leave request was approved" },
                  { key: "trigger", label: "Trigger Event", placeholder: "Leave request approved" },
                ] as const
              ).map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {field.label} <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={templateForm[field.key]}
                    placeholder={field.placeholder}
                    onChange={(e) =>
                      setTemplateForm((prev) =>
                        prev ? { ...prev, [field.key]: e.target.value } : prev,
                      )
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                onClick={() => setTemplateForm(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void saveTemplate()}
                disabled={
                  busy ||
                  !templateForm.name.trim() ||
                  !templateForm.subject.trim() ||
                  !templateForm.trigger.trim()
                }
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy
                  ? "Saving…"
                  : templateForm.id
                    ? "Save Changes"
                    : "Add Template"}
              </button>
            </div>
          </div>
        </div>
      )}

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
              {(
                [
                  { key: "name", label: "Rule Name", placeholder: "Notify on overdue approval" },
                  { key: "event", label: "Event", placeholder: "Approval overdue" },
                  { key: "recipients", label: "Recipients", placeholder: "All Team Members" },
                ] as const
              ).map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {field.label} <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={ruleForm[field.key]}
                    placeholder={field.placeholder}
                    onChange={(e) =>
                      setRuleForm((prev) =>
                        prev ? { ...prev, [field.key]: e.target.value } : prev,
                      )
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
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
        title={
          deleteTarget?.kind === "template"
            ? "Delete email template"
            : "Delete notification rule"
        }
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
