import { EmailTemplateService } from './email-template.service';

/**
 * `renderLinks` decides what markup reaches a recipient's inbox, so it is
 * covered directly. It runs on an already-escaped body and re-introduces only
 * the link and button forms; anything else must stay inert text.
 *
 * Constructed with a null Prisma client: this method touches none of it.
 */
function render(escaped: string): string {
    return new EmailTemplateService(null as any).renderLinks(escaped);
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

describe('renderLinks', () => {
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

/**
 * The call-to-action is configured as a name/link pair rather than as markup in
 * the body, so it is validated separately: a button with no destination, or one
 * pointing somewhere unsafe, must not render.
 */
describe('renderButton', () => {
    const render = (label: string, url: string) =>
        (new EmailTemplateService(null as any) as any).renderButton(label, url);

    it('renders a button when both label and url are given', () => {
        const out = render('Reset Password', 'https://app.test/reset?token=abc');
        expect(out.html).toContain('<a href="https://app.test/reset?token=abc"');
        expect(out.html).toContain('>Reset Password</a>');
        expect(out.url).toBe('https://app.test/reset?token=abc');
    });

    it('renders nothing without a label', () => {
        expect(render('', 'https://app.test').html).toBe('');
    });

    it('renders nothing without a url', () => {
        expect(render('Reset Password', '').html).toBe('');
    });

    it('rejects a non-http target', () => {
        expect(render('Click', 'javascript:alert(1)').html).toBe('');
        expect(render('Click', 'data:text/html,x').html).toBe('');
    });

    it('escapes a label so it cannot inject markup', () => {
        const out = render('<script>x</script>', 'https://app.test');
        expect(out.html).not.toContain('<script>');
        expect(out.html).toContain('&lt;script&gt;');
    });

    it('drops an unresolved {{variable}} target rather than linking to it', () => {
        // A template referencing a variable the trigger does not supply leaves
        // the token in place; that is not a URL and must not become a link.
        expect(render('Open', '{{missing_var}}').html).toBe('');
    });
});
