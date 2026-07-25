import { Plus, Copy, Eye, EyeOff, Trash2, Key, Webhook } from "lucide-react";
import { useState } from "react";

export function IntegrationsPage() {
  const [apiKeys, setApiKeys] = useState([
    {
      id: "1",
      name: "Production API Key",
      key: "sk_live_●●●●●●●●●●●●●●●●●●●●●●●●●●",
      created: "2026-01-15",
      lastUsed: "2026-04-07",
      status: "active",
    },
    {
      id: "2",
      name: "Development API Key",
      key: "sk_test_abcdefghijklmnopqrstuvwxyz",
      created: "2026-02-20",
      lastUsed: "2026-04-05",
      status: "active",
    },
  ]);

  const [webhooks, setWebhooks] = useState([
    {
      id: "1",
      name: "Project Updates",
      url: "https://api.example.com/webhooks/projects",
      events: ["project.created", "project.updated"],
      status: "active",
    },
    {
      id: "2",
      name: "Approval Notifications",
      url: "https://api.example.com/webhooks/approvals",
      events: ["approval.submitted", "approval.approved"],
      status: "active",
    },
  ]);

  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  const toggleKeyVisibility = (id: string) => {
    setShowKey((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const maskKey = (key: string) => {
    return key.slice(0, 7) + "..." + key.slice(-4);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Integrations</h1>
        <p className="text-sm text-gray-600 mt-1">
          Manage API keys and webhooks for external integrations
        </p>
      </div>

      {/* API Keys */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
          </div>
          <button className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors">
            <Plus className="w-4 h-4" />
            Generate New Key
          </button>
        </div>

        <div className="space-y-3">
          {apiKeys.map((apiKey) => (
            <div
              key={apiKey.id}
              className="p-4 border border-gray-200 rounded-md"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-medium text-gray-900">{apiKey.name}</p>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        apiKey.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {apiKey.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-md">
                    <code className="flex-1 text-sm font-mono text-gray-900">
                      {showKey[apiKey.id] ? apiKey.key : maskKey(apiKey.key)}
                    </code>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleKeyVisibility(apiKey.id)}
                        className="p-1 text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        {showKey[apiKey.id] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(apiKey.key)}
                        className="p-1 text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 mt-3 text-xs text-gray-500">
                    <span>Created: {apiKey.created}</span>
                    <span>Last used: {apiKey.lastUsed}</span>
                  </div>
                </div>

                <button className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors ml-4">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Security Note:</strong> Keep your API keys secure and never share
            them publicly. Rotate keys regularly for enhanced security.
          </p>
        </div>
      </div>

      {/* Webhooks */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Webhooks</h2>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors">
            <Plus className="w-4 h-4" />
            Add Webhook
          </button>
        </div>

        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-medium text-gray-900">{webhook.name}</p>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        webhook.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {webhook.status}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 font-mono mb-2">
                    {webhook.url}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {webhook.events.map((event, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-mono"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                </div>

                <button className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors ml-4">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Available Events */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Available Webhook Events
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            "project.created",
            "project.updated",
            "project.deleted",
            "approval.submitted",
            "approval.approved",
            "approval.rejected",
            "expense.created",
            "expense.updated",
            "budget.exceeded",
            "material.low_stock",
            "user.created",
            "user.updated",
          ].map((event) => (
            <div
              key={event}
              className="px-3 py-2 border border-gray-200 rounded-md"
            >
              <code className="text-sm text-gray-900">{event}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
