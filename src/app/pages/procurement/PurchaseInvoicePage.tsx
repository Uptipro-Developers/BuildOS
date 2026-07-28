import { useState, useEffect } from "react";
import { Plus, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { exportCSV } from "../../utils/exportCSV";
import { DataTable, type Column } from "../../components/DataTable";
import { useChangelog } from "../../stores/changelogStore";
import {
  getPurchaseInvoices,
  createPurchaseInvoice,
  PurchaseInvoice as ApiPurchaseInvoice,
} from "../../api/procurement-requests";
import {
  getCurrencySymbol,
  formatNumberByGeneralSettings,
} from "../../utils/generalSettings";

type InvoiceStatus =
  | "Draft"
  | "Pending Approval"
  | "Approved"
  | "Paid"
  | "Overdue";

interface InvoiceLine {
  id: string;
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
}

interface PurchaseInvoice {
  id: string;
  invoiceNo: string;
  supplier: string;
  poRef: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  lines: InvoiceLine[];
}

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  Draft: "bg-gray-100 text-gray-600",
  "Pending Approval": "bg-yellow-50 text-yellow-700",
  Approved: "bg-blue-50 text-blue-700",
  Paid: "bg-green-50 text-green-700",
  Overdue: "bg-red-50 text-red-700",
};

// MOCK_INVOICES removed — data fetched from API

function fromApi(r: ApiPurchaseInvoice): PurchaseInvoice {
  return {
    id: r.id,
    invoiceNo: r.invoiceNo,
    supplier: r.supplierName,
    poRef: r.poRef ?? "",
    issueDate: r.invoiceDate,
    dueDate: r.dueDate,
    status: r.status as InvoiceStatus,
    lines: Array.isArray(r.lines)
      ? (
          r.lines as {
            id?: string;
            description?: string;
            qty?: number;
            unit?: string;
            unitPrice?: number;
          }[]
        ).map((l) => ({
          id: l.id ?? Math.random().toString(36).slice(2),
          description: l.description ?? "",
          qty: l.qty ?? 0,
          unit: l.unit ?? "Units",
          unitPrice: l.unitPrice ?? 0,
        }))
      : [],
  };
}

function lineTotal(lines: InvoiceLine[]) {
  return lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
}

function fmt(n: number) {
  return getCurrencySymbol() + formatNumberByGeneralSettings(n);
}

const BLANK_LINE = (): InvoiceLine => ({
  id: Math.random().toString(36).slice(2),
  description: "",
  qty: 1,
  unit: "Units",
  unitPrice: 0,
});

const BLANK_FORM = {
  invoiceNo: "",
  supplier: "",
  poRef: "",
  issueDate: "",
  dueDate: "",
  status: "Draft" as InvoiceStatus,
  lines: [BLANK_LINE()],
};

