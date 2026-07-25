import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft, Mail, Phone, MapPin, Building2, Calendar, BadgeCheck,
  Briefcase, FileText, Clock, DollarSign, Activity, Edit, Download,
  CheckCircle, XCircle, UserCheck, AlertCircle, X, Save, Heart, User,
} from "lucide-react";
import { useEmployees } from "../../stores/employeeStore";

type TabId = "personal" | "employment" | "projects" | "documents" | "attendance" | "payroll" | "activity";

const mockProjects = [
  { name: "Downtown Office Complex", role: "Site Lead", allocPct: 60, startDate: "Jan 2023", status: "active" },
  { name: "Highway Interchange", role: "Support Engineer", allocPct: 30, startDate: "Mar 2023", status: "active" },
  { name: "Industrial Warehouse", role: "Inspector", allocPct: 10, startDate: "Jun 2023", status: "completed" },
];

const mockDocs = [
  { name: "Employment_Contract.pdf", type: "PDF", uploaded: "Jan 15, 2023", size: "2.4 MB" },
  { name: "Academic_Credentials.pdf", type: "PDF", uploaded: "Jan 15, 2023", size: "4.1 MB" },
  { name: "Passport_Photo.jpg", type: "Image", uploaded: "Jan 15, 2023", size: "512 KB" },
];

const mockAttendance = [
  { date: "Mon, Apr 14", checkIn: "07:45", checkOut: "17:30", status: "present", hrs: 8.75 },
  { date: "Tue, Apr 15", checkIn: "07:50", checkOut: "17:15", status: "present", hrs: 8.42 },
  { date: "Wed, Apr 16", checkIn: "08:00", checkOut: "18:00", status: "present", hrs: 9.00 },
  { date: "Thu, Apr 17", checkIn: "07:55", checkOut: "17:45", status: "present", hrs: 8.83 },
  { date: "Fri, Apr 18", checkIn: "07:40", checkOut: "16:30", status: "present", hrs: 7.83 },
];

const mockPayroll = [
  { month: "Apr 2026", gross: "₦320,000", deductions: "₦58,240", net: "₦261,760", status: "processing" },
  { month: "Mar 2026", gross: "₦320,000", deductions: "₦58,240", net: "₦261,760", status: "paid" },
  { month: "Feb 2026", gross: "₦320,000", deductions: "₦58,240", net: "₦261,760", status: "paid" },
  { month: "Jan 2026", gross: "₦320,000", deductions: "₦58,240", net: "₦261,760", status: "paid" },
];

const mockActivity = [
  { date: "Apr 10, 2026 14:30", action: "Profile updated (phone number changed)", by: "Self" },
  { date: "Apr 9, 2026  09:15", action: "Assigned to project 'Industrial Warehouse'", by: "Aisha Bello" },
  { date: "Apr 1, 2026  00:00", action: "Monthly payroll processed", by: "System" },
  { date: "Mar 28, 2026 11:00", action: "Leave request approved (Annual Leave)", by: "Ngozi Okafor" },
  { date: "Mar 15, 2026 08:30", action: "Employee record created", by: "HR Admin" },
];

function InfoCard({ icon: Icon, label, value }: { icon: React.FC<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 mt-0.5">{value || "—"}</p>
      </div>
    </div>
  );
}

