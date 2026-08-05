import { ForbiddenException } from '@nestjs/common';

/**
 * Scoping rules for list endpoints that a machine credential may read.
 *
 * A service key (Admin › API Keys) identifies the *integration* — the SabiQuot
 * portal — not a supplier. One key serves every supplier on the portal, so an
 * unfiltered list read through it would hand any supplier every other
 * supplier's RFQs, quoted prices and order history.
 *
 * That risk is why the list endpoints were closed to service callers outright,
 * with the portal expected to fetch records one at a time by id. But the portal
 * only learns an id from a link in an email, so it had no way to answer "what
 * has been sent to me?" — a supplier logging in saw an empty page no matter how
 * many RFQs and orders existed for them.
 *
 * The leak was never "listing", it was "listing without a subject". So the list
 * stays open to machine callers on the condition that names exactly one
 * supplier. A human JWT is unaffected: procurement staff are supposed to see
 * every supplier, and their access is already decided by the permission matrix.
 */

/** Whether this request authenticated with a machine key rather than a user JWT. */
export function isServiceCaller(req: any): boolean {
    return Boolean(req?.serviceClient);
}

/**
 * Requires a machine caller to have named a supplier.
 *
 * @param req         The incoming request, carrying `serviceClient` when the
 *                    caller authenticated with a service key.
 * @param supplierId  The resolved supplier the query is scoped to, if any.
 */
export function assertSupplierScoped(req: any, supplierId?: string | null): void {
    if (!isServiceCaller(req)) return;
    if (supplierId) return;

    throw new ForbiddenException(
        'A service key may only list records for one supplier. ' +
            'Pass ?supplierId= or ?sabiquotProfileId= to say which.',
    );
}
