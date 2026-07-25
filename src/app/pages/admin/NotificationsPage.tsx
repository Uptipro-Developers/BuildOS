import { Save, Plus, Edit, Trash2, Mail, Bell } from "lucide-react";
import { useState } from "react";

export function NotificationsPage() {
  const [emailTemplates, setEmailTemplates] = useState([
    {
      id: "1",
      name: "Approval Request",
      subject: "New Approval Request: {{request_type}}",
      trigger: "On approval submission",
    },
    {
      id: "2",
      name: "Approval Approved",
      subject: "Your request has been approved",
      trigger: "On approval granted",
    },
    {
      id: "3",
      name: "Project Assignment",
      subject: "You have been assigned to {{project_name}}",
      trigger: "On project assignment",
    },
    {
      id: "4",
      name: "Budget Alert",
      subject: "Budget threshold exceeded for {{project_name}}",
      trigger: "On budget threshold",
    },
  ]);

  const [notificationRules, setNotificationRules] = useState([
    {
      id: "1",
      name: "New Approval Request",
      event: "Approval Submitted",
      recipients: "Project Manager",
      channels: ["Email", "In-App"],
      enabled: true,
    },
    {
      id: "2",
      name: "Budget Exceeded",
      event: "Budget > 90%",
      recipients: "Finance Team",
      channels: ["Email", "SMS"],
      enabled: true,
    },
    {
      id: "3",
      name: "Project Deadline",
      event: "7 days before deadline",
      recipients: "All Team Members",
      channels: ["Email", "In-App"],
      enabled: true,
    },
    {
      id: "4",
      name: "Material Low Stock",
      event: "Stock < Reorder Level",
      recipients: "Procurement Team",
      channels: ["Email"],
      enabled: false,
    },
  ]);

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
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
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
                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors">
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
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
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
                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors">
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
                <p className="font-medium text-gray-900">In-App Notifications</p>
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
