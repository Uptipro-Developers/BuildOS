import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Users, Search, Plus, Download, ChevronUp, ChevronDown,
  Eye, Edit, MoreHorizontal, CheckCircle, XCircle,
  UserCheck, X,
} from "lucide-react";
import { exportCSV } from "../../utils/exportCSV";
import { AdvancedFilter, type FilterFieldDef, type ActiveFilters, type SortConfig } from "../../components/AdvancedFilter";
import { useHRConfig } from "../../stores/hrConfigStore";
import { useEmployees, type Employee } from "../../stores/employeeStore";
import { useUsers } from "../../stores/userStore";

type EmpStatus = "active" | "inactive" | "on_leave";

const statusConfig: Record<EmpStatus, { label: string; badge: string; icon: React.ReactNode }> = {
  active: { label: "Active", badge: "bg-green-100 text-green-700", icon: <CheckCircle className="w-3.5 h-3.5 text-green-600" /> },
  inactive: { label: "Inactive", badge: "bg-red-100 text-red-700", icon: <XCircle className="w-3.5 h-3.5 text-red-500" /> },
  on_leave: { label: "On Leave", badge: "bg-amber-100 text-amber-700", icon: <UserCheck className="w-3.5 h-3.5 text-amber-500" /> },
};

const empTypeColor: Record<string, string> = {
  "Full-time": "bg-indigo-100 text-indigo-700",
  "Contract": "bg-orange-100 text-orange-700",
};

const departments = ["Engineering", "Operations", "Finance", "Human Resources", "Procurement", "Health & Safety", "Administration", "IT & Systems"];

const EMPLOYEE_FILTER_FIELDS: FilterFieldDef[] = [
  { key: "jobTitle", label: "Job Title", type: "text" },
  { key: "department", label: "Department", type: "select", options: departments },
  { key: "status", label: "Status", type: "select", options: ["active", "inactive", "on_leave"] },
  { key: "employmentType", label: "Employment Type", type: "select", options: ["Full-time", "Contract"] },
];

const emptyForm = {
  firstName: "", middleName: "", lastName: "", jobTitle: "", primarySupervisor: "",
  employmentDate: "", dateOfBirth: "", maritalStatus: "",
  personalPhone: "", personalEmail: "", address: "", nextOfKin: "",
  pfa: "", rsaNumber: "", bankName: "", bankAccount: "", taxId: "", grade: "", nationality: "",
  department: departments[0], orgLevel: "", status: "active" as EmpStatus, employmentType: "Full-time",
};

