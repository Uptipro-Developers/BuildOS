import { useState, useEffect } from "react";
import { getUnits } from "../api/admin-extras";

/**
 * Fallback units, used only until the configured list loads (or if it fails).
 * The authoritative list is Storefront's Units of Measurement.
 */
export const UNIT_FALLBACK = [
  "Tonnes",
  "Bags",
  "Metres",
  "Sheets",
  "Rolls",
  "Units",
  "Cartons",
  "Litres",
  "Buckets",
];

/** Units of Measurement as configured in Storefront settings, with a fallback. */
export function useProcurementUnits(): string[] {
  const [units, setUnits] = useState<string[]>(UNIT_FALLBACK);
  useEffect(() => {
    let active = true;
    getUnits()
      .then((rows) => {
        const names = rows.map((u) => u.abbreviation || u.name).filter(Boolean);
        if (active && names.length > 0) setUnits(names);
      })
      .catch(() => {
        /* keep the fallback list */
      });
    return () => {
      active = false;
    };
  }, []);
  return units;
}
