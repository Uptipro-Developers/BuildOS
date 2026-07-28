import { useParams } from "react-router";
import { useMemo, useState, useEffect, Fragment } from "react";
import { getCurrencySymbol } from "../../utils/generalSettings";
import {
  DollarSign,
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  Landmark,
  Wallet,
  PiggyBank,
} from "lucide-react";
import {
  getProjectById,
  getTasksByProject,
  getVendorsByProject,
  fmtCurrency,
  fundingAllocations as mockAllocations,
  fundingReleases as mockReleases,
  disbursements as mockDisbursements,
} from "./mockData";
import { TableControls, exportToCSV } from "../../components/TableControls";
import { listFundingAllocations } from "../../api/funding-allocations";
import { listFundingReleases } from "../../api/funding-releases";
import { listDisbursements } from "../../api/disbursements";

const budgetCategories = [
  { name: "Materials", pct: 35, color: "bg-orange-500" },
  { name: "Labor", pct: 28, color: "bg-blue-500" },
  { name: "Equipment", pct: 15, color: "bg-purple-500" },
  { name: "Lump Sums", pct: 12, color: "bg-green-500" },
  { name: "Provisional Sums", pct: 10, color: "bg-amber-500" },
];

export function CostsPage() {
  const { id } = useParams<{ id: string }>();
  const project = getProjectById(id ?? "");
  const projectTasks = useMemo(() => getTasksByProject(id ?? ""), [id]);
  const projectVendors = useMemo(() => getVendorsByProject(id ?? ""), [id]);
  const [allAllocations, setAllAllocations] = useState(mockAllocations);
  const [allReleases, setAllReleases] = useState(mockReleases);
  const [allDisbursements, setAllDisbursements] = useState(mockDisbursements);
  useEffect(() => {
    if (!id) return;
    let active = true;
    listFundingAllocations(id)
      .then((d) => {
        if (active && d.length > 0) setAllAllocations(d);
      })
      .catch(() => {});
    listFundingReleases(id)
      .then((d) => {
        if (active && d.length > 0) setAllReleases(d);
      })
      .catch(() => {});
    listDisbursements(id)
      .then((d) => {
        if (active && d.length > 0) setAllDisbursements(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id]);
  const [activeSection, setActiveSection] = useState("overview");
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [stageColumns, setStageColumns] = useState([
    { key: "stage", label: "Stage", visible: true },
    { key: "budget", label: "Budget", visible: true },
    { key: "spent", label: "Spent", visible: true },
    { key: "variance", label: `Variance (${getCurrencySymbol()})`, visible: true },
    { key: "variancePct", label: "Variance (%)", visible: true },
    { key: "progress", label: "Progress", visible: true },
  ]);

  const stages = useMemo(
    () => projectTasks.filter((t) => t.level === 1),
    [projectTasks],
  );
  const stageBudgets = useMemo(() => {
    if (!project || stages.length === 0) return [];
    const totalPlannedDuration = stages.reduce(
      (s, st) => s + st.plannedDuration,
      0,
    );
    return stages.map((st) => {
      const pct = st.plannedDuration / totalPlannedDuration;
      const budget = Math.round(project.budget * pct);
      const spent = Math.round(
        project.spent * pct * (st.percentComplete / 100),
      );
      const variance = budget - spent;
      const variancePct = budget > 0 ? (variance / budget) * 100 : 0;
      return { stage: st, budget, spent, variance, variancePct };
    });
  }, [project, stages]);

  const totalBudget = project?.budget ?? 0;
  const totalSpent = project?.spent ?? 0;
  const totalVariance = totalBudget - totalSpent;

  const projectAllocations = useMemo(
    () =>
      allAllocations
        .filter((a) => a.projectId === id)
        .reduce((s, a) => s + a.totalAllocated, 0),
    [allAllocations, id],
  );
  const projectReleases = useMemo(
    () =>
      allReleases
        .filter((r) => r.projectId === id)
        .reduce((s, r) => s + r.amount, 0),
    [allReleases, id],
  );
  const projectDisbursements = useMemo(
    () =>
      allDisbursements
        .filter((d) => d.projectId === id)
        .reduce((s, d) => s + d.amount, 0),
    [allDisbursements, id],
  );
  const remainingFunding = projectReleases - projectDisbursements;

  const sections = [
    {
      id: "overview",
      label: "Overview",
      icon: <PieChart className="w-3.5 h-3.5" />,
    },
    {
      id: "budget-table",
      label: "Budget vs Actual",
      icon: <BarChart3 className="w-3.5 h-3.5" />,
    },
    {
      id: "subcontract",
      label: "Subcontract Costs",
      icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Costs & Budget
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {project?.name ?? "Project"} — Budget performance
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <DollarSign className="w-4 h-4 text-orange-500" />
          <span>
            Total Budget:{" "}
            <strong className="text-gray-900">
              {fmtCurrency(totalBudget)}
            </strong>
          </span>
        </div>
      </div>

      {/* Top summary stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-orange-600 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Budget
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {fmtCurrency(totalBudget)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Spent to Date
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {fmtCurrency(totalSpent)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Variance
            </span>
          </div>
          <p
            className={`text-xl font-bold ${totalVariance >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {totalVariance >= 0 ? "+" : ""}
            {fmtCurrency(totalVariance)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Utilisation
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}
            %
          </p>
        </div>
      </div>

      {/* Funding summary row */}
      {projectAllocations > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Landmark className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Funding Allocated
              </span>
            </div>
            <p className="text-xl font-bold text-blue-700">
              {fmtCurrency(projectAllocations)}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <Wallet className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Funding Released
              </span>
            </div>
            <p className="text-xl font-bold text-green-700">
              {fmtCurrency(projectReleases)}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-orange-600 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Disbursed
              </span>
            </div>
            <p className="text-xl font-bold" style={{ color: "#E8973A" }}>
              {fmtCurrency(projectDisbursements)}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <PiggyBank className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Remaining Funding
              </span>
            </div>
            <p
              className={`text-xl font-bold ${remainingFunding >= 0 ? "text-purple-700" : "text-red-600"}`}
            >
              {fmtCurrency(remainingFunding)}
            </p>
          </div>
        </div>
      )}

      {/* Section tabs */}
      <div className="flex border-b border-gray-200">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeSection === s.id
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Overview section */}
      {activeSection === "overview" && (
        <div className="space-y-5">
          {/* Budget breakdown card */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Budget Breakdown by Category
            </h3>
            <div className="flex items-end gap-1 mb-4 h-32">
              {budgetCategories.map((c) => (
                <div
                  key={c.name}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span className="text-xs text-gray-500 font-medium">
                    {c.pct}%
                  </span>
                  <div
                    className="w-full rounded-t-sm"
                    style={{
                      height: `${c.pct * 3}px`,
                      backgroundColor: c.color
                        .replace("bg-", "#")
                        .replace("orange-500", "E8973A")
                        .replace("blue-500", "3B82F6")
                        .replace("purple-500", "A855F7")
                        .replace("green-500", "22C55E")
                        .replace("amber-500", "F59E0B"),
                    }}
                  />
                  <span className="text-[10px] text-gray-400 text-center mt-1 leading-tight">
                    {c.name}
                  </span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-3 text-center text-xs">
              {budgetCategories.map((c) => (
                <div key={c.name} className="bg-gray-50 rounded p-2">
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-gray-500 mt-0.5">
                    {fmtCurrency(Math.round((totalBudget * c.pct) / 100))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Budget by Stage table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Budget by Stage
              </h3>
              <TableControls
                columns={stageColumns}
                onColumnsChange={(cols) =>
                  setStageColumns(
                    cols.map((c) => ({
                      key: c.key,
                      label: c.label,
                      visible: c.visible ?? true,
                    })),
                  )
                }
                onExportCSV={() =>
                  exportToCSV(
                    stageBudgets.map((sb) => ({
                      Stage: sb.stage.name,
                      Budget: sb.budget,
                      Spent: sb.spent,
                      Variance: sb.variance,
                      "Variance %": sb.variancePct.toFixed(1),
                      Progress: `${sb.stage.percentComplete}%`,
                    })),
                    `${project?.name || "project"}-budget-by-stage`,
                  )
                }
              />
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Stage
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Budget
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Spent
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Variance ({getCurrencySymbol()})
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Variance (%)
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stageBudgets.map((sb) => {
                  const varIsPos = sb.variance >= 0;
                  const isExpanded = expandedStage === sb.stage.id;
                  const subTasks = projectTasks.filter(
                    (t) => t.parentTaskId === sb.stage.id,
                  );
                  const totalSubDuration = subTasks.reduce(
                    (s, t) => s + t.plannedDuration,
                    0,
                  );
                  return (
                    <Fragment key={sb.stage.id}>
                      <tr
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() =>
                          setExpandedStage(isExpanded ? null : sb.stage.id)
                        }
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {subTasks.length > 0 && (
                              <span className="text-gray-400">
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </span>
                            )}
                            <span className="font-medium text-gray-900">
                              {sb.stage.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right text-gray-900">
                          {fmtCurrency(sb.budget)}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-700">
                          {fmtCurrency(sb.spent)}
                        </td>
                        <td
                          className={`px-5 py-3 text-right font-medium ${varIsPos ? "text-green-600" : "text-red-600"}`}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {varIsPos ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {fmtCurrency(Math.abs(sb.variance))}
                          </div>
                        </td>
                        <td
                          className={`px-5 py-3 text-right font-medium ${varIsPos ? "text-green-600" : "text-red-600"}`}
                        >
                          {varIsPos ? "+" : ""}
                          {sb.variancePct.toFixed(1)}%
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-orange-500 h-1.5 rounded-full"
                                style={{
                                  width: `${sb.stage.percentComplete}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">
                              {sb.stage.percentComplete}%
                            </span>
                          </div>
                        </td>
                      </tr>
                      {isExpanded &&
                        subTasks.map((st) => {
                          const stPct =
                            totalSubDuration > 0
                              ? st.plannedDuration / totalSubDuration
                              : 0;
                          const stBudget = Math.round(
                            totalBudget *
                              (sb.stage.plannedDuration /
                                projectTasks.reduce(
                                  (s, t) => s + t.plannedDuration,
                                  1,
                                )) *
                              stPct,
                          );
                          const stSpent = Math.round(
                            (stBudget * st.percentComplete) / 100,
                          );
                          const stVar = stBudget - stSpent;
                          return (
                            <tr key={st.id} className="bg-gray-50/50 text-sm">
                              <td className="px-5 py-2 pl-12 text-gray-600">
                                {st.name}
                              </td>
                              <td className="px-5 py-2 text-right text-gray-600">
                                {fmtCurrency(stBudget)}
                              </td>
                              <td className="px-5 py-2 text-right text-gray-600">
                                {fmtCurrency(stSpent)}
                              </td>
                              <td
                                className={`px-5 py-2 text-right font-medium ${stVar >= 0 ? "text-green-500" : "text-red-500"}`}
                              >
                                {fmtCurrency(stVar)}
                              </td>
                              <td
                                className={`px-5 py-2 text-right ${stVar >= 0 ? "text-green-500" : "text-red-500"}`}
                              >
                                {stVar >= 0 ? "+" : ""}
                                {(totalBudget > 0
                                  ? (stVar / totalBudget) * 100
                                  : 0
                                ).toFixed(1)}
                                %
                              </td>
                              <td className="px-5 py-2 text-right text-xs text-gray-500">
                                {st.percentComplete}%
                              </td>
                            </tr>
                          );
                        })}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td className="px-5 py-3 font-semibold text-gray-900">
                    Total
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">
                    {fmtCurrency(
                      stageBudgets.reduce((s, sb) => s + sb.budget, 0),
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">
                    {fmtCurrency(
                      stageBudgets.reduce((s, sb) => s + sb.spent, 0),
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">
                    {fmtCurrency(
                      stageBudgets.reduce((s, sb) => s + sb.variance, 0),
                    )}
                  </td>
                  <td
                    className="px-5 py-3 text-right font-semibold text-gray-900"
                    colSpan={2}
                  />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Actual spend vs budget progress cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Actual Spend to Date
              </h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Spent</span>
                <span className="text-sm font-bold text-gray-900">
                  {fmtCurrency(totalSpent)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full"
                  style={{
                    width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                <span>0%</span>
                <span>
                  {Math.round((totalSpent / totalBudget) * 100)}% utilised
                </span>
                <span>100%</span>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Remaining Budget
              </h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Remaining</span>
                <span className="text-sm font-bold text-green-600">
                  {fmtCurrency(Math.max(0, totalVariance))}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full"
                  style={{
                    width: `${Math.max(0, (totalVariance / totalBudget) * 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                <span>{getCurrencySymbol()}0</span>
                <span>
                  {Math.max(0, Math.round((totalVariance / totalBudget) * 100))}
                  % remaining
                </span>
                <span>{fmtCurrency(totalBudget)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget vs Actual table */}
      {activeSection === "budget-table" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              Budget vs Actual — Per Stage
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Stage
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Budget ({getCurrencySymbol()})
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Actual ({getCurrencySymbol()})
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Variance ({getCurrencySymbol()})
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Variance (%)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stageBudgets.map((sb) => (
                <tr key={sb.stage.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {sb.stage.name}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-900">
                    {fmtCurrency(sb.budget)}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-700">
                    {fmtCurrency(sb.spent)}
                  </td>
                  <td
                    className={`px-5 py-3 text-right font-medium ${sb.variance >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {sb.variance >= 0 ? "+" : ""}
                    {fmtCurrency(sb.variance)}
                  </td>
                  <td
                    className={`px-5 py-3 text-right font-medium ${sb.variance >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {sb.variancePct >= 0 ? "+" : ""}
                    {sb.variancePct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Subcontract cost tracker */}
      {activeSection === "subcontract" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              Subcontract Cost Tracker
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Per resource contract sum, certified amount, paid amount, and
              balance
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Resource
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Trade
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Contract Sum
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Certified
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Paid
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Balance
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projectVendors.map((v) => {
                const certified = Math.round(v.contractSum * 0.6);
                const paid = Math.round(certified * 0.8);
                const balance = v.contractSum - paid;
                const statusBadge =
                  v.status === "Active"
                    ? "bg-green-100 text-green-700"
                    : v.status === "Awarded"
                      ? "bg-blue-100 text-blue-700"
                      : v.status === "Completed"
                        ? "bg-gray-100 text-gray-600"
                        : "bg-red-100 text-red-700";
                return (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{v.name}</p>
                        <p className="text-xs text-gray-400">
                          {v.isNominated ? "Nominated" : v.contractType}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {v.trade}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">
                      {fmtCurrency(v.contractSum)}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">
                      {fmtCurrency(certified)}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">
                      {fmtCurrency(paid)}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">
                      {fmtCurrency(balance)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge}`}
                      >
                        {v.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {projectVendors.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-sm text-gray-400"
                  >
                    No resources assigned to this project
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