function AddEmployeeModal({ onSave, onClose, orgLevels }: {
  onSave: (f: typeof emptyForm) => void; onClose: () => void; orgLevels: { name: string }[];
}) {
  const [form, setForm] = useState({ ...emptyForm });
  const set = (k: keyof typeof emptyForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const valid = Boolean(form.firstName.trim() && form.lastName.trim() && form.jobTitle.trim() && form.personalEmail.trim() && form.personalPhone.trim() && form.employmentDate.trim());

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
          <h2 className="text-lg font-semibold text-gray-900">Add New Employee</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* ── General Details ── */}
          <div>
            <h3 className="text-sm font-semibold text-indigo-700 mb-3 pb-1 border-b border-indigo-100">General Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">First Name <span className="text-red-500">*</span></label>
                <input value={form.firstName} onChange={e => set("firstName", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Middle Name</label>
                <input value={form.middleName} onChange={e => set("middleName", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Last Name <span className="text-red-500">*</span></label>
                <input value={form.lastName} onChange={e => set("lastName", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Job Title <span className="text-red-500">*</span></label>
                <input value={form.jobTitle} onChange={e => set("jobTitle", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Primary Supervisor</label>
                <input value={form.primarySupervisor} onChange={e => set("primarySupervisor", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Employment Date <span className="text-red-500">*</span></label>
                <input type="date" value={form.employmentDate} onChange={e => set("employmentDate", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
                <input type="date" value={form.dateOfBirth} onChange={e => set("dateOfBirth", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Marital Status</label>
                <select value={form.maritalStatus} onChange={e => set("maritalStatus", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="">Select…</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                <select value={form.department} onChange={e => set("department", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Org Unit</label>
                <select value={form.orgLevel} onChange={e => set("orgLevel", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="">Select org unit…</option>
                  {orgLevels.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Employment Type</label>
                <div className="flex gap-3 pt-1.5">
                  {(["Full-time", "Contract"] as const).map(t => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="empType" value={t} checked={form.employmentType === t}
                        onChange={() => set("employmentType", t)} className="accent-indigo-600" />
                      <span className="text-sm text-gray-700">{t}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Contact Details ── */}
          <div>
            <h3 className="text-sm font-semibold text-indigo-700 mb-3 pb-1 border-b border-indigo-100">Contact Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Personal Phone Number <span className="text-red-500">*</span></label>
                <input value={form.personalPhone} onChange={e => set("personalPhone", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Personal Email <span className="text-red-500">*</span></label>
                <input type="email" value={form.personalEmail} onChange={e => set("personalEmail", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                <textarea value={form.address} onChange={e => set("address", e.target.value)} rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Next of Kin</label>
                <input value={form.nextOfKin} onChange={e => set("nextOfKin", e.target.value)}
                  placeholder="Name, relationship, and phone number"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nationality</label>
                <input value={form.nationality} onChange={e => set("nationality", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </div>

          {/* ── Payment Details ── */}
          <div>
            <h3 className="text-sm font-semibold text-indigo-700 mb-3 pb-1 border-b border-indigo-100">Payment Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">PFA (Pension Fund Administrator)</label>
                <input value={form.pfa} onChange={e => set("pfa", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">RSA Number</label>
                <input value={form.rsaNumber} onChange={e => set("rsaNumber", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bank Name</label>
                <input value={form.bankName} onChange={e => set("bankName", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bank Account Number</label>
                <input value={form.bankAccount} onChange={e => set("bankAccount", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tax ID</label>
                <input value={form.taxId} onChange={e => set("taxId", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Salary Grade <span className="text-gray-400 font-normal">(pay grade / salary band)</span></label>
                <input value={form.grade} onChange={e => set("grade", e.target.value)}
                  placeholder="e.g. Level 7, L2, M2"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => valid && onSave(form)} disabled={!valid}
            className="px-4 py-2 bg-indigo-700 text-white rounded-md text-sm font-medium hover:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed">
            Create Employee
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmployeesPage() {
  const navigate = useNavigate();
  const { orgLevels } = useHRConfig();
  const { employees, addEmployee, syncEmployee } = useEmployees();
  const { addUserFromEmployee } = useUsers();
  const [search, setSearch] = useState("");
  const [advFilters, setAdvFilters] = useState<ActiveFilters>({});
  const [advSort, setAdvSort] = useState<SortConfig>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [welcomeNotice, setWelcomeNotice] = useState<{ name: string; email: string } | null>(null);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [creatingEmployee, setCreatingEmployee] = useState(false);

  function handleSort(col: string) {
    if (advSort?.field === col) {
      setAdvSort(advSort.direction === "asc" ? { field: col, direction: "desc" } : null);
    } else {
      setAdvSort({ field: col, direction: "asc" });
    }
  }

  const filtered = employees
    .filter(e => {
      const fullName = `${e.firstName} ${e.middleName} ${e.lastName}`;
      const matchSearch = `${fullName} ${e.id} ${e.jobTitle} ${e.department}`.toLowerCase().includes(search.toLowerCase());
      const matchAdv = Object.entries(advFilters).every(([key, vals]) => {
        const fieldVal = String((e as unknown as Record<string, unknown>)[key] ?? "");
        if (vals.text?.trim() && !fieldVal.toLowerCase().includes(vals.text.trim().toLowerCase())) return false;
        if (vals.selected?.length && !vals.selected.includes(fieldVal)) return false;
        return true;
      });
      return matchSearch && matchAdv;
    })
    .sort((a, b) => {
      if (!advSort) return 0;
      const sf = advSort.field;
      const aVal = sf === "name" ? `${a.firstName} ${a.lastName}` : String((a as unknown as Record<string, unknown>)[sf] ?? "");
      const bVal = sf === "name" ? `${b.firstName} ${b.lastName}` : String((b as unknown as Record<string, unknown>)[sf] ?? "");
      const cmp = aVal.localeCompare(bVal);
      return advSort.direction === "asc" ? cmp : -cmp;
    });

  function SortIcon({ col }: { col: string }) {
    if (advSort?.field !== col) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return advSort.direction === "asc" ? <ChevronUp className="w-3 h-3 text-indigo-600" /> : <ChevronDown className="w-3 h-3 text-indigo-600" />;
  }

  async function handleAddEmployee(form: typeof emptyForm) {
    setCreatingEmployee(true);
    setOnboardingError(null);
    try {
      const createdEmployee = await addEmployee({
        ...form,
        status: "active",
      });
      const fullName = `${createdEmployee.firstName} ${createdEmployee.lastName}`.trim();
      const newUser = await addUserFromEmployee(createdEmployee, createdEmployee.personalEmail, createdEmployee.jobTitle, ["ess", "hr"]);
      syncEmployee(createdEmployee.id, newUser.id);
      setShowAddModal(false);
      setWelcomeNotice({ name: fullName, email: createdEmployee.personalEmail });
    } catch (err) {
      setOnboardingError(err instanceof Error ? err.message : "Employee was not fully onboarded. Please try again.");
    } finally {
      setCreatingEmployee(false);
    }
  }

  function handleExportCSV() {
    const headers = ["Employee ID", "First Name", "Middle Name", "Last Name", "Job Title", "Department", "Org Unit", "Status", "Phone", "Email", "Employment Date", "Employment Type"];
    const rows = filtered.map(e => [e.id, e.firstName, e.middleName, e.lastName, e.jobTitle, e.department, e.orgLevel, statusConfig[e.status].label, e.personalPhone, e.personalEmail, e.employmentDate, e.employmentType]);
    exportCSV("employees", headers, rows);
  }

  const initials = (e: Employee) => `${e.firstName[0]}${e.lastName[0]}`;
  const avatarColors = ["bg-indigo-100 text-indigo-700", "bg-blue-100 text-blue-700", "bg-green-100 text-green-700", "bg-amber-100 text-amber-700", "bg-purple-100 text-purple-700", "bg-rose-100 text-rose-700"];
  const colorFor = (id: string) => avatarColors[parseInt(id.slice(-3)) % avatarColors.length];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">All Employees</h1>
          <p className="text-sm text-gray-500 mt-0.5">{employees.length} employees · {employees.filter(e => e.status === "active").length} active · {employees.filter(e => e.syncStatus === "unsynced").length} pending sync</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 text-white rounded-md text-sm hover:bg-indigo-800">
            <Plus className="w-3.5 h-3.5" /> Add Employee
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by name, ID, or job title..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <AdvancedFilter
          fields={EMPLOYEE_FILTER_FIELDS}
          filters={advFilters}
          onFiltersChange={setAdvFilters}
          sort={advSort}
          onSortChange={setAdvSort}
        />
        <span className="text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              {([
                { key: "id", label: "Employee ID" },
                { key: "name", label: "Full Name" },
                { key: "jobTitle", label: "Job Title" },
                { key: "department", label: "Department" },
                { key: "orgLevel", label: "Org Unit" },
                { key: "employmentDate", label: "Employment Date" },
                { key: "syncStatus", label: "Sync Status" },
                { key: "status", label: "Status" },
              ] as { key: string; label: string }[]).map(col => (
                <th key={col.key} className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer select-none" onClick={() => handleSort(col.key)}>
                  <div className="flex items-center gap-1">
                    {col.label}<SortIcon col={col.key} />
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Type</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(emp => {
              const cfg = statusConfig[emp.status];
              return (
                <tr key={emp.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/apps/hr/employees/${emp.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-gray-500">{emp.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${colorFor(emp.id)}`}>
                        {initials(emp)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-gray-400">{emp.personalEmail || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{emp.jobTitle}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{emp.department}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">{emp.orgLevel || "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{emp.employmentDate || "—"}</td>
                  <td className="px-4 py-3">
                    {emp.syncStatus === "synced" ? (
                      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium w-fit bg-emerald-100 text-emerald-700">
                        <CheckCircle className="w-3 h-3" /> Synced
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium w-fit bg-amber-100 text-amber-700">
                        <XCircle className="w-3 h-3" /> Unsynced
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium w-fit ${cfg.badge}`}>
                      {cfg.icon}{cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${empTypeColor[emp.employmentType] ?? "bg-gray-100 text-gray-600"}`}>{emp.employmentType}</span>
                  </td>
                  <td className="px-4 py-3 relative" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setMenuOpen(menuOpen === emp.id ? null : emp.id)} className="p-1 rounded hover:bg-gray-100">
                      <MoreHorizontal className="w-4 h-4 text-gray-400" />
                    </button>
                    {menuOpen === emp.id && (
                      <div className="absolute right-8 top-2 bg-white border border-gray-200 rounded-md shadow-lg z-10 py-1 min-w-[140px]">
                        <button onClick={() => navigate(`/apps/hr/employees/${emp.id}`)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><Eye className="w-3.5 h-3.5" /> View Profile</button>
                        <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><Edit className="w-3.5 h-3.5" /> Edit</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No employees match your filters</p>
          </div>
        )}
      </div>

      {showAddModal && <AddEmployeeModal onSave={handleAddEmployee} onClose={() => setShowAddModal(false)} orgLevels={orgLevels} />}

      {creatingEmployee && (
        <div className="fixed bottom-4 right-4 z-50 bg-white border border-indigo-100 shadow-lg rounded-lg px-4 py-3 text-sm text-indigo-700">
          Creating employee and sending welcome invite...
        </div>
      )}

      {onboardingError && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-50 border border-red-200 shadow-lg rounded-lg px-4 py-3 text-sm text-red-700 max-w-md">
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Onboarding incomplete</p>
              <p>{onboardingError}</p>
              <button onClick={() => setOnboardingError(null)} className="text-xs font-semibold mt-2 text-red-800">Dismiss</button>
            </div>
          </div>
        </div>
      )}

      {welcomeNotice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Employee Onboarded Successfully</h3>
              <p className="text-sm text-gray-600 mt-1">
                A welcome message for <strong className="text-gray-900">{welcomeNotice.name}</strong> has been automatically generated and sent to <span className="font-mono text-indigo-600">{welcomeNotice.email}</span> using the configured Admin Email Template (<em>Employee Onboarding Initiated / New User Created</em>).
              </p>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-800 text-left">
              <p className="font-semibold mb-0.5">Email Configuration Summary:</p>
              <p>• Trigger: Employee Onboarding Initiated</p>
              <p>• Recipient: {welcomeNotice.email}</p>
              <p>• Flow: User auto-synced to Admin Users module</p>
            </div>
            <button onClick={() => setWelcomeNotice(null)} className="w-full py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-sm font-medium">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
