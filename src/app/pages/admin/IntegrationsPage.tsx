import { Plus, Copy, Trash2, Key, Webhook, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "../../api/client";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { formatDateByGeneralSettings } from "../../utils/generalSettings";

type ApiKey = {
  id: string;
  name: string;
  /** Non-secret fragment, e.g. "sk_live_…3f9c". The full key is never re-served. */
  keyPreview: string;
  created?: string;
  lastUsed?: string;
  status?: string;
  /** Created before keys were hashed at rest; should be rotated. */
  isLegacyPlaintext?: boolean;
};

/** A freshly created key, held only in memory so the admin can copy it once. */
type NewApiKey = { name: string; key: string };

type WebhookConfig = {
  id: string;
  name: string;
  url: string;
  events: string[];
  status?: string;
};

export function IntegrationsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const [newKey, setNewKey] = useState<NewApiKey | null>(null);

  // Modal state
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [webhookName, setWebhookName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "key" | "webhook";
    id: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<ApiKey[]>("/admin/api-keys"),
      apiFetch<WebhookConfig[]>("/admin/webhooks"),
    ])
      .then(([keys, hooks]) => {
        setApiKeys(keys ?? []);
        setWebhooks(hooks ?? []);
      })
      .catch((err) => {
        console.error("Failed to load integrations:", err);
        setApiKeys([]);
        setWebhooks([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const openKeyModal = () => {
    setKeyName("");
    setKeyModalOpen(true);
  };

  const submitApiKey = () => {
    const name = keyName.trim();
    if (!name) {
      toast.error("Please enter a name for the API key.");
      return;
    }
    setSaving(true);
    apiFetch<ApiKey & { key: string }>("/admin/api-keys", {
      method: "POST",
      body: JSON.stringify({ name }),
    })
      .then(({ key, ...record }) => {
        setApiKeys((prev) => [record, ...prev]);
        setKeyModalOpen(false);
        // Keys are hashed at rest, so this is the only moment the plaintext
        // exists outside the caller. Surface it until the admin dismisses it.
        setNewKey({ name: record.name, key });
        toast.success("API key generated — copy it now");
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to generate API key.");
      })
      .finally(() => setSaving(false));
  };

  const openWebhookModal = () => {
    setWebhookName("");
    setWebhookUrl("");
    setWebhookEvents("");
    setWebhookModalOpen(true);
  };

  const submitWebhook = () => {
    const name = webhookName.trim();
    const url = webhookUrl.trim();
    const events = webhookEvents
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (!name) {
      toast.error("Please enter a webhook name.");
      return;
    }
    if (!url) {
      toast.error("Please enter a webhook URL.");
      return;
    }
    if (events.length === 0) {
      toast.error("Please enter at least one event.");
      return;
    }
    setSaving(true);
    apiFetch<WebhookConfig>("/admin/webhooks", {
      method: "POST",
      body: JSON.stringify({ name, url, events }),
    })
      .then((created) => {
        setWebhooks((prev) => [created, ...prev]);
        setWebhookModalOpen(false);
        toast.success("Webhook added");
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to add webhook.");
      })
      .finally(() => setSaving(false));
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    setDeleting(true);
    const path =
      type === "key" ? `/admin/api-keys/${id}` : `/admin/webhooks/${id}`;
    apiFetch(path, { method: "DELETE" })
      .then(() => {
        if (type === "key") {
          setApiKeys((prev) => prev.filter((k) => k.id !== id));
          toast.success("API key deleted");
        } else {
          setWebhooks((prev) => prev.filter((w) => w.id !== id));
          toast.success("Webhook deleted");
        }
        setDeleteTarget(null);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to delete. Please try again.");
      })
      .finally(() => setDeleting(false));
  };

  const fmtDate = (v?: string) => {
    if (!v) return "Never";
    return formatDateByGeneralSettings(v) || v;
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
          <button
            onClick={openKeyModal}
            className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Generate New Key
          </button>
        </div>

        <div className="space-y-3">
          {loading && (
            <p className="text-sm text-gray-500">Loading API keys...</p>
          )}
          {!loading && apiKeys.length === 0 && (
            <p className="text-sm text-gray-500">No API keys configured.</p>
          )}
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
                        (apiKey.status ?? "active") === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {apiKey.status ?? "active"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-md">
                    <code className="flex-1 text-sm font-mono text-gray-900">
                      {apiKey.keyPreview}
                    </code>
                    {/* No reveal or copy control: the key is stored hashed, so
                        the full value cannot be shown again after creation. */}
                    <span className="text-xs text-gray-500">
                      Shown once at creation
                    </span>
                  </div>

                  {apiKey.isLegacyPlaintext && (
                    <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                      Stored in plain text by an older version. It still works —
                      delete and regenerate it to store only a hash.
                    </p>
                  )}

                  <div className="flex items-center gap-6 mt-3 text-xs text-gray-500">
                    <span>Created: {fmtDate(apiKey.created)}</span>
                    <span>Last used: {fmtDate(apiKey.lastUsed)}</span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    setDeleteTarget({ type: "key", id: apiKey.id })
                  }
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors ml-4"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Security Note:</strong> Keep your API keys secure and never
            share them publicly. Rotate keys regularly for enhanced security.
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
          <button
            onClick={openWebhookModal}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Webhook
          </button>
        </div>

        <div className="space-y-3">
          {loading && (
            <p className="text-sm text-gray-500">Loading webhooks...</p>
          )}
          {!loading && webhooks.length === 0 && (
            <p className="text-sm text-gray-500">No webhooks configured.</p>
          )}
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
                        (webhook.status ?? "active") === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {webhook.status ?? "active"}
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

                <button
                  onClick={() =>
                    setDeleteTarget({ type: "webhook", id: webhook.id })
                  }
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors ml-4"
                >
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

      {/* Newly created key — the only time the plaintext is available */}
      {newKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Copy your API key
              </h3>
              <button
                onClick={() => setNewKey(null)}
                className="p-1 text-gray-500 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600">
              This is the only time <span className="font-medium">{newKey.name}</span>{" "}
              can be displayed. Only a hash is stored, so it cannot be recovered
              later — if you lose it, delete the key and generate a new one.
            </p>

            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 p-3 rounded-md">
              <code className="flex-1 text-sm font-mono text-gray-900 break-all">
                {newKey.key}
              </code>
              <button
                onClick={() => copyToClipboard(newKey.key)}
                className="p-1 text-gray-600 hover:text-gray-900 transition-colors shrink-0"
                aria-label="Copy API key"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setNewKey(null)}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800"
              >
                I've copied it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate API Key Modal */}
      {keyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Generate New API Key
              </h3>
              <button
                onClick={() => setKeyModalOpen(false)}
                className="p-1 text-gray-500 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key Name
              </label>
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g. Production Integration"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && submitApiKey()}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setKeyModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitApiKey}
                disabled={saving}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "Generating..." : "Generate Key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Webhook Modal */}
      {webhookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Add Webhook
              </h3>
              <button
                onClick={() => setWebhookModalOpen(false)}
                className="p-1 text-gray-500 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={webhookName}
                onChange={(e) => setWebhookName(e.target.value)}
                placeholder="e.g. Project Updates"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://example.com/webhook"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Events (comma-separated)
              </label>
              <input
                type="text"
                value={webhookEvents}
                onChange={(e) => setWebhookEvents(e.target.value)}
                placeholder="project.updated, approval.submitted"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setWebhookModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitWebhook}
                disabled={saving}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "Adding..." : "Add Webhook"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteTarget !== null}
        title={
          deleteTarget?.type === "key" ? "Delete API Key?" : "Delete Webhook?"
        }
        description="This action cannot be undone."
        confirmLabel="Delete"
        isDangerous
        isLoading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
