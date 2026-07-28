import { Plus, Edit, Trash2, Mail, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
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
      .catch(() => {
        setEmailTemplates([]);
        setNotificationRules([]);
      });
  }, []);

  const addTemplate = async () => {
    const name = window.prompt("Template name", "New Template")?.trim();
    if (!name) return;
    const subject =
      window.prompt("Email subject", "Subject")?.trim() ?? "Subject";
    const trigger = window.prompt("Trigger", "On event")?.trim() ?? "On event";
    const payload = { name, subject, trigger };
    try {
      const created = await apiFetch<EmailTemplate>("/admin/email-templates", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setEmailTemplates((prev) => [created, ...prev]);
    } catch {
      setEmailTemplates((prev) => [
        { id: `tpl-${Date.now()}`, ...payload },
        ...prev,
      ]);
    }
  };

  const editTemplate = async (id: string) => {
    const current = emailTemplates.find((t) => t.id === id);
    if (!current) return;
    const name = window.prompt("Template name", current.name)?.trim();
    if (!name) return;
    const subject =
      window.prompt("Email subject", current.subject)?.trim() ??
      current.subject;
    const trigger =
      window.prompt("Trigger", current.trigger)?.trim() ?? current.trigger;

    setEmailTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name, subject, trigger } : t)),
    );

    try {
      await apiFetch(`/admin/email-templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, subject, trigger }),
      });
    } catch {
      // Keep local update when endpoint is unavailable.
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!window.confirm("Delete this template?")) return;
    try {
      await apiFetch(`/admin/email-templates/${id}`, {
        method: "DELETE",
      });
    } catch {
      // Keep local deletion when endpoint is unavailable.
    }
    setEmailTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const addRule = async () => {
    const name = window.prompt("Rule name", "New Rule")?.trim();
    if (!name) return;
    const event =
      window.prompt("Event", "Custom Event")?.trim() ?? "Custom Event";
    const recipients =
      window.prompt("Recipients", "All Team Members")?.trim() ??
      "All Team Members";
    const channelsRaw = window.prompt(
      "Channels (comma-separated)",
      "Email,In-App",
    );
    const channels = (channelsRaw ?? "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    const payload = {
      name,
      event,
      recipients,
      channels: channels.length > 0 ? channels : ["Email"],
      enabled: true,
    };
    try {
      const created = await apiFetch<NotificationRule>(
        "/admin/notification-rules",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
      setNotificationRules((prev) => [created, ...prev]);
    } catch {
      setNotificationRules((prev) => [
        { id: `rule-${Date.now()}`, ...payload },
        ...prev,
      ]);
    }
  };

  const editRule = async (id: string) => {
    const current = notificationRules.find((r) => r.id === id);
    if (!current) return;
    const name = window.prompt("Rule name", current.name)?.trim();
    if (!name) return;
    const event =
      window.prompt("Event", current.event)?.trim() ?? current.event;
    const recipients =
      window.prompt("Recipients", current.recipients)?.trim() ??
      current.recipients;

    setNotificationRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, name, event, recipients } : r)),
    );

    try {
      await apiFetch(`/admin/notification-rules/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, event, recipients }),
      });
    } catch {
      // Keep local update when endpoint is unavailable.
    }
  };

  const deleteRule = async (id: string) => {
    if (!window.confirm("Delete this rule?")) return;
    try {
      await apiFetch(`/admin/notification-rules/${id}`, {
        method: "DELETE",
      });
    } catch {
      // Keep local deletion when endpoint is unavailable.
    }
    setNotificationRules((prev) => prev.filter((r) => r.id !== id));
  };

  const toggleRuleEnabled = async (id: string) => {
    const target = notificationRules.find((r) => r.id === id);
    if (!target) return;
    const nextEnabled = !target.enabled;
    try {
      await apiFetch(`/admin/notification-rules/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: nextEnabled }),
      });
    } catch {
      // Keep local toggle when endpoint is unavailable.
    }
    setNotificationRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    );
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
            onClick={addTemplate}
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
                  onClick={() => editTemplate(template.id)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteTemplate(template.id)}
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
            onClick={addRule}
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
                  onClick={() => editRule(rule.id)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteRule(rule.id)}
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
    </div>
  );
}
