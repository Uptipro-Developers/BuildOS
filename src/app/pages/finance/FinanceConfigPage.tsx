import { useState, useEffect } from "react";
import { toast } from "sonner";
import { formatCurrencyByGeneralSettings } from "../../utils/generalSettings";
import { getBankAccounts, getTaxConfigs } from "../../api/finance-extras";
import { createAccrualType, updateAccrualType, deleteAccrualType } from "../../api/accruals";
import { apiFetch } from "../../api/client";
import { Save, Plus, Edit, Trash2, Settings2, Info, CreditCard, Building2, X, CheckCircle, Percent, Palette, Download, Hash } from "lucide-react";
import { useFinance } from "../../stores/financeStore";
import { useNumbering, type ModuleNumbering } from "../../stores/numberingStore";
import { useChangelog } from "../../stores/changelogStore";
import { DataTable, type Column } from "../../components/DataTable";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { exportCSV } from "../../utils/exportCSV";
import type { AccrualTypeConfig } from "./types";

interface BankAccount {
  id: string;
  name: string;
  bank: string;
  accountNumber: string;
  currency: string;
  balance: number;
  isDefault: boolean;
}

interface PaymentMethod {
  id: string;
  name: string;
  enabled: boolean;
}

type TaxType = "VAT" | "WHT" | "PAYE" | "Custom";

interface TaxEntry {
  id: string;
  name: string;
  type: TaxType;
  rate: number;
  glCode: string;
  appliesTo: string;
  enabled: boolean;
}

const CURRENCIES = ["USD", "NGN", "GBP", "EUR", "GHS", "ZAR"];
const FISCAL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * The page owns four unrelated delete actions, so one pending target carries a
 * discriminator instead of four separate pieces of state.
 */
type ConfigDeleteTarget =
  | { kind: "tax"; id: string; name: string }
  | { kind: "accrualType"; id: string; name: string }
  | { kind: "bank"; id: string; name: string }
  | { kind: "numbering"; id: string; name: string };

const DELETE_TITLES: Record<ConfigDeleteTarget["kind"], string> = {
  tax: "Delete Tax Rule?",
  accrualType: "Delete Accrual Type?",
  bank: "Delete Bank Account?",
  numbering: "Remove Numbering Entry?",
};

const DELETE_SUBJECTS: Record<ConfigDeleteTarget["kind"], string> = {
  tax: "tax rule",
  accrualType: "accrual type",
  bank: "bank account",
  numbering: "numbering configuration for",
};

const typeColors: Record<TaxType, string> = {
  VAT: "bg-blue-100 text-blue-700",
  WHT: "bg-purple-100 text-purple-700",
  PAYE: "bg-amber-100 text-amber-700",
  Custom: "bg-gray-100 text-gray-600",
};

