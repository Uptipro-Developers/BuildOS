import { useCallback, useEffect, useState, type ReactNode } from "react";
import { FileText, Loader2, Package, X } from "lucide-react";
import { getGoodsReceipts } from "../api/goods-receipts";
import { fetchPurchaseOrders } from "../api/purchase-orders";
import {
  getPurchaseInvoices,
  getPurchaseRequests,
  getReceivedQuotes,
  getSentRFQs,
} from "../api/procurement-requests";
import {
  getMaterialRequests,
  getMaterials,
  getStockTransfers,
} from "../api/materials";
import { formatDateByGeneralSettings } from "../utils/generalSettings";
import { getJournalEntries, getTransactions } from "../api/finance-extras";
import { fetchPayments } from "../api/payments";

type PreviewRecord = {
  type: string;
  reference: string;
  title: string;
  status?: string;
  fields: { label: string; value: ReactNode }[];
  items?: { name: string; quantity?: ReactNode; detail?: ReactNode }[];
};

// Implicit previews must look like identifiers, not ordinary words. The old
// expression allowed an optional separator followed by any letter, so labels
// such as "Process Configuration" were interpreted as a PR reference and the
// capture-phase click handler cancelled their navigation.
const REFERENCE_PATTERN = /\b(?:GRN|PR|PO|MRQ?|TRF|RET|RFQ|INV|SKU|JE|PAY)(?:[-\/][A-Z0-9][A-Z0-9._\/-]*|\d[A-Z0-9._\/-]*)\b/i;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function same(a: unknown, b: string) {
  return clean(a).toLowerCase() === b.toLowerCase();
}

function baseMaterialRequestRef(reference: string) {
  return reference.replace(/\/\d+$/, "");
}

