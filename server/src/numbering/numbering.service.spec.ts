import { NumberingService } from './numbering.service';

/**
 * Reference formatting and the configuration bounds around it. These decide what
 * every record in the system is identified by, so the template parsing and the
 * validation that guards it are covered directly.
 */
function svc(): any {
    return new NumberingService(null as any);
}

describe('reference template formatting', () => {
    const format = (config: any, value: number) => svc().format(config, value);
    const parts = { prefix: 'PO', separator: '-', padLength: 3 };

    it('pads the sequence to the width the template asks for', () => {
        expect(format({ ...parts, template: 'PO-{N:4}' }, 7)).toBe('PO-0007');
        expect(format({ ...parts, template: 'PO-{N:6}' }, 7)).toBe('PO-000007');
    });

    it('supports an unpadded {N}', () => {
        expect(format({ ...parts, template: 'PO-{N}' }, 42)).toBe('PO-42');
    });

    it('does not truncate a number wider than its padding', () => {
        expect(format({ ...parts, template: 'PO-{N:2}' }, 12345)).toBe('PO-12345');
    });

    it('falls back to prefix/separator/padding when no template is stored', () => {
        // Rows written before templates existed carry only the parts.
        expect(format({ ...parts, template: '' }, 7)).toBe('PO-007');
        expect(format({ ...parts, template: null }, 7)).toBe('PO-007');
    });

    it('handles a template with text on both sides of the number', () => {
        expect(format({ ...parts, template: 'INV/{N:3}/2026' }, 8)).toBe('INV/008/2026');
    });
});

describe('deriving parts from a template', () => {
    const parts = (template: string) => svc().partsFromTemplate(template);

    it('splits prefix, separator and padding', () => {
        expect(parts('PO-{N:4}')).toEqual({ prefix: 'PO', separator: '-', padLength: 4 });
        expect(parts('EXP/{N:3}')).toEqual({ prefix: 'EXP', separator: '/', padLength: 3 });
    });

    it('handles a template with no separator', () => {
        expect(parts('PO{N:4}')).toEqual({ prefix: 'PO', separator: '', padLength: 4 });
    });

    it('defaults padding to 1 when unspecified', () => {
        expect(parts('PO-{N}').padLength).toBe(1);
    });
});

describe('configuration validation', () => {
    const sanitize = (input: any) => svc().sanitize(input);
    const valid = { template: 'PO-{N:4}', startingNumber: 1, incrementBy: 1 };

    it('accepts a valid configuration', () => {
        expect(sanitize(valid)).toMatchObject({ template: 'PO-{N:4}', incrementBy: 1 });
    });

    it('rejects a template with no {N}', () => {
        // Without the number every record would get an identical reference.
        expect(() => sanitize({ ...valid, template: 'PO-0001' })).toThrow(/\{N\}/);
    });

    it('rejects an empty template', () => {
        expect(() => sanitize({ ...valid, template: '  ' })).toThrow(/template is required/i);
    });

    it('rejects an ending number below the starting number', () => {
        expect(() =>
            sanitize({ ...valid, startingNumber: 100, endingNumber: 50 }),
        ).toThrow(/ending number/i);
    });

    it('treats a blank ending number as unbounded', () => {
        expect(sanitize({ ...valid, endingNumber: '' }).endingNumber).toBeNull();
        expect(sanitize({ ...valid, endingNumber: null }).endingNumber).toBeNull();
    });

    it('rejects a zero or negative increment', () => {
        expect(() => sanitize({ ...valid, incrementBy: 0 })).toThrow(/increment/i);
        expect(() => sanitize({ ...valid, incrementBy: -1 })).toThrow(/increment/i);
    });

    it('omits nextNumber when the caller does not supply one', () => {
        // Editing a template must not rewind the live counter and re-issue
        // references that existing records already carry.
        expect(sanitize(valid).nextNumber).toBeUndefined();
    });

    it('keeps nextNumber when it is explicitly supplied', () => {
        expect(sanitize({ ...valid, nextNumber: 25 }).nextNumber).toBe(25);
    });
});

describe("payload sent by the Add Numbering Entry row", () => {
    const sanitize = (input: any) => svc().sanitize(input);

    /**
     * The Settings panel defaults the template from the process name when the
     * admin leaves it blank, so the payload always carries one. These pin the
     * shape that row actually posts.
     */
    it("accepts a defaulted template derived from the module name", () => {
        const result = sanitize({
            module: "Requisition",
            app: "procurement",
            template: "REQ-{N:4}",
            startingNumber: 1,
            endingNumber: null,
            incrementBy: 1,
            nextNumber: 1,
        });
        expect(result).toMatchObject({
            template: "REQ-{N:4}",
            startingNumber: 1,
            endingNumber: null,
            incrementBy: 1,
            nextNumber: 1,
        });
        // prefix/separator/padding are derived, not supplied by the panel.
        expect(result).toMatchObject({ prefix: "REQ", separator: "-", padLength: 4 });
    });

    it("accepts a bounded, stepped sequence from the add row", () => {
        const result = sanitize({
            module: "Waybill",
            template: "WB-{N:3}",
            startingNumber: 100,
            endingNumber: 999,
            incrementBy: 5,
            nextNumber: 100,
        });
        expect(result).toMatchObject({
            startingNumber: 100,
            endingNumber: 999,
            incrementBy: 5,
        });
    });
});
