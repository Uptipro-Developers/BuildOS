import { useParams } from "react-router";
import { useState, useMemo, useEffect } from "react";
import { getCurrencySymbol } from "../../utils/generalSettings";
import {
  DollarSign,
  Plus,
  Search,
  Landmark,
  Wallet,
  Building2,
} from "lucide-react";
import {
  disbursements as mockDisbursements,
  getProjectById,
  projects,
  fmtCurrency,
  fmtDate,
} from "./mockData";
import type { Disbursement } from "./types";
import { listDisbursements, createDisbursement } from "../../api/disbursements";
import { useNumbering } from "../../stores/numberingStore";

const sourceStyles: Record<
  string,
  { bg: string; text: string; icon: React.ReactNode }
> = {
  finance: {
    bg: "bg-blue-100 text-blue-700",
    icon: <Landmark className="w-3.5 h-3.5" />,
    text: "blue",
  },
  "project-cash": {
    bg: "bg-green-100 text-green-700",
    icon: <Wallet className="w-3.5 h-3.5" />,
    text: "green",
  },
  "client-direct": {
    bg: "bg-purple-100 text-purple-700",
    icon: <Building2 className="w-3.5 h-3.5" />,
    text: "purple",
  },
};

const emptyForm: Omit<Disbursement, "id"> = {
  projectId: "",
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  source: "finance",
  reference: "",
  notes: "",
  allocatedTo: [],
};

export function DisbursementsPage() {
  const { getNextId } = useNumbering();
  const { id: projectId } = useParams<{ id: string }>();
  const project = projectId ? getProjectById(projectId) : null;
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [allDisbursements, setAllDisbursements] = useState(mockDisbursements);
  useEffect(() => {
    let active = true;
    listDisbursements(projectId)
      .then((data) => {
        if (active && data.length > 0) setAllDisbursements(data);
      })
      .catch(() => {
        /* keep mock data on failure */
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  const list = useMemo(() => {
    let base = projectId
      ? allDisbursements.filter((d) => d.projectId === projectId)
      : allDisbursements;
    if (search) {
      const q = search.toLowerCase();
      base = base.filter(
        (d) =>
          d.reference.toLowerCase().includes(q) ||
          d.notes.toLowerCase().includes(q),
      );
    }
    if (sourceFilter !== "All")
      base = base.filter((d) => d.source === sourceFilter);
    return base.sort((a, b) => b.date.localeCompare(a.date));
  }, [allDisbursements, projectId, search, sourceFilter]);

  const totalAmount = list.reduce((s, d) => s + d.amount, 0);

  function handleAdd() {
    if (!form.projectId || !form.amount) return;
    const newEntry: Disbursement = {
      id: getNextId("Disbursement"),
      ...form,
    };
    const { id: _omit, ...payload } = newEntry;
    createDisbursement(payload)
      .then((saved) => setAllDisbursements((prev) => [...prev, saved]))
      .catch(() => setAllDisbursements((prev) => [...prev, newEntry]));
    setShowForm(false);
    setForm(emptyForm);
  }

  const topProjects = useMemo(() => {
    if (projectId) return [];
    const map = new Map<string, number>();
    allDisbursements.forEach((d) =>
      map.set(d.projectId, (map.get(d.projectId) || 0) + d.amount),
    );
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [allDisbursements, projectId]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#E8973A", color: "white" }}
          >
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Disbursements
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {project ? project.name : "All projects"} — Payment tracking
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setForm({ ...emptyForm, projectId: projectId || projects[0].id });
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: "#E8973A" }}
        >
          <Plus className="w-4 h-4" /> Record Disbursement
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total Disbursements</p>
          <p className="text-xl font-bold text-gray-900">{list.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total Amount</p>
          <p className="text-xl font-bold" style={{ color: "#E8973A" }}>
            {fmtCurrency(totalAmount)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">From Finance</p>
          <p className="text-xl font-bold text-blue-600">
            {fmtCurrency(
              list
                .filter((d) => d.source === "finance")
                .reduce((s, d) => s + d.amount, 0),
            )}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Project Cash / Petty</p>
          <p className="text-xl font-bold text-green-600">
            {fmtCurrency(
              list
                .filter((d) => d.source === "project-cash")
                .reduce((s, d) => s + d.amount, 0),
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search disbursements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm"
            style={{ borderColor: "#E2E8F0" }}
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: "#E2E8F0" }}
        >
          <option value="All">All Sources</option>
          <option value="finance">Finance</option>
          <option value="project-cash">Project Cash</option>
          <option value="client-direct">Client Direct</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {!projectId && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Project
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Reference
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Source
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Notes
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Allocated To
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {list.map((d) => {
              const st = sourceStyles[d.source] || sourceStyles.finance;
              const proj = projects.find((p) => p.id === d.projectId);
              return (
                <tr key={d.id} className="hover:bg-gray-50">
                  {!projectId && (
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {proj?.name || d.projectId}
                    </td>
                  )}
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {d.reference}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{fmtDate(d.date)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${st.bg}`}
                    >
                      {st.icon}{" "}
                      {d.source === "finance"
                        ? "Finance"
                        : d.source === "project-cash"
                          ? "Project Cash"
                          : "Client Direct"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {fmtCurrency(d.amount)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                    {d.notes}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {d.allocatedTo.length > 0
                      ? `${d.allocatedTo.length} task(s)`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No disbursements recorded</p>
          </div>
        )}
      </div>

      {!projectId && topProjects.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Top Projects by Disbursement
          </h3>
          <div className="space-y-2">
            {topProjects.map(([pid, amt], i) => {
              const proj = projects.find((p) => p.id === pid);
              const maxAmt = topProjects[0][1];
              return (
                <div key={pid} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                  <span className="text-sm text-gray-900 flex-1 truncate">
                    {proj?.name || pid}
                  </span>
                  <div className="flex-1 max-w-xs">
                    <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(amt / maxAmt) * 100}%`,
                          backgroundColor: "#E8973A",
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-28 text-right">
                    {fmtCurrency(amt)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl w-full max-w-lg bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                Record Disbursement
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-5 space-y-4">
              {!projectId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project
                  </label>
                  <select
                    value={form.projectId}
                    onChange={(e) =>
                      setForm({ ...form, projectId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: "#E2E8F0" }}
                  >
                    <option value="">Select project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ({getCurrencySymbol()})
                </label>
                <input
                  type="number"
                  value={form.amount || ""}
                  onChange={(e) =>
                    setForm({ ...form, amount: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: "#E2E8F0" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: "#E2E8F0" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source
                </label>
                <select
                  value={form.source}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      source: e.target.value as Disbursement["source"],
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: "#E2E8F0" }}
                >
                  <option value="finance">Finance</option>
                  <option value="project-cash">Project Cash</option>
                  <option value="client-direct">Client Direct</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference
                </label>
                <input
                  type="text"
                  value={form.reference}
                  onChange={(e) =>
                    setForm({ ...form, reference: e.target.value })
                  }
                  placeholder="e.g. FIN-DIS-004"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: "#E2E8F0" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Purpose of disbursement..."
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ borderColor: "#E2E8F0" }}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border text-sm text-gray-600"
                style={{ borderColor: "#E2E8F0" }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 rounded-lg text-sm text-white font-medium"
                style={{ backgroundColor: "#E8973A" }}
              >
                Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
