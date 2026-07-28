import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  fetchEmployees,
  createEmployee,
  EMPLOYMENT_TYPE_TO_BACKEND,
} from "../../api/employees";
import { fetchDepartments } from "../../api/departments";
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
  role: string;
  departmentId: string;
  email: string;
  phone: string;
  employmentType: string;
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
}

const emptyEmpForm: AddEmpForm = {
  firstName: "",
  lastName: "",
  role: "",
  departmentId: "",
  email: "",
  phone: "",
  employmentType: "Full-time",
};

function AddEmployeeModal({
  onSave,
  onClose,
  departments,
  saving,
}: {
  onSave: (f: AddEmpForm) => void;
  onClose: () => void;
  departments: { id: string; name: string }[];
  saving: boolean;
}) {
  const [form, setForm] = useState<AddEmpForm>({ ...emptyEmpForm });
  const set = (k: keyof AddEmpForm, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));
  const valid =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.role.trim() &&
    form.departmentId;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
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
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Role / Position <span className="text-red-500">*</span>
            </label>
            <input
              value={form.role}
              onChange={(e) => set("role", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              value={form.departmentId}
              onChange={(e) => set("departmentId", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Select department…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Phone
            </label>
            <input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Employment Type
            </label>
            <div className="flex gap-3">
              {(["Full-time", "Contract"] as const).map((t) => (
                <label
                  key={t}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="empType"
                    value={t}
                    checked={form.employmentType === t}
                    onChange={() => set("employmentType", t)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700">{t}</span>
                </label>
              ))}
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
            onClick={() => valid && onSave(form)}
            disabled={!valid || saving}
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
  const [loading, setLoading] = useState(true);

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
    createEmployee({
      firstName: form.firstName,
      lastName: form.lastName,
      role: form.role,
      departmentId: form.departmentId,
      email:
        form.email ||
        `${form.firstName.toLowerCase()}.${form.lastName.toLowerCase()}@buildos.ng`,
      phone: form.phone || "",
      employmentType:
        EMPLOYMENT_TYPE_TO_BACKEND[form.employmentType] ?? form.employmentType,
      status: "active",
      dateHired: new Date().toISOString(),
    })
      .then(() => loadEmployees())
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
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
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
          saving={creatingEmployee}
        />
      )}
    </div>
  );
}
