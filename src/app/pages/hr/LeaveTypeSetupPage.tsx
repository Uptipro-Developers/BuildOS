import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import {
  fetchLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  type LeaveType as ApiLeaveType,
} from "../../api/leave-types";
import { ConfirmationModal } from "../../components/ConfirmationModal";

type LeaveGender = "all" | "male" | "female";

const COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-red-100 text-red-700",
  "bg-orange-100 text-orange-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
  "bg-amber-100 text-amber-700",
  "bg-teal-100 text-teal-700",
  "bg-gray-100 text-gray-700",
];

const COLOR_NAMES: Record<string, string> = {
  "bg-blue-100 text-blue-700": "Blue",
  "bg-red-100 text-red-700": "Red",
  "bg-orange-100 text-orange-700": "Orange",
  "bg-green-100 text-green-700": "Green",
  "bg-purple-100 text-purple-700": "Purple",
  "bg-pink-100 text-pink-700": "Pink",
  "bg-amber-100 text-amber-700": "Amber",
  "bg-teal-100 text-teal-700": "Teal",
  "bg-gray-100 text-gray-700": "Gray",
};

const GENDER_LABELS: Record<LeaveGender, string> = {
  all: "All (Gender-neutral)",
  male: "Male only",
  female: "Female only",
};

const EMPTY = {
  name: "",
  daysAllowed: 10,
  carryOver: false,
  maxCarryOver: 0,
  paid: true,
  approvalsRequired: 1 as 1 | 2,
  color: COLORS[0],
  gender: "all" as LeaveGender,
};

export function LeaveTypeSetupPage() {
  type UILeaveType = Omit<ApiLeaveType, "approvalsRequired" | "gender"> & {
    approvalsRequired: 1 | 2;
    gender: LeaveGender;
  };

  const normalizeLeaveType = (t: ApiLeaveType): UILeaveType => ({
    ...t,
    approvalsRequired: t.approvalsRequired === 2 ? 2 : 1,
    gender:
      t.gender === "male" || t.gender === "female" || t.gender === "all"
        ? t.gender
        : "all",
  });

  const [leaveTypes, setLeaveTypes] = useState<UILeaveType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<UILeaveType | null>(null);

  useEffect(() => {
    fetchLeaveTypes()
      .then((items) => setLeaveTypes(items.map(normalizeLeaveType)))
      .catch(console.error);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editId) {
      const updated = await updateLeaveType(editId, form);
      setLeaveTypes((prev) =>
        prev.map((t) => (t.id === editId ? normalizeLeaveType(updated) : t)),
      );
      setEditId(null);
    } else {
      const created = await createLeaveType(form);
      setLeaveTypes((prev) => [...prev, normalizeLeaveType(created)]);
    }
    setForm(EMPTY);
    setShowForm(false);
  }

  function startEdit(t: UILeaveType) {
    setForm({
      name: t.name,
      daysAllowed: t.daysAllowed,
      carryOver: t.carryOver,
      maxCarryOver: t.maxCarryOver,
      paid: t.paid,
      approvalsRequired: t.approvalsRequired,
      color: t.color,
      gender: t.gender,
    });
    setEditId(t.id);
    setShowForm(true);
  }

  function genderBadge(g: LeaveGender) {
    if (g === "male")
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
          Male
        </span>
      );
    if (g === "female")
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 font-medium">
          Female
        </span>
      );
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
        All
      </span>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Leave Type Setup
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure leave categories, entitlements, gender policies and
            carry-over rules
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditId(null);
            setForm(EMPTY);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" /> Add Leave Type
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-indigo-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {editId ? "Edit Leave Type" : "Add Leave Type"}
          </h3>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Leave Type Name *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Annual Leave"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Days Allowed / Year
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.daysAllowed}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      daysAllowed: Number(e.target.value),
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Gender
                </label>
                <select
                  value={form.gender}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      gender: e.target.value as LeaveGender,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="all">All (Gender-neutral)</option>
                  <option value="female">Female only (e.g. Maternity)</option>
                  <option value="male">Male only (e.g. Paternity)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Approvals Required
                </label>
                <select
                  value={form.approvalsRequired}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      approvalsRequired: Number(e.target.value) as 1 | 2,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value={1}>1 — Direct Manager only</option>
                  <option value={2}>2 — Manager + HR</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Colour Tag
                </label>
                <select
                  value={form.color}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, color: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {COLORS.map((c) => (
                    <option key={c} value={c}>
                      {COLOR_NAMES[c]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.paid}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, paid: e.target.checked }))
                  }
                  className="rounded accent-indigo-600"
                />
                Paid Leave
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.carryOver}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, carryOver: e.target.checked }))
                  }
                  className="rounded accent-indigo-600"
                />
                Allow Carry-over
              </label>
              {form.carryOver && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">
                    Max carry-over days:
                  </label>
                  <input
                    type="number"
                    value={form.maxCarryOver}
                    min={0}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        maxCarryOver: Number(e.target.value),
                      }))
                    }
                    className="w-16 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Leave Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Days / Year
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Gender
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Paid
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Carry-over
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Approvals
              </th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leaveTypes.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${t.color}`}
                  >
                    {t.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {t.daysAllowed} days
                </td>
                <td className="px-4 py-3">{genderBadge(t.gender)}</td>
                <td className="px-4 py-3">
                  {t.paid ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-300" />
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {t.carryOver ? `Yes (max ${t.maxCarryOver} days)` : "No"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {t.approvalsRequired === 1 ? "Manager only" : "Manager + HR"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(t)}
                      className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
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

      <div className="flex items-center gap-4 text-xs text-gray-500 px-1">
        <span className="font-medium text-gray-600">Gender policy:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
          {GENDER_LABELS.all}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-pink-400 inline-block" />
          {GENDER_LABELS.female}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
          {GENDER_LABELS.male}
        </span>
      </div>

      <ConfirmationModal
        isOpen={deleteTarget !== null}
        title="Delete Leave Type?"
        description={
          deleteTarget
            ? `This will permanently remove "${deleteTarget.name}". This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        isDangerous
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteLeaveType(deleteTarget.id);
            setLeaveTypes((prev) => prev.filter((x) => x.id !== deleteTarget.id));
            toast.success("Leave type deleted");
          } catch {
            toast.error("Failed to delete leave type. Please try again.");
          } finally {
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
