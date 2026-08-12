import { Link } from "react-router";
import { Lock } from "lucide-react";
import {
  getCurrencyCode,
  getCurrencySymbol,
} from "../utils/generalSettings";

/**
 * The organisation's currency, shown where a module used to let it be changed.
 *
 * Currency is a global setting: every amount in BuildOS is stored as a bare
 * number and rendered through the one formatter, so a module choosing its own
 * currency did not convert anything — it only relabelled the same figures. With
 * Naira configured in Admin, Finance set to USD meant a ₦4,690,000 order
 * appearing as $4,690,000 on one screen and ₦4,690,000 on the next, with no
 * exchange rate anywhere and nothing to say which was right.
 *
 * So these fields are read-only, and point at the one place the setting lives.
 * Fiscal year is deliberately *not* treated this way: Finance may legitimately
 * run to a different year end than the rest of the company.
 */
export function GlobalCurrencyField({
  label = "Currency",
  hint,
}: {
  label?: string;
  /** Extra context about what this currency governs in the module. */
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}
      </label>
      <div className="w-full px-3 py-2 text-sm border border-gray-200 bg-gray-50 rounded-lg text-gray-700 flex items-center justify-between gap-2">
        <span>
          {getCurrencyCode()}{" "}
          <span className="text-gray-400">({getCurrencySymbol()})</span>
        </span>
        <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      </div>
      <p className="text-xs text-gray-400 mt-1">
        {hint ? `${hint} ` : ""}Set organisation-wide in{" "}
        <Link
          to="/apps/admin/general-settings"
          className="text-blue-600 hover:underline"
        >
          Admin › General Settings
        </Link>
        .
      </p>
    </div>
  );
}
