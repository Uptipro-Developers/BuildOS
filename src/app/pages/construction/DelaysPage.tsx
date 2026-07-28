import { useParams } from "react-router";
import { useState, useEffect } from "react";
import {
  Clock,
  AlertTriangle,
  Search,
  Eye,
} from "lucide-react";
import { getProjectById, delays, fmtDate } from "./mockData";
import type { Delay } from "./types";
import { listDelays } from "../../api/delays";

function calcDaysDelayed(plannedEndDate: string): number {
  return Math.max(
    0,
    Math.floor(
      (new Date().getTime() - new Date(plannedEndDate).getTime()) / 86400000,
    ),
  );
}

const statusColors: Record<string, string> = {
  Open: "bg-red-100 text-red-700",
  "Recovery Underway": "bg-amber-100 text-amber-700",
  Resolved: "bg-green-100 text-green-700",
};

export function DelaysPage() {
  const { id } = useParams();
  const project = id ? getProjectById(id) : undefined;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [delayStates, setDelayStates] = useState<Record<string, Delay>>({});
  const [selectedDelay, setSelectedDelay] = useState<Delay | null>(null);
  const [editingField, setEditingField] = useState<{
    id: string;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  const [projectDelays, setProjectDelays] = useState<Delay[]>(() =>
    id ? delays.filter((d) => d.projectId === id) : [],
  );
  useEffect(() => {
    if (!id) return;
    let active = true;
    listDelays(id)
      .then((data) => {
        if (active && data.length > 0) setProjectDelays(data);
      })
      .catch(() => {
        /* keep mock data on failure */
      });
    return () => {
      active = false;
    };
  }, [id]);

  function getD(d: Delay): Delay {
    return delayStates[d.id] ?? d;
  }

  function updateDelay(id: string, updates: Partial<Delay>) {
    setDelayStates((s) => ({
      ...s,
      [id]: { ...getD(delays.find((d) => d.id === id)!), ...updates },
    }));
  }

  function startEdit(delayId: string, field: string, currentValue: string) {
    setEditingField({ id: delayId, field });
    setEditValue(currentValue);
  }

  function saveEdit() {
    if (!editingField) return;
    updateDelay(editingField.id, { [editingField.field]: editValue });
    setEditingField(null);
    setEditValue("");
  }

  function cancelEdit() {
    setEditingField(null);
    setEditValue("");
  }

  const filtered = projectDelays.filter((d) => {
    const dl = getD(d);
    if (
      search &&
      !dl.taskName.toLowerCase().includes(search.toLowerCase()) &&
      !dl.stagePhase.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (statusFilter !== "all" && dl.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Delays</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {project ? `${project.name} — ` : ""}Monitor and manage schedule
          delays
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">
            Auto-populated from schedule
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Delays are automatically generated when a task's RAG status is set
            to <strong>Red</strong> in the project schedule. Days delayed is
            calculated from the planned end date.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by task or stage…"
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 w-full"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2"
        >
          <option value="all">All Statuses</option>
          {["Open", "Recovery Underway", "Resolved"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Task
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Stage
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Planned End
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Days Delayed
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Root Cause
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Recovery Plan
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Owner
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Revised End
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((d) => {
              const dl = getD(d);
              const days = calcDaysDelayed(dl.plannedEndDate);
              const isEditing = editingField?.id === dl.id;
              return (
                <tr key={dl.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {dl.taskName}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {dl.stagePhase}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {fmtDate(dl.plannedEndDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-mono font-medium ${days > 30 ? "text-red-600" : days > 14 ? "text-amber-600" : "text-gray-600"}`}
                    >
                      {days} days
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 text-sm ${isEditing && editingField?.field === "rootCause" ? "p-1" : ""}`}
                  >
                    {isEditing && editingField?.field === "rootCause" ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="border border-amber-400 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1"
                        />
                        <button
                          onClick={saveEdit}
                          className="text-xs text-amber-600 font-medium"
                        >
                          OK
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-xs text-gray-400"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() =>
                          startEdit(dl.id, "rootCause", dl.rootCause)
                        }
                        className="cursor-pointer hover:text-amber-700 group inline-flex items-center gap-1"
                      >
                        {dl.rootCause || "—"}
                        <span className="text-[10px] text-gray-300 group-hover:text-amber-400">
                          &#9998;
                        </span>
                      </span>
                    )}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm text-gray-700 max-w-[200px] ${isEditing && editingField?.field === "recoveryPlan" ? "p-1" : ""}`}
                  >
                    {isEditing && editingField?.field === "recoveryPlan" ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="border border-amber-400 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1"
                        />
                        <button
                          onClick={saveEdit}
                          className="text-xs text-amber-600 font-medium"
                        >
                          OK
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-xs text-gray-400"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() =>
                          startEdit(dl.id, "recoveryPlan", dl.recoveryPlan)
                        }
                        className="cursor-pointer hover:text-amber-700 group inline-flex items-center gap-1"
                      >
                        {dl.recoveryPlan || "—"}
                        <span className="text-[10px] text-gray-300 group-hover:text-amber-400">
                          &#9998;
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {dl.ownerId}
                  </td>
                  <td
                    className={`px-4 py-3 text-xs ${isEditing && editingField?.field === "revisedEndDate" ? "p-1" : ""}`}
                  >
                    {isEditing && editingField?.field === "revisedEndDate" ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          type="date"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="border border-amber-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1"
                        />
                        <button
                          onClick={saveEdit}
                          className="text-xs text-amber-600 font-medium"
                        >
                          OK
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-xs text-gray-400"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <span
                        onClick={() =>
                          startEdit(dl.id, "revisedEndDate", dl.revisedEndDate)
                        }
                        className="cursor-pointer hover:text-amber-700 group inline-flex items-center gap-1"
                      >
                        {dl.revisedEndDate ? fmtDate(dl.revisedEndDate) : "—"}
                        <span className="text-[10px] text-gray-300 group-hover:text-amber-400">
                          &#9998;
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColors[dl.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {dl.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedDelay(dl)}
                      className="p-1 rounded hover:bg-gray-200 text-gray-400"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No delays recorded</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedDelay &&
        (() => {
          const dl = getD(selectedDelay);
          return (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedDelay(null)}
            >
              <div
                className="bg-white rounded-xl shadow-2xl max-w-xl w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {dl.id}
                    </span>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {dl.taskName}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedDelay(null)}
                    className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                  >
                    &times;
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                        Stage / Phase
                      </p>
                      <p className="text-sm text-gray-900">{dl.stagePhase}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                        Planned End Date
                      </p>
                      <p className="text-sm text-gray-900">
                        {fmtDate(dl.plannedEndDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                        Days Delayed
                      </p>
                      <p
                        className={`text-sm font-mono font-medium ${calcDaysDelayed(dl.plannedEndDate) > 30 ? "text-red-600" : "text-amber-600"}`}
                      >
                        {calcDaysDelayed(dl.plannedEndDate)} days
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                        Owner
                      </p>
                      <p className="text-sm text-gray-900">{dl.ownerId}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Root Cause
                    </p>
                    <textarea
                      value={dl.rootCause}
                      onChange={(e) =>
                        updateDelay(dl.id, { rootCause: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                      rows={2}
                    />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Recovery Plan
                    </p>
                    <textarea
                      value={dl.recoveryPlan}
                      onChange={(e) =>
                        updateDelay(dl.id, { recoveryPlan: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                      rows={2}
                    />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Recovery Actions
                    </p>
                    <p className="text-sm text-gray-700">
                      {dl.recoveryActions || "—"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                        Revised End Date
                      </p>
                      <input
                        type="date"
                        value={dl.revisedEndDate}
                        onChange={(e) =>
                          updateDelay(dl.id, { revisedEndDate: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                        Status
                      </p>
                      <select
                        value={dl.status}
                        onChange={(e) =>
                          updateDelay(dl.id, {
                            status: e.target.value as Delay["status"],
                          })
                        }
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="Open">Open</option>
                        <option value="Recovery Underway">
                          Recovery Underway
                        </option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
