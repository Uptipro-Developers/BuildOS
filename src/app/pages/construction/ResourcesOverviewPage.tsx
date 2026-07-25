import { useNavigate } from "react-router";
import { Truck, Award, Users, DollarSign, ChevronRight, Search, ArrowUpDown, Download, Plus, X, Edit3, Package, Building2, UserCheck, UserCog, ExternalLink, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { projects, fmtCurrency, hrEmployees, stubMaterials, stubEquipment, tradeTypes } from "./mockData";
import { exportCSV } from "../../utils/exportCSV";
import { useResources, type IndividualContractor } from "../../contexts/ResourceContext";
import type { Vendor } from "./types";

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  Active: { bg: "#E8F8EF", text: "#1B7A43" },
  Awarded: { bg: "#FEF6E6", text: "#B0780F" },
  Completed: { bg: "#E8F8EF", text: "#1B7A43" },
  Terminated: { bg: "#FDE8E6", text: "#B33A2E" },
};

type SortField = "name" | "project" | "trade" | "contractType" | "status" | "contractSum";
type ResourceTab = "human" | "material" | "equipment";
type HumanSubTab = "employees" | "contractors" | "vendors";

const contractTypes = ["Labor-only", "Supply & Install", "Nominated Subcontractor"];


export function ResourcesOverviewPage() {
  const navigate = useNavigate();
  const { contractors, vendors, addContractor, updateContractor, removeContractor, addVendor, updateVendor, removeVendor } = useResources();

  const [tab, setTab] = useState<ResourceTab>("human");
  const [humanSubTab, setHumanSubTab] = useState<HumanSubTab>("vendors");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [showContractorModal, setShowContractorModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState<IndividualContractor | null>(null);
  const [contractorForm, setContractorForm] = useState({ name: "", trade: "", payRate: 0, payRateUnit: "daily" as const, skilledCount: 0, unskilledCount: 0, manDays: 0, status: "Active" as const, mobile: "", email: "" });

  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vendorForm, setVendorForm] = useState({ name: "", trade: "", contractType: "Labor-only" as Vendor["contractType"], isNominated: false, contractSum: 0, assignedWorkPackages: [] as string[], blockAssignment: "", skilledCount: 0, unskilledCount: 0, mandaysEstimate: 0, status: "Awarded" as Vendor["status"], projectId: "" });

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  const filteredVendors = useMemo(() => {
    let list = vendors.filter(v =>
      !search || v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.trade.toLowerCase().includes(search.toLowerCase())
    );
    if (sortField) {
      list = [...list].sort((a, b) => {
        let va: string | number, vb: string | number;
        if (sortField === "project") {
          va = projects.find(p => p.id === a.projectId)?.name ?? a.projectId;
          vb = projects.find(p => p.id === b.projectId)?.name ?? b.projectId;
        } else {
          va = a[sortField];
          vb = b[sortField];
        }
        if (typeof va === "number" && typeof vb === "number") {
          return sortDir === "asc" ? va - vb : vb - va;
        }
        return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    }
    return list;
  }, [vendors, search, sortField, sortDir]);

  const filteredContractors = contractors.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.trade.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEmployees = hrEmployees.filter(e =>
    !search || e.firstName.toLowerCase().includes(search.toLowerCase()) ||
    e.lastName.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMaterials = stubMaterials.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEquipment = stubEquipment.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalSum = vendors.reduce((s, v) => s + v.contractSum, 0);
  const activeVendors = vendors.filter(v => v.status === "Active");
  const nominated = vendors.filter(v => v.isNominated);

  const stats = [
    { icon: Truck, label: "Total Vendors", value: vendors.length },
    { icon: Award, label: "Active Vendors", value: activeVendors.length, color: "#27AE60" },
    { icon: UserCog, label: "Contractors", value: contractors.length, color: "#7C3AED" },
    { icon: DollarSign, label: "Total Contract Sum", value: fmtCurrency(totalSum), color: "#27AE60" },
  ];

  function openAddContractor() {
    setEditingContractor(null);
    setContractorForm({ name: "", trade: "", payRate: 0, payRateUnit: "daily", skilledCount: 0, unskilledCount: 0, manDays: 0, status: "Active", mobile: "", email: "" });
    setShowContractorModal(true);
  }

  function openEditContractor(c: IndividualContractor) {
    setEditingContractor(c);
    setContractorForm({ name: c.name, trade: c.trade, payRate: c.payRate, payRateUnit: c.payRateUnit, skilledCount: c.skilledCount, unskilledCount: c.unskilledCount, manDays: c.manDays, status: c.status, mobile: c.mobile || "", email: c.email || "" });
    setShowContractorModal(true);
  }

  function saveContractor() {
    if (!contractorForm.name.trim() || !contractorForm.trade) return;
    if (editingContractor) {
      updateContractor(editingContractor.id, contractorForm as any);
    } else {
      addContractor(contractorForm as any);
    }
    setShowContractorModal(false);
  }

  function openAddVendor() {
    setEditingVendor(null);
    setVendorForm({ name: "", trade: "", contractType: "Labor-only", isNominated: false, contractSum: 0, assignedWorkPackages: [], blockAssignment: "", skilledCount: 0, unskilledCount: 0, mandaysEstimate: 0, status: "Awarded", projectId: "" });
    setShowVendorModal(true);
  }

  function openEditVendor(v: Vendor) {
    setEditingVendor(v);
    setVendorForm({ name: v.name, trade: v.trade, contractType: v.contractType, isNominated: v.isNominated, contractSum: v.contractSum, assignedWorkPackages: v.assignedWorkPackages, blockAssignment: v.blockAssignment, skilledCount: v.skilledCount, unskilledCount: v.unskilledCount, mandaysEstimate: v.mandaysEstimate, status: v.status, projectId: v.projectId });
    setShowVendorModal(true);
  }

  function saveVendor() {
    if (!vendorForm.name.trim() || !vendorForm.trade || !vendorForm.projectId) return;
    if (editingVendor) {
      updateVendor(editingVendor.id, vendorForm as any);
    } else {
      addVendor(vendorForm as any);
    }
    setShowVendorModal(false);
  }

  return (
    <div style={{ backgroundColor: "#F7F8FA" }} className="min-h-screen p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#1A202C" }}>Resources Overview</h1>
        <p className="text-sm mt-1" style={{ color: "#718096" }}>All resources across projects</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-lg p-4 flex items-center gap-3" style={{ border: "1px solid #E2E8F0" }}>
              <Icon className="w-5 h-5" style={{ color: s.color ?? "#718096" }} />
              <div>
                <p className="text-xl font-bold" style={{ color: "#1A202C" }}>{s.value}</p>
                <p className="text-xs" style={{ color: "#718096" }}>{s.label}</p>
              </div>
            </div>
          );
        })}
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

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#718096" }} />
          <input type="text" placeholder="Search by name, trade, or category..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none" style={{ border: "1px solid #E2E8F0", color: "#1A202C", backgroundColor: "white" }} />
        </div>
      </div>

      {/* ────────── HUMAN RESOURCES ────────── */}
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
              const count = st.key === "employees" ? hrEmployees.length : st.key === "contractors" ? contractors.length : vendors.length;
              return (
                <button key={st.key} onClick={() => setHumanSubTab(st.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    humanSubTab === st.key ? "shadow-sm border" : "border border-transparent text-gray-500 hover:text-gray-700"
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

          {/* Employees */}
          {humanSubTab === "employees" && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">All Employees</h3>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">From HR Module</span>
              </div>
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
                      <td className="px-4 py-2.5 text-right text-gray-700 font-medium">{fmtCurrency(emp.dailyRate)}</td>
                      <td className="px-4 py-2.5">
                        <a href={`/apps/hr/employees/${emp.id}`} className="text-gray-400 hover:text-blue-600" title="View in HR Module">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-sm text-gray-400">No employees found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Individual Contractors */}
          {humanSubTab === "contractors" && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Individual Contractors</h3>
                <div className="flex items-center gap-2">
                  <button onClick={openAddContractor}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white text-xs font-medium" style={{ backgroundColor: "#7C3AED" }}>
                    <Plus className="w-3.5 h-3.5" /> Add Contractor
                  </button>
                  <button onClick={() => {
                    const rows = filteredContractors.map(c => [c.id, c.name, c.trade, String(c.payRate), c.payRateUnit, String(c.skilledCount), String(c.unskilledCount), String(c.manDays), c.status]);
                    exportCSV("individual-contractors", ["ID", "Name", "Trade", "Pay Rate", "Rate Unit", "Skilled", "Unskilled", "Man-Days", "Status"], rows);
                  }} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-50">
                    <Download className="w-3 h-3" /> Export CSV
                  </button>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Trade</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Pay Rate</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Rate Unit</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">Workers</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Man-Days</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredContractors.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-2.5 text-gray-600">{c.trade}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">{c.payRate ? fmtCurrency(c.payRate) : "—"}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-sm">{c.payRateUnit}</td>
                      <td className="px-4 py-2.5 text-center text-gray-500">{c.skilledCount}S / {c.unskilledCount}U</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{c.manDays}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          c.status === "Active" ? "bg-green-100 text-green-700" :
                          c.status === "Completed" ? "bg-gray-100 text-gray-600" : "bg-red-100 text-red-700"
                        }`}>{c.status}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditContractor(c)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => removeContractor(c.id)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600" title="Remove"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredContractors.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-10 text-sm text-gray-400">No individual contractors found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Vendors */}
          {humanSubTab === "vendors" && (
            <div className="bg-white rounded-lg p-4" style={{ border: "1px solid #E2E8F0" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {renderSortControls("name", "Name")}
                  {renderSortControls("project", "Project")}
                  {renderSortControls("trade", "Trade")}
                  {renderSortControls("contractType", "Contract Type")}
                  {renderSortControls("status", "Status")}
                  {renderSortControls("contractSum", "Contract Sum")}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={openAddVendor}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white text-xs font-medium" style={{ backgroundColor: "#EA580C" }}>
                    <Plus className="w-3.5 h-3.5" /> Add Vendor
                  </button>
                  <button onClick={() => {
                    const rows = filteredVendors.map(v => {
                      const proj = projects.find(p => p.id === v.projectId);
                      return [v.name, proj?.name ?? v.projectId, v.trade, v.contractType, v.status, fmtCurrency(v.contractSum)];
                    });
                    exportCSV("vendors", ["Name", "Project", "Trade", "Contract Type", "Status", "Contract Sum"], rows);
                  }} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-50">
                    <Download className="w-3 h-3" /> Export CSV
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: "#F7F8FA", borderBottom: "1px solid #E2E8F0" }}>
                      {[
                        { key: "name", label: "Resource" },
                        { key: "project", label: "Project" },
                        { key: "trade", label: "Trade" },
                        { key: "contractType", label: "Contract Type" },
                        { key: "status", label: "Status" },
                        { key: "contractSum", label: "Contract Sum" },
                      ].map(col => (
                        <th key={col.key} onClick={() => toggleSort(col.key as SortField)}
                          className={`px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900 transition-colors ${col.key === "contractSum" ? "text-right" : "text-left"}`}
                          style={{ color: "#718096" }}>
                          <span className="inline-flex items-center gap-1">
                            {col.label}
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          </span>
                        </th>
                      ))}
                      <th className="w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVendors.map((v, i) => {
                      const project = projects.find(p => p.id === v.projectId);
                      const st = STATUS_STYLES[v.status] ?? { bg: "#F1F5F9", text: "#475569" };
                      return (
                        <tr key={v.id} className="hover:bg-gray-50 cursor-pointer"
                          style={{ borderBottom: i < filteredVendors.length - 1 ? "1px solid #E2E8F0" : "none" }}
                          onClick={() => navigate(`/apps/construction/resources/${v.id}`)}
                        >
                          <td className="px-4 py-3 font-medium" style={{ color: "#1A202C" }}>{v.name}</td>
                          <td className="px-4 py-3" style={{ color: "#718096" }}>{project?.name ?? v.projectId}</td>
                          <td className="px-4 py-3" style={{ color: "#718096" }}>{v.trade}</td>
                          <td className="px-4 py-3" style={{ color: "#718096" }}>{v.contractType}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: st.bg, color: st.text }}>{v.status}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium" style={{ color: "#1A202C" }}>{fmtCurrency(v.contractSum)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <button onClick={() => openEditVendor(v)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => removeVendor(v.id)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600" title="Remove"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredVendors.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-8 text-sm" style={{ color: "#718096" }}>No vendors found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────── MATERIALS ────────── */}
      {tab === "material" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">All Materials</h3>
            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">From Procurement Module</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Est. Qty</th>
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
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      m.procurementSource === "internal" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {m.procurementSource === "internal" ? "Inventory" : "Purchase"}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredMaterials.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-sm text-gray-400">No materials found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ────────── EQUIPMENT ────────── */}
      {tab === "equipment" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">All Equipment</h3>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">From Procurement Module</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Equipment</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Ownership</th>
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
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      e.status === "Available" ? "bg-green-100 text-green-700" :
                      e.status === "Assigned" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                    }`}>{e.status}</span>
                  </td>
                </tr>
              ))}
              {filteredEquipment.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-sm text-gray-400">No equipment found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Contractor Modal ─── */}
      {showContractorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "white" }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "#E2E8F0" }}>
              <h2 className="text-lg font-bold text-gray-900">{editingContractor ? "Edit" : "Add"} Individual Contractor</h2>
              <button onClick={() => setShowContractorModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" value={contractorForm.name} onChange={e => setContractorForm({ ...contractorForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }} placeholder="e.g. Babatunde Welder" />
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
                  <select value={contractorForm.payRateUnit} onChange={e => setContractorForm({ ...contractorForm, payRateUnit: e.target.value as any })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                  <input type="text" value={contractorForm.mobile} onChange={e => setContractorForm({ ...contractorForm, mobile: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }} placeholder="080..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={contractorForm.email} onChange={e => setContractorForm({ ...contractorForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }} placeholder="optional" />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Man-Days Estimate</label>
                <input type="number" value={contractorForm.manDays} onChange={e => setContractorForm({ ...contractorForm, manDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={contractorForm.status} onChange={e => setContractorForm({ ...contractorForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t" style={{ borderColor: "#E2E8F0" }}>
              <button onClick={() => setShowContractorModal(false)} className="px-4 py-2 rounded-lg border text-sm text-gray-600" style={{ borderColor: "#E2E8F0" }}>Cancel</button>
              <button onClick={saveContractor} disabled={!contractorForm.name.trim() || !contractorForm.trade}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-white font-medium disabled:opacity-50" style={{ backgroundColor: "#7C3AED" }}>
                <Save className="w-3.5 h-3.5" /> {editingContractor ? "Update" : "Add"} Contractor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Vendor Modal ─── */}
      {showVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "white" }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "#E2E8F0" }}>
              <h2 className="text-lg font-bold text-gray-900">{editingVendor ? "Edit" : "Add"} Vendor / Subcontractor</h2>
              <button onClick={() => setShowVendorModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                <input type="text" value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }} placeholder="e.g. Alhaji Masonry Services" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trade</label>
                <select value={vendorForm.trade} onChange={e => setVendorForm({ ...vendorForm, trade: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}>
                  <option value="">Select trade</option>
                  {tradeTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                <select value={vendorForm.projectId} onChange={e => setVendorForm({ ...vendorForm, projectId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}>
                  <option value="">Select project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contract Type</label>
                <select value={vendorForm.contractType} onChange={e => setVendorForm({ ...vendorForm, contractType: e.target.value as Vendor["contractType"] })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}>
                  {contractTypes.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isNominated" checked={vendorForm.isNominated}
                  onChange={e => setVendorForm({ ...vendorForm, isNominated: e.target.checked, contractType: e.target.checked ? "Nominated Subcontractor" : vendorForm.contractType })}
                  className="rounded" style={{ accentColor: "#EA580C" }} />
                <label htmlFor="isNominated" className="text-sm text-gray-700">Nominated by HAUZ</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contract Sum (₦)</label>
                <input type="number" value={vendorForm.contractSum} onChange={e => setVendorForm({ ...vendorForm, contractSum: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Skilled Workers</label>
                  <input type="number" value={vendorForm.skilledCount} onChange={e => setVendorForm({ ...vendorForm, skilledCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unskilled Workers</label>
                  <input type="number" value={vendorForm.unskilledCount} onChange={e => setVendorForm({ ...vendorForm, unskilledCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Man-days Estimate</label>
                <input type="number" value={vendorForm.mandaysEstimate} onChange={e => setVendorForm({ ...vendorForm, mandaysEstimate: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={vendorForm.status} onChange={e => setVendorForm({ ...vendorForm, status: e.target.value as Vendor["status"] })}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}>
                  {Object.keys(STATUS_STYLES).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t" style={{ borderColor: "#E2E8F0" }}>
              <button onClick={() => setShowVendorModal(false)} className="px-4 py-2 rounded-lg border text-sm text-gray-600" style={{ borderColor: "#E2E8F0" }}>Cancel</button>
              <button onClick={saveVendor} disabled={!vendorForm.name.trim() || !vendorForm.trade || !vendorForm.projectId}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-white font-medium disabled:opacity-50" style={{ backgroundColor: "#EA580C" }}>
                <Save className="w-3.5 h-3.5" /> {editingVendor ? "Update" : "Add"} Vendor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderSortControls(field: SortField, label: string) {
    return (
      <button onClick={() => toggleSort(field)}
        className="px-2 py-1 rounded text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 flex items-center gap-1"
      >
        {label}
        {sortField === field && (sortDir === "asc" ? "▲" : "▼")}
      </button>
    );
  }
}
