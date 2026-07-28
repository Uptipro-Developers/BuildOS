import { useState } from "react";
import { Search, RotateCcw, Filter } from "lucide-react";
import { useChangelog } from "../../stores/changelogStore";
import { DataTable, type Column } from "../../components/DataTable";

const MODULES = ["Finance", "HR", "Procurement", "Projects", "Admin", "ESS", "Storefront"];

const MODULE_COLORS: Record<string, string> = {
  Finance: "bg-emerald-100 text-emerald-700", HR: "bg-blue-100 text-blue-700",
  Procurement: "bg-purple-100 text-purple-700", Projects: "bg-amber-100 text-amber-700",
  Admin: "bg-indigo-100 text-indigo-700", ESS: "bg-teal-100 text-teal-700",
  Storefront: "bg-orange-100 text-orange-700",
};

export function ChangelogPage() {
  const { entries, clearAll } = useChangelog();
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string | "all">("all");

  const filtered = entries.filter(e => {
    if (moduleFilter !== "all" && e.module !== moduleFilter) return false;
    if (search && ![e.summary, e.action, e.entityType, e.entityId, e.performedBy]
      .some(f => f.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const columns: Column<(typeof entries)[0]>[] = [
    { key: "module", label: "Module", render: e => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MODULE_COLORS[e.module] ?? "bg-gray-100 text-gray-600"}`}>{e.module}</span>
    ), sortable: true, filterable: true },
    { key: "action", label: "Action", render: e => <span className="text-xs font-medium text-gray-900">{e.action}</span>, sortable: true, filterable: true },
    { key: "entity", label: "Entity", render: e => <span className="text-xs text-gray-400">{e.entityType} · {e.entityId}</span>, sortable: true, filterable: true, minWidth: 140 },
    { key: "summary", label: "Summary", render: e => <span className="text-sm text-gray-700">{e.summary}</span>, sortable: true, filterable: true, minWidth: 250 },
    { key: "timestamp", label: "Timestamp", render: e => (
      <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(e.timestamp).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
    ), sortable: true, filterable: false, minWidth: 140 },
    { key: "performedBy", label: "By", render: e => <span className="text-xs text-gray-500">{e.performedBy}</span>, sortable: true, filterable: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Changelog</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track all changes made across modules in the system</p>
        </div>
        {entries.length > 0 && (
          <button onClick={clearAll} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <RotateCcw className="w-4 h-4" /> Clear All
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search changelog..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          <button onClick={() => setModuleFilter("all")} className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${moduleFilter === "all" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
            <Filter className="w-3 h-3 inline mr-1" />All
          </button>
          {MODULES.map(m => (
            <button key={m} onClick={() => setModuleFilter(m)} className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${moduleFilter === m ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={e => e.id}
        searchPlaceholder="Search within results..."
        searchFields={[e => e.summary, e => e.action, e => e.entityType, e => e.entityId, e => e.performedBy]}
        emptyMessage="No changelog entries found. Changes will appear here as you perform actions across the system."
        pageSize={20}
      />
    </div>
  );
}
