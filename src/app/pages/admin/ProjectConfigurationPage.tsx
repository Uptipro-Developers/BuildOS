import { useEffect, useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  User,
  Users,
  Layers,
  CheckCircle2,
  AlertCircle,
  Lock,
} from "lucide-react";
import {
  getUsers,
  getProcessWorkflows,
  createProcessWorkflow,
  updateProcessWorkflow,
  deleteProcessWorkflow,
  getProcessCatalog,
  type ProcessWorkflow,
} from "../../api/admin-extras";
import { toast } from "sonner";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import {
  getCurrencySymbol,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";

// ── Types ─────────────────────────────────────────────────────────────────────
type ApprovalType = "single" | "group" | "tier";

interface TierLevel {
  level: number;
  approver: string;
  condition: string;
}

interface ProcessCatalogItem {
  id: string;
  label: string;
  app: string;
  description: string;
  requiresApproval: boolean;
}

// ── Static approval workflow types ────────────────────────────────────────────
const APPROVAL_WORKFLOW_TYPES = [
  {
    key: "single" as ApprovalType,
    code: "WT-01",
    name: "Single Approval",
    description:
      "One designated person must approve the request. Simplest and fastest.",
    icon: User,
    color: "bg-blue-50 border-blue-200 text-blue-700",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    example: "e.g. Line manager approves leave request",
  },
  {
    key: "group" as ApprovalType,
    code: "WT-02",
    name: "Group Approval",
    description:
      "A defined group or team must approve. Any member OR all members may be required.",
    icon: Users,
    color: "bg-purple-50 border-purple-200 text-purple-700",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    example: "e.g. Any director from the Finance Committee approves expense",
  },
  {
    key: "tier" as ApprovalType,
    code: "WT-03",
    name: "Tier Approval",
    description:
      "Multi-level sequential approval. Each level must approve before advancing to the next.",
    icon: Layers,
    color: "bg-amber-50 border-amber-200 text-amber-700",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    example: "e.g. Supervisor → Finance Manager → CFO for high-value budgets",
  },
];

// ── Extended process catalog (hardcoded) ─────────────────────────────────────
const PROCESS_CATALOG: ProcessCatalogItem[] = [
  // Procurement
  {
    id: "pc-001",
    label: "Create Purchase Request",
    app: "Procurement",
    description: "Initiate a request to procure materials or services",
    requiresApproval: true,
  },
  {
    id: "pc-002",
    label: "Approve Purchase Order",
    app: "Procurement",
    description: "Authorize a purchase order before sending to supplier",
    requiresApproval: true,
  },
  {
    id: "pc-003",
    label: "Send RFQ to Supplier",
    app: "Procurement",
    description: "Dispatch a request for quotation to selected vendors",
    requiresApproval: false,
  },
  {
    id: "pc-004",
    label: "Goods Receipt",
    app: "Procurement",
    description: "Record delivery and confirm goods match PO",
    requiresApproval: false,
  },
  {
    id: "pc-005",
    label: "Invoice Processing",
    app: "Procurement",
    description: "Match and process supplier invoices against POs",
    requiresApproval: true,
  },
  {
    id: "pc-006",
    label: "Supplier Payment",
    app: "Procurement",
    description: "Disburse funds to suppliers upon invoice approval",
    requiresApproval: true,
  },
  // Finance
  {
    id: "fc-001",
    label: "Journal Entry",
    app: "Finance",
    description: "Post manual accounting entries to the ledger",
    requiresApproval: true,
  },
  {
    id: "fc-002",
    label: "Approve Expense",
    app: "Finance",
    description: "Authorize employee expense claims and reimbursements",
    requiresApproval: true,
  },
  {
    id: "fc-003",
    label: "Budget Allocation",
    app: "Finance",
    description: "Set and distribute budget lines across departments",
    requiresApproval: true,
  },
  {
    id: "fc-004",
    label: "WHT Remittance",
    app: "Finance",
    description: "File and remit withholding tax to FIRS",
    requiresApproval: true,
  },
  {
    id: "fc-005",
    label: "Bank Reconciliation",
    app: "Finance",
    description: "Match system records against bank statement",
    requiresApproval: false,
  },
  // HR
  {
    id: "hr-001",
    label: "Approve Leave Request",
    app: "HR",
    description: "Approve or reject employee time-off applications",
    requiresApproval: true,
  },
  {
    id: "hr-002",
    label: "Create Payroll",
    app: "HR",
    description: "Generate monthly payroll runs for all staff",
    requiresApproval: true,
  },
  {
    id: "hr-003",
    label: "Salary Advance",
    app: "HR",
    description: "Process employee requests for advance salary payments",
    requiresApproval: true,
  },
  {
    id: "hr-004",
    label: "Employee Onboarding",
    app: "HR",
    description: "Initiate and track new hire onboarding steps",
    requiresApproval: false,
  },
  {
    id: "hr-005",
    label: "Appraisal Review",
    app: "HR",
    description: "Manage performance review cycles and ratings",
    requiresApproval: true,
  },
  // ESS
  {
    id: "es-001",
    label: "Expense Claim",
    app: "ESS",
    description: "Submit and track employee out-of-pocket expense claims",
    requiresApproval: true,
  },
  {
    id: "es-002",
    label: "Travel Advance",
    app: "ESS",
    description: "Request pre-trip cash advance for business travel",
    requiresApproval: true,
  },
  {
    id: "es-003",
    label: "Reimbursement",
    app: "ESS",
    description: "Process and pay out approved expense reimbursements",
    requiresApproval: false,
  },
  // Projects
  {
    id: "ct-001",
    label: "Create Project",
    app: "Projects",
    description: "Register a new project with scope, budget, and timeline",
    requiresApproval: true,
  },
  {
    id: "ct-002",
    label: "Approve Project Budget",
    app: "Projects",
    description: "Authorize total project expenditure limits",
    requiresApproval: true,
  },
  {
    id: "ct-003",
    label: "Assign Workforce",
    app: "Projects",
    description: "Allocate personnel to project tasks and sites",
    requiresApproval: false,
  },
  {
    id: "ct-004",
    label: "Milestone Approval",
    app: "Projects",
    description: "Sign off on completion of project milestones",
    requiresApproval: true,
  },
  {
    id: "ct-005",
    label: "Contract Revenue",
    app: "Projects",
    description: "Recognize revenue against contract milestones billed",
    requiresApproval: true,
  },
  // Storefront
  {
    id: "sf-001",
    label: "Material Transfer",
    app: "Storefront",
    description: "Move materials between store locations or to site",
    requiresApproval: false,
  },
  {
    id: "sf-002",
    label: "Stock Adjustment",
    app: "Storefront",
    description: "Reconcile physical count with system stock levels",
    requiresApproval: true,
  },
  {
    id: "sf-003",
    label: "Issue to Site",
    app: "Storefront",
    description: "Record material issues from store to project site",
    requiresApproval: false,
  },
  {
    id: "sf-004",
    label: "Send for Procurement",
    app: "Storefront",
    description: "Trigger a procurement request for low/out-of-stock items",
    requiresApproval: false,
  },
];

const CATALOG_APP_COLORS: Record<string, string> = {
  Procurement: "bg-blue-100 text-blue-700 border-blue-200",
  Finance: "bg-emerald-100 text-emerald-700 border-emerald-200",
  HR: "bg-purple-100 text-purple-700 border-purple-200",
  ESS: "bg-teal-100 text-teal-700 border-teal-200",
  Projects: "bg-amber-100 text-amber-700 border-amber-200",
  // Legacy label kept so previously-saved workflows still render correctly.
  Construction: "bg-amber-100 text-amber-700 border-amber-200",
  Storefront: "bg-orange-100 text-orange-700 border-orange-200",
  Admin: "bg-indigo-100 text-indigo-700 border-indigo-200",
};

// Map the backend's lowercase app keys to the display labels used above so the
// Process List groups real module processes under consistent headings.
const APP_DISPLAY_LABELS: Record<string, string> = {
  procurement: "Procurement",
  finance: "Finance",
  hr: "HR",
  ess: "ESS",
  construction: "Projects",
  storefront: "Storefront",
  admin: "Admin",
};

function normalizeCatalogItem(item: ProcessCatalogItem): ProcessCatalogItem {
  const key = String(item.app ?? "").trim();
  return {
    ...item,
    app: APP_DISPLAY_LABELS[key.toLowerCase()] ?? key,
    description: item.description ?? "",
    requiresApproval: item.requiresApproval !== false,
  };
}

function TypeBadge({ type }: { type: ApprovalType }) {
  const map = {
    single: "bg-blue-100 text-blue-700",
    group: "bg-purple-100 text-purple-700",
    tier: "bg-amber-100 text-amber-700",
  };
  const labels = { single: "Single", group: "Group", tier: "Tier" };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${map[type]}`}>
      {labels[type]}
    </span>
  );
}

// ── Tier approval condition editor ────────────────────────────────────
type TierConditionMode = "all" | "above" | "upto" | "between" | "custom";

interface TierConditionState {
  mode: TierConditionMode;
  amount: string;
  amount2: string;
  customText: string;
}

const TIER_CONDITION_OPTIONS: { value: TierConditionMode; label: string }[] = [
  { value: "all", label: "All amounts" },
  { value: "above", label: "Above amount" },
  { value: "upto", label: "Up to amount" },
  { value: "between", label: "Between amounts" },
  { value: "custom", label: "Custom…" },
];

function digitsOnly(value: string): string {
  return value.replace(/[^\d.]/g, "");
}

function formatConditionAmount(value: string): string {
  const numeric = Number(digitsOnly(value));
  return value !== "" && Number.isFinite(numeric)
    ? formatNumberByGeneralSettings(numeric)
    : value;
}

// Parse a stored free-text condition back into structured fields so existing
// workflows remain editable through the new controls (falls back to custom).
function parseTierCondition(raw: string): TierConditionState {
  const text = (raw ?? "").trim();
  const base: TierConditionState = {
    mode: "all",
    amount: "",
    amount2: "",
    customText: "",
  };
  if (!text || /^all\b/i.test(text)) return base;

  const numbers = (text.match(/[\d][\d.,]*/g) ?? []).map(digitsOnly);

  if (/^(above|over|greater|more than)/i.test(text) && numbers[0]) {
    return { ...base, mode: "above", amount: numbers[0] };
  }
  if (/^(up to|below|under|less than|max)/i.test(text) && numbers[0]) {
    return { ...base, mode: "upto", amount: numbers[0] };
  }
  if (/^between/i.test(text) && numbers[0] && numbers[1]) {
    return { ...base, mode: "between", amount: numbers[0], amount2: numbers[1] };
  }
  return { ...base, mode: "custom", customText: text };
}

// Compose a human-readable condition. Incomplete numeric conditions resolve to
// an empty string so the existing "each tier needs a condition" validation can
// catch them.
function composeTierCondition(state: TierConditionState): string {
  const sym = getCurrencySymbol();
  switch (state.mode) {
    case "all":
      return "All amounts";
    case "above":
      return state.amount
        ? `Above ${sym}${formatConditionAmount(state.amount)}`
        : "";
    case "upto":
      return state.amount
        ? `Up to ${sym}${formatConditionAmount(state.amount)}`
        : "";
    case "between":
      return state.amount && state.amount2
        ? `Between ${sym}${formatConditionAmount(state.amount)} and ${sym}${formatConditionAmount(state.amount2)}`
        : "";
    case "custom":
      return state.customText.trim();
    default:
      return "";
  }
}

function TierConditionField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [state, setState] = useState<TierConditionState>(() =>
    parseTierCondition(value),
  );

  const update = (patch: Partial<TierConditionState>) => {
    const next = { ...state, ...patch };
    setState(next);
    onChange(composeTierCondition(next));
  };

  const symbol = getCurrencySymbol();
  const preview = composeTierCondition(state);

  return (
    <div className="space-y-1.5">
      <select
        value={state.mode}
        onChange={(e) => update({ mode: e.target.value as TierConditionMode })}
        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
      >
        {TIER_CONDITION_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {(state.mode === "above" || state.mode === "upto") && (
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {symbol}
          </span>
          <input
            inputMode="decimal"
            value={state.amount}
            onChange={(e) => update({ amount: digitsOnly(e.target.value) })}
            placeholder="0"
            className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
      )}

      {state.mode === "between" && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              {symbol}
            </span>
            <input
              inputMode="decimal"
              value={state.amount}
              onChange={(e) => update({ amount: digitsOnly(e.target.value) })}
              placeholder="Min"
              className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
          <span className="text-xs text-gray-400">and</span>
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              {symbol}
            </span>
            <input
              inputMode="decimal"
              value={state.amount2}
              onChange={(e) => update({ amount2: digitsOnly(e.target.value) })}
              placeholder="Max"
              className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
        </div>
      )}

      {state.mode === "custom" && (
        <input
          value={state.customText}
          onChange={(e) => update({ customText: e.target.value })}
          placeholder="Describe the condition"
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      )}

      {state.mode !== "all" && state.mode !== "custom" && (
        <p className="text-[11px] text-gray-400">
          {preview
            ? `Applies when amount is: ${preview}`
            : "Enter an amount to complete this condition."}
        </p>
      )}
    </div>
  );
}

// ── Configure Workflow Modal ──────────────────────────────────────────────────
function ConfigureWorkflowModal({
  existing,
  availableProcesses,
  configuredProcessIds,
  availableUsers,
  onSave,
  onClose,
}: {
  existing?: ProcessWorkflow;
  availableProcesses: { id: string; label: string; app: string }[];
  configuredProcessIds: Set<string>;
  availableUsers: string[];
  onSave: (wf: ProcessWorkflow) => Promise<void>;
  onClose: () => void;
}) {
  const existingProcess = existing
    ? availableProcesses.find((p) => p.id === existing.processId)
    : undefined;
  // When adding, default to the first process that doesn't already have a
  // workflow so the form never opens on a disabled (already-configured) option.
  const firstSelectableProcess =
    availableProcesses.find((p) => !configuredProcessIds.has(p.id)) ??
    availableProcesses[0];
  const hasSelectableProcess =
    !!existing ||
    availableProcesses.some((p) => !configuredProcessIds.has(p.id));
  const [selectedProcess, setSelectedProcess] = useState(
    existingProcess?.label ??
      existing?.process ??
      firstSelectableProcess?.label ??
      "",
  );
  const [selectedApp, setSelectedApp] = useState(
    existingProcess?.app ?? existing?.app ?? firstSelectableProcess?.app ?? "",
  );
  const [wfType, setWfType] = useState<ApprovalType>(
    existing?.workflowType ?? "single",
  );
  const [approver, setApprover] = useState(existing?.approver ?? "");
  const [groupApprovers, setGroupApprovers] = useState<string[]>(
    existing?.groupApprovers ?? [],
  );
  const [groupApprovalMode, setGroupApprovalMode] = useState<"any" | "all">(
    existing?.groupApprovalMode ?? "all",
  );
  const [tierLevels, setTierLevels] = useState<TierLevel[]>(
    existing?.tierLevels ?? [
      { level: 1, approver: "", condition: "All amounts" },
    ],
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const toggleGroup = (user: string) => {
    setGroupApprovers((prev) =>
      prev.includes(user) ? prev.filter((u) => u !== user) : [...prev, user],
    );
  };

  const addTierLevel = () => {
    setTierLevels((prev) => [
      ...prev,
      { level: prev.length + 1, approver: "", condition: "All amounts" },
    ]);
  };

  const handleSave = async () => {
    const selectedCatalogProcess = availableProcesses.find(
      (p) => p.label === selectedProcess && p.app === selectedApp,
    );
    if (!selectedCatalogProcess) {
      setFormError("Please select a valid process.");
      return;
    }
    if (wfType === "single" && !approver.trim()) {
      setFormError("Please select an approver.");
      return;
    }
    if (wfType === "group" && groupApprovers.length === 0) {
      setFormError("Please select at least one group approver.");
      return;
    }
    if (
      wfType === "tier" &&
      tierLevels.some(
        (level) => !level.approver.trim() || !level.condition.trim(),
      )
    ) {
      setFormError("Each tier level requires an approver and a condition.");
      return;
    }
    if (wfType === "tier") {
      const approvers = tierLevels.map((l) => l.approver.trim());
      const hasDuplicate = approvers.some(
        (a, idx) => a && approvers.indexOf(a) !== idx,
      );
      if (hasDuplicate) {
        setFormError("Each approval level must have a different approver.");
        return;
      }
    }

    setSaving(true);
    setFormError(null);
    try {
      await onSave({
        id: existing?.id ?? `wf_${Date.now()}`,
        processId: selectedCatalogProcess.id,
        process: selectedProcess,
        app: selectedApp,
        workflowType: wfType,
        approver: wfType === "single" ? approver : undefined,
        groupApprovers: wfType === "group" ? groupApprovers : undefined,
        groupApprovalMode: wfType === "group" ? groupApprovalMode : undefined,
        tierLevels: wfType === "tier" ? tierLevels : undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {existing ? "Edit" : "Configure"} Process Workflow
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Link a process to an approval workflow
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {formError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}
          {!hasSelectableProcess && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Every process already has an approval workflow. Edit or delete an
              existing workflow instead of adding a new one.
            </p>
          )}
          {/* Select process */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Process
            </label>
            <select
              value={selectedProcess}
              onChange={(e) => {
                const proc = availableProcesses.find(
                  (p) => p.label === e.target.value,
                );
                setSelectedProcess(e.target.value);
                setSelectedApp(proc?.app ?? "");
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {availableProcesses.map((p) => {
                const alreadyConfigured =
                  configuredProcessIds.has(p.id) &&
                  p.id !== existing?.processId;
                return (
                  <option
                    key={p.id}
                    value={p.label}
                    disabled={alreadyConfigured}
                  >
                    [{p.app}] {p.label}
                    {alreadyConfigured ? " — workflow configured" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Approval type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Approval Workflow Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {APPROVAL_WORKFLOW_TYPES.map((wt) => (
                <button
                  key={wt.key}
                  onClick={() => setWfType(wt.key)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-colors ${
                    wfType === wt.key
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <wt.icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{wt.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Single approver */}
          {wfType === "single" && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Approver
              </label>
              <select
                value={approver}
                onChange={(e) => setApprover(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select approver…</option>
                {availableUsers.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Group approvers */}
          {wfType === "group" && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Group Approvers{" "}
                <span className="text-gray-400">(select multiple)</span>
              </label>
              {/* Approval requirement: ANY (OR) vs ALL (AND) */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setGroupApprovalMode("any")}
                  className={`flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg border text-left transition-colors ${
                    groupApprovalMode === "any"
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span className="text-xs font-semibold">Any (OR)</span>
                  <span className="text-[11px] text-gray-400">
                    Any one approver can approve
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setGroupApprovalMode("all")}
                  className={`flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg border text-left transition-colors ${
                    groupApprovalMode === "all"
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span className="text-xs font-semibold">All (AND)</span>
                  <span className="text-[11px] text-gray-400">
                    Every approver must approve
                  </span>
                </button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {availableUsers.map((u) => (
                  <label
                    key={u}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={groupApprovers.includes(u)}
                      onChange={() => toggleGroup(u)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">{u}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Tier levels */}
          {wfType === "tier" && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Approval Levels
              </label>
              <div className="space-y-3">
                {tierLevels.map((level, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-1">
                      {level.level}
                    </div>
                    <div className="flex-1 space-y-2">
                      <select
                        value={level.approver}
                        onChange={(e) =>
                          setTierLevels((prev) =>
                            prev.map((l, li) =>
                              li === i ? { ...l, approver: e.target.value } : l,
                            ),
                          )
                        }
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      >
                        <option value="">Select approver…</option>
                        {availableUsers.map((u) => {
                          const takenByOtherLevel = tierLevels.some(
                            (l, li) => li !== i && l.approver === u,
                          );
                          return (
                            <option
                              key={u}
                              value={u}
                              disabled={takenByOtherLevel}
                            >
                              {u}
                              {takenByOtherLevel ? " — already an approver" : ""}
                            </option>
                          );
                        })}
                      </select>
                      <TierConditionField
                        value={level.condition}
                        onChange={(next) =>
                          setTierLevels((prev) =>
                            prev.map((l, li) =>
                              li === i ? { ...l, condition: next } : l,
                            ),
                          )
                        }
                      />
                    </div>
                    {tierLevels.length > 1 && (
                      <button
                        onClick={() =>
                          setTierLevels((prev) =>
                            prev
                              .filter((_, li) => li !== i)
                              .map((l, li) => ({ ...l, level: li + 1 })),
                          )
                        }
                        className="text-gray-300 hover:text-red-400 mt-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addTierLevel}
                  className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Level
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasSelectableProcess}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? existing
                ? "Saving..."
                : "Adding..."
              : existing
                ? "Save Changes"
                : "Add Workflow"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function ProjectConfigurationPage() {
  const [activeTab, setActiveTab] = useState<"workflows" | "process_list">(
    "workflows",
  );
  const [workflows, setWorkflows] = useState<ProcessWorkflow[]>([]);
  const [showWfModal, setShowWfModal] = useState(false);
  const [editingWf, setEditingWf] = useState<ProcessWorkflow | undefined>(
    undefined,
  );
  const [catalog, setCatalog] = useState<ProcessCatalogItem[]>(
    PROCESS_CATALOG,
  );
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(true);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [expandedWfId, setExpandedWfId] = useState<string | null>(null);
  const [catalogAppFilter, setCatalogAppFilter] = useState("All");
  const [deletingWf, setDeletingWf] = useState<ProcessWorkflow | null>(null);
  const [isDeletingWf, setIsDeletingWf] = useState(false);

  const availableProcesses = catalog.map((p) => ({
    id: p.id,
    label: p.label,
    app: p.app,
  }));

  const catalogApps = [
    "All",
    ...Array.from(new Set(catalog.map((p) => p.app))),
  ];
  const filteredCatalog =
    catalogAppFilter === "All"
      ? catalog
      : catalog.filter((p) => p.app === catalogAppFilter);
  const catalogByApp = filteredCatalog.reduce<
    Record<string, ProcessCatalogItem[]>
  >((acc, p) => {
    if (!acc[p.app]) acc[p.app] = [];
    acc[p.app].push(p);
    return acc;
  }, {});

  useEffect(() => {
    getUsers()
      .then((items) => {
        const names = items
          .map((u) => String(u.name ?? "").trim())
          .filter(Boolean);
        setAvailableUsers(Array.from(new Set(names)));
      })
      .catch(() => setAvailableUsers([]));
  }, []);

  // Load the live process catalog so the Process List reflects the actual
  // developed modules configured in Admin. Falls back to the bundled catalog
  // if the request fails so the page is never empty.
  useEffect(() => {
    getProcessCatalog()
      .then((items) => {
        if (Array.isArray(items) && items.length > 0) {
          setCatalog(items.map(normalizeCatalogItem));
        }
      })
      .catch(() => setCatalog(PROCESS_CATALOG));
  }, []);

  useEffect(() => {
    getProcessWorkflows()
      .then((items) => {
        setWorkflows(items);
        setWorkflowError(null);
      })
      .catch(() => {
        setWorkflows([]);
        setWorkflowError("Unable to load process workflows. Please refresh.");
      })
      .finally(() => setWorkflowsLoading(false));
  }, []);

  const TABS = [
    { key: "workflows" as const, label: "Process Workflows" },
    { key: "process_list" as const, label: "Process List" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Process Configuration
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Configure approval workflows, process types, and status lifecycles
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t.key
                ? "border-indigo-500 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PROCESS LIST TAB ── */}
      {activeTab === "process_list" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {catalog.length} system processes across {catalogApps.length - 1}{" "}
              applications
            </p>
            <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
              {catalogApps.map((app) => (
                <button
                  key={app}
                  onClick={() => setCatalogAppFilter(app)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                    catalogAppFilter === app
                      ? "bg-indigo-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {app}
                </button>
              ))}
            </div>
          </div>

          {Object.entries(catalogByApp).map(([app, processes]) => (
            <div
              key={app}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <div className="flex items-center gap-3 px-5 py-3 border-b bg-gray-50">
                <span
                  className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${CATALOG_APP_COLORS[app] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}
                >
                  {app}
                </span>
                <span className="text-xs text-gray-400">
                  {processes.length} processes
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {processes.map((proc) => (
                  <div
                    key={proc.id}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800">
                          {proc.label}
                        </p>
                        <span className="text-xs font-mono text-gray-400">
                          {proc.id}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {proc.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* The "Requires Approval" tag is driven solely by whether
                          an approval workflow has been configured for the
                          process in the Process Workflows tab. Processes without
                          a workflow are not marked as requiring approval. */}
                      {workflows.some((w) => w.processId === proc.id) ? (
                        <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Requires Approval
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                          No approval required
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PROCESS WORKFLOWS TAB ── */}
      {activeTab === "workflows" && (
        <div className="space-y-6">
          {/* Approval Workflow Types — static, read-only */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">
                Approval Workflow Types
              </h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded ml-1">
                Read-only
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {APPROVAL_WORKFLOW_TYPES.map((wt) => (
                <div
                  key={wt.key}
                  className={`rounded-xl border p-4 ${wt.color}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${wt.iconBg}`}>
                      <wt.icon className={`w-5 h-5 ${wt.iconColor}`} />
                    </div>
                    <div>
                      <span className="text-xs font-mono text-gray-500">
                        {wt.code}
                      </span>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {wt.name}
                      </h3>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {wt.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-2 italic">
                    {wt.example}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Process Workflow Configuration — dynamic */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Process Workflow Configuration
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Link each process to an approval workflow type and define
                  approvers
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingWf(undefined);
                  setShowWfModal(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Process Workflow
              </button>
            </div>

            {workflowsLoading && (
              <p className="px-5 py-4 text-sm text-gray-500">
                Loading process workflows...
              </p>
            )}
            {workflowError && (
              <p className="px-5 py-4 text-sm text-red-600">{workflowError}</p>
            )}

            {workflows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                <AlertCircle className="w-8 h-8 text-gray-300" />
                <p className="text-sm text-gray-500">
                  No process workflows configured yet.
                </p>
                <button
                  onClick={() => setShowWfModal(true)}
                  className="text-sm text-indigo-600 font-medium hover:underline"
                >
                  Configure first workflow
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {workflows.map((wf) => {
                  const isExpanded = expandedWfId === wf.id;
                  return (
                    <div key={wf.id}>
                      <div className="flex items-center px-5 py-4 gap-4 hover:bg-gray-50/60 group transition-colors">
                        <button
                          onClick={() =>
                            setExpandedWfId(isExpanded ? null : wf.id)
                          }
                          className="text-gray-400 hover:text-gray-600 shrink-0"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">
                              {wf.process}
                            </p>
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                                CATALOG_APP_COLORS[wf.app] ??
                                "bg-gray-100 text-gray-600 border-gray-200"
                              }`}
                            >
                              {wf.app}
                            </span>
                          </div>
                        </div>
                        <TypeBadge type={wf.workflowType} />
                        {wf.workflowType === "single" && wf.approver && (
                          <span className="text-xs text-gray-500 hidden md:block">
                            {wf.approver}
                          </span>
                        )}
                        {wf.workflowType === "group" && (
                          <span className="text-xs text-gray-500 hidden md:block">
                            {wf.groupApprovers?.length ?? 0} approvers ·{" "}
                            {wf.groupApprovalMode === "any"
                              ? "Any (OR)"
                              : "All (AND)"}
                          </span>
                        )}
                        {wf.workflowType === "tier" && (
                          <span className="text-xs text-gray-500 hidden md:block">
                            {wf.tierLevels?.length ?? 0} levels
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingWf(wf);
                              setShowWfModal(true);
                            }}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingWf(wf)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-5 pb-4 ml-12 space-y-2">
                          {wf.workflowType === "single" && (
                            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                              <User className="w-4 h-4 text-blue-500 shrink-0" />
                              <div>
                                <p className="text-xs text-gray-500">
                                  Single Approver
                                </p>
                                <p className="text-sm font-medium text-gray-800">
                                  {wf.approver || "—"}
                                </p>
                              </div>
                            </div>
                          )}
                          {wf.workflowType === "group" && (
                            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-gray-500">
                                  Group Approvers
                                </p>
                                <span className="text-[11px] font-semibold text-purple-700 bg-white border border-purple-200 px-2 py-0.5 rounded-full">
                                  {wf.groupApprovalMode === "any"
                                    ? "Any (OR) required"
                                    : "All (AND) required"}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {(wf.groupApprovers ?? []).map((u) => (
                                  <span
                                    key={u}
                                    className="px-2 py-0.5 bg-white border border-purple-200 text-purple-700 text-xs rounded-full"
                                  >
                                    {u}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {wf.workflowType === "tier" && (
                            <div className="space-y-2">
                              {(wf.tierLevels ?? []).map((level) => (
                                <div
                                  key={level.level}
                                  className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100"
                                >
                                  <div className="w-6 h-6 rounded-full bg-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                    {level.level}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-800">
                                      {level.approver || "—"}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      {level.condition}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {showWfModal && (
        <ConfigureWorkflowModal
          existing={editingWf}
          availableProcesses={availableProcesses}
          configuredProcessIds={new Set(workflows.map((w) => w.processId))}
          availableUsers={availableUsers}
          onSave={async (wf) => {
            const duplicate = workflows.find(
              (item) => item.processId === wf.processId && item.id !== wf.id,
            );
            if (duplicate) {
              toast.error("A workflow already exists for this process.");
              throw new Error("Duplicate process workflow");
            }

            if (editingWf) {
              try {
                const updated = await updateProcessWorkflow(wf.id, {
                  processId: wf.processId,
                  process: wf.process,
                  app: wf.app,
                  workflowType: wf.workflowType,
                  approver: wf.approver,
                  groupApprovers: wf.groupApprovers,
                  groupApprovalMode: wf.groupApprovalMode,
                  tierLevels: wf.tierLevels,
                });
                setWorkflows((prev) =>
                  prev.map((w) => (w.id === updated.id ? updated : w)),
                );
                setWorkflowError(null);
                toast.success("Workflow updated.");
              } catch {
                setWorkflowError(
                  "Failed to update workflow. Please try again.",
                );
                toast.error("Failed to update workflow.");
                throw new Error("Failed to update workflow");
              }
              return;
            }

            try {
              const created = await createProcessWorkflow({
                processId: wf.processId,
                process: wf.process,
                app: wf.app,
                workflowType: wf.workflowType,
                approver: wf.approver,
                groupApprovers: wf.groupApprovers,
                groupApprovalMode: wf.groupApprovalMode,
                tierLevels: wf.tierLevels,
              });
              setWorkflows((prev) => [...prev, created]);
              setWorkflowError(null);
              toast.success("Workflow created.");
            } catch {
              setWorkflowError("Failed to create workflow. Please try again.");
              toast.error("Failed to create workflow.");
              throw new Error("Failed to create workflow");
            }
          }}
          onClose={() => {
            setShowWfModal(false);
            setEditingWf(undefined);
          }}
        />
      )}

      <ConfirmationModal
        isOpen={deletingWf !== null}
        title="Delete process workflow?"
        description={
          deletingWf
            ? `The approval workflow for "${deletingWf.process}" will be permanently deleted. This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        isDangerous
        isLoading={isDeletingWf}
        onConfirm={async () => {
          if (!deletingWf) return;
          setIsDeletingWf(true);
          try {
            await deleteProcessWorkflow(deletingWf.id);
            setWorkflows((prev) => prev.filter((w) => w.id !== deletingWf.id));
            setWorkflowError(null);
            toast.success("Workflow deleted.");
            setDeletingWf(null);
          } catch {
            setWorkflowError("Failed to delete workflow. Please try again.");
            toast.error("Failed to delete workflow.");
          } finally {
            setIsDeletingWf(false);
          }
        }}
        onCancel={() => setDeletingWf(null)}
      />
    </div>
  );
}
