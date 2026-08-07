import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailQueueService } from '../queue/mail-queue.service';
import { EmailTemplateService } from '../email/email-template.service';
import { NOTIFICATION_EVENT_KEYS, NOTIFICATION_EVENTS } from './notification-events';
import { HrSetupService } from '../hr-extras/hr-setup.service';

const ADMIN_SETTINGS_KEY = 'admin-settings';

/** What a rule from Admin › Notifications looks like once stored. */
interface StoredNotificationRule {
    id: string;
    name: string;
    event: string;
    recipients: string;
    channels: string[];
    enabled: boolean;
}

/** Everything a dispatched event knows about itself. */
export interface NotificationEventContext {
    /** Short human title, e.g. "Expense submitted". */
    title: string;
    /** One-line body, e.g. "Travel — ₦40,000 from Ada Obi". */
    message: string;
    /** Where the notification should take the recipient, if anywhere. */
    actionUrl?: string;
    relatedId?: string;
    relatedType?: string;
    /**
     * The user who caused the event, used by the "The requester" recipient
     * group and excluded from broadcast so nobody is told about their own act.
     */
    actorUserId?: string;
    /** Substitutions available to a configured email template. */
    vars?: Record<string, unknown>;
}

/**
 * Delivers the notification rules configured in Admin › Notifications.
 *
 * Those rules were written to the settings record and read back by the screen
 * that wrote them, and nothing else: no code path consulted them, and the
 * separate rule table that a dispatcher did read was never populated by the UI
 * and never invoked. Business code now calls `dispatch` with an event key from
 * the catalogue, and the configured rules decide who hears about it and how.
 *
 * Dispatch never throws: a notification failing must not roll back the action
 * that triggered it.
 */
@Injectable()
export class NotificationDispatchService {
    private readonly logger = new Logger(NotificationDispatchService.name);

    constructor(
        private prisma: PrismaService,
        private mailQueue: MailQueueService,
        private emailTemplates: EmailTemplateService,
        private hrSetup: HrSetupService,
    ) {}

    async dispatch(
        event: string,
        context: NotificationEventContext,
    ): Promise<void> {
        try {
            if (!NOTIFICATION_EVENT_KEYS.includes(event)) {
                this.logger.warn(`Ignoring unknown notification event "${event}"`);
                return;
            }

            const rules = (await this.rulesFor(event)).filter(
                (rule) => rule.enabled !== false,
            );
            if (rules.length === 0) return;

            // The HR Setup email block, resolved once per event.
            const mail = await this.hrMailRouting(event);

            for (const rule of rules) {
                const recipients = await this.resolveRecipients(rule, context);
                if (recipients.length === 0) continue;

                const channels = (rule.channels ?? []).map((c) => String(c));
                if (channels.includes('In-App')) {
                    await this.createInAppNotifications(recipients, event, context);
                }
                if (channels.includes('Email')) {
                    await this.sendEmails(recipients, context, mail);
                }
                // SMS has no provider configured; saying so beats silently
                // dropping the channel.
                if (channels.includes('SMS')) {
                    this.logger.warn(
                        `Rule "${rule.name}" requests SMS for ${event}, but no SMS provider is configured.`,
                    );
                }
            }
        } catch (error) {
            this.logger.error(
                `Failed to dispatch "${event}": ${(error as Error).message}`,
            );
        }
    }

    private async rulesFor(event: string): Promise<StoredNotificationRule[]> {
        const row = await this.prisma.systemSetting
            .findUnique({ where: { key: ADMIN_SETTINGS_KEY } })
            .catch(() => null);
        const value = (row?.value ?? {}) as Record<string, unknown>;
        const rules = Array.isArray(value.notificationRules)
            ? (value.notificationRules as StoredNotificationRule[])
            : [];
        return rules.filter((rule) => String(rule?.event ?? '') === event);
    }

