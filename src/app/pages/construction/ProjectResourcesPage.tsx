import { useParams, useNavigate } from "react-router";
import { useState } from "react";
import { Users, Package, Truck, Plus, Search, X, Eye, Award, DollarSign, Briefcase, Download, Edit, ExternalLink, Building2, UserCheck, UserCog } from "lucide-react";
import { getProjectById, getTasksByProject, fmtCurrency, hrEmployees, stubMaterials, stubEquipment, tradeTypes } from "./mockData";
import type { Task } from "./types";
import { exportCSV } from "../../utils/exportCSV";
import { useResources } from "../../contexts/ResourceContext";

const statusStyles: Record<string, { badge: string; label: string }> = {
  Awarded: { badge: "bg-blue-100 text-blue-700", label: "Awarded" },
  Active: { badge: "bg-green-100 text-green-700", label: "Active" },
  Completed: { badge: "bg-gray-100 text-gray-600", label: "Completed" },
  Terminated: { badge: "bg-red-100 text-red-700", label: "Terminated" },
};

const contractTypes = ["Labor-only", "Supply & Install", "Nominated Subcontractor"];

const emptyVendor = {
  name: "", trade: "", contractType: "Labor-only" as Vendor["contractType"],
  isNominated: false, contractSum: 0, blockAssignment: "",
  skilledCount: 0, unskilledCount: 0, mandaysEstimate: 0,
  status: "Awarded" as Vendor["status"],
};

const materialCategories = ["Aggregates", "Concrete", "Formwork", "Reinforcement", "Structural Steel", "Finishing", "Plumbing", "Electrical", "Roofing", "Other"];
const equipmentCategories = ["Earthwork", "Lifting", "Concreting", "Transportation", "Drilling & Piling", "Formwork & Scaffolding", "Power Generation", "Light Tools"];

type ResourceTab = "human" | "material" | "equipment";
type HumanSubTab = "employees" | "contractors" | "vendors";


