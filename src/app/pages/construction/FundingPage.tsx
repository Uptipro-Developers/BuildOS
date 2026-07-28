import { useParams } from "react-router";
import { useMemo, useState, useEffect } from "react";
import {
  Banknote,
  Landmark,
  CircleDollarSign,
  PiggyBank,
  Wallet,
} from "lucide-react";
import {
  fundingAllocations as mockAllocations,
  fundingReleases as mockReleases,
  disbursements as mockDisbursements,
  getProjectById,
  projects,
  fmtCurrency,
  fmtDate,
} from "./mockData";
import type { ProjectFundingSummary } from "./types";
import { listFundingAllocations } from "../../api/funding-allocations";
import { listFundingReleases } from "../../api/funding-releases";
import { listDisbursements } from "../../api/disbursements";

export function FundingPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const project = projectId ? getProjectById(projectId) : null;
  const [allAllocations, setAllAllocations] = useState(mockAllocations);
  const [allReleases, setAllReleases] = useState(mockReleases);
  const [allDisbursements, setAllDisbursements] = useState(mockDisbursements);
  useEffect(() => {
    let active = true;
    listFundingAllocations(projectId)
      .then((d) => {
        if (active && d.length > 0) setAllAllocations(d);
      })
      .catch(() => {});
    listFundingReleases(projectId)
      .then((d) => {
        if (active && d.length > 0) setAllReleases(d);
      })
      .catch(() => {});
    listDisbursements(projectId)
      .then((d) => {
        if (active && d.length > 0) setAllDisbursements(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [projectId]);

  const summary: ProjectFundingSummary = useMemo(() => {
    const allocs = projectId
      ? allAllocations.filter((a) => a.projectId === projectId)
      : allAllocations;
    const rels = projectId
      ? allReleases.filter((r) => r.projectId === projectId)
      : allReleases;
    const disbs = projectId
      ? allDisbursements.filter((d) => d.projectId === projectId)
      : allDisbursements;

    const totalAllocated = allocs.reduce((s, a) => s + a.totalAllocated, 0);
    const totalReleased = rels.reduce((s, r) => s + r.amount, 0);
    const totalUtilized = disbs.reduce((s, d) => s + d.amount, 0);
    const remainingBalance = totalReleased - totalUtilized;

    return {
      totalAllocated,
      totalReleased,
      totalUtilized,
      remainingBalance,
      allocations: allocs,
      releases: rels,
    };
  }, [allAllocations, allReleases, allDisbursements, projectId]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "#E8973A", color: "white" }}
        >
          <Banknote className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Project Funding
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {project ? project.name : "All projects"} — Allocation, release, and
            utilization tracking
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Landmark className="w-4 h-4 text-blue-500" />
            <p className="text-xs text-gray-500">Total Allocated</p>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {fmtCurrency(summary.totalAllocated)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CircleDollarSign className="w-4 h-4 text-green-500" />
            <p className="text-xs text-gray-500">Total Released</p>
          </div>
          <p className="text-xl font-bold text-green-600">
            {fmtCurrency(summary.totalReleased)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-orange-500" />
            <p className="text-xs text-gray-500">Total Utilized</p>
          </div>
          <p className="text-xl font-bold" style={{ color: "#E8973A" }}>
            {fmtCurrency(summary.totalUtilized)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <PiggyBank className="w-4 h-4 text-purple-500" />
            <p className="text-xs text-gray-500">Remaining Balance</p>
          </div>
          <p
            className={`text-xl font-bold ${summary.remainingBalance >= 0 ? "text-purple-600" : "text-red-600"}`}
          >
            {fmtCurrency(summary.remainingBalance)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Funding Allocations
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {!projectId && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Project
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Reference
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Source
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {summary.allocations.map((a) => {
              const proj = projects.find((p) => p.id === a.projectId);
              return (
                <tr key={a.id} className="hover:bg-gray-50">
                  {!projectId && (
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {proj?.name || a.projectId}
                    </td>
                  )}
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {a.reference}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{a.source}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {fmtDate(a.dateAllocated)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {fmtCurrency(a.totalAllocated)}
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">
                    {a.notes}
                  </td>
                </tr>
              );
            })}
            {summary.allocations.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  No allocations recorded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Funding Releases
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {!projectId && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Project
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Reference
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Released To
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {summary.releases.map((r) => {
              const proj = projects.find((p) => p.id === r.projectId);
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  {!projectId && (
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {proj?.name || r.projectId}
                    </td>
                  )}
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {r.reference}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.releasedTo}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {fmtDate(r.dateReleased)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">
                    {fmtCurrency(r.amount)}
                  </td>
                </tr>
              );
            })}
            {summary.releases.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  No releases recorded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
