import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { getCurrencySymbol } from "../../utils/generalSettings";
import {
  CheckCircle,
  AlertTriangle,
  Send,
  ChevronDown,
  ArrowLeft,
  Upload,
  FileText,
  X,
  Search,
  Package,
  DollarSign,
  Calendar,
  PlusCircle,
  Wrench,
  Edit2,
} from "lucide-react";
import { IssueForm } from "../../components/IssueForm";
import { ChangeRequestForm } from "../../components/ChangeRequestForm";
import { AttachmentsSection } from "../../components/AttachmentsSection";
import { ApprovalPipeline } from "../../components/ApprovalPipeline";
import {
  getWorkflows,
  getPipelineForRequest,
  type PipelineStep,
} from "../../store/workflowConfig";
import { useHRConfig } from "../../store/hrConfig";
import { createExpense } from "../../api/expenses";
import { createLeaveRequest } from "../../api/leave-requests";
import { createMaterialRequest } from "../../api/materials";
import { fetchProjects } from "../../api/projects";
import { useAuthUser } from "../../utils/useAuthUser";

// Shared material catalogue with stock status — mirrors Storefront inventory
type StockLevel = "in_stock" | "low_stock" | "out_of_stock";

const MATERIAL_CATALOGUE: { name: string; stock: StockLevel }[] = [
  { name: "Cement (50kg bag)", stock: "low_stock" },
  { name: "Steel Rebar Y16", stock: "low_stock" },
  { name: "Steel Rebar Y12", stock: "in_stock" },
  { name: "Binding Wire", stock: "in_stock" },
  { name: "Concrete Block 9 Inch", stock: "in_stock" },
  { name: "Formwork Plywood", stock: "low_stock" },
  { name: "PVC Pipes 2 Inch", stock: "out_of_stock" },
  { name: "Sand", stock: "out_of_stock" },
  { name: "Flush Doors", stock: "in_stock" },
  { name: "2.5mm Twin Cable", stock: "in_stock" },
  { name: "Electrical Conduit 25mm", stock: "out_of_stock" },
  { name: "Granite Tiles 600x600", stock: "out_of_stock" },
  { name: "Paint (Emulsion 20L)", stock: "in_stock" },
  { name: "Nails (Assorted)", stock: "in_stock" },
  { name: "Gravel / Aggregate", stock: "low_stock" },
  { name: "Plaster of Paris", stock: "in_stock" },
  { name: "Aluminium Window Frame", stock: "in_stock" },
  { name: "Ceramic Floor Tiles", stock: "in_stock" },
  { name: "Reinforcing Mesh", stock: "in_stock" },
  { name: "Glass Panel 6mm", stock: "low_stock" },
];

const STOCK_LABEL: Record<StockLevel, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};
const STOCK_BADGE: Record<StockLevel, string> = {
  in_stock: "bg-green-100 text-green-700",
  low_stock: "bg-amber-100 text-amber-700",
  out_of_stock: "bg-red-100 text-red-700",
};

