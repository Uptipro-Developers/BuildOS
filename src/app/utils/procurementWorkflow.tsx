import type { ReactNode } from "react";
import {
  AlertTriangle,
  Ban,
  Banknote,
  CheckCircle2,
  Clock,
  FileEdit,
  FileText,
  Landmark,
  MailOpen,
  Package,
  PackageCheck,
  Send,
  ShoppingCart,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";

/**
 * The single description of every state a document can be in as it moves
 * through procurement, and what each state looks like.
 *
 * Each page used to carry its own status table, so the same stage was called
 * different things in different places and the chain could not be read
 * end-to-end. Worse, several statuses existed only as labels — "Sent to
 * Supplier", "Partially Received" — with no step in the implemented workflow
 * that produced them. The states below are exactly the ones the workflow can
 * reach, in the order it reaches them:
 *
 *   Material Request → approved → Purchase Request (not raised)
 *   Purchase Request → raised → Sent Requests (RFQ per supplier)
 *   Sent Request → supplier responds → Received Quote
 *   Received Quote → approved → Purchase Order
 *   Purchase Order → sent to finance → accepted → paid → confirmed
 *   Purchase Order (confirmed) → Goods Receipt → stock
 */

export interface StatusDef {
  label: string;
  badge: string;
  icon: ReactNode;
}

const ICON = "w-3.5 h-3.5";

// ── Material Requests ────────────────────────────────────────────────────────

export type MaterialRequestStatus =
  | "pending"
  | "approved"
  | "in_procurement"
  | "rejected"
  | "fulfilled";

export const MATERIAL_REQUEST_STATUS: Record<MaterialRequestStatus, StatusDef> =
{
  pending: {
    label: "Pending Review",
    badge: "bg-amber-100 text-amber-700",
    icon: <Clock className={ICON} />,
  },
  approved: {
    label: "Approved",
    badge: "bg-green-100 text-green-700",
    icon: <CheckCircle2 className={ICON} />,
  },
  in_procurement: {
    label: "In Procurement",
    badge: "bg-blue-100 text-blue-700",
    icon: <ShoppingCart className={ICON} />,
  },
  rejected: {
    label: "Rejected",
    badge: "bg-red-100 text-red-700",
    icon: <XCircle className={ICON} />,
  },
  fulfilled: {
    label: "Fulfilled",
    badge: "bg-emerald-100 text-emerald-700",
    icon: <PackageCheck className={ICON} />,
  },
};

// ── Purchase Requests ────────────────────────────────────────────────────────

/**
 * A purchase request carries no approval status of its own.
 *
 * When it comes from a Material Request the approval already happened there, so
 * asking for a second one was asking the same person to approve the same spend
 * twice. What a purchase request tracks instead is whether it has been *raised*
 * to suppliers yet.
 */
export type PurchaseRequestStatus =
  | "draft"
  | "not_raised"
  | "raised"
  | "quotes_received"
  | "po_created"
  | "cancelled";

export const PURCHASE_REQUEST_STATUS: Record<
  PurchaseRequestStatus,
  StatusDef
> = {
  draft: {
    label: "Draft",
    badge: "bg-gray-100 text-gray-600",
    icon: <FileEdit className={ICON} />,
  },
  not_raised: {
    label: "Not Raised",
    badge: "bg-slate-100 text-slate-600",
    icon: <FileText className={ICON} />,
  },
  raised: {
    label: "Raised",
    badge: "bg-blue-100 text-blue-700",
    icon: <Send className={ICON} />,
  },
  quotes_received: {
    label: "Quotes Received",
    badge: "bg-purple-100 text-purple-700",
    icon: <MailOpen className={ICON} />,
  },
  po_created: {
    label: "PO Created",
    badge: "bg-teal-100 text-teal-700",
    icon: <ShoppingCart className={ICON} />,
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-red-100 text-red-700",
    icon: <Ban className={ICON} />,
  },
};

/** A request that has not gone out to suppliers yet, so it is still editable. */
export const PR_EDITABLE: PurchaseRequestStatus[] = ["draft", "not_raised"];

// ── Sent Requests (RFQs) ─────────────────────────────────────────────────────

export type SentRequestStatus =
  | "sent"
  | "viewed"
  | "quote_received"
  | "declined"
  | "expired";

export const SENT_REQUEST_STATUS: Record<SentRequestStatus, StatusDef> = {
  sent: {
    label: "Sent",
    badge: "bg-blue-100 text-blue-700",
    icon: <Send className={ICON} />,
  },
  viewed: {
    label: "Viewed",
    badge: "bg-purple-100 text-purple-700",
    icon: <MailOpen className={ICON} />,
  },
  quote_received: {
    label: "Quote Received",
    badge: "bg-green-100 text-green-700",
    icon: <CheckCircle2 className={ICON} />,
  },
  declined: {
    label: "Declined",
    badge: "bg-red-100 text-red-700",
    icon: <XCircle className={ICON} />,
  },
  expired: {
    label: "Expired",
    badge: "bg-gray-100 text-gray-500",
    icon: <Clock className={ICON} />,
  },
};

// ── Received Quotes ──────────────────────────────────────────────────────────

export type ReceivedQuoteStatus =
  | "pending_review"
  | "approved"
  | "po_created"
  | "rejected";

export const RECEIVED_QUOTE_STATUS: Record<ReceivedQuoteStatus, StatusDef> = {
  pending_review: {
    label: "Pending Review",
    badge: "bg-amber-100 text-amber-700",
    icon: <Clock className={ICON} />,
  },
  approved: {
    label: "Approved",
    badge: "bg-green-100 text-green-700",
    icon: <ThumbsUp className={ICON} />,
  },
  po_created: {
    label: "PO Created",
    badge: "bg-blue-100 text-blue-700",
    icon: <ShoppingCart className={ICON} />,
  },
  rejected: {
    label: "Rejected",
    badge: "bg-red-100 text-red-700",
    icon: <XCircle className={ICON} />,
  },
};

// ── Purchase Orders ──────────────────────────────────────────────────────────

/**
 * The order's single lifecycle.
 *
 * Payment used to live in a second `paymentStatus` column alongside a `status`
 * that tracked supplier delivery, which meant the screen showed two half-states
 * and neither told you whose turn it was. There is one chain now, and every
 * step in it is an action somebody actually takes:
 *
 *   draft → sent_to_finance → finance_accepted → paid
 *         → confirmation_requested → confirmed → goods_received
 *
 * `finance_declined` is the one branch off it, and it returns the order to
 * procurement rather than ending the chain.
 */
export type PurchaseOrderStatus =
  | "draft"
  | "po_created"
  | "sent_to_finance"
  | "finance_accepted"
  | "finance_declined"
  | "paid"
  | "confirmation_requested"
  | "confirmed"
  | "goods_received"
  | "cancelled";

export const PURCHASE_ORDER_STATUS: Record<PurchaseOrderStatus, StatusDef> = {
  draft: {
    label: "Draft",
    badge: "bg-gray-100 text-gray-600",
    icon: <FileEdit className={ICON} />,
  },
  po_created: {
    label: "PO Created",
    badge: "bg-sky-100 text-sky-700",
    icon: <FileText className={ICON} />,
  },
  sent_to_finance: {
    label: "Sent to Finance",
    badge: "bg-indigo-100 text-indigo-700",
    icon: <Landmark className={ICON} />,
  },
  finance_accepted: {
    label: "Accepted by Finance",
    badge: "bg-blue-100 text-blue-700",
    icon: <CheckCircle2 className={ICON} />,
  },
  finance_declined: {
    label: "Declined by Finance",
    badge: "bg-red-100 text-red-700",
    icon: <AlertTriangle className={ICON} />,
  },
  paid: {
    label: "Paid",
    badge: "bg-emerald-100 text-emerald-700",
    icon: <Banknote className={ICON} />,
  },
  confirmation_requested: {
    label: "Confirmation Requested",
    badge: "bg-amber-100 text-amber-700",
    icon: <Clock className={ICON} />,
  },
  confirmed: {
    label: "Confirmed",
    badge: "bg-green-100 text-green-700",
    icon: <CheckCircle2 className={ICON} />,
  },
  goods_received: {
    label: "Goods Received",
    badge: "bg-teal-100 text-teal-700",
    icon: <PackageCheck className={ICON} />,
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-red-100 text-red-700",
    icon: <Ban className={ICON} />,
  },
};

/** Ordered stages, for progress display and for "has it got past X" checks. */
export const PO_STAGE_ORDER: PurchaseOrderStatus[] = [
  "draft",
  "po_created",
  "sent_to_finance",
  "finance_accepted",
  "paid",
  "confirmation_requested",
  "confirmed",
  "goods_received",
];

// ── Purchase Invoices (Finance) ──────────────────────────────────────────────

/**
 * The finance side of the same order.
 *
 * `pending_review` is what a purchase order becomes the moment procurement
 * sends it to finance. From there it goes through the Purchase Invoices
 * approval workflow (`pending_approval` → `approved`/`rejected`) before it
 * can be posted to the ledger, mirroring the order's own states so the two
 * modules never disagree about where the money is.
 */
export type PurchaseInvoiceStatus =
  | "pending_review"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "paid"
  | "cancelled";

export const PURCHASE_INVOICE_STATUS: Record<PurchaseInvoiceStatus, StatusDef> =
{
  pending_review: {
    label: "Pending Review",
    badge: "bg-amber-100 text-amber-700",
    icon: <Clock className={ICON} />,
  },
  pending_approval: {
    label: "Pending Approval",
    badge: "bg-purple-100 text-purple-700",
    icon: <Send className={ICON} />,
  },
  approved: {
    label: "Approved",
    badge: "bg-blue-100 text-blue-700",
    icon: <ThumbsUp className={ICON} />,
  },
  rejected: {
    label: "Rejected",
    badge: "bg-red-100 text-red-700",
    icon: <XCircle className={ICON} />,
  },
  paid: {
    label: "Paid",
    badge: "bg-emerald-100 text-emerald-700",
    icon: <Banknote className={ICON} />,
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-gray-100 text-gray-500",
    icon: <Ban className={ICON} />,
  },
};

// ── Goods Receipts ───────────────────────────────────────────────────────────

/**
 * `pending` — nothing recorded yet. `pending_approval` ("Pending Inspection")
 * — a delivery has been keyed in and is awaiting the configured approver's
 * decision; nothing has touched stock. The rest are what accepting one
 * settles into: rejection outranks quantity (`partial_delivery`), then it's a
 * straight comparison of received to ordered.
 */
export type GoodsReceiptStatus =
  | "pending"
  | "pending_approval"
  | "partial_delivery"
  | "over_supply"
  | "under_supply"
  | "fully_received"
  | "rejected";

export const GOODS_RECEIPT_STATUS: Record<GoodsReceiptStatus, StatusDef> = {
  pending: {
    label: "Awaiting Delivery",
    badge: "bg-gray-100 text-gray-600",
    icon: <Clock className={ICON} />,
  },
  pending_approval: {
    label: "Pending Inspection",
    badge: "bg-amber-100 text-amber-700",
    icon: <MailOpen className={ICON} />,
  },
  partial_delivery: {
    label: "Partial Delivery",
    badge: "bg-blue-100 text-blue-700",
    icon: <Package className={ICON} />,
  },
  over_supply: {
    label: "Over Supply",
    badge: "bg-purple-100 text-purple-700",
    icon: <TrendingUp className={ICON} />,
  },
  under_supply: {
    label: "Under Supply",
    badge: "bg-orange-100 text-orange-700",
    icon: <TrendingDown className={ICON} />,
  },
  fully_received: {
    label: "Fully Received",
    badge: "bg-emerald-100 text-emerald-700",
    icon: <PackageCheck className={ICON} />,
  },
  rejected: {
    label: "Rejected",
    badge: "bg-red-100 text-red-700",
    icon: <XCircle className={ICON} />,
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalises a status off the wire to a key in one of the tables above.
 *
 * Statuses have been written to the database in several shapes over time
 * ("Pending Approval", "pending_approval", "PENDING"), and unknown values used
 * to fall through to a bare grey pill with the raw string in it.
 */
export function normaliseStatus(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

/**
 * The definition for a status, with a readable fallback for anything stored
 * before this table existed.
 */
export function statusDef<K extends string>(
  table: Record<K, StatusDef>,
  raw: unknown,
  fallbackIcon: ReactNode = <FileText className={ICON} />,
): StatusDef {
  const key = normaliseStatus(raw) as K;
  if (key in table) return table[key];
  const label = String(raw ?? "Unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    label: label || "Unknown",
    badge: "bg-gray-100 text-gray-600",
    icon: fallbackIcon,
  };
}
