import { Save, Plus, Edit, Trash2, DollarSign, Info, ChevronRight, Hash, X } from "lucide-react";
import { useState } from "react";
import { useNumbering, type ModuleNumbering, MODULE_DOMAINS, formatId } from "../../stores/numberingStore";

export function FinancialConfigurationPage() {
  const { configs, updateConfig, resetConfig, addConfig, removeConfig } = useNumbering();

  const [chartOfAccounts, setChartOfAccounts] = useState([
    { id: "1", code: "1000", name: "Assets", type: "Asset", parent: null },
    { id: "2", code: "1100", name: "Current Assets", type: "Asset", parent: "Assets" },
    { id: "3", code: "1110", name: "Cash", type: "Asset", parent: "Current Assets" },
    { id: "4", code: "2000", name: "Liabilities", type: "Liability", parent: null },
    { id: "5", code: "3000", name: "Equity", type: "Equity", parent: null },
    { id: "6", code: "4000", name: "Revenue", type: "Revenue", parent: null },
    { id: "7", code: "5000", name: "Expenses", type: "Expense", parent: null },
  ]);

  const [taxSettings, setTaxSettings] = useState([
    { id: "1", name: "VAT", rate: 15, type: "Percentage", default: true },
    { id: "2", name: "Sales Tax", rate: 7.5, type: "Percentage", default: false },
    { id: "3", name: "Service Tax", rate: 10, type: "Percentage", default: false },
  ]);

  const [paymentMethods, setPaymentMethods] = useState([
    { id: "1", name: "Cash", enabled: true },
    { id: "2", name: "Bank Transfer", enabled: true },
    { id: "3", name: "Check", enabled: true },
    { id: "4", name: "Credit Card", enabled: false },
    { id: "5", name: "Mobile Payment", enabled: true },
  ]);

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

  const accountTypeColors: Record<string, string> = {
    Asset: "bg-blue-100 text-blue-700",
    Liability: "bg-red-100 text-red-700",
    Equity: "bg-purple-100 text-purple-700",
    Revenue: "bg-green-100 text-green-700",
    Expense: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-semibold text-gray-900">Financial Configuration</h1>
          </div>
          <p className="text-sm text-gray-500">
            Module-specific configuration for the Finance module. Access is permission-controlled.
          </p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
          <Save className="w-4 h-4" />
          Save All
        </button>
      </div>

      {/* Module context banner */}
      <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
        <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
        <div className="text-sm text-indigo-800">
          This configuration belongs to the <strong>Finance module</strong>. Changes here affect all financial operations,
          reports, and transaction workflows. Only users with Finance admin permissions can modify these settings.
        </div>
      </div>

      {/* Chart of Accounts */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Chart of Accounts</h2>
            <p className="text-xs text-gray-500 mt-0.5">Define your accounting structure and account hierarchy</p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Add Account
          </button>
        </div>

        <div className="divide-y divide-gray-50">
          {chartOfAccounts.map((account) => {
            const indent = account.parent === null ? 0 : account.parent === "Assets" ? 1 : account.parent === "Current Assets" ? 2 : 0;
            return (
              <div
                key={account.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                style={{ paddingLeft: `${20 + indent * 20}px` }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {indent > 0 && <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />}
                  <span className="font-mono text-xs text-gray-400 w-12 shrink-0">{account.code}</span>
                  <span className="text-sm font-medium text-gray-900 truncate">{account.name}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium shrink-0 ${accountTypeColors[account.type] ?? "bg-gray-100 text-gray-600"}`}>
                    {account.type}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                  <button className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tax Settings */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Tax Settings</h2>
            <p className="text-xs text-gray-500 mt-0.5">Configure tax rates applied to transactions</p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Add Tax Rate
          </button>
        </div>

        <div className="divide-y divide-gray-50">
          {taxSettings.map((tax) => (
            <div key={tax.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={tax.default}
                  onChange={() => setTaxSettings((prev) => prev.map((t) => t.id === tax.id ? { ...t, default: !t.default } : t))}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-900">{tax.name}</span>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-semibold">{tax.rate}%</span>
                {tax.default && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">Default</span>}
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                <button className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Payment Methods</h2>
            <p className="text-xs text-gray-500 mt-0.5">Enable or disable accepted payment methods</p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Add Method
          </button>
        </div>

        <div className="divide-y divide-gray-50">
          {paymentMethods.map((method) => (
            <div key={method.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPaymentMethods((prev) => prev.map((m) => m.id === method.id ? { ...m, enabled: !m.enabled } : m))}
                  className={`relative w-9 h-5 rounded-full transition-colors ${method.enabled ? "bg-indigo-600" : "bg-gray-200"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${method.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                <span className="text-sm font-medium text-gray-900">{method.name}</span>
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${method.enabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                  {method.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                <button className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Module Numbering System */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Hash className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Module Numbering System</h2>
        </div>
        <div className="p-5">
          <p className="text-xs text-gray-500 mb-4">Configure the auto-numbering format for records across each module. The system uses these patterns when generating new IDs.</p>
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
                {configs.map(cfg => (
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
                            {!cfg.module.startsWith("Task") && !cfg.module.startsWith("MyTask") && !cfg.module.startsWith("Role") && (
                              <button onClick={() => removeConfig(cfg.module)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Delete entry"><Trash2 className="w-3.5 h-3.5" /></button>
                            )}
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
                        {Object.values(MODULE_DOMAINS).flat().filter(m => !configs.some(c => c.module === m)).map(m => (
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
            <button onClick={() => setShowAddForm(true)} className="mt-4 flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
              <Plus className="w-3.5 h-3.5" />
              Add Numbering Entry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
