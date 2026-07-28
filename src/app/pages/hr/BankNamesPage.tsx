import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  CheckCircle,
} from "lucide-react";
import { apiFetch } from "../../api/client";
import { ConfirmationModal } from "../../components/ConfirmationModal";

interface Bank {
  id: string;
  name: string;
  code: string;
  country: string;
  swiftCode: string;
  active: boolean;
}

const EMPTY_FORM = { name: "", code: "", country: "Nigeria", swiftCode: "" };

export function BankNamesPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bank | null>(null);

  const toBank = (raw: any): Bank => ({
    id: raw.id,
    name: String(raw.name ?? ""),
    code: String(raw.code ?? ""),
    country: String(raw.country ?? "Nigeria"),
    swiftCode: String(raw.swiftCode ?? ""),
    active: raw.active !== false,
  });

  useEffect(() => {
    apiFetch<any[]>("/bank-names")
      .then((rows) => setBanks(rows.map(toBank)))
      .catch((err) => {
        console.error(err);
        setBanks([]);
      });
  }, []);

  const displayed = banks.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.code.includes(search) ||
      b.swiftCode.toLowerCase().includes(search.toLowerCase()),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editId) {
      apiFetch<any>(`/bank-names/${editId}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      })
        .then((updated) => {
          setBanks((prev) =>
            prev.map((b) => (b.id === editId ? toBank(updated) : b)),
          );
          setEditId(null);
          setForm(EMPTY_FORM);
          setShowAdd(false);
        })
        .catch((err) => {
          alert("Failed to update bank. Please try again.");
          console.error(err);
        });
    } else {
      apiFetch<any>("/bank-names", {
        method: "POST",
        body: JSON.stringify(form),
      })
        .then((created) => {
          setBanks((prev) => [...prev, toBank(created)]);
          setForm(EMPTY_FORM);
          setShowAdd(false);
        })
        .catch((err) => {
          alert("Failed to add bank. Please try again.");
          console.error(err);
        });
    }
  }

  function startEdit(b: Bank) {
    setForm({
      name: b.name,
      code: b.code,
      country: b.country,
      swiftCode: b.swiftCode,
    });
    setEditId(b.id);
    setShowAdd(true);
  }

  function toggleActive(id: string) {
    apiFetch<any>(`/bank-names/${id}/toggle`, {
      method: "PATCH",
    })
      .then((updated) => {
        setBanks((prev) =>
          prev.map((b) => (b.id === id ? toBank(updated) : b)),
        );
      })
      .catch((err) => {
        alert("Failed to toggle bank status. Please try again.");
        console.error(err);
      });
  }

  function removeBank(id: string) {
    apiFetch(`/bank-names/${id}`, { method: "DELETE" })
      .then(() => setBanks((prev) => prev.filter((x) => x.id !== id)))
      .catch((err) => {
        alert("Failed to delete bank. Please try again.");
        console.error(err);
      });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Bank Names</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {banks.filter((b) => b.active).length} active banks configured
          </p>
        </div>
        <button
          onClick={() => {
            setShowAdd(true);
            setEditId(null);
            setForm(EMPTY_FORM);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" /> Add Bank
        </button>
      </div>

      {showAdd && (
        <div className="bg-white border border-indigo-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {editId ? "Edit Bank" : "Add Bank"}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Bank Name *
              </label>
              <input
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Access Bank Plc"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Bank Code
              </label>
              <input
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="044"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Country
              </label>
              <select
                value={form.country}
                onChange={(e) =>
                  setForm((f) => ({ ...f, country: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {[
                  "Nigeria",
                  "USA",
                  "UK",
                  "Ghana",
                  "Kenya",
                  "South Africa",
                  "UAE",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                SWIFT / BIC Code
              </label>
              <input
                value={form.swiftCode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, swiftCode: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="XXNNCCXX"
              />
            </div>
            <div className="col-span-2 flex items-end gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                {editId ? "Save Changes" : "Add Bank"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  setEditId(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code, or SWIFT…"
          className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Bank Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Country
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                SWIFT
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span className="font-medium text-gray-900">{b.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-sm text-gray-600">
                  {b.code || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{b.country}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {b.swiftCode || "—"}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(b.id)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${b.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {b.active ? (
                      <>
                        <CheckCircle className="w-3 h-3" /> Active
                      </>
                    ) : (
                      "Inactive"
                    )}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(b)}
                      className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(b)}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {displayed.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">
            No banks match your search
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={deleteTarget !== null}
        title="Delete Bank?"
        description={
          deleteTarget
            ? `This will permanently remove "${deleteTarget.name}". This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        isDangerous={true}
        onConfirm={() => {
          if (!deleteTarget) return;
          removeBank(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
