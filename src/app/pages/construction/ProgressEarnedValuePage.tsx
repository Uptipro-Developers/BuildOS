import { useParams } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { getCurrencySymbol } from "../../utils/generalSettings";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Target,
  Clock,
} from "lucide-react";
import {
  getProjectById,
  getTasksByProject,
  fmtCurrency,
  fmtDate,
  earnedValueHistory as mockEvHistory,
} from "./mockData";
import { listEarnedValueRecords } from "../../api/earned-value-records";
import { calcEarnedValue } from "./types";

export function ProgressEarnedValuePage() {
  const { id } = useParams<{ id: string }>();
  const project = getProjectById(id ?? "");
  const projectTasks = useMemo(() => getTasksByProject(id ?? ""), [id]);
  const [earnedValueHistory, setEarnedValueHistory] = useState(mockEvHistory);

  useEffect(() => {
    listEarnedValueRecords(id ?? undefined)
      .then((data) => {
        if (data.length > 0)
          setEarnedValueHistory(data as typeof mockEvHistory);
      })
      .catch(() => {});
  }, [id]);

  const ev = useMemo(() => {
    if (!project || projectTasks.length === 0) return null;
    return calcEarnedValue(projectTasks, project.budget, project.spent);
  }, [project, projectTasks]);

  const stages = useMemo(
    () => projectTasks.filter((t) => t.level === 1),
    [projectTasks],
  );

  const stageBreakdown = useMemo(() => {
    if (!project || stages.length === 0 || projectTasks.length === 0) return [];
    return stages.map((st) => {
      const stageTasks = projectTasks.filter(
        (t) =>
          t.id === st.id ||
          t.parentTaskId === st.id ||
          projectTasks.some(
            (p) => p.id === t.parentTaskId && p.parentTaskId === st.id,
          ) ||
          projectTasks.some(
            (p) =>
              p.parentTaskId ===
                (projectTasks.find((x) => x.id === t.parentTaskId)
                  ?.parentTaskId ?? "") && p.parentTaskId !== null,
          ),
      );
      const l4 = stageTasks.filter((t) => t.level === 4);
      const totalDuration =
        stages.reduce((s, x) => s + x.plannedDuration, 0) || 1;
      const stageBudget = Math.round(
        project.budget * (st.plannedDuration / totalDuration),
      );
      const evStage =
        l4.length > 0
          ? l4.reduce(
              (s, t) =>
                s + (t.percentComplete / 100) * (stageBudget / l4.length),
              0,
            )
          : 0;
      const pvStage = Math.round(stageBudget * (st.percentComplete / 100));
      const svStage = evStage - pvStage;
      const spiStage = pvStage > 0 ? evStage / pvStage : 0;
      const acStage = Math.round(
        project.spent *
          (st.plannedDuration / totalDuration) *
          (st.percentComplete / 100),
      );
      const cpiStage = acStage > 0 ? evStage / acStage : 0;
      return {
        stage: st,
        budget: stageBudget,
        ev: Math.round(evStage),
        pv: pvStage,
        sv: Math.round(svStage),
        spi: Math.round(spiStage * 100) / 100,
        cpi: Math.round(cpiStage * 100) / 100,
      };
    });
  }, [project, stages, projectTasks]);

  const historyMax = useMemo(() => {
    if (earnedValueHistory.length === 0) return 1;
    return Math.max(
      ...earnedValueHistory.flatMap((h) => [
        h.plannedValue,
        h.earnedValue,
        h.actualCost,
      ]),
      1,
    );
  }, [earnedValueHistory]);

  const projectedCompletion = useMemo(() => {
    if (!project || !ev) return null;
    if (!ev.spi || ev.spi <= 0) return project.plannedEndDate;
    const plannedStart = new Date(project.plannedStartDate);
    const actualElapsed =
      (new Date().getTime() - plannedStart.getTime()) / 86400000;
    const effectiveDays = actualElapsed / ev.spi;
    const projectedDate = new Date(
      plannedStart.getTime() + effectiveDays * 86400000,
    );
    return projectedDate.toISOString().split("T")[0];
  }, [project, ev]);

  if (!id) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-500">Project ID is missing.</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-500">Project not found.</p>
      </div>
    );
  }

  if (!ev) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-500">No earned value data available.</p>
      </div>
    );
  }

  const svPositive = ev.sv >= 0;
  const vacPositive = ev.vac >= 0;
  const spiHealthy = ev.spi >= 1;
  const cpiHealthy = ev.cpi >= 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Earned Value Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {project.name} — Progress & Performance
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4 text-orange-500" />
          <span>
            As of{" "}
            <strong className="text-gray-900">
              {fmtDate(new Date().toISOString().split("T")[0])}
            </strong>
          </span>
        </div>
      </div>

      {/* Summary KPI Cards — 4 across */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-orange-600 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Planned Value (PV)
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {fmtCurrency(ev.pv)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Earned Value (EV)
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {fmtCurrency(ev.ev)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Actual Cost (AC)
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {fmtCurrency(ev.ac)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            {svPositive ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Schedule Variance (SV)
            </span>
          </div>
          <p
            className={`text-xl font-bold ${svPositive ? "text-green-600" : "text-red-600"}`}
          >
            {svPositive ? "+" : ""}
            {fmtCurrency(ev.sv)}
          </p>
        </div>
      </div>

      {/* Performance Index Cards — 4 across */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Target className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              SPI
            </span>
          </div>
          <p
            className={`text-xl font-bold ${spiHealthy ? "text-green-600" : "text-red-600"}`}
          >
            {ev.spi.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {spiHealthy ? "Ahead of Schedule" : "Behind Schedule"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Target className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              CPI
            </span>
          </div>
          <p
            className={`text-xl font-bold ${cpiHealthy ? "text-green-600" : "text-red-600"}`}
          >
            {ev.cpi.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {cpiHealthy ? "Under Budget" : "Over Budget"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              EAC
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {fmtCurrency(ev.eac)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Estimate at Completion</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            {vacPositive ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
              VAC
            </span>
          </div>
          <p
            className={`text-xl font-bold ${vacPositive ? "text-green-600" : "text-red-600"}`}
          >
            {vacPositive ? "+" : ""}
            {fmtCurrency(ev.vac)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Variance at Completion</p>
        </div>
      </div>

      {/* S-Curve Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            S-Curve — PV, EV, AC Over Time
          </h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: "#E8973A" }}
              />
              <span className="text-gray-500">PV</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: "#3B82F6" }}
              />
              <span className="text-gray-500">EV</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: "#EF4444" }}
              />
              <span className="text-gray-500">AC</span>
            </div>
          </div>
        </div>
        <div className="relative" style={{ height: 220 }}>
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-6 w-14 flex flex-col justify-between text-[10px] text-gray-400">
            <span>{fmtCurrency(historyMax)}</span>
            <span>{fmtCurrency(Math.round(historyMax * 0.75))}</span>
            <span>{fmtCurrency(Math.round(historyMax * 0.5))}</span>
            <span>{fmtCurrency(Math.round(historyMax * 0.25))}</span>
            <span>{fmtCurrency(0)}</span>
          </div>
          {/* Bars area */}
          <div
            className="ml-16 h-full flex items-end gap-1.5"
            style={{ height: 194 }}
          >
            {earnedValueHistory.map((h) => {
              const pvH = (h.plannedValue / historyMax) * 170;
              const evH = (h.earnedValue / historyMax) * 170;
              const acH = (h.actualCost / historyMax) * 170;
              return (
                <div
                  key={h.period}
                  className="flex-1 flex flex-col items-center justify-end h-full gap-0.5"
                >
                  <div
                    className="w-full flex justify-center gap-0.5 items-end"
                    style={{ height: 170 }}
                  >
                    <div
                      className="w-2.5 rounded-t-sm"
                      style={{
                        height: Math.max(2, pvH),
                        backgroundColor: "#E8973A",
                      }}
                      title={`PV: ${fmtCurrency(h.plannedValue)}`}
                    />
                    <div
                      className="w-2.5 rounded-t-sm"
                      style={{
                        height: Math.max(2, evH),
                        backgroundColor: "#3B82F6",
                      }}
                      title={`EV: ${fmtCurrency(h.earnedValue)}`}
                    />
                    <div
                      className="w-2.5 rounded-t-sm"
                      style={{
                        height: Math.max(2, acH),
                        backgroundColor: "#EF4444",
                      }}
                      title={`AC: ${fmtCurrency(h.actualCost)}`}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 text-center leading-tight mt-1">
                    {h.period.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Performance Breakdown by Stage */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">
            Performance Breakdown by Stage
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
                EV ({getCurrencySymbol()})
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                PV ({getCurrencySymbol()})
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                SV ({getCurrencySymbol()})
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                SPI
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                CPI
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stageBreakdown.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-8 text-center text-sm text-gray-400"
                >
                  No stage data available
                </td>
              </tr>
            )}
            {stageBreakdown.map((sb) => (
              <tr key={sb.stage.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">
                  {sb.stage.name}
                </td>
                <td className="px-5 py-3 text-right text-gray-900">
                  {fmtCurrency(sb.budget)}
                </td>
                <td className="px-5 py-3 text-right text-blue-600 font-medium">
                  {fmtCurrency(sb.ev)}
                </td>
                <td
                  className="px-5 py-3 text-right"
                  style={{ color: "#E8973A" }}
                >
                  {fmtCurrency(sb.pv)}
                </td>
                <td
                  className={`px-5 py-3 text-right font-medium ${sb.sv >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {sb.sv >= 0 ? "+" : ""}
                  {fmtCurrency(Math.abs(sb.sv))}
                </td>
                <td
                  className={`px-5 py-3 text-right font-medium ${sb.spi >= 1 ? "text-green-600" : "text-red-600"}`}
                >
                  {sb.spi.toFixed(2)}
                </td>
                <td
                  className={`px-5 py-3 text-right font-medium ${sb.cpi >= 1 ? "text-green-600" : "text-red-600"}`}
                >
                  {sb.cpi.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Forecast Section */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-3">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Estimated Completion Date
            </span>
          </div>
          <p className="text-lg font-bold text-gray-900">
            {projectedCompletion ? fmtDate(projectedCompletion) : "N/A"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Original: {fmtDate(project.plannedEndDate)}
            {projectedCompletion &&
              (projectedCompletion > project.plannedEndDate ? (
                <span className="text-red-500 ml-1">(Delayed)</span>
              ) : (
                <span className="text-green-500 ml-1">(Ahead)</span>
              ))}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-purple-600 mb-3">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Estimated Final Cost (EAC)
            </span>
          </div>
          <p className="text-lg font-bold text-gray-900">
            {fmtCurrency(ev.eac)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            vs Budget: {fmtCurrency(project.budget)}
            <span
              className={
                ev.eac > project.budget
                  ? " text-red-500 ml-1"
                  : " text-green-500 ml-1"
              }
            >
              ({ev.eac > project.budget ? "+" : ""}
              {fmtCurrency(ev.eac - project.budget)})
            </span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            {vacPositive ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Variance at Completion (VAC)
            </span>
          </div>
          <p
            className={`text-lg font-bold ${vacPositive ? "text-green-600" : "text-red-600"}`}
          >
            {vacPositive ? "+" : ""}
            {fmtCurrency(ev.vac)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {vacPositive ? "Under budget by" : "Over budget by"}{" "}
            {fmtCurrency(Math.abs(ev.vac))}
          </p>
        </div>
      </div>
    </div>
  );
}
