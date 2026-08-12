import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { formatCurrencyByGeneralSettings } from "../utils/generalSettings";

/**
 * One side of a double-entry posting.
 *
 * Carries both halves of the account — `glCode` is what the ledger groups and
 * reports on, `account` is what a person reads — because the Chart of Accounts
 * is keyed on the code but nobody recognises an entry by "2110".
 */
export interface JournalLineInput {
  id: string;
  account: string;
  glCode: string;
  debit: number;
  credit: number;
  description: string;
}

export const newJournalLine = (): JournalLineInput => ({
  id: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  account: "",
  glCode: "",
  debit: 0,
  credit: 0,
  description: "",
});

/** Total debits, total credits, and whether the posting may be posted. */
export function journalTotals(lines: JournalLineInput[]) {
  const totalDebits = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredits = lines.reduce((s, l) => s + (l.credit || 0), 0);
  return {
    totalDebits,
    totalCredits,
    difference: totalDebits - totalCredits,
    // A posting of nothing is not balanced, it is empty — and every line needs
    // an account, or the amount posts to no ledger at all.
    balanced:
      totalDebits > 0 &&
      totalDebits === totalCredits &&
      lines.every((l) => !l.debit && !l.credit ? true : Boolean(l.glCode)),
  };
}

/**
 * The double-entry lines of a posting.
 *
 * Extracted from Journal Entries so that every module that moves money posts
 * the same way and through the same validation: a payment recorded against a
 * purchase invoice, a completed payment, and a manual journal are all the same
 * kind of event to the ledger, and each used to record it differently — or, in
 * the case of payments, not at all.
 */
export function JournalLinesEditor({
  lines,
  onChange,
  accounts,
  minLines = 2,
  disabled = false,
}: {
  lines: JournalLineInput[];
  onChange: (lines: JournalLineInput[]) => void;
  accounts: { code: string; name: string }[];
  minLines?: number;
  disabled?: boolean;
}) {
  function update(
    id: string,
    field: keyof JournalLineInput,
    value: string | number,
  ) {
    onChange(
      lines.map((l) => {
        if (l.id !== id) return l;
        if (field === "glCode") {
          const chosen = accounts.find((a) => a.code === value);
          return { ...l, glCode: String(value), account: chosen?.name ?? "" };
        }
        // A line is a debit or a credit, never both — entering one clears the
        // other rather than leaving a line that posts to both sides at once.
        if (field === "debit") return { ...l, debit: Number(value) || 0, credit: 0 };
        if (field === "credit") return { ...l, credit: Number(value) || 0, debit: 0 };
        return { ...l, [field]: value };
      }),
    );
  }

  const { totalDebits, totalCredits, difference, balanced } =
    journalTotals(lines);

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[680px] w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">
                Account
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-32">
                Debit
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-32">
                Credit
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">
                Description
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lines.map((line) => (
              <tr key={line.id}>
                <td className="px-2 py-1.5">
                  <select
                    value={line.glCode}
                    disabled={disabled}
                    onChange={(e) => update(line.id, "glCode", e.target.value)}
                    className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 ${disabled ? "bg-gray-50 text-gray-500" : "bg-white"}`}
                  >
                    <option value="">
                      {accounts.length === 0
                        ? "No accounts in the Chart of Accounts"
                        : "Select account"}
                    </option>
                    {accounts.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min={0}
                    value={line.debit || ""}
                    disabled={disabled || line.credit > 0}
                    onChange={(e) => update(line.id, "debit", e.target.value)}
                    placeholder="0.00"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min={0}
                    value={line.credit || ""}
                    disabled={disabled || line.debit > 0}
                    onChange={(e) => update(line.id, "credit", e.target.value)}
                    placeholder="0.00"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={line.description}
                    disabled={disabled}
                    onChange={(e) =>
                      update(line.id, "description", e.target.value)
                    }
                    placeholder="Note (optional)"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </td>
                <td className="px-2 py-1.5">
                  {!disabled && lines.length > minLines && (
                    <button
                      onClick={() =>
                        onChange(lines.filter((l) => l.id !== line.id))
                      }
                      className="p-1 text-gray-400 hover:text-red-500"
                      title="Remove line"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-200">
            <tr>
              <td className="px-3 py-2 text-xs font-semibold text-gray-600 text-right">
                Totals:
              </td>
              <td className="px-3 py-2 text-xs font-bold text-emerald-700">
                {formatCurrencyByGeneralSettings(totalDebits)}
              </td>
              <td className="px-3 py-2 text-xs font-bold text-red-600">
                {formatCurrencyByGeneralSettings(totalCredits)}
              </td>
              <td colSpan={2} className="px-3 py-2">
                {totalDebits > 0 &&
                  (balanced ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Entry is balanced
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {difference === 0
                        ? "Every line needs an account"
                        : `Not balanced — ${difference > 0 ? "debits" : "credits"} exceed by ${formatCurrencyByGeneralSettings(Math.abs(difference))}`}
                    </span>
                  ))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {!disabled && (
        <button
          onClick={() => onChange([...lines, newJournalLine()])}
          className="w-full py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 border-t border-gray-100 flex items-center justify-center gap-1"
        >
          + Add Line
        </button>
      )}
    </div>
  );
}
