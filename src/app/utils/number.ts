/**
 * Numeric helpers for derived metrics.
 *
 * Percentages across the app were computed as `part / whole * 100` with a guard
 * on the wrong thing — typically `items.length > 0` — while the division was by
 * a *total* (`totalBudget`, `totalDuration`) that can be zero even when items
 * exist. A project with no budget set, or an org with no data yet, then rendered
 * "NaN%" straight into the UI.
 *
 * The other source was summing a field the API may omit: `reduce((s, t) => s +
 * t.percentComplete, 0)` yields NaN the moment one record lacks the field.
 */

/** A finite number, or 0. Absorbs null/undefined/NaN from API payloads. */
export function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * `part / whole` as a percentage, rounded. Returns 0 when the result would not
 * be a finite number — a zero, missing or non-numeric denominator.
 */
export function safePercent(part: unknown, whole: unknown): number {
  const w = num(whole);
  if (w === 0) return 0;
  const pct = (num(part) / w) * 100;
  return Number.isFinite(pct) ? Math.round(pct) : 0;
}

/** `a / b`, or 0 when that is not finite. */
export function safeDivide(a: unknown, b: unknown): number {
  const d = num(b);
  if (d === 0) return 0;
  const result = num(a) / d;
  return Number.isFinite(result) ? result : 0;
}

/** Mean of a list of values, ignoring non-numeric entries. Empty list → 0. */
export function safeAverage(values: unknown[]): number {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return safeDivide(
    values.reduce<number>((sum, v) => sum + num(v), 0),
    values.length,
  );
}