    /**
     * Turns a rule's recipient setting into users.
     *
     * Accepts a named group, a role name, or a comma-separated list of email
     * addresses, which is what the settings screen collects.
     */
    private async resolveRecipients(
        rule: StoredNotificationRule,
        context: NotificationEventContext,
    ): Promise<{ id: string; email: string; name: string }[]> {
        const select = { id: true, email: true, name: true } as const;
        const setting = String(rule.recipients ?? '').trim();
        if (!setting) return [];

        const active = { status: { not: 'Inactive' } } as const;

        if (/^all users$/i.test(setting)) {
            const users = await this.prisma.user.findMany({ where: active, select });
            return users.filter((u) => u.id !== context.actorUserId);
        }

        if (/^(administrators|admins?)$/i.test(setting)) {
            return this.prisma.user.findMany({
                where: { ...active, role: { contains: 'admin', mode: 'insensitive' } },
                select,
            });
        }

        if (/^the requester$/i.test(setting)) {
            if (!context.actorUserId) return [];
            const user = await this.prisma.user.findUnique({
                where: { id: context.actorUserId },
                select,
            });
            return user ? [user] : [];
        }

        const emails = setting
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
        if (emails.length > 0) {
            const users = await this.prisma.user.findMany({
                where: { email: { in: emails, mode: 'insensitive' } },
                select,
            });
            // Addresses with no account still receive the email; they simply
            // have no in-app inbox to write to.
            const known = new Set(users.map((u) => u.email.toLowerCase()));
            return [
                ...users,
                ...emails
                    .filter((e) => !known.has(e.toLowerCase()))
                    .map((email) => ({ id: '', email, name: email })),
            ];
        }

        // Anything else is treated as a role name.
        return this.prisma.user.findMany({
            where: { ...active, role: { equals: setting, mode: 'insensitive' } },
            select,
        });
    }

    private async createInAppNotifications(
        recipients: { id: string }[],
        event: string,
        context: NotificationEventContext,
    ): Promise<void> {
        const rows = recipients
            .filter((r) => r.id)
            .map((r) => ({
                userId: r.id,
                title: context.title,
                message: context.message,
                type: event,
                actionUrl: context.actionUrl ?? null,
                relatedId: context.relatedId ?? null,
                relatedType: context.relatedType ?? null,
            }));
        if (rows.length === 0) return;
        await this.prisma.notification.createMany({ data: rows });
    }

    /**
     * Emails the recipients, preferring the template configured for this event
     * in Admin › Email Configuration and falling back to the event's own text.
     */
    /**
     * The HR Setup email block, applied to HR notifications only.
     *
     * The three addresses collected on HR Setup were read by nothing. They
     * govern HR notification email: the sender address, a copy-to mailbox, and
     * the HR team address looped in on leave activity even when no rule names
     * it. Scoped to HR events so an HR setting does not silently reroute finance
     * or procurement mail.
     */
    private async hrMailRouting(
        event: string,
    ): Promise<{ from?: string; cc: string[]; extraTo: string[] }> {
        const def = NOTIFICATION_EVENTS.find((e) => e.key === event);
        if (def?.app !== 'hr') return { cc: [], extraTo: [] };

        const setup = await this.hrSetup.read().catch(() => null);
        if (!setup) return { cc: [], extraTo: [] };

        return {
            from: setup.senderEmail || undefined,
            cc: setup.notificationEmail ? [setup.notificationEmail] : [],
            extraTo: setup.hrEmail ? [setup.hrEmail] : [],
        };
    }

    private async sendEmails(
        recipients: { email: string }[],
        context: NotificationEventContext,
        mail: { from?: string; cc: string[]; extraTo: string[] },
    ): Promise<void> {
        const to = Array.from(
            new Set(
                [...recipients.map((r) => r.email), ...mail.extraTo]
                    .map((e) => e.trim())
                    .filter(Boolean),
            ),
        );
        if (to.length === 0) return;

        const composed = await this.emailTemplates.compose(context.title, {
            ...(context.vars ?? {}),
            title: context.title,
            message: context.message,
        });

        const cc = Array.from(
            new Set([...(composed?.cc ?? []), ...mail.cc].filter(Boolean)),
        );

        await this.mailQueue.enqueueEmail({
            to,
            from: mail.from,
            subject: composed?.subject || context.title,
            text: composed?.text || context.message,
            html: composed?.html,
            cc: cc.length ? cc : undefined,
        });
    }
}
