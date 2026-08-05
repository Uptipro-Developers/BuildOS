import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  fetchEmployees,
  createEmployee,
  toEmployeeCreatePayload,
} from "../../api/employees";
import { fetchDepartments } from "../../api/departments";
import { fetchOrgUnits } from "../../api/org-units";
import { useNumbering } from "../../stores/numberingStore";
import { useClickOutside } from "../../utils/useClickOutside";
import {
  Users,
  Search,
  Plus,
  Download,
  ChevronUp,
  ChevronDown,
  Eye,
  Edit,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  UserCheck,
  Clock,
  X,
} from "lucide-react";
import { exportCSV } from "../../utils/exportCSV";
import {
  AdvancedFilter,
  type FilterFieldDef,
  type ActiveFilters,
  type SortConfig,
} from "../../components/AdvancedFilter";

type EmpStatus = "active" | "inactive" | "on_leave";

const statusConfig: Record<
  EmpStatus,
  { label: string; badge: string; icon: React.ReactNode }
> = {
  active: {
    label: "Active",
    badge: "bg-green-100 text-green-700",
    icon: <CheckCircle className="w-3.5 h-3.5 text-green-600" />,
  },
  inactive: {
    label: "Inactive",
    badge: "bg-red-100 text-red-700",
    icon: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  },
  on_leave: {
    label: "On Leave",
    badge: "bg-amber-100 text-amber-700",
    icon: <UserCheck className="w-3.5 h-3.5 text-amber-500" />,
  },
};

const empTypeColor: Record<string, string> = {
  "Full-time": "bg-indigo-100 text-indigo-700",
  Contract: "bg-orange-100 text-orange-700",
};

function buildEmployeeFilterFields(
  departmentNames: string[],
): FilterFieldDef[] {
  return [
    { key: "role", label: "Role / Position", type: "text" },
    {
      key: "department",
      label: "Department",
      type: "select",
      options: departmentNames,
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["active", "inactive", "on_leave"],
    },
    {
      key: "employmentType",
      label: "Employment Type",
      type: "select",
      options: ["Full-time", "Contract"],
    },
  ];
}

interface AddEmpForm {
  firstName: string;
  lastName: string;
  middleName: string;
  role: string;
  departmentId: string;
  email: string;
  phone: string;
  employmentType: string;
  dateOfBirth: string;
  gender: string;
  supervisorId: string;
  gradeLevel: string;
  baseSalary: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  taxId: string;
  pensionId: string;
  emergencyContact: string;
  emergencyPhone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  // Present in the design's Add/Edit Employee form but previously not captured.
  employmentDate: string;
  maritalStatus: string;
  orgUnit: string;
  nationality: string;
  rsaNumber: string;
}

interface EmployeeRow {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
  status: EmpStatus;
  email: string;
  phone: string;
  dateHired: string;
  dateHiredISO: string;
  employmentType: string;
  projectCount: number;
  projects: string[];
  /** Derived from the linked login account: 'synced' once a User row exists. */
  syncStatus: "synced" | "unsynced";
}

const emptyEmpForm: AddEmpForm = {
  firstName: "",
  lastName: "",
  middleName: "",
  role: "",
  departmentId: "",
  email: "",
  phone: "",
  employmentType: "Full-time",
  dateOfBirth: "",
  gender: "",
  supervisorId: "",
  gradeLevel: "",
  baseSalary: "",
  bankName: "",
  accountNumber: "",
  accountHolder: "",
  taxId: "",
  pensionId: "",
  emergencyContact: "",
  emergencyPhone: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  employmentDate: "",
  maritalStatus: "",
  orgUnit: "",
  nationality: "",
  rsaNumber: "",
};

