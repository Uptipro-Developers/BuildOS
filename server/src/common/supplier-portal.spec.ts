import { supplierPortalLink, supplierPortalUrl } from './supplier-portal';

describe('supplierPortalUrl', () => {
    const original = process.env.SUPPLIER_PORTAL_URL;
    afterEach(() => {
        if (original === undefined) delete process.env.SUPPLIER_PORTAL_URL;
        else process.env.SUPPLIER_PORTAL_URL = original;
    });

    it('falls back to the SabiQuot production portal', () => {
        delete process.env.SUPPLIER_PORTAL_URL;
        expect(supplierPortalUrl()).toBe('https://sabiquot.vercel.app');
    });

    it('honours an override', () => {
        process.env.SUPPLIER_PORTAL_URL = 'https://staging.example.test';
        expect(supplierPortalUrl()).toBe('https://staging.example.test');
    });

    it('strips trailing slashes so links do not double up', () => {
        process.env.SUPPLIER_PORTAL_URL = 'https://staging.example.test///';
        expect(supplierPortalUrl()).toBe('https://staging.example.test');
    });
});

describe('supplierPortalLink', () => {
    const original = process.env.SUPPLIER_PORTAL_URL;
    beforeEach(() => {
        process.env.SUPPLIER_PORTAL_URL = 'https://portal.test';
    });
    afterEach(() => {
        if (original === undefined) delete process.env.SUPPLIER_PORTAL_URL;
        else process.env.SUPPLIER_PORTAL_URL = original;
    });

    it('identifies the record so the portal can deep-link to it', () => {
        const link = supplierPortalLink('purchase-order', 'ckabc123', 'PO-0007');
        const url = new URL(link);
        expect(url.origin).toBe('https://portal.test');
        expect(url.searchParams.get('type')).toBe('purchase-order');
        expect(url.searchParams.get('id')).toBe('ckabc123');
        expect(url.searchParams.get('ref')).toBe('PO-0007');
    });

    it('omits the reference when there is not one', () => {
        const url = new URL(supplierPortalLink('rfq', 'ckxyz789'));
        expect(url.searchParams.has('ref')).toBe(false);
        expect(url.searchParams.get('id')).toBe('ckxyz789');
    });

    it('escapes a reference that would otherwise break the query string', () => {
        const url = new URL(supplierPortalLink('rfq', 'id1', 'RFQ/0001 &x=1'));
        // Round-trips intact rather than injecting an extra parameter.
        expect(url.searchParams.get('ref')).toBe('RFQ/0001 &x=1');
        expect(url.searchParams.get('x')).toBeNull();
    });

    it('stays a valid absolute URL, so email clients render it as a link', () => {
        expect(() => new URL(supplierPortalLink('purchase-order', 'id1', 'PO-1'))).not.toThrow();
    });
});
