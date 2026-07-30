import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ReportQueryService } from './report-query.service';

/** Must match the key AdminExtrasService writes its settings row under. */
const ADMIN_SETTINGS_KEY = 'admin-settings';

/** How often due schedules are checked. */
const TICK_MS = 5 * 60 * 1000;

type Frequency = 'Hourly' | 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';

interface ReportSchedule {
    id: string;
    name: string;
    /** The deployed report template this schedule runs. */
    templateId?: string;
    /** Data source to run, resolved from the template when absent. */
    source?: string;
    fields?: string[];
    module?: string;
    frequency: Frequency;
    sendTime?: string;
    recipients: string;
    enabled: boolean;
    lastSent?: string | null;
    lastError?: string | null;
}

/**
 * Runs scheduled reports and emails them.
 *
 * Report Automation persisted schedules but nothing ever executed them: there was
 * no scheduler in the application at all, so "Last sent" stayed at "—" forever and
 * no report was ever delivered. This service is the missing half.
 *
 * It ticks on an interval rather than a cron library so no new dependency is
 * needed, and it decides what is due from each schedule's frequency and its own
 * `lastSent` stamp. That makes it naturally catch-up-safe: a deploy or restart that
 * misses a window sends on the next tick instead of skipping the run entirely.
 *
 * NOTE: the due-check and the send are not distributed-locked, so running more than
 * one backend instance would send a scheduled report once per instance. Single
 * instance today; a lock belongs here before scaling out.
 */
