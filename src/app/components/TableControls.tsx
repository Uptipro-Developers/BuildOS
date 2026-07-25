import { useState, useRef, useEffect } from "react";
import { Download, Columns, X, Check, FileSpreadsheet } from "lucide-react";

export interface ColumnDef {
  key: string;
  label: string;
  visible?: boolean;
  align?: "left" | "right" | "center";
}

interface TableControlsProps {
  columns: ColumnDef[];
  onColumnsChange: (columns: ColumnDef[]) => void;
  onExportCSV: () => void;
  title?: string;
}

export function TableControls({ columns, onColumnsChange, onExportCSV, title }: TableControlsProps) {
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowColumnMenu(false);
      }
    }
    if (showColumnMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showColumnMenu]);

  function toggleColumn(key: string) {
    onColumnsChange(columns.map(c => c.key === key ? { ...c, visible: !(c.visible ?? true) } : c));
  }

  const visibleCount = columns.filter(c => c.visible !== false).length;

  return (
    <div className="flex items-center gap-2">
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowColumnMenu(!showColumnMenu)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-xs text-gray-600 hover:bg-gray-50"
        >
          <Columns className="w-3.5 h-3.5" />
          Columns ({visibleCount}/{columns.length})
        </button>
        {showColumnMenu && (
          <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 max-h-64 overflow-y-auto">
            <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
              {title || "Show/Hide Columns"}
            </div>
            {columns.map(c => (
              <button
                key={c.key}
                onClick={() => toggleColumn(c.key)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${c.visible !== false ? "bg-orange-500 border-orange-500" : "border-gray-300"}`}>
                  {c.visible !== false && <Check className="w-3 h-3 text-white" />}
                </span>
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={onExportCSV}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-xs text-gray-600 hover:bg-gray-50"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />
        Export CSV
      </button>
    </div>
  );
}

export function exportToCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.map(h => `"${h}"`).join(","),
    ...data.map(row => headers.map(h => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")),
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}