import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  formatDateByGeneralSettings,
  formatDateTimeByGeneralSettings,
  formatNumberByGeneralSettings,
  getCurrencyCode,
  getCurrencySymbol,
} from "../../utils/generalSettings";
import { exportCSV } from "../../utils/exportCSV";
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
  Upload,
  Trash2,
  Eye,
} from "lucide-react";
import {
  fetchEmployee,
  fetchEmployees,
  fetchEmploymentTerms,
  updateEmployee,
  toEmployeeUpdatePayload,
  getEmployeeDocuments,
  addEmployeeDocument,
  updateEmployeeDocument,
  deleteEmployeeDocument,
  type EmployeeDocument,
  type EmploymentTerms,
} from "../../api/employees";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { fetchDepartments } from "../../api/departments";
import { fetchProjects } from "../../api/projects";
import { getAppRoles } from "../../api/admin-extras";
import {
  getEmploymentTypes,
  getSalaryGrades,
  type EmploymentTypeConfig,
  type SalaryGradeOption,
} from "../../api/employment-types";
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

const EMPLOYEE_DOCUMENT_TYPES = [
  "Employment Contract",
  "Identification",
  "Curriculum Vitae",
  "Academic Certificate",
  "Professional Certificate",
  "Medical Record",
  "Tax Document",
  "Pension Document",
  "Bank Document",
  "Performance Document",
  "Disciplinary Document",
  "Other",
];

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
  const [supervisorOptions, setSupervisorOptions] = useState<
    { id: string; firstName: string; lastName: string }[]
  >([]);
  const [terms, setTerms] = useState<EmploymentTerms | null>(null);
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentTypeConfig[]>([]);
  const [salaryGrades, setSalaryGrades] = useState<SalaryGradeOption[]>([]);
  const [payrollProjects, setPayrollProjects] = useState<{ id: string; name: string }[]>([]);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<EmployeeDocument | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("");
  const [documentDescription, setDocumentDescription] = useState("");
  const [documentError, setDocumentError] = useState("");
  const [deletingDocument, setDeletingDocument] = useState<EmployeeDocument | null>(null);
  const [deletingDocumentBusy, setDeletingDocumentBusy] = useState(false);

  // Human-friendly display ID passed from the list page
  const displayId = searchParams.get("displayId") ?? emp?.id ?? "";

  useEffect(() => {
    fetchDepartments()
      .then((depts) =>
        setDepartments(depts.map((d) => ({ id: d.id, name: d.name }))),
      )
      .catch(() => {});
  }, []);
  useEffect(() => { if (id) getEmployeeDocuments(id).then(setDocuments).catch(() => setDocuments([])); }, [id]);

  function openCreateDocument() {
    setEditingDocument(null);
    setDocumentFile(null);
    setDocumentType("");
    setDocumentDescription("");
    setDocumentError("");
    setDocumentModalOpen(true);
  }

  function openEditDocument(document: EmployeeDocument) {
    setEditingDocument(document);
    setDocumentFile(null);
    setDocumentType(document.documentType || "");
    setDocumentDescription(document.description || "");
    setDocumentError("");
    setDocumentModalOpen(true);
  }

  async function saveDocument() {
    if (!id) return;
    if (!documentType.trim()) { setDocumentError("Select a document type."); return; }
    if (!editingDocument && !documentFile) { setDocumentError("Select a document to upload."); return; }
    if (documentFile && documentFile.size > 5 * 1024 * 1024) { setDocumentError("Documents must be 5 MB or smaller."); return; }
    setUploadingDocument(true);
    try {
      const fileUrl = documentFile
        ? await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(documentFile); })
        : undefined;
      if (editingDocument) {
        const updated = await updateEmployeeDocument(id, editingDocument.id, {
          documentType: documentType.trim(),
          description: documentDescription.trim() || null,
          ...(documentFile && fileUrl ? {
            fileName: documentFile.name,
            fileUrl,
            fileSize: documentFile.size,
            mimeType: documentFile.type || "application/octet-stream",
          } : {}),
        });
        setDocuments((current) => current.map((item) => item.id === updated.id ? updated : item));
        toast.success("Employee document updated.");
      } else if (documentFile && fileUrl) {
        const created = await addEmployeeDocument(id, {
          fileName: documentFile.name,
          fileUrl,
          fileSize: documentFile.size,
          mimeType: documentFile.type || "application/octet-stream",
          documentType: documentType.trim(),
          description: documentDescription.trim() || null,
          uploadedBy: "HR",
        });
        setDocuments((current) => [created, ...current]);
        toast.success("Employee document uploaded.");
      }
      setDocumentModalOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Document upload failed."); }
    finally { setUploadingDocument(false); }
  }

  async function removeDocument() {
    if (!id || !deletingDocument) return;
    setDeletingDocumentBusy(true);
    try { await deleteEmployeeDocument(id, deletingDocument.id); setDocuments((current) => current.filter((document) => document.id !== deletingDocument.id)); toast.success("Document deleted."); setDeletingDocument(null); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete document."); }
    finally { setDeletingDocumentBusy(false); }
  }
  useEffect(() => {
    getEmploymentTypes().then(setEmploymentTypes).catch(() => setEmploymentTypes([]));
    getSalaryGrades().then(setSalaryGrades).catch(() => setSalaryGrades([]));
    fetchProjects().then((rows) => setPayrollProjects(rows.map((project) => ({ id: project.id, name: project.name })))).catch(() => setPayrollProjects([]));
    getAppRoles()
      .then((roles) =>
        setRoleOptions(
          (Array.isArray(roles) ? roles : [])
            .map((role: any) => String(role?.name ?? "").trim())
            .filter(Boolean),
        ),
      )
      .catch(() => setRoleOptions([]));
  }, []);

  // Probation / notice / retirement, worked out server-side from the HR policy
  // and this employee's dates. Informational, so a failure just hides the block.
  useEffect(() => {
    if (!id) return;
    let alive = true;
    fetchEmploymentTerms(id)
      .then((data) => {
        if (alive) setTerms(data);
      })
      .catch(() => {
        if (alive) setTerms(null);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  // Supervisor candidates: active employees other than this one (an employee
  // cannot report to themselves).
  useEffect(() => {
    fetchEmployees({ status: "active" })
      .then((list: any[]) =>
        setSupervisorOptions(
          list
            .filter((e) => e.id !== id)
            .map((e) => ({
              id: e.id,
              firstName: e.firstName,
              lastName: e.lastName,
            })),
        ),
      )
      .catch(() => setSupervisorOptions([]));
  }, [id]);

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
    if (!draft.position?.trim()) errs.position = "Position is required";
    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email))
      errs.email = "Enter a valid email address";
    if (draft.phone && !/^\+?[\d\s\-().]{7,20}$/.test(draft.phone))
      errs.phone = "Enter a valid phone number";
    if (draft.paysSalary !== false && draft.paymentSource === "project" && !draft.payrollProjectId)
      errs.payrollProjectId = "Select the project funding this employee";
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
  // True once an admin has synced this employee into a login account.
  const isSynced = emp.syncStatus === "synced";

  function handleExportProfile() {
    const rows: [string, string | number][] = [
      ["Employee ID", displayId],
      ["First Name", emp.firstName ?? ""],
      ["Middle Name", emp.middleName ?? ""],
      ["Last Name", emp.lastName ?? ""],
      ["Position", emp.position ?? ""],
      ["System Role", emp.role ?? ""],
      ["Department", emp.department ?? ""],
      ["Supervisor", emp.primarySupervisor ?? ""],
      ["Status", statusCfg.label ?? emp.status ?? ""],
      ["Employment Type", emp.employmentType ?? ""],
      ["Date Hired", emp.dateHiredISO || emp.dateHired || ""],
      ["Date of Birth", emp.dateOfBirth ?? ""],
      ["Gender", emp.gender ?? ""],
      ["Email", emp.email ?? ""],
      ["Phone", emp.phone ?? ""],
      ["Address", emp.address ?? ""],
      ["City", emp.city ?? ""],
      ["State", emp.state ?? ""],
      ["Zip Code", emp.zipCode ?? ""],
      ["Next of Kin Contact", emp.emergencyContact ?? ""],
      ["Emergency Phone", emp.emergencyPhone ?? ""],
      ["Salary Grade", emp.gradeLevel ?? ""],
      [`Base Salary (${getCurrencyCode()})`, Number(emp.baseSalary ?? 0)],
      ["Bank Name", emp.bankName ?? ""],
      ["Account Number", emp.accountNumber ?? ""],
      ["Account Holder", emp.accountHolder ?? ""],
      ["Tax ID", emp.taxId ?? ""],
      ["PFA / Pension ID", emp.pensionId ?? ""],
      ["System Access", isSynced ? "Synced to user account" : "Pending sync"],
    ];
    const slug = `${emp.firstName ?? "employee"}-${emp.lastName ?? ""}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    exportCSV(`employee-profile-${slug}`, ["Field", "Value"], rows);
    toast.success("Profile exported.");
  }
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
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${isSynced ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                title={
                  isSynced
                    ? "A user account is linked to this employee"
                    : "Awaiting sync to a user account in Admin › Users"
                }
              >
                {isSynced ? "Synced to User" : "Pending Sync"}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {emp.position || "Position not set"} · {emp.department}
            </p>
            <p className="text-xs text-gray-400 font-mono">{displayId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportProfile}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
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
                value: emp.dateOfBirth
                  ? formatDateByGeneralSettings(emp.dateOfBirth)
                  : "—",
                icon: <Calendar className="w-4 h-4 text-indigo-500" />,
              },
              {
                label: "Gender",
                value: emp.gender || "—",
                icon: <BadgeCheck className="w-4 h-4 text-indigo-500" />,
              },
              {
                label: "Address",
                value: emp.address || "—",
                icon: <MapPin className="w-4 h-4 text-indigo-500" />,
              },
              {
                label: "City / State",
                value: [emp.city, emp.state].filter(Boolean).join(", ") || "—",
                icon: <MapPin className="w-4 h-4 text-indigo-500" />,
              },
              {
                label: "ZIP / Postal Code",
                value: emp.zipCode || "—",
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
              { label: "Position", value: emp.position || "—" },
              { label: "System Role", value: emp.role || "—" },
              { label: "Department", value: emp.department || "—" },
              { label: "Grade Level", value: emp.gradeLevel || "—" },
              { label: "Employment Type", value: emp.employmentType ?? "—" },
              { label: "Salary Type", value: emp.salaryType ?? "Monthly" },
              { label: "Date Hired", value: emp.dateHired ?? "—" },
              {
                label: `${emp.salaryType ?? "Monthly"} Salary`,
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
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h3 className="font-semibold text-gray-800 text-sm">
              Employment Status
            </h3>
            <div
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${statusCfg.badge}`}
            >
              <CheckCircle className="w-4 h-4" />
              {statusCfg.label}
            </div>

            {/* The organisation's probation period, notice period and
                retirement age applied to this employee's own dates. All three
                were configured in HR › General Setup and read by nothing, so
                they described no one. */}
            {terms && (
              <div className="pt-2 border-t border-gray-100 space-y-1">
                {terms.onProbation && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700">
                    On probation
                  </span>
                )}
                {[
                  {
                    label: `Probation ends (${terms.probationMonths} months)`,
                    value: terms.probationEndDate
                      ? formatDateByGeneralSettings(terms.probationEndDate)
                      : "—",
                  },
                  {
                    label: "Notice period",
                    value: `${terms.noticePeriodDays} days`,
                  },
                  {
                    label: `Retirement (age ${terms.retirementAge})`,
                    value: terms.retirementDate
                      ? `${formatDateByGeneralSettings(terms.retirementDate)}${
                          terms.yearsToRetirement !== null
                            ? ` · ${terms.yearsToRetirement} yrs`
                            : ""
                        }`
                      : "Date of birth not on file",
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
            )}
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
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Employee Documents</h3>
              <p className="text-xs text-gray-500">Contracts, identification and certificates · maximum 5 MB each</p>
            </div>
            <button onClick={openCreateDocument} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <Upload className="h-4 w-4" /> Upload Document
            </button>
          </div>
          {documents.length === 0 ? (
            <div className="p-10 text-center">
              <FileText className="mx-auto mb-2 h-9 w-9 text-gray-300" />
              <p className="text-sm text-gray-500">No documents uploaded</p>
              <button onClick={openCreateDocument} className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700">Upload the first document</button>
            </div>
          ) : (
            <div className="divide-y">
              {documents.map((document) => (
                <div key={document.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-lg bg-indigo-50 p-2"><FileText className="h-5 w-5 flex-none text-indigo-600" /></div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{document.fileName}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">{document.documentType}</span>
                        <span>{(document.fileSize / 1024).toFixed(1)} KB</span>
                        <span>·</span>
                        <span>{formatDateTimeByGeneralSettings(document.uploadedAt)}</span>
                      </div>
                      {document.description && <p className="mt-1 truncate text-xs text-gray-500">{document.description}</p>}
                    </div>
                  </div>
                  <div className="flex flex-none items-center gap-1">
                    <a href={document.fileUrl} target="_blank" rel="noreferrer" className="rounded p-2 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600" title="View document"><Eye className="h-4 w-4" /></a>
                    <a href={document.fileUrl} download={document.fileName} className="rounded p-2 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600" title="Download document"><Download className="h-4 w-4" /></a>
                    <button onClick={() => openEditDocument(document)} className="rounded p-2 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600" title="Edit document"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => setDeletingDocument(document)} className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Delete document"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                      {formatDateTimeByGeneralSettings(a.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Edit Employee Modal */}
      {documentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{editingDocument ? "Edit Document" : "Upload Document"}</h2>
                <p className="mt-0.5 text-xs text-gray-500">Attach a type so this employee record stays organised.</p>
              </div>
              <button onClick={() => setDocumentModalOpen(false)} disabled={uploadingDocument} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Document Type <span className="text-red-500">*</span></label>
                <select value={documentType} onChange={(event) => { setDocumentType(event.target.value); setDocumentError(""); }} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select document type…</option>
                  {EMPLOYEE_DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  {editingDocument?.documentType && !EMPLOYEE_DOCUMENT_TYPES.includes(editingDocument.documentType) && <option value={editingDocument.documentType}>{editingDocument.documentType}</option>}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Description <span className="font-normal text-gray-400">(optional)</span></label>
                <textarea value={documentDescription} onChange={(event) => setDocumentDescription(event.target.value)} rows={3} placeholder="Add a note about this document…" className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">{editingDocument ? "Replace File (optional)" : "File *"}</label>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-gray-300 px-4 py-4 hover:border-indigo-400 hover:bg-indigo-50/30">
                  <div className="rounded-lg bg-indigo-50 p-2"><Upload className="h-5 w-5 text-indigo-600" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-700">{documentFile?.name || editingDocument?.fileName || "Choose a document"}</p>
                    <p className="text-xs text-gray-400">PDF, DOC, DOCX, JPG or PNG · maximum 5 MB</p>
                  </div>
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => { setDocumentFile(event.target.files?.[0] ?? null); setDocumentError(""); event.target.value = ""; }} />
                </label>
              </div>
              {documentError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{documentError}</p>}
            </div>
            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button onClick={() => setDocumentModalOpen(false)} disabled={uploadingDocument} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button onClick={() => void saveDocument()} disabled={uploadingDocument} className="flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-50">
                <Save className="h-4 w-4" /> {uploadingDocument ? "Saving…" : editingDocument ? "Save Changes" : "Upload Document"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deletingDocument !== null}
        title="Delete employee document?"
        description={deletingDocument ? `“${deletingDocument.fileName}” will be permanently removed from this employee's record.` : ""}
        confirmLabel="Delete Document"
        isDangerous
        isLoading={deletingDocumentBusy}
        onConfirm={() => void removeDocument()}
        onCancel={() => setDeletingDocument(null)}
      />

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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Middle Name
                  </label>
                  <input
                    value={editDraft.middleName ?? ""}
                    onChange={(e) => df("middleName", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Employee ID
                  </label>
                  {/* Identity fields are display-only: the record's own key must
                      not change, and the hire date anchors payroll history. */}
                  <input
                    value={displayId}
                    readOnly
                    disabled
                    className="w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-lg px-3 py-2 text-sm cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Supervisor
                  </label>
                  <select
                    value={editDraft.supervisorId ?? ""}
                    onChange={(e) => df("supervisorId", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select supervisor…</option>
                    {supervisorOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Date Hired
                  </label>
                  <input
                    value={emp.dateHired || "—"}
                    readOnly
                    disabled
                    className="w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-lg px-3 py-2 text-sm cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Email
                  </label>
                  {/* Once synced, this address is the user's login identity —
                      changing it here would desync it from the User record, so
                      it becomes read-only and must be changed in Admin › Users. */}
                  <input
                    value={editDraft.email}
                    onChange={(e) => {
                      df("email", e.target.value);
                      setEditErrors((p) => ({ ...p, email: "" }));
                    }}
                    type="email"
                    readOnly={isSynced}
                    disabled={isSynced}
                    className={
                      isSynced
                        ? "w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-lg px-3 py-2 text-sm cursor-not-allowed"
                        : `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${editErrors.email ? "border-red-400" : "border-gray-300"}`
                    }
                  />
                  {isSynced ? (
                    <p className="text-xs text-gray-400 mt-1">
                      Linked to a user account — change it in Admin › Users.
                    </p>
                  ) : (
                    editErrors.email && (
                      <p className="text-xs text-red-500 mt-1">
                        {editErrors.email}
                      </p>
                    )
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

              {/* Position, access role and department are separate concerns. */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Position <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={editDraft.position ?? ""}
                    onChange={(e) => {
                      df("position", e.target.value);
                      setEditErrors((previous) => ({ ...previous, position: "" }));
                    }}
                    placeholder="e.g. Site Engineer"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${editErrors.position ? "border-red-400" : "border-gray-300"}`}
                  />
                  {editErrors.position && (
                    <p className="text-xs text-red-500 mt-1">{editErrors.position}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    System / ITT Role
                  </label>
                  <select
                    value={editDraft.role ?? ""}
                    onChange={(e) => df("role", e.target.value)}
                    disabled={isSynced}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option value="">Select system role…</option>
                    {editDraft.role && !roleOptions.includes(editDraft.role) && (
                      <option value={editDraft.role}>{editDraft.role}</option>
                    )}
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  {isSynced && (
                    <p className="text-xs text-gray-400 mt-1">
                      Change access roles in Admin › Users.
                    </p>
                  )}
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
                    onChange={(e) => {
                      const selected = employmentTypes.find((item) => item.name === e.target.value);
                      setEditDraft((previous: any) => ({
                        ...previous,
                        employmentType: e.target.value,
                        ...(selected ? { salaryType: selected.defaultSalaryType, salaryFrequencyId: selected.defaultSalaryFrequencyId, paysSalary: selected.paysSalary, paymentSource: selected.defaultPaymentSource, payrollProjectId: selected.defaultPaymentSource === "project" ? previous.payrollProjectId : "" } : {}),
                      }));
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {employmentTypes.map((type) => (
                      <option key={type.id} value={type.name}>{type.name}</option>
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
                  <select
                    value={editDraft.gradeLevel ?? ""}
                    onChange={(e) => df("gradeLevel", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select configured grade…</option>
                    {salaryGrades.map((grade) => (
                      <option key={grade.id} value={grade.gradeLevel || grade.gradeName}>
                        {grade.gradeName}{grade.gradeLevel ? ` (${grade.gradeLevel})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Payroll Eligibility
                  </label>
                  <select
                    value={editDraft.paysSalary === false ? "unpaid" : "paid"}
                    onChange={(e) => setEditDraft((previous: any) => ({ ...previous, paysSalary: e.target.value === "paid" }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>
                {editDraft.paysSalary !== false && <div><label className="block text-xs font-medium text-gray-600 mb-1">Salary Frequency</label><input value={editDraft.salaryType ?? "Monthly"} readOnly className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600" /></div>}
                {editDraft.paysSalary !== false && <div><label className="block text-xs font-medium text-gray-600 mb-1">Payment Source</label><select value={editDraft.paymentSource ?? "company"} onChange={(e) => setEditDraft((previous: any) => ({ ...previous, paymentSource: e.target.value, payrollProjectId: e.target.value === "project" ? previous.payrollProjectId : "" }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"><option value="company">Company payroll</option><option value="project">Project payroll</option></select></div>}
                {editDraft.paysSalary !== false && editDraft.paymentSource === "project" && <div><label className="block text-xs font-medium text-gray-600 mb-1">Payroll Project</label><select value={editDraft.payrollProjectId ?? ""} onChange={(e) => df("payrollProjectId", e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm bg-white ${editErrors.payrollProjectId ? "border-red-400" : "border-gray-300"}`}><option value="">Select project…</option>{payrollProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>{editErrors.payrollProjectId && <p className="mt-1 text-xs text-red-600">{editErrors.payrollProjectId}</p>}</div>}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Base Salary
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    City
                  </label>
                  <input
                    value={editDraft.city ?? ""}
                    onChange={(e) => df("city", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    State
                  </label>
                  <input
                    value={editDraft.state ?? ""}
                    onChange={(e) => df("state", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Zip Code
                  </label>
                  <input
                    value={editDraft.zipCode ?? ""}
                    onChange={(e) => df("zipCode", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Next of Kin Contact
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

              {/* Payment details — parity with the Add New Employee form */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3 pt-2 border-t border-gray-100">
                  Payment
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Bank Name
                    </label>
                    <input
                      value={editDraft.bankName ?? ""}
                      onChange={(e) => df("bankName", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Account Number
                    </label>
                    <input
                      value={editDraft.accountNumber ?? ""}
                      onChange={(e) => df("accountNumber", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Account Holder
                    </label>
                    <input
                      value={editDraft.accountHolder ?? ""}
                      onChange={(e) => df("accountHolder", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Tax ID
                    </label>
                    <input
                      value={editDraft.taxId ?? ""}
                      onChange={(e) => df("taxId", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      PFA / Pension ID
                    </label>
                    <input
                      value={editDraft.pensionId ?? ""}
                      onChange={(e) => {
                        // mapEmployee exposes this column under three aliases;
                        // keep them in step so the update payload is unambiguous.
                        setEditDraft((prev: any) => ({
                          ...prev,
                          pensionId: e.target.value,
                          pfa: e.target.value,
                          rsaNumber: e.target.value,
                        }));
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
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
