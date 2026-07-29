import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface EmailAttachment {
    filename: string;
    content: string;
    content_id?: string;
}

export interface EmailPayload {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    /** Overrides the configured EMAIL_FROM when provided. */
    from?: string;
    replyTo?: string;
    cc?: string[];
    attachments?: EmailAttachment[];
}

/**
 * Single, centralised outbound email path.
 *
 * Previously each caller instantiated its own Resend client and built the
 * configuration check inline. Consolidating here means both the synchronous
 * (inline) fallback and the BullMQ worker share one implementation, and email
 * configuration is validated in exactly one place.
 */
@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    constructor(private readonly config: ConfigService) {}

    private getProvider(): string {
        return String(this.config.get<string>('EMAIL_PROVIDER') || 'resend').toLowerCase();
    }

    private getApiKey(): string | undefined {
        return this.config.get<string>('RESEND_API_KEY') || undefined;
    }

    private getDefaultFrom(): string | undefined {
        return (
            this.config.get<string>('EMAIL_FROM') ||
            this.config.get<string>('INVITE_FROM_EMAIL') ||
            undefined
        );
    }

    /** Whether outbound email is fully configured (provider + key + from address). */
    isConfigured(): boolean {
        if (this.getProvider() === 'log') return true;
        return this.getProvider() === 'resend' && !!this.getApiKey() && !!this.getDefaultFrom();
    }

    /**
     * Send an email immediately. Throws on misconfiguration or provider
     * rejection so synchronous callers can surface the failure.
     */
    async sendNow(payload: EmailPayload): Promise<void> {
        const provider = this.getProvider();

        // EMAIL_PROVIDER=log writes the message to the application log instead of
        // dispatching it. Intended for local development and end-to-end tests, so
        // email-dependent flows (invites, employee onboarding, payslips) can be
        // exercised without a live Resend key or sending mail to real addresses.
        if (provider === 'log') {
            this.logger.log(
                `[email:log] to=${String(payload.to)}` +
                    `${payload.cc?.length ? ` cc=${payload.cc.join(',')}` : ''}` +
                    ` subject="${payload.subject}"\n${payload.text ?? payload.html ?? ''}`,
            );
            return;
        }

        if (provider !== 'resend') {
            throw new BadRequestException(`Email provider '${provider}' is not supported by this service`);
        }

        const apiKey = this.getApiKey();
        const from = payload.from || this.getDefaultFrom();
        if (!apiKey || !from) {
            throw new BadRequestException(
                'Email is not configured: set RESEND_API_KEY and EMAIL_FROM (or INVITE_FROM_EMAIL)',
            );
        }

        const resend = new Resend(apiKey);
        const sendPayload: Record<string, unknown> = {
            from,
            to: Array.isArray(payload.to) ? payload.to : [payload.to],
            subject: payload.subject,
        };
        if (payload.text) sendPayload.text = payload.text;
        if (payload.html) sendPayload.html = payload.html;
        if (payload.replyTo) sendPayload.replyTo = payload.replyTo;
        if (payload.cc && payload.cc.length > 0) sendPayload.cc = payload.cc;
        if (payload.attachments && payload.attachments.length > 0) {
            sendPayload.attachments = payload.attachments;
        }

        const result = (await resend.emails.send(sendPayload as never)) as { error?: unknown };
        if (result?.error) {
            this.logger.error(`Email provider rejected message to ${String(payload.to)}`);
            throw new InternalServerErrorException('Email provider rejected the message');
        }

        this.logger.log(`Email accepted for delivery to ${String(payload.to)}`);
    }
}
