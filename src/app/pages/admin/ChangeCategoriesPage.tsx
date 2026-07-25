import { useState } from "react";
import { Plus, Edit, Trash2, X, Search, RefreshCw } from "lucide-react";

interface ChangeCategory {
  id: string;
  name: string;
  description: string;
}

const SEED: ChangeCategory[] = [
  { id: "cc-001", name: "Design Change", description: "Modifications to architectural or engineering designs." },
  { id: "cc-002", name: "Scope Adjustment", description: "Changes that expand or reduce the project scope." },
  { id: "cc-003", name: "Budget Revision", description: "Requests to revise the approved project budget." },
  { id: "cc-004", name: "Timeline Change", description: "Extensions or reductions to project milestones or deadlines." },
  { id: "cc-005", name: "Specification Change", description: "Changes to material specs, grades, or product standards." },
  { id: "cc-006", name: "Resource Reallocation", description: "Reassignment of labour, equipment, or personnel across tasks." },
  { id: "cc-007", name: "Regulatory Compliance", description: "Changes mandated by regulatory or statutory requirements." },
  { id: "cc-008", name: "Safety Improvement", description: "Changes required to address site safety or risk findings." },
];

const BLANK: Omit<ChangeCategory, "id"> = { name: "", description: "" };

function CategoryModal({
  initial,
  onSave,
  onClose,
}: {
  initial: Partial<ChangeCategory> & { name: string; description: string };
  onSave: (data: Omit<ChangeCategory, "id"> & { id?: string }) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit() {
    if (!form.name.trim()) {
      setErrors({ name: "Name is required." });
      return;
    }
    onSave(form);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {initial.id ? "Edit Change Category" : "New Change Category"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Design Change"
              className={`w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.name ? "border-red-400" : "border-gray-200"
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Describe when this category applies…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
          >
            {initial.id ? "Save Changes" : "Add Category"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({
  name,
  onConfirm,
  onClose,
}: {
  name: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Delete Change Category?</h2>
        <p className="text-sm text-gray-500">
          <strong>"{name}"</strong> will be permanently removed.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChangeCategoriesPage() {
  const [categories, setCategories] = useState<ChangeCategory[]>(SEED);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ChangeCategory | null>(null);
  const [deleting, setDeleting] = useState<ChangeCategory | null>(null);

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase()),
  );

  function save(data: Omit<ChangeCategory, "id"> & { id?: string }) {
    if (data.id) {
      setCategories((prev) =>
        prev.map((c) => (c.id === data.id ? { ...data, id: data.id! } : c)),
      );
    } else {
      setCategories((prev) => [
        ...prev,
        { ...data, id: `cc-${Date.now()}` },
      ]);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Change Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Define categories used when employees raise change requests in ESS
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-xl"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-start gap-3">
        <RefreshCw className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-indigo-700">
          These categories appear in the ESS <strong>Change Request</strong> form. They help classify and route
          change requests to the appropriate approvers.
        </p>
      </div>

      {/* Search */}
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories…"
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-medium w-8">#</th>
              <th className="px-4 py-3 text-left font-medium">Category Name</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-left font-medium w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">
                  No categories found.
                </td>
              </tr>
            )}
            {filtered.map((cat, i) => (
              <tr key={cat.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{cat.description || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditing(cat); setShowModal(true); }}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleting(cat)}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">
        {filtered.length} of {categories.length} categories
      </p>

      {showModal && (
        <CategoryModal
          initial={editing ?? { ...BLANK }}
          onSave={save}
          onClose={() => setShowModal(false)}
        />
      )}

      {deleting && (
        <DeleteModal
          name={deleting.name}
          onConfirm={() =>
            setCategories((prev) => prev.filter((c) => c.id !== deleting.id))
          }
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
