import { useState } from "react";
import { Search, Download, Filter } from "lucide-react";

interface EmployeeBalance {
  id: string;
  name: string;
  department: string;
  employeeId: string;
  annual:    { total: number; used: number };
  sick:      { total: number; used: number };
  emergency: { total: number; used: number };
  study:     { total: number; used: number };
}

const BALANCES: EmployeeBalance[] = [
  { id: "e1", name: "Chukwudi Eze",   department: "Engineering",    employeeId: "EMP-001", annual: { total: 21, used: 6  }, sick: { total: 10, used: 2 }, emergency: { total: 3, used: 0 }, study: { total: 5, used: 0 } },
  { id: "e2", name: "Aisha Bello",    department: "Operations",     employeeId: "EMP-002", annual: { total: 21, used: 14 }, sick: { total: 10, used: 3 }, emergency: { total: 3, used: 1 }, study: { total: 5, used: 0 } },
  { id: "e3", name: "Robert Lee",     department: "Engineering",    employeeId: "EMP-003", annual: { total: 21, used: 0  }, sick: { total: 10, used: 0 }, emergency: { total: 3, used: 0 }, study: { total: 5, used: 0 } },
  { id: "e4", name: "Sarah Johnson",  department: "Finance",        employeeId: "EMP-004", annual: { total: 21, used: 7  }, sick: { total: 10, used: 5 }, emergency: { total: 3, used: 0 }, study: { total: 5, used: 5 } },
  { id: "e5", name: "Mike Davis",     department: "Engineering",    employeeId: "EMP-005", annual: { total: 21, used: 3  }, sick: { total: 10, used: 1 }, emergency: { total: 3, used: 1 }, study: { total: 5, used: 0 } },
  { id: "e6", name: "Alice Ware",     department: "Human Resources",employeeId: "EMP-006", annual: { total: 21, used: 21 }, sick: { total: 10, used: 0 }, emergency: { total: 3, used: 0 }, study: { total: 5, used: 0 } },
  { id: "e7", name: "Tom Fox",        department: "Procurement",    employeeId: "EMP-007", annual: { total: 21, used: 9  }, sick: { total: 10, used: 4 }, emergency: { total: 3, used: 3 }, study: { total: 5, used: 0 } },
  { id: "e8", name: "Ngozi Eze",      department: "Engineering",    employeeId: "EMP-008", annual: { total: 21, used: 2  }, sick: { total: 10, used: 0 }, emergency: { total: 3, used: 0 }, study: { total: 5, used: 0 } },
  { id: "e9", name: "Fatima Aliyu",   department: "Engineering",    employeeId: "EMP-009", annual: { total: 21, used: 0  }, sick: { total: 10, used: 0 }, emergency: { total: 3, used: 0 }, study: { total: 5, used: 0 } },
  { id: "e10",name: "Funke Adeyemi",  department: "Finance",        employeeId: "EMP-010", annual: { total: 21, used: 5  }, sick: { total: 10, used: 2 }, emergency: { total: 3, used: 0 }, study: { total: 5, used: 0 } },
];

const DEPTS = ["All", "Engineering", "Operations", "Finance", "Human Resources", "Procurement", "Health & Safety"];

interface BalanceCellProps { total: number; used: number; }

function BalanceCell({ total, used }: BalanceCellProps) {
  const remaining = total - used;
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const barColor = pct >= 100 ? "bg-red-500" : pct > 70 ? "bg-amber-400" : "bg-green-400";
  return (
    <td className="px-4 py-3">
      <div className="text-sm font-semibold text-gray-900">
        {remaining}<span className="text-xs font-normal text-gray-400">/{total}</span>
      </div>
      <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
        <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className="text-xs text-gray-400 mt-0.5">{used} used</div>
    </td>
  );
}

export function LeaveBalancesPage() {
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("All");

  const displayed = BALANCES.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.employeeId.includes(search)) return false;
    if (dept !== "All" && e.department !== dept) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Leave Balances</h1>
          <p className="text-sm text-gray-500 mt-0.5">Employee leave entitlements — 2026 leave year</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees…" className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select value={dept} onChange={e => setDept(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            {DEPTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-blue-600 uppercase tracking-wide bg-blue-50/50">Annual Leave</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-red-600 uppercase tracking-wide bg-red-50/50">Sick Leave</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-orange-600 uppercase tracking-wide bg-orange-50/50">Emergency</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-amber-600 uppercase tracking-wide bg-amber-50/50">Study Leave</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {e.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{e.name}</p>
                      <p className="text-xs text-gray-400">{e.employeeId} · {e.department}</p>
                    </div>
                  </div>
                </td>
                <BalanceCell {...e.annual} />
                <BalanceCell {...e.sick} />
                <BalanceCell {...e.emergency} />
                <BalanceCell {...e.study} />
              </tr>
            ))}
          </tbody>
        </table>
        {displayed.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No employees match the current filters</div>
        )}
      </div>
    </div>
  );
}
