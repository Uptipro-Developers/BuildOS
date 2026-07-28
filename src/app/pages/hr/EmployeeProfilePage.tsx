import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  getCurrencySymbol,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";
import {
  getActivityHistory,
  type ActivityRecord,
} from "../../api/activity-history";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  BadgeCheck,
  Briefcase,
  FileText,
  Clock,
  DollarSign,
  Activity,
  Edit,
  Download,
  CheckCircle,
  AlertCircle,
  X,
  Save,
} from "lucide-react";
import {
  fetchEmployee,
  updateEmployee,
  toEmployeeUpdatePayload,
} from "../../api/employees";
import { fetchDepartments } from "../../api/departments";
import {
  getAttendance,
  getPayslips,
  type AttendanceRecord,
  type Payslip,
} from "../../api/hr-extras";
import {
  getWorkforceAllocations,
  type WorkforceAllocation,
} from "../../api/workforce-allocation";

type TabId =
  | "personal"
  | "employment"
  | "projects"
  | "documents"
  | "attendance"
  | "payroll"
  | "activity";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: "personal",
    label: "Personal Info",
    icon: <BadgeCheck className="w-4 h-4" />,
  },
  {
    id: "employment",
    label: "Employment",
    icon: <Briefcase className="w-4 h-4" />,
  },
  {
    id: "projects",
    label: "Projects",
    icon: <Building2 className="w-4 h-4" />,
  },
  {
    id: "documents",
    label: "Documents",
    icon: <FileText className="w-4 h-4" />,
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: <Clock className="w-4 h-4" />,
  },
  { id: "payroll", label: "Payroll", icon: <DollarSign className="w-4 h-4" /> },
  {
    id: "activity",
    label: "Activity Log",
    icon: <Activity className="w-4 h-4" />,
  },
];

const statusConfig: Record<string, { label: string; badge: string }> = {
  active: { label: "Active", badge: "bg-green-100 text-green-700" },
  inactive: { label: "Inactive", badge: "bg-red-100 text-red-700" },
  on_leave: { label: "On Leave", badge: "bg-amber-100 text-amber-700" },
};

const attendanceBadge: Record<string, string> = {
  present: "bg-green-100 text-green-700",
  absent: "bg-red-100 text-red-700",
  late: "bg-amber-100 text-amber-700",
};

