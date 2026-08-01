import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Must match the key AdminExtrasService writes its settings row under. */
const ADMIN_SETTINGS_KEY = 'admin-settings';

export interface ComposedEmail {
    subject: string;
    text: string;
    html: string;
    cc: string[];
    /**
     * True when the admin's body renders its own link or button. Callers that
     * append a default call-to-action use this to step aside, so a template that
     * defines its own button does not get a second one bolted on underneath.
     */
    hasLink: boolean;
}

/**
 * Renders the admin-configured email templates.
 *
 * This lived in two places — AdminExtrasService and AuthService each had their
 * own copy — which is exactly how the two drifted: link rendering was added to
 * one and not the other, so a template could produce a button for the invite
 * email but not for the password reset. One implementation, in a global module
 * both can inject, is what stops that recurring.
 */
@Injectable()
export class EmailTemplateService {
    private readonly logger = new Logger(EmailTemplateService.name);

    constructor(private prisma: PrismaService) {}

    /** The URL variables every template can use. */
    static readonly URL_VARIABLE_NAMES = ['app_url', 'login_url', 'ess_url'];

    private normalizeBaseUrl(value: string): string {
        return String(value || '').trim().replace(/\/$/, '');
    }

    /**
     * Where links in a template point. Resolved from the environment rather than
     * written into templates, which would otherwise break whenever the app moves
     * between environments.
     */
    getFrontendBaseUrl(): string {
        const configured = this.normalizeBaseUrl(
            process.env.FRONTEND_URL || process.env.APP_WEB_URL || '',
        );
        if (configured) return configured;

        const legacy = this.normalizeBaseUrl(process.env.WEB_URL || process.env.APP_URL || '');
        if (legacy) {
            this.logger.warn(`FRONTEND_URL not configured. Falling back to: ${legacy}`);
            return legacy;
        }

        const fallback =
            process.env.NODE_ENV === 'production'
                ? 'https://build-os-delta.vercel.app'
                : 'http://localhost:5173';
        this.logger.warn(`FRONTEND_URL not configured. Using fallback: ${fallback}`);
        return fallback;
    }

    urlTemplateVars(): Record<string, string> {
        const base = this.getFrontendBaseUrl();
        return {
            app_url: base,
            login_url: `${base}/auth/login`,
            ess_url: `${base}/apps/ess`,
        };
    }

