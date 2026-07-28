import { useState, useEffect } from "react";
import { Download, FileText, Search } from "lucide-react";
import { getPayslips } from "../../api/hr-extras";
import {
  formatCurrencyByGeneralSettings,
  formatDateByGeneralSettings,
} from "../../utils/generalSettings";

interface Payslip {
  id: string;
  period: string;
  grossPay: number;
  deductions: number;
  netPay: number;
  status: "Paid" | "Pending";
  paidOn: string;
}

function fmt(n: number) {
  return formatCurrencyByGeneralSettings(n, { minimumFractionDigits: 0 });
}

export function PayslipHistoryPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Payslip | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);

  useEffect(() => {
    getPayslips()
      .then((data) =>
        setPayslips(
          data.map((p) => ({
            id: p.id,
            period: p.period,
            grossPay: p.grossPay,
            deductions: p.deductions,
            netPay: p.netPay,
            status: (p.status === "Paid"
              ? "Paid"
              : "Pending") as Payslip["status"],
            paidOn: p.issuedAt ? formatDateByGeneralSettings(p.issuedAt) : "",
          })),
        ),
      )
      .catch(console.error);
  }, []);

  const sortedSlips = [...payslips].sort((a, b) =>
    b.paidOn.localeCompare(a.paidOn),
  );
  const latestNetPay = sortedSlips[0]?.netPay ?? 0;
  const latestPeriod = sortedSlips[0]?.period ?? "—";
  const thisYear = new Date().getFullYear().toString();
  const ytdSlips = payslips.filter(
    (p) => p.paidOn.includes(thisYear) || p.period.includes(thisYear),
  );
  const ytdGross = ytdSlips.reduce((s, p) => s + p.grossPay, 0);
  const ytdNet = ytdSlips.reduce((s, p) => s + p.netPay, 0);
  const ytdRange = ytdSlips.length
    ? `${ytdSlips[ytdSlips.length - 1]?.period ?? ""} – ${ytdSlips[0]?.period ?? ""}`
    : thisYear;

  const filtered = payslips.filter(
    (p) =>
      p.period.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Payslip History
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          View and download your monthly payslips
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Latest Net Pay",
            value: fmt(latestNetPay),
            sub: latestPeriod,
          },
          { label: "YTD Gross", value: fmt(ytdGross), sub: ytdRange },
          { label: "YTD Net Pay", value: fmt(ytdNet), sub: ytdRange },
        ].map((c) => (
          <div
            key={c.label}
            className="bg-white border border-gray-200 rounded-xl p-4"
          >
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className="text-xl font-semibold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Search + table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            className="flex-1 text-sm outline-none placeholder:text-gray-400"
            placeholder="Search by period or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              {[
                "Payslip ID",
                "Period",
                "Gross Pay",
                "Deductions",
                "Net Pay",
                "Status",
                "Paid On",
                "",
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">
                  {p.id}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {p.period}
                </td>
                <td className="px-4 py-3 text-gray-700">{fmt(p.grossPay)}</td>
                <td className="px-4 py-3 text-red-600">-{fmt(p.deductions)}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">
                  {fmt(p.netPay)}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{p.paidOn}</td>
                <td className="px-4 py-3 flex items-center gap-2">
                  <button
                    onClick={() => setSelected(p)}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-teal-600"
                    title="View details"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-teal-600"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="bg-teal-600 rounded-t-2xl px-6 py-5 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-teal-100">Payslip</p>
                  <p className="text-xl font-bold mt-0.5">{selected.period}</p>
                  <p className="text-xs text-teal-200 mt-1">
                    {selected.id} · Paid {selected.paidOn}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-white/70 hover:text-white text-lg leading-none"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Employee</span>
                <span className="font-medium">James Okafor</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Employee ID</span>
                <span className="font-medium">EMP-0024</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Department</span>
                <span className="font-medium">Engineering</span>
              </div>
              <hr className="border-gray-100" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Basic Salary</span>
                <span>{fmt(Math.round(selected.grossPay * 0.7))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Housing Allowance</span>
                <span>{fmt(Math.round(selected.grossPay * 0.2))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Transport Allowance</span>
                <span>{fmt(Math.round(selected.grossPay * 0.1))}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>Gross Pay</span>
                <span>{fmt(selected.grossPay)}</span>
              </div>
              <hr className="border-gray-100" />
              <div className="flex justify-between text-sm text-red-600">
                <span>Total Deductions (Tax + Pension)</span>
                <span>-{fmt(selected.deductions)}</span>
              </div>
              <hr className="border-gray-100" />
              <div className="flex justify-between text-base font-semibold">
                <span>Net Pay</span>
                <span className="text-teal-700">{fmt(selected.netPay)}</span>
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Close
              </button>
              <button className="px-4 py-2 text-sm bg-teal-600 text-white rounded-xl hover:bg-teal-700 flex items-center gap-2">
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
