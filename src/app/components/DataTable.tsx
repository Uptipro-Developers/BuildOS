import { useState, useMemo, type ReactNode } from "react";
import { ChevronUp, ChevronDown, ArrowUpDown, Search, X } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  className?: string;
  headerClassName?: string;
  minWidth?: number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  searchPlaceholder?: string;
  searchFields?: ((row: T) => string)[];
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  headerExtra?: ReactNode;
  pageSize?: number;
}

type SortDir = "asc" | "desc" | null;

interface SortState {
  key: string;
  dir: SortDir;
}

interface FilterState {
  key: string;
  value: string;
}

export function DataTable<T>({
  columns, data, keyExtractor, searchPlaceholder = "Search...",
  searchFields, emptyMessage = "No data found",
  onRowClick, headerExtra, pageSize = 50,
}: DataTableProps<T>) {
  const [globalSearch, setGlobalSearch] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "", dir: null });
  const [columnFilters, setColumnFilters] = useState<FilterState[]>([]);
  const [openSortKey, setOpenSortKey] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let result = data;

    if (globalSearch && searchFields) {
      const q = globalSearch.toLowerCase();
      result = result.filter(row => searchFields.some(fn => fn(row).toLowerCase().includes(q)));
    }

    for (const cf of columnFilters) {
      if (!cf.value) continue;
      const q = cf.value.toLowerCase();
      result = result.filter(row => {
        const col = columns.find(c => c.key === cf.key);
        if (!col) return true;
        const rendered = col.render(row);
        return String(rendered).toLowerCase().includes(q);
      });
    }

    if (sort.key && sort.dir) {
      const col = columns.find(c => c.key === sort.key);
      if (col) {
        result = [...result].sort((a, b) => {
          const aVal = String(col.render(a));
          const bVal = String(col.render(b));
          const aNum = parseFloat(aVal.replace(/[₦,()−+]/g, ""));
          const bNum = parseFloat(bVal.replace(/[₦,()−+]/g, ""));
          const useNum = !isNaN(aNum) && !isNaN(bNum);
          const cmp = useNum ? aNum - bNum : aVal.localeCompare(bVal);
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }

    return result;
  }, [data, globalSearch, columnFilters, sort, columns, searchFields]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  function toggleSort(key: string) {
    setSort(prev => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return { key: "", dir: null };
    });
    setOpenSortKey(null);
  }

  function setColumnFilter(key: string, value: string) {
    setColumnFilters(prev => {
      const existing = prev.findIndex(f => f.key === key);
      if (existing >= 0) {
        const next = [...prev];
        if (value) next[existing] = { key, value };
        else next.splice(existing, 1);
        return next;
      }
      return value ? [...prev, { key, value }] : prev;
    });
    setPage(0);
  }

  function getColumnFilter(key: string): string {
    return columnFilters.find(f => f.key === key)?.value ?? "";
  }

  function clearAllFilters() {
    setGlobalSearch("");
    setColumnFilters([]);
    setSort({ key: "", dir: null });
    setPage(0);
  }

  const hasActiveFilters = globalSearch || columnFilters.length > 0 || sort.dir !== null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={globalSearch} onChange={e => { setGlobalSearch(e.target.value); setPage(0); }}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          {hasActiveFilters && (
            <button onClick={clearAllFilters} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-200/50">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {headerExtra}
          <span className="text-xs text-gray-400 whitespace-nowrap">{filtered.length} records</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {columns.map(col => {
                const isSorted = sort.key === col.key;
                const filterVal = getColumnFilter(col.key);
                const isOpen = openSortKey === col.key;
                return (
                  <th key={col.key} className={`text-left px-4 py-3 text-xs font-semibold text-gray-500 ${col.headerClassName ?? ""}`}
                    style={col.minWidth ? { minWidth: col.minWidth } : undefined}>
                    <div className="flex items-center gap-1 group">
                      <span>{col.label}</span>
                      {col.sortable && (
                        <div className="relative">
                          <button onClick={() => setOpenSortKey(isOpen ? null : col.key)}
                            className="p-0.5 rounded text-gray-300 hover:text-gray-600 transition-colors">
                            {isSorted ? (sort.dir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3" />}
                          </button>
                          {isOpen && (
                            <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-1.5 space-y-1">
                              <button onClick={() => { toggleSort(col.key); setOpenSortKey(null); }}
                                className={`w-full text-left px-2 py-1 text-xs rounded ${isSorted && sort.dir === "asc" ? "bg-emerald-50 text-emerald-700" : "text-gray-600 hover:bg-gray-50"}`}>
                                <ChevronUp className="w-3 h-3 inline mr-1" /> Sort Ascending
                              </button>
                              <button onClick={() => { toggleSort(col.key); setOpenSortKey(null); }}
                                className={`w-full text-left px-2 py-1 text-xs rounded ${isSorted && sort.dir === "desc" ? "bg-emerald-50 text-emerald-700" : "text-gray-600 hover:bg-gray-50"}`}>
                                <ChevronDown className="w-3 h-3 inline mr-1" /> Sort Descending
                              </button>
                              {col.filterable && (
                                <div className="border-t border-gray-100 pt-1 mt-1">
                                  <input value={filterVal} onChange={e => setColumnFilter(col.key, e.target.value)}
                                    placeholder={`Filter ${col.label}...`}
                                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paged.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-gray-400">{emptyMessage}</td></tr>
            ) : (
              paged.map(row => (
                <tr key={keyExtractor(row)} onClick={() => onRowClick?.(row)}
                  className={`transition-colors ${onRowClick ? "cursor-pointer hover:bg-emerald-50/40" : "hover:bg-gray-50"}`}>
                  {columns.map(col => (
                    <td key={col.key} className={`px-4 py-3 text-sm ${col.className ?? ""}`}>{col.render(row)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">Page {page + 1} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-30">Prev</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const start = Math.max(0, Math.min(page - 2, totalPages - 5));
              const pg = start + i;
              return (
                <button key={pg} onClick={() => setPage(pg)}
                  className={`px-2 py-1 text-xs border rounded ${page === pg ? "bg-emerald-600 text-white border-emerald-600" : "border-gray-200 hover:bg-gray-50"}`}>{pg + 1}</button>
              );
            })}
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
              className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-30">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
