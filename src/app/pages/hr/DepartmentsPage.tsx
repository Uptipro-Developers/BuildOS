import { useEffect, useState } from "react";
import {
  Building2, Plus, Search, Edit, Trash2, ChevronDown, ChevronRight, X, History, Save, DollarSign, CheckCircle2,
} from "lucide-react";
import { useEmployees } from "../../stores/employeeStore";
import { createDepartment, deleteDepartment, fetchDepartments, updateDepartment } from "../../api/departments";

interface BudgetLog {
  id: string;
  date: string;
  previousBudget: string;
  newBudget: string;
  note: string;
}

interface Department {
  id: string;
  name: string;
  head: string;
  headId: string;
  description: string;
  headcount: number;
  budget: string;
  location: string;
  orgLevel: string;
  employees: { name: string; role: string; id: string }[];
  budgetHistory?: BudgetLog[];
}

const initialDepts: Department[] = [
  {
    id: "DEPT-001", name: "Engineering", head: "Chukwudi Eze", headId: "EMP-001", description: "Site engineers, structural engineers, MEP specialists, and construction supervision staff.", headcount: 28, budget: "₦45M / yr", location: "Abuja, Lagos", orgLevel: "Crew",
    employees: [
      { name: "Chukwudi Eze", role: "Site Engineer", id: "EMP-001" },
      { name: "Robert Lee", role: "Structural Engineer", id: "EMP-003" },
      { name: "Mike Davis", role: "Site Foreman", id: "EMP-005" },
      { name: "Ngozi Eze", role: "Site Supervisor", id: "EMP-008" },
      { name: "Kwame Asante", role: "Civil Engineer", id: "EMP-009" },
      { name: "Lawal Musa", role: "MEP Engineer", id: "EMP-012" },
    ],
    budgetHistory: [
      { id: "bl-1", date: "Jan 15, 2026", previousBudget: "₦35M / yr", newBudget: "₦45M / yr", note: "Q1 Expansion budget allocation" }
    ]
  },
  {
    id: "DEPT-002", name: "Operations", head: "Aisha Bello", headId: "EMP-002", description: "Project management and overall coordination of construction delivery across all active projects.", headcount: 12, budget: "₦18M / yr", location: "Abuja", orgLevel: "Collegium",
    employees: [
      { name: "Aisha Bello", role: "Project Manager", id: "EMP-002" },
      { name: "Yemi Olusegun", role: "Project Manager", id: "EMP-015" },
    ],
    budgetHistory: []
  },
  {
    id: "DEPT-003", name: "Finance", head: "Sarah Johnson", headId: "EMP-004", description: "Financial planning, budgeting, accounts payable/receivable, and reporting for all company operations.", headcount: 8, budget: "₦12M / yr", location: "Lagos", orgLevel: "Cluster",
    employees: [
      { name: "Sarah Johnson", role: "Accountant", id: "EMP-004" },
      { name: "Funke Adeyemi", role: "Finance Analyst", id: "EMP-013" },
    ],
    budgetHistory: []
  },
  {
    id: "DEPT-004", name: "Procurement", head: "Tom Fox", headId: "EMP-007", description: "Materials sourcing, vendor management, purchase order processing and inventory control.", headcount: 6, budget: "₦9M / yr", location: "Lagos, Abuja", orgLevel: "Cluster",
    employees: [
      { name: "Tom Fox", role: "Quantity Surveyor", id: "EMP-007" },
    ],
    budgetHistory: []
  },
  {
    id: "DEPT-005", name: "Human Resources", head: "Alice Ware", headId: "EMP-006", description: "Recruitment, onboarding, employee relations, payroll coordination, and HR policy management.", headcount: 5, budget: "₦7.5M / yr", location: "Lagos", orgLevel: "Cluster",
    employees: [
      { name: "Alice Ware", role: "HR Officer", id: "EMP-006" },
    ],
    budgetHistory: []
  },
  {
    id: "DEPT-006", name: "Health & Safety", head: "Emeka Nwosu", headId: "EMP-010", description: "HSE compliance, safety audits, incident reporting, and ensuring OSHA standards across all sites.", headcount: 4, budget: "₦6M / yr", location: "All Sites", orgLevel: "Crew",
    employees: [
      { name: "Emeka Nwosu", role: "HSE Officer", id: "EMP-010" },
    ],
    budgetHistory: []
  },
  {
    id: "DEPT-007", name: "Administration", head: "Bisi Akinola", headId: "EMP-011", description: "General administration, facilities management, office operations, and executive support.", headcount: 4, budget: "₦5M / yr", location: "Lagos", orgLevel: "Cluster",
    employees: [
      { name: "Bisi Akinola", role: "Admin Officer", id: "EMP-011" },
    ],
    budgetHistory: []
  },
  {
    id: "DEPT-008", name: "IT & Systems", head: "David Obi", headId: "EMP-014", description: "Internal IT infrastructure, ERP system management, software support, and cybersecurity.", headcount: 3, budget: "₦8M / yr", location: "Lagos", orgLevel: "Cluster",
    employees: [
      { name: "David Obi", role: "IT Officer", id: "EMP-014" },
    ],
    budgetHistory: []
  },
];

