import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getJobRoles, createJobRole, deleteJobRole } from "../../api/job-roles";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { getCurrencySymbol } from "../../utils/generalSettings";
import {
  Briefcase,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  Users,
} from "lucide-react";

interface Role {
  id: string;
  title: string;
  department: string;
  gradeLevel: string;
  minSalary: string;
  maxSalary: string;
  headcount: number;
  responsibilities: string[];
  skills: string[];
}

// depts and grades computed inside component from state

const gradeColors: Record<string, string> = {
  "Level 9": "bg-purple-100 text-purple-700",
  "Level 8": "bg-indigo-100 text-indigo-700",
  "Level 7": "bg-blue-100 text-blue-700",
  "Level 6": "bg-teal-100 text-teal-700",
  "Level 5": "bg-gray-100 text-gray-600",
};

export function HRRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [gradeFilter, setGradeFilter] = useState("All Grades");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDept, setNewDept] = useState("");
  const [newGrade, setNewGrade] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  function loadRoles() {
    return getJobRoles()
      .then((jr) =>
        setRoles(
          jr.map((r) => ({
            id: r.id,
            title: r.title,
            department: r.department,
            gradeLevel: r.gradeLevel ?? "",
            minSalary: r.minSalary != null ? String(r.minSalary) : "",
            maxSalary: r.maxSalary != null ? String(r.maxSalary) : "",
            headcount: r.headcount,
            responsibilities: r.responsibilities,
            skills: r.skills,
          })),
        ),
      )
      .catch(() => {});
  }

  useEffect(() => {
    loadRoles();
  }, []);

  function handleDeleteRole() {
    if (!deleteTarget) return;
    deleteJobRole(deleteTarget.id)
      .then(() => loadRoles())
      .then(() => {
        setDeleteTarget(null);
        toast.success("Role deleted");
      })
      .catch(() => toast.error("Failed to delete role. Please try again."));
  }

  const depts = [
    "All Departments",
    ...Array.from(new Set(roles.map((r) => r.department))).sort(),
  ];
  const grades = [
    "All Grades",
    ...Array.from(new Set(roles.map((r) => r.gradeLevel))).sort(),
  ];

  const filtered = roles.filter((r) => {
    const matchS =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.department.toLowerCase().includes(search.toLowerCase());
    const matchD =
      deptFilter === "All Departments" || r.department === deptFilter;
    const matchG = gradeFilter === "All Grades" || r.gradeLevel === gradeFilter;
    return matchS && matchD && matchG;
  });

  const totalHeadcount = roles.reduce((s, r) => s + r.headcount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Roles & Positions
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {roles.length} defined roles · {totalHeadcount} total positions
            filled
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 text-white rounded-md text-sm hover:bg-indigo-800"
        >
          <Plus className="w-3.5 h-3.5" /> Add Role
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Roles Defined", value: roles.length },
          { label: "Positions Filled", value: totalHeadcount },
          { label: "Departments Covered", value: 8 },
          { label: "Grade Levels Used", value: 5 },
        ].map((s) => (
          <div key={s.label} className="bg-indigo-50 rounded-lg p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-indigo-700 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search roles or departments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
        >
          {depts.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
        >
          {grades.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </div>

      {/* Roles table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                Role / Position
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                Department
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                Grade Level
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                Salary Range
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">
                Headcount
              </th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((role) => {
              const isOpen = expanded === role.id;
              return (
                <>
                  <tr
                    key={role.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : role.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900">
                          {role.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {role.department}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${gradeColors[role.gradeLevel] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {role.gradeLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {role.minSalary} – {role.maxSalary}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">
                          {role.headcount}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button className="p-1 rounded hover:bg-gray-100 text-gray-400">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" onClick={() => setDeleteTarget(role)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {isOpen ? (
                          <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${role.id}-detail`} className="bg-indigo-50/40">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Key Responsibilities
                            </p>
                            <ul className="space-y-1">
                              {role.responsibilities.map((r) => (
                                <li
                                  key={r}
                                  className="text-sm text-gray-700 flex gap-2"
                                >
                                  <span className="text-indigo-400 mt-1">
                                    •
                                  </span>
                                  {r}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Required Skills
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {role.skills.map((s) => (
                                <span
                                  key={s}
                                  className="text-xs bg-white border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900">Add New Role</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Job Title
                </label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Senior Civil Engineer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Department
                </label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select department...</option>
                  {depts.slice(1).map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Grade Level
                </label>
                <select
                  value={newGrade}
                  onChange={(e) => setNewGrade(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select grade...</option>
                  {[
                    "Level 5",
                    "Level 6",
                    "Level 7",
                    "Level 8",
                    "Level 9",
                    "Level 10",
                  ].map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Min Salary
                  </label>
                  <input
                    placeholder={`${getCurrencySymbol()}150,000`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Max Salary
                  </label>
                  <input
                    placeholder={`${getCurrencySymbol()}280,000`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
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
                className="px-4 py-2 bg-indigo-700 text-white rounded-md text-sm hover:bg-indigo-800"
                onClick={() => {
                  if (!newTitle || !newDept) return;
                  createJobRole({
                    title: newTitle,
                    department: newDept,
                    gradeLevel: newGrade,
                    headcount: 1,
                    responsibilities: [],
                    skills: [],
                  })
                    .then((r) => {
                      setRoles((prev) => [
                        ...prev,
                        {
                          id: r.id,
                          title: r.title,
                          department: r.department,
                          gradeLevel: r.gradeLevel ?? "",
                          minSalary:
                            r.minSalary != null ? String(r.minSalary) : "",
                          maxSalary:
                            r.maxSalary != null ? String(r.maxSalary) : "",
                          headcount: r.headcount,
                          responsibilities: r.responsibilities,
                          skills: r.skills,
                        },
                      ]);
                      toast.success("Role created");
                    })
                    .catch(() => toast.error("Failed to create role. Please try again."));
                  setShowCreate(false);
                  setNewTitle("");
                  setNewDept("");
                  setNewGrade("");
                }}
              >
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteTarget !== null}
        title="Delete Role?"
        description={
          deleteTarget
            ? `This will permanently remove "${deleteTarget.title}". This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        isDangerous
        onConfirm={handleDeleteRole}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
