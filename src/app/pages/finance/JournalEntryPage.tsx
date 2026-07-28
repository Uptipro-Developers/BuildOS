import { useState, useEffect } from "react";
import { formatCurrencyByGeneralSettings } from "../../utils/generalSettings";
import { getAuthUserName } from "../../utils/useAuthUser";
import {
  getJournalEntries,
  getChartAccounts,
  JournalEntry as ApiJournalEntry,
} from "../../api/finance-extras";
import { Plus, Search, Eye, Edit, Trash2, X } from "lucide-react";
import { exportCSV } from "../../utils/exportCSV";
import { useChangelog } from "../../stores/changelogStore";
import { DataTable, type Column } from "../../components/DataTable";
import { useNumbering } from "../../stores/numberingStore";

type EntryStatus = "Draft" | "Posted" | "Reversed";

interface JournalLine {
  id: string;
  account: string;
  glCode: string;
  debit: number;
  credit: number;
  description: string;
}

interface JournalEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  status: EntryStatus;
  createdBy: string;
  lines: JournalLine[];
}

const blankLine = (): JournalLine => ({
  id: `ln-${Date.now()}-${Math.random()}`,
  account: "",
  glCode: "",
  debit: 0,
  credit: 0,
  description: "",
});

const STATUS_STYLES: Record<EntryStatus, string> = {
  Draft: "bg-amber-100 text-amber-700",
  Posted: "bg-emerald-100 text-emerald-700",
  Reversed: "bg-red-100 text-red-700",
};

