import type { ReactNode } from "react";

export type RowActionTone =
  | "neutral"
  | "primary"
  | "positive"
  | "negative"
  | "warning";

const TONE_CLASSES: Record<RowActionTone, string> = {
  neutral: "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
  primary: "text-blue-600 hover:text-blue-800 hover:bg-blue-50",
  positive: "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50",
  negative: "text-red-500 hover:text-red-700 hover:bg-red-50",
  warning: "text-amber-600 hover:text-amber-800 hover:bg-amber-50",
};

/**
 * One row action, rendered the same way everywhere: icon *and* label.
 *
 * The module used to mix bare icon buttons (Purchase Orders), icon + text
 * (Received Quotes) and text-only links (Purchase Invoices) for the same
 * actions, so "View" was a naked eye on one screen and an eye with a word on
 * the next. Every action in procurement now renders through this, which also
 * stops each page inventing its own hover colours.
 */
export function RowAction({
  icon,
  label,
  onClick,
  tone = "neutral",
  disabled,
  title,
  busy,
  busyLabel,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tone?: RowActionTone;
  disabled?: boolean;
  title?: string;
  busy?: boolean;
  /** Label shown while `busy` — defaults to the normal label. */
  busyLabel?: string;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      disabled={disabled || busy}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${TONE_CLASSES[tone]}`}
    >
      {icon}
      {busy ? (busyLabel ?? label) : label}
    </button>
  );
}

/**
 * Where a row has no action available, an explanation reads better than an
 * empty cell — the old pages left four of seven statuses with a blank Actions
 * column and no hint as to who was holding the workflow up.
 */
export function RowActionNote({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs text-gray-400 italic whitespace-nowrap">
      {children}
    </span>
  );
}

/** Consistent spacing for a row's action cluster. */
export function RowActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-1 flex-wrap">
      {children}
    </div>
  );
}
