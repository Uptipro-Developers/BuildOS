import {
  Save,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Info,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NumberingConfigPanel } from "../../components/NumberingConfigPanel";

/**
 * Every application that owns numbering sequences. Admin is the one place all of
 * them are visible, so each gets its own panel rather than one undifferentiated
 * list.
 */
const NUMBERING_APPS = [
  { key: "shared", label: "Shared" },
  { key: "admin", label: "Admin" },
  { key: "construction", label: "Construction" },
  { key: "finance", label: "Finance" },
  { key: "hr", label: "HR" },
  { key: "procurement", label: "Procurement" },
  { key: "storefront", label: "Storefront" },
  { key: "ess", label: "ESS" },
] as const;

/** Shapes the edit forms work with; the lists themselves come back untyped. */
interface AccountRow {
  id: string;
  name: string;
  code: string;
  type: string;
}
interface TaxRow {
  id: string;
  name: string;
  rate: number;
}
interface MethodRow {
  id: string;
  name: string;
}
import { apiFetch } from "../../api/client";
import { toast } from "sonner";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import {
  getChartAccounts,
  getTaxConfigs,
  createChartAccount,
  updateChartAccount,
  deleteChartAccount,
  createTaxConfig,
  updateTaxConfig,
  deleteTaxConfig,
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
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
  const [chartOfAccounts, setChartOfAccounts] = useState<any[]>(
    DEFAULT_CHART_OF_ACCOUNTS,
  );

  const [taxSettings, setTaxSettings] = useState<any[]>(DEFAULT_TAX_SETTINGS);

  const [paymentMethods, setPaymentMethods] = useState<any[]>(
    DEFAULT_PAYMENT_METHODS,
  );

  // ── Modal state ──
  // These three entities were all edited through chains of window.prompt: one
  // browser dialog per field, no validation, no cancel, and errors surfaced with
  // window.alert. Replaced with real forms, a confirmation for deletes, and toasts.
  const [accountForm, setAccountForm] = useState<AccountRow | null>(null);
  const [taxForm, setTaxForm] = useState<TaxRow | null>(null);
  const [methodForm, setMethodForm] = useState<MethodRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: "account" | "tax" | "method"; id: string; name: string } | null
  >(null);
  const [busy, setBusy] = useState(false);

  const saveAccount = async () => {
    if (!accountForm) return;
    const { id, name, code, type } = accountForm;
    setBusy(true);
    try {
      if (id) {
        await updateChartAccount(id, { name, code, type });
        setChartOfAccounts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, name, code, type } : a)),
        );
        toast.success(`Account "${name}" updated.`);
      } else {
        const created = await createChartAccount({ name, code, type });
        setChartOfAccounts((prev) => [
          ...prev,
          {
            id: created.id,
            name: created.name,
            code: created.code,
            type: created.type,
            parent: null,
          },
        ]);
        toast.success(`Account "${name}" created.`);
      }
      setAccountForm(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save the account.",
      );
    } finally {
      setBusy(false);
    }
  };

  const saveTaxRate = async () => {
    if (!taxForm) return;
    const { id, name, rate } = taxForm;
    setBusy(true);
    try {
      if (id) {
        await updateTaxConfig(id, { name, rate });
        setTaxSettings((prev) =>
          prev.map((t) => (t.id === id ? { ...t, name, rate } : t)),
        );
        toast.success(`Tax rate "${name}" updated.`);
      } else {
        const created = await createTaxConfig({
          name,
          rate,
          type: "General",
          isActive: true,
        });
        setTaxSettings((prev) => [
          ...prev,
          {
            id: created.id,
            name: created.name,
            rate: created.rate,
            default: prev.length === 0,
          },
        ]);
        toast.success(`Tax rate "${name}" added.`);
      }
      setTaxForm(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save the tax rate.",
      );
    } finally {
      setBusy(false);
    }
  };

  const savePaymentMethod = async () => {
    if (!methodForm) return;
    const { id, name } = methodForm;
    setBusy(true);
    try {
      if (id) {
        await updatePaymentMethod(id, { name });
        setPaymentMethods((prev) =>
          prev.map((m) => (m.id === id ? { ...m, name } : m)),
        );
        toast.success(`Payment method "${name}" updated.`);
      } else {
        const created = await createPaymentMethod({ name });
        setPaymentMethods((prev) => [...prev, created]);
        toast.success(`Payment method "${name}" added.`);
      }
      setMethodForm(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save the payment method.",
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { kind, id, name } = deleteTarget;
    setBusy(true);
    try {
      if (kind === "account") {
        await deleteChartAccount(id);
        setChartOfAccounts((prev) => prev.filter((a) => a.id !== id));
      } else if (kind === "tax") {
        await deleteTaxConfig(id);
        setTaxSettings((prev) => prev.filter((t) => t.id !== id));
      } else {
        await deletePaymentMethod(id);
        setPaymentMethods((prev) => prev.filter((m) => m.id !== id));
      }
      toast.success(`"${name}" deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to delete "${name}".`,
      );
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    Promise.all([getChartAccounts(), getTaxConfigs(), getPaymentMethods()])
      .then(([accounts, taxes, methods]) => {
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

        if (methods.length > 0) {
          setPaymentMethods(methods);
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
      // A mutation, not a load: the toggle silently did nothing on failure and
      // the switch stayed where the user left it, implying it had taken effect.
      .catch((err) =>
        toast.error(
          err instanceof Error
            ? err.message
            : "Could not change the payment method.",
        ),
      );
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
        {/* There is nothing left for a "Save All" to do: accounts, tax rates
            and payment methods are each written by their own form as they are
            edited. The button used to POST all three lists into a settings blob
            no code reads, with no success or failure feedback either way. */}
        <p className="flex items-center gap-2 text-xs text-gray-400">
          <Save className="w-3.5 h-3.5" />
          Changes are saved as you make them.
        </p>
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
            onClick={() =>
              setAccountForm({ id: "", name: "", code: "", type: "Asset" })
            }
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
                    onClick={() =>
                      setAccountForm({
                        id: account.id,
                        name: account.name,
                        code: account.code,
                        type: account.type,
                      })
                    }
                    className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() =>
                      setDeleteTarget({
                        kind: "account",
                        id: account.id,
                        name: account.name,
                      })
                    }
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
            onClick={() => setTaxForm({ id: "", name: "", rate: 7.5 })}
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
                  onClick={() =>
                    setTaxForm({ id: tax.id, name: tax.name, rate: tax.rate })
                  }
                  className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    setDeleteTarget({ kind: "tax", id: tax.id, name: tax.name })
                  }
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
            onClick={() => setMethodForm({ id: "", name: "" })}
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
                  onClick={() => setMethodForm({ id: method.id, name: method.name })}
                  className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    setDeleteTarget({
                      kind: "method",
                      id: method.id,
                      name: method.name,
                    })
                  }
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Module numbering — the admin-wide view, one panel per application.

          This was a hand-rolled copy of the panel bound to the local numbering
          store, rendering `configs` with no filter at all: every app's
          sequences in one flat list with nothing saying which app a row
          belonged to. The shared panel is the same component the per-module
          settings pages use and persists to the server, so the two cannot
          drift apart. */}
      <div className="space-y-6">
        {NUMBERING_APPS.map((app) => (
          <div key={app.key}>
            <h2 className="text-sm font-semibold text-gray-900 mb-2 capitalize">
              {app.label}
            </h2>
            <NumberingConfigPanel app={app.key} accent="indigo" />
          </div>
        ))}
      </div>

      {/* ── Chart of accounts form ── */}
      {accountForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">
                {accountForm.id ? "Edit Account" : "Add Account"}
              </h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={accountForm.name}
                  onChange={(e) =>
                    setAccountForm((prev) =>
                      prev ? { ...prev, name: e.target.value } : prev,
                    )
                  }
                  placeholder="Accounts Receivable"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Account Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={accountForm.code}
                    onChange={(e) =>
                      setAccountForm((prev) =>
                        prev ? { ...prev, code: e.target.value } : prev,
                      )
                    }
                    placeholder="1200"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Account Type
                  </label>
                  {/* A select rather than free text: the old prompt accepted any
                      string, so a typo created an account with an invalid type. */}
                  <select
                    value={accountForm.type}
                    onChange={(e) =>
                      setAccountForm((prev) =>
                        prev ? { ...prev, type: e.target.value } : prev,
                      )
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {["Asset", "Liability", "Equity", "Revenue", "Expense"].map(
                      (t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                onClick={() => setAccountForm(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void saveAccount()}
                disabled={
                  busy || !accountForm.name.trim() || !accountForm.code.trim()
                }
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? "Saving…" : accountForm.id ? "Save Changes" : "Add Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tax rate form ── */}
      {taxForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">
                {taxForm.id ? "Edit Tax Rate" : "Add Tax Rate"}
              </h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Tax Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={taxForm.name}
                  onChange={(e) =>
                    setTaxForm((prev) =>
                      prev ? { ...prev, name: e.target.value } : prev,
                    )
                  }
                  placeholder="VAT"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Rate (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={taxForm.rate}
                  onChange={(e) =>
                    setTaxForm((prev) =>
                      prev ? { ...prev, rate: Number(e.target.value) } : prev,
                    )
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                onClick={() => setTaxForm(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveTaxRate}
                disabled={
                  !taxForm.name.trim() ||
                  !Number.isFinite(taxForm.rate) ||
                  taxForm.rate < 0
                }
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                {taxForm.id ? "Save Changes" : "Add Tax Rate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment method form ── */}
      {methodForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">
                {methodForm.id ? "Edit Payment Method" : "Add Payment Method"}
              </h2>
            </div>
            <div className="px-6 py-5">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Method Name <span className="text-red-500">*</span>
              </label>
              <input
                value={methodForm.name}
                onChange={(e) =>
                  setMethodForm((prev) =>
                    prev ? { ...prev, name: e.target.value } : prev,
                  )
                }
                placeholder="Bank Transfer"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                onClick={() => setMethodForm(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={savePaymentMethod}
                disabled={!methodForm.name.trim()}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                {methodForm.id ? "Save Changes" : "Add Method"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title={
          deleteTarget?.kind === "account"
            ? "Delete account"
            : deleteTarget?.kind === "tax"
              ? "Delete tax rate"
              : "Delete payment method"
        }
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will be permanently removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        isDangerous
        isLoading={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
