import { useState } from "react";
import { toast } from "sonner";
import { Save, RotateCcw, X, Trash2, Edit, Hash } from "lucide-react";
import { useNumbering, type ModuleNumbering } from "../stores/numberingStore";
import { ConfirmationModal } from "./ConfirmationModal";

/**
 * Literal classes per accent.
 *
 * Tailwind generates classes by scanning source text, so an interpolated
 * `bg-${accent}-600` produces no CSS at all and the button renders unstyled.
 */
const ACCENTS = {
  indigo: "text-indigo-600 hover:text-indigo-700",
  blue: "text-blue-700 hover:text-blue-800",
  teal: "text-teal-700 hover:text-teal-800",
  orange: "text-orange-600 hover:text-orange-700",
  purple: "text-purple-700 hover:text-purple-800",
} as const;

/**
 * Formats a sequence value against a reference template.
 *
 * Mirrors the server's formatter so the preview shown here is the reference that
 * will actually be issued. `{N}` inserts the number, `{N:4}` pads it to four
 * digits; a row with no template falls back to the prefix/separator/padding it
 * was created with.
 */
export function formatReference(cfg: ModuleNumbering, value: number): string {
  const template = String(cfg.template ?? "").trim();
  if (!template) {
    return `${cfg.prefix}${cfg.separator}${String(value).padStart(cfg.padLength, "0")}`;
  }
  return template.replace(/\{N(?::(\d+))?\}/gi, (_m, pad?: string) =>
    String(value).padStart(pad ? Number(pad) : 1, "0"),
  );
}

interface EditForm {
  template: string;
  startingNumber: number;
  endingNumber: number | null;
  incrementBy: number;
}

/**
 * Module numbering configuration for one application.
 *
 * Matches the prototype's Settings table: each process has a reference template,
 * a starting and (optional) ending number, an increment, and the last number it
 * issued. An earlier version exposed prefix/separator/padding instead, which
 * could not express a bounded or stepped sequence at all.
 *
 * The sequence position is never rewound by an edit or by "restore defaults":
 * doing so would re-issue references that existing records already carry.
 */
export function NumberingConfigPanel({
  app,
  accent = "indigo",
}: {
  /** Which app's sequences to show, matching the `app` column on the server. */
  app: string;
  /** Which accent the action buttons use, to match the host app. */
  accent?: keyof typeof ACCENTS;
}) {
  const { configs, loading, error, updateConfig, resetConfig, removeConfig } =
    useNumbering();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm>({
    template: "",
    startingNumber: 1,
    endingNumber: null,
    incrementBy: 1,
  });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ModuleNumbering | null>(null);

  const rows = configs
    .filter((c) => (c.app ?? "shared") === app)
    .sort((a, b) => a.module.localeCompare(b.module));

  function startEdit(c: ModuleNumbering) {
    setEditing(c.module);
    setForm({
      template:
        c.template ?? `${c.prefix}${c.separator}{N:${c.padLength}}`,
      startingNumber: c.startingNumber ?? 1,
      endingNumber: c.endingNumber ?? null,
      incrementBy: c.incrementBy ?? 1,
    });
  }

  async function save(module: string) {
    setSaving(true);
    try {
      await updateConfig(module, form);
      toast.success(`Numbering for ${module} saved.`);
      setEditing(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save the numbering format.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function restore(module: string) {
    try {
      await resetConfig(module);
      toast.success(`${module} restored to its default format.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not restore the default format.",
      );
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await removeConfig(deleteTarget.module);
      toast.success(`Numbering for ${deleteTarget.module} removed.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not remove the numbering entry.",
      );
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Hash className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-900">
          Module Numbering System
        </h2>
      </div>
      <div className="p-5">
        <p className="text-xs text-gray-500 mb-4">
          Configure the auto-numbering format for records in this application.
          Use <span className="font-mono">{"{N:4}"}</span> for the sequence number
          padded to four digits.
        </p>

        {error && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            Showing defaults — the saved configuration could not be loaded. {error}
          </p>
        )}

        {loading && rows.length === 0 ? (
          <p className="text-sm text-gray-400">Loading numbering…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-400">
            No numbered modules for this application.
          </p>
        ) : (
          // Scrolls rather than clipping: at eight columns the trailing actions
          // cell would otherwise be cut off on a narrow viewport.
          <div className="border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Process</th>
                  <th className="px-4 py-3 text-left font-medium">Template</th>
                  <th className="px-4 py-3 text-left font-medium">Starting #</th>
                  <th className="px-4 py-3 text-left font-medium">Ending #</th>
                  <th className="px-4 py-3 text-left font-medium">Increment By</th>
                  <th className="px-4 py-3 text-left font-medium">Last Used #</th>
                  <th className="px-4 py-3 text-left font-medium">Last Used Date</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((cfg) =>
                  editing === cfg.module ? (
                    <tr key={cfg.module} className="bg-indigo-50/30">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {cfg.module}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={form.template}
                          onChange={(e) =>
                            setForm({ ...form, template: e.target.value })
                          }
                          className="w-32 px-2 py-1 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={1}
                          value={form.startingNumber}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              startingNumber: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            value={form.endingNumber ?? ""}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                endingNumber: e.target.value
                                  ? parseInt(e.target.value)
                                  : null,
                              })
                            }
                            placeholder="∞"
                            className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <label className="text-[10px] text-gray-400 flex items-center gap-0.5 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={form.endingNumber === null}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  endingNumber: e.target.checked ? null : 9999,
                                })
                              }
                              className="w-3 h-3"
                            />
                            Unlimited
                          </label>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={1}
                          value={form.incrementBy}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              incrementBy: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400" colSpan={2}>
                        Editing — the sequence position is not changed.
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => save(cfg.module)}
                            disabled={saving}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                            title="Save"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={cfg.module} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {cfg.module}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-500">
                          {cfg.template ||
                            `${cfg.prefix}${cfg.separator}{N:${cfg.padLength}}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {cfg.startingNumber ?? 1}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {cfg.endingNumber ?? "∞"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {cfg.incrementBy ?? 1}
                      </td>
                      <td className="px-4 py-3">
                        {cfg.lastUsedNumber ? (
                          <span
                            className="font-mono text-xs text-gray-600"
                            title={String(cfg.lastUsedNumber)}
                          >
                            {formatReference(cfg, cfg.lastUsedNumber)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {cfg.lastUsedDate
                          ? new Date(cfg.lastUsedDate).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {/* Always visible — hover-revealed actions are invisible
                            on the page and unreachable on a touch device. */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(cfg)}
                            className={`p-1.5 rounded-lg hover:bg-gray-100 ${ACCENTS[accent]}`}
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => restore(cfg.module)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                            title="Restore default format"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(cfg)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                            title="Remove entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Remove Numbering Entry?"
        description={`Remove the numbering configuration for "${deleteTarget?.module ?? ""}"? Records created afterwards will have no reference format until one is configured again.`}
        confirmLabel="Remove"
        isDangerous
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
