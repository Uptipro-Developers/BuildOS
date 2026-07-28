import { useState } from "react";
import { AttachmentsSection } from "./AttachmentsSection";
import { createIssue } from "../api/hr-extras";
import { useAuthUser } from "../utils/useAuthUser";

const issueTypes = ["Incident", "Complaint", "Safety Hazard", "Suggestion"];
const impactTypeOptions = ["Schedule", "Cost", "Scope", "Quality", "Safety"];

interface IssueFormProps {
  onSuccess: (id: string) => void;
  showTaskSelector?: boolean;
  tasks?: { id: string; name: string }[];
  showOwnerSelector?: boolean;
  staffList?: string[];
  showStatusSelector?: boolean;
  submitLabel?: string;
}

export function IssueForm({
  onSuccess,
  showTaskSelector,
  tasks = [],
  showOwnerSelector,
  staffList = [],
  showStatusSelector,
  submitLabel = "Report Issue",
}: IssueFormProps) {
  const authUser = useAuthUser();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: "",
    title: "",
    description: "",
    priority: "medium" as string,
    anonymous: false,
    taskId: "",
    impactTypes: [] as string[],
    rootCause: "",
    targetDate: "",
    actions: "",
    ownerId: "",
    status: "Open",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<File[]>([]);

  const priorities = [
    { value: "low", label: "Low", color: "text-green-700 bg-green-50" },
    { value: "medium", label: "Medium", color: "text-yellow-700 bg-yellow-50" },
    { value: "high", label: "High", color: "text-orange-700 bg-orange-50" },
    { value: "urgent", label: "Urgent", color: "text-red-700 bg-red-50" },
  ];

  function validate() {
    const e: Record<string, string> = {};
    if (!form.type) e.type = "Select an issue type";
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.description.trim()) e.description = "Description is required";
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
      const created: any = await createIssue({
        title: form.title,
        category: form.type,
        priority: form.priority,
        description: form.description,
        reportedBy: form.anonymous
          ? "Anonymous"
          : authUser.name || authUser.email || "Employee",
        status: form.status || "Open",
      });
      onSuccess(
        created?.id ??
          "ISS-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      );
    } catch (err) {
      alert(
        (err as Error)?.message || "Failed to report issue. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function field(name: string, value: string | boolean | string[]) {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name])
      setErrors((p) => {
        const x = { ...p };
        delete x[name];
        return x;
      });
  }

  function toggleImpact(t: string) {
    setForm((f) => ({
      ...f,
      impactTypes: f.impactTypes.includes(t)
        ? f.impactTypes.filter((x) => x !== t)
        : [...f.impactTypes, t],
    }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Issue Type <span className="text-red-500">*</span>
        </label>
        <select
          value={form.type}
          onChange={(e) => field("type", e.target.value)}
          className={`w-full border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.type ? "border-red-400" : "border-gray-300"}`}
        >
          <option value="">Select type…</option>
          {issueTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {errors.type && (
          <p className="text-xs text-red-500 mt-1">{errors.type}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          value={form.title}
          onChange={(e) => field("title", e.target.value)}
          placeholder="Brief title for the issue"
          className={`w-full border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.title ? "border-red-400" : "border-gray-300"}`}
        />
        {errors.title && (
          <p className="text-xs text-red-500 mt-1">{errors.title}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.description}
          onChange={(e) => field("description", e.target.value)}
          rows={4}
          placeholder="Describe the issue in detail…"
          className={`w-full border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${errors.description ? "border-red-400" : "border-gray-300"}`}
        />
        {errors.description && (
          <p className="text-xs text-red-500 mt-1">{errors.description}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Priority
        </label>
        <div className="grid grid-cols-4 gap-2">
          {priorities.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => field("priority", p.value)}
              className={`py-2 rounded-md text-sm font-medium border transition-colors ${form.priority === p.value ? p.color + " border-transparent" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {showTaskSelector && tasks.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Work Package / Task
          </label>
          <select
            value={form.taskId}
            onChange={(e) => field("taskId", e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Select task…</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Impact Types
        </label>
        <div className="flex flex-wrap gap-3">
          {impactTypeOptions.map((t) => (
            <label
              key={t}
              className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={form.impactTypes.includes(t)}
                onChange={() => toggleImpact(t)}
                className="rounded"
              />
              {t}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Root Cause
        </label>
        <input
          value={form.rootCause}
          onChange={(e) => field("rootCause", e.target.value)}
          placeholder="What caused this issue?"
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Target Resolution Date
        </label>
        <input
          type="date"
          value={form.targetDate}
          onChange={(e) => field("targetDate", e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Actions Taken / Planned
        </label>
        <textarea
          value={form.actions}
          onChange={(e) => field("actions", e.target.value)}
          rows={2}
          placeholder="Describe actions or next steps…"
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
      </div>
      {showOwnerSelector && staffList.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assigned To
          </label>
          <select
            value={form.ownerId}
            onChange={(e) => field("ownerId", e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Select owner…</option>
            {staffList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}
      {showStatusSelector && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={form.status}
            onChange={(e) => field("status", e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="Open">Open</option>
            <option value="Under Investigation">Under Investigation</option>
            <option value="In Progress">In Progress</option>
            <option value="Escalated">Escalated</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      )}
      <div className="flex items-center gap-2.5">
        <input
          type="checkbox"
          id="anonymous-issue"
          checked={form.anonymous}
          onChange={(e) => field("anonymous", e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
        />
        <label htmlFor="anonymous-issue" className="text-sm text-gray-700">
          Submit anonymously
        </label>
      </div>
      <AttachmentsSection files={attachments} onChange={setAttachments} />
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-teal-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-60"
      >
        {submitting ? "Submitting…" : submitLabel}
      </button>
    </form>
  );
}
