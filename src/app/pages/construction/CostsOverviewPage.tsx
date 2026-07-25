import { useNavigate } from "react-router";
import { DollarSign, TrendingUp, TrendingDown, BarChart3, ChevronRight, FileSpreadsheet, Search, Download } from "lucide-react";
import { useState } from "react";
import { projects, fmtCurrency } from "./mockData";
import { exportCSV } from "../../utils/exportCSV";

export function CostsOverviewPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const avgUtil = projects.length > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const onBudget = projects.filter(p => p.spent <= p.budget).length;

  const stats = [
    { icon: DollarSign, label: "Total Budget", value: fmtCurrency(totalBudget) },
    { icon: TrendingUp, label: "Total Spent", value: fmtCurrency(totalSpent), color: "#E74C3C" },
    { icon: BarChart3, label: "Avg Utilisation", value: `${avgUtil}%`, color: "#E8973A" },
    { icon: FileSpreadsheet, label: "On Budget count", value: onBudget, color: "#27AE60" },
  ];

  const projectCosts = projects.map(p => ({
    ...p,
    utilisation: p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0,
    variance: p.budget - p.spent,
  }));

  const filtered = projectCosts.filter(pc =>
    pc.name.toLowerCase().includes(search.toLowerCase()) ||
    pc.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ backgroundColor: "#F7F8FA" }} className="min-h-screen p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#1A202C" }}>Costs Overview</h1>
        <p className="text-sm mt-1" style={{ color: "#718096" }}>Cost summary across all projects</p>
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

      <div className="bg-white rounded-lg overflow-hidden" style={{ border: "1px solid #E2E8F0" }}>
        <div className="flex items-center gap-3 p-4 pb-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#718096" }} />
            <input
              type="text" placeholder="Search projects..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg outline-none"
              style={{ border: "1px solid #E2E8F0", color: "#1A202C" }}
            />
          </div>
          <button
            onClick={() => {
              const rows = filtered.map(pc => [pc.name, fmtCurrency(pc.budget), fmtCurrency(pc.spent), `${pc.utilisation}%`, pc.variance < 0 ? `-${fmtCurrency(Math.abs(pc.variance))}` : `+${fmtCurrency(pc.variance)}`]);
              exportCSV("costs", ["Project", "Budget", "Spent", "Utilisation", "Variance"], rows);
            }}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-600 rounded-md text-sm font-medium hover:bg-gray-50"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#F7F8FA", borderBottom: "1px solid #E2E8F0" }}>
                <th className="text-left px-4 py-3 font-medium" style={{ color: "#718096" }}>Project</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: "#718096" }}>Budget</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: "#718096" }}>Spent</th>
                <th className="text-center px-4 py-3 font-medium" style={{ color: "#718096" }}>Utilisation</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: "#718096" }}>Variance</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: "#718096" }}>Progress</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((pc, i) => {
                const isOver = pc.variance < 0;
                const pct = Math.min(pc.utilisation, 100);
                return (
                  <tr
                    key={pc.id}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ borderBottom: i < filtered.length - 1 ? "1px solid #E2E8F0" : "none" }}
                    onClick={() => navigate(`/apps/construction/projects/${pc.id}/costs`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: "#1A202C" }}>{pc.name}</p>
                      <p className="text-xs" style={{ color: "#718096" }}>{pc.id}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium" style={{ color: "#1A202C" }}>{fmtCurrency(pc.budget)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "#718096" }}>{fmtCurrency(pc.spent)}</td>
                    <td className="px-4 py-3 text-center font-medium" style={{ color: pc.utilisation > 90 ? "#E74C3C" : "#1A202C" }}>
                      {pc.utilisation}%
                    </td>
                    <td className="px-4 py-3 text-right font-medium" style={{ color: isOver ? "#E74C3C" : "#27AE60" }}>
                      {isOver ? "-" : "+"}{fmtCurrency(Math.abs(pc.variance))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: "#E2E8F0" }}>
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: pc.utilisation > 90 ? "#E74C3C" : pc.utilisation > 75 ? "#F4A623" : "#27AE60",
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium w-10 text-right" style={{ color: "#718096" }}>{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><ChevronRight className="w-4 h-4" style={{ color: "#718096" }} /></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-sm" style={{ color: "#718096" }}>No costs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
