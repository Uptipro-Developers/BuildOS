import { useState, useEffect } from "react";
import { Search, Filter, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { getTransactions, Transaction } from "../../api/finance-extras";
import {
  formatDateByGeneralSettings,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTransactions()
      .then(setTransactions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const income = transactions
    .filter((t) => t.type === "Income")
    .reduce((s, t) => s + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === "Expense")
    .reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  const currency = transactions[0]?.currency ?? "";
  const fmt = (n: number) =>
    `${formatNumberByGeneralSettings(n)}${currency ? " " + currency : ""}`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900">Transactions</h1>
        <p className="text-sm text-gray-600 mt-1">
          View all financial transactions
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Total Income</p>
          <p className="text-3xl text-green-600">{fmt(income)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
          <p className="text-3xl text-red-600">{fmt(expense)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Net Balance</p>
          <p className="text-3xl text-gray-900">{fmt(net)}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading…</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs text-gray-600">
                  Type
                </th>
                <th className="text-left px-6 py-3 text-xs text-gray-600">
                  Description
                </th>
                <th className="text-left px-6 py-3 text-xs text-gray-600">
                  Category
                </th>
                <th className="text-left px-6 py-3 text-xs text-gray-600">
                  Date
                </th>
                <th className="text-right px-6 py-3 text-xs text-gray-600">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {t.type === "Income" ? (
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <ArrowDownLeft className="w-4 h-4 text-green-600" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <ArrowUpRight className="w-4 h-4 text-red-600" />
                        </div>
                      )}
                      <span className="text-sm text-gray-900">{t.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {t.description}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {t.category}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {formatDateByGeneralSettings(t.date)}
                  </td>
                  <td
                    className={`px-6 py-4 text-right text-sm ${t.type === "Income" ? "text-green-600" : "text-red-600"}`}
                  >
                    {t.type === "Income" ? "+" : "-"}
                    {formatNumberByGeneralSettings(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