async function resolveReference(reference: string): Promise<PreviewRecord | null> {
  const ref = reference.trim();
  const results = await Promise.allSettled([
    getGoodsReceipts(),
    fetchPurchaseOrders(),
    getPurchaseRequests(),
    getPurchaseInvoices(),
    getSentRFQs(),
    getReceivedQuotes(),
    getMaterialRequests(),
    getStockTransfers(),
    getMaterials(),
    getJournalEntries(),
    fetchPayments(),
    getTransactions(),
  ]);
  const value = <T,>(index: number): T[] => results[index].status === "fulfilled" ? results[index].value as T[] : [];

  const grn: any = value<any>(0).find((row) => same(row.reference, ref) || same(row.id, ref));
  if (grn) return {
    type: "Goods Receipt", reference: grn.reference, title: grn.supplierName || "Goods receipt", status: grn.status,
    fields: [
      { label: "Purchase order", value: grn.poRef || "—" }, { label: "Material request", value: grn.mrRef || "—" },
      { label: "Destination store", value: grn.storeName || "—" }, { label: "Received by", value: grn.receivedBy || "—" },
      { label: "Received date", value: grn.receivedDate ? formatDateByGeneralSettings(grn.receivedDate) : "—" },
      { label: "Stock posting", value: grn.stockPostedAt ? "Posted to stock" : "Not posted" },
    ],
    items: (grn.items ?? []).map((item: any) => ({ name: item.material, quantity: `${item.accepted ?? item.received ?? 0} / ${item.ordered} ${item.unit}`, detail: item.rejected ? `${item.rejected} rejected` : undefined })),
  };

  const po: any = value<any>(1).find((row) => same(row.poRef, ref) || same(row.id, ref));
  if (po) return {
    type: "Purchase Order", reference: po.poRef, title: po.supplier || "Purchase order", status: po.status,
    fields: [
      { label: "Purchase request", value: po.prRef || "—" }, { label: "Material request", value: po.mrRef || "—" },
      { label: "Created", value: po.createdDate || "—" }, { label: "Expected", value: po.expectedDate || "—" },
      { label: "Total value", value: po.totalValue ?? 0 }, { label: "Received value", value: po.receivedValue ?? 0 },
    ],
    items: (po.items ?? []).map((item: any) => ({ name: item.material, quantity: `${item.qty} ${item.unit}`, detail: `${item.received ?? 0} received` })),
  };

  const pr: any = value<any>(2).find((row) => same(row.prRef, ref) || same(row.id, ref));
  if (pr) return {
    type: "Purchase Request", reference: pr.prRef, title: pr.title || "Purchase request", status: pr.status,
    fields: [
      { label: "Project", value: pr.projectName || "—" }, { label: "Material request", value: pr.mrRef || "—" },
      { label: "Priority", value: pr.priority || "—" }, { label: "Requested by", value: pr.requestedBy || "—" },
      { label: "Created", value: pr.createdAt ? formatDateByGeneralSettings(pr.createdAt) : "—" },
    ],
    items: (pr.items ?? []).map((item: any) => ({ name: item.material || item.description, quantity: `${item.qty ?? 0} ${item.unit ?? ""}` })),
  };

  const invoice: any = value<any>(3).find((row) => same(row.invoiceNo, ref) || same(row.id, ref));
  if (invoice) return {
    type: "Purchase Invoice", reference: invoice.invoiceNo, title: invoice.supplierName || "Purchase invoice", status: invoice.status,
    fields: [
      { label: "Purchase order", value: invoice.poRef || "—" }, { label: "Invoice date", value: formatDateByGeneralSettings(invoice.invoiceDate) },
      { label: "Due date", value: formatDateByGeneralSettings(invoice.dueDate) }, { label: "Total", value: invoice.total ?? 0 },
    ], items: (invoice.lines ?? []).map((item: any) => ({ name: item.description || item.material, quantity: `${item.qty ?? 0} ${item.unit ?? ""}` })),
  };

  const rfq: any = [...value<any>(4), ...value<any>(5)].find((row) => same(row.rfqRef, ref) || same(row.id, ref));
  if (rfq) return {
    type: "Request for Quotation", reference: rfq.rfqRef, title: rfq.supplierName || "RFQ", status: rfq.status,
    fields: [
      { label: "Purchase request", value: rfq.prRef || "—" }, { label: "Supplier", value: rfq.supplierName || "—" },
      { label: "Total value", value: rfq.totalValue ?? "—" }, { label: "Destination store", value: rfq.destinationStore || "—" },
    ], items: (rfq.items ?? []).map((item: any) => ({ name: item.material || item.description, quantity: `${item.qty ?? 0} ${item.unit ?? ""}` })),
  };

  const requestRows: any[] = value<any>(6).filter((row) => same(row.reference, ref) || same(baseMaterialRequestRef(row.reference), baseMaterialRequestRef(ref)) || same(row.id, ref));
  if (requestRows.length) {
    const request = requestRows[0];
    return {
      type: "Material Request", reference: baseMaterialRequestRef(request.reference), title: request.purpose || "Material request", status: request.fulfillmentStatus || request.status,
      fields: [
        { label: "Destination store", value: request.storeName || "—" }, { label: "Project", value: request.projectName || "—" },
        { label: "Requested by", value: request.requestedBy || "—" }, { label: "Fulfilment route", value: request.fulfillmentMethod?.replace(/_/g, " ") || "Awaiting decision" },
        { label: "Purchase request", value: request.prRef || "—" }, { label: "Stock transfer", value: request.stockTransferRef || "—" },
      ], items: requestRows.map((item) => ({ name: item.materialName, quantity: `${item.qty} ${item.unit}` })),
    };
  }

  const transfer: any = value<any>(7).find((row) => same(row.reference, ref) || same(row.id, ref));
  if (transfer) return {
    type: "Stock Transfer", reference: transfer.reference, title: `${transfer.fromStoreName} → ${transfer.toStoreName}`, status: transfer.status,
    fields: [
      { label: "From", value: transfer.fromStoreName }, { label: "To", value: transfer.toStoreName },
      { label: "Requested by", value: transfer.requestedBy || "—" }, { label: "Approved by", value: transfer.approvedBy || "—" },
      { label: "Request date", value: formatDateByGeneralSettings(transfer.requestDate) },
    ], items: (transfer.items ?? []).map((item: any) => ({ name: item.materialName, quantity: `${item.qty} ${item.unit ?? ""}` })),
  };

  const material: any = value<any>(8).find((row) => same(row.sku, ref) || same(row.id, ref) || same(row.name, ref));
  if (material) return {
    type: "Material", reference: material.sku || material.id, title: material.name, status: material.availableQty > 0 ? "In stock" : "Out of stock",
    fields: [
      { label: "Category", value: material.category || "—" }, { label: "Unit", value: material.unit || material.dimensions?.[0]?.unit || "—" },
      { label: "Organization total", value: material.totalQty ?? 0 }, { label: "Available", value: material.availableQty ?? 0 },
      { label: "Reserved", value: material.reservedQty ?? 0 }, { label: "Reorder level", value: material.reorderLevel ?? 0 },
    ], items: (material.dimensions ?? []).map((dimension: any) => ({ name: dimension.kind || "Dimension", quantity: [dimension.value, dimension.unit].filter(Boolean).join(" ") })),
  };

  const journal: any = value<any>(9).find((row) => same(row.reference, ref) || same(row.id, ref));
  if (journal) return {
    type: "Journal Entry", reference: journal.reference, title: journal.description || "Journal entry", status: journal.status,
    fields: [
      { label: "Date", value: formatDateByGeneralSettings(journal.date) }, { label: "Source", value: journal.sourceModule || "Journal" },
      { label: "Source reference", value: journal.sourceRef || "—" }, { label: "Created by", value: journal.createdBy || "—" },
      { label: "Debits", value: (journal.lines ?? []).reduce((sum: number, line: any) => sum + Number(line.debit || 0), 0) },
      { label: "Credits", value: (journal.lines ?? []).reduce((sum: number, line: any) => sum + Number(line.credit || 0), 0) },
    ], items: (journal.lines ?? []).map((line: any) => ({ name: `${line.accountCode || ""} ${line.accountName || "Account"}`.trim(), quantity: line.debit ? `Debit ${line.debit}` : `Credit ${line.credit}`, detail: line.description })),
  };

  const payment: any = value<any>(10).find((row) => same(row.reference, ref) || same(row.id, ref));
  if (payment) return {
    type: "Payment", reference: payment.reference || payment.id, title: payment.recipient || "Payment", status: payment.status,
    fields: [
      { label: "Type", value: payment.type || "—" }, { label: "Amount", value: payment.amount ?? 0 },
      { label: "Method", value: payment.method || "—" }, { label: "Bank", value: payment.bank || "—" },
      { label: "Date", value: payment.date || "—" }, { label: "Initiated by", value: payment.initiatedBy || "—" },
    ],
  };

  const transaction: any = value<any>(11).find((row) => same(row.reference, ref) || same(row.id, ref));
  if (transaction) return {
    type: "Transaction", reference: transaction.reference || transaction.id, title: transaction.description || "Transaction", status: transaction.status,
    fields: [
      { label: "Type", value: transaction.type || "—" }, { label: "Category", value: transaction.category || "—" },
      { label: "Amount", value: `${transaction.currency || ""} ${transaction.amount ?? 0}`.trim() },
      { label: "Date", value: formatDateByGeneralSettings(transaction.date) }, { label: "Created by", value: transaction.createdBy || "—" },
    ],
  };
  return null;
}