    escapeHtml(value: string): string {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /** Replaces {{ variable }} tokens (case-insensitive, optional spaces). */
    renderTemplate(template: string, vars: Record<string, unknown>): string {
        return String(template ?? '').replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, key) => {
            const snake = String(key).replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
            const value = vars[snake] ?? vars[String(key)];
            if (value === undefined || value === null) return match;
            if (value instanceof Date) return value.toISOString().slice(0, 10);
            return String(value);
        });
    }

    /**
     * Turns links and buttons in an already-escaped body into real anchors.
     *
     * The body is escaped first and only these forms are re-introduced, so a
     * template can add a link without being able to inject arbitrary HTML.
     *
     *   [Open ESS](https://…)     → inline anchor
     *   [[Open ESS]](https://…)   → button-styled anchor
     *   https://… on its own      → auto-linked
     *
     * Only http/https targets are accepted; anything else (javascript:, data:)
     * is left as plain text.
     */
    renderLinks(escaped: string): string {
        const safeHref = (raw: string): string | null => {
            const url = raw.replace(/&amp;/g, '&').trim();
            return /^https?:\/\/[^\s<>"]+$/i.test(url) ? url : null;
        };
        const attr = (url: string) => this.escapeHtml(url).replace(/&amp;/g, '&amp;');

        let out = escaped;

        // Button form first — its [[…]] would otherwise match the inline form.
        out = out.replace(
            /\[\[([^\]\n]+)\]\]\(([^)\s]+)\)/g,
            (match, label: string, href: string) => {
                const url = safeHref(href);
                if (!url) return match;
                return (
                    `<a href="${attr(url)}" style="display:inline-block;` +
                    `background:#4f46e5;color:#ffffff;text-decoration:none;` +
                    `padding:10px 18px;border-radius:8px;font-weight:600;` +
                    `margin:8px 0;">${label}</a>`
                );
            },
        );

        out = out.replace(
            /\[([^\]\n]+)\]\(([^)\s]+)\)/g,
            (match, label: string, href: string) => {
                const url = safeHref(href);
                if (!url) return match;
                return `<a href="${attr(url)}" style="color:#4f46e5;">${label}</a>`;
            },
        );

        // Bare URLs, skipping any already inside an href produced above.
        out = out.replace(/(href="[^"]*"|>)|(https?:\/\/[^\s<>"]+)/g, (match, skip, bare) => {
            if (skip) return match;
            const url = safeHref(bare);
            return url ? `<a href="${attr(url)}" style="color:#4f46e5;">${url}</a>` : match;
        });

        return out;
    }

    /**
     * Renders the configured call-to-action button.
     *
     * Both a label and an http/https target are required — a button with no
     * destination, or one pointing at `javascript:`, is dropped rather than
     * rendered. Returns an empty url when nothing is configured, which is how
     * callers know to fall back to their built-in button.
     */
    private renderButton(
        rawLabel: string,
        rawUrl: string,
    ): { html: string; label: string; url: string } {
        const label = String(rawLabel ?? '').trim();
        const url = String(rawUrl ?? '').trim();
        if (!label || !url || !/^https?:\/\/[^\s<>"]+$/i.test(url)) {
            return { html: '', label: '', url: '' };
        }
        const html =
            `<p style="margin:16px 0 0;font-family:Segoe UI,Arial,sans-serif;">` +
            `<a href="${this.escapeHtml(url)}" style="display:inline-block;` +
            `background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 20px;` +
            `border-radius:10px;font-weight:600;font-size:14px;">` +
            `${this.escapeHtml(label)}</a></p>`;
        return { html, label, url };
    }

    /**
     * Resolves the enabled admin template for a trigger and renders it. Returns
     * null when no template is configured, so callers keep their built-in email.
     */
    async compose(
        trigger: string,
        vars: Record<string, unknown>,
    ): Promise<ComposedEmail | null> {
        try {
            const row = await this.prisma.systemSetting.findUnique({
                where: { key: ADMIN_SETTINGS_KEY },
            });
            const settings = (row?.value ?? {}) as Record<string, any>;
            const configs = Array.isArray(settings.emailConfigs) ? settings.emailConfigs : [];
            const config = configs.find(
                (c: any) => c?.enabled !== false && String(c?.trigger ?? '') === trigger,
            );
            if (!config || (!String(config.subject ?? '').trim() && !String(config.body ?? '').trim())) {
                return null;
            }

            // URL variables sit under the caller's, so a trigger supplying its own
            // more specific link (an activation or reset URL) still wins.
            const withUrls = { ...this.urlTemplateVars(), ...vars };

            const subject = this.renderTemplate(String(config.subject ?? ''), withUrls).trim();
            const text = this.renderTemplate(String(config.body ?? ''), withUrls);
            const body = this.renderLinks(this.escapeHtml(text));

            // The call-to-action is configured as its own name/link pair rather
            // than as markup inside the body, so an admin never has to know a
            // link syntax to add a button to an email.
            const button = this.renderButton(
                this.renderTemplate(String(config.buttonLabel ?? ''), withUrls),
                this.renderTemplate(String(config.buttonUrl ?? ''), withUrls),
            );

            const html =
                `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:15px;` +
                `line-height:1.6;color:#1f2937;white-space:pre-wrap;">${body}</div>${button.html}`;
            const cc = this.renderTemplate(String(config.cc ?? ''), withUrls)
                .split(/[,;]/)
                .map((s: string) => s.trim())
                .filter((s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));

            return {
                subject,
                text: button.url ? `${text}\n\n${button.label}: ${button.url}` : text,
                html,
                cc,
                hasLink: Boolean(button.url) || body.includes('<a href="'),
            };
        } catch (error) {
            this.logger.warn(`Email template lookup failed: ${(error as Error).message}`);
            return null;
        }
    }
}
