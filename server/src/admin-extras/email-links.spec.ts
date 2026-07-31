import { AdminExtrasService } from './admin-extras.service';

/**
 * `renderEmailLinks` decides what markup reaches a recipient's inbox, so it is
 * covered directly. It runs on an already-escaped body and re-introduces only
 * the link and button forms; anything else must stay inert text.
 *
 * The service is constructed with null collaborators: this method touches none
 * of them.
 */
function render(escaped: string): string {
    const svc = new AdminExtrasService(
        null as any,
        null as any,
        null as any,
        null as any,
    );
    return (svc as any).renderEmailLinks(escaped);
}

/** Mirrors the escaping the caller applies before this method runs. */
function escape(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

describe('renderEmailLinks', () => {
    it('turns [label](url) into an anchor', () => {
        const out = render(escape('Go to [Open ESS](https://app.test/ess) now'));
        expect(out).toContain('<a href="https://app.test/ess"');
        expect(out).toContain('>Open ESS</a>');
    });

    it('turns [[label]](url) into a button-styled anchor', () => {
        const out = render(escape('[[Activate Account]](https://app.test/activate)'));
        expect(out).toContain('<a href="https://app.test/activate"');
        expect(out).toContain('display:inline-block');
        expect(out).toContain('>Activate Account</a>');
    });

    it('auto-links a bare URL', () => {
        const out = render(escape('Visit https://app.test/login to continue'));
        expect(out).toContain('<a href="https://app.test/login"');
    });

    it('does not double-link the target of an explicit link', () => {
        const out = render(escape('[Login](https://app.test/login)'));
        expect(out.match(/<a href=/g)).toHaveLength(1);
    });

    it('leaves a javascript: target as plain text', () => {
        const out = render(escape('[Click](javascript:alert(1))'));
        expect(out).not.toContain('<a href');
        expect(out).toContain('javascript:alert(1)');
    });

    it('leaves a data: target as plain text', () => {
        const out = render(escape('[Click](data:text/html;base64,PHNjcmlwdD4=)'));
        expect(out).not.toContain('<a href');
    });

    it('does not let a template inject its own HTML', () => {
        // The caller escapes first, so raw markup arrives inert and must stay so.
        const out = render(escape('<script>alert(1)</script><a href="https://evil.test">x</a>'));
        expect(out).not.toContain('<script>');
        expect(out).not.toContain('<a href="https://evil.test"');
        expect(out).toContain('&lt;script&gt;');
    });

    it('preserves query strings through escaping', () => {
        const out = render(escape('[Activate](https://app.test/a?token=abc&user=1)'));
        expect(out).toContain('href="https://app.test/a?token=abc&amp;user=1"');
    });

    it('leaves ordinary text untouched', () => {
        const out = render(escape('Dear Ada, your request was approved.'));
        expect(out).toBe('Dear Ada, your request was approved.');
    });
});
