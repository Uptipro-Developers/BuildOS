import {
  Save,
  Globe,
  Calendar,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  X,
  Search,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { CreatableSelect } from "../../components/CreatableSelect";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import {
  getAdminGeneralSettings,
  updateAdminGeneralSettings,
  createChangeCategory,
  createIssueType,
  deleteChangeCategory,
  deleteIssueType,
  getChangeCategories,
  getIssueTypes,
  updateChangeCategory,
  updateIssueType,
} from "../../api/admin-extras";
import { toast } from "sonner";

// ── Issue Types ──────────────────────────────────────────────────────────────
const IT_COLORS = [
  "bg-red-100 text-red-700",
  "bg-orange-100 text-orange-700",
  "bg-amber-100 text-amber-700",
  "bg-yellow-100 text-yellow-700",
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-gray-100 text-gray-700",
  "bg-teal-100 text-teal-700",
];
const IT_COLOR_NAMES: Record<string, string> = {
  "bg-red-100 text-red-700": "Red",
  "bg-orange-100 text-orange-700": "Orange",
  "bg-amber-100 text-amber-700": "Amber",
  "bg-yellow-100 text-yellow-700": "Yellow",
  "bg-blue-100 text-blue-700": "Blue",
  "bg-purple-100 text-purple-700": "Purple",
  "bg-gray-100 text-gray-700": "Gray",
  "bg-teal-100 text-teal-700": "Teal",
};
type IssuePriority = "low" | "medium" | "high" | "critical";
interface IssueType {
  id: string;
  name: string;
  description: string;
  priority: IssuePriority;
  color: string;
  slaHours: number;
  active: boolean;
}
const PRIORITY_BADGE: Record<IssuePriority, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};
const EMPTY_ISSUE: Omit<IssueType, "id"> = {
  name: "",
  description: "",
  priority: "medium",
  color: IT_COLORS[0],
  slaHours: 24,
  active: true,
};

// slaHours is kept as a string in the form so the field can be cleared while
// the user is typing (a raw number input cannot represent an empty value).
type IssueFormState = Omit<IssueType, "id" | "slaHours"> & { slaHours: string };
const EMPTY_ISSUE_FORM: IssueFormState = {
  ...EMPTY_ISSUE,
  slaHours: String(EMPTY_ISSUE.slaHours),
};

// ── Change Categories ────────────────────────────────────────────────────────
interface ChangeCategory {
  id: string;
  name: string;
  description: string;
}
const BLANK_CAT: Omit<ChangeCategory, "id"> = { name: "", description: "" };

