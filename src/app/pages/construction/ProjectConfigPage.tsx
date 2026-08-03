import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Edit, Trash2, FolderCog } from "lucide-react";
import {
  getProjectTypes,
  saveProjectTypes,
  getProjectStatuses,
  saveProjectStatuses,
} from "../../api/construction-settings";

interface ProjectType {
  id: string;
  name: string;
  description: string;
}

interface ProjectStatus {
  id: string;
  name: string;
  color: string;
  sequence: number;
}

const COLOR_PRESETS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#6B7280",
  "#14B8A6",
  "#F97316",
  "#06B6D4",
];

// ─── Project Types Panel ─────────────────────────────────────────────────────
function ProjectTypesPanel() {
  const [types, setTypes] = useState<ProjectType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ProjectType | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [deleteTarget, setDeleteTarget] = useState<ProjectType | null>(null);

  useEffect(() => {
    getProjectTypes()
      .then((d) => setTypes(d as ProjectType[]))
      .catch(() => {});
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({ name: "", description: "" });
    setShowModal(true);
  }
  function openEdit(t: ProjectType) {
    setEditing(t);
    setForm({ name: t.name, description: t.description });
    setShowModal(true);
  }

  function save() {
    if (!form.name.trim()) return;
    const next = editing
      ? types.map((t) => (t.id === editing.id ? { ...t, ...form } : t))
      : [...types, { id: String(Date.now()), ...form }];
    setTypes(next);
    saveProjectTypes(next).catch((err) =>
      toast.error(
        err instanceof Error ? err.message : "Could not save the project types.",
      ),
    );
    setShowModal(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Define the types of projects your organisation handles.
        </p>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-2 rounded-xl"
        >
          <Plus className="w-4 h-4" /> Add Type
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Type Name</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-left font-medium w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {types.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 group">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {t.name}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {t.description || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => openEdit(t)}
                      className="p-1.5 text-gray-400 hover:text-orange-600 rounded-lg hover:bg-orange-50"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                {editing ? "Edit" : "Add"} Project Type
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Type Name<span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Residential"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-xl"
              >
                {editing ? "Save Changes" : "Add Type"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">
              Delete Project Type?
            </h2>
            <p className="text-sm text-gray-600">
              Remove <span className="font-medium">{deleteTarget.name}</span>?
              This may affect existing projects assigned this type.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const next = types.filter((t) => t.id !== deleteTarget.id);
                  setTypes(next);
                  saveProjectTypes(next).catch((err) =>
      toast.error(
        err instanceof Error ? err.message : "Could not save the project types.",
      ),
    );
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Project Statuses Panel ───────────────────────────────────────────────────
function ProjectStatusesPanel() {
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ProjectStatus | null>(null);
  const [form, setForm] = useState({ name: "", color: COLOR_PRESETS[0] });
  const [deleteTarget, setDeleteTarget] = useState<ProjectStatus | null>(null);

  useEffect(() => {
    getProjectStatuses()
      .then((d) => setStatuses(d as ProjectStatus[]))
      .catch(() => {});
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({ name: "", color: COLOR_PRESETS[0] });
    setShowModal(true);
  }
  function openEdit(s: ProjectStatus) {
    setEditing(s);
    setForm({ name: s.name, color: s.color });
    setShowModal(true);
  }

  function save() {
    if (!form.name.trim()) return;
    const maxSeq = statuses.reduce((m, s) => Math.max(m, s.sequence), 0);
    const next = editing
      ? statuses.map((s) => (s.id === editing.id ? { ...s, ...form } : s))
      : [...statuses, { id: String(Date.now()), sequence: maxSeq + 1, ...form }];
    setStatuses(next);
    saveProjectStatuses(next).catch((err) =>
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not save the project statuses.",
      ),
    );
    setShowModal(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Define the lifecycle stages for your construction projects.
        </p>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-2 rounded-xl"
        >
          <Plus className="w-4 h-4" /> Add Status
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-medium">#</th>
              <th className="px-4 py-3 text-left font-medium">Status Name</th>
              <th className="px-4 py-3 text-left font-medium">Color</th>
              <th className="px-4 py-3 text-left font-medium w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {statuses
              .sort((a, b) => a.sequence - b.sequence)
              .map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {s.sequence}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="font-medium text-gray-900">
                        {s.name}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-gray-400">
                      {s.color}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(s)}
                        className="p-1.5 text-gray-400 hover:text-orange-600 rounded-lg hover:bg-orange-50"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(s)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                {editing ? "Edit" : "Add"} Project Status
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Status Name<span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. In Progress"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Badge Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, color: c }))}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c ? "scale-110 border-gray-800" : "border-transparent hover:scale-105"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span
                    className="w-6 h-6 rounded-full border border-gray-200 flex-shrink-0"
                    style={{ backgroundColor: form.color }}
                  />
                  <input
                    value={form.color}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, color: e.target.value }))
                    }
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-mono w-28 outline-none focus:ring-1 focus:ring-orange-400"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-xl"
              >
                {editing ? "Save Changes" : "Add Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">
              Delete Status?
            </h2>
            <p className="text-sm text-gray-600">
              Remove <span className="font-medium">{deleteTarget.name}</span>?
              Projects with this status will be unaffected but it won't be
              available for new projects.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const next = statuses.filter((s) => s.id !== deleteTarget.id);
                  setStatuses(next);
                  saveProjectStatuses(next).catch((err) =>
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not save the project statuses.",
      ),
    );
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function ProjectConfigPage() {
  const [tab, setTab] = useState<"types" | "statuses">("types");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
          <FolderCog className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Project Configuration
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage project types and lifecycle statuses
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {(
          [
            ["types", "Project Types"],
            ["statuses", "Project Statuses"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? "border-orange-600 text-orange-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "types" && <ProjectTypesPanel />}
      {tab === "statuses" && <ProjectStatusesPanel />}
    </div>
  );
}
