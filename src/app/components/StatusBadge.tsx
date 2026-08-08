import type { ReactNode } from "react";

/**
 * One status pill, rendered the same way everywhere.
 *
 * Procurement previously drew statuses three different ways — icon + text on
 * Purchase Orders, bare text on Purchase Requests, icon + text with different
 * padding on Received Quotes — so the same state looked like a different kind
 * of thing depending on which page you were reading. Every status in the module
 * now goes through here, which means a status is always an icon and a label in
 * the same pill.
 */
export function StatusBadge({
  label,
  badge,
  icon,
  title,
}: {
  label: string;
  /** Tailwind background/text pair for the pill. */
  badge: string;
  icon?: ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title ?? label}
      className={`inline-flex items-center gap-1.5 w-fit whitespace-nowrap px-2 py-0.5 rounded-full text-xs font-medium ${badge}`}
    >
      {icon}
      {label}
    </span>
  );
}