export function PurchaseInvoicePage() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "All">(
    "All",
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM, lines: [BLANK_LINE()] });
  const { logChange } = useChangelog();

  useEffect(() => {
    getPurchaseInvoices()
      .then((data) => setInvoices(data.map(fromApi)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = invoices.filter((inv) => {
    const matchSearch =
      inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      inv.supplier.toLowerCase().includes(search.toLowerCase()) ||
      inv.poRef.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading)
    return (
      <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
    );

  function addLine() {
    setForm((f) => ({ ...f, lines: [...f.lines, BLANK_LINE()] }));
  }

  function removeLine(id: string) {
    setForm((f) => ({ ...f, lines: f.lines.filter((l) => l.id !== id) }));
  }

  function updateLine(
    id: string,
    key: keyof InvoiceLine,
    value: string | number,
  ) {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l) => (l.id === id ? { ...l, [key]: value } : l)),
    }));
  }

  async function saveInvoice() {
    try {
      const created = await createPurchaseInvoice({
        invoiceNo: form.invoiceNo,
        supplierName: form.supplier,
        poRef: form.poRef,
        invoiceDate: form.issueDate,
        dueDate: form.dueDate,
        status: form.status,
        lines: form.lines,
      });
      setInvoices((prev) => [fromApi(created), ...prev]);
      logChange({ module: "Procurement", action: "Created", entityType: "PurchaseInvoice", entityId: created.id, summary: `Invoice ${form.invoiceNo} created — ${form.supplier}`, performedBy: "Current User" });
    } catch (e) {
      console.error(e);
    }
    setShowModal(false);
    setForm({ ...BLANK_FORM, lines: [BLANK_LINE()] });
  }

  function updateStatus(id: string, newStatus: InvoiceStatus) {
    setInvoices((prev) => prev.map((inv) => inv.id === id ? { ...inv, status: newStatus } : inv));
    logChange({ module: "Procurement", action: "StatusChanged", entityType: "PurchaseInvoice", entityId: id, summary: `Invoice ${id} status changed to ${newStatus}`, performedBy: "Current User" });
  }

  function deleteInvoice(id: string, invoiceNo: string) {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    logChange({ module: "Procurement", action: "Deleted", entityType: "PurchaseInvoice", entityId: id, summary: `Invoice ${invoiceNo} deleted`, performedBy: "Current User" });
    setExpanded((prev) => prev === id ? null : prev);
  }

  function handleExport() {
    exportCSV(
      "purchase-invoices",
      [
        "Invoice No",
        "Supplier",
        "PO Ref",
        "Issue Date",
        "Due Date",
        "Amount",
        "Status",
      ],
      invoices.map((inv) => [
        inv.invoiceNo,
        inv.supplier,
        inv.poRef,
        inv.issueDate,
        inv.dueDate,
        fmt(lineTotal(inv.lines)),
        inv.status,
      ]),
    );
  }

  const actionsFor = (inv: PurchaseInvoice) => {
    switch (inv.status) {
      case "Draft":
        return (
          <button onClick={() => updateStatus(inv.id, "Pending Approval")}
            className="text-xs text-blue-600 hover:underline">Submit →</button>
        );
      case "Pending Approval":
        return (
          <div className="flex gap-2">
            <button onClick={() => updateStatus(inv.id, "Approved")}
              className="text-xs text-green-600 hover:underline">Approve</button>
            <button onClick={() => updateStatus(inv.id, "Draft")}
              className="text-xs text-gray-500 hover:underline">Reject</button>
          </div>
        );
      case "Approved":
        return (
          <button onClick={() => updateStatus(inv.id, "Paid")}
            className="text-xs text-emerald-600 hover:underline">Pay →</button>
        );
      case "Overdue":
        return (
          <button onClick={() => updateStatus(inv.id, "Paid")}
            className="text-xs text-emerald-600 hover:underline">Pay →</button>
        );
      case "Paid":
        return (
          <button onClick={() => deleteInvoice(inv.id, inv.invoiceNo)}
            className="text-xs text-red-500 hover:underline">Delete</button>
        );
    }
  };

  const columns: Column<PurchaseInvoice>[] = [
    {
      key: "invoiceNo",
      label: "Invoice No",
      sortable: true,
      filterable: true,
      render: (inv) => <span className="font-mono text-xs text-gray-700">{inv.invoiceNo}</span>,
    },
    {
      key: "supplier",
      label: "Supplier",
      sortable: true,
      filterable: true,
      render: (inv) => <span className="font-medium text-gray-900">{inv.supplier}</span>,
    },
    {
      key: "description",
      label: "Description",
      sortable: true,
      filterable: true,
      minWidth: 200,
      render: (inv) => <span className="text-sm text-gray-600">{inv.lines.map(l => l.description).join(", ")}</span>,
    },
    {
      key: "amount",
      label: "Amount ($)",
      sortable: true,
      className: "text-right",
      headerClassName: "text-right",
      render: (inv) => <span className="font-semibold text-gray-900">{fmt(lineTotal(inv.lines))}</span>,
    },
    {
      key: "date",
      label: "Due Date",
      sortable: true,
      render: (inv) => <span className={`text-sm ${inv.status === "Overdue" ? "text-red-600 font-medium" : "text-gray-500"}`}>{inv.dueDate}</span>,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      filterable: true,
      render: (inv) => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status]}`}>{inv.status}</span>,
    },
    {
      key: "lines",
      label: "Lines",
      sortable: false,
      filterable: false,
      render: (inv) => (
        <button onClick={() => setExpanded((p) => (p === inv.id ? null : inv.id))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          {expanded === inv.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      filterable: false,
      render: (inv) => actionsFor(inv),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Purchase Invoices
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track and manage supplier invoices
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setForm({ ...BLANK_FORM, lines: [BLANK_LINE()] }); setShowModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded-xl text-sm hover:bg-blue-800">
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {(
          [
            "Draft",
            "Pending Approval",
            "Approved",
            "Overdue",
          ] as InvoiceStatus[]
        ).map((s) => {
          const count = invoices.filter((i) => i.status === s).length;
          const total = invoices
            .filter((i) => i.status === s)
            .reduce((acc, i) => acc + lineTotal(i.lines), 0);
          return (
            <div
              key={s}
              className={`p-4 rounded-xl border ${STATUS_STYLES[s]} border-current/20 bg-white`}
            >
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs font-medium mt-0.5">{s}</p>
              <p className="text-xs opacity-70 mt-0.5">{fmt(total)}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <input className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search invoices…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(
            [
              "All",
              "Draft",
              "Pending Approval",
              "Approved",
              "Paid",
              "Overdue",
            ] as const
          ).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-2.5 py-1.5 text-xs rounded-lg border font-medium ${statusFilter === f ? "bg-blue-700 text-white border-blue-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={inv => inv.id}
        searchPlaceholder="Search invoices..."
        searchFields={[inv => inv.invoiceNo, inv => inv.supplier, inv => inv.poRef]}
        emptyMessage="No invoices found"
        headerExtra={
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">
            <FileText className="w-3.5 h-3.5" /> Export
          </button>
        }
      />

      {/* Expanded line items */}
      {expanded && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          {invoices.filter(inv => inv.id === expanded).map(inv => (
            <div key={inv.id}>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Line Items — {inv.invoiceNo}</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                    <th className="pb-2 text-left font-medium">Description</th>
                    <th className="pb-2 text-right font-medium">Qty</th>
                    <th className="pb-2 text-right font-medium">Unit</th>
                    <th className="pb-2 text-right font-medium">Unit Price</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inv.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2 text-gray-700">{l.description}</td>
                      <td className="py-2 text-right text-gray-600">{l.qty}</td>
                      <td className="py-2 text-right text-gray-500">{l.unit}</td>
                      <td className="py-2 text-right text-gray-600">{fmt(l.unitPrice)}</td>
                      <td className="py-2 text-right font-medium text-gray-900">{fmt(l.qty * l.unitPrice)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={4} className="pt-3 text-right font-semibold text-gray-700 text-sm">Total</td>
                    <td className="pt-3 text-right font-bold text-gray-900">{fmt(lineTotal(inv.lines))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Create Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-900">
                New Purchase Invoice
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Invoice Number
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="INV-XXXX-0001"
                    value={form.invoiceNo}
                    onChange={(e) =>
                      setForm({ ...form, invoiceNo: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Supplier
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Supplier name"
                    value={form.supplier}
                    onChange={(e) =>
                      setForm({ ...form, supplier: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    PO Reference
                  </label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="PO-2025-XXX"
                    value={form.poRef}
                    onChange={(e) =>
                      setForm({ ...form, poRef: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Status
                  </label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as InvoiceStatus,
                      })
                    }
                  >
                    {(
                      [
                        "Draft",
                        "Pending Approval",
                        "Approved",
                      ] as InvoiceStatus[]
                    ).map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.issueDate}
                    onChange={(e) =>
                      setForm({ ...form, issueDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm({ ...form, dueDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Line Items
                  </p>
                  <button
                    onClick={addLine}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Line
                  </button>
                </div>
                <div className="space-y-2">
                  {form.lines.map((l) => (
                    <div
                      key={l.id}
                      className="grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-5">
                        <input
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Description"
                          value={l.description}
                          onChange={(e) =>
                            updateLine(l.id, "description", e.target.value)
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min={1}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Qty"
                          value={l.qty}
                          onChange={(e) =>
                            updateLine(l.id, "qty", Number(e.target.value))
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Unit"
                          value={l.unit}
                          onChange={(e) =>
                            updateLine(l.id, "unit", e.target.value)
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min={0}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Price"
                          value={l.unitPrice}
                          onChange={(e) =>
                            updateLine(
                              l.id,
                              "unitPrice",
                              Number(e.target.value),
                            )
                          }
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button
                          disabled={form.lines.length === 1}
                          onClick={() => removeLine(l.id)}
                          className="text-gray-400 hover:text-red-500 disabled:opacity-30"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-right">
                  <span className="text-sm font-semibold text-gray-700">
                    Total:{" "}
                    {fmt(
                      form.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0),
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveInvoice}
                disabled={!form.invoiceNo.trim() || !form.supplier.trim()}
                className="px-4 py-2 text-sm bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-50"
              >
                Save Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
