import { useState, useEffect } from "react";
import { toast } from "sonner";
import { fetchDepartments, createDepartment, deleteDepartment } from "../../api/departments";
import { getDepartmentPayrollSummary } from "../../api/hr-extras";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import {
  getCurrencySymbol,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";

interface Department {
  id: string;
  name: string;
  head: string;
  headId: string;
  description: string;
  headcount: number;
  budget: string;
  location: string;
  employees: { name: string; role: string; id: string }[];
}

const deptColors = [
  "bg-indigo-100 text-indigo-700",
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-orange-100 text-orange-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-purple-100 text-purple-700",
  "bg-teal-100 text-teal-700",
];

export function DepartmentsPage() {
  const [depts, setDepts] = useState<Department[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<
    {
      department: string;
      employees: number;
      grossPay: number;
      netPay: number;
    }[]
  >([]);
  function loadDepartments() {
    return fetchDepartments().then(setDepts);
  }
  useEffect(() => {
    loadDepartments();
    getDepartmentPayrollSummary()
      .then(setPayrollSummary)
      .catch(() => setPayrollSummary([]));
  }, []);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newHead, setNewHead] = useState("");
  const [newLocation, setNewLocation] = useState("");

  function handleCreateDepartment() {
    if (!newName.trim()) {
      toast.error("Department name is required");
      return;
    }
    setCreating(true);
    createDepartment({
      name: newName.trim(),
      description: newDesc.trim(),
      location: newLocation.trim(),
    })
      .then(() => loadDepartments())
      .then(() => {
        setShowCreate(false);
        setNewName("");
        setNewDesc("");
        setNewHead("");
        setNewLocation("");
        toast.success("Department created");
      })
      .catch(() => toast.error("Failed to create department. Please try again."))
      .finally(() => setCreating(false));
  }

  function handleDeleteDepartment() {
    if (!deleteTarget) return;
    deleteDepartment(deleteTarget.id)
      .then(() => loadDepartments())
      .then(() => {
        setDeleteTarget(null);
        toast.success("Department deleted");
      })
      .catch(() => toast.error("Failed to delete department. It may still have employees assigned."));
  }

  const filtered = depts.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.head.toLowerCase().includes(search.toLowerCase()),
  );

  const total = depts.reduce((s, d) => s + d.headcount, 0);
  const largest = depts.reduce<Department | null>(
    (best, d) => (!best || d.headcount > best.headcount ? d : best),
    null,
  );
  const totalPayroll = payrollSummary.reduce((sum, d) => sum + d.grossPay, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Departments</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {depts.length} departments · {total} total employees
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 text-white rounded-md text-sm hover:bg-indigo-800"
        >
          <Plus className="w-3.5 h-3.5" /> Add Department
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Total Departments",
            value: depts.length,
            color: "text-indigo-700",
            bg: "bg-indigo-50",
          },
          {
            label: "Total Headcount",
            value: total,
            color: "text-blue-700",
            bg: "bg-blue-50",
          },
          {
            label: "Largest Dept",
            value: largest ? `${largest.name} (${largest.headcount})` : "—",
            color: "text-green-700",
            bg: "bg-green-50",
          },
          {
            label: "Latest Payroll",
            value: `${getCurrencySymbol()}${formatNumberByGeneralSettings(totalPayroll)}`,
            color: "text-amber-700",
            bg: "bg-amber-50",
          },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-lg p-4`}>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search departments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Department cards */}
      <div className="space-y-3">
        {filtered.map((dept, i) => {
          const isOpen = expanded === dept.id;
          return (
            <div
              key={dept.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(isOpen ? null : dept.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${deptColors[i % deptColors.length]}`}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{dept.name}</p>
                    <p className="text-xs text-gray-500">
                      Head: {dept.head} · {dept.location}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-800">
                      {dept.headcount}
                    </p>
                    <p className="text-xs text-gray-400">Employees</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-600">
                      {dept.budget}
                    </p>
                    <p className="text-xs text-gray-400">Budget</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(dept);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
              {isOpen && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <p className="text-sm text-gray-600 mb-4">
                    {dept.description}
                  </p>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Department Members ({dept.employees.length} shown)
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {dept.employees.map((e) => (
                        <div
                          key={e.id}
                          className="bg-white rounded border border-gray-200 px-3 py-2"
                        >
                          <p className="text-sm font-medium text-gray-800">
                            {e.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {e.role} · {e.id}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900">Add Department</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              {[
                {
                  label: "Department Name",
                  value: newName,
                  set: setNewName,
                  ph: "e.g. Engineering",
                },
                {
                  label: "Department Head",
                  value: newHead,
                  set: setNewHead,
                  ph: "e.g. Chukwudi Eze",
                },
                {
                  label: "Work Location",
                  value: newLocation,
                  set: setNewLocation,
                  ph: "e.g. Abuja, Lagos",
                },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {f.label}
                  </label>
                  <input
                    type="text"
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder={f.ph}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Description
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDepartment}
                disabled={creating}
                className="px-4 py-2 bg-indigo-700 text-white rounded-md text-sm hover:bg-indigo-800 disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create Department"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteTarget !== null}
        title="Delete Department?"
        description={
          deleteTarget
            ? `This will permanently remove "${deleteTarget.name}". This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        isDangerous
        onConfirm={handleDeleteDepartment}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
