import { useState, useRef, useEffect } from "react";
import { SlidersHorizontal, X, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, Calendar, Hash, Type, List } from "lucide-react";

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

const FIELD_TYPE_ICON: Record<FilterFieldType, React.FC<{ className?: string }>> = {
  text:   Type,
  number: Hash,
  date:   Calendar,
  select: List,
};

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
  const [activeField, setActiveField] = useState<string>(fields[0]?.key ?? "");
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
  const currentField = fields.find((f) => f.key === activeField) ?? fields[0];
  const vals = filters[currentField?.key ?? ""] ?? {};

  function updateFilter(patch: FilterValues) {
    if (!currentField) return;
    onFiltersChange({ ...filters, [currentField.key]: { ...(filters[currentField.key] ?? {}), ...patch } });
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
      if (sort.direction === "asc") onSortChange({ field: fieldKey, direction: "desc" });
      else onSortChange(null);
    } else {
      onSortChange({ field: fieldKey, direction: "asc" });
    }
  }

  function toggleSelectOption(opt: string) {
    const prev = vals.selected ?? [];
    const next = prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt];
    updateFilter({ selected: next });
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

      {/* Panel */}
      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl w-[480px] overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">
              Filters {totalActive > 0 && <span className="ml-1 text-xs text-gray-400">({totalActive} active)</span>}
            </p>
            <div className="flex items-center gap-2">
              {(totalActive > 0 || sort) && (
                <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-700 font-medium">
                  Clear all
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex h-[360px]">
            {/* Field list */}
            <div className="w-44 border-r border-gray-100 overflow-y-auto py-2 shrink-0">
              {fields.map((f) => {
                const hasFilter = !!countActiveFilters({ [f.key]: filters[f.key] ?? {} });
                const Icon = FIELD_TYPE_ICON[f.type];
                return (
                  <button
                    key={f.key}
                    onClick={() => setActiveField(f.key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                      activeField === f.key
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${hasFilter ? "text-blue-500" : "text-gray-400"}`} />
                    <span className="flex-1 truncate">{f.label}</span>
                    {hasFilter && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                  </button>
                );
              })}

              {/* Sort section divider */}
              {sortableFields.length > 0 && (
                <>
                  <div className="mx-3 my-2 border-t border-gray-100" />
                  <p className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wide">Sort</p>
                  {sortableFields.map((f) => {
                    const isActive = sort?.field === f.key;
                    return (
                      <button
                        key={`sort-${f.key}`}
                        onClick={() => toggleSortField(f.key)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                          isActive ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {isActive ? (
                          sort?.direction === "asc"
                            ? <ArrowUp className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            : <ArrowDown className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        )}
                        <span className="flex-1 truncate">{f.label}</span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Filter controls for active field */}
            {currentField && (
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-800">{currentField.label}</p>
                  {countActiveFilters({ [currentField.key]: vals }) > 0 && (
                    <button onClick={() => clearField(currentField.key)} className="text-xs text-red-500 hover:text-red-700">
                      Clear
                    </button>
                  )}
                </div>

                {/* TEXT filter */}
                {currentField.type === "text" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Contains</label>
                      <input
                        type="text"
                        placeholder={`Search ${currentField.label.toLowerCase()}…`}
                        value={vals.text ?? ""}
                        onChange={(e) => updateFilter({ text: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* NUMBER filter */}
                {currentField.type === "number" && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500">Set a minimum, maximum, or both for a range</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Min value</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={vals.numberMin ?? ""}
                          onChange={(e) => updateFilter({ numberMin: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Max value</label>
                        <input
                          type="number"
                          placeholder="∞"
                          value={vals.numberMax ?? ""}
                          onChange={(e) => updateFilter({ numberMax: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    {vals.numberMin && vals.numberMax && Number(vals.numberMin) > Number(vals.numberMax) && (
                      <p className="text-xs text-red-500">Min must be ≤ max</p>
                    )}
                  </div>
                )}

                {/* DATE filter */}
                {currentField.type === "date" && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500">Filter by a specific date or a date range</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">From</label>
                        <input
                          type="date"
                          value={vals.dateFrom ?? ""}
                          onChange={(e) => updateFilter({ dateFrom: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">To</label>
                        <input
                          type="date"
                          value={vals.dateTo ?? ""}
                          onChange={(e) => updateFilter({ dateTo: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    {vals.dateFrom && vals.dateTo && vals.dateFrom > vals.dateTo && (
                      <p className="text-xs text-red-500">From date must be before To date</p>
                    )}
                    {/* Quick ranges */}
                    <div>
                      <p className="text-xs text-gray-400 mb-1.5">Quick select</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: "Today",      from: new Date().toISOString().slice(0, 10),          to: new Date().toISOString().slice(0, 10) },
                          { label: "This week",  from: (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10); })(), to: new Date().toISOString().slice(0, 10) },
                          { label: "This month", from: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`, to: new Date().toISOString().slice(0, 10) },
                          { label: "Last 30d",   from: (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); })(), to: new Date().toISOString().slice(0, 10) },
                          { label: "Last 90d",   from: (() => { const d = new Date(); d.setDate(d.getDate() - 90); return d.toISOString().slice(0, 10); })(), to: new Date().toISOString().slice(0, 10) },
                        ].map((q) => (
                          <button key={q.label} onClick={() => updateFilter({ dateFrom: q.from, dateTo: q.to })}
                            className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium">
                            {q.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SELECT / multi-select filter */}
                {currentField.type === "select" && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 mb-2">Select one or more</p>
                    {(currentField.options ?? []).map((opt) => {
                      const checked = (vals.selected ?? []).includes(opt);
                      return (
                        <label key={opt} className="flex items-center gap-2.5 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelectOption(opt)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Panel footer — active summary */}
          {(totalActive > 0 || sort) && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-2">
              {Object.entries(filters).map(([key, vals]) => {
                const fd = fields.find((f) => f.key === key);
                if (!fd) return null;
                const parts: string[] = [];
                if (vals.text) parts.push(`"${vals.text}"`);
                if (vals.selected?.length) parts.push(vals.selected.join(", "));
                if (vals.numberMin || vals.numberMax) parts.push(`${vals.numberMin ?? "—"} → ${vals.numberMax ?? "∞"}`);
                if (vals.dateFrom || vals.dateTo) parts.push(`${vals.dateFrom ?? "any"} → ${vals.dateTo ?? "any"}`);
                if (!parts.length) return null;
                return (
                  <span key={key} className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-2.5 py-0.5 text-xs text-gray-700">
                    <span className="font-medium">{fd.label}:</span> {parts.join(" · ")}
                    <button onClick={() => clearField(key)} className="ml-0.5 text-gray-400 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
              {sort && (
                <span className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-2.5 py-0.5 text-xs text-gray-700">
                  {sort.direction === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  <span className="font-medium">Sort:</span> {fields.find((f) => f.key === sort.field)?.label ?? sort.field} ({sort.direction})
                  <button onClick={() => onSortChange(null)} className="ml-0.5 text-gray-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Utility: apply filters + sort to a dataset ──────────────────────────

export function applyFiltersAndSort<T extends Record<string, unknown>>(
  data: T[],
  filters: ActiveFilters,
  sort: SortConfig,
): T[] {
  let result = [...data];

  for (const [key, vals] of Object.entries(filters)) {
    if (vals.text?.trim()) {
      const q = vals.text.trim().toLowerCase();
      result = result.filter((row) => String(row[key] ?? "").toLowerCase().includes(q));
    }
    if (vals.selected?.length) {
      result = result.filter((row) => vals.selected!.includes(String(row[key] ?? "")));
    }
    if (vals.numberMin !== undefined && vals.numberMin !== "") {
      const min = Number(vals.numberMin);
      result = result.filter((row) => Number(row[key] ?? 0) >= min);
    }
    if (vals.numberMax !== undefined && vals.numberMax !== "") {
      const max = Number(vals.numberMax);
      result = result.filter((row) => Number(row[key] ?? 0) <= max);
    }
    if (vals.dateFrom?.trim()) {
      result = result.filter((row) => String(row[key] ?? "") >= vals.dateFrom!);
    }
    if (vals.dateTo?.trim()) {
      result = result.filter((row) => String(row[key] ?? "") <= vals.dateTo!);
    }
  }

  if (sort) {
    result.sort((a, b) => {
      const va = a[sort.field];
      const vb = b[sort.field];
      const cmp = typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va ?? "").localeCompare(String(vb ?? ""));
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }

  return result;
}
