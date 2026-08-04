/**
 * The reference convention for material requests.
 *
 * `MaterialRequest.reference` is UNIQUE in the schema, so a multi-item request
 * cannot store one shared reference across its rows. Each row is written as
 * `<requestRef>/<n>` instead, and the base reference is what the UI groups on
 * and what everything downstream — a purchase request's `mrRef`, an RFQ's
 * notes — cites.
 *
 * This lives in a util rather than beside the material requests page because
 * Purchase Requests has to resolve the same convention when it offers the list
 * of requests a purchase request can be raised against. Two copies of the
 * parsing rule would drift.
 */

const ITEM_REF_SEPARATOR = "/";

/** The reference for the nth item row of a request. */
export function itemReference(requestRef: string, index: number): string {
  return `${requestRef}${ITEM_REF_SEPARATOR}${index + 1}`;
}

/** The request reference behind an item row's reference. */
export function baseMaterialRequestRef(reference: string): string {
  if (!reference) return "";
  const cut = reference.lastIndexOf(ITEM_REF_SEPARATOR);
  if (cut <= 0) return reference;
  // Only strip the suffix when it really is an item counter.
  return /^\d+$/.test(reference.slice(cut + 1))
    ? reference.slice(0, cut)
    : reference;
}