export function JournalEntryPage() {
  const { logChange } = useChangelog();
  const { getNextId } = useNumbering();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<{ code: string; name: string }[]>(
    [],
  );
  // Load the Chart of Accounts for the debit/credit dropdowns.
  useEffect(() => {
    getChartAccounts()
      .then((data) => {
        setAccounts(
          (data as any[]).map((a) => ({
            code: String(a.code ?? ""),
            name: String(a.name ?? ""),
          })),
        );
      })
      .catch(() => {
        /* leave dropdown empty on failure */
      });
  }, []);
  useEffect(() => {
    getJournalEntries()
      .then((data: ApiJournalEntry[]) => {
        setEntries(
          data.map((e) => ({
            id: e.id,
            date: e.date,
            reference: e.ref,
            description: e.description ?? "",
            status: (["Draft", "Posted", "Reversed"].includes(e.status)
              ? e.status
              : "Draft") as EntryStatus,
            createdBy: e.createdBy ?? "",
            lines: (e.lines ?? []).map((l) => ({
              id: l.id ?? `ln-${Date.now()}-${Math.random()}`,
              account: l.accountName ?? "",
              glCode: l.accountCode ?? "",
              debit: l.debit,
              credit: l.credit,
              description: l.description ?? "",
            })),
          })),
        );
      })
      .catch(console.error);
  }, []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EntryStatus | "All">("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null);

  const [form, setForm] = useState<{
    date: string;
    reference: string;
    description: string;
    lines: JournalLine[];
  }>({
    date: new Date().toISOString().slice(0, 10),
    reference: "",
    description: "",
    lines: [blankLine(), blankLine()],
  });

  const filtered = entries.filter((e) => {
    if (statusFilter !== "All" && e.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return (
      e.id.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.reference.toLowerCase().includes(q)
    );
  });

  function openCreate() {
    setEditId(null);
    setForm({
      date: new Date().toISOString().slice(0, 10),
      reference: "",
      description: "",
      lines: [blankLine(), blankLine()],
    });
    setModalOpen(true);
  }

  function openEdit(e: JournalEntry) {
    setEditId(e.id);
    setForm({
      date: e.date,
      reference: e.reference,
      description: e.description,
      lines: e.lines.map((l) => ({ ...l })),
    });
    setModalOpen(true);
  }

  function addLine() {
    setForm((f) => ({ ...f, lines: [...f.lines, blankLine()] }));
  }

  function removeLine(id: string) {
    setForm((f) => ({ ...f, lines: f.lines.filter((l) => l.id !== id) }));
  }

  function updateLine(
    id: string,
    field: keyof JournalLine,
    value: string | number,
  ) {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        if (field === "account") {
          const acct = accounts.find((a) => a.name === value);
          if (acct) updated.glCode = acct.code;
        }
        return updated;
      }),
    }));
  }

  const totalDebits = form.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredits = form.lines.reduce((s, l) => s + (l.credit || 0), 0);
  const isBalanced = totalDebits === totalCredits && totalDebits > 0;

  function saveEntry(status: EntryStatus) {
    if (!form.description || !isBalanced) return;
    if (editId) {
      setEntries((prev) => prev.map((e) => e.id === editId ? { ...e, ...form, status } : e));
      logChange({ module: "Finance", action: "Updated", entityType: "JournalEntry", entityId: editId, summary: `Journal Entry: ${form.description} updated [${status}]`, performedBy: "Current User" });
    } else {
      const newEntry: JournalEntry = {
        id: getNextId("JournalEntry"),
        ...form, status, createdBy: getAuthUserName() || "Current User",
      };
      setEntries([newEntry, ...entries]);
      logChange({ module: "Finance", action: "Created", entityType: "JournalEntry", entityId: newEntry.id, summary: `Journal Entry ${newEntry.id}: ${form.description} [${status}]`, performedBy: "Current User" });
    }
    setModalOpen(false);
  }

  function deleteEntry(id: string) {
    const entry = entries.find(e => e.id === id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (entry) logChange({ module: "Finance", action: "Deleted", entityType: "JournalEntry", entityId: entry.id, summary: `Journal Entry ${entry.id}: ${entry.description} deleted`, performedBy: "Current User" });
  }

  function handleExport() {
    const rows = filtered.flatMap((e) =>
      e.lines.map((l) => [
        e.id,
        e.date,
        e.reference,
        e.description,
        e.status,
        l.account,
        l.glCode,
        String(l.debit || ""),
        String(l.credit || ""),
        l.description,
      ]),
    );
    exportCSV(
      "journal-entries",
      [
        "JE ID",
        "Date",
        "Reference",
        "Description",
        "Status",
        "Account",
        "GL Code",
        "Debit",
        "Credit",
        "Line Note",
      ],
      rows,
    );
  }

  const fmt = (n: number) =>
    n ? formatCurrencyByGeneralSettings(n, { minimumFractionDigits: 0 }) : "—";

  const columns: Column<JournalEntry>[] = [
    { key: "id", label: "JE ID", render: e => <span className="font-mono text-xs text-gray-700 font-medium">{e.id}</span>, sortable: true, filterable: true, minWidth: 90 },
    { key: "date", label: "Date", render: e => <span className="text-sm text-gray-600">{e.date}</span>, sortable: true, filterable: false },
    { key: "reference", label: "Reference", render: e => <span className="text-sm text-gray-600">{e.reference}</span>, sortable: true, filterable: true },
    { key: "description", label: "Description", render: e => <span className="text-sm text-gray-900 font-medium">{e.description}</span>, sortable: true, filterable: true, minWidth: 200 },
    { key: "total", label: "Total (₦)", render: e => <span className="text-sm font-medium text-gray-900">{fmt(e.lines.reduce((s, l) => s + l.debit, 0))}</span>, sortable: true, filterable: false, className: "text-right", headerClassName: "text-right" },
    { key: "status", label: "Status", render: e => <span className={`px-2 py-0.5 text-xs rounded font-semibold ${STATUS_STYLES[e.status]}`}>{e.status}</span>, sortable: true, filterable: true },
    { key: "createdBy", label: "Created By", render: e => <span className="text-sm text-gray-500">{e.createdBy}</span>, sortable: true, filterable: true },
    { key: "actions", label: "Actions", render: e => (
      <div className="flex items-center justify-end gap-1">
        <button onClick={() => setViewEntry(e)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700"><Eye className="w-3.5 h-3.5" /></button>
        {e.status === "Draft" && <button onClick={() => openEdit(e)} className="p-1.5 hover:bg-emerald-50 rounded-lg text-gray-400 hover:text-emerald-600"><Edit className="w-3.5 h-3.5" /></button>}
        {e.status === "Draft" && <button onClick={() => deleteEntry(e.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>}
      </div>
    ), sortable: false, filterable: false, className: "text-right", headerClassName: "text-right" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Journal Entries
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Double-entry bookkeeping ledger
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Export CSV
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" /> New Journal Entry
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entries..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        {(["All", "Draft", "Posted", "Reversed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${statusFilter === s ? "bg-emerald-600 text-white border-emerald-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Entries",
            value: entries.length,
            sub: `${entries.filter((e) => e.status === "Posted").length} posted`,
          },
          {
            label: "Total Debits",
            value: formatCurrencyByGeneralSettings(
              entries
                .filter((e) => e.status === "Posted")
                .flatMap((e) => e.lines)
                .reduce((s, l) => s + l.debit, 0),
              { minimumFractionDigits: 0 },
            ),
            sub: "Posted entries",
          },
          {
            label: "Total Credits",
            value: formatCurrencyByGeneralSettings(
              entries
                .filter((e) => e.status === "Posted")
                .flatMap((e) => e.lines)
                .reduce((s, l) => s + l.credit, 0),
              { minimumFractionDigits: 0 },
            ),
            sub: "Posted entries",
          },
        ].map((c) => (
          <div
            key={c.label}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="text-xl font-semibold text-gray-900 mt-1">
              {c.value}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={filtered} keyExtractor={e => e.id}
        searchPlaceholder="Search journal entries..."
        searchFields={[e => e.id, e => e.description, e => e.reference]}
        emptyMessage="No journal entries found" />

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 py-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                {editId ? "Edit Journal Entry" : "New Journal Entry"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Header Fields */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Reference
                  </label>
                  <input
                    value={form.reference}
                    onChange={(e) =>
                      setForm({ ...form, reference: e.target.value })
                    }
                    placeholder="e.g. REF-EXP-0042"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Description *
                  </label>
                  <input
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Entry description"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Lines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-700">
                    Journal Lines
                  </label>
                  <button
                    onClick={addLine}
                    className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add line
                  </button>
                </div>
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">
                          Account
                        </th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-20">
                          GL Code
                        </th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-28">
                          Debit
                        </th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-28">
                          Credit
                        </th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">
                          Note
                        </th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {form.lines.map((line) => (
                        <tr key={line.id}>
                          <td className="px-2 py-1.5">
                            <select
                              value={line.account}
                              onChange={(e) =>
                                updateLine(line.id, "account", e.target.value)
                              }
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                              <option value="">Select account</option>
                              {accounts.map((a) => (
                                <option key={a.code} value={a.name}>
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              value={line.glCode}
                              readOnly
                              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 font-mono text-gray-500"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min={0}
                              value={line.debit || ""}
                              onChange={(e) =>
                                updateLine(
                                  line.id,
                                  "debit",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              placeholder="0"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min={0}
                              value={line.credit || ""}
                              onChange={(e) =>
                                updateLine(
                                  line.id,
                                  "credit",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              placeholder="0"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              value={line.description}
                              onChange={(e) =>
                                updateLine(
                                  line.id,
                                  "description",
                                  e.target.value,
                                )
                              }
                              placeholder="Note"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            {form.lines.length > 2 && (
                              <button
                                onClick={() => removeLine(line.id)}
                                className="p-1 text-gray-400 hover:text-red-500"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td colSpan={2} className="px-3 py-2 text-xs font-semibold text-gray-600 text-right">Totals:</td>
                        <td className="px-3 py-2 text-xs font-bold text-emerald-700">{totalDebits.toLocaleString()}</td>
                        <td className="px-3 py-2 text-xs font-bold text-red-600">{totalCredits.toLocaleString()}</td>
                        <td colSpan={2} className="px-3 py-2">
                          {totalDebits > 0 && (
                            <span
                              className={`text-xs font-semibold ${isBalanced ? "text-emerald-600" : "text-red-600"}`}
                            >
                              {isBalanced
                                ? "✓ Balanced"
                                : `Difference: ${formatCurrencyByGeneralSettings(Math.abs(totalDebits - totalCredits), { minimumFractionDigits: 0 })}`}
                            </span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Entry must be balanced (Debits = Credits) before posting.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveEntry("Draft")}
                  disabled={!form.description}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                >
                  Save as Draft
                </button>
                <button
                  onClick={() => saveEntry("Posted")}
                  disabled={!isBalanced || !form.description}
                  className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40"
                >
                  Post Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-gray-900">
                  {viewEntry.id}
                </h2>
                <span
                  className={`px-2 py-0.5 text-xs rounded font-semibold ${STATUS_STYLES[viewEntry.status]}`}
                >
                  {viewEntry.status}
                </span>
              </div>
              <button
                onClick={() => setViewEntry(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="font-medium text-gray-900">{viewEntry.date}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Reference</p>
                  <p className="font-medium text-gray-900">
                    {viewEntry.reference}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Created By</p>
                  <p className="font-medium text-gray-900">
                    {viewEntry.createdBy}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm font-medium text-gray-900">
                  {viewEntry.description}
                </p>
              </div>
              <table className="w-full text-sm rounded-lg overflow-hidden border border-gray-200">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">
                      Account
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">
                      GL
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">
                      Debit
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">
                      Credit
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {viewEntry.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="px-3 py-2 font-medium text-gray-800">
                        {l.account}
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-500 text-xs">
                        {l.glCode}
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-700 font-medium">
                        {l.debit ? fmt(l.debit) : ""}
                      </td>
                      <td className="px-3 py-2 text-right text-red-600 font-medium">
                        {l.credit ? fmt(l.credit) : ""}
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">
                        {l.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
