import type { CompanyProfile } from "../api/admin-extras";
import type { TrancheTiming } from "../api/payment-terms";
import { formatCurrencyByGeneralSettings } from "../utils/generalSettings";

/**
 * The formal PO document — letterhead, supplier/delivery details, line
 * items, payment terms and a signature block.
 *
 * Shared between the Purchase Orders page (the create-flow preview and the
 * file-icon "Preview PO" re-view) and the Purchase Invoices page (previewing
 * the order an invoice was raised against), so both render the exact same
 * document instead of two copies that can drift apart.
 */
export interface PaymentTranche {
    title: string;
    percent: number;
    timing: TrancheTiming | string;
}

export interface PaymentTermPreset {
    id: string;
    name: string;
    description: string;
    deliverySplit: string;
    tranches: PaymentTranche[];
}

export interface Signatory {
    id: string;
    name: string;
    role: string;
    signature?: string | null;
}

export interface POPreviewItem {
    material: string;
    qty: number;
    unit: string;
    unitCost: number;
}

/** Used only while the real profile is still loading (or failed to load). */
export const BLANK_COMPANY_PROFILE: CompanyProfile = {
    id: "",
    name: "Your Company",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
};

/** "Address · City, State, Country · Phone", skipping whatever's blank. */
function companyLetterheadLine(company: CompanyProfile): string {
    const locality = [company.city, company.state].filter(Boolean).join(", ");
    const parts = [
        [company.address, locality, company.country].filter(Boolean).join(" · "),
        company.phone,
    ].filter(Boolean);
    return parts.join(" · ");
}

/** "City, Country" for the delivery block — falls back to the company name alone. */
function companyLocalityLine(company: CompanyProfile): string {
    return [company.city, company.country].filter(Boolean).join(", ");
}

