import { Search, Filter, ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface Transaction {
  id: string;
  description: string;
  type: "Income" | "Expense";
  amount: string;
  project: string;
  date: string;
  category: string;
}

const mockTransactions: Transaction[] = [
  {
    id: "1",
    description: "Project Payment - Milestone 1",
    type: "Income",
    amount: "$125,000",
    project: "Downtown Office Complex",
    date: "2026-04-05",
    category: "Revenue",
  },
  {
    id: "2",
    description: "Equipment Purchase",
    type: "Expense",
    amount: "$8,500",
    project: "Riverside Residential",
    date: "2026-04-04",
    category: "Equipment",
  },
  {
    id: "3",
    description: "Supplier Payment",
    type: "Expense",
    amount: "$15,200",
    project: "Shopping Mall Renovation",
    date: "2026-04-03",
    category: "Materials",
  },
  {
    id: "4",
    description: "Project Payment - Milestone 2",
    type: "Income",
    amount: "$85,000",
    project: "Industrial Warehouse",
    date: "2026-04-02",
    category: "Revenue",
  },
];

export function TransactionsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900">Transactions</h1>
        <p className="text-sm text-gray-600 mt-1">View all financial transactions</p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Total Income</p>
          <p className="text-3xl text-green-600">$210,000</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
          <p className="text-3xl text-red-600">$23,700</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Net Balance</p>
          <p className="text-3xl text-gray-900">$186,300</p>
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
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs text-gray-600">Type</th>
              <th className="text-left px-6 py-3 text-xs text-gray-600">Description</th>
              <th className="text-left px-6 py-3 text-xs text-gray-600">Project</th>
              <th className="text-left px-6 py-3 text-xs text-gray-600">Category</th>
              <th className="text-left px-6 py-3 text-xs text-gray-600">Date</th>
              <th className="text-right px-6 py-3 text-xs text-gray-600">Amount</th>
            </tr>
          </thead>
          <tbody>
            {mockTransactions.map((transaction) => (
              <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {transaction.type === "Income" ? (
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <ArrowDownLeft className="w-4 h-4 text-green-600" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <ArrowUpRight className="w-4 h-4 text-red-600" />
                      </div>
                    )}
                    <span className="text-sm text-gray-900">{transaction.type}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-900">{transaction.description}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">{transaction.project}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">{transaction.category}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">
                    {new Date(transaction.date).toLocaleDateString()}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span
                    className={`text-sm ${
                      transaction.type === "Income" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {transaction.type === "Income" ? "+" : "-"}
                    {transaction.amount}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