export function ProjectResourcesPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = getProjectById(projectId!);
  const { contractors: allContractors, vendors: allVendors, addContractor, removeContractor, addVendor } = useResources();
  const vendors = allVendors.filter(v => v.projectId === projectId);

  const [tab, setTab] = useState<ResourceTab>("human");
  const [humanSubTab, setHumanSubTab] = useState<HumanSubTab>("vendors");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyVendor);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [showAddContractor, setShowAddContractor] = useState(false);
  const [contractorForm, setContractorForm] = useState({ name: "", trade: "", payRate: 0, payRateUnit: "daily", skilledCount: 0, unskilledCount: 0, mandaysEstimate: 0, status: "Awarded" });

  const projectContractors = allContractors;

  const filteredVendors = vendors.filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.trade.toLowerCase().includes(search.toLowerCase()));
  const filteredEmployees = hrEmployees.filter(s => !search || s.firstName.toLowerCase().includes(search.toLowerCase()) || s.lastName.toLowerCase().includes(search.toLowerCase()) || s.role.toLowerCase().includes(search.toLowerCase()));
  const filteredContractors = projectContractors.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.trade.toLowerCase().includes(search.toLowerCase()));
  const filteredMaterials = stubMaterials.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.category.toLowerCase().includes(search.toLowerCase()));
  const filteredEquipment = stubEquipment.filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase()));

  const workPackages: Task[] = projectId ? getTasksByProject(projectId).filter(t => t.level === 4) : [];
  const structureNames = project?.structure?.map(s => s.name).filter(Boolean) ?? [];

  function handleAdd() {
    addVendor({
      projectId: projectId!,
      assignedWorkPackages: [],
      ...form,
    });
    setShowAddModal(false);
    setForm(emptyVendor);
    setSelectedVendorId("");
  }

  function handleVendorSelect(id: string) {
    setSelectedVendorId(id);
    if (id === "" || id === "__new__") {
      setForm(emptyVendor);
    } else {
      const v = allVendors.find(v => v.id === id);
      if (v) setForm({ ...form, name: v.name, trade: v.trade, contractType: v.contractType, isNominated: v.isNominated });
    }
  }

  function handleAddContractor() {
    if (!contractorForm.name.trim() || !contractorForm.trade) return;
    addContractor({
      name: contractorForm.name,
      trade: contractorForm.trade,
      payRate: contractorForm.payRate,
      payRateUnit: contractorForm.payRateUnit as "daily" | "weekly" | "monthly" | "lump-sum",
      skilledCount: contractorForm.skilledCount,
      unskilledCount: contractorForm.unskilledCount,
      manDays: contractorForm.mandaysEstimate,
      status: contractorForm.status as "Active" | "Completed" | "Terminated",
    });
    setContractorForm({ name: "", trade: "", payRate: 0, payRateUnit: "daily", skilledCount: 0, unskilledCount: 0, mandaysEstimate: 0, status: "Awarded" });
    setShowAddContractor(false);
  }

  function handleRemoveContractor(id: string) {
    removeContractor(id);
  }

  function exportHumanCSV() {
    const rows = filteredVendors.map(v => [v.name, v.trade, v.contractType, v.status, String(v.skilledCount), String(v.unskilledCount), String(v.contractSum)]);
    exportCSV("project-human-resources", ["Name", "Trade", "Contract Type", "Status", "Skilled", "Unskilled", "Contract Sum"], rows);
  }

  function exportMaterialCSV() {
    const rows = filteredMaterials.map(m => [m.name, m.category, m.unit, String(m.estimatedQty), String(m.estimatedUnitCost), String(m.totalEstimatedCost), m.procurementSource]);
    exportCSV("project-materials", ["Name", "Category", "Unit", "Qty", "Unit Cost", "Total Cost", "Source"], rows);
  }

  function exportEquipmentCSV() {
    const rows = filteredEquipment.map(e => [e.name, e.category, e.ownership, String(e.estimatedDays), String(e.totalEstimatedCost), e.status]);
    exportCSV("project-equipment", ["Name", "Category", "Ownership", "Days", "Total Cost", "Status"], rows);
  }

  return (
    <div style={{ backgroundColor: "#F7F8FA" }} className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#E8973A", color: "white" }}>
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Resources</h1>
            <p className="text-sm text-gray-500">
              {              tab === "human" ? `${vendors.length + hrEmployees.length} human resources` :
               tab === "material" ? `${stubMaterials.length} materials` :
               `${stubEquipment.length} equipment items`}
              {project ? ` for ${project.name}` : ""}
            </p>
          </div>
        </div>
        {tab === "human" && humanSubTab === "vendors" && (
          <button onClick={() => { setShowAddModal(true); setForm(emptyVendor); setSelectedVendorId(""); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: "#E8973A" }}>
            <Plus className="w-4 h-4" /> Add Vendor
          </button>
        )}
      </div>

      {/* Resource Type Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 max-w-lg">
        {(["human", "material", "equipment"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "human" ? <Users className="w-4 h-4" /> : t === "material" ? <Package className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
            {t === "human" ? "Human Resources" : t === "material" ? "Materials" : "Equipment"}
          </button>
        ))}
      </div>

      {/* Search + Export */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search resources..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "white" }} />
        </div>
        <button onClick={tab === "human" ? exportHumanCSV : tab === "material" ? exportMaterialCSV : exportEquipmentCSV}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50" style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}>
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* ─── HUMAN RESOURCES ─── */}
      {tab === "human" && (
        <div className="space-y-4">
          {/* Sub-tabs */}
          <div className="flex gap-1.5">
            {[
              { key: "employees" as HumanSubTab, label: "Employees", icon: UserCheck, color: "blue" },
              { key: "contractors" as HumanSubTab, label: "Individual Contractors", icon: UserCog, color: "purple" },
              { key: "vendors" as HumanSubTab, label: "Vendors", icon: Building2, color: "orange" },
            ].map(st => {
              const Icon = st.icon;
              const count = st.key === "employees" ? hrEmployees.length : st.key === "vendors" ? vendors.length : 0;
              return (
                <button key={st.key} onClick={() => setHumanSubTab(st.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    humanSubTab === st.key
                      ? `bg-${st.color}-50 text-${st.color}-700 shadow-sm border border-${st.color}-200`
                      : "text-gray-500 hover:text-gray-700 border border-transparent"
                  }`}
                  style={humanSubTab === st.key ? {
                    backgroundColor: st.color === "blue" ? "#EFF6FF" : st.color === "purple" ? "#F5F3FF" : "#FFF7ED",
                    color: st.color === "blue" ? "#1D4ED8" : st.color === "purple" ? "#7C3AED" : "#EA580C",
                    borderColor: st.color === "blue" ? "#BFDBFE" : st.color === "purple" ? "#DDD6FE" : "#FED7AA",
                  } : {}}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {st.label}
                  {count > 0 && <span className="ml-0.5 text-[10px] opacity-70">({count})</span>}
                </button>
              );
            })}
          </div>

          {/* Employees (view-only from HR) */}
          {humanSubTab === "employees" && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Assigned Employees</h3>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">From HR Module</span>
              </div>
              {filteredEmployees.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Daily Rate</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredEmployees.map(emp => (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{emp.firstName} {emp.lastName}</td>
                        <td className="px-4 py-2.5 text-gray-600">{emp.role}</td>
                        <td className="px-4 py-2.5 text-gray-500">{emp.department}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            emp.status === "active" ? "bg-green-100 text-green-700" :
                            emp.status === "on_leave" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                          }`}>{emp.status}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-700 font-medium">{emp.dailyRate ? fmtCurrency(emp.dailyRate) : "—"}</td>
                        <td className="px-4 py-2.5">
                          <a href={`/apps/hr/employees/${emp.id}`} className="text-gray-400 hover:text-blue-600" title="View in HR Module">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No employees assigned to this project</p>
                  <p className="text-xs mt-1">Assign employees via the HR Module → Workforce Allocation</p>
                </div>
              )}
            </div>
          )}

          {/* Contractors (editable within project) */}
          {humanSubTab === "contractors" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setShowAddContractor(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: "#E8973A" }}>
                  <Plus className="w-4 h-4" /> Add Contractor
                </button>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Individual Contractors</h3>
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Managed in Project</span>
                </div>
                {filteredContractors.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Trade</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Pay Rate</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Rate Unit</th>
                        <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Workers</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Mandays</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="w-16" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredContractors.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-900">{c.name}</td>
                          <td className="px-4 py-2.5 text-gray-600">{c.trade}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-900">{c.payRate ? fmtCurrency(c.payRate) : "—"}</td>
                          <td className="px-4 py-2.5 text-gray-500 text-sm">{c.payRateUnit || "—"}</td>
                          <td className="px-4 py-2.5 text-center text-gray-500">{c.skilledCount}S / {c.unskilledCount}U</td>
                          <td className="px-4 py-2.5 text-right text-gray-700">{c.manDays}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.status === "Active" ? "bg-green-100 text-green-700" : c.status === "Completed" ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-700"}`}>{c.status}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <button onClick={() => removeContractor(c.id)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600" title="Remove"><X className="w-3.5 h-3.5" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-10 text-gray-400">
                    <UserCog className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">No individual contractors yet</p>
                    <p className="text-xs mt-1">Add contractors to assign them to project tasks</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Vendors (editable within project) */}
          {humanSubTab === "vendors" && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Vendors / Subcontractors</h3>
                <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Managed in Project</span>
              </div>
              {filteredVendors.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Trade</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Contract Type</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Workers</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Contract Sum</th>
                      <th className="w-20" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredVendors.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{v.name}</td>
                        <td className="px-4 py-2.5 text-gray-600">{v.trade}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            v.contractType === "Nominated Subcontractor" ? "bg-orange-100 text-orange-700" :
                            v.contractType === "Supply & Install" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                          }`}>{v.contractType}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center text-gray-500">{v.skilledCount}S / {v.unskilledCount}U</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[v.status]?.badge}`}>{statusStyles[v.status]?.label}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-900">{fmtCurrency(v.contractSum)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            <button onClick={() => navigate(`/apps/construction/resources/${v.id}`)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="View details"><Eye className="w-3.5 h-3.5" /></button>
                            <button className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No vendors yet</p>
                  <p className="text-xs mt-1">Click "Add Vendor" to register a new subcontractor</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── MATERIALS (view-only from Procurement) ─── */}
      {tab === "material" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Project Materials</h3>
            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">From Procurement Module</span>
          </div>
          {filteredMaterials.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMaterials.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{m.name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{m.category}</td>
                    <td className="px-4 py-2.5 text-gray-500">{m.unit}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{m.estimatedQty.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{fmtCurrency(m.estimatedUnitCost)}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">{fmtCurrency(m.totalEstimatedCost)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.procurementSource === "purchase" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                        {m.procurementSource === "purchase" ? "Purchase" : "Internal/Client"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-10 text-gray-400">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No materials found</p>
              <p className="text-xs mt-1">Materials are managed in the Procurement Module</p>
            </div>
          )}
        </div>
      )}

      {/* ─── EQUIPMENT (view-only from Procurement) ─── */}
      {tab === "equipment" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Project Equipment</h3>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">From Procurement Module</span>
          </div>
          {filteredEquipment.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Equipment</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Ownership</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Days</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEquipment.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{e.name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{e.category}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        e.ownership === "company-owned" ? "bg-blue-100 text-blue-700" :
                        e.ownership === "rented" ? "bg-amber-100 text-amber-700" : "bg-purple-100 text-purple-700"
                      }`}>{e.ownership}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{e.estimatedDays}d</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">{fmtCurrency(e.totalEstimatedCost)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        e.status === "Available" ? "bg-green-100 text-green-700" :
                        e.status === "Assigned" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                      }`}>{e.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-10 text-gray-400">
              <Truck className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No equipment found</p>
              <p className="text-xs mt-1">Equipment is managed in the Procurement Module</p>
            </div>
          )}
        </div>
      )}

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "white" }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "#E2E8F0" }}>
              <h2 className="text-lg font-bold text-gray-900">Add Vendor / Subcontractor</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select existing vendor</label>
                <select value={selectedVendorId} onChange={e => handleVendorSelect(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}>
                  <option value="">— Select —</option>
                  {allVendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name} — {getProjectById(v.projectId)?.name || v.projectId} ({v.trade})</option>
                  ))}
                  <option value="__new__">Register New Vendor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
                  placeholder="e.g. Alhaji Masonry Services" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trade</label>
                <select value={form.trade} onChange={e => setForm({ ...form, trade: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}>
                  <option value="">Select trade</option>
                  {tradeTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contract Type</label>
                <select value={form.contractType} onChange={e => setForm({ ...form, contractType: e.target.value as Vendor["contractType"] })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}>
                  {contractTypes.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isNominated" checked={form.isNominated}
                  onChange={e => setForm({ ...form, isNominated: e.target.checked, contractType: e.target.checked ? "Nominated Subcontractor" : form.contractType })}
                  className="rounded" style={{ accentColor: "#E8973A" }} />
                <label htmlFor="isNominated" className="text-sm text-gray-700">Nominated by HAUZ</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contract Sum (₦)</label>
                <input type="number" value={form.contractSum} onChange={e => setForm({ ...form, contractSum: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Block / Section</label>
                <select value={form.blockAssignment} onChange={e => setForm({ ...form, blockAssignment: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}>
                  <option value="">— Select —</option>
                  {structureNames.map(name => <option key={name} value={name}>{name}</option>)}
                  <option value="All / Site-wide">All / Site-wide</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Skilled Workers</label>
                  <input type="number" value={form.skilledCount} onChange={e => setForm({ ...form, skilledCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unskilled Workers</label>
                  <input type="number" value={form.unskilledCount} onChange={e => setForm({ ...form, unskilledCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Man-days Estimate</label>
                <input type="number" value={form.mandaysEstimate} onChange={e => setForm({ ...form, mandaysEstimate: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Vendor["status"] })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}>
                  {Object.keys(statusStyles).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t" style={{ borderColor: "#E2E8F0" }}>
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg border text-sm text-gray-600" style={{ borderColor: "#E2E8F0" }}>Cancel</button>
              <button onClick={handleAdd} disabled={!form.name || !form.trade}
                className="px-4 py-2 rounded-lg text-sm text-white font-medium disabled:opacity-50" style={{ backgroundColor: "#E8973A" }}>Add Vendor</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contractor Modal */}
      {showAddContractor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "white" }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "#E2E8F0" }}>
              <h2 className="text-lg font-bold text-gray-900">Add Individual Contractor</h2>
              <button onClick={() => setShowAddContractor(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" value={contractorForm.name} onChange={e => setContractorForm({ ...contractorForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
                  placeholder="e.g. Babatunde Welder" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trade</label>
                <select value={contractorForm.trade} onChange={e => setContractorForm({ ...contractorForm, trade: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}>
                  <option value="">Select trade</option>
                  {tradeTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pay Rate (₦)</label>
                  <input type="number" value={contractorForm.payRate} onChange={e => setContractorForm({ ...contractorForm, payRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate Unit</label>
                  <select value={contractorForm.payRateUnit} onChange={e => setContractorForm({ ...contractorForm, payRateUnit: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}>
                    <option value="daily">Per Day</option>
                    <option value="weekly">Per Week</option>
                    <option value="monthly">Per Month</option>
                    <option value="lump-sum">Lump Sum</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Skilled Workers</label>
                  <input type="number" value={contractorForm.skilledCount} onChange={e => setContractorForm({ ...contractorForm, skilledCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unskilled Workers</label>
                  <input type="number" value={contractorForm.unskilledCount} onChange={e => setContractorForm({ ...contractorForm, unskilledCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Man-days Estimate</label>
                <input type="number" value={contractorForm.mandaysEstimate} onChange={e => setContractorForm({ ...contractorForm, mandaysEstimate: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={contractorForm.status} onChange={e => setContractorForm({ ...contractorForm, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}>
                  <option value="Awarded">Awarded</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t" style={{ borderColor: "#E2E8F0" }}>
              <button onClick={() => setShowAddContractor(false)} className="px-4 py-2 rounded-lg border text-sm text-gray-600" style={{ borderColor: "#E2E8F0" }}>Cancel</button>
              <button onClick={handleAddContractor} disabled={!contractorForm.name.trim() || !contractorForm.trade}
                className="px-4 py-2 rounded-lg text-sm text-white font-medium disabled:opacity-50" style={{ backgroundColor: "#E8973A" }}>Add Contractor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}