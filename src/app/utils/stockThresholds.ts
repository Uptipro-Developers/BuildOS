import { useCallback, useEffect, useState } from "react";
import {
  getStoreThresholds,
  type StoreThresholdRecord,
} from "../api/admin-extras";

export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

export interface StockLine {
  /** Quantity on hand. */
  qty: number;
  /** The material's own reorder level; the reference a % threshold applies to. */
  reorderLevel?: number;
}

/**
 * Where the low/out-of-stock lines sit for one item.
 *
 * A store's configured thresholds are expressed either as absolute quantities
 * or as a percentage of the item's reorder level — the only per-item reference
 * the catalogue carries. With no configured threshold (or nothing to take a
 * percentage of) the reorder level is the low-stock line, which is how stock
 * status has always been derived.
 */
export function thresholdLevels(
  line: StockLine,
  threshold?: StoreThresholdRecord,
): { low: number; out: number } {
  const reorderLevel = Number(line.reorderLevel ?? 0);

  if (!threshold) return { low: reorderLevel, out: 0 };

  const isPercent = String(threshold.unit ?? "").trim() === "%";
  if (!isPercent) {
    return {
      low: Number(threshold.lowStockQty ?? 0),
      out: Number(threshold.outOfStockQty ?? 0),
    };
  }

  // A percentage of nothing is nothing, and would flag every item as out of
  // stock. Items with no reorder level keep the unconfigured behaviour.
  if (reorderLevel <= 0) return { low: reorderLevel, out: 0 };

  return {
    low: (reorderLevel * Number(threshold.lowStockQty ?? 0)) / 100,
    out: (reorderLevel * Number(threshold.outOfStockQty ?? 0)) / 100,
  };
}

/**
 * The stock status of one line, honouring the store's configured thresholds.
 *
 * Storefront and Procurement both offer per-store Low/Out of Stock thresholds,
 * but every status in the app was derived from the material's reorder level
 * alone, so configuring them changed nothing anywhere.
 */
export function stockStatusFor(
  line: StockLine,
  threshold?: StoreThresholdRecord,
): StockStatus {
  const { low, out } = thresholdLevels(line, threshold);
  const qty = Number(line.qty ?? 0);

  if (qty <= out) return "Out of Stock";
  if (qty <= low) return "Low Stock";
  return "In Stock";
}

/**
 * The configured per-store thresholds, keyed by store name.
 *
 * Thresholds are stored against the store's name (that is what the settings
 * screen collects), so lookups are case-insensitive on the name rather than on
 * an id the settings record does not carry.
 */
export function useStoreThresholds() {
  const [thresholds, setThresholds] = useState<StoreThresholdRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    getStoreThresholds()
      .then((rows) => {
        if (alive) setThresholds(Array.isArray(rows) ? rows : []);
      })
      // Stock screens must stay usable without the settings service; they fall
      // back to reorder levels.
      .catch(() => {})
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Stable across renders so callers can memoise derived counts on it.
  const thresholdForStore = useCallback(
    (storeName?: string): StoreThresholdRecord | undefined => {
      const name = String(storeName ?? "").trim().toLowerCase();
      if (!name) return undefined;
      return thresholds.find(
        (t) => String(t.storeName ?? "").trim().toLowerCase() === name,
      );
    },
    [thresholds],
  );

  return { thresholds, thresholdForStore, loaded };
}
