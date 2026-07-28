import { useState, useRef, useEffect } from "react";
import {
  SlidersHorizontal,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

// ─── Public types ─────────────────────────────────────────────────────────

export type FilterFieldType = "text" | "number" | "date" | "select";

export interface FilterFieldDef {
  key: string;
  label: string;
  type: FilterFieldType;
  /** Options for `select` type */
  options?: string[];
}

export interface FilterValues {
  /** text / select */
  text?: string;
  /** multi-select */
  selected?: string[];
  /** number range */
  numberMin?: string;
  numberMax?: string;
  /** date range  */
  dateFrom?: string;
  dateTo?: string;
}

export type ActiveFilters = Record<string, FilterValues>;

export type SortConfig = { field: string; direction: "asc" | "desc" } | null;

interface AdvancedFilterProps {
  /** Field definitions — drives which filter controls appear */
  fields: FilterFieldDef[];
  /** Current filter state */
  filters: ActiveFilters;
  onFiltersChange: (filters: ActiveFilters) => void;
  /** Current sort */
  sort: SortConfig;
  onSortChange: (sort: SortConfig) => void;
  /** Extra class for the trigger button */
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function countActiveFilters(filters: ActiveFilters): number {
  let n = 0;
  for (const vals of Object.values(filters)) {
    if (vals.text?.trim()) n++;
    if (vals.selected?.length) n++;
    if (vals.numberMin?.trim() || vals.numberMax?.trim()) n++;
    if (vals.dateFrom?.trim() || vals.dateTo?.trim()) n++;
  }
  return n;
}

// ─── Component ────────────────────────────────────────────────────────────

export function AdvancedFilter({
  fields,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  className = "",
}: AdvancedFilterProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const totalActive = countActiveFilters(filters);

  function updateField(key: string, patch: FilterValues) {
    onFiltersChange({
      ...filters,
      [key]: { ...(filters[key] ?? {}), ...patch },
    });
  }

  function clearField(key: string) {
    const next = { ...filters };
    delete next[key];
    onFiltersChange(next);
  }

  function clearAll() {
    onFiltersChange({});
    onSortChange(null);
  }

  function toggleSortField(fieldKey: string) {
    if (sort?.field === fieldKey) {
      if (sort.direction === "asc")
        onSortChange({ field: fieldKey, direction: "desc" });
      else onSortChange(null);
    } else {
      onSortChange({ field: fieldKey, direction: "asc" });
    }
  }

  function toggleSelectOption(fieldKey: string, opt: string) {
    const prev = filters[fieldKey]?.selected ?? [];
    const next = prev.includes(opt)
      ? prev.filter((o) => o !== opt)
      : [...prev, opt];
    updateField(fieldKey, { selected: next });
  }

  const sortableFields = fields.filter((f) => f.type !== "select");

  return (
    <div className="relative inline-block" ref={panelRef}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors ${open ? "bg-gray-50 border-gray-300" : "bg-white"} ${className}`}
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filters
        {totalActive > 0 && (
          <span className="flex items-center justify-center w-5 h-5 bg-gray-900 text-white text-xs rounded-full font-medium leading-none">
            {totalActive}
          </span>
        )}
      </button>

      {/* Panel — single-column, all filters visible, right-aligned to avoid viewport overflow */}
      {open && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl w-[min(92vw,360px)] max-h-[min(80vh,520px)] overflow-y-auto">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
            <p className="text-sm font-semibold text-gray-800">
              Filters{" "}
              {totalActive > 0 && (
                <span className="ml-1 text-xs text-gray-400">
                  ({totalActive} active)
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              {(totalActive > 0 || sort) && (
                <button
                  onClick={clearAll}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Single-column filter body — all fields visible at once */}
          <div className="px-4 py-3 space-y-5">
            {fields.map((f) => {
              const fVals = filters[f.key] ?? {};
              const hasFilter = !!countActiveFilters({ [f.key]: fVals });
              return (
                <div key={f.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      {f.label}
                    </p>
                    {hasFilter && (
                      <button
                        onClick={() => clearField(f.key)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {f.type === "text" && (
                    <input
                      type="text"
                      placeholder={`Search ${f.label.toLowerCase()}…`}
                      value={fVals.text ?? ""}
                      onChange={(e) =>
                        updateField(f.key, { text: e.target.value })
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}

                  {f.type === "number" && (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={fVals.numberMin ?? ""}
                        onChange={(e) =>
                          updateField(f.key, { numberMin: e.target.value })
                        }
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={fVals.numberMax ?? ""}
                        onChange={(e) =>
                          updateField(f.key, { numberMax: e.target.value })
                        }
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {f.type === "date" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          From
                        </label>
                        <input
                          type="date"
                          value={fVals.dateFrom ?? ""}
                          onChange={(e) =>
                            updateField(f.key, { dateFrom: e.target.value })
                          }
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          To
                        </label>
                        <input
                          type="date"
                          value={fVals.dateTo ?? ""}
                          onChange={(e) =>
                            updateField(f.key, { dateTo: e.target.value })
                          }
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {f.type === "select" && (
                    <div className="flex flex-wrap gap-1.5">
                      {(f.options ?? []).map((opt) => {
                        const checked = (fVals.selected ?? []).includes(opt);
                        return (
                          <button
                            key={opt}
                            onClick={() => toggleSelectOption(f.key, opt)}
                            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                              checked
                                ? "bg-indigo-700 border-indigo-700 text-white font-medium"
                                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Sort */}
            {sortableFields.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Sort by
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {sortableFields.map((f) => {
                    const isActive = sort?.field === f.key;
                    return (
                      <button
                        key={f.key}
                        onClick={() => toggleSortField(f.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                          isActive
                            ? "bg-indigo-700 border-indigo-700 text-white font-medium"
                            : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {isActive ? (
                          sort?.direction === "asc" ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-gray-400" />
                        )}
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Utility: apply filters + sort to a dataset ──────────────────────────

export function applyFiltersAndSort<T extends object>(
  data: T[],
  filters: ActiveFilters,
  sort: SortConfig,
): T[] {
  let result = [...data];

  const valueOf = (row: T, key: string) =>
    (row as Record<string, unknown>)[key];

  for (const [key, vals] of Object.entries(filters)) {
    if (vals.text?.trim()) {
      const q = vals.text.trim().toLowerCase();
      result = result.filter((row) =>
        String(valueOf(row, key) ?? "")
          .toLowerCase()
          .includes(q),
      );
    }
    if (vals.selected?.length) {
      result = result.filter((row) =>
        vals.selected!.includes(String(valueOf(row, key) ?? "")),
      );
    }
    if (vals.numberMin !== undefined && vals.numberMin !== "") {
      const min = Number(vals.numberMin);
      result = result.filter((row) => Number(valueOf(row, key) ?? 0) >= min);
    }
    if (vals.numberMax !== undefined && vals.numberMax !== "") {
      const max = Number(vals.numberMax);
      result = result.filter((row) => Number(valueOf(row, key) ?? 0) <= max);
    }
    if (vals.dateFrom?.trim()) {
      result = result.filter(
        (row) => String(valueOf(row, key) ?? "") >= vals.dateFrom!,
      );
    }
    if (vals.dateTo?.trim()) {
      result = result.filter(
        (row) => String(valueOf(row, key) ?? "") <= vals.dateTo!,
      );
    }
  }

  if (sort) {
    result.sort((a, b) => {
      const va = valueOf(a, sort.field);
      const vb = valueOf(b, sort.field);
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va ?? "").localeCompare(String(vb ?? ""));
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }

  return result;
}
