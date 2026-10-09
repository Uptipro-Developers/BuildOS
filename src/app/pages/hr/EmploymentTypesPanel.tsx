import { useEffect, useState } from "react";
import { Edit, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  createEmploymentType,
  deleteEmploymentType,
  getEmploymentTypes,
  updateEmploymentType,
  type EmploymentTypeConfig,
  type SalaryType,
} from "../../api/employment-types";

export function EmploymentTypesPanel() {
  const [items, setItems] = useState<EmploymentTypeConfig[]>([]);
  const [editing, setEditing] = useState<EmploymentTypeConfig | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [defaultSalaryType, setDefaultSalaryType] = useState<SalaryType>("Monthly");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getEmploymentTypes().then(setItems).catch((error) =>
      toast.error(error instanceof Error ? error.message : "Failed to load employment types."),
    );
  }, []);

  function openAdd() {
    setEditing(null);
    setName("");
    setDefaultSalaryType("Monthly");
    setShowModal(true);
  }

  function openEdit(item: EmploymentTypeConfig) {
    setEditing(item);
    setName(item.name);
    setDefaultSalaryType(item.defaultSalaryType);
    setShowModal(true);
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateEmploymentType(editing.id, { name: name.trim(), defaultSalaryType });
        setItems((current) => current.map((item) => item.id === editing.id ? updated : item));
        toast.success("Employment type updated.");
      } else {
        const created = await createEmploymentType({ name: name.trim(), defaultSalaryType });
        setItems((current) => [...current, created]);
        toast.success("Employment type added.");
      }
      setShowModal(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save employment type.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: EmploymentTypeConfig) {
    if (!window.confirm(`Delete employment type "${item.name}"?`)) return;
    try {
      await deleteEmploymentType(item.id);
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      toast.success("Employment type deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete employment type.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Employment Types</h2>
          <p className="text-sm text-gray-500">Define employee engagement types and their default salary frequency.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> Add Employment Type
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-xs text-gray-500">
            <tr><th className="px-4 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">Default Salary Type</th><th className="w-24 px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                <td className="px-4 py-3 text-gray-600">{item.defaultSalaryType}</td>
                <td className="px-4 py-3"><div className="flex justify-end gap-1">
                  <button title="Edit employment type" onClick={() => openEdit(item)} className="rounded p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"><Edit className="h-4 w-4" /></button>
                  <button title="Delete employment type" onClick={() => remove(item)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4"><h3 className="font-semibold text-gray-900">{editing ? "Edit" : "Add"} Employment Type</h3><button onClick={() => setShowModal(false)}><X className="h-5 w-5 text-gray-400" /></button></div>
            <div className="space-y-4 p-5">
              <div><label className="mb-1 block text-xs font-medium text-gray-600">Name</label><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Permanent" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
              <div><label className="mb-1 block text-xs font-medium text-gray-600">Default Salary Type</label><select value={defaultSalaryType} onChange={(event) => setDefaultSalaryType(event.target.value as SalaryType)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"><option>Monthly</option><option>Annual</option></select></div>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4"><button onClick={() => setShowModal(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button onClick={save} disabled={saving || !name.trim()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