export function ReferenceLink({ reference, children, className = "" }: { reference: string; children?: ReactNode; className?: string }) {
  return <button type="button" data-reference={reference} onClick={(event) => event.stopPropagation()} className={`font-mono text-left text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded ${className}`}>{children ?? reference}</button>;
}

export function ReferencePreview() {
  const [reference, setReference] = useState("");
  const [record, setRecord] = useState<PreviewRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const open = useCallback((nextReference: string) => {
    setReference(nextReference); setRecord(null); setNotFound(false); setLoading(true);
    resolveReference(nextReference).then((result) => { setRecord(result); setNotFound(!result); }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const click = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const explicit = target.closest<HTMLElement>("[data-reference]");
      if (explicit) { open(explicit.dataset.reference || explicit.textContent || ""); return; }
      if (target.closest("[data-reference-preview],button,input,select,textarea")) return;
      const candidate = target.closest<HTMLElement>("span,td,code,p,a");
      const match = candidate?.innerText?.trim().match(REFERENCE_PATTERN);
      if (match) {
        if (candidate?.tagName === "A") event.preventDefault();
        open(match[0]);
      }
    };
    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, [open]);

  if (!reference) return null;
  return <div data-reference-preview className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setReference(""); }}>
    <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col">
      <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3"><span className="mt-0.5 rounded-lg bg-blue-50 p-2 text-blue-700">{record?.type === "Material" ? <Package className="w-4 h-4" /> : <FileText className="w-4 h-4" />}</span><div><p className="text-xs font-medium text-gray-500">{record?.type || "Reference preview"}</p><h2 className="font-mono text-base font-semibold text-gray-900">{record?.reference || reference}</h2>{record?.title && <p className="text-sm text-gray-600 mt-0.5">{record.title}</p>}</div></div>
        <button onClick={() => setReference("")} className="p-1 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-6 overflow-y-auto">
        {loading && <div className="py-12 flex items-center justify-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading reference…</div>}
        {notFound && <div className="py-10 text-center"><p className="text-sm font-medium text-gray-800">Reference not found</p><p className="text-xs text-gray-500 mt-1">No supported record currently matches {reference}.</p></div>}
        {record && <div className="space-y-5">
          {record.status && <div><span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold capitalize text-gray-700">{record.status.replace(/_/g, " ")}</span></div>}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">{record.fields.map((field) => <div key={field.label} className="rounded-xl border border-gray-100 bg-gray-50 p-3"><dt className="text-[11px] uppercase tracking-wide text-gray-400">{field.label}</dt><dd className="mt-1 text-sm font-medium text-gray-800 break-words">{field.value}</dd></div>)}</dl>
          {record.items && record.items.length > 0 && <section><h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Contents ({record.items.length})</h3><div className="space-y-2 max-h-64 overflow-y-auto">{record.items.map((item, index) => <div key={`${item.name}-${index}`} className="rounded-xl border border-gray-200 p-3 flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-gray-900">{item.name}</p>{item.detail && <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>}</div>{item.quantity !== undefined && <span className="text-sm font-semibold text-gray-700">{item.quantity}</span>}</div>)}</div></section>}
        </div>}
      </div>
    </div>
  </div>;
}