export function FinanceConfigPage() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [saved, setSaved] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConfigDeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { configs, updateConfig, addConfig, removeConfig } = useNumbering();
  const [editingNumbering, setEditingNumbering] = useState<string | null>(null);
  const [numberingForm, setNumberingForm] = useState<ModuleNumbering | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<ModuleNumbering>({ module: "", prefix: "", separator: "-", padLength: 4, nextNumber: 1, description: "" });

  // General settings state
  const [currency, setCurrency] = useState("USD");
  const [fiscalYearStart, setFiscalYearStart] = useState("January");
  const [approvalThreshold, setApprovalThreshold] = useState("100000");

  // Bank account modal
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankForm, setBankForm] = useState({
    name: "",
    bank: "",
    accountNumber: "",
    currency: "USD",
    balance: "",
  });

  useEffect(() => {
    getBankAccounts()
      .then((data) =>
        setBankAccounts(
          data.map((a) => ({
            id: a.id,
            name: a.accountName,
            bank: a.bankName,
            accountNumber: a.accountNumber,
            currency: a.currency,
            balance: a.balance ?? 0,
            isDefault: a.isDefault ?? false,
          })),
        ),
      )
      .catch(console.error);
    getTaxConfigs()
      .then((data) =>
        setTaxEntries(
          data.map((t) => ({
            id: t.id,
            name: t.name,
            type: (t.type as TaxType) ?? "Custom",
            rate: t.rate,
            glCode: t.code ?? "",
            appliesTo: t.description ?? "",
            enabled: t.isActive ?? true,
          })),
        ),
      )
      .catch(console.error);
    apiFetch<any>("/config")
      .then((cfg) => {
        if (cfg?.currency) setCurrency(cfg.currency);
        if (cfg?.fiscalYearStart) setFiscalYearStart(cfg.fiscalYearStart);
        if (cfg?.approvalThreshold !== undefined && cfg?.approvalThreshold !== null)
          setApprovalThreshold(String(cfg.approvalThreshold));
      })
      .catch(() => {});
  }, []);

  // Tax state
  const [taxEntries, setTaxEntries] = useState<TaxEntry[]>([]);
  const [companyTIN, setCompanyTIN] = useState("12345678-0001");
  const [vatRegNumber, setVatRegNumber] = useState("VAT-NG-00987654");
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [taxEditId, setTaxEditId] = useState<string | null>(null);
  const [taxForm, setTaxForm] = useState<{
    name: string;
    type: TaxType;
    rate: string;
    glCode: string;
    appliesTo: string;
  }>({
    name: "",
    type: "VAT",
    rate: "",
    glCode: "",
    appliesTo: "",
  });

  const fmt = (n: number) =>
    formatCurrencyByGeneralSettings(n, { minimumFractionDigits: 0 });

  function saveAll() {
    apiFetch("/config", {
      method: "POST",
      body: JSON.stringify({
        currency,
        fiscalYearStart,
        approvalThreshold: parseFloat(approvalThreshold),
      }),
    }).then(() => {
      setSaved(true);
      logChange({ module: "Finance", action: "Updated", entityType: "FinanceConfig", entityId: "global", summary: "Finance configuration saved (payment methods, bank accounts, tax entries)", performedBy: "Sola Adeleke" });
      setTimeout(() => setSaved(false), 2500);
    })
      // The button's "Saved!" state covers the success case, so only the
      // failure needs a toast.
      .catch((err) => {
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to save finance configuration.",
        );
        console.error(err);
      });
  }

  function openNumberingEdit(cfg: ModuleNumbering) {
    setEditingNumbering(cfg.module);
    setNumberingForm({ ...cfg });
  }

  function saveNumbering() {
    if (numberingForm) {
      updateConfig(numberingForm.module, numberingForm);
      setEditingNumbering(null);
      setNumberingForm(null);
      toast.success(`Numbering for ${numberingForm.module} updated.`);
    }
  }

  function toggleMethod(id: string) {
    setPaymentMethods((prev) => prev.map((m) => m.id === id ? { ...m, enabled: !m.enabled } : m));
    const method = paymentMethods.find(m => m.id === id);
    if (method) {
      logChange({ module: "Finance", action: method.enabled ? "Disabled" : "Enabled", entityType: "PaymentMethod", entityId: id, summary: `Payment method "${method.name}" ${method.enabled ? "disabled" : "enabled"}`, performedBy: "Sola Adeleke" });
      toast.success(`${method.name} ${method.enabled ? "disabled" : "enabled"}.`);
    }
  }

  function addBankAccount() {
    if (
      !bankForm.name.trim() ||
      !bankForm.bank.trim() ||
      !bankForm.accountNumber.trim()
    ) {
      return;
    }
    const acc: BankAccount = {
      id: `b${Date.now()}`,
      name: bankForm.name,
      bank: bankForm.bank,
      accountNumber: bankForm.accountNumber,
      currency: bankForm.currency,
      balance: parseFloat(bankForm.balance || "0"),
      isDefault: bankAccounts.length === 0,
    };
    apiFetch("/bank-accounts", {
      method: "POST",
      body: JSON.stringify({
        accountName: bankForm.name,
        bankName: bankForm.bank,
        accountNumber: bankForm.accountNumber,
        currency: bankForm.currency,
        balance: parseFloat(bankForm.balance || "0"),
        isDefault: bankAccounts.length === 0,
      }),
    })
      .then(() => {
        setBankAccounts([...bankAccounts, acc]);
        logChange({ module: "Finance", action: "Created", entityType: "BankAccount", entityId: acc.id, summary: `Bank account "${acc.name}" (${acc.bank}) added`, performedBy: "Sola Adeleke" });
        setShowBankModal(false);
        setBankForm({ name: "", bank: "", accountNumber: "", currency: "USD", balance: "" });
        toast.success(`Bank account "${acc.name}" added.`);
      })
      .catch((err) => {
        toast.error(
          err instanceof Error ? err.message : "Failed to add bank account.",
        );
        console.error(err);
      });
  }

  function setDefault(id: string) {
    setBankAccounts((prev) => prev.map((b) => ({ ...b, isDefault: b.id === id })));
    const acc = bankAccounts.find(b => b.id === id);
    if (acc) {
      logChange({ module: "Finance", action: "Set as Default", entityType: "BankAccount", entityId: id, summary: `Bank account "${acc.name}" set as default`, performedBy: "Sola Adeleke" });
      toast.success(`"${acc.name}" set as default account.`);
    }
  }

  function toggleTax(id: string) {
    setTaxEntries((prev) => prev.map((t) => t.id === id ? { ...t, enabled: !t.enabled } : t));
    const tax = taxEntries.find(t => t.id === id);
    if (tax) {
      logChange({ module: "Finance", action: tax.enabled ? "Disabled" : "Enabled", entityType: "TaxRule", entityId: id, summary: `Tax rule "${tax.name}" ${tax.enabled ? "disabled" : "enabled"}`, performedBy: "Sola Adeleke" });
      toast.success(`Tax rule "${tax.name}" ${tax.enabled ? "disabled" : "enabled"}.`);
    }
  }

  function openTaxEdit(t: TaxEntry) {
    setTaxForm({
      name: t.name,
      type: t.type,
      rate: String(t.rate),
      glCode: t.glCode,
      appliesTo: t.appliesTo,
    });
    setTaxEditId(t.id);
    setShowTaxModal(true);
  }

  function openTaxCreate() {
    setTaxForm({ name: "", type: "VAT", rate: "", glCode: "", appliesTo: "" });
    setTaxEditId(null);
    setShowTaxModal(true);
  }

  function saveTax() {
    if (!taxForm.name.trim()) return;
    const entry = {
      ...taxForm,
      rate: parseFloat(taxForm.rate || "0"),
      enabled: true,
    };
    if (taxEditId) {
      apiFetch(`/tax-configs/${taxEditId}`, {
        method: "PATCH",
        body: JSON.stringify(entry),
      })
        .then(() => {
          setTaxEntries((prev) =>
            prev.map((t) => (t.id === taxEditId ? { ...t, ...entry } : t)),
          );
          logChange({ module: "Finance", action: "Updated", entityType: "TaxRule", entityId: taxEditId, summary: `Tax rule "${entry.name}" updated`, performedBy: "Sola Adeleke" });
          setShowTaxModal(false);
          toast.success(`Tax rule "${entry.name}" updated.`);
        })
        .catch((err) => {
          toast.error(
            err instanceof Error ? err.message : "Failed to update tax rule.",
          );
          console.error(err);
        });
    } else {
      apiFetch("/tax-configs", {
        method: "POST",
        body: JSON.stringify(entry),
      })
        .then(() => {
          const taxId = `t${Date.now()}`;
          setTaxEntries((prev) => [...prev, { id: taxId, ...entry }]);
          logChange({ module: "Finance", action: "Created", entityType: "TaxRule", entityId: taxId, summary: `Tax rule "${entry.name}" created`, performedBy: "Sola Adeleke" });
          setShowTaxModal(false);
          toast.success(`Tax rule "${entry.name}" created.`);
        })
        .catch((err) => {
          toast.error(
            err instanceof Error ? err.message : "Failed to create tax rule.",
          );
          console.error(err);
        });
    }
  }

  function handleTaxExport() {
    exportCSV("tax-rules", ["Tax Name", "Type", "Rate", "GL Code", "Applies To", "Active"], taxEntries.map(t => [t.name, t.type, t.type === "PAYE" ? "Variable" : t.rate + "%", t.glCode, t.appliesTo, t.enabled ? "Yes" : "No"]));
    toast.success(`Exported ${taxEntries.length} tax rules.`);
  }

  const taxColumns: Column<TaxEntry>[] = [
    { key: "name", label: "Tax Name", sortable: true, filterable: true, render: t => <span className="text-sm font-medium text-gray-900">{t.name}</span> },
    { key: "type", label: "Type", sortable: true, filterable: true, render: t => <span className={`px-2 py-0.5 rounded text-xs font-semibold ${typeColors[t.type]}`}>{t.type}</span> },
    { key: "rate", label: "Rate", sortable: true, render: t =>
      t.type === "PAYE" ? <span className="text-xs text-gray-400 italic">Variable</span> : <span className="text-sm font-medium text-gray-900">{t.rate}%</span>
    },
    { key: "glCode", label: "GL Code", sortable: true, filterable: true, render: t => <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t.glCode}</span> },
    { key: "appliesTo", label: "Applies To", sortable: true, filterable: true, render: t => <span className="text-sm text-gray-500">{t.appliesTo}</span> },
    { key: "active", label: "Active", className: "text-center", render: t =>
      <button onClick={() => toggleTax(t.id)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${t.enabled ? "bg-emerald-500" : "bg-gray-200"}`}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${t.enabled ? "translate-x-4.5" : "translate-x-1"}`} />
      </button>
    },
    { key: "actions", label: "Actions", className: "text-right", render: t =>
      <div className="flex items-center justify-end gap-1">
        <button onClick={() => openTaxEdit(t)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Edit className="w-3.5 h-3.5" /></button>
        <button onClick={() => setDeleteTarget({ kind: "tax", id: t.id, name: t.name })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    },
  ];

  // ── Accrual Type Config ──────────────────────────────────────────────────
  const { accrualTypeConfigs, setAccrualTypeConfigs } = useFinance();
  const { logChange } = useChangelog();

  const [showAccrualTypeModal, setShowAccrualTypeModal] = useState(false);
  const [accrualTypeEditId, setAccrualTypeEditId] = useState<string | null>(null);
  const [accrualTypeForm, setAccrualTypeForm] = useState({
    type: "", label: "", color: "bg-blue-100 text-blue-700", description: "",
  });

  function openAccrualTypeCreate() {
    setAccrualTypeForm({ type: "", label: "", color: "bg-blue-100 text-blue-700", description: "" });
    setAccrualTypeEditId(null);
    setShowAccrualTypeModal(true);
  }

  function openAccrualTypeEdit(tc: AccrualTypeConfig) {
    setAccrualTypeForm({ type: tc.type, label: tc.label, color: tc.color, description: tc.description });
    setAccrualTypeEditId(tc.id);
    setShowAccrualTypeModal(true);
  }

  function saveAccrualType() {
    if (!accrualTypeForm.type.trim() || !accrualTypeForm.label.trim()) return;
    if (accrualTypeEditId) {
      const editId = accrualTypeEditId;
      updateAccrualType(editId, accrualTypeForm)
        .then((updated) => {
          setAccrualTypeConfigs(prev => prev.map(tc => tc.id === editId ? updated : tc));
          logChange({ module: "Finance", action: "Updated", entityType: "AccrualTypeConfig", entityId: editId, summary: `Accrual type "${updated.label}" updated`, performedBy: "Sola Adeleke" });
          setShowAccrualTypeModal(false);
          toast.success(`Accrual type "${updated.label}" updated.`);
        })
        .catch((err) => {
          toast.error(
            err instanceof Error ? err.message : "Failed to update accrual type.",
          );
          console.error(err);
        });
    } else {
      createAccrualType(accrualTypeForm)
        .then((created) => {
          setAccrualTypeConfigs(prev => [...prev, created]);
          logChange({ module: "Finance", action: "Created", entityType: "AccrualTypeConfig", entityId: created.id, summary: `Accrual type "${created.label}" created`, performedBy: "Sola Adeleke" });
          setShowAccrualTypeModal(false);
          toast.success(`Accrual type "${created.label}" created.`);
        })
        .catch((err) => {
          toast.error(
            err instanceof Error ? err.message : "Failed to create accrual type.",
          );
          console.error(err);
        });
    }
  }

  function confirmDelete() {
    const target = deleteTarget;
    if (!target) return;
    switch (target.kind) {
      case "tax":
        setTaxEntries((prev) => prev.filter((x) => x.id !== target.id));
        logChange({ module: "Finance", action: "Deleted", entityType: "TaxRule", entityId: target.id, summary: `Tax rule "${target.name}" deleted`, performedBy: "Sola Adeleke" });
        setDeleteTarget(null);
        toast.success(`Tax rule "${target.name}" deleted.`);
        return;
      case "bank":
        setBankAccounts((prev) => prev.filter((x) => x.id !== target.id));
        logChange({ module: "Finance", action: "Deleted", entityType: "BankAccount", entityId: target.id, summary: `Bank account "${target.name}" deleted`, performedBy: "Sola Adeleke" });
        setDeleteTarget(null);
        toast.success(`Bank account "${target.name}" deleted.`);
        return;
      case "numbering":
        removeConfig(target.id);
        setDeleteTarget(null);
        toast.success(`Numbering for ${target.name} removed.`);
        return;
      case "accrualType":
        // Server-backed, so the modal stays open (spinning) until it resolves.
        setDeleting(true);
        deleteAccrualType(target.id)
          .then(() => {
            setAccrualTypeConfigs(prev => prev.filter(x => x.id !== target.id));
            logChange({ module: "Finance", action: "Deleted", entityType: "AccrualTypeConfig", entityId: target.id, summary: `Accrual type "${target.name}" deleted`, performedBy: "Sola Adeleke" });
            setDeleteTarget(null);
            toast.success(`Accrual type "${target.name}" deleted.`);
          })
          .catch((err) => {
            toast.error(
              err instanceof Error ? err.message : "Failed to delete accrual type.",
            );
            console.error(err);
          })
          .finally(() => setDeleting(false));
        return;
    }
  }

  function handleAccrualTypeExport() {
    exportCSV("accrual-types", ["Type Key", "Display Label", "Color", "Description"], accrualTypeConfigs.map(tc => [tc.type, tc.label, tc.color, tc.description || ""]));
    toast.success(`Exported ${accrualTypeConfigs.length} accrual types.`);
  }

  const accrualTypeColumns: Column<AccrualTypeConfig>[] = [
    { key: "type", label: "Type Key", sortable: true, filterable: true, render: tc => <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{tc.type}</span> },
    { key: "label", label: "Display Label", sortable: true, filterable: true, render: tc => <span className="text-sm font-medium text-gray-900">{tc.label}</span> },
    { key: "color", label: "Color", render: tc => <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${tc.color}`}>{tc.type}</span> },
    { key: "description", label: "Description", sortable: true, filterable: true, render: tc => <span className="text-sm text-gray-500 max-w-xs truncate">{tc.description || "—"}</span> },
    { key: "actions", label: "Actions", className: "text-right", render: tc =>
      <div className="flex items-center justify-end gap-1">
        <button onClick={() => openAccrualTypeEdit(tc)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Edit className="w-3.5 h-3.5" /></button>
        <button onClick={() => setDeleteTarget({ kind: "accrualType", id: tc.id, name: tc.label })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    },
  ];

  const ACCRUAL_TYPE_COLORS = [
    "bg-blue-100 text-blue-700", "bg-amber-100 text-amber-700", "bg-purple-100 text-purple-700",
    "bg-emerald-100 text-emerald-700", "bg-orange-100 text-orange-700", "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700", "bg-indigo-100 text-indigo-700", "bg-teal-100 text-teal-700",
    "bg-pink-100 text-pink-700",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Finance Configuration
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure financial settings, bank accounts, payment methods, and
            tax rules
          </p>
        </div>
        <button
          onClick={saveAll}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${saved ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
        >
          {saved ? (
            <>
              <CheckCircle className="w-4 h-4" /> Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Save All
            </>
          )}
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
        <Info className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
        <p className="text-sm text-emerald-800">
          These settings control the core behaviour of the Finance module.
          Changes affect all financial workflows, approvals, and reporting.
        </p>
      </div>

      {/* General Setup */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">General Setup</h2>
        </div>
        <div className="px-5 py-4 grid grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Default Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Financial Year Start
            </label>
            <select
              value={fiscalYearStart}
              onChange={(e) => setFiscalYearStart(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {FISCAL_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Approval Threshold (USD)
            </label>
            <input
              value={approvalThreshold}
              onChange={(e) => setApprovalThreshold(e.target.value)}
              placeholder="e.g. 100000"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Expenses above this amount require manager approval
            </p>
          </div>
        </div>
      </div>

      {/* Bank Accounts */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">
              Bank Accounts
            </h2>
          </div>
          <button
            onClick={() => setShowBankModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Plus className="w-3.5 h-3.5" /> Add Account
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {bankAccounts.map((b) => (
            <div
              key={b.id}
              className="px-5 py-3 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">
                      {b.name}
                    </p>
                    {b.isDefault && (
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded font-medium">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {b.bank} · {b.accountNumber} · {b.currency}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-gray-900">
                  {fmt(b.balance)}
                </p>
                {!b.isDefault && (
                  <button
                    onClick={() => setDefault(b.id)}
                    className="text-xs text-emerald-600 hover:underline"
                  >
                    Set default
                  </button>
                )}
                <button onClick={() => setDeleteTarget({ kind: "bank", id: b.id, name: b.name })} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">
            Payment Methods
          </h2>
        </div>
        <div className="divide-y divide-gray-50">
          {paymentMethods.map((m) => (
            <div
              key={m.id}
              className="px-5 py-3 flex items-center justify-between hover:bg-gray-50"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{m.name}</p>
              </div>
              <button
                onClick={() => toggleMethod(m.id)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${m.enabled ? "bg-emerald-500" : "bg-gray-200"}`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${m.enabled ? "translate-x-4.5" : "translate-x-1"}`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Tax Setup */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Tax Setup</h2>
          </div>
          <button
            onClick={openTaxCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Plus className="w-3.5 h-3.5" /> Add Tax Rule
          </button>
        </div>

        {/* Company Tax IDs */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Company Tax Identification
          </p>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Company TIN
              </label>
              <input
                value={companyTIN}
                onChange={(e) => setCompanyTIN(e.target.value)}
                placeholder="e.g. 12345678-0001"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                VAT Registration Number
              </label>
              <input
                value={vatRegNumber}
                onChange={(e) => setVatRegNumber(e.target.value)}
                placeholder="e.g. VAT-NG-00987654"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Tax Rules Table */}
        <DataTable columns={taxColumns} data={taxEntries} keyExtractor={t => t.id}
          searchPlaceholder="Search tax rules..."
          searchFields={[t => t.name, t => t.type, t => t.glCode, t => t.appliesTo]}
          emptyMessage="No tax rules found"
          headerExtra={<button onClick={handleTaxExport} className="flex items-center gap-2 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"><Download className="w-3.5 h-3.5" /> Export</button>}
        />
      </div>

      {/* Accrual Types */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Accrual Types</h2>
          </div>
          <button onClick={openAccrualTypeCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <Plus className="w-3.5 h-3.5" /> Add Accrual Type
          </button>
        </div>
        <DataTable columns={accrualTypeColumns} data={accrualTypeConfigs} keyExtractor={tc => tc.id}
          searchPlaceholder="Search accrual types..."
          searchFields={[tc => tc.type, tc => tc.label, tc => tc.description || ""]}
          emptyMessage="No accrual types found"
          headerExtra={<button onClick={handleAccrualTypeExport} className="flex items-center gap-2 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"><Download className="w-3.5 h-3.5" /> Export</button>}
        />
      </div>

      {/* Module Numbering System */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Hash className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Module Numbering System</h2>
        </div>
        <div className="p-5">
          <p className="text-xs text-gray-500 mb-4">Configure the auto-numbering format for records across Finance modules. The system uses these patterns when generating new IDs.</p>
          <div className="space-y-3">
            {configs.filter(cfg => cfg.module.startsWith("Finance")).map(cfg => (
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
                      <button onClick={() => setDeleteTarget({ kind: "numbering", id: cfg.module, name: cfg.module })} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Remove entry"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </>
                )}
              </div>
            ))}
            </div>
            {showAddForm ? (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="grid grid-cols-6 gap-3 items-end">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Module Name</label>
                    <input value={addForm.module} onChange={e => setAddForm({ ...addForm, module: e.target.value })}
                      placeholder="e.g. FinanceFiscalYear" className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    <p className="text-[10px] text-gray-400 mt-0.5">Must start with "Finance"</p>
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
                    <button onClick={() => { addConfig(addForm); toast.success(`Numbering for ${addForm.module} added.`); setAddForm({ module: "", prefix: "", separator: "-", padLength: 4, nextNumber: 1, description: "" }); setShowAddForm(false); }} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"><Save className="w-3 h-3 inline mr-1" />Save</button>
                    <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-xs text-gray-500 mb-1">Description</label>
                  <input value={addForm.description} onChange={e => setAddForm({ ...addForm, description: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddForm(true)} className="mt-4 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                <Plus className="w-3.5 h-3.5" /> Add Numbering Entry
              </button>
            )}
          </div>
        </div>

      {/* Bank Account Modal */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                Add Bank Account
              </h2>
              <button
                onClick={() => setShowBankModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Account Name *
                </label>
                <input
                  value={bankForm.name}
                  onChange={(e) =>
                    setBankForm({ ...bankForm, name: e.target.value })
                  }
                  placeholder="e.g. Primary Operations Account"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Bank Name *
                  </label>
                  <input
                    value={bankForm.bank}
                    onChange={(e) =>
                      setBankForm({ ...bankForm, bank: e.target.value })
                    }
                    placeholder="e.g. GTBank"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Account Number *
                  </label>
                  <input
                    value={bankForm.accountNumber}
                    onChange={(e) =>
                      setBankForm({
                        ...bankForm,
                        accountNumber: e.target.value,
                      })
                    }
                    placeholder="e.g. ****8821"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Currency
                  </label>
                  <select
                    value={bankForm.currency}
                    onChange={(e) =>
                      setBankForm({ ...bankForm, currency: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Opening Balance
                  </label>
                  <input
                    value={bankForm.balance}
                    onChange={(e) =>
                      setBankForm({ ...bankForm, balance: e.target.value })
                    }
                    placeholder="e.g. 1000000"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setShowBankModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addBankAccount}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Add Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accrual Type Config Modal */}
      {showAccrualTypeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">{accrualTypeEditId ? "Edit Accrual Type" : "New Accrual Type"}</h2>
              <button onClick={() => setShowAccrualTypeModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Type Key *</label>
                  <input value={accrualTypeForm.type} onChange={e => setAccrualTypeForm({ ...accrualTypeForm, type: e.target.value })} placeholder="e.g. goods-received-not-invoiced" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" disabled={!!accrualTypeEditId} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Display Label *</label>
                  <input value={accrualTypeForm.label} onChange={e => setAccrualTypeForm({ ...accrualTypeForm, label: e.target.value })} placeholder="e.g. Goods Received Not Invoiced" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Color</label>
                <div className="flex flex-wrap gap-2">
                  {ACCRUAL_TYPE_COLORS.map(c => (
                    <button key={c} onClick={() => setAccrualTypeForm({ ...accrualTypeForm, color: c })}
                      className={`w-7 h-7 rounded-full ${c.replace("text-", "text-white ")} ${accrualTypeForm.color === c ? "ring-2 ring-offset-2 ring-emerald-500" : ""}`} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea value={accrualTypeForm.description} onChange={e => setAccrualTypeForm({ ...accrualTypeForm, description: e.target.value })} rows={2} placeholder="Describe the purpose of this accrual type" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowAccrualTypeModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={saveAccrualType} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Tax Modal */}
      {showTaxModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                {taxEditId ? "Edit Tax Rule" : "New Tax Rule"}
              </h2>
              <button
                onClick={() => setShowTaxModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Tax Name *
                </label>
                <input
                  value={taxForm.name}
                  onChange={(e) =>
                    setTaxForm({ ...taxForm, name: e.target.value })
                  }
                  placeholder="e.g. VAT (Standard Rate)"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Tax Type
                  </label>
                  <select
                    value={taxForm.type}
                    onChange={(e) =>
                      setTaxForm({
                        ...taxForm,
                        type: e.target.value as TaxType,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="VAT">VAT</option>
                    <option value="WHT">WHT</option>
                    <option value="PAYE">PAYE</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Rate (%)
                  </label>
                  <input
                    value={taxForm.rate}
                    onChange={(e) =>
                      setTaxForm({ ...taxForm, rate: e.target.value })
                    }
                    placeholder="e.g. 7.5"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    GL Code
                  </label>
                  <input
                    value={taxForm.glCode}
                    onChange={(e) =>
                      setTaxForm({ ...taxForm, glCode: e.target.value })
                    }
                    placeholder="e.g. 2300"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Applies To
                  </label>
                  <input
                    value={taxForm.appliesTo}
                    onChange={(e) =>
                      setTaxForm({ ...taxForm, appliesTo: e.target.value })
                    }
                    placeholder="e.g. Goods & Services"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setShowTaxModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveTax}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteTarget !== null}
        title={deleteTarget ? DELETE_TITLES[deleteTarget.kind] : ""}
        description={
          deleteTarget
            ? `This will permanently remove the ${DELETE_SUBJECTS[deleteTarget.kind]} "${deleteTarget.name}". This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        isDangerous
        isLoading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