function MaterialCombobox({
  value,
  onChange,
  onStockChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onStockChange: (s: StockLevel | null) => void;
  error?: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const matches =
    query.length > 0
      ? MATERIAL_CATALOGUE.filter((m) =>
          m.name.toLowerCase().includes(query.toLowerCase()),
        )
      : MATERIAL_CATALOGUE;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(m: { name: string; stock: StockLevel }) {
    setQuery(m.name);
    onChange(m.name);
    onStockChange(m.stock);
    setOpen(false);
  }

  function clearField() {
    setQuery("");
    onChange("");
    onStockChange(null);
  }

  return (
    <div ref={ref} className="relative">
      <div
        className={`flex items-center border rounded-md px-3 py-2.5 gap-2 focus-within:ring-2 focus-within:ring-teal-500 ${error ? "border-red-400" : "border-gray-300"}`}
      >
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            onStockChange(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search inventory…"
          className="flex-1 text-sm outline-none bg-transparent"
        />
        {query && (
          <button
            type="button"
            onClick={clearField}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {matches.length > 0 ? (
              matches.map((m) => (
                <button
                  key={m.name}
                  type="button"
                  onMouseDown={() => select(m)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-teal-50 transition-colors flex items-center justify-between ${value === m.name ? "bg-teal-50 text-teal-700 font-medium" : "text-gray-700"}`}
                >
                  <span>{m.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${STOCK_BADGE[m.stock]}`}
                  >
                    {STOCK_LABEL[m.stock]}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500">
                No materials found for "{query}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type Tab = "material" | "finance" | "leave" | "issue" | "change";

// ─── Shared Attachments Component ────────────────────────────────────────────
// (moved to src/app/components/AttachmentsSection.tsx)

const priorities = [
  { value: "low", label: "Low", color: "text-green-700 bg-green-50" },
  { value: "medium", label: "Medium", color: "text-yellow-700 bg-yellow-50" },
  { value: "high", label: "High", color: "text-orange-700 bg-orange-50" },
  { value: "urgent", label: "Urgent", color: "text-red-700 bg-red-50" },
];

function SuccessCard({
  title,
  id,
  onBack,
  pipelineSteps,
}: {
  title: string;
  id: string;
  onBack: () => void;
  pipelineSteps: PipelineStep[];
}) {
  const navigate = useNavigate();
  return (
    <div className="max-w-sm mx-auto mt-20 text-center">
      <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
        <CheckCircle className="w-7 h-7 text-green-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500 mt-2">
        Reference ID:{" "}
        <span className="font-mono font-medium text-gray-700">{id}</span>
      </p>
      <p className="text-sm text-gray-500 mt-1">
        Your request has been submitted and is pending approval.
      </p>
      {pipelineSteps.length > 0 && (
        <div className="mt-6">
          <ApprovalPipeline
            steps={pipelineSteps}
            accentClass="bg-teal-600 border-teal-600"
            accentTextClass="text-teal-700"
          />
        </div>
      )}
      <div className="flex gap-3 mt-8 justify-center">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
        >
          Submit Another
        </button>
        <button
          onClick={() => navigate("/apps/ess/requests")}
          className="px-4 py-2 bg-teal-600 text-white rounded-md text-sm hover:bg-teal-700"
        >
          View My Requests
        </button>
      </div>
    </div>
  );
}

// ─── Material Creation Request (Out-of-Stock) ────────────────────────────────
function MaterialCreationForm({
  onSuccess,
}: {
  onSuccess: (id: string) => void;
}) {
  const [formState, setFormState] = useState({
    materialName: "",
    description: "",
    estimatedQty: "",
    unit: "pcs",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<File[]>([]);

  function validate() {
    const e: Record<string, string> = {};
    if (!formState.materialName.trim()) e.materialName = "Required";
    if (!formState.estimatedQty || Number(formState.estimatedQty) <= 0)
      e.estimatedQty = "Enter a valid quantity";
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    onSuccess("MCR-" + String(Math.floor(1000 + Math.random() * 8999)));
  }

  function field(name: keyof typeof formState, value: string) {
    setFormState((prev) => ({ ...prev, [name]: value }));
    if (errors[name])
      setErrors((prev) => {
        const x = { ...prev };
        delete x[name];
        return x;
      });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Info banner */}
      <div className="flex gap-3 bg-orange-50 border border-orange-200 rounded-xl p-4">
        <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-orange-800">
            Material Creation Request
          </p>
          <p className="text-xs text-orange-700 mt-0.5 leading-relaxed">
            This material is out of stock or does not exist in the catalogue.
            Your request will be sent to your <strong>Line Manager</strong> for
            approval, then the <strong>Store Manager</strong> will create and
            procure the material.
          </p>
        </div>
      </div>

      {/* Approval steps */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { step: "1", label: "Your Request", sub: "ESS Submission" },
          { step: "2", label: "Line Manager", sub: "Approves request" },
          { step: "3", label: "Store Manager", sub: "Creates & Procures" },
        ].map((s) => (
          <div
            key={s.step}
            className="bg-gray-50 rounded-xl p-3 border border-gray-200"
          >
            <div className="w-6 h-6 bg-teal-600 text-white rounded-full text-xs font-bold flex items-center justify-center mx-auto mb-1.5">
              {s.step}
            </div>
            <p className="text-xs font-semibold text-gray-800">{s.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Material Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Material Name<span className="text-red-500">*</span>
        </label>
        <input
          value={formState.materialName}
          onChange={(e) => field("materialName", e.target.value)}
          placeholder="e.g. Aluminium Roofing Sheet 0.55mm"
          className={`w-full border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.materialName ? "border-red-400" : "border-gray-300"}`}
        />
        {errors.materialName && (
          <p className="text-xs text-red-500 mt-1">{errors.materialName}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={formState.description}
          onChange={(e) => field("description", e.target.value)}
          rows={2}
          placeholder="Describe the material, specifications, brand preference…"
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
      </div>

      {/* Estimated Quantity + Unit */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estimated Quantity<span className="text-red-500">*</span>
          </label>
          <input
            value={formState.estimatedQty}
            onChange={(e) => field("estimatedQty", e.target.value)}
            type="number"
            min="1"
            placeholder="0"
            className={`w-full border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.estimatedQty ? "border-red-400" : "border-gray-300"}`}
          />
          {errors.estimatedQty && (
            <p className="text-xs text-red-500 mt-1">{errors.estimatedQty}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unit
          </label>
          <div className="relative">
            <select
              value={formState.unit}
              onChange={(e) => field("unit", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {[
                "pcs",
                "bags",
                "kg",
                "tonnes",
                "metres",
                "m²",
                "m³",
                "litres",
                "sets",
                "sheets",
                "rolls",
              ].map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Additional Notes{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={formState.notes}
          onChange={(e) => field("notes", e.target.value)}
          rows={2}
          placeholder="Any urgency, site requirements, or suggested supplier…"
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
      </div>

      <AttachmentsSection files={attachments} onChange={setAttachments} />

      <button
        type="submit"
        className="w-full bg-teal-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
      >
        <Send className="w-4 h-4" />
        Submit Material Creation Request
      </button>
    </form>
  );
}

// ─── Material Form (Normal & Out-of-Stock path) ───────────────────────────────
function MaterialForm({
  onSuccess,
  projects,
}: {
  onSuccess: (id: string) => void;
  projects: string[];
}) {
  const authUser = useAuthUser();
  const [requestKind, setRequestKind] = useState<"material" | "service">(
    "material",
  );
  const [selectedStock, setSelectedStock] = useState<StockLevel | null>(null);
  const [showCreationForm, setShowCreationForm] = useState(false);
  const [formState, setFormState] = useState({
    project: "",
    material: "",
    quantity: "",
    unit: "pcs",
    neededDate: "",
    priority: "medium",
    comments: "",
    // service-specific
    serviceType: "",
    serviceProvider: "",
    estimatedCost: "",
    serviceDate: "",
  });
  const [attachments, setAttachments] = useState<File[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!formState.project) e.project = "Required";
    if (requestKind === "material") {
      if (!formState.material) e.material = "Required";
      if (!formState.quantity || Number(formState.quantity) <= 0)
        e.quantity = "Enter a valid quantity";
      if (!formState.neededDate) e.neededDate = "Required";
    } else {
      if (!formState.serviceType) e.serviceType = "Required";
      if (!formState.serviceDate) e.serviceDate = "Required";
    }
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    if (requestKind === "service") {
      // No backend target for service requests yet — keep optimistic ack.
      onSuccess("SVC-" + String(Math.floor(1000 + Math.random() * 8999)));
      return;
    }
    setSubmitting(true);
    try {
      const created: any = await createMaterialRequest({
        reference: "MR-" + Date.now(),
        materialName: formState.material,
        unit: formState.unit,
        qty: Number(formState.quantity),
        storeName: "General Store",
        projectName: formState.project,
        priority:
          formState.priority === "high"
            ? "High"
            : formState.priority === "low"
              ? "Low"
              : "Normal",
        purpose: formState.comments,
        requestedBy: authUser.name || authUser.email || "Employee",
      });
      onSuccess(created?.id ?? "MR");
    } catch (err) {
      alert(
        (err as Error)?.message ||
          "Failed to submit material request. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function field(name: keyof typeof formState, value: string) {
    setFormState((prev) => ({ ...prev, [name]: value }));
    if (errors[name])
      setErrors((prev) => {
        const x = { ...prev };
        delete x[name];
        return x;
      });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Material / Service Toggle */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-gray-50 p-1 gap-1">
        <button
          type="button"
          onClick={() => {
            setRequestKind("material");
            setShowCreationForm(false);
            setSelectedStock(null);
            field("material", "");
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            requestKind === "material"
              ? "bg-white text-teal-700 shadow-sm border border-gray-200"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Package className="w-4 h-4" />
          Material Request
        </button>
        <button
          type="button"
          onClick={() => {
            setRequestKind("service");
            setShowCreationForm(false);
            setSelectedStock(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            requestKind === "service"
              ? "bg-white text-teal-700 shadow-sm border border-gray-200"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Wrench className="w-4 h-4" />
          Service Request
        </button>
      </div>

      {requestKind === "material" && showCreationForm ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setShowCreationForm(false);
              setSelectedStock(null);
              field("material", "");
            }}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" /> Back to material search
          </button>
          <MaterialCreationForm onSuccess={(id) => onSuccess(id)} />
        </div>
      ) : requestKind === "material" ? (
        <>
          {/* Project (shared) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project<span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={formState.project}
                onChange={(e) => field("project", e.target.value)}
                className={`w-full border rounded-md px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.project ? "border-red-400" : "border-gray-300"}`}
              >
                <option value="">Select a project…</option>
                {projects.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.project && (
              <p className="text-xs text-red-500 mt-1">{errors.project}</p>
            )}
          </div>

          {/* Material Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Material Name<span className="text-red-500">*</span>
            </label>
            <MaterialCombobox
              value={formState.material}
              onChange={(v) => field("material", v)}
              onStockChange={(s) => setSelectedStock(s)}
              error={errors.material}
            />
            {errors.material && (
              <p className="text-xs text-red-500 mt-1">{errors.material}</p>
            )}
          </div>

          {/* Stock level feedback */}
          {selectedStock === "low_stock" && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Low Stock
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Available but running low. Your request will proceed normally.
                  Storefront may raise a procurement order to replenish stock.
                </p>
              </div>
            </div>
          )}
          {selectedStock === "out_of_stock" && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Out of Stock
                  </p>
                  <p className="text-xs text-red-700 mt-0.5">
                    This material is currently unavailable. You cannot submit a
                    direct material request. Instead, submit a{" "}
                    <strong>Material Creation Request</strong> to initiate the
                    procurement process through your Line Manager and Store
                    Manager.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreationForm(true)}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Request New Material
              </button>
            </div>
          )}

          {/* Quantity + Unit — only when not out of stock */}
          {selectedStock !== "out_of_stock" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity<span className="text-red-500">*</span>
                  </label>
                  <input
                    value={formState.quantity}
                    onChange={(e) => field("quantity", e.target.value)}
                    type="number"
                    min="1"
                    placeholder="0"
                    className={`w-full border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.quantity ? "border-red-400" : "border-gray-300"}`}
                  />
                  {errors.quantity && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.quantity}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <div className="relative">
                    <select
                      value={formState.unit}
                      onChange={(e) => field("unit", e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {[
                        "pcs",
                        "bags",
                        "kg",
                        "tonnes",
                        "metres",
                        "m²",
                        "m³",
                        "litres",
                        "sets",
                      ].map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due date<span className="text-red-500">*</span>
                  </label>
                  <input
                    value={formState.neededDate}
                    onChange={(e) => field("neededDate", e.target.value)}
                    type="date"
                    className={`w-full border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.neededDate ? "border-red-400" : "border-gray-300"}`}
                  />
                  {errors.neededDate && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.neededDate}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <div className="relative">
                    <select
                      value={formState.priority}
                      onChange={(e) => field("priority", e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {priorities.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comments{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={formState.comments}
                  onChange={(e) => field("comments", e.target.value)}
                  rows={3}
                  placeholder="Any additional context or urgency notes…"
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>

              <AttachmentsSection
                files={attachments}
                onChange={setAttachments}
              />

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-teal-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit Material Request"}
              </button>
            </>
          )}
        </>
      ) : (
        // Service request branch
        <>
          {/* Project (shared) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project<span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={formState.project}
                onChange={(e) => field("project", e.target.value)}
                className={`w-full border rounded-md px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.project ? "border-red-400" : "border-gray-300"}`}
              >
                <option value="">Select a project…</option>
                {projects.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.project && (
              <p className="text-xs text-red-500 mt-1">{errors.project}</p>
            )}
          </div>

          {/* Service Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Type<span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={formState.serviceType}
                onChange={(e) => field("serviceType", e.target.value)}
                className={`w-full border rounded-md px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.serviceType ? "border-red-400" : "border-gray-300"}`}
              >
                <option value="">Select service type…</option>
                {[
                  "Electrical Work",
                  "Plumbing",
                  "Civil / Masonry",
                  "IT / Technical Support",
                  "Cleaning / Janitorial",
                  "Security",
                  "Equipment Repair",
                  "Landscaping",
                  "Other",
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.serviceType && (
              <p className="text-xs text-red-500 mt-1">{errors.serviceType}</p>
            )}
          </div>

          {/* Service Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Service Provider{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              value={formState.serviceProvider}
              onChange={(e) => field("serviceProvider", e.target.value)}
              placeholder="e.g. Tech Solutions Ltd"
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Service Date + Estimated Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due date<span className="text-red-500">*</span>
              </label>
              <input
                value={formState.serviceDate}
                onChange={(e) => field("serviceDate", e.target.value)}
                type="date"
                className={`w-full border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.serviceDate ? "border-red-400" : "border-gray-300"}`}
              />
              {errors.serviceDate && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.serviceDate}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Cost{" "}
                <span className="text-gray-400 font-normal">
                  ({getCurrencySymbol()})
                </span>
              </label>
              <input
                value={formState.estimatedCost}
                onChange={(e) => field("estimatedCost", e.target.value)}
                type="number"
                min="0"
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Comments (shared) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comments{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={formState.comments}
              onChange={(e) => field("comments", e.target.value)}
              rows={3}
              placeholder="Any additional context or urgency notes…"
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>

          <AttachmentsSection files={attachments} onChange={setAttachments} />

          <button
            type="submit"
            className="w-full bg-teal-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            Submit Service Request
          </button>
        </>
      )}
    </form>
  );
}

function ExpenseForm({
  onSuccess,
  projects,
}: {
  onSuccess: (id: string) => void;
  projects: string[];
}) {
  const authUser = useAuthUser();
  const [formState, setFormState] = useState({
    project: "",
    amount: "",
    description: "",
    receiptName: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function validate() {
    const e: Record<string, string> = {};
    if (!formState.project) e.project = "Required";
    if (!formState.amount || Number(formState.amount) <= 0)
      e.amount = "Enter a valid amount";
    if (!formState.description) e.description = "Required";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      const created: any = await createExpense({
        category: "General",
        amount: Number(formState.amount),
        description: formState.description,
        createdBy: authUser.name || authUser.email || "Employee",
        date: new Date().toISOString(),
      });
      onSuccess(created?.id ?? "EXP");
    } catch (err) {
      alert(
        (err as Error)?.message ||
          "Failed to submit expense. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function field(name: keyof typeof formState, value: string) {
    setFormState((prev) => ({ ...prev, [name]: value }));
    if (errors[name])
      setErrors((prev) => {
        const x = { ...prev };
        delete x[name];
        return x;
      });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) field("receiptName", f.name);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Project */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Project<span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            value={formState.project}
            onChange={(e) => field("project", e.target.value)}
            className={`w-full border rounded-md px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.project ? "border-red-400" : "border-gray-300"}`}
          >
            <option value="">Select a project…</option>
            {projects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        {errors.project && (
          <p className="text-xs text-red-500 mt-1">{errors.project}</p>
        )}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Amount (USD)<span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            $
          </span>
          <input
            value={formState.amount}
            onChange={(e) => field("amount", e.target.value)}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            className={`w-full border rounded-md pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.amount ? "border-red-400" : "border-gray-300"}`}
          />
        </div>
        {errors.amount && (
          <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description<span className="text-red-500">*</span>
        </label>
        <textarea
          value={formState.description}
          onChange={(e) => field("description", e.target.value)}
          rows={3}
          placeholder="Describe what this expense is for…"
          className={`w-full border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${errors.description ? "border-red-400" : "border-gray-300"}`}
        />
        {errors.description && (
          <p className="text-xs text-red-500 mt-1">{errors.description}</p>
        )}
      </div>

      {/* Receipt Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Receipt <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          ref={fileRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          className="hidden"
          onChange={handleFile}
        />
        {formState.receiptName ? (
          <div className="flex items-center gap-2 border border-gray-300 rounded-md px-4 py-2.5 bg-gray-50">
            <Upload className="w-4 h-4 text-teal-600" />
            <span className="text-sm text-gray-700 flex-1 truncate">
              {formState.receiptName}
            </span>
            <button
              type="button"
              onClick={() => {
                setFormState((p) => ({ ...p, receiptName: "" }));
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center gap-2 border border-dashed border-gray-300 rounded-md px-4 py-4 hover:bg-gray-50 transition-colors justify-center"
          >
            <Upload className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">
              Click to upload receipt (JPG, PNG, PDF)
            </span>
          </button>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-teal-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit Expense Request"}
      </button>
    </form>
  );
}

// ─── Leave Form ────────────────────────────────────────────────────────────────

function countWorkingDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (s > e) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function LeaveForm({ onSuccess }: { onSuccess: (id: string) => void }) {
  const authUser = useAuthUser();
  const { leaveTypes } = useHRConfig();
  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const workingDays = countWorkingDays(startDate, endDate);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!leaveType) errs.leaveType = "Required";
    if (!startDate) errs.startDate = "Required";
    if (!endDate) errs.endDate = "Required";
    if (startDate && endDate && endDate < startDate)
      errs.endDate = "End date must be after start date";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    const leaveTypeId = leaveTypes.find((t) => t.name === leaveType)?.id ?? "";
    if (!leaveTypeId) {
      setErrors({ leaveType: "Select a valid leave type" });
      return;
    }
    if (!authUser.employeeId) {
      alert(
        "Your account isn't linked to an employee profile, so leave can't be submitted.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const created: any = await createLeaveRequest({
        refId: "LR-" + Date.now(),
        leaveTypeId,
        employeeId: authUser.employeeId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        days: workingDays,
        reason: notes,
      });
      onSuccess(created?.data?.id ?? created?.id ?? "LEAVE");
    } catch (err) {
      alert(
        (err as Error)?.message ||
          "Failed to submit leave request. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Leave type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Leave Type<span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Select leave type…</option>
            {leaveTypes.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date<span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (errors.startDate)
                setErrors((p) => {
                  const x = { ...p };
                  delete x.startDate;
                  return x;
                });
            }}
            className={`w-full border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.startDate ? "border-red-400" : "border-gray-300"}`}
          />
          {errors.startDate && (
            <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date<span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              if (errors.endDate)
                setErrors((p) => {
                  const x = { ...p };
                  delete x.endDate;
                  return x;
                });
            }}
            className={`w-full border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.endDate ? "border-red-400" : "border-gray-300"}`}
          />
          {errors.endDate && (
            <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>
          )}
        </div>
      </div>

      {/* Duration display */}
      {startDate && endDate && !errors.endDate && (
        <div className="flex items-center gap-2.5 bg-teal-50 border border-teal-200 rounded-lg px-4 py-3">
          <Calendar className="w-4 h-4 text-teal-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-teal-800">
              {workingDays} working {workingDays === 1 ? "day" : "days"}
            </p>
            <p className="text-xs text-teal-600">
              Weekends excluded · Public holidays not applied
            </p>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any additional context for your manager…"
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
      </div>

      <AttachmentsSection files={attachments} onChange={setAttachments} />

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-teal-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit Leave Request"}
      </button>
    </form>
  );
}

// ─── Change Request Form ────────────────────────────────────────────────────
// (moved to src/app/components/ChangeRequestForm.tsx)

// ─── Issue Form ─────────────────────────────────────────────────────────────
// (moved to src/app/components/IssueForm.tsx)

export function SubmitRequestPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("material");
  const [projectOptions, setProjectOptions] = useState<string[]>([]);
  const [successState, setSuccessState] = useState<{
    type: string;
    id: string;
  } | null>(null);

  useEffect(() => {
    fetchProjects()
      .then((data) => {
        const names = Array.isArray(data)
          ? data
              .map((p) => p?.name)
              .filter(
                (name): name is string =>
                  typeof name === "string" && name.trim().length > 0,
              )
          : [];
        setProjectOptions(names);
      })
      .catch(() => {
        setProjectOptions([]);
      });
  }, []);

  if (successState) {
    const tabKey =
      successState.type === "Material Request"
        ? "material"
        : successState.type === "Finance Request"
          ? "finance"
          : successState.type === "Leave Request"
            ? "leave"
            : successState.type === "Issue Reported"
              ? "issue"
              : successState.type === "Change Request"
                ? "change"
                : "material";
    const pipelineSteps = getPipelineForRequest(tabKey, getWorkflows());
    return (
      <SuccessCard
        title={`${successState.type} Submitted`}
        id={successState.id}
        onBack={() => setSuccessState(null)}
        pipelineSteps={pipelineSteps}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/apps/ess/requests")}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Create Request
          </h1>
          <p className="text-sm text-gray-500">
            Choose a request type and fill in the details
          </p>
        </div>
      </div>

      {/* Two-column layout: form card (left) + info panel (right) */}
      <div className="flex gap-6 items-start">
        {/* Main form card */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Type selector — 5 tabs */}
          <div className="grid grid-cols-5 border-b border-gray-200">
            <button
              onClick={() => setTab("material")}
              className={`flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors border-b-2 ${
                tab === "material"
                  ? "border-teal-600 text-teal-700 bg-teal-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Package className="w-4 h-4" /> Material
            </button>
            <button
              onClick={() => setTab("finance")}
              className={`flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors border-b-2 ${
                tab === "finance"
                  ? "border-teal-600 text-teal-700 bg-teal-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <DollarSign className="w-4 h-4" /> Finance
            </button>
            <button
              onClick={() => setTab("leave")}
              className={`flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors border-b-2 ${
                tab === "leave"
                  ? "border-teal-600 text-teal-700 bg-teal-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <FileText className="w-4 h-4" /> Leave
            </button>
            <button
              onClick={() => setTab("issue")}
              className={`flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors border-b-2 ${
                tab === "issue"
                  ? "border-teal-600 text-teal-700 bg-teal-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <AlertTriangle className="w-4 h-4" /> Issues
            </button>
            <button
              onClick={() => setTab("change")}
              className={`flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors border-b-2 ${
                tab === "change"
                  ? "border-teal-600 text-teal-700 bg-teal-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Edit2 className="w-4 h-4" /> Changes
            </button>
          </div>

          {/* Form body */}
          <div className="p-6">
            {tab === "material" && (
              <MaterialForm
                projects={projectOptions}
                onSuccess={(id) =>
                  setSuccessState({ type: "Material Request", id })
                }
              />
            )}
            {tab === "finance" && (
              <ExpenseForm
                projects={projectOptions}
                onSuccess={(id) =>
                  setSuccessState({ type: "Finance Request", id })
                }
              />
            )}
            {tab === "leave" && (
              <LeaveForm
                onSuccess={(id) =>
                  setSuccessState({ type: "Leave Request", id })
                }
              />
            )}
            {tab === "issue" && (
              <IssueForm
                onSuccess={(id) =>
                  setSuccessState({ type: "Issue Reported", id })
                }
              />
            )}
            {tab === "change" && (
              <ChangeRequestForm
                onSuccess={(id) =>
                  setSuccessState({ type: "Change Request", id })
                }
              />
            )}
          </div>
        </div>

        {/* Info panel — contextual help per tab */}
        <div className="w-72 flex-shrink-0 space-y-4">
          {tab === "material" && (
            <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-teal-800">
                Material Request
              </h3>
              <p className="text-xs text-teal-700 leading-relaxed">
                Search the inventory catalogue to select an existing material.
                If your item doesn't exist yet, use the "Create new material"
                option to raise it in Procurement.
              </p>
              <ul className="text-xs text-teal-700 space-y-1 list-disc list-inside">
                <li>Requests route to the Storefront for fulfillment</li>
                <li>If out of stock, Procurement is notified</li>
                <li>Urgent requests are escalated automatically</li>
              </ul>
            </div>
          )}
          {tab === "finance" && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-blue-800">
                Finance Request
              </h3>
              <p className="text-xs text-blue-700 leading-relaxed">
                Submit expense reimbursements, activity cost requests, or claim
                specific allowances against your entitlements.
              </p>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>Attach receipts or evidence where required</li>
                <li>Claims are validated against HR entitlements</li>
                <li>
                  Approved amounts are processed in the next payroll cycle
                </li>
              </ul>
            </div>
          )}
          {tab === "leave" && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-purple-800">
                Leave Request
              </h3>
              <p className="text-xs text-purple-700 leading-relaxed">
                Apply for annual leave, sick leave, or any other type configured
                by HR. Working days are calculated automatically.
              </p>
              <ul className="text-xs text-purple-700 space-y-1 list-disc list-inside">
                <li>Weekends are excluded from the count</li>
                <li>Check your leave balance in My Profile</li>
                <li>Requests go to your line manager for approval</li>
              </ul>
            </div>
          )}
          {tab === "issue" && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-orange-800">
                Log an Issue
              </h3>
              <p className="text-xs text-orange-700 leading-relaxed">
                Report safety hazards, incidents, complaints, or suggestions.
                Anonymous reporting is available.
              </p>
              <ul className="text-xs text-orange-700 space-y-1 list-disc list-inside">
                <li>Safety hazards are escalated immediately</li>
                <li>All issues are tracked through to resolution</li>
                <li>Anonymous issues remain fully confidential</li>
              </ul>
            </div>
          )}
          {tab === "change" && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">
                Change Request
              </h3>
              <p className="text-xs text-gray-700 leading-relaxed">
                Submit a formal change request with full impact assessment —
                scope, schedule, cost, quality, and stakeholder implications.
              </p>
              <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
                <li>All change requests are reviewed before approval</li>
                <li>Include impact assessment for faster processing</li>
                <li>Upload supporting documents where needed</li>
              </ul>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Quick Links
            </h3>
            <a
              href="/apps/ess"
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-teal-700 py-1"
            >
              <FileText className="w-4 h-4 text-gray-400" /> My Requests
            </a>
            <a
              href="/apps/procurement/material-requests"
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-teal-700 py-1"
            >
              <Package className="w-4 h-4 text-gray-400" /> Procurement — New
              Material
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
