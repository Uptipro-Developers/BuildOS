import { useState, useEffect } from "react";
import { getCurrencySymbol } from "../../utils/generalSettings";
import { getPayrollPeriods, createPayrollPeriod } from "../../api/hr-extras";
import { Plus, Lock, Unlock, Clock } from "lucide-react";

type PeriodStatus = "open" | "processing" | "closed";

interface Period {
  id: string;
  name: string;
  type: "Monthly" | "Bi-Weekly";
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  employeesIncluded: number;
  totalNetPay: number;
  processedBy: string | null;
  processedAt: string | null;
}

const statusConf: Record<
  PeriodStatus,
  { label: string; badge: string; icon: React.ReactNode }
> = {
  open: {
    label: "Open",
    badge: "bg-green-100 text-green-700",
    icon: <Unlock className="w-3 h-3" />,
  },
  processing: {
    label: "Processing",
    badge: "bg-blue-100 text-blue-700",
    icon: <Clock className="w-3 h-3" />,
  },
  closed: {
    label: "Closed",
    badge: "bg-gray-100 text-gray-600",
    icon: <Lock className="w-3 h-3" />,
  },
};

const fmt = (n: number) =>
  n === 0 ? "—" : `${getCurrencySymbol()}${(n / 1_000_000).toFixed(1)}M`;

export function PayrollPeriodPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  useEffect(() => {
    getPayrollPeriods()
      .then((data) =>
        setPeriods(
          data.map((p) => ({
            id: p.id,
            name: p.name,
            type: (["Monthly", "Bi-Weekly"] as const).includes(
              p.startDate ? "Monthly" : "Monthly",
            )
              ? "Monthly"
              : "Bi-Weekly",
            startDate: p.startDate,
            endDate: p.endDate,
            status: (["open", "processing", "closed"] as const).includes(
              p.status as PeriodStatus,
            )
              ? (p.status as PeriodStatus)
              : "open",
            employeesIncluded: 0,
            totalNetPay: 0,
            processedBy: null,
            processedAt: null,
          })),
        ),
      )
      .catch(() => {});
  }, []);

  function toggleStatus(id: string) {
    setPeriods((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const next: PeriodStatus = p.status === "open" ? "closed" : "open";
        return { ...p, status: next };
      }),
    );
  }

  function addPeriod() {
    if (!newName.trim() || !newStart || !newEnd) return;
    createPayrollPeriod({
      name: newName.trim(),
      startDate: newStart,
      endDate: newEnd,
    })
      .then(() => {
        getPayrollPeriods()
          .then((data) =>
            setPeriods(
              data.map((p) => ({
                id: p.id,
                name: p.name,
                type: "Monthly" as const,
                startDate: p.startDate,
                endDate: p.endDate,
                status: (p.status as PeriodStatus) || "open",
                employeesIncluded: 0,
                totalNetPay: 0,
                processedBy: null,
                processedAt: null,
              })),
            ),
          )
          .catch(console.error);
        setShowAdd(false);
        setNewName("");
        setNewStart("");
        setNewEnd("");
      })
      .catch((err) => {
        alert("Failed to create payroll period. Please try again.");
        console.error(err);
      });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Payroll Periods
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage and track payroll processing periods
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" /> New Period
        </button>
      </div>

      {showAdd && (
        <div className="bg-white border border-indigo-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Create Payroll Period
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Period Name *
              </label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. May 2026"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                End Date *
              </label>
              <input
                type="date"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={addPeriod}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              Create
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Period
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Start
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                End
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Employees
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Net Payout
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Processed By
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="px-4 py-3 w-32" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {periods.map((p) => {
              const s = statusConf[p.status];
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {p.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {p.startDate}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {p.endDate}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {p.employeesIncluded || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {fmt(p.totalNetPay)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {p.processedBy ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.badge}`}
                    >
                      {s.icon}
                      {s.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.status !== "processing" && (
                      <button
                        onClick={() => toggleStatus(p.id)}
                        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-indigo-700 font-medium"
                      >
                        {p.status === "open" ? (
                          <>
                            <Lock className="w-3 h-3" /> Close Period
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3 h-3" /> Reopen
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
