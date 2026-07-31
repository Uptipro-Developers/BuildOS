import { useState } from "react";
import { toast } from "sonner";
import { Save, RotateCcw, X } from "lucide-react";
import { useNumbering, type ModuleNumbering } from "../stores/numberingStore";

/**
 * Literal classes per accent.
 *
 * Tailwind generates classes by scanning source text, so an interpolated
 * `bg-${accent}-600` produces no CSS at all and the button renders unstyled.
 */
const ACCENTS = {
  indigo: "bg-indigo-600 hover:bg-indigo-700",
  blue: "bg-blue-700 hover:bg-blue-800",
  teal: "bg-teal-700 hover:bg-teal-800",
  orange: "bg-orange-600 hover:bg-orange-700",
  purple: "bg-purple-700 hover:bg-purple-800",
} as const;

/**
 * Module numbering configuration for one application.
 *
 * Extracted as a shared panel because Storefront and Admin each had their own
 * copy of this UI, and Procurement, Construction and HR had none at all — so
 * sequences those apps rely on could not be configured anywhere. One component
 * means the four apps cannot drift apart in behaviour.
 *
 * Sequence position (`nextNumber`) is editable but never reset by "restore
 * defaults": rewinding it would re-issue references that existing records already
 * carry.
 */
export function NumberingConfigPanel({
  app,
  accent = "indigo",
}: {
  /** Which app's sequences to show, matching the `app` column on the server. */
  app: string;
  /** Which accent the primary button uses, to match the host app. */
  accent?: keyof typeof ACCENTS;
}) {
  const { configs, loading, error, updateConfig, resetConfig } = useNumbering();
  const [editing, setEditing] = useState<ModuleNumbering | null>(null);
  const [form, setForm] = useState({
    prefix: "",
    separator: "-",
    padLength: 4,
    nextNumber: 1,
  });
  const [saving, setSaving] = useState(false);

  const rows = configs
    .filter((c) => (c.app ?? "shared") === app)
    .sort((a, b) => a.module.localeCompare(b.module));

  const preview = (c: {
    prefix: string;
    separator: string;
    padLength: number;
    nextNumber: number;
  }) =>
    `${c.prefix}${c.separator}${String(c.nextNumber).padStart(c.padLength, "0")}`;

  function startEdit(c: ModuleNumbering) {
    setEditing(c);
    setForm({
      prefix: c.prefix,
      separator: c.separator,
      padLength: c.padLength,
      nextNumber: c.nextNumber,
    });
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      await updateConfig(editing.module, form);
      toast.success(`Numbering for ${editing.module} saved.`);
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

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Module Numbering</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          The reference format for records created in this application. Changes
          apply to references issued from now on.
        </p>
      </div>

      {error && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
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
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Module", "Format", "Next", "Description", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((c) => (
                <tr key={c.module} className="hover:bg-gray-50/60">
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    {c.module}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs bg-gray-100 rounded px-1.5 py-0.5">
                      {preview(c)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{c.nextNumber}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {c.description}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => startEdit(c)}
                      className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void restore(c.module)}
                      title="Restore the default prefix, separator and padding. The sequence position is left alone."
                      className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                    >
                      <RotateCcw className="w-3.5 h-3.5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">
                {editing.module} numbering
              </h2>
              <button
                onClick={() => setEditing(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Prefix
                  </label>
                  <input
                    value={form.prefix}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, prefix: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Separator
                  </label>
                  <input
                    value={form.separator}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, separator: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Digits
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={form.padLength}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        padLength: Number(e.target.value),
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Next number
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.nextNumber}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, nextNumber: Number(e.target.value) }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Lowering this can re-issue a reference an existing record
                  already uses.
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm">
                Next reference:{" "}
                <span className="font-mono font-medium">{preview(form)}</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void save()}
                disabled={saving || !form.prefix.trim()}
                className={`px-4 py-2 text-sm text-white rounded-xl disabled:opacity-50 flex items-center gap-2 ${ACCENTS[accent]}`}
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
