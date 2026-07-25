import { useState } from "react";
import { ShieldCheck, Plus, Edit, Trash2, X, Search } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type RequirementLevel = "Mandatory" | "Optional";

interface DocumentType {
  id: string;
  name: string;
  description: string;
  level: RequirementLevel;
}

// ── Seed data ─────────────────────────────────────────────────────────────────
const SEED: DocumentType[] = [
  { id: "1", name: "Certificate of Incorporation",  description: "Proof of legal registration as a business entity.", level: "Mandatory" },
  { id: "2", name: "Tax Clearance Certificate",      description: "Evidence of up-to-date tax compliance with FIRS.", level: "Mandatory" },
  { id: "3", name: "CAC Form BN1 / CAC Form 7",     description: "Business name registration or company particulars form.", level: "Mandatory" },
  { id: "4", name: "Audited Financial Statements",  description: "Last 2 years audited accounts for financial capacity assessment.", level: "Optional" },
  { id: "5", name: "ISO Certification",              description: "Quality management system certification (ISO 9001 or equivalent).", level: "Optional" },
  { id: "6", name: "Bank Reference Letter",          description: "Letter from supplier's bank confirming financial standing.", level: "Optional" },
  { id: "7", name: "Vendor Questionnaire",           description: "Completed supplier onboarding questionnaire.", level: "Mandatory" },
];

const BLANK: Omit<DocumentType, "id"> = { name: "", description: "", level: "Mandatory" };

// ── Level badge ────────────────────────────────────────────────────────────────
function LevelBadge({ level }: { level: RequirementLevel }) {
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
      level === "Mandatory" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"
    }`}>
      {level}
    </span>
  );
}

// ── Add / Edit modal ──────────────────────────────────────────────────────────
function DocTypeModal({
  initial, onSave, onClose,
}: {
  initial: Omit<DocumentType, "id"> & { id?: string };
  onSave: (d: Omit<DocumentType, "id"> & { id?: string }) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required.";
    return e;
  }

  function submit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave(form);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {initial.id ? "Edit Document Type" : "New Document Type"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Document Name <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Tax Clearance Certificate"
              className={`w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? "border-red-400" : "border-gray-200"
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Briefly describe what this document verifies…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Requirement Level</label>
            <div className="flex gap-3">
              {(["Mandatory", "Optional"] as RequirementLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setForm({ ...form, level: lvl })}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
                    form.level === lvl
                      ? lvl === "Mandatory"
                        ? "bg-red-50 border-red-400 text-red-600"
                        : "bg-gray-100 border-gray-300 text-gray-700"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={submit} className="px-4 py-2 text-sm bg-blue-700 hover:bg-blue-800 text-white rounded-xl">
            {initial.id ? "Save Changes" : "Add Document Type"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirmation ───────────────────────────────────────────────────────
function DeleteModal({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Delete Document Type?</h2>
        <p className="text-sm text-gray-500">
          <strong>"{name}"</strong> will be permanently removed.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function SupplierCompliancePage() {
  const [docs, setDocs] = useState<DocumentType[]>(SEED);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<"All" | RequirementLevel>("All");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DocumentType | null>(null);
  const [deleting, setDeleting] = useState<DocumentType | null>(null);

  const filtered = docs.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === "All" || d.level === levelFilter;
    return matchSearch && matchLevel;
  });

  function openAdd() { setEditing(null); setShowModal(true); }
  function openEdit(d: DocumentType) { setEditing(d); setShowModal(true); }

  function save(data: Omit<DocumentType, "id"> & { id?: string }) {
    if (data.id) {
      setDocs((prev) => prev.map((d) => d.id === data.id ? ({ ...data, id: data.id! }) : d));
    } else {
      setDocs((prev) => [...prev, { ...data, id: Date.now().toString() }]);
    }
  }

  const mandatoryCount = docs.filter((d) => d.level === "Mandatory").length;
  const optionalCount  = docs.filter((d) => d.level === "Optional").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Supplier Compliance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage required compliance documents for supplier onboarding and verification</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm px-4 py-2 rounded-xl"
        >
          <Plus className="w-4 h-4" /> Add Document Type
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Types", value: docs.length, color: "text-gray-900", bg: "bg-white" },
          { label: "Mandatory",   value: mandatoryCount, color: "text-red-600", bg: "bg-red-50" },
          { label: "Optional",    value: optionalCount,  color: "text-gray-600", bg: "bg-gray-50" },
        ].map((c) => (
          <div key={c.label} className={`${c.bg} border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3`}>
            <ShieldCheck className={`w-5 h-5 ${c.color}`} />
            <div>
              <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
              <p className="text-xs text-gray-500">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search document types…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {(["All", "Mandatory", "Optional"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLevelFilter(l)}
            className={`px-3 py-1.5 text-xs rounded-lg border font-medium ${
              levelFilter === l
                ? "bg-blue-700 text-white border-blue-700"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-medium w-8">#</th>
              <th className="px-4 py-3 text-left font-medium">Document Name</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-left font-medium">Requirement Level</th>
              <th className="px-4 py-3 text-left font-medium w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                  No document types found.
                </td>
              </tr>
            )}
            {filtered.map((d, i) => (
              <tr key={d.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                <td className="px-4 py-3 text-gray-900 font-medium">{d.name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-xs">{d.description || "—"}</td>
                <td className="px-4 py-3"><LevelBadge level={d.level} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(d)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleting(d)}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
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
      <p className="text-xs text-gray-400">Showing {filtered.length} of {docs.length} document types</p>

      {/* Add / Edit modal */}
      {showModal && (
        <DocTypeModal
          initial={editing ?? { ...BLANK }}
          onSave={save}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Delete confirmation */}
      {deleting && (
        <DeleteModal
          name={deleting.name}
          onConfirm={() => setDocs((prev) => prev.filter((d) => d.id !== deleting.id))}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