@Injectable()
export class ReportSchedulerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ReportSchedulerService.name);
    private timer: NodeJS.Timeout | null = null;
    /** Guards against a slow tick overlapping the next one. */
    private running = false;

    constructor(
        private prisma: PrismaService,
        private reportQuery: ReportQueryService,
        private email: EmailService,
    ) {}

    onModuleInit() {
        // Deliberately not run at boot: a restart loop would otherwise resend
        // every due report on each restart. The first tick is one interval away.
        this.timer = setInterval(() => void this.tick(), TICK_MS);
        // Do not hold the process open on shutdown.
        this.timer.unref?.();
        this.logger.log(
            `Report scheduler started; checking for due schedules every ${TICK_MS / 60000} minutes.`,
        );
    }

    onModuleDestroy() {
        if (this.timer) clearInterval(this.timer);
    }

    private async readSettings(): Promise<Record<string, any>> {
        const row = await this.prisma.systemSetting.findUnique({
            where: { key: ADMIN_SETTINGS_KEY },
        });
        const value = row?.value;
        return value && typeof value === 'object' && !Array.isArray(value)
            ? (value as Record<string, any>)
            : {};
    }

    private async writeSchedules(schedules: ReportSchedule[]) {
        const settings = await this.readSettings();
        settings.reportSchedules = schedules;
        await this.prisma.systemSetting.upsert({
            where: { key: ADMIN_SETTINGS_KEY },
            create: { key: ADMIN_SETTINGS_KEY, value: settings },
            update: { value: settings },
        });
    }

    /** Milliseconds between runs for a frequency. */
    private intervalFor(frequency: Frequency): number {
        const hour = 60 * 60 * 1000;
        switch (frequency) {
            case 'Hourly':
                return hour;
            case 'Weekly':
                return 7 * 24 * hour;
            case 'Monthly':
                return 30 * 24 * hour;
            case 'Quarterly':
                return 90 * 24 * hour;
            case 'Daily':
            default:
                return 24 * hour;
        }
    }

    /**
     * Whether a schedule is due.
     *
     * A schedule that has never run is due immediately, so enabling one delivers
     * on the next tick rather than after a full period of silence.
     */
    private isDue(schedule: ReportSchedule, now: Date): boolean {
        if (!schedule.enabled) return false;
        if (!schedule.recipients?.trim()) return false;

        const last = schedule.lastSent ? new Date(schedule.lastSent) : null;
        if (!last || Number.isNaN(last.getTime())) return true;

        return now.getTime() - last.getTime() >= this.intervalFor(schedule.frequency);
    }

    /** Resolves which data source a schedule should run. */
    private async resolveSource(schedule: ReportSchedule, settings: Record<string, any>) {
        if (schedule.source) return { source: schedule.source, fields: schedule.fields };

        const templates = Array.isArray(settings.reportTemplates)
            ? settings.reportTemplates
            : [];
        const template = templates.find((t: any) => t?.id === schedule.templateId);
        if (!template) return null;

        // Only deployed templates are automated; a draft is still being built.
        if (String(template.status ?? '').toLowerCase() !== 'deployed') return null;

        return {
            source: String(template.dataSource ?? ''),
            fields: Array.isArray(template.selectedFields)
                ? template.selectedFields.map((f: any) => String(f?.key ?? f)).filter(Boolean)
                : undefined,
        };
    }

    /** Renders rows as CSV for the email attachment. */
    private toCsv(columns: Array<{ label: string }>, rows: Array<Record<string, unknown>>, keys: string[]) {
        const escape = (value: unknown) => {
            const text = value === null || value === undefined ? '' : String(value);
            return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        };
        const header = columns.map((c) => escape(c.label)).join(',');
        const body = rows.map((row) => keys.map((k) => escape(row[k])).join(',')).join('\n');
        // BOM so Excel reads UTF-8 (₦, accents) correctly.
        return `﻿${header}\n${body}\n`;
    }

    async tick() {
        if (this.running) return;
        this.running = true;
        try {
            const settings = await this.readSettings();
            const schedules: ReportSchedule[] = Array.isArray(settings.reportSchedules)
                ? settings.reportSchedules
                : [];
            if (schedules.length === 0) return;

            const now = new Date();
            const due = schedules.filter((s) => this.isDue(s, now));
            if (due.length === 0) return;

            let changed = false;
            for (const schedule of due) {
                try {
                    await this.send(schedule, settings);
                    schedule.lastSent = new Date().toISOString();
                    schedule.lastError = null;
                    changed = true;
                    this.logger.log(`Sent scheduled report "${schedule.name}".`);
                } catch (error) {
                    // Record the failure and still stamp an attempt, so one broken
                    // schedule cannot be retried every tick forever.
                    schedule.lastError = (error as Error).message;
                    schedule.lastSent = new Date().toISOString();
                    changed = true;
                    this.logger.error(
                        `Scheduled report "${schedule.name}" failed: ${(error as Error).message}`,
                    );
                }
            }

            if (changed) await this.writeSchedules(schedules);
        } catch (error) {
            this.logger.error(`Report scheduler tick failed: ${(error as Error).message}`);
        } finally {
            this.running = false;
        }
    }

    /** Runs one schedule and emails the result. Also used by "Send now". */
    async send(schedule: ReportSchedule, settings?: Record<string, any>) {
        const resolved = await this.resolveSource(
            schedule,
            settings ?? (await this.readSettings()),
        );
        if (!resolved?.source) {
            throw new Error(
                'No deployed report template or data source is attached to this schedule.',
            );
        }

        const result = await this.reportQuery.run({
            source: resolved.source,
            fields: resolved.fields,
            limit: 1000,
        });

        const keys = result.columns.map((c) => c.key);
        const csv = this.toCsv(result.columns, result.rows as any[], keys);

        const recipients = schedule.recipients
            .split(/[,;]/)
            .map((r) => r.trim())
            .filter(Boolean);
        if (recipients.length === 0) throw new Error('No recipients configured.');

        const stamp = new Date().toISOString().slice(0, 10);
        await this.email.sendNow({
            to: recipients,
            subject: `${schedule.name} — ${stamp}`,
            html:
                `<p>Your scheduled <strong>${schedule.name}</strong> report is attached.</p>` +
                `<p>${result.total} record${result.total === 1 ? '' : 's'} as of ${stamp}.</p>` +
                `<p style="color:#6b7280;font-size:12px">Sent automatically by BuildOS Report Automation ` +
                `(${schedule.frequency.toLowerCase()}).</p>`,
            attachments: [
                {
                    filename: `${schedule.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${stamp}.csv`,
                    content: Buffer.from(csv, 'utf-8').toString('base64'),
                },
            ],
        });

        return { recipients, rows: result.rows.length, total: result.total };
    }

    /** Runs a schedule immediately by id and stamps lastSent. */
    async sendNow(scheduleId: string) {
        const settings = await this.readSettings();
        const schedules: ReportSchedule[] = Array.isArray(settings.reportSchedules)
            ? settings.reportSchedules
            : [];
        const schedule = schedules.find((s) => s.id === scheduleId);
        if (!schedule) throw new Error(`Schedule ${scheduleId} not found`);

        const outcome = await this.send(schedule, settings);
        schedule.lastSent = new Date().toISOString();
        schedule.lastError = null;
        await this.writeSchedules(schedules);
        return outcome;
    }
}