export function EmployeeProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<TabId>("personal");
  const [emp, setEmp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [projects, setProjects] = useState<WorkforceAllocation[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityRecord[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<any>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);

  // Human-friendly display ID passed from the list page
  const displayId = searchParams.get("displayId") ?? emp?.id ?? "";

  useEffect(() => {
    fetchDepartments()
      .then((depts) =>
        setDepartments(depts.map((d) => ({ id: d.id, name: d.name }))),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetchEmployee(id),
      getAttendance(id),
      getPayslips(id),
      getWorkforceAllocations(id),
      getActivityHistory("Employee", id),
    ])
      .then(([e, att, slips, allocs, acts]) => {
        setEmp(e);
        setAttendance(att);
        setPayslips(slips);
        setProjects(allocs);
        setActivityLog(acts);
        setEditDraft({ ...e });
        if (searchParams.get("edit") === "1") {
          setEditOpen(true);
          setSearchParams({}, { replace: true });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  function openEdit() {
    setEditDraft({ ...emp });
    setEditErrors({});
    setEditOpen(true);
  }

  function validateEditDraft(draft: any): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!draft.firstName?.trim()) errs.firstName = "First name is required";
    if (!draft.lastName?.trim()) errs.lastName = "Last name is required";
    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email))
      errs.email = "Enter a valid email address";
    if (draft.phone && !/^\+?[\d\s\-().]{7,20}$/.test(draft.phone))
      errs.phone = "Enter a valid phone number";
    return errs;
  }

  function saveEdit() {
    const errs = validateEditDraft(editDraft);
    if (Object.keys(errs).length) {
      setEditErrors(errs);
      return;
    }
    setSaving(true);
    updateEmployee(emp.id, toEmployeeUpdatePayload(editDraft))
      .then(() => {
        setEmp((prev: any) => ({ ...prev, ...editDraft }));
        setEditOpen(false);
        toast.success("Employee updated");
      })
      .catch((err) => {
        toast.error("Failed to save employee. Please try again.");
        console.error(err);
      })
      .finally(() => setSaving(false));
  }

  function df(key: string, value: string) {
    setEditDraft((prev: any) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        Loading employee data…
      </div>
    );
  }

  if (!emp) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-gray-400 text-sm">Employee not found.</p>
        <button
          onClick={() => navigate("/apps/hr/employees")}
          className="text-indigo-600 text-sm hover:underline"
        >
          Back to Employees
        </button>
      </div>
    );
  }

  const initials = `${emp.firstName?.[0] ?? ""}${emp.lastName?.[0] ?? ""}`;
  const statusCfg = statusConfig[emp.status] ?? statusConfig.active;
  const avatarColors = [
    "bg-indigo-100 text-indigo-700",
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
  ];
  const avColor =
    avatarColors[
      parseInt((emp.id ?? "0").replace(/\D/g, "").slice(-3) || "0") %
        avatarColors.length
    ];

  return (
    <div className="space-y-5">
      {/* Back + header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/apps/hr/employees")}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0 ${avColor}`}
          >
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900">
                {emp.firstName} {emp.lastName}
              </h1>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.badge}`}
              >
                {statusCfg.label}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {emp.role} · {emp.department}
            </p>
            <p className="text-xs text-gray-400 font-mono">{displayId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            <Download className="w-3.5 h-3.5" /> Export Profile
          </button>
          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 text-white rounded-md text-sm hover:bg-indigo-800"
          >
            <Edit className="w-3.5 h-3.5" /> Edit Employee
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 -mb-px">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 whitespace-nowrap ${tab === t.id ? "border-indigo-600 text-indigo-700 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Personal Info */}
      {tab === "personal" && (
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h3 className="font-semibold text-gray-800 text-sm">
              Personal Details
            </h3>
            {[
              {
                label: "Full Name",
                value: `${emp.firstName} ${emp.lastName}`,
                icon: <BadgeCheck className="w-4 h-4 text-indigo-500" />,
              },
              {
                label: "Date of Birth",
                value: "—",
                icon: <Calendar className="w-4 h-4 text-indigo-500" />,
              },
              {
                label: "Gender",
                value: "—",
                icon: <BadgeCheck className="w-4 h-4 text-indigo-500" />,
              },
              {
                label: "Nationality",
                value: "—",
                icon: <MapPin className="w-4 h-4 text-indigo-500" />,
              },
              {
                label: "Address",
                value: "—",
                icon: <MapPin className="w-4 h-4 text-indigo-500" />,
              },
            ].map((r) => (
              <div key={r.label} className="flex items-start gap-3">
                <div className="mt-0.5">{r.icon}</div>
                <div>
                  <p className="text-xs text-gray-400">{r.label}</p>
                  <p className="text-sm font-medium text-gray-800">{r.value}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-5">
            <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
              <h3 className="font-semibold text-gray-800 text-sm">
                Contact Details
              </h3>
              {[
                {
                  label: "Email",
                  value: emp.email ?? "—",
                  icon: <Mail className="w-4 h-4 text-indigo-500" />,
                },
                {
                  label: "Phone",
                  value: emp.phone ?? "—",
                  icon: <Phone className="w-4 h-4 text-indigo-500" />,
                },
                {
                  label: "Emergency Contact",
                  value:
                    [emp.emergencyContact, emp.emergencyPhone]
                      .filter(Boolean)
                      .join(" · ") || "—",
                  icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
                },
              ].map((r) => (
                <div key={r.label} className="flex items-start gap-3">
                  <div className="mt-0.5">{r.icon}</div>
                  <div>
                    <p className="text-xs text-gray-400">{r.label}</p>
                    <p className="text-sm font-medium text-gray-800">
                      {r.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 text-sm mb-3">
                Core Skills
              </h3>
              <p className="text-xs text-gray-400 italic">
                Skills not yet available.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Employment */}
      {tab === "employment" && (
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h3 className="font-semibold text-gray-800 text-sm">
              Employment Details
            </h3>
            {[
              { label: "Employee ID", value: displayId },
              { label: "Job Title / Role", value: emp.role },
              { label: "Department", value: emp.department || "—" },
              { label: "Grade Level", value: emp.gradeLevel || "—" },
              { label: "Employment Type", value: emp.employmentType ?? "—" },
              { label: "Date Hired", value: emp.dateHired ?? "—" },
              {
                label: "Monthly Salary",
                value:
                  emp.baseSalary > 0
                    ? `${getCurrencySymbol()}${formatNumberByGeneralSettings(emp.baseSalary)}`
                    : "—",
              },
            ].map((r) => (
              <div
                key={r.label}
                className="flex justify-between py-1 border-b border-gray-50 last:border-0"
              >
                <span className="text-xs text-gray-400">{r.label}</span>
                <span className="text-sm font-medium text-gray-800">
                  {r.value}
                </span>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 text-sm mb-4">
              Employment Status
            </h3>
            <div
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${statusCfg.badge}`}
            >
              <CheckCircle className="w-4 h-4" />
              {statusCfg.label}
            </div>
          </div>
        </div>
      )}

      {/* Projects */}
      {tab === "projects" && (
        <div className="space-y-3">
          {projects.length === 0 && (
            <p className="text-sm text-gray-400 py-8 text-center">
              No project allocations found.
            </p>
          )}
          {projects.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">{p.projectName}</p>
                  <p className="text-xs text-gray-500">
                    {p.role} · Started {p.startDate}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-indigo-700">
                    {p.allocPct}%
                  </span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded capitalize">
                    {p.status}
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full"
                  style={{ width: `${p.allocPct}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Documents */}
      {tab === "documents" && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">
            Document storage not yet connected
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Documents will appear here once the document management module is
            integrated.
          </p>
        </div>
      )}

      {/* Attendance */}
      {tab === "attendance" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-800 text-sm">
              Recent Attendance History
            </h3>
          </div>
          {attendance.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              No attendance records found.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    Date
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    Check In
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    Check Out
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    Status
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    Hours
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {attendance.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800">{a.date}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {a.clockIn ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {a.clockOut ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${attendanceBadge[a.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {a.hoursWorked != null ? `${a.hoursWorked}h` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Payroll */}
      {tab === "payroll" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-800 text-sm">
              Payroll History
            </h3>
          </div>
          {payslips.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              No payroll records found.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    Period
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    Gross Pay
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    Deductions
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    Net Pay
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payslips.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {p.period}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {getCurrencySymbol()}
                      {formatNumberByGeneralSettings(p.grossPay)}
                    </td>
                    <td className="px-4 py-3 text-red-500">
                      -{getCurrencySymbol()}
                      {formatNumberByGeneralSettings(p.deductions)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-green-700">
                      {getCurrencySymbol()}
                      {formatNumberByGeneralSettings(p.netPay)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${p.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Activity */}
      {tab === "activity" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-800 text-sm">Activity Log</h3>
          </div>
          {activityLog.length === 0 ? (
            <div className="py-12 text-center">
              <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No activity recorded yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {activityLog.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{a.action}</span>
                      {a.description ? ` — ${a.description}` : ""}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Edit Employee Modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Edit Employee — {emp.id}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Update employment and personal details. Signature is managed
                  by the employee.
                </p>
              </div>
              <button
                onClick={() => setEditOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={editDraft.firstName}
                    onChange={(e) => {
                      df("firstName", e.target.value);
                      setEditErrors((p) => ({ ...p, firstName: "" }));
                    }}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${editErrors.firstName ? "border-red-400" : "border-gray-300"}`}
                  />
                  {editErrors.firstName && (
                    <p className="text-xs text-red-500 mt-1">
                      {editErrors.firstName}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={editDraft.lastName}
                    onChange={(e) => {
                      df("lastName", e.target.value);
                      setEditErrors((p) => ({ ...p, lastName: "" }));
                    }}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${editErrors.lastName ? "border-red-400" : "border-gray-300"}`}
                  />
                  {editErrors.lastName && (
                    <p className="text-xs text-red-500 mt-1">
                      {editErrors.lastName}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Email
                  </label>
                  <input
                    value={editDraft.email}
                    onChange={(e) => {
                      df("email", e.target.value);
                      setEditErrors((p) => ({ ...p, email: "" }));
                    }}
                    type="email"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${editErrors.email ? "border-red-400" : "border-gray-300"}`}
                  />
                  {editErrors.email && (
                    <p className="text-xs text-red-500 mt-1">
                      {editErrors.email}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Phone
                  </label>
                  <input
                    value={editDraft.phone}
                    onChange={(e) => {
                      df("phone", e.target.value);
                      setEditErrors((p) => ({ ...p, phone: "" }));
                    }}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${editErrors.phone ? "border-red-400" : "border-gray-300"}`}
                  />
                  {editErrors.phone && (
                    <p className="text-xs text-red-500 mt-1">
                      {editErrors.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Role / Dept */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Job Title / Role
                  </label>
                  <input
                    value={editDraft.role}
                    onChange={(e) => df("role", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Department
                  </label>
                  <select
                    value={editDraft.departmentId}
                    onChange={(e) => {
                      const dept = departments.find(
                        (d) => d.id === e.target.value,
                      );
                      setEditDraft((prev: any) => ({
                        ...prev,
                        departmentId: e.target.value,
                        department: dept?.name ?? prev.department,
                      }));
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select department…</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Employment details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Employment Type
                  </label>
                  <select
                    value={editDraft.employmentType}
                    onChange={(e) => df("employmentType", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {["Full-time", "Contract"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Status
                  </label>
                  <select
                    value={editDraft.status}
                    onChange={(e) => df("status", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
              </div>

              {/* Grade / Salary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Grade Level
                  </label>
                  <input
                    value={editDraft.gradeLevel ?? ""}
                    onChange={(e) => df("gradeLevel", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Monthly Salary
                  </label>
                  <input
                    type="number"
                    value={editDraft.baseSalary ?? 0}
                    onChange={(e) => df("baseSalary", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Personal details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={editDraft.dateOfBirth ?? ""}
                    onChange={(e) => df("dateOfBirth", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Gender
                  </label>
                  <select
                    value={editDraft.gender ?? ""}
                    onChange={(e) => df("gender", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select…</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Address
                </label>
                <input
                  value={editDraft.address ?? ""}
                  onChange={(e) => df("address", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Emergency Contact
                  </label>
                  <input
                    value={editDraft.emergencyContact ?? ""}
                    onChange={(e) => df("emergencyContact", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Emergency Phone
                  </label>
                  <input
                    value={editDraft.emergencyPhone ?? ""}
                    onChange={(e) => df("emergencyPhone", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setEditOpen(false)}
                disabled={saving}
                className="px-4 py-2 text-sm border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-4 py-2 text-sm bg-indigo-700 text-white rounded-xl hover:bg-indigo-800 flex items-center gap-2 disabled:opacity-60"
              >
                <Save className="w-4 h-4" />{" "}
                {saving ? "Saving\u2026" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
