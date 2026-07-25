import { useParams, useNavigate } from "react-router";
import { useState } from "react";
import { ArrowLeft, Award, CheckCircle, XCircle, AlertTriangle, DollarSign, Users, Briefcase, Calculator, BadgeCheck } from "lucide-react";
import { vendors as allVendors, getProjectById, getTasksByProject, projects, fmtCurrency } from "./mockData";
import type { Vendor } from "./types";

const statusStyles: Record<string, { badge: string; label: string }> = {
  Awarded: { badge: "bg-blue-100 text-blue-700", label: "Awarded" },
  Active: { badge: "bg-green-100 text-green-700", label: "Active" },
  Completed: { badge: "bg-gray-100 text-gray-600", label: "Completed" },
  Terminated: { badge: "bg-red-100 text-red-700", label: "Terminated" },
};

export function GlobalResourceDetailPage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const vendor = allVendors.find(v => v.id === vendorId);

  const [skilledCount, setSkilledCount] = useState(vendor?.skilledCount ?? 0);
  const [skilledDays, setSkilledDays] = useState(vendor?.skilledDays ?? 0);
  const [skilledRate, setSkilledRate] = useState(vendor?.skilledRate ?? 0);
  const [unskilledCount, setUnskilledCount] = useState(vendor?.unskilledCount ?? 0);
  const [unskilledDays, setUnskilledDays] = useState(vendor?.unskilledDays ?? 0);
  const [unskilledRate, setUnskilledRate] = useState(vendor?.unskilledRate ?? 0);
  const [margin, setMargin] = useState(vendor?.vendorMargin ?? 30);
  const [result, setResult] = useState<{
    expectedCost: number;
    quotedCost: number;
    ratio: number;
    verdict: "within" | "slightly-over" | "significantly-over";
  } | null>(null);

  if (!vendor) {
    return (
      <div style={{ backgroundColor: "#F7F8FA" }} className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <Briefcase className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-xl font-medium">Resource not found</p>
          <p className="text-sm">The resource you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate(`/apps/construction/resources`)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: "#E8973A" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Resources
          </button>
        </div>
      </div>
    );
  }

  const associatedProjects = projects.filter(p => allVendors.some(v => v.name === vendor.name && v.projectId === p.id));

  function handleCalculate() {
    const skilledLabor = skilledCount * skilledDays * skilledRate;
    const unskilledLabor = unskilledCount * unskilledDays * unskilledRate;
    const expectedCost = (skilledLabor + unskilledLabor) * (1 + margin / 100);
    const quotedCost = vendor.contractSum;
    const ratio = quotedCost / expectedCost;
    let verdict: "within" | "slightly-over" | "significantly-over";
    if (ratio <= 1.1) verdict = "within";
    else if (ratio <= 1.25) verdict = "slightly-over";
    else verdict = "significantly-over";
    setResult({ expectedCost, quotedCost, ratio, verdict });
  }

  const verdictConfig = {
    within: {
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      label: "Within Range",
      desc: "Quoted cost is within acceptable market range",
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
    },
    "slightly-over": {
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      label: "Slightly Over",
      desc: "Quoted cost is moderately above market estimate",
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-800",
    },
    "significantly-over": {
      icon: <XCircle className="w-5 h-5 text-red-600" />,
      label: "Significantly Over",
      desc: "Quoted cost exceeds market estimate by a wide margin",
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
    },
  };

  const certifiedPct = 0.85;
  const paidPct = 0.75;
  const certified = vendor.contractSum * certifiedPct;
  const paid = vendor.contractSum * paidPct;
  const balance = vendor.contractSum - paid;

  const instances = allVendors.filter(v => v.name === vendor.name);

  return (
    <div style={{ backgroundColor: "#F7F8FA" }} className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/apps/construction/resources`)}
            className="w-9 h-9 rounded-lg flex items-center justify-center border"
            style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}
          >
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{vendor.name}</h1>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusStyles[vendor.status]?.badge}`}>
                {statusStyles[vendor.status]?.label}
              </span>
              {vendor.isNominated && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                  Nominated by HAUZ
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{vendor.trade}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border p-5" style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}>
            <h2 className="text-base font-bold text-gray-900 mb-4">Resource Information</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Trade</p>
                <p className="text-sm font-medium text-gray-900">{vendor.trade}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Contract Type</p>
                <p className="text-sm font-medium text-gray-900">{vendor.contractType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Block / Section Assignment</p>
                <p className="text-sm font-medium text-gray-900">{vendor.blockAssignment || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Contract Sum</p>
                <p className="text-sm font-semibold" style={{ color: "#E8973A" }}>{fmtCurrency(vendor.contractSum)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Skilled Workers</p>
                <p className="text-sm font-medium text-gray-900">{vendor.skilledCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Unskilled Workers</p>
                <p className="text-sm font-medium text-gray-900">{vendor.unskilledCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Man-days Estimate</p>
                <p className="text-sm font-medium text-gray-900">{vendor.mandaysEstimate.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Status</p>
                <p className="text-sm font-medium text-gray-900">{vendor.status}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Resource Margin</p>
                <p className="text-sm font-medium text-gray-900">{vendor.vendorMargin ?? 30}%</p>
              </div>
            </div>
          </div>

          {associatedProjects.length > 0 && (
            <div className="rounded-xl border p-5" style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}>
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-4 h-4" style={{ color: "#E8973A" }} />
                <h2 className="text-base font-bold text-gray-900">Project Assignments</h2>
              </div>
              <div className="space-y-2">
                {associatedProjects.map(p => {
                  const inst = allVendors.find(v => v.projectId === p.id && v.name === vendor.name);
                  const wpCount = inst?.assignedWorkPackages.length ?? 0;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-4 py-3 rounded-lg text-sm cursor-pointer hover:bg-gray-50"
                      style={{ backgroundColor: "#F7F8FA" }}
                      onClick={() => navigate(`/apps/construction/projects/${p.id}/resources`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#E8973A" }} />
                        <span className="font-medium text-gray-900">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-400 text-xs">{wpCount} work packages</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${inst ? statusStyles[inst.status]?.badge : ""}`}>
                          {inst?.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(() => {
            const allWPs = instances.flatMap(v => {
              const proj = getProjectById(v.projectId);
              return v.assignedWorkPackages.map(wpId => {
                const ts = getTasksByProject(v.projectId);
                const wp = ts.find(t => t.id === wpId);
                return { wp, project: proj?.name || v.projectId };
              });
            }).filter(x => x.wp);
            if (allWPs.length === 0) return null;
            return (
              <div className="rounded-xl border p-5" style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="w-4 h-4" style={{ color: "#E8973A" }} />
                  <h2 className="text-base font-bold text-gray-900">Assigned Work Packages</h2>
                </div>
                <div className="space-y-2">
                  {allWPs.map(({ wp, project }, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-4 py-3 rounded-lg text-sm"
                      style={{ backgroundColor: "#F7F8FA" }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#E8973A" }} />
                        <span className="font-medium text-gray-900">{wp!.name}</span>
                        <span className="text-gray-400 text-xs">{project}</span>
                      </div>
                      <span className="text-gray-400 text-xs">{wp!.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border p-5" style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}>
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-4 h-4" style={{ color: "#E8973A" }} />
              <h2 className="text-base font-bold text-gray-900">Rate Benchmarking</h2>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Skilled Labour</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Workers</label>
                  <input
                    type="number" value={skilledCount}
                    onChange={e => setSkilledCount(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg border text-sm"
                    style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Days</label>
                  <input
                    type="number" value={skilledDays}
                    onChange={e => setSkilledDays(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg border text-sm"
                    style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Rate (₦/day)</label>
                  <input
                    type="number" value={skilledRate}
                    onChange={e => setSkilledRate(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg border text-sm"
                    style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
                  />
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Unskilled Labour</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Workers</label>
                  <input
                    type="number" value={unskilledCount}
                    onChange={e => setUnskilledCount(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg border text-sm"
                    style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Days</label>
                  <input
                    type="number" value={unskilledDays}
                    onChange={e => setUnskilledDays(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg border text-sm"
                    style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Rate (₦/day)</label>
                  <input
                    type="number" value={unskilledRate}
                    onChange={e => setUnskilledRate(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg border text-sm"
                    style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Resource Margin (%)</label>
                <input
                  type="number" value={margin}
                  onChange={e => setMargin(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-lg border text-sm"
                  style={{ borderColor: "#E2E8F0", backgroundColor: "#F7F8FA" }}
                />
              </div>
              <button
                onClick={handleCalculate}
                className="w-full py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: "#E8973A" }}
              >
                Calculate
              </button>
            </div>

            {result && (
              <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: "#E2E8F0" }}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Expected Cost</span>
                  <span className="font-semibold text-gray-900">{fmtCurrency(Math.round(result.expectedCost))}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Quoted Cost</span>
                  <span className="font-semibold text-gray-900">{fmtCurrency(result.quotedCost)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Ratio (Quoted / Expected)</span>
                  <span className="font-medium text-gray-900">{(result.ratio * 100).toFixed(1)}%</span>
                </div>
                <div
                  className={`mt-3 p-3 rounded-lg border ${verdictConfig[result.verdict].bg} ${verdictConfig[result.verdict].border}`}
                >
                  <div className="flex items-center gap-2">
                    {verdictConfig[result.verdict].icon}
                    <div>
                      <p className={`text-sm font-semibold ${verdictConfig[result.verdict].text}`}>
                        {verdictConfig[result.verdict].label}
                      </p>
                      <p className={`text-xs ${verdictConfig[result.verdict].text} opacity-75`}>
                        {verdictConfig[result.verdict].desc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border p-5" style={{ borderColor: "#E2E8F0", backgroundColor: "white" }}>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4" style={{ color: "#E8973A" }} />
              <h2 className="text-base font-bold text-gray-900">Contract Summary</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Contract Sum (Budget)</span>
                <span className="font-semibold text-gray-900">{fmtCurrency(vendor.contractSum)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Certified to Date</span>
                <span className="font-medium text-blue-600">{fmtCurrency(Math.round(certified))}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Paid to Date</span>
                <span className="font-medium text-green-600">{fmtCurrency(Math.round(paid))}</span>
              </div>
              <div className="pt-3 border-t flex items-center justify-between text-sm" style={{ borderColor: "#E2E8F0" }}>
                <span className="font-medium text-gray-700">Outstanding Balance</span>
                <span className="font-bold" style={{ color: "#E8973A" }}>{fmtCurrency(Math.round(balance))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
