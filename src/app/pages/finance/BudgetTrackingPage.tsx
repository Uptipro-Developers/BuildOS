import { useEffect, useState } from "react";
import { fetchBudgets } from "../../api/budgets";
import { formatCurrencyByGeneralSettings } from "../../utils/generalSettings";

export function BudgetTrackingPage() {
  const [projects, setProjects] = useState<
    { name: string; budget: number; spent: number; remaining: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBudgets()
      .then((budgets) =>
        setProjects(
          budgets.map((b) => ({
            name: b.name,
            budget: b.totalBudget,
            spent: b.spent,
            remaining: Math.max(b.totalBudget - b.spent, 0),
          })),
        ),
      )
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (amount: number) => {
    return formatCurrencyByGeneralSettings(amount, {
      minimumFractionDigits: 0,
    });
  };

  const getPercentage = (spent: number, budget: number) => {
    if (!budget) return 0;
    return Math.round((spent / budget) * 100);
  };

  const totalBudget = projects.reduce(
    (sum, project) => sum + project.budget,
    0,
  );
  const totalSpent = projects.reduce((sum, project) => sum + project.spent, 0);
  const totalRemaining = projects.reduce(
    (sum, project) => sum + project.remaining,
    0,
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900">Budget Tracking</h1>
        <p className="text-sm text-gray-600 mt-1">
          Monitor project budgets and spending
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Total Budget</p>
          <p className="text-3xl text-gray-900">
            {formatCurrency(totalBudget)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Total Spent</p>
          <p className="text-3xl text-gray-900">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Remaining</p>
          <p className="text-3xl text-green-600">
            {formatCurrency(totalRemaining)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg text-gray-900 mb-6">Project Budgets</h2>
        {loading && (
          <p className="text-sm text-gray-500">Loading budget data...</p>
        )}
        {!loading && projects.length === 0 && (
          <p className="text-sm text-gray-500">
            No budget records are available yet.
          </p>
        )}
        <div className="space-y-6">
          {projects.map((project, idx) => {
            const percentage = getPercentage(project.spent, project.budget);
            const isOverBudget = percentage > 90;
            const isWarning = percentage > 75 && percentage <= 90;

            return (
              <div
                key={idx}
                className="pb-6 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm text-gray-900 mb-1">
                      {project.name}
                    </h3>
                    <p className="text-xs text-gray-600">
                      {formatCurrency(project.spent)} of{" "}
                      {formatCurrency(project.budget)} spent
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      isOverBudget
                        ? "bg-red-100 text-red-800"
                        : isWarning
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                    }`}
                  >
                    {percentage}% used
                  </span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isOverBudget
                        ? "bg-red-500"
                        : isWarning
                          ? "bg-yellow-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Spent: {formatCurrency(project.spent)}</span>
                  <span>Remaining: {formatCurrency(project.remaining)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
