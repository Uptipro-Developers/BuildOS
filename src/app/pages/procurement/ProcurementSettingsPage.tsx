import { Save, Edit, Trash2, Hash, Plus, X, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";
import { useNumbering, type ModuleNumbering, MODULE_DOMAINS, formatId } from "../../stores/numberingStore";

const TABS = ["numbering", "approvals", "thresholds"] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  numbering: "Numbering",
  approvals: "Approvals",
  thresholds: "Thresholds",
};

function NumberingPanel() {
  const { configs, updateConfig, resetConfig, addConfig, removeConfig } = useNumbering();
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ template: "", startingNumber: 1, endingNumber: null as number | null, incrementBy: 1 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({ module: "", template: "", startingNumber: 1, endingNumber: null as number | null, incrementBy: 1, description: "" });

  function startEdit(cfg: ModuleNumbering) {
    setEditingModule(cfg.module);
    setEditForm({ template: cfg.template, startingNumber: cfg.startingNumber, endingNumber: cfg.endingNumber, incrementBy: cfg.incrementBy });
  }

  function cancelEdit() {
    setEditingModule(null);
  }

  function saveEdit(module: string) {
    updateConfig(module, editForm);
    setEditingModule(null);
  }

  function saveAddNumbering() {
    if (!addFormData.module.trim()) return;
    addConfig({
      module: addFormData.module,
      prefix: addFormData.module.slice(0, 3).toUpperCase(),
      separator: "-",
      template: addFormData.template || `${addFormData.module.slice(0, 3).toUpperCase()}-{N:4}`,
      startingNumber: addFormData.startingNumber,
      endingNumber: addFormData.endingNumber,
      incrementBy: addFormData.incrementBy,
      lastUsedDate: "",
      lastUsedNumber: 0,
      description: addFormData.description,
    });
    setShowAddForm(false);
    setAddFormData({ module: "", template: "", startingNumber: 1, endingNumber: null, incrementBy: 1, description: "" });
  }

  const procurementConfigs = configs.filter(cfg => MODULE_DOMAINS.Procurement.includes(cfg.module));

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Hash className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-900">Module Numbering System</h2>
      </div>
      <div className="p-5">
        <p className="text-xs text-gray-500 mb-4">Configure the auto-numbering format for records across the procurement module. The system uses these patterns when generating new IDs.</p>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
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
              {procurementConfigs.map(cfg => (
                <tr key={cfg.module} className="hover:bg-gray-50 group">
                  {editingModule === cfg.module ? (
                    <>
                      <td className="px-4 py-3 font-medium text-gray-900">{cfg.module}</td>
                      <td className="px-4 py-3">
                        <input type="text" value={editForm.template} onChange={e => setEditForm({ ...editForm, template: e.target.value })}
                          className="w-28 px-2 py-1 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" min={1} value={editForm.startingNumber} onChange={e => setEditForm({ ...editForm, startingNumber: parseInt(e.target.value) || 1 })}
                          className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <input type="number" min={1} value={editForm.endingNumber ?? ""} onChange={e => setEditForm({ ...editForm, endingNumber: e.target.value ? parseInt(e.target.value) : null })}
                            className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="∞" />
                          <label className="text-[10px] text-gray-400 flex items-center gap-0.5 whitespace-nowrap">
                            <input type="checkbox" checked={editForm.endingNumber === null} onChange={e => setEditForm({ ...editForm, endingNumber: e.target.checked ? null : 9999 })} className="w-3 h-3" />
                            Unlimited
                          </label>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" min={1} value={editForm.incrementBy} onChange={e => setEditForm({ ...editForm, incrementBy: parseInt(e.target.value) || 1 })}
                          className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-600" title={String(cfg.lastUsedNumber)}>
                          {formatId(cfg.template, cfg.lastUsedNumber)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{cfg.lastUsedDate || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => saveEdit(cfg.module)} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg"><Save className="w-3.5 h-3.5" /></button>
                          <button onClick={cancelEdit} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-gray-900">{cfg.module}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-500">{cfg.template}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">{cfg.startingNumber}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">{cfg.endingNumber ?? "∞"}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">{cfg.incrementBy}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-600" title={String(cfg.lastUsedNumber)}>
                          {formatId(cfg.template, cfg.lastUsedNumber)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{cfg.lastUsedDate || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEdit(cfg)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => removeConfig(cfg.module)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Delete entry"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {showAddForm && (
                <tr className="bg-amber-50/50">
                  <td className="px-4 py-3">
                    <select value={addFormData.module} onChange={e => {
                      const m = e.target.value;
                      const prefix = m.slice(0, 3).toUpperCase();
                      setAddFormData({ ...addFormData, module: m, template: m ? `${prefix}-{N:4}` : "" });
                    }}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white">
                      <option value="">Select a process…</option>
                      {MODULE_DOMAINS.Procurement.filter(m => !configs.some(c => c.module === m)).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input type="text" value={addFormData.template} onChange={e => setAddFormData({ ...addFormData, template: e.target.value })}
                      className="w-28 px-2 py-1 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" min={1} value={addFormData.startingNumber} onChange={e => setAddFormData({ ...addFormData, startingNumber: parseInt(e.target.value) || 1 })}
                      className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <input type="number" min={1} value={addFormData.endingNumber ?? ""} onChange={e => setAddFormData({ ...addFormData, endingNumber: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="∞" />
                      <label className="text-[10px] text-gray-400 flex items-center gap-0.5 whitespace-nowrap">
                        <input type="checkbox" checked={addFormData.endingNumber === null} onChange={e => setAddFormData({ ...addFormData, endingNumber: e.target.checked ? null : 9999 })} className="w-3 h-3" />
                        Unlimited
                      </label>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" min={1} value={addFormData.incrementBy} onChange={e => setAddFormData({ ...addFormData, incrementBy: parseInt(e.target.value) || 1 })}
                      className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">—</td>
                  <td className="px-4 py-3 text-xs text-gray-400">—</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={saveAddNumbering} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg"><Save className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setShowAddForm(false); setAddFormData({ module: "", template: "", startingNumber: 1, endingNumber: null, incrementBy: 1, description: "" }); }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)} className="mt-4 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            <Plus className="w-3.5 h-3.5" /> Add Numbering Entry
          </button>
        )}
      </div>
    </div>
  );
}

function ApprovalsPanel() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
      <SettingsIcon className="w-8 h-8 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-gray-500">Approval workflow configuration coming soon.</p>
    </div>
  );
}

function ThresholdsPanel() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
      <SettingsIcon className="w-8 h-8 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-gray-500">Procurement thresholds configuration coming soon.</p>
    </div>
  );
}

export function ProcurementSettingsPage() {
  const [tab, setTab] = useState<Tab>("numbering");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SettingsIcon className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-semibold text-gray-900">Procurement Settings</h1>
          </div>
          <p className="text-sm text-gray-500">Module-specific configuration for the Procurement module. Access is permission-controlled.</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "numbering" && <NumberingPanel />}
      {tab === "approvals" && <ApprovalsPanel />}
      {tab === "thresholds" && <ThresholdsPanel />}
    </div>
  );
}