function FormField({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}

const inputClass =
  "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
const errorInputClass =
  "w-full border border-red-400 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400";

type EmpFormErrors = Partial<Record<keyof AddEmpForm, string>>;

/**
 * Fields HR must capture before an employee record is considered complete.
 * Supervisor is validated conditionally by the caller: it can only be required
 * once at least one active employee exists to pick, otherwise the very first
 * employee in a company could never be created.
 */
function validateEmployeeForm(
  form: AddEmpForm,
  opts: { supervisorRequired: boolean },
): EmpFormErrors {
  const errors: EmpFormErrors = {};
  const req = (key: keyof AddEmpForm, label: string) => {
    if (!String(form[key] ?? "").trim()) errors[key] = `${label} is required.`;
  };

  req("firstName", "First name");
  req("lastName", "Last name");
  req("role", "Role / position");
  req("gender", "Gender");
  req("dateOfBirth", "Date of birth");
  req("address", "Address");
  req("city", "City");
  req("state", "State");
  req("emergencyContact", "Next of kin contact");
  req("emergencyPhone", "Emergency phone");
  req("gradeLevel", "Salary grade");

  if (opts.supervisorRequired) req("supervisorId", "Supervisor");

  const email = form.email.trim();
  if (!email) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  const phone = form.phone.trim();
  if (!phone) {
    errors.phone = "Phone is required.";
  } else if (!/^[+\d][\d\s\-().]{5,19}$/.test(phone)) {
    errors.phone = "Enter a valid phone number.";
  }

  const salary = form.baseSalary.trim();
  if (!salary) {
    errors.baseSalary = "Base salary is required.";
  } else if (!Number.isFinite(Number(salary)) || Number(salary) <= 0) {
    errors.baseSalary = "Enter a base salary greater than zero.";
  }

  if (form.dateOfBirth.trim()) {
    const dob = new Date(form.dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      errors.dateOfBirth = "Enter a valid date of birth.";
    } else if (dob > new Date()) {
      errors.dateOfBirth = "Date of birth cannot be in the future.";
    }
  }

  return errors;
}

function AddEmployeeModal({
  onSave,
  onClose,
  departments,
  activeEmployees,
  orgUnits,
  saving,
}: {
  onSave: (f: AddEmpForm) => void;
  onClose: () => void;
  departments: { id: string; name: string }[];
  activeEmployees: { id: string; firstName: string; lastName: string }[];
  orgUnits: string[];
  saving: boolean;
}) {
  const [form, setForm] = useState<AddEmpForm>({ ...emptyEmpForm });
  const [errors, setErrors] = useState<EmpFormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const set = (k: keyof AddEmpForm, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    // Clear the field's error as soon as the user starts correcting it.
    setErrors((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev));
  };

  // The first employee in a company has nobody to report to, so Supervisor only
  // becomes mandatory once there is at least one active employee to select.
  const supervisorRequired = activeEmployees.length > 0;
  const cls = (k: keyof AddEmpForm) => (errors[k] ? errorInputClass : inputClass);

  const handleSubmit = () => {
    const found = validateEmployeeForm(form, { supervisorRequired });
    setErrors(found);
    setSubmitted(true);
    if (Object.keys(found).length === 0) onSave(form);
  };

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Add New Employee
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-6 overflow-y-auto">
          {submitted && errorCount > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Please correct {errorCount} highlighted {errorCount === 1 ? "field" : "fields"} before creating this employee.
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">General</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="First Name" required error={errors.firstName}>
                <input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className={cls("firstName")} />
              </FormField>
              <FormField label="Last Name" required error={errors.lastName}>
                <input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className={cls("lastName")} />
              </FormField>
              <FormField label="Middle Name">
                <input value={form.middleName} onChange={(e) => set("middleName", e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Role / Position" required error={errors.role}>
                <input value={form.role} onChange={(e) => set("role", e.target.value)} className={cls("role")} />
              </FormField>
              <FormField label="Department">
                <select value={form.departmentId} onChange={(e) => set("departmentId", e.target.value)} className={`${inputClass} bg-white`}>
                  <option value="">Select department…</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </FormField>
              <FormField
                label="Supervisor"
                required={supervisorRequired}
                error={errors.supervisorId}
                hint={supervisorRequired ? undefined : "No eligible supervisors yet — optional for the first employee."}
              >
                <select
                  value={form.supervisorId}
                  onChange={(e) => set("supervisorId", e.target.value)}
                  disabled={!supervisorRequired}
                  className={`${cls("supervisorId")} bg-white disabled:bg-gray-50 disabled:text-gray-400`}
                >
                  <option value="">Select supervisor…</option>
                  {activeEmployees.map((e) => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Date of Birth" required error={errors.dateOfBirth}>
                <input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} className={cls("dateOfBirth")} />
              </FormField>
              <FormField label="Gender" required error={errors.gender}>
                <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className={`${cls("gender")} bg-white`}>
                  <option value="">Select…</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </FormField>
              <FormField label="Employment Date">
                <input type="date" value={form.employmentDate} onChange={(e) => set("employmentDate", e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Marital Status">
                <select value={form.maritalStatus} onChange={(e) => set("maritalStatus", e.target.value)} className={`${inputClass} bg-white`}>
                  <option value="">Select…</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </FormField>
              <FormField label="Org Unit">
                <select value={form.orgUnit} onChange={(e) => set("orgUnit", e.target.value)} className={`${inputClass} bg-white`}>
                  <option value="">Select org unit…</option>
                  {orgUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </FormField>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Employment Type</label>
                <div className="flex gap-3">
                  {(["Full-time", "Contract"] as const).map((t) => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="empType" value={t} checked={form.employmentType === t} onChange={() => set("employmentType", t)} className="accent-indigo-600" />
                      <span className="text-sm text-gray-700">{t}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Contact</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Email" required error={errors.email}>
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={cls("email")} />
              </FormField>
              <FormField label="Phone" required error={errors.phone}>
                <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={cls("phone")} />
              </FormField>
              <FormField label="Address" required error={errors.address}>
                <input value={form.address} onChange={(e) => set("address", e.target.value)} className={cls("address")} />
              </FormField>
              <FormField label="City" required error={errors.city}>
                <input value={form.city} onChange={(e) => set("city", e.target.value)} className={cls("city")} />
              </FormField>
              <FormField label="State" required error={errors.state}>
                <input value={form.state} onChange={(e) => set("state", e.target.value)} className={cls("state")} />
              </FormField>
              <FormField label="Zip Code">
                <input value={form.zipCode} onChange={(e) => set("zipCode", e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Nationality">
                <input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Next of Kin Contact" required error={errors.emergencyContact}>
                <input value={form.emergencyContact} onChange={(e) => set("emergencyContact", e.target.value)} className={cls("emergencyContact")} />
              </FormField>
              <FormField label="Emergency Phone" required error={errors.emergencyPhone}>
                <input value={form.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} className={cls("emergencyPhone")} />
              </FormField>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Payment</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Salary Grade" required error={errors.gradeLevel}>
                <input value={form.gradeLevel} onChange={(e) => set("gradeLevel", e.target.value)} className={cls("gradeLevel")} />
              </FormField>
              <FormField label="Base Salary" required error={errors.baseSalary}>
                <input type="number" min="0" value={form.baseSalary} onChange={(e) => set("baseSalary", e.target.value)} className={cls("baseSalary")} />
              </FormField>
              <FormField label="Bank Name">
                <input value={form.bankName} onChange={(e) => set("bankName", e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Account Number">
                <input value={form.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Account Holder">
                <input value={form.accountHolder} onChange={(e) => set("accountHolder", e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Tax ID">
                <input value={form.taxId} onChange={(e) => set("taxId", e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="PFA (Pension Fund Administrator)">
                <input value={form.pensionId} onChange={(e) => set("pensionId", e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="RSA Number">
                <input value={form.rsaNumber} onChange={(e) => set("rsaNumber", e.target.value)} className={inputClass} />
              </FormField>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-indigo-700 text-white rounded-md text-sm font-medium hover:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Creating\u2026" : "Create Employee"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmployeesPage() {
  const navigate = useNavigate();
  const { configs } = useNumbering();
  const [empList, setEmpList] = useState<EmployeeRow[]>([]);
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);
  /** Org units for the form's Org Unit select, from the HR org structure. */
  const [orgUnits, setOrgUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrgUnits()
      .then((units) =>
        setOrgUnits(
          (Array.isArray(units) ? units : [])
            .map((u: any) => String(u?.name ?? "").trim())
            .filter(Boolean),
        ),
      )
      .catch(() => setOrgUnits([]));
  }, []);

  function loadEmployees() {
    return fetchEmployees().then((data) =>
      setEmpList(
        data.map((e: any) => ({
          ...e,
          status:
            e.status === "active" ||
            e.status === "inactive" ||
            e.status === "on_leave"
              ? e.status
              : "active",
          projects: Array.isArray(e.projects) ? e.projects : [],
          dateHiredISO: e.dateHiredISO ?? "",
          syncStatus: e.syncStatus === "synced" ? "synced" : "unsynced",
        })),
      ),
    );
  }

  useEffect(() => {
    Promise.all([
      loadEmployees(),
      fetchDepartments().then((depts) =>
        setDepartments(depts.map((d) => ({ id: d.id, name: d.name }))),
      ),
    ])
      .catch(() => toast.error("Failed to load employees"))
      .finally(() => setLoading(false));
  }, []);

  const [search, setSearch] = useState("");
  const [advFilters, setAdvFilters] = useState<ActiveFilters>({});
  const [advSort, setAdvSort] = useState<SortConfig>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [creatingEmployee, setCreatingEmployee] = useState(false);
  const menuRef = useRef<HTMLTableCellElement>(null);
  useClickOutside(menuRef, menuOpen !== null, () => setMenuOpen(null));

  const employeeFilterFields = buildEmployeeFilterFields(
    departments.map((d) => d.name),
  );

  // Stable, human-friendly Employee IDs following the numbering template
  // configured for the "Employee" module (e.g. EMP-001), independent of
  // search/sort/filter order.
  const idCfg = configs.find((c) => c.module === "Employee");
  const idOrder = [...empList].sort((a, b) => a.id.localeCompare(b.id));
  const displayIdMap = new Map<string, string>(
    idOrder.map((e, i) => [
      e.id,
      idCfg
        ? `${idCfg.prefix}${idCfg.separator}${String(i + 1).padStart(idCfg.padLength, "0")}`
        : e.id,
    ]),
  );
  const displayId = (id: string) => displayIdMap.get(id) ?? id;

  function handleSort(col: string) {
    if (advSort?.field === col) {
      setAdvSort(
        advSort.direction === "asc" ? { field: col, direction: "desc" } : null,
      );
    } else {
      setAdvSort({ field: col, direction: "asc" });
    }
  }

  const filtered = empList
    .filter((e) => {
      const matchSearch =
        `${e.firstName} ${e.lastName} ${displayId(e.id)} ${e.role}`
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchAdv = Object.entries(advFilters).every(([key, vals]) => {
        const fieldVal = String(e[key as keyof EmployeeRow] ?? "");
        if (
          vals.text?.trim() &&
          !fieldVal.toLowerCase().includes(vals.text.trim().toLowerCase())
        )
          return false;
        if (vals.selected?.length && !vals.selected.includes(fieldVal))
          return false;
        return true;
      });
      return matchSearch && matchAdv;
    })
    .sort((a, b) => {
      if (!advSort) return 0;
      const sf = advSort.field;
      const aVal =
        sf === "name"
          ? `${a.firstName} ${a.lastName}`
          : String(a[sf as keyof EmployeeRow] ?? "");
      const bVal =
        sf === "name"
          ? `${b.firstName} ${b.lastName}`
          : String(b[sf as keyof EmployeeRow] ?? "");
      const cmp = aVal.localeCompare(bVal);
      return advSort.direction === "asc" ? cmp : -cmp;
    });

  function SortIcon({ col }: { col: string }) {
    if (advSort?.field !== col)
      return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return advSort.direction === "asc" ? (
      <ChevronUp className="w-3 h-3 text-indigo-600" />
    ) : (
      <ChevronDown className="w-3 h-3 text-indigo-600" />
    );
  }

  function handleAddEmployee(form: AddEmpForm) {
    setCreatingEmployee(true);
    createEmployee(
      toEmployeeCreatePayload({
        ...form,
        email:
          form.email ||
          `${form.firstName.toLowerCase()}.${form.lastName.toLowerCase()}@buildos.ng`,
      }),
    )
      .then((created) => {
        if (created?.onboardingWarning) toast.warning(created.onboardingWarning);
        return loadEmployees();
      })
      .then(() => {
        setShowAddModal(false);
        toast.success("Employee created");
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to create employee. Please try again.");
      })
      .finally(() => setCreatingEmployee(false));
  }

  function handleExportCSV() {
    const headers = [
      "Employee ID",
      "First Name",
      "Last Name",
      "Role",
      "Department",
      "Status",
      "Email",
      "Phone",
      "Date Hired",
      "Employment Type",
      "Projects",
    ];
    const rows = filtered.map((e) => [
      displayId(e.id),
      e.firstName,
      e.lastName,
      e.role ?? "",
      e.department ?? "",
      statusConfig[e.status as EmpStatus]?.label ?? e.status,
      e.email ?? "",
      e.phone ?? "",
      e.dateHiredISO || e.dateHired,
      e.employmentType ?? "",
      (e.projects ?? []).join("; "),
    ]);
    exportCSV("employees", headers, rows);
    toast.success(`Exported ${rows.length} employees.`);
  }

  const initials = (e: EmployeeRow) => `${e.firstName[0]}${e.lastName[0]}`;
  const avatarColors = [
    "bg-indigo-100 text-indigo-700",
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-amber-100 text-amber-700",
    "bg-purple-100 text-purple-700",
    "bg-rose-100 text-rose-700",
  ];
  const colorFor = (id: string) => {
    const hash = Array.from(id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return avatarColors[hash % avatarColors.length];
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            All Employees
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {empList.length} employees ·{" "}
            {empList.filter((e) => e.status === "active").length} active
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 text-white rounded-md text-sm hover:bg-indigo-800"
          >
            <Plus className="w-3.5 h-3.5" /> Add Employee
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, ID, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <AdvancedFilter
          fields={employeeFilterFields}
          filters={advFilters}
          onFiltersChange={setAdvFilters}
          sort={advSort}
          onSortChange={setAdvSort}
        />
        <span className="text-xs text-gray-400">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              {(
                [
                  { key: "id", label: "Employee ID" },
                  { key: "name", label: "Full Name" },
                  { key: "role", label: "Role / Position" },
                  { key: "department", label: "Department" },
                  { key: "dateHired", label: "Date Hired" },
                  { key: "status", label: "Status" },
                ] as { key: string; label: string }[]
              ).map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer select-none"
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col.key} />
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                Projects
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                Type
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                System Access
              </th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((emp) => {
              const cfg = statusConfig[emp.status as EmpStatus] ?? {
                badge: "bg-gray-100 text-gray-700",
                icon: <Clock className="w-3.5 h-3.5 text-gray-500" />,
                label: String(emp.status ?? "Unknown"),
              };
              return (
                <tr
                  key={emp.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() =>
                    navigate(
                      `/apps/hr/employees/${emp.id}?displayId=${encodeURIComponent(displayId(emp.id))}`,
                    )
                  }
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium text-gray-500">
                    {displayId(emp.id)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${colorFor(emp.id)}`}
                      >
                        {initials(emp)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {emp.firstName} {emp.lastName}
                        </p>
                        <p className="text-xs text-gray-400">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{emp.role}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {emp.department}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {emp.dateHired}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium w-fit ${cfg.badge}`}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {emp.projectCount > 0 ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {emp.projectCount} project
                          {emp.projectCount > 1 ? "s" : ""}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${empTypeColor[emp.employmentType] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {emp.employmentType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {emp.syncStatus === "synced" ? (
                      <span
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium w-fit bg-emerald-100 text-emerald-700"
                        title="A login account has been created for this employee"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Synced
                      </span>
                    ) : (
                      <span
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium w-fit bg-amber-100 text-amber-700"
                        title="Awaiting sync to a user account in Admin › Users"
                      >
                        <Clock className="w-3.5 h-3.5" /> Pending sync
                      </span>
                    )}
                  </td>
                  <td
                    className="px-4 py-3 relative"
                    ref={menuOpen === emp.id ? menuRef : undefined}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() =>
                        setMenuOpen(menuOpen === emp.id ? null : emp.id)
                      }
                      className="p-1 rounded hover:bg-gray-100"
                    >
                      <MoreHorizontal className="w-4 h-4 text-gray-400" />
                    </button>
                    {menuOpen === emp.id && (
                      <div className="absolute right-8 top-2 bg-white border border-gray-200 rounded-md shadow-lg z-10 py-1 min-w-[140px]">
                        <button
                          onClick={() =>
                            navigate(
                              `/apps/hr/employees/${emp.id}?displayId=${encodeURIComponent(displayId(emp.id))}`,
                            )
                          }
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Profile
                        </button>
                        <button
                          onClick={() => {
                            setMenuOpen(null);
                            navigate(
                              `/apps/hr/employees/${emp.id}?edit=1&displayId=${encodeURIComponent(displayId(emp.id))}`,
                            );
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading && (
          <div className="text-center py-12 text-gray-400 text-sm">
            Loading employees…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No employees match your filters</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddEmployeeModal
          onSave={handleAddEmployee}
          onClose={() => setShowAddModal(false)}
          departments={departments}
          activeEmployees={empList.filter((e) => e.status === "active")}
          orgUnits={orgUnits}
          saving={creatingEmployee}
        />
      )}
    </div>
  );
}