export function PurchaseOrderPaper({
    company,
    poRef,
    createdDate,
    supplier,
    supplierContact,
    expectedDate,
    items,
    totalValue,
    term,
    signatories,
}: {
    company: CompanyProfile;
    poRef: string;
    createdDate: string;
    supplier: string;
    supplierContact: string;
    expectedDate: string;
    items: POPreviewItem[];
    totalValue: number;
    term: PaymentTermPreset;
    signatories: Signatory[];
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-6 py-5 border-b-4 border-double border-blue-800 flex items-start justify-between">
                <div>
                    {company.logoUrl && (
                        <img src={company.logoUrl} alt={company.name} className="h-8 mb-1 object-contain" />
                    )}
                    <p className="text-xl font-bold text-blue-900">{company.name}</p>
                    {companyLetterheadLine(company) && (
                        <p className="text-xs text-gray-500 mt-0.5">{companyLetterheadLine(company)}</p>
                    )}
                    {company.email && <p className="text-xs text-gray-400">{company.email}</p>}
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">PURCHASE ORDER</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                        No: <span className="font-mono font-semibold">{poRef}</span>
                    </p>
                    <p className="text-xs text-gray-600">Date: {createdDate}</p>
                </div>
            </div>

            <div className="px-6 py-4 grid grid-cols-2 gap-6 border-b border-gray-100">
                <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 pb-1 mb-2">
                        Bill To / Supplier
                    </p>
                    <p className="text-sm font-semibold text-gray-900">{supplier || "—"}</p>
                    <p className="text-xs text-gray-600">{supplierContact || "—"}</p>
                    <p className="text-xs text-gray-500 mt-1">
                        Payment ref: <span className="font-mono">{poRef}</span>
                    </p>
                </div>
                <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 pb-1 mb-2">
                        Ship To
                    </p>
                    <p className="text-sm text-gray-900">{company.name}</p>
                    <p className="text-xs text-gray-600">{companyLocalityLine(company) || "—"}</p>
                    <p className="text-xs text-gray-500 mt-1">Expected delivery: {expectedDate}</p>
                </div>
            </div>

            <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-xs text-gray-500 uppercase tracking-wide">
                        <th className="px-6 py-2.5 text-left font-semibold">Description</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Unit Price</th>
                        <th className="px-6 py-2.5 text-right font-semibold">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {items.map((it, i) => (
                        <tr key={i}>
                            <td className="px-6 py-2.5 text-gray-800">{it.material}</td>
                            <td className="px-4 py-2.5 text-right text-gray-700">
                                {it.qty.toLocaleString()} {it.unit}
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-700">
                                {formatCurrencyByGeneralSettings(it.unitCost)}
                            </td>
                            <td className="px-6 py-2.5 text-right font-medium text-gray-900">
                                {formatCurrencyByGeneralSettings(it.qty * it.unitCost)}
                            </td>
                        </tr>
                    ))}
                    <tr className="bg-gray-50">
                        <td colSpan={3} className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                            TOTAL
                        </td>
                        <td className="px-6 py-3 text-right font-bold text-gray-900">
                            {formatCurrencyByGeneralSettings(totalValue)}
                        </td>
                    </tr>
                </tbody>
            </table>

            <div className="px-6 py-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 pb-1 mb-2">
                    Payment Terms
                </p>
                <p className="text-sm text-gray-800 font-medium">{term.name}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                    {term.tranches.map((t, i) => (
                        <span
                            key={i}
                            className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full border ${t.timing === "on_po_approval" ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-white text-gray-600 border-gray-200"}`}
                        >
                            {t.percent}% {t.title}
                        </span>
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">{term.description}</p>
            </div>

            <div className="px-6 py-5 border-t border-gray-100 grid grid-cols-2 gap-8">
                <div>
                    <div className="space-y-3">
                        {(signatories.length
                            ? signatories
                            : [{ id: "fallback", name: "Procurement Manager", role: "", signature: null }]
                        ).map((s) => (
                            <div key={s.id}>
                                <div className="h-9 border-b border-gray-900 flex items-end pb-0.5">
                                    {s.signature ? (
                                        <img
                                            src={s.signature}
                                            alt={`${s.name}'s signature`}
                                            className="h-8 max-w-[160px] object-contain"
                                        />
                                    ) : (
                                        <span className="text-[11px] italic text-gray-400">No signature on file</span>
                                    )}
                                </div>
                                <p className="text-xs font-semibold text-gray-900 mt-1">{s.name}</p>
                                {s.role && <p className="text-[11px] text-gray-500">{s.role}</p>}
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-700 mt-3 font-medium">Authorised for {company.name}</p>
                </div>
                <div>
                    <div className="h-10 border-b border-gray-900" />
                    <p className="text-xs text-gray-700 mt-1.5">Supplier acknowledgement</p>
                    <p className="text-xs text-gray-600">Name &amp; signature</p>
                </div>
            </div>
        </div>
    );
}

/** Opens a print-ready copy of the formal PO (Download PDF). */
export function printPurchaseOrder(props: {
    company: CompanyProfile;
    poRef: string;
    createdDate: string;
    supplier: string;
    supplierContact: string;
    expectedDate: string;
    items: POPreviewItem[];
    totalValue: number;
    term: PaymentTermPreset;
    signatories: Signatory[];
}) {
    const { company, poRef, createdDate, supplier, supplierContact, expectedDate, items, totalValue, term, signatories } = props;
    const letterhead = companyLetterheadLine(company);
    const locality = companyLocalityLine(company) || "—";
    const rows = items
        .map(
            (it) =>
                `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:left">${it.material}</td>` +
                `<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${it.qty.toLocaleString()} ${it.unit}</td>` +
                `<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${formatCurrencyByGeneralSettings(it.unitCost)}</td>` +
                `<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${formatCurrencyByGeneralSettings(it.qty * it.unitCost)}</td></tr>`,
        )
        .join("");
    const tranches = term.tranches.map((t) => `${t.percent}% ${t.title}`).join(" + ");
    const sigHtml = (
        signatories.length ? signatories : [{ id: "fallback", name: "Procurement Manager", role: "", signature: null }]
    )
        .map((s) => {
            const sigBox = s.signature
                ? `<img src="${s.signature}" alt="${s.name}'s signature" style="height:32px;max-width:160px;object-fit:contain" />`
                : `<span style="font-size:11px;font-style:italic;color:#999">No signature on file</span>`;
            return (
                `<div style="margin-bottom:10px">` +
                `<div style="border-bottom:1px solid #000;padding-bottom:4px;min-height:32px;display:flex;align-items:flex-end">${sigBox}</div>` +
                `<div style="margin-top:4px">${s.name}<br/><span style="color:#555;font-size:11px">${s.role}</span></div>` +
                `</div>`
            );
        })
        .join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${poRef}</title></head>
    <body style="font-family:Georgia,serif;color:#111;max-width:720px;margin:32px auto;line-height:1.5">
      <div style="border-bottom:3px double #1e3a8a;padding-bottom:12px;display:flex;justify-content:space-between;align-items:flex-end">
        <div><div style="font-size:22px;font-weight:bold;color:#1e3a8a">${company.name}</div>
        ${letterhead ? `<div style="font-size:11px;color:#555">${letterhead}</div>` : ""}
        ${company.email ? `<div style="font-size:11px;color:#888">${company.email}</div>` : ""}</div>
        <div style="text-align:right"><div style="font-size:16px;font-weight:bold">PURCHASE ORDER</div>
        <div style="font-size:11px">No: <b>${poRef}</b></div><div style="font-size:11px">Date: ${createdDate}</div></div>
      </div>
      <table style="width:100%;margin-top:16px;font-size:13px;border-collapse:collapse">
        <tr>
          <td style="vertical-align:top"><div style="font-weight:bold;border-bottom:1px solid #999;margin-bottom:6px;padding-bottom:2px">Supplier</div>
            <div>${supplier}</div><div style="color:#555;font-size:12px">${supplierContact}</div></td>
          <td style="vertical-align:top"><div style="font-weight:bold;border-bottom:1px solid #999;margin-bottom:6px;padding-bottom:2px">Deliver To</div>
            <div>${company.name}</div><div style="color:#555;font-size:12px">${locality}</div>
            <div style="color:#555;font-size:12px">Expected: ${expectedDate}</div></td>
        </tr>
      </table>
      <div style="font-weight:bold;border-bottom:1px solid #999;margin:16px 0 6px;padding-bottom:2px">Items</div>
      <table style="width:100%;font-size:12px;border-collapse:collapse;border:1px solid #ddd">
        <thead><tr style="background:#f5f5f5"><th style="padding:6px 8px;text-align:left">Description</th>
        <th style="padding:6px 8px;text-align:right">Qty</th><th style="padding:6px 8px;text-align:right">Unit Price</th>
        <th style="padding:6px 8px;text-align:right">Amount</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="3" style="padding:8px;text-align:right;font-weight:bold">TOTAL</td>
        <td style="padding:8px;text-align:right;font-weight:bold">${formatCurrencyByGeneralSettings(totalValue)}</td></tr></tfoot>
      </table>
      <div style="font-weight:bold;border-bottom:1px solid #999;margin:16px 0 6px;padding-bottom:2px">Payment Terms</div>
      <div style="font-size:12px">${term.name} — ${tranches}</div>
      <div style="font-size:11px;color:#555;margin-top:2px">${term.description}</div>
      <div style="margin-top:24px;display:flex;justify-content:space-between;gap:24px;font-size:12px">
        <div style="flex:1">${sigHtml}<div style="margin-top:4px;font-weight:bold">Authorised for ${company.name}</div></div>
        <div style="flex:1"><div style="border-top:1px solid #000;padding-top:4px">Supplier Acknowledgement<br/>Name &amp; Signature</div></div>
      </div>
    </body></html>`);
    w.document.close();
    w.focus();
    w.print();
}