function CategoryModal({
  initial,
  existing,
  onSave,
  onClose,
}: {
  initial: Partial<ChangeCategory> & { name: string; description: string };
  existing: ChangeCategory[];
  onSave: (data: Omit<ChangeCategory, "id"> & { id?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  async function submit() {
    if (!form.name.trim()) {
      setErrors({ name: "Name is required." });
      return;
    }

    const isDuplicate = existing.some(
      (c) =>
        c.name.toLowerCase() === form.name.toLowerCase() && c.id !== initial.id,
    );
    if (isDuplicate) {
      setErrors({ name: "Category name already exists." });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      if (
        err?.message?.includes("409") ||
        err?.message?.includes("already exists")
      ) {
        setErrors({ name: "Category name already exists." });
      } else {
        setErrors({ name: err?.message || "Failed to save category." });
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {initial.id ? "Edit Change Category" : "New Change Category"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
          >
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
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                if (errors.name) setErrors({});
              }}
              placeholder="e.g. Design Change"
              className={`w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${errors.name ? "border-red-400" : "border-gray-200"}`}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
              placeholder="Describe when this category applies…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={isSaving}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50"
          >
            {initial.id ? "Save Changes" : "Add Category"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteCatModal({
  name,
  isLoading = false,
  onConfirm,
  onClose,
}: {
  name: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">
          Delete Change Category?
        </h2>
        <p className="text-sm text-gray-500">
          <strong>"{name}"</strong> will be permanently removed.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            disabled={isLoading}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Currency options ─────────────────────────────────────────────────────────
const defaultCurrencyOptions = [
  { label: "US Dollar", value: "USD", meta: "$" },
  { label: "Euro", value: "EUR", meta: "€" },
  { label: "British Pound", value: "GBP", meta: "£" },
  { label: "Japanese Yen", value: "JPY", meta: "¥" },
  { label: "Chinese Yuan", value: "CNY", meta: "¥" },
  { label: "Indian Rupee", value: "INR", meta: "₹" },
  { label: "Nigerian Naira", value: "NGN", meta: "₦" },
  { label: "UAE Dirham", value: "AED", meta: "د.إ" },
  { label: "Saudi Riyal", value: "SAR", meta: "﷼" },
  { label: "South African Rand", value: "ZAR", meta: "R" },
];

type CurrencyOption = (typeof defaultCurrencyOptions)[number];

export function GeneralSettingsPage() {
  // ── Tab state ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<
    "general" | "issue_types" | "change_categories"
  >("general");

  // ── General settings state ───────────────────────────────────────────────
  const [settings, setSettings] = useState({
  // Nigerian defaults: BuildOS is deployed for a Nigerian construction group.
  // These are only the fallback for a fresh install — Admin → General Settings
  // overrides them, and every formatter reads the configured value, not these.
    currency: "NGN",
    currencySymbol: "₦",
    timezone: "Africa/Lagos",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24",
    numberFormat: "1,234.56",
    fiscalYearStart: "01",
    language: "en",
  });
  const [currencyOptions, setCurrencyOptions] = useState(
    defaultCurrencyOptions,
  );
  const [savingGeneralSettings, setSavingGeneralSettings] = useState(false);
  const handleChange = (field: string, value: string) =>
    setSettings((prev) => {
      const next = { ...prev, [field]: value };
      localStorage.setItem("buildos_general_settings", JSON.stringify(next));
      return next;
    });
  const saveCurrencyOptions = (
    updater: CurrencyOption[] | ((prev: CurrencyOption[]) => CurrencyOption[]),
  ) => {
    setCurrencyOptions((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      localStorage.setItem("buildos_currency_options", JSON.stringify(next));
      return next;
    });
  };
  const handleSave = async () => {
    setSavingGeneralSettings(true);
    // Persist locally first so the change is guaranteed and immediately
    // reflected across the app (currency symbol, number/date formatting, etc.)
    // regardless of whether the backend sync succeeds.
    localStorage.setItem("buildos_general_settings", JSON.stringify(settings));
    localStorage.setItem(
      "buildos_currency_options",
      JSON.stringify(currencyOptions),
    );
    window.dispatchEvent(new Event("buildos:general-settings-changed"));

    try {
      const payload = {
        generalSettings: settings,
        currencyOptions,
      };
      const saved = await updateAdminGeneralSettings(payload);

      setSettings(saved.generalSettings);
      setCurrencyOptions(saved.currencyOptions as CurrencyOption[]);
      localStorage.setItem(
        "buildos_general_settings",
        JSON.stringify(saved.generalSettings),
      );
      localStorage.setItem(
        "buildos_currency_options",
        JSON.stringify(saved.currencyOptions),
      );
      window.dispatchEvent(new Event("buildos:general-settings-changed"));
      toast.success("General settings saved.");
    } catch (error) {
      // The settings were already saved locally above, so the change still
      // takes effect — surface a non-blocking warning about server sync.
      const message =
        error instanceof Error && error.message
          ? `Saved locally. Server sync failed: ${error.message}`
          : "Saved locally. Could not sync to the server.";
      toast.warning(message);
    } finally {
      setSavingGeneralSettings(false);
    }
  };

  // ── Issue Types state ────────────────────────────────────────────────────
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [editIssueId, setEditIssueId] = useState<string | null>(null);
  const [issueFormError, setIssueFormError] = useState<string>("");
  const [issueSaving, setIssueSaving] = useState(false);
  const [issueDeletingId, setIssueDeletingId] = useState<string | null>(null);
  const [issueTogglingId, setIssueTogglingId] = useState<string | null>(null);
  const [deletingIssue, setDeletingIssue] = useState<IssueType | null>(null);
  const [issueForm, setIssueForm] = useState<IssueFormState>({
    ...EMPTY_ISSUE_FORM,
  });
  async function saveIssue(e: React.FormEvent) {
    e.preventDefault();
    setIssueFormError("");

    if (!issueForm.name.trim()) {
      setIssueFormError("Issue type name is required");
      toast.error("Issue type name is required");
      return;
    }

    const slaHours = Number(issueForm.slaHours);
    if (
      issueForm.slaHours.trim() === "" ||
      Number.isNaN(slaHours) ||
      slaHours < 1
    ) {
      setIssueFormError("SLA target must be at least 1 hour");
      toast.error("SLA target must be at least 1 hour");
      return;
    }

    const isDuplicate = issueTypes.some(
      (t) =>
        t.name.toLowerCase() === issueForm.name.toLowerCase() &&
        t.id !== editIssueId,
    );
    if (isDuplicate) {
      setIssueFormError("Issue type name already exists");
      toast.error("Issue type name already exists");
      return;
    }

    const payload = { ...issueForm, slaHours };
    setIssueSaving(true);
    try {
      if (editIssueId) {
        const updated = await updateIssueType(editIssueId, payload);
        setIssueTypes((prev) =>
          prev.map((t) => (t.id === editIssueId ? updated : t)),
        );
        setEditIssueId(null);
        toast.success("Issue type updated");
      } else {
        const created = await createIssueType(payload);
        setIssueTypes((prev) => [...prev, created]);
        toast.success("Issue type created");
      }
      setIssueForm({ ...EMPTY_ISSUE_FORM });
      setShowIssueForm(false);
    } catch (err: any) {
      const message = err?.message || "Failed to save issue type";
      if (message.includes("409") || message.includes("already exists")) {
        setIssueFormError("Issue type name already exists");
        toast.error("Issue type name already exists");
      } else {
        setIssueFormError(message);
        toast.error(message);
      }
    } finally {
      setIssueSaving(false);
    }
  }
  function startEditIssue(t: IssueType) {
    setIssueForm({
      name: t.name,
      description: t.description,
      priority: t.priority,
      color: t.color,
      slaHours: String(t.slaHours),
      active: t.active,
    });
    setEditIssueId(t.id);
    setShowIssueForm(true);
  }
  async function deleteIssue(id: string) {
    setIssueDeletingId(id);
    try {
      await deleteIssueType(id);
      setIssueTypes((prev) => prev.filter((t) => t.id !== id));
      toast.success("Issue type deleted");
      setDeletingIssue(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete issue type");
    } finally {
      setIssueDeletingId(null);
    }
  }
  async function toggleIssueActive(id: string) {
    setIssueTogglingId(id);
    const current = issueTypes.find((t) => t.id === id);
    if (!current) {
      setIssueTogglingId(null);
      return;
    }
    try {
      const updated = await updateIssueType(id, { active: !current.active });
      setIssueTypes((prev) => prev.map((t) => (t.id === id ? updated : t)));
      toast.success(
        updated.active ? "Issue type activated" : "Issue type deactivated",
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to update issue type");
    } finally {
      setIssueTogglingId(null);
    }
  }

  // ── Change Categories state ──────────────────────────────────────────────
  const [categories, setCategories] = useState<ChangeCategory[]>([]);
  const [catSearch, setCatSearch] = useState("");
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<ChangeCategory | null>(null);
  const [deletingCat, setDeletingCat] = useState<ChangeCategory | null>(null);
  const [catSaving, setCatSaving] = useState(false);
  const [catDeleting, setCatDeleting] = useState(false);
  const filteredCats = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(catSearch.toLowerCase()) ||
      c.description.toLowerCase().includes(catSearch.toLowerCase()),
  );
  async function saveCat(data: Omit<ChangeCategory, "id"> & { id?: string }) {
    setCatSaving(true);
    try {
      if (data.id) {
        const updated = await updateChangeCategory(data.id, data);
        setCategories((prev) =>
          prev.map((c) => (c.id === data.id ? updated : c)),
        );
        toast.success("Change category updated.");
      } else {
        const created = await createChangeCategory(data);
        setCategories((prev) => [...prev, created]);
        toast.success("Change category added.");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save change category.";
      toast.error(message);
      throw error;
    } finally {
      setCatSaving(false);
    }
  }

  useEffect(() => {
    const savedSettings = localStorage.getItem("buildos_general_settings");
    const savedCurrencies = localStorage.getItem("buildos_currency_options");

    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch {
        // no-op
      }
    }
    if (savedCurrencies) {
      try {
        setCurrencyOptions(JSON.parse(savedCurrencies));
      } catch {
        // no-op
      }
    }
    getAdminGeneralSettings()
      .then((saved) => {
        setSettings(saved.generalSettings);
        setCurrencyOptions(saved.currencyOptions as CurrencyOption[]);
        localStorage.setItem(
          "buildos_general_settings",
          JSON.stringify(saved.generalSettings),
        );
        localStorage.setItem(
          "buildos_currency_options",
          JSON.stringify(saved.currencyOptions),
        );
      })
      .catch(() => {
        // Keep localStorage/default fallback if API is not reachable.
      });
    getIssueTypes()
      .then(setIssueTypes)
      .catch(() => setIssueTypes([]));
    getChangeCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const selectedCurrency = currencyOptions.find(
    (option) => option.value === settings.currency,
  );
  const isCustomCurrency = !selectedCurrency?.meta;

  const TABS = [
    { key: "general" as const, label: "General Settings" },
    { key: "issue_types" as const, label: "Issue Types" },
    { key: "change_categories" as const, label: "Change Categories" },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            General Settings
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure system-wide preferences, issue types, and change
            categories
          </p>
        </div>
        {activeTab === "general" && (
          <button
            onClick={handleSave}
            disabled={savingGeneralSettings}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            {savingGeneralSettings ? "Saving..." : "Save Changes"}
          </button>
        )}
        {activeTab === "issue_types" && (
          <button
            onClick={() => {
              setShowIssueForm(true);
              setEditIssueId(null);
              setIssueForm({ ...EMPTY_ISSUE_FORM });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add Issue Type
          </button>
        )}
        {activeTab === "change_categories" && (
          <button
            onClick={() => {
              setEditingCat(null);
              setShowCatModal(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-xl"
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t.key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── GENERAL SETTINGS TAB ── */}
      {activeTab === "general" && (
        <>
          {/* Currency Settings */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Currency Settings
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Currency
                </label>
                <CreatableSelect
                  options={currencyOptions}
                  value={settings.currency}
                  onChange={(value, option) => {
                    handleChange("currency", value);
                    handleChange("currencySymbol", option?.meta ?? "");
                  }}
                  onCreateOption={(label, meta) => {
                    const opt = {
                      label,
                      value: label.substring(0, 3).toUpperCase(),
                      meta: (meta ?? "").trim(),
                    };
                    saveCurrencyOptions((prev) => [...prev, opt]);
                    return opt;
                  }}
                  placeholder="Select or add currency"
                  createLabel="Add custom currency"
                  metaPlaceholder="Symbol (e.g. $, €, ₦)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={settings.currencySymbol}
                  onChange={(e) =>
                    handleChange("currencySymbol", e.target.value)
                  }
                  disabled={!isCustomCurrency}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                />
                {!isCustomCurrency && (
                  <p className="text-xs text-gray-500 mt-1">
                    Symbol is inherited from the selected currency.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number Format
                </label>
                <select
                  value={settings.numberFormat}
                  onChange={(e) => handleChange("numberFormat", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                  <option value="1,234.56">
                    1,234.56 (Comma separator, period decimal)
                  </option>
                  <option value="1.234,56">
                    1.234,56 (Period separator, comma decimal)
                  </option>
                  <option value="1 234.56">
                    1 234.56 (Space separator, period decimal)
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fiscal Year Start
                </label>
                <select
                  value={settings.fiscalYearStart}
                  onChange={(e) =>
                    handleChange("fiscalYearStart", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                  {[
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
                  ].map((m, i) => (
                    <option key={m} value={String(i + 1).padStart(2, "0")}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Regional Settings */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Regional Settings
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={settings.timezone}
                  onChange={(e) => handleChange("timezone", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Asia/Dubai">Dubai (GST)</option>
                  <option value="Asia/Kolkata">India (IST)</option>
                  <option value="Africa/Lagos">Lagos (WAT)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => handleChange("language", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="zh">Chinese</option>
                  <option value="ja">Japanese</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>
            </div>
          </div>

          {/* Date & Time Format */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Date & Time Format
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Format
                </label>
                <select
                  value={settings.dateFormat}
                  onChange={(e) => handleChange("dateFormat", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY (04/07/2026)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (07/04/2026)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2026-04-07)</option>
                  <option value="DD-MMM-YYYY">DD-MMM-YYYY (07-Apr-2026)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Format
                </label>
                <select
                  value={settings.timeFormat}
                  onChange={(e) => handleChange("timeFormat", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                  <option value="12">12-hour (3:30 PM)</option>
                  <option value="24">24-hour (15:30)</option>
                </select>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── ISSUE TYPES TAB ── */}
      {activeTab === "issue_types" && (
        <div className="space-y-5">
          {/* Inline form */}
          {showIssueForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">
                {editIssueId ? "Edit Issue Type" : "New Issue Type"}
              </h2>
              <form onSubmit={saveIssue} className="space-y-4">
                {issueFormError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{issueFormError}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Issue Type Name
                    </label>
                    <input
                      value={issueForm.name}
                      onChange={(e) => {
                        setIssueForm((f) => ({ ...f, name: e.target.value }));
                        if (issueFormError) setIssueFormError("");
                      }}
                      placeholder="e.g. Equipment Breakdown"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Description
                    </label>
                    <input
                      value={issueForm.description}
                      onChange={(e) =>
                        setIssueForm((f) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Short description of the issue type"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Priority
                    </label>
                    <select
                      value={issueForm.priority}
                      onChange={(e) =>
                        setIssueForm((f) => ({
                          ...f,
                          priority: e.target.value as IssuePriority,
                        }))
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      SLA Target (hours)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={issueForm.slaHours}
                      onChange={(e) =>
                        setIssueForm((f) => ({
                          ...f,
                          slaHours: e.target.value,
                        }))
                      }
                      placeholder="e.g. 24"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Badge Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {IT_COLORS.map((c) => (
                        <button
                          type="button"
                          key={c}
                          onClick={() =>
                            setIssueForm((f) => ({ ...f, color: c }))
                          }
                          className={`px-2.5 py-1 text-xs rounded-full font-medium border-2 ${c} ${issueForm.color === c ? "border-gray-800 scale-110" : "border-transparent"}`}
                        >
                          {IT_COLOR_NAMES[c]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 justify-end">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={issueForm.active}
                        onChange={(e) =>
                          setIssueForm((f) => ({
                            ...f,
                            active: e.target.checked,
                          }))
                        }
                        className="rounded"
                      />
                      Active
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={issueSaving}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {issueSaving
                      ? editIssueId
                        ? "Saving…"
                        : "Adding…"
                      : editIssueId
                        ? "Save Changes"
                        : "Add Issue Type"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowIssueForm(false);
                      setEditIssueId(null);
                      setIssueForm({ ...EMPTY_ISSUE_FORM });
                    }}
                    disabled={issueSaving}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Issue types table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                    Priority
                  </th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                    SLA Target
                  </th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                    Status
                  </th>
                  <th className="text-right px-5 py-3 text-xs text-gray-500 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {issueTypes.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-10 text-sm text-gray-400"
                    >
                      No issue types defined.
                    </td>
                  </tr>
                )}
                {issueTypes.map((t) => (
                  <tr
                    key={t.id}
                    className={`hover:bg-gray-50/70 ${!t.active ? "opacity-50" : ""}`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-800">{t.name}</p>
                          <p className="text-xs text-gray-400">
                            {t.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_BADGE[t.priority]}`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {t.slaHours < 24
                        ? `${t.slaHours}h`
                        : `${t.slaHours / 24}d`}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleIssueActive(t.id)}
                        disabled={issueTogglingId === t.id}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${t.active ? "bg-gray-800" : "bg-gray-200"}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${t.active ? "translate-x-4" : "translate-x-0.5"}`}
                        />
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEditIssue(t)}
                          disabled={
                            issueSaving ||
                            issueDeletingId === t.id ||
                            issueTogglingId === t.id
                          }
                          className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingIssue(t)}
                          disabled={
                            issueSaving ||
                            issueDeletingId === t.id ||
                            issueTogglingId === t.id
                          }
                          className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

          <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            Issue types are used in the <strong>ESS → Log Issues</strong> form.
            Inactive types will not appear for employees.
          </div>

          <ConfirmationModal
            isOpen={deletingIssue !== null}
            title="Delete issue type?"
            description={
              deletingIssue
                ? `"${deletingIssue.name}" will be permanently deleted. This action cannot be undone.`
                : ""
            }
            confirmLabel="Delete"
            isDangerous
            isLoading={
              deletingIssue !== null && issueDeletingId === deletingIssue.id
            }
            onConfirm={() => {
              if (deletingIssue) void deleteIssue(deletingIssue.id);
            }}
            onCancel={() => setDeletingIssue(null)}
          />
        </div>
      )}

      {/* ── CHANGE CATEGORIES TAB ── */}
      {activeTab === "change_categories" && (
        <div className="space-y-5">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-start gap-3">
            <RefreshCw className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-indigo-700">
              These categories appear in the ESS <strong>Change Request</strong>{" "}
              form. They help classify and route change requests to the
              appropriate approvers.
            </p>
          </div>

          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              placeholder="Search categories…"
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium w-8">#</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Category Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left font-medium w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCats.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-gray-400 text-sm"
                    >
                      No categories found.
                    </td>
                  </tr>
                )}
                {filteredCats.map((cat, i) => (
                  <tr
                    key={cat.id}
                    className="hover:bg-gray-50 transition-colors group"
                  >
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {cat.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {cat.description || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCat(cat);
                            setShowCatModal(true);
                          }}
                          disabled={catSaving || catDeleting}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingCat(cat)}
                          disabled={catSaving || catDeleting}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
            {filteredCats.length} of {categories.length} categories
          </p>

          {showCatModal && (
            <CategoryModal
              initial={editingCat ?? { ...BLANK_CAT }}
              existing={categories}
              onSave={saveCat}
              onClose={() => setShowCatModal(false)}
            />
          )}
          {deletingCat && (
            <DeleteCatModal
              name={deletingCat.name}
              isLoading={catDeleting}
              onConfirm={async () => {
                setCatDeleting(true);
                try {
                  await deleteChangeCategory(deletingCat.id);
                  setCategories((prev) =>
                    prev.filter((c) => c.id !== deletingCat.id),
                  );
                  toast.success("Change category deleted.");
                } catch (error) {
                  const message =
                    error instanceof Error
                      ? error.message
                      : "Failed to delete change category.";
                  toast.error(message);
                } finally {
                  setCatDeleting(false);
                  setDeletingCat(null);
                }
              }}
              onClose={() => setDeletingCat(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
