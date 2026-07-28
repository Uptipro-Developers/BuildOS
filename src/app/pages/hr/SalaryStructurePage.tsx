import { useState, useEffect } from "react";
import { apiFetch } from "../../api/client";
import {
  getCurrencySymbol,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";
import {
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  X,
  Layers,
  Percent,
  Hash,
  Link2,
  Code2,
  Users,
  UserCheck,
  DollarSign,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type CalcType = "fixed" | "percent_basic" | "percent_component" | "formula";
type AppScope = "all" | "roles" | "grade_levels" | "custom_groups";

interface SalaryComponent {
  id: string;
  name: string;
  type: "allowance" | "deduction";
  calcType: CalcType;
  amount: number;
  percentage?: number;
  referenceComponent?: string;
  formula?: string;
  taxable: boolean;
  description: string;
  applicability: { scope: AppScope; target?: string };
}

interface SalaryBand {
  id: string;
  gradeName: string;
  gradeLevel: string;
  department: string;
  description: string;
  basicSalary: number;
  components: SalaryComponent[];
}

// ── Static config ──────────────────────────────────────────────────────────────
const CALC_TYPES: {
  key: CalcType;
  label: string;
  hint: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "fixed",
    label: "Fixed Amount",
    hint: "A fixed monetary value",
    icon: <DollarSign className="w-4 h-4" />,
  },
  {
    key: "percent_basic",
    label: "% of Basic",
    hint: "Percentage of the band's basic salary",
    icon: <Percent className="w-4 h-4" />,
  },
  {
    key: "percent_component",
    label: "% of Component",
    hint: "Percentage of another component's value",
    icon: <Link2 className="w-4 h-4" />,
  },
  {
    key: "formula",
    label: "Formula",
    hint: "Custom expression (e.g. basic * 0.1 + 500)",
    icon: <Code2 className="w-4 h-4" />,
  },
];

const APP_SCOPES: { key: AppScope; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All Employees", icon: <Users className="w-4 h-4" /> },
  {
    key: "roles",
    label: "Specific Roles",
    icon: <UserCheck className="w-4 h-4" />,
  },
  {
    key: "grade_levels",
    label: "Grade Levels",
    icon: <Hash className="w-4 h-4" />,
  },
  {
    key: "custom_groups",
    label: "Custom Groups",
    icon: <Layers className="w-4 h-4" />,
  },
];

const BLANK_COMP: Omit<SalaryComponent, "id"> = {
  name: "",
  type: "allowance",
  calcType: "fixed",
  amount: 0,
  percentage: undefined,
  referenceComponent: undefined,
  formula: undefined,
  taxable: false,
  description: "",
  applicability: { scope: "all", target: "" },
};

// ── Helper badges ─────────────────────────────────────────────────────────────
function CalcBadge({ type }: { type: CalcType }) {
  const map: Record<CalcType, { label: string; cls: string }> = {
    fixed: { label: "Fixed", cls: "bg-blue-100 text-blue-700" },
    percent_basic: { label: "% Basic", cls: "bg-purple-100 text-purple-700" },
    percent_component: {
      label: "% Component",
      cls: "bg-amber-100 text-amber-700",
    },
    formula: { label: "Formula", cls: "bg-teal-100 text-teal-700" },
  };
  const { label, cls } = map[type];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

function AppBadge({ scope }: { scope: AppScope }) {
  const map: Record<AppScope, { label: string; cls: string }> = {
    all: { label: "All", cls: "bg-gray-100 text-gray-600" },
    roles: { label: "Roles", cls: "bg-indigo-100 text-indigo-700" },
    grade_levels: { label: "Grades", cls: "bg-emerald-100 text-emerald-700" },
    custom_groups: { label: "Groups", cls: "bg-rose-100 text-rose-700" },
  };
  const { label, cls } = map[scope];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

// ── ComponentModal ─────────────────────────────────────────────────────────────
function ComponentModal({
  band,
  initial,
  onSave,
  onClose,
}: {
  band: SalaryBand;
  initial: SalaryComponent | null;
  onSave: (c: SalaryComponent) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<SalaryComponent, "id">>(
    initial ? { ...initial } : { ...BLANK_COMP },
  );

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, id: initial?.id ?? `comp-${Date.now()}` });
  };

  const otherComponents = band.components.filter((c) => c.id !== initial?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {initial ? "Edit Component" : "Add Component"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Component Name
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Housing Allowance"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.type}
                onChange={(e) =>
                  set("type", e.target.value as "allowance" | "deduction")
                }
              >
                <option value="allowance">Allowance</option>
                <option value="deduction">Deduction</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <button
                type="button"
                onClick={() => set("taxable", !form.taxable)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.taxable ? "bg-indigo-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.taxable ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
              <span className="text-sm text-gray-700">Taxable</span>
            </div>
          </div>

          {/* Calculation type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Calculation Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CALC_TYPES.map((ct) => (
                <button
                  key={ct.key}
                  type="button"
                  onClick={() => set("calcType", ct.key)}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                    form.calcType === ct.key
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  <span
                    className={`mt-0.5 ${form.calcType === ct.key ? "text-indigo-600" : "text-gray-400"}`}
                  >
                    {ct.icon}
                  </span>
                  <div>
                    <p
                      className={`text-sm font-medium ${form.calcType === ct.key ? "text-indigo-700" : "text-gray-700"}`}
                    >
                      {ct.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{ct.hint}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Conditional inputs */}
          {form.calcType === "fixed" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount ({getCurrencySymbol()})
              </label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.amount}
                onChange={(e) => set("amount", parseFloat(e.target.value) || 0)}
              />
            </div>
          )}
          {(form.calcType === "percent_basic" ||
            form.calcType === "percent_component") && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Percentage (%)
                </label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.percentage ?? ""}
                  onChange={(e) =>
                    set("percentage", parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              {form.calcType === "percent_component" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Component
                  </label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.referenceComponent ?? ""}
                    onChange={(e) =>
                      set("referenceComponent", e.target.value || undefined)
                    }
                  >
                    <option value="">Select component…</option>
                    {otherComponents.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          {form.calcType === "formula" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Formula Expression
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. basic * 0.1 + 5000"
                value={form.formula ?? ""}
                onChange={(e) => set("formula", e.target.value || undefined)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Available variables: <code>basic</code>,{" "}
                <code>taxable_allowances</code>, <code>performance_rating</code>
              </p>
            </div>
          )}

          {/* Applicability */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Applicability
            </label>
            <div className="grid grid-cols-2 gap-2">
              {APP_SCOPES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() =>
                    set("applicability", { scope: s.key, target: "" })
                  }
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-colors ${
                    form.applicability.scope === s.key
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-medium"
                      : "border-gray-200 text-gray-600 hover:border-indigo-300"
                  }`}
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </div>
            {form.applicability.scope !== "all" && (
              <input
                className="mt-2 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={
                  form.applicability.scope === "roles"
                    ? "e.g. Senior Engineer, Project Manager"
                    : form.applicability.scope === "grade_levels"
                      ? "e.g. L2, M1, D1"
                      : "e.g. Executive Committee, Field Staff"
                }
                value={form.applicability.target ?? ""}
                onChange={(e) =>
                  set("applicability", {
                    scope: form.applicability.scope,
                    target: e.target.value,
                  })
                }
              />
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Brief description of this component…"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name.trim()}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {initial ? "Save Changes" : "Add Component"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function SalaryStructurePage() {
  const [bands, setBands] = useState<SalaryBand[]>([]);

  useEffect(() => {
    apiFetch("/salary-bands")
      .then(setBands)
      .catch((err) => {
        console.error("Failed to load salary bands:", err);
        setBands([]);
      });
  }, []);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["b1"]));
  const [modalBand, setModalBand] = useState<SalaryBand | null>(null);
  const [editComp, setEditComp] = useState<SalaryComponent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    bandId: string;
    comp: SalaryComponent;
  } | null>(null);
  const [addBandOpen, setAddBandOpen] = useState(false);
  const [newBand, setNewBand] = useState({
    gradeName: "",
    gradeLevel: "",
    department: "",
    description: "",
    basicSalary: 0,
  });

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const openAddComp = (band: SalaryBand) => {
    setEditComp(null);
    setModalBand(band);
  };
  const openEditComp = (band: SalaryBand, comp: SalaryComponent) => {
    setEditComp(comp);
    setModalBand(band);
  };

  const saveComponent = (bandId: string, comp: SalaryComponent) => {
    setBands((prev) =>
      prev.map((b) => {
        if (b.id !== bandId) return b;
        const exists = b.components.find((c) => c.id === comp.id);
        return {
          ...b,
          components: exists
            ? b.components.map((c) => (c.id === comp.id ? comp : c))
            : [...b.components, comp],
        };
      }),
    );
    setModalBand(null);
    setEditComp(null);
  };

  const deleteComponent = (bandId: string, compId: string) => {
    setBands((prev) =>
      prev.map((b) =>
        b.id !== bandId
          ? b
          : { ...b, components: b.components.filter((c) => c.id !== compId) },
      ),
    );
    setDeleteTarget(null);
  };

  const addBand = () => {
    if (!newBand.gradeName.trim()) return;
    setBands((p) => [...p, { ...newBand, id: `band-${Date.now()}`, components: [] }]);
    setNewBand({ gradeName: "", gradeLevel: "", department: "", description: "", basicSalary: 0 });
    setAddBandOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salary Structure</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage grade bands and their salary components
          </p>
        </div>
        <button
          onClick={() => setAddBandOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Add Grade Band
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Grade Bands", value: bands.length, cls: "text-indigo-600" },
          {
            label: "Total Components",
            value: bands.reduce((s, b) => s + b.components.length, 0),
            cls: "text-gray-700",
          },
          {
            label: "Allowances",
            value: bands.reduce(
              (s, b) =>
                s + b.components.filter((c) => c.type === "allowance").length,
              0,
            ),
            cls: "text-emerald-600",
          },
          {
            label: "Deductions",
            value: bands.reduce(
              (s, b) =>
                s + b.components.filter((c) => c.type === "deduction").length,
              0,
            ),
            cls: "text-rose-600",
          },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-xl p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Grade band accordion */}
      <div className="space-y-3">
        {bands.map((band) => {
          const isOpen = expanded.has(band.id);
          const allowances = band.components.filter(
            (c) => c.type === "allowance",
          );
          const deductions = band.components.filter(
            (c) => c.type === "deduction",
          );
          const totalAllowances = allowances.reduce(
            (sum, c) =>
              sum +
              (c.calcType === "fixed"
                ? c.amount
                : c.calcType === "percent_basic"
                  ? band.basicSalary * ((c.percentage ?? 0) / 100)
                  : 0),
            0,
          );
          const totalDeductions = deductions.reduce(
            (sum, c) =>
              sum +
              (c.calcType === "fixed"
                ? c.amount
                : c.calcType === "percent_basic"
                  ? band.basicSalary * ((c.percentage ?? 0) / 100)
                  : 0),
            0,
          );

          return (
            <div
              key={band.id}
              className="bg-white border rounded-xl overflow-hidden"
            >
              {/* Band header */}
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                onClick={() => toggle(band.id)}
              >
                <div className="flex items-center gap-4">
                  <span className="text-gray-400">
                    {isOpen ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </span>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {band.gradeName}
                      </p>
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                        {band.gradeLevel}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {band.department}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {band.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-xs text-gray-400">Basic Salary</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {getCurrencySymbol()}{formatNumberByGeneralSettings(band.basicSalary)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Allowances</p>
                    <p className="text-sm font-semibold text-emerald-600">
                      +{getCurrencySymbol()}{formatNumberByGeneralSettings(totalAllowances)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Deductions</p>
                    <p className="text-sm font-semibold text-rose-600">
                      -{getCurrencySymbol()}{formatNumberByGeneralSettings(totalDeductions)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Components</p>
                    <p className="text-sm font-semibold text-gray-700">
                      {band.components.length}
                    </p>
                  </div>
                </div>
              </button>

              {/* Band body */}
              {isOpen && (
                <div className="border-t px-5 py-4 bg-gray-50 space-y-4">
                  {(["allowance", "deduction"] as const).map((ctype) => {
                    const list = band.components.filter(
                      (c) => c.type === ctype,
                    );
                    return (
                      <div key={ctype}>
                        <div className="flex items-center justify-between mb-2">
                          <h4
                            className={`text-sm font-semibold ${ctype === "allowance" ? "text-emerald-700" : "text-rose-700"}`}
                          >
                            {ctype === "allowance"
                              ? "Allowances"
                              : "Deductions"}
                            <span className="ml-2 text-xs font-normal text-gray-400">
                              ({list.length})
                            </span>
                          </h4>
                          <button
                            onClick={() => openAddComp(band)}
                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${
                              ctype === "allowance"
                                ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                : "text-rose-600 border-rose-200 hover:bg-rose-50"
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                            Add{" "}
                            {ctype === "allowance" ? "Allowance" : "Deduction"}
                          </button>
                        </div>

                        {list.length === 0 ? (
                          <p className="text-xs text-gray-400 italic py-2">
                            No {ctype}s configured
                          </p>
                        ) : (
                          <div className="rounded-lg border overflow-hidden bg-white">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-50 border-b">
                                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                                    Name
                                  </th>
                                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                                    Calc Type
                                  </th>
                                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                                    Value
                                  </th>
                                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                                    Applicability
                                  </th>
                                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                                    Taxable
                                  </th>
                                  <th className="px-4 py-2" />
                                </tr>
                              </thead>
                              <tbody>
                                {list.map((comp, idx) => (
                                  <tr
                                    key={comp.id}
                                    className={`border-b last:border-0 ${idx % 2 === 1 ? "bg-gray-50/50" : ""}`}
                                  >
                                    <td className="px-4 py-3 font-medium text-gray-800">
                                      {comp.name}
                                    </td>
                                    <td className="px-4 py-3">
                                      <CalcBadge type={comp.calcType} />
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                                      {comp.calcType === "fixed" &&
                                        `${getCurrencySymbol()}${formatNumberByGeneralSettings(comp.amount)}`}
                                      {(comp.calcType === "percent_basic" ||
                                        comp.calcType ===
                                          "percent_component") &&
                                        `${comp.percentage}%`}
                                      {comp.calcType === "formula" && (
                                        <span className="text-teal-600">
                                          {comp.formula}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-1.5">
                                        <AppBadge
                                          scope={comp.applicability.scope}
                                        />
                                        {comp.applicability.target && (
                                          <span className="text-xs text-gray-400 truncate max-w-[100px]">
                                            {comp.applicability.target}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span
                                        className={`text-xs font-medium ${comp.taxable ? "text-amber-600" : "text-gray-400"}`}
                                      >
                                        {comp.taxable ? "Yes" : "No"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2 justify-end">
                                        <button
                                          onClick={() =>
                                            openEditComp(band, comp)
                                          }
                                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        >
                                          <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() =>
                                            setDeleteTarget({
                                              bandId: band.id,
                                              comp,
                                            })
                                          }
                                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Grade Band modal */}
      {addBandOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Add Grade Band
              </h2>
              <button
                onClick={() => setAddBandOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grade Name
                  </label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Senior Engineer"
                    value={newBand.gradeName}
                    onChange={(e) =>
                      setNewBand((p) => ({ ...p, gradeName: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grade Level
                  </label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. L3"
                    value={newBand.gradeLevel}
                    onChange={(e) =>
                      setNewBand((p) => ({ ...p, gradeLevel: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Engineering"
                    value={newBand.department}
                    onChange={(e) =>
                      setNewBand((p) => ({ ...p, department: e.target.value }))
                    }
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Basic Salary ({getCurrencySymbol()})
                  </label>
                  <input
                    type="number"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. 200000"
                    value={newBand.basicSalary || ""}
                    onChange={(e) =>
                      setNewBand((p) => ({
                        ...p,
                        basicSalary: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Brief description…"
                    value={newBand.description}
                    onChange={(e) =>
                      setNewBand((p) => ({ ...p, description: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setAddBandOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={addBand}
                disabled={!newBand.gradeName.trim()}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Create Band
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ComponentModal */}
      {modalBand && (
        <ComponentModal
          band={modalBand}
          initial={editComp}
          onSave={(comp) => saveComponent(modalBand.id, comp)}
          onClose={() => {
            setModalBand(null);
            setEditComp(null);
          }}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Component
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Are you sure you want to delete{" "}
              <strong>{deleteTarget.comp.name}</strong>? This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  deleteComponent(deleteTarget.bandId, deleteTarget.comp.id)
                }
                className="px-4 py-2 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700"
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
