import { useEffect, useState } from "react";
import { Edit, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  createEmploymentType,
  deleteEmploymentType,
  getEmploymentTypes,
  getSalaryFrequencies,
  createSalaryFrequency,
  deleteSalaryFrequency,
  updateEmploymentType,
  type EmploymentTypeConfig,
  type SalaryType,
  type SalaryFrequencyConfig,
  type PaymentSource,
} from "../../api/employment-types";

export function EmploymentTypesPanel() {
  const [items, setItems] = useState<EmploymentTypeConfig[]>([]);
  const [editing, setEditing] = useState<EmploymentTypeConfig | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [defaultSalaryType, setDefaultSalaryType] = useState<SalaryType>("Monthly");
  const [defaultSalaryFrequencyId, setDefaultSalaryFrequencyId] = useState("salary-frequency-monthly");
  const [paysSalary, setPaysSalary] = useState(true);
  const [defaultPaymentSource, setDefaultPaymentSource] = useState<PaymentSource>("company");
  const [frequencies, setFrequencies] = useState<SalaryFrequencyConfig[]>([]);
  const [newFrequency, setNewFrequency] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getEmploymentTypes(), getSalaryFrequencies()])
      .then(([types, configuredFrequencies]) => { setItems(types); setFrequencies(configuredFrequencies); })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load employment types."));
  }, []);

  function openAdd() {
    setEditing(null);
    setName("");
    setDefaultSalaryType("Monthly");
    setDefaultSalaryFrequencyId("salary-frequency-monthly");
    setPaysSalary(true);
    setDefaultPaymentSource("company");
    setShowModal(true);
  }

  function openEdit(item: EmploymentTypeConfig) {
    setEditing(item);
    setName(item.name);
    setDefaultSalaryType(item.defaultSalaryType);
    setDefaultSalaryFrequencyId(item.defaultSalaryFrequencyId);
    setPaysSalary(item.paysSalary);
    setDefaultPaymentSource(item.defaultPaymentSource);
    setShowModal(true);
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateEmploymentType(editing.id, { name: name.trim(), defaultSalaryType, defaultSalaryFrequencyId, paysSalary, defaultPaymentSource });
        setItems((current) => current.map((item) => item.id === editing.id ? updated : item));
        toast.success("Employment type updated.");
      } else {
        const created = await createEmploymentType({ name: name.trim(), defaultSalaryType, defaultSalaryFrequencyId, paysSalary, defaultPaymentSource });
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

  async function addFrequency() {
    if (!newFrequency.trim()) return;
    try {
      const created = await createSalaryFrequency({ name: newFrequency.trim() });
      setFrequencies((current) => [...current, created]);
      setNewFrequency("");
      toast.success("Salary frequency added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add salary frequency.");
    }
  }

  async function removeFrequency(frequency: SalaryFrequencyConfig) {
    if (!window.confirm(`Delete salary frequency "${frequency.name}"?`)) return;
    try {
      await deleteSalaryFrequency(frequency.id);
      setFrequencies((current) => current.filter((item) => item.id !== frequency.id));
      toast.success("Salary frequency deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete salary frequency.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3"><h2 className="text-base font-semibold text-gray-900">Salary Frequencies</h2><p className="text-sm text-gray-500">Configure the pay cycles available to salary bands and employment types.</p></div>
        <div className="mb-3 flex gap-2"><input value={newFrequency} onChange={(event) => setNewFrequency(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void addFrequency(); }} placeholder="e.g. Bi-monthly" className="max-w-sm flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" /><button onClick={addFrequency} disabled={!newFrequency.trim()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Plus className="mr-1 inline h-4 w-4" />Add Frequency</button></div>
        <div className="flex flex-wrap gap-2">{frequencies.map((frequency) => <span key={frequency.id} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700">{frequency.name}<button title={`Delete ${frequency.name}`} onClick={() => removeFrequency(frequency)} className="text-gray-400 hover:text-red-600"><X className="h-3.5 w-3.5" /></button></span>)}</div>
      </div>
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
            <tr><th className="px-4 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">Payroll</th><th className="px-4 py-3 font-medium">Frequency</th><th className="px-4 py-3 font-medium">Paid From</th><th className="w-24 px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${item.paysSalary ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{item.paysSalary ? "Paid" : "Unpaid"}</span></td>
                <td className="px-4 py-3 text-gray-600">{frequencies.find((frequency) => frequency.id === item.defaultSalaryFrequencyId)?.name ?? item.defaultSalaryType}</td>
                <td className="px-4 py-3 text-gray-600 capitalize">{item.defaultPaymentSource}</td>
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
              <label className="flex items-center justify-between rounded-lg border border-gray-200 p-3"><span><span className="block text-sm font-medium text-gray-800">Paid employment</span><span className="block text-xs text-gray-500">Include employees of this type in payroll</span></span><input type="checkbox" checked={paysSalary} onChange={(event) => setPaysSalary(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600" /></label>
              <div><label className="mb-1 block text-xs font-medium text-gray-600">Default Salary Frequency</label><select disabled={!paysSalary} value={defaultSalaryFrequencyId} onChange={(event) => { const id = event.target.value; setDefaultSalaryFrequencyId(id); setDefaultSalaryType(frequencies.find((frequency) => frequency.id === id)?.name ?? "Monthly"); }} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100">{frequencies.map((frequency) => <option key={frequency.id} value={frequency.id}>{frequency.name}</option>)}</select></div>
              <div><label className="mb-1 block text-xs font-medium text-gray-600">Default Payment Source</label><select disabled={!paysSalary} value={defaultPaymentSource} onChange={(event) => setDefaultPaymentSource(event.target.value as PaymentSource)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100"><option value="company">Company payroll</option><option value="project">Project payroll</option></select></div>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4"><button onClick={() => setShowModal(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button onClick={save} disabled={saving || !name.trim()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
