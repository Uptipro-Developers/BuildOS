import { useState } from "react";
import { Search, Filter, Plus } from "lucide-react";

interface Expense {
  id: string;
  description: string;
  project: string;
  category: string;
  amount: string;
  submittedBy: string;
  date: string;
  status: "Pending" | "Approved" | "Rejected";
}

const mockExpenses: Expense[] = [
  {
    id: "1",
    description: "Equipment Rental - Excavator",
    project: "Downtown Office Complex",
    category: "Equipment",
    amount: "$2,400",
    submittedBy: "Mike Wilson",
    date: "2026-04-05",
    status: "Pending",
  },
  {
    id: "2",
    description: "Construction Materials",
    project: "Riverside Residential",
    category: "Materials",
    amount: "$8,500",
    submittedBy: "Sarah Johnson",
    date: "2026-04-04",
    status: "Approved",
  },
  {
    id: "3",
    description: "Labor Overtime",
    project: "Shopping Mall Renovation",
    category: "Labor",
    amount: "$3,200",
    submittedBy: "Emily Chen",
    date: "2026-04-03",
    status: "Approved",
  },
  {
    id: "4",
    description: "Site Safety Equipment",
    project: "Industrial Warehouse",
    category: "Safety",
    amount: "$1,850",
    submittedBy: "Tom Anderson",
    date: "2026-04-02",
    status: "Pending",
  },
];

const statusColors = {
  Pending: "bg-yellow-100 text-yellow-800",
  Approved: "bg-green-100 text-green-800",
  Rejected: "bg-red-100 text-red-800",
};

export function ExpensesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const filteredExpenses = mockExpenses.filter((expense) =>
    expense.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPending = mockExpenses
    .filter((e) => e.status === "Pending")
    .reduce((sum, e) => sum + parseFloat(e.amount.replace(/[$,]/g, "")), 0);

  const totalApproved = mockExpenses
    .filter((e) => e.status === "Approved")
    .reduce((sum, e) => sum + parseFloat(e.amount.replace(/[$,]/g, "")), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-600 mt-1">Manage and approve expense requests</p>
        </div>
        <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
          <Plus className="w-4 h-4" />
          New Expense
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Pending Review</p>
          <p className="text-3xl text-gray-900">${totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Approved This Month</p>
          <p className="text-3xl text-gray-900">${totalApproved.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
          <p className="text-3xl text-gray-900">${(totalPending + totalApproved).toLocaleString()}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
              <th className="text-left px-6 py-3 text-xs text-gray-600">Description</th>
              <th className="text-left px-6 py-3 text-xs text-gray-600">Project</th>
              <th className="text-left px-6 py-3 text-xs text-gray-600">Category</th>
              <th className="text-left px-6 py-3 text-xs text-gray-600">Amount</th>
              <th className="text-left px-6 py-3 text-xs text-gray-600">Submitted By</th>
              <th className="text-left px-6 py-3 text-xs text-gray-600">Date</th>
              <th className="text-left px-6 py-3 text-xs text-gray-600">Status</th>
              <th className="text-left px-6 py-3 text-xs text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map((expense) => (
              <tr key={expense.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-900">{expense.description}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">{expense.project}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">{expense.category}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-900">{expense.amount}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">{expense.submittedBy}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">{new Date(expense.date).toLocaleDateString()}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${statusColors[expense.status]}`}>
                    {expense.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {expense.status === "Pending" && (
                    <button
                      onClick={() => {
                        setSelectedExpense(expense);
                        setShowApproveModal(true);
                      }}
                      className="text-sm text-green-600 hover:underline"
                    >
                      Review
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showApproveModal && selectedExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-xl text-gray-900 mb-4">Review Expense</h2>

            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Description</p>
                <p className="text-sm text-gray-900">{selectedExpense.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Amount</p>
                  <p className="text-lg text-gray-900">{selectedExpense.amount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Category</p>
                  <p className="text-sm text-gray-900">{selectedExpense.category}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Project</p>
                  <p className="text-sm text-gray-900">{selectedExpense.project}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Submitted By</p>
                  <p className="text-sm text-gray-900">{selectedExpense.submittedBy}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Notes</p>
                <textarea
                  rows={3}
                  placeholder="Add approval notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedExpense(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                Reject
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