const deptColors = [
  "bg-indigo-100 text-indigo-700", "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700", "bg-orange-100 text-orange-700",
  "bg-rose-100 text-rose-700", "bg-amber-100 text-amber-700",
  "bg-purple-100 text-purple-700", "bg-teal-100 text-teal-700",
];

function formatBudget(value: number | string | undefined) {
  if (typeof value === "string" && value.trim().startsWith("₦")) return value;
  const amount = Number(value ?? 0) || 0;
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(amount % 1_000_000 ? 1 : 0)}M / yr`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(amount % 1000 ? 1 : 0)}K / yr`;
  return `₦${amount} / yr`;
}

function parseBudget(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const multiplier = /m\b/i.test(trimmed) ? 1_000_000 : /k\b/i.test(trimmed) ? 1_000 : 1;
  const numeric = Number(trimmed.replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? numeric * multiplier : 0;
}

export function DepartmentsPage() {
  const { employees } = useEmployees();
  const [departmentsList, setDepartmentsList] = useState<Department[]>(initialDepts);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [budgetModalDept, setBudgetModalDept] = useState<Department | null>(null);
  const [deleteConfirmDept, setDeleteConfirmDept] = useState<Department | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formHeadId, setFormHeadId] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formBudget, setFormBudget] = useState("");
  const [formOrgLevel, setFormOrgLevel] = useState("Cluster");

  // Budget update flow states
  const [updateBudgetAmount, setUpdateBudgetAmount] = useState("");
  const [updateBudgetNote, setUpdateBudgetNote] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchDepartments()
      .then((items) => {
        setDepartmentsList(items.map((dept: any) => ({
          ...dept,
          budget: formatBudget(dept.budget),
          orgLevel: dept.orgLevel || "Cluster",
          head: dept.head || "Unassigned",
          headId: dept.headId || "",
          budgetHistory: [],
        })));
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load departments"));
  }, []);

  const onboardedEmployees = employees.filter(e => e.status === "active");

  const openCreateModal = () => {
    setFormName("");
    setFormHeadId(onboardedEmployees[0]?.id || "");
    setFormDesc("");
    setFormLocation("");
    setFormBudget("");
    setFormOrgLevel("Cluster");
    setShowCreateModal(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setFormName(dept.name);
    setFormHeadId(dept.headId || "");
    setFormDesc(dept.description);
    setFormLocation(dept.location);
    setFormBudget(dept.budget);
    setFormOrgLevel(dept.orgLevel || "Cluster");
  };

  const openBudgetModal = (dept: Department) => {
    setBudgetModalDept(dept);
    setUpdateBudgetAmount(dept.budget);
    setUpdateBudgetNote("");
  };

  const handleCreateDepartment = async () => {
    if (!formName.trim()) return;
    const selectedHeadEmp = onboardedEmployees.find(e => e.id === formHeadId);
    const headName = selectedHeadEmp ? `${selectedHeadEmp.firstName} ${selectedHeadEmp.lastName}` : "Unassigned";
    const created = await createDepartment({
      name: formName.trim(),
      headId: formHeadId || null,
      description: formDesc.trim() || "No description provided.",
      location: formLocation.trim() || "Headquarters",
      budget: String(parseBudget(formBudget)),
    });

    const newDept: Department = {
      id: created.id,
      name: formName.trim(),
      head: headName,
      headId: formHeadId,
      description: formDesc.trim() || "No description provided.",
      headcount: 1,
      budget: formBudget.trim() || "₦0 / yr",
      location: formLocation.trim() || "Headquarters",
      orgLevel: formOrgLevel,
      employees: selectedHeadEmp ? [{ name: headName, role: selectedHeadEmp.jobTitle, id: selectedHeadEmp.id }] : [],
      budgetHistory: formBudget.trim() ? [
        {
          id: `bl-${Date.now()}`,
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          previousBudget: "₦0 / yr",
          newBudget: formBudget.trim(),
          note: "Initial department creation budget"
        }
      ] : []
    };

    setDepartmentsList(prev => [...prev, newDept]);
    setShowCreateModal(false);
  };

  const handleSaveEditDepartment = async () => {
    if (!editingDept || !formName.trim()) return;
    const selectedHeadEmp = onboardedEmployees.find(e => e.id === formHeadId);
    const headName = selectedHeadEmp ? `${selectedHeadEmp.firstName} ${selectedHeadEmp.lastName}` : editingDept.head;

    await updateDepartment(editingDept.id, {
      name: formName.trim(),
      headId: formHeadId || null,
      description: formDesc.trim(),
      location: formLocation.trim(),
      budget: String(parseBudget(formBudget)),
    });

    setDepartmentsList(prev => prev.map(d => {
      if (d.id === editingDept.id) {
        const isBudgetChanged = formBudget.trim() && formBudget.trim() !== d.budget;
        const newHistory = isBudgetChanged ? [
          ...(d.budgetHistory || []),
          {
            id: `bl-${Date.now()}`,
            date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            previousBudget: d.budget,
            newBudget: formBudget.trim(),
            note: "Budget updated during department edit"
          }
        ] : (d.budgetHistory || []);

        return {
          ...d,
          name: formName.trim(),
          head: headName,
          headId: formHeadId,
          description: formDesc.trim(),
          location: formLocation.trim(),
          budget: formBudget.trim() || d.budget,
          orgLevel: formOrgLevel,
          budgetHistory: newHistory
        };
      }
      return d;
    }));

    setEditingDept(null);
  };

  const handleUpdateBudgetTrackable = async () => {
    if (!budgetModalDept || !updateBudgetAmount.trim()) return;
    await updateDepartment(budgetModalDept.id, { budget: String(parseBudget(updateBudgetAmount)) });

    setDepartmentsList(prev => prev.map(d => {
      if (d.id === budgetModalDept.id) {
        const logEntry: BudgetLog = {
          id: `bl-${Date.now()}`,
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          previousBudget: d.budget,
          newBudget: updateBudgetAmount.trim(),
          note: updateBudgetNote.trim() || "Budget revision"
        };
        return {
          ...d,
          budget: updateBudgetAmount.trim(),
          budgetHistory: [...(d.budgetHistory || []), logEntry]
        };
      }
      return d;
    }));

    setBudgetModalDept(null);
  };

  const handleDeleteDepartment = () => {
    if (!deleteConfirmDept) return;
    deleteDepartment(deleteConfirmDept.id).catch(() => null);
    setDepartmentsList(prev => prev.filter(d => d.id !== deleteConfirmDept.id));
    setDeleteConfirmDept(null);
  };

  const filtered = departmentsList.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.head.toLowerCase().includes(search.toLowerCase())
  );

  const totalHeadcount = departmentsList.reduce((s, d) => s + d.headcount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Departments</h1>
          <p className="text-sm text-gray-500 mt-0.5">{departmentsList.length} departments · {totalHeadcount} total employees</p>
        </div>
        <button onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-700 text-white rounded-lg text-sm font-medium hover:bg-indigo-800 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Add Department
        </button>
      </div>

      {loadError && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          {loadError}. Showing the locally seeded department layout until the API is available.
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Departments", value: departmentsList.length, color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-100" },
          { label: "Total Headcount", value: totalHeadcount, color: "text-blue-700", bg: "bg-blue-50 border-blue-100" },
          { label: "Largest Dept", value: `${departmentsList[0]?.name || "—"} (${departmentsList[0]?.headcount || 0})`, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
          { label: "Tracked Department Budgets", value: `${departmentsList.filter(d => d.budget && d.budget !== "₦0 / yr").length} Active`, color: "text-amber-700", bg: "bg-amber-50 border-amber-100" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl border p-4`}>
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search departments or heads..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      {/* Department cards */}
      <div className="space-y-3">
        {filtered.map((dept, i) => {
          const isOpen = expanded === dept.id;
          return (
            <div key={dept.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:border-gray-300 transition-all">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/50" onClick={() => setExpanded(isOpen ? null : dept.id)}>
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${deptColors[i % deptColors.length]}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-base">{dept.name}</p>
                      <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">{dept.orgLevel || "Cluster"}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Head: <span className="font-medium text-gray-700">{dept.head}</span> · {dept.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{dept.headcount}</p>
                    <p className="text-xs text-gray-400">Employees</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-700">{dept.budget}</p>
                    <p className="text-xs text-gray-400">Annual Budget</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Track Budget Button */}
                    <button
                      title="Update / Track Budget"
                      onClick={(e) => { e.stopPropagation(); openBudgetModal(dept); }}
                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 border border-emerald-200 transition-colors flex items-center gap-1 text-xs px-2"
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Track Budget
                    </button>
                    {/* Responsive Edit Button */}
                    <button
                      title="Edit Department"
                      onClick={(e) => { e.stopPropagation(); openEditModal(dept); }}
                      className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 border border-gray-200 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {/* Delete Button */}
                    <button
                      title="Delete Department"
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmDept(dept); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {isOpen ? <ChevronDown className="w-5 h-5 text-gray-400 ml-1" /> : <ChevronRight className="w-5 h-5 text-gray-400 ml-1" />}
                  </div>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-gray-100 p-5 bg-gray-50/50 space-y-4">
                  <p className="text-sm text-gray-600 leading-relaxed">{dept.description}</p>
                  
                  {/* Department members */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Department Members ({dept.employees.length} shown)</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {dept.employees.map(e => (
                        <div key={e.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{e.name}</p>
                            <p className="text-xs text-gray-500">{e.role}</p>
                          </div>
                          <span className="text-[10px] font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-500">{e.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Trackable Budget History Log */}
                  {dept.budgetHistory && dept.budgetHistory.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <History className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Budget Update Log History</h4>
                      </div>
                      <div className="space-y-2">
                        {dept.budgetHistory.map(log => (
                          <div key={log.id} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-gray-800">{log.note}</p>
                              <p className="text-gray-400 text-[11px]">{log.date}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-gray-400 line-through mr-2">{log.previousBudget}</span>
                              <span className="font-bold text-emerald-700">{log.newBudget}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Create / Edit Department Modal ── */}
      {(showCreateModal || editingDept) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{editingDept ? "Edit Department" : "Add New Department"}</h2>
              <button onClick={() => { setShowCreateModal(false); setEditingDept(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Department Name <span className="text-red-500">*</span></label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Engineering"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* Department Head - Dropdown of Onboarded Employees */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Department Head <span className="text-indigo-600 font-normal">(Select Onboarded Employee)</span></label>
                <select value={formHeadId} onChange={e => setFormHeadId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select Employee Head…</option>
                  {onboardedEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} — {emp.jobTitle} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Work Location</label>
                  <input type="text" value={formLocation} onChange={e => setFormLocation(e.target.value)} placeholder="e.g. Abuja, Lagos"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Org Level / Unit</label>
                  <select value={formOrgLevel} onChange={e => setFormOrgLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="Collegium">Collegium</option>
                    <option value="Cluster">Cluster</option>
                    <option value="Crew">Crew</option>
                  </select>
                </div>
              </div>

              {/* Budget Field (Trackable flow, not required) */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Annual Budget <span className="text-gray-400 font-normal">(Optional / Trackable)</span></label>
                <input type="text" value={formBudget} onChange={e => setFormBudget(e.target.value)} placeholder="e.g. ₦25M / yr"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3} placeholder="Department objectives and scope of responsibilities..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => { setShowCreateModal(false); setEditingDept(null); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100">Cancel</button>
              <button onClick={editingDept ? handleSaveEditDepartment : handleCreateDepartment} disabled={!formName.trim()}
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-sm font-medium disabled:opacity-40 flex items-center gap-2">
                <Save className="w-4 h-4" /> {editingDept ? "Save Department" : "Create Department"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Trackable Budget Update Modal ── */}
      {budgetModalDept && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-900">Update Budget — {budgetModalDept.name}</h3>
              </div>
              <button onClick={() => setBudgetModalDept(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800">
              <p className="font-semibold">Current Budget: <span className="font-bold">{budgetModalDept.budget}</span></p>
              <p className="mt-0.5 text-emerald-700">Updating the budget creates a trackable historical record in the department audit log.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">New Budget Amount</label>
              <input type="text" value={updateBudgetAmount} onChange={e => setUpdateBudgetAmount(e.target.value)} placeholder="e.g. ₦50M / yr"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Reason / Change Note</label>
              <textarea value={updateBudgetNote} onChange={e => setUpdateBudgetNote(e.target.value)} rows={2} placeholder="e.g. Mid-year expansion funding approved by board"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setBudgetModalDept(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleUpdateBudgetTrackable} disabled={!updateBudgetAmount.trim()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Save Budget Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirmDept && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Delete Department?</h3>
              <p className="text-xs text-gray-500 mt-1">Are you sure you want to delete <strong className="text-gray-800">{deleteConfirmDept.name}</strong>? This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setDeleteConfirmDept(null)} className="w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDeleteDepartment} className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
