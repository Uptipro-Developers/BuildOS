import {
  Save,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Info,
  ChevronRight,
  Hash,
} from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import { useNumbering, type ModuleNumbering } from "../../stores/numberingStore";
import {
  getChartAccounts,
  getTaxConfigs,
  createChartAccount,
  updateChartAccount,
  deleteChartAccount,
} from "../../api/finance-extras";

const DEFAULT_CHART_OF_ACCOUNTS = [
  { id: "coa-1000", code: "1000", name: "Assets", type: "Asset", parent: null },
  {
    id: "coa-1100",
    code: "1100",
    name: "Current Assets",
    type: "Asset",
    parent: "Assets",
  },
  {
    id: "coa-1110",
    code: "1110",
    name: "Cash at Bank",
    type: "Asset",
    parent: "Current Assets",
  },
  {
    id: "coa-2000",
    code: "2000",
    name: "Liabilities",
    type: "Liability",
    parent: null,
  },
  {
    id: "coa-4000",
    code: "4000",
    name: "Revenue",
    type: "Revenue",
    parent: null,
  },
  {
    id: "coa-5000",
    code: "5000",
    name: "Operating Expenses",
    type: "Expense",
    parent: null,
  },
];

const DEFAULT_TAX_SETTINGS = [
  { id: "tax-vat", name: "VAT", rate: 7.5, default: true },
  { id: "tax-wht", name: "Withholding Tax", rate: 5, default: false },
];

const DEFAULT_PAYMENT_METHODS = [
  { id: "pm-bank-transfer", name: "Bank Transfer", enabled: true },
  { id: "pm-cash", name: "Cash", enabled: true },
  { id: "pm-cheque", name: "Cheque", enabled: false },
];

