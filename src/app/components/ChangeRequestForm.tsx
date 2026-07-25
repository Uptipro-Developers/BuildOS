import { useState } from "react";
import { AttachmentsSection } from "./AttachmentsSection";

const changeCategoryOptions = ["Personal Details", "Bank Details", "Address", "Emergency Contact", "Other"];
const changeTypeOptions = ["Cost", "Scope", "Schedule", "Design", "Quality"];

interface ChangeRequestFormProps {
  onSuccess: (id: string) => void;
  showStatusSelector?: boolean;
  showCategorySelector?: boolean;
  showRaisedBy?: boolean;
  submitLabel?: string;
}

export function ChangeRequestForm({
  onSuccess,
  showStatusSelector,
  showCategorySelector = true,
  showRaisedBy,
  submitLabel = "Submit Change Request",
}: ChangeRequestFormProps) {
  const [form, setForm] = useState({
    category: "",
    description: "",
    reason: "",
    changeTypes: [] as string[],
    raisedBy: "Current User",
    dateRaised: new Date().toISOString().split("T")[0],
    scopeImpact: "",
    scheduleImpactDays: 0,
    costImpact: 0,
    qualityImpact: "",
    stakeholderImpact: "",
    recommendedAction: "",
    notes: "",
    status: "Proposed",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<File[]>([]);

  function toggleChangeType(t: string) {
    setForm(f => ({ ...f, changeTypes: f.changeTypes.includes(t) ? f.changeTypes.filter(x => x !== t) : [...f.changeTypes, t] }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (showCategorySelector && !form.category) e.category = "Select a change category";
    if (!form.description.trim()) e.description = "Describe the change";
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSuccess("CHG-" + Math.random().toString(36).slice(2, 8).toUpperCase());
  }

  function field(name: string, value: string | number | string[]) {
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(p => { const x = { ...p }; delete x[name]; return x; });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {showCategorySelector && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Change Category <span className="text-red-500">*</span></label>
          <select value={form.category} onChange={e => field("category", e.target.value)}
            className={`w-full border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.category ? "border-red-400" : "border-gray-300"}`}>
            <option value="">Select category…</option>
            {changeCategoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
        <textarea value={form.description} onChange={e => field("description", e.target.value)}
          rows={2} placeholder="Describe the change being requested…"
          className={`w-full border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${errors.description ? "border-red-400" : "border-gray-300"}`} />
        {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Change</label>
        <textarea value={form.reason} onChange={e => field("reason", e.target.value)} rows={2}
          placeholder="Why is this change needed?"
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Change Types</label>
        <div className="flex flex-wrap gap-3">
          {changeTypeOptions.map(t => (
            <label key={t} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.changeTypes.includes(t)} onChange={() => toggleChangeType(t)} className="rounded" />
              {t}
            </label>
          ))}
        </div>
      </div>
      {showRaisedBy && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Raised By</label>
            <input value={form.raisedBy} onChange={e => field("raisedBy", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Raised</label>
            <input type="date" value={form.dateRaised} onChange={e => field("dateRaised", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
        </div>
      )}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Impact Assessment</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Scope Impact</label>
            <textarea value={form.scopeImpact} onChange={e => field("scopeImpact", e.target.value)} rows={1}
              placeholder="How does this affect scope?"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Schedule Impact (days)</label>
              <input type="number" value={form.scheduleImpactDays} onChange={e => field("scheduleImpactDays", Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cost Impact (₦)</label>
              <input type="number" value={form.costImpact} onChange={e => field("costImpact", Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Quality Impact</label>
            <textarea value={form.qualityImpact} onChange={e => field("qualityImpact", e.target.value)} rows={1}
              placeholder="Quality implications?"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Stakeholder Impact</label>
            <textarea value={form.stakeholderImpact} onChange={e => field("stakeholderImpact", e.target.value)} rows={1}
              placeholder="Stakeholder implications?"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Recommended Action</label>
            <textarea value={form.recommendedAction} onChange={e => field("recommendedAction", e.target.value)} rows={1}
              placeholder="What action do you recommend?"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
          </div>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes <span className="text-gray-400 font-normal">(optional)</span></label>
        <textarea value={form.notes} onChange={e => field("notes", e.target.value)} rows={2}
          placeholder="Any additional context…"
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select value={form.status} onChange={e => field("status", e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="Proposed">Proposed</option>
          <option value="Under Review">Under Review</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Implemented">Implemented</option>
          <option value="Closed">Closed</option>
        </select>
      </div>
      <AttachmentsSection files={attachments} onChange={setAttachments} />
      <button type="submit" className="w-full text-white py-2.5 rounded-md text-sm font-medium transition-colors" style={{ backgroundColor: "#E8973A" }}>
        {submitLabel}
      </button>
    </form>
  );
}
