import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Edit, Trash2, FolderKanban, FolderX } from "lucide-react";
import {
  fetchClaimTypes,
  createClaimType,
  updateClaimType,
  deleteClaimType,
  type ClaimType,
} from "../../api/claim-types";
import { ConfirmationModal } from "../../components/ConfirmationModal";

const EMPTY = { name: "", description: "", isProjectBased: false };

export function ClaimTypeSetupPage() {
  const [claimTypes, setClaimTypes] = useState<ClaimType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);

  useEffect(() => {
    fetchClaimTypes().then(setClaimTypes).catch(console.error);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editId) {
      const updated = await updateClaimType(editId, form);
      setClaimTypes((prev) => prev.map((c) => (c.id === editId ? updated : c)));
      setEditId(null);
    } else {
      const created = await createClaimType(form);
      setClaimTypes((prev) => [...prev, created]);
    }
    setForm(EMPTY);
    setShowForm(false);
  }

  function startEdit(c: ClaimType) {
    setForm({
      name: c.name,
      description: c.description,
      isProjectBased: c.isProjectBased,
    });
    setEditId(c.id);
    setShowForm(true);
  }

  async function remove(id: string) {
    try {
      await deleteClaimType(id);
      setClaimTypes((prev) => prev.filter((x) => x.id !== id));
      toast.success("Claim type deleted");
    } catch {
      toast.error("Failed to delete claim type. Please try again.");
    }
  }

  const [deleteTarget, setDeleteTarget] = useState<ClaimType | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Claim Type Setup
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Define claim categories available to employees in ESS. Project-based
            claims require project selection at submission.
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditId(null);
            setForm(EMPTY);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" /> Add Claim Type
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 flex items-start gap-3">
        <FolderKanban className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-indigo-800">
          Claim types defined here are automatically available in{" "}
          <strong>ESS → Submit Request → Finance → Claim</strong>. Enabling{" "}
          <strong>"Project-based"</strong> forces employees to select a project
          when submitting that claim type.
        </p>
      </div>

      {showForm && (
        <div className="bg-white border border-indigo-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {editId ? "Edit Claim Type" : "Add Claim Type"}
          </h3>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Claim Type Name *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Travel Claim"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-start gap-3 cursor-pointer w-full border border-gray-200 rounded-md px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="mt-0.5">
                    <input
                      type="checkbox"
                      checked={form.isProjectBased}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          isProjectBased: e.target.checked,
                        }))
                      }
                      className="rounded accent-indigo-600 w-4 h-4"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Project-based claim
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {form.isProjectBased
                        ? "Employee must select a project when submitting this claim"
                        : "Claim is not tied to any project — project field will be hidden"}
                    </p>
                  </div>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Description{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
                placeholder="Brief description of what this claim covers…"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Claim Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Project-based
              </th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {claimTypes.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">
                  {c.name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                  {c.description || "—"}
                </td>
                <td className="px-4 py-3">
                  {c.isProjectBased ? (
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                      <FolderKanban className="w-3 h-3" /> Yes — project
                      required
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">
                      <FolderX className="w-3 h-3" /> No — standalone
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(c)}
                      className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(c)}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {claimTypes.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-10 text-center text-sm text-gray-400"
                >
                  No claim types defined yet. Add your first claim type above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmationModal
        isOpen={deleteTarget !== null}
        title="Delete Claim Type?"
        description={
          deleteTarget
            ? `This will permanently remove "${deleteTarget.name}". This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        isDangerous
        onConfirm={() => {
          if (deleteTarget) remove(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