export function FinancialConfigurationPage() {
  const { configs, updateConfig, resetConfig, addConfig, removeConfig } = useNumbering();

  const [chartOfAccounts, setChartOfAccounts] = useState<any[]>(
    DEFAULT_CHART_OF_ACCOUNTS,
  );

  const [taxSettings, setTaxSettings] = useState<any[]>(DEFAULT_TAX_SETTINGS);

  const [paymentMethods, setPaymentMethods] = useState<any[]>(
    DEFAULT_PAYMENT_METHODS,
  );

  const saveAll = () => {
    apiFetch("/config", {
      method: "POST",
      body: JSON.stringify({ chartOfAccounts, taxSettings, paymentMethods }),
    }).catch((err) => {
      console.error("Failed to save financial configuration:", err);
    });
  };

  const addAccount = async () => {
    const name = window.prompt("Account name", "New Account")?.trim();
    if (!name) return;
    const code = window.prompt("Account code", "0000")?.trim() || "0000";
    const type = window.prompt("Account type", "Asset")?.trim() || "Asset";
    try {
      const created = await createChartAccount({ name, code, type });
      setChartOfAccounts((prev) => [
        ...prev,
        { id: created.id, name: created.name, code: created.code, type: created.type, parent: null },
      ]);
    } catch (err) {
      console.error("Failed to add account:", err);
      window.alert("Failed to add account. Please try again.");
    }
  };

  const editAccount = async (id: string) => {
    const account = chartOfAccounts.find((a) => a.id === id);
    if (!account) return;
    const name = window.prompt("Account name", account.name)?.trim();
    if (!name) return;
    const code = window.prompt("Account code", account.code)?.trim() || account.code;
    const type = window.prompt("Account type", account.type)?.trim() || account.type;
    try {
      await updateChartAccount(id, { name, code, type });
      setChartOfAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, name, code, type } : a)),
      );
    } catch (err) {
      console.error("Failed to update account:", err);
      window.alert("Failed to update account. Please try again.");
    }
  };

  const deleteAccount = async (id: string) => {
    if (!window.confirm("Delete this account?")) return;
    try {
      await deleteChartAccount(id);
      setChartOfAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Failed to delete account:", err);
      window.alert("Failed to delete account. Please try again.");
    }
  };

  const addTaxRate = () => {
    const name = window.prompt("Tax name", "New Tax")?.trim();
    if (!name) return;
    const rateRaw = window.prompt("Tax rate (%)", "7.5");
    const rate = Number(rateRaw);
    if (Number.isNaN(rate)) return;
    setTaxSettings((prev) => [
      ...prev,
      { id: `tax-${Date.now()}`, name, rate, default: prev.length === 0 },
    ]);
  };

  const editTaxRate = (id: string) => {
    setTaxSettings((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const name = window.prompt("Tax name", t.name)?.trim();
        if (!name) return t;
        const rateRaw = window.prompt("Tax rate (%)", String(t.rate));
        const rate = Number(rateRaw);
        if (Number.isNaN(rate)) return t;
        return { ...t, name, rate };
      }),
    );
  };

  const deleteTaxRate = (id: string) => {
    if (!window.confirm("Delete this tax rate?")) return;
    setTaxSettings((prev) => prev.filter((t) => t.id !== id));
  };

  const addPaymentMethod = () => {
    const name = window.prompt("Payment method", "Card")?.trim();
    if (!name) return;
    setPaymentMethods((prev) => [
      ...prev,
      { id: `pm-${Date.now()}`, name, enabled: true },
    ]);
  };

  const editPaymentMethod = (id: string) => {
    setPaymentMethods((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const name = window.prompt("Payment method", m.name)?.trim();
        return name ? { ...m, name } : m;
      }),
    );
  };

  const deletePaymentMethod = (id: string) => {
    if (!window.confirm("Delete this payment method?")) return;
    setPaymentMethods((prev) => prev.filter((m) => m.id !== id));
  };

  useEffect(() => {
    Promise.all([getChartAccounts(), getTaxConfigs()])
      .then(([accounts, taxes]) => {
        if (accounts.length > 0) {
          const byId = new Map(accounts.map((a) => [a.id, a]));
          const mappedAccounts = accounts.map((a) => ({
            id: a.id,
            code: a.code,
            name: a.name,
            type: a.type,
            parent: a.parentId ? (byId.get(a.parentId)?.name ?? null) : null,
          }));
          setChartOfAccounts(mappedAccounts);
        }

        if (taxes.length > 0) {
          const firstActiveIndex = taxes.findIndex((t) => t.isActive);
          setTaxSettings(
            taxes.map((t, idx) => ({
              id: t.id,
              name: t.name,
              rate: t.rate,
              default: idx === (firstActiveIndex >= 0 ? firstActiveIndex : 0),
            })),
          );
        }
      })
      .catch((err) => {
        console.error("Failed to hydrate financial configuration:", err);
      });
  }, []);

  function togglePaymentMethod(id: string) {
    apiFetch(`/payment-methods/${id}/toggle`, {
      method: "PATCH",
    })
      .then(() => {
        setPaymentMethods((prev) =>
          prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)),
        );
      })
      .catch(console.error);
  }

  const [editingNumbering, setEditingNumbering] = useState<string | null>(null);
  const [numberingForm, setNumberingForm] = useState<ModuleNumbering | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const emptyForm = { module: "", prefix: "", separator: "-", padLength: 4, nextNumber: 1, description: "" };
  const [addForm, setAddForm] = useState<ModuleNumbering>(emptyForm);

  function openNumberingEdit(cfg: ModuleNumbering) {
    setEditingNumbering(cfg.module);
    setNumberingForm({ ...cfg });
  }

  function saveNumbering() {
    if (numberingForm) {
      updateConfig(numberingForm.module, numberingForm);
      setEditingNumbering(null);
      setNumberingForm(null);
    }
  }

  function saveAddNumbering() {
    if (addForm.module.trim()) {
      addConfig(addForm);
      setShowAddForm(false);
      setAddForm(emptyForm);
    }
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
            <h1 className="text-xl font-semibold text-gray-900">
              Financial Configuration
            </h1>
          </div>
          <p className="text-sm text-gray-500">
            Module-specific configuration for the Finance module. Access is
            permission-controlled.
          </p>
        </div>
        <button
          onClick={saveAll}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Save className="w-4 h-4" />
          Save All
        </button>
      </div>

      {/* Module context banner */}
      <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
        <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
        <div className="text-sm text-indigo-800">
          This configuration belongs to the <strong>Finance module</strong>.
          Changes here affect all financial operations, reports, and transaction
          workflows. Only users with Finance admin permissions can modify these
          settings.
        </div>
      </div>

      {/* Chart of Accounts */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Chart of Accounts
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Define your accounting structure and account hierarchy
            </p>
          </div>
          <button
            onClick={addAccount}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Account
          </button>
        </div>

        <div className="divide-y divide-gray-50">
          {chartOfAccounts.map((account) => {
            const indent =
              account.parent === null
                ? 0
                : account.parent === "Assets"
                  ? 1
                  : account.parent === "Current Assets"
                    ? 2
                    : 0;
            return (
              <div
                key={account.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                style={{ paddingLeft: `${20 + indent * 20}px` }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {indent > 0 && (
                    <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
                  )}
                  <span className="font-mono text-xs text-gray-400 w-12 shrink-0">
                    {account.code}
                  </span>
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {account.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full font-medium shrink-0 ${accountTypeColors[account.type] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {account.type}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => editAccount(account.id)}
                    className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteAccount(account.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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
            <h2 className="text-sm font-semibold text-gray-900">
              Tax Settings
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Configure tax rates applied to transactions
            </p>
          </div>
          <button
            onClick={addTaxRate}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Tax Rate
          </button>
        </div>

        <div className="divide-y divide-gray-50">
          {taxSettings.map((tax) => (
            <div
              key={tax.id}
              className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={tax.default}
                  onChange={() =>
                    setTaxSettings((prev) =>
                      prev.map((t) =>
                        t.id === tax.id ? { ...t, default: !t.default } : t,
                      ),
                    )
                  }
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-900">
                  {tax.name}
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-semibold">
                  {tax.rate}%
                </span>
                {tax.default && (
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                    Default
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => editTaxRate(tax.id)}
                  className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteTaxRate(tax.id)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Payment Methods
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Enable or disable accepted payment methods
            </p>
          </div>
          <button
            onClick={addPaymentMethod}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Method
          </button>
        </div>

        <div className="divide-y divide-gray-50">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => togglePaymentMethod(method.id)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${method.enabled ? "bg-indigo-600" : "bg-gray-200"}`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${method.enabled ? "translate-x-4" : "translate-x-0.5"}`}
                  />
                </button>
                <span className="text-sm font-medium text-gray-900">
                  {method.name}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full font-medium ${method.enabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
                >
                  {method.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => editPaymentMethod(method.id)}
                  className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deletePaymentMethod(method.id)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
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
          <div className="space-y-3">
            {configs.map(cfg => (
              <div key={cfg.module} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                {editingNumbering === cfg.module && numberingForm ? (
                  <div className="flex-1 grid grid-cols-5 gap-3 items-end">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Prefix</label>
                      <input value={numberingForm.prefix} onChange={e => setNumberingForm({ ...numberingForm, prefix: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Separator</label>
                      <input value={numberingForm.separator} onChange={e => setNumberingForm({ ...numberingForm, separator: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" maxLength={2} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Pad Length</label>
                      <input type="number" value={numberingForm.padLength} onChange={e => setNumberingForm({ ...numberingForm, padLength: parseInt(e.target.value) || 1 })}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" min={1} max={10} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Next Number</label>
                      <input type="number" value={numberingForm.nextNumber} onChange={e => setNumberingForm({ ...numberingForm, nextNumber: parseInt(e.target.value) || 1 })}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" min={1} />
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={saveNumbering} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"><Save className="w-3 h-3 inline mr-1" />Save</button>
                      <button onClick={() => { setEditingNumbering(null); setNumberingForm(null); }} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm font-medium text-gray-900 min-w-[140px]">{cfg.module}</span>
                      <span className="font-mono text-xs bg-white border border-gray-200 px-2 py-1 rounded text-gray-700">
                        {cfg.prefix}{cfg.separator}{String(cfg.nextNumber).padStart(cfg.padLength, "0")}
                      </span>
                      <span className="text-xs text-gray-400">Next: <strong>{cfg.nextNumber}</strong> · Pad: <strong>{cfg.padLength}</strong></span>
                      <span className="text-xs text-gray-400 ml-2">{cfg.description}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openNumberingEdit(cfg)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Edit className="w-3.5 h-3.5" /></button>
                      {!cfg.module.startsWith("Task") && !cfg.module.startsWith("MyTask") && !cfg.module.startsWith("Role") && (
                        <button onClick={() => removeConfig(cfg.module)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete entry"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                      <button onClick={() => resetConfig(cfg.module)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Reset to default"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <button onClick={() => setShowAddForm(!showAddForm)} className="mt-4 flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Add Numbering Entry
          </button>

          {showAddForm && (
            <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex-1">
                <div className="grid grid-cols-6 gap-3 items-end mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Module</label>
                    <input value={addForm.module} onChange={e => setAddForm({ ...addForm, module: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Prefix</label>
                    <input value={addForm.prefix} onChange={e => setAddForm({ ...addForm, prefix: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Separator</label>
                    <input value={addForm.separator} onChange={e => setAddForm({ ...addForm, separator: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" maxLength={2} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Pad Length</label>
                    <input type="number" value={addForm.padLength} onChange={e => setAddForm({ ...addForm, padLength: parseInt(e.target.value) || 1 })}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" min={1} max={10} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Next Number</label>
                    <input type="number" value={addForm.nextNumber} onChange={e => setAddForm({ ...addForm, nextNumber: parseInt(e.target.value) || 1 })}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" min={1} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={saveAddNumbering} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"><Plus className="w-3 h-3 inline mr-1" />Add</button>
                    <button onClick={() => { setShowAddForm(false); setAddForm(emptyForm); }} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Description</label>
                  <input value={addForm.description} onChange={e => setAddForm({ ...addForm, description: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