export function EmployeeProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { employees } = useEmployees();
  const emp = employees.find(e => e.id === id);

  const [activeTab, setActiveTab] = useState<TabId>("personal");
  const [showEditModal, setShowEditModal] = useState(false);

  if (!emp) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <UserCheck className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-lg font-medium text-gray-600">Employee not found</p>
        <p className="text-sm mt-1">No record matches ID <span className="font-mono">{id}</span></p>
        <button onClick={() => navigate("/apps/hr")} className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Employees
        </button>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: "personal",   label: "Personal Info",  icon: User },
    { id: "employment", label: "Employment",     icon: Briefcase },
    { id: "projects",   label: "Projects",       icon: Building2 },
    { id: "documents",  label: "Documents",      icon: FileText },
    { id: "attendance", label: "Attendance",     icon: Clock },
    { id: "payroll",    label: "Payroll",        icon: DollarSign },
    { id: "activity",   label: "Activity Log",   icon: Activity },
  ];

  const statusConfig: Record<string, { label: string; badge: string; icon: React.ReactNode }> = {
    active: { label: "Active", badge: "bg-green-100 text-green-700", icon: <CheckCircle className="w-3.5 h-3.5" /> },
    inactive: { label: "Inactive", badge: "bg-red-100 text-red-700", icon: <XCircle className="w-3.5 h-3.5" /> },
    on_leave: { label: "On Leave", badge: "bg-amber-100 text-amber-700", icon: <UserCheck className="w-3.5 h-3.5" /> },
  };
  const sc = statusConfig[emp.status] ?? statusConfig.active;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/apps/hr")} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-bold">
            {emp.firstName[0]}{emp.lastName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900">{emp.firstName} {emp.middleName} {emp.lastName}</h1>
              <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${sc.badge}`}>{sc.icon}{sc.label}</span>
              {emp.syncStatus === "synced" ? (
                <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700">
                  <CheckCircle className="w-3 h-3" /> Synced
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-amber-100 text-amber-700">
                  <AlertCircle className="w-3 h-3" /> Unsynced
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{emp.jobTitle} · {emp.department} · {emp.employeeId || emp.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowEditModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Edit className="w-3.5 h-3.5" /> Edit
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-0">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id ? "border-indigo-500 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "personal" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">General Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <InfoCard icon={User} label="First Name" value={emp.firstName} />
              <InfoCard icon={User} label="Middle Name" value={emp.middleName} />
              <InfoCard icon={User} label="Last Name" value={emp.lastName} />
              <InfoCard icon={Briefcase} label="Job Title" value={emp.jobTitle} />
              <InfoCard icon={UserCheck} label="Primary Supervisor" value={emp.primarySupervisor} />
              <InfoCard icon={Calendar} label="Employment Date" value={emp.employmentDate} />
              <InfoCard icon={Calendar} label="Date of Birth" value={emp.dateOfBirth} />
              <InfoCard icon={Heart} label="Marital Status" value={emp.maritalStatus} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Contact Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <InfoCard icon={Phone} label="Personal Phone" value={emp.personalPhone} />
              <InfoCard icon={Mail} label="Personal Email" value={emp.personalEmail} />
              <InfoCard icon={MapPin} label="Address" value={emp.address} />
              <InfoCard icon={UserCheck} label="Next of Kin" value={emp.nextOfKin} />
              <InfoCard icon={MapPin} label="Nationality" value={emp.nationality} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Payment Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <InfoCard icon={Building2} label="PFA" value={emp.pfa} />
              <InfoCard icon={FileText} label="RSA Number" value={emp.rsaNumber} />
              <InfoCard icon={Building2} label="Bank Name" value={emp.bankName} />
              <InfoCard icon={FileText} label="Bank Account" value={emp.bankAccount} />
              <InfoCard icon={FileText} label="Tax ID" value={emp.taxId} />
              <InfoCard icon={Briefcase} label="Salary Grade" value={emp.grade} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Organization</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <InfoCard icon={Building2} label="Department" value={emp.department} />
              <InfoCard icon={Briefcase} label="Org Unit" value={emp.orgLevel} />
              <InfoCard icon={Clock} label="Employment Type" value={emp.employmentType} />
              <InfoCard icon={BadgeCheck} label="Sync Status" value={emp.syncStatus === "synced" ? "Synced to User" : "Pending Sync"} />
            </div>
          </div>
        </div>
      )}

      {activeTab === "employment" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-2 gap-6">
            <div><p className="text-xs text-gray-500">Department</p><p className="text-sm font-medium text-gray-900 mt-1">{emp.department}</p></div>
            <div><p className="text-xs text-gray-500">Job Title</p><p className="text-sm font-medium text-gray-900 mt-1">{emp.jobTitle}</p></div>
            <div><p className="text-xs text-gray-500">Primary Supervisor</p><p className="text-sm font-medium text-gray-900 mt-1">{emp.primarySupervisor || "—"}</p></div>
            <div><p className="text-xs text-gray-500">Employment Type</p><p className="text-sm font-medium text-gray-900 mt-1">{emp.employmentType}</p></div>
            <div><p className="text-xs text-gray-500">Employment Date</p><p className="text-sm font-medium text-gray-900 mt-1">{emp.employmentDate || "—"}</p></div>
            <div><p className="text-xs text-gray-500">Salary Grade</p><p className="text-sm font-medium text-gray-900 mt-1">{emp.grade || "—"}</p></div>
            <div><p className="text-xs text-gray-500">Org Unit</p><p className="text-sm font-medium text-gray-900 mt-1">{emp.orgLevel || "—"}</p></div>
            <div><p className="text-xs text-gray-500">Status</p><p className="text-sm font-medium text-gray-900 mt-1 capitalize">{emp.status}</p></div>
          </div>
        </div>
      )}

      {activeTab === "projects" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Project</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Allocation</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Started</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockProjects.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.role}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${p.allocPct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{p.allocPct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.startDate}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Uploaded</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Size</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockDocs.map((d, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{d.name}</span>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{d.type}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{d.uploaded}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{d.size}</td>
                  <td className="px-4 py-3"><button className="text-xs text-indigo-600 hover:text-indigo-700">Download</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Check In</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Check Out</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockAttendance.map((a, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.date}</td>
                  <td className="px-4 py-3 text-gray-600">{a.checkIn}</td>
                  <td className="px-4 py-3 text-gray-600">{a.checkOut}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Present</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{a.hrs}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "payroll" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Period</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Gross</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Deductions</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Net Pay</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockPayroll.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.month}</td>
                  <td className="px-4 py-3 text-gray-600">{p.gross}</td>
                  <td className="px-4 py-3 text-red-600">-{p.deductions}</td>
                  <td className="px-4 py-3 font-medium text-green-700">{p.net}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          {mockActivity.map((a, i) => (
            <div key={i} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
              <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-800">{a.action}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">{a.date}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">by {a.by}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <EditEmployeeModal emp={emp} onClose={() => setShowEditModal(false)} />
      )}
    </div>
  );
}

function EditEmployeeModal({ emp, onClose }: { emp: ReturnType<typeof useEmployees>["employees"][0]; onClose: () => void }) {
  const [form, setForm] = useState({ ...emp });
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
          <h2 className="text-lg font-semibold text-gray-900">Edit Employee</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
          <div>
            <h3 className="text-sm font-semibold text-indigo-700 mb-3 pb-1 border-b border-indigo-100">General Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">First Name</label><input value={form.firstName} onChange={e => set("firstName", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Middle Name</label><input value={form.middleName} onChange={e => set("middleName", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label><input value={form.lastName} onChange={e => set("lastName", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Job Title</label><input value={form.jobTitle} onChange={e => set("jobTitle", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Primary Supervisor</label><input value={form.primarySupervisor} onChange={e => set("primarySupervisor", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Marital Status</label><select value={form.maritalStatus} onChange={e => set("maritalStatus", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"><option value="">Select…</option><option value="Single">Single</option><option value="Married">Married</option><option value="Divorced">Divorced</option><option value="Widowed">Widowed</option></select></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label><input type="date" value={form.dateOfBirth} onChange={e => set("dateOfBirth", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Employment Date</label><input type="date" value={form.employmentDate} onChange={e => set("employmentDate", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Department</label><input value={form.department} onChange={e => set("department", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Org Unit</label><input value={form.orgLevel} onChange={e => set("orgLevel", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Employment Type</label><div className="flex gap-3 pt-1.5">{(["Full-time", "Contract"] as const).map(t => (<label key={t} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="editEmpType" value={t} checked={form.employmentType === t} onChange={() => set("employmentType", t)} className="accent-indigo-600" /><span className="text-sm text-gray-700">{t}</span></label>))}</div></div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-indigo-700 mb-3 pb-1 border-b border-indigo-100">Contact Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Personal Phone</label><input value={form.personalPhone} onChange={e => set("personalPhone", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Personal Email</label><input type="email" value={form.personalEmail} onChange={e => set("personalEmail", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
              <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Address</label><textarea value={form.address} onChange={e => set("address", e.target.value)} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
              <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Next of Kin</label><input value={form.nextOfKin} onChange={e => set("nextOfKin", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Nationality</label><input value={form.nationality} onChange={e => set("nationality", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-indigo-700 mb-3 pb-1 border-b border-indigo-100">Payment Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">PFA</label><input value={form.pfa} onChange={e => set("pfa", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">RSA Number</label><input value={form.rsaNumber} onChange={e => set("rsaNumber", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Bank Name</label><input value={form.bankName} onChange={e => set("bankName", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Bank Account</label><input value={form.bankAccount} onChange={e => set("bankAccount", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Tax ID</label><input value={form.taxId} onChange={e => set("taxId", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Salary Grade</label><input value={form.grade} onChange={e => set("grade", e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" /></div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={onClose} className="px-4 py-2 bg-indigo-700 text-white rounded-md text-sm font-medium hover:bg-indigo-800 flex items-center gap-2">
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
