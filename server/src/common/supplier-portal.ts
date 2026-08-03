/**
 * Links into the SabiQuot supplier portal.
 *
 * Both the RFQ and purchase-order notification emails used to send the supplier
 * to the bare portal root: an email headed "New Purchase Order — PO-0007" whose
 * "View on Supplier Portal" button dropped them on the homepage with no
 * indication of which order it meant, leaving them to find it themselves.
 *
 * The record is carried as query parameters rather than a path segment because
 * BuildOS does not own the portal's routing — guessing `/purchase-orders/:id`
 * and being wrong produces a 404, which is worse than the homepage. Unknown
 * query parameters are ignored by any router, so this is no worse than the
 * previous behaviour in the worst case and deep-linkable as soon as the portal
 * reads them.
 *
 * Set `SUPPLIER_PORTAL_URL` to point at a non-production portal. If the portal
 * later exposes real deep-link paths, this is the single place to change.
 */

const DEFAULT_PORTAL_URL = 'https://sabiquot.vercel.app';

/** The portal origin, with any trailing slashes removed. */
export function supplierPortalUrl(): string {
    return (process.env.SUPPLIER_PORTAL_URL || DEFAULT_PORTAL_URL).replace(/\/+$/, '');
}

/**
 * A link to one record on the portal.
 *
 * @param kind  What is being linked to, e.g. `purchase-order` or `rfq`.
 * @param id    The BuildOS record id, which the portal can read back through
 *              the service-authenticated by-id endpoints.
 * @param ref   The human reference (PO-0007), so the supplier can match the
 *              link to the email even if the portal ignores the parameters.
 */
export function supplierPortalLink(kind: string, id: string, ref?: string): string {
    const params = new URLSearchParams({ type: kind, id });
    if (ref) params.set('ref', ref);
    return `${supplierPortalUrl()}/?${params.toString()}`;
}
