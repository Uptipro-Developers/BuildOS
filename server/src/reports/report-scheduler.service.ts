import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ReportQueryService } from './report-query.service';

/** Must match the key AdminExtrasService writes its settings row under. */
const ADMIN_SETTINGS_KEY = 'admin-settings';

/** How often due schedules are checked. */
const TICK_MS = 5 * 60 * 1000;

/** Grace period before the post-boot catch-up tick, so the DB pool is warm. */
const STARTUP_DELAY_MS = 45 * 1000;

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
    /**
     * Anchor day. Weekday 0–6 (Sunday–Saturday) for Weekly; day of month 1–31 for
     * Monthly and Quarterly. Undefined keeps the older behaviour of firing on the
     * first send time after the interval elapses.
     */
    sendDay?: number;
    recipients: string;
    enabled: boolean;
    lastSent?: string | null;
    lastError?: string | null;
    /** Stamped by createReportSchedule; anchors the very first send. */
    createdAt?: string | null;
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
    private startupTimer: NodeJS.Timeout | null = null;
    /** Guards against a slow tick overlapping the next one. */
    private running = false;
    /** When the loop last completed a pass, for the status endpoint. */
    private lastTickAt: string | null = null;
    private lastTickError: string | null = null;
    private ticks = 0;
    private readonly startedAt = new Date().toISOString();

    constructor(
        private prisma: PrismaService,
        private reportQuery: ReportQueryService,
        private email: EmailService,
    ) {}

    onModuleInit() {
        // A catch-up tick shortly after boot. This used to wait a full interval,
        // on the reasoning that running at boot would make a restart loop resend
        // every due report — but that is no longer possible: due-ness is anchored
        // to the most recent `sendTime` slot and `lastSent` is stamped after every
        // attempt, so a report whose slot has been served cannot be picked up
        // again by a restart. Meanwhile the old behaviour meant a deploy could
        // push delivery out by five minutes, and a service restarting more often
        // than the interval never delivered at all.
        this.startupTimer = setTimeout(() => void this.tick(), STARTUP_DELAY_MS);
        this.startupTimer.unref?.();

        this.timer = setInterval(() => void this.tick(), TICK_MS);
        // Do not hold the process open on shutdown.
        this.timer.unref?.();
        this.logger.log(
            `Report scheduler started; checking for due schedules every ${TICK_MS / 60000} minutes.`,
        );
    }

    onModuleDestroy() {
        if (this.startupTimer) clearTimeout(this.startupTimer);
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
     * The offset of `timeZone` from UTC at a given instant, in milliseconds.
     *
     * Derived by formatting the instant in the zone and reading the result back as
     * if it were UTC. This is the standard way to do zone maths without a date
     * library, and it handles DST because the offset is resolved per instant.
     */
    private zoneOffsetMs(at: Date, timeZone: string): number {
        try {
            const parts = new Intl.DateTimeFormat('en-US', {
                timeZone,
                hour12: false,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            })
                .formatToParts(at)
                .reduce<Record<string, string>>((acc, part) => {
                    acc[part.type] = part.value;
                    return acc;
                }, {});
            const asUtc = Date.UTC(
                Number(parts.year),
                Number(parts.month) - 1,
                Number(parts.day),
                Number(parts.hour) % 24,
                Number(parts.minute),
                Number(parts.second),
            );
            return asUtc - at.getTime();
        } catch {
            // An unknown zone name must not stop delivery; fall back to UTC.
            return 0;
        }
    }

    /** Calendar fields of `at` as seen in `timeZone`. */
    private zonedFields(at: Date, timeZone: string) {
        const shifted = new Date(at.getTime() + this.zoneOffsetMs(at, timeZone));
        return {
            year: shifted.getUTCFullYear(),
            month: shifted.getUTCMonth() + 1,
            day: shifted.getUTCDate(),
            weekday: shifted.getUTCDay(),
        };
    }

    /** The instant of a wall-clock date and time in `timeZone`. */
    private zonedInstant(
        year: number,
        month: number,
        day: number,
        hours: number,
        minutes: number,
        timeZone: string,
    ): Date {
        const guess = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
        // Correct by the offset that actually applies at that instant.
        const offset = this.zoneOffsetMs(new Date(guess), timeZone);
        return new Date(guess - offset);
    }

    /** Days in a month, so a day-of-month anchor past the end clamps to it. */
    private daysInMonth(year: number, month: number): number {
        return new Date(Date.UTC(year, month, 0)).getUTCDate();
    }

    /**
     * The most recent moment this schedule was due, at or before `now`.
     *
     * Anchored to the organisation's timezone rather than the server's, so an 08:00
     * daily report goes out at 08:00 in Lagos and not 08:00 UTC. Weekly anchors on
     * `sendDay` as a weekday; Monthly and Quarterly anchor on it as a day of month,
     * clamped to the month's length so 31 still fires in February.
     */
    private mostRecentSlot(
        schedule: ReportSchedule,
        now: Date,
        time: { hours: number; minutes: number },
        timeZone: string,
    ): Date {
        const today = this.zonedFields(now, timeZone);
        const at = (y: number, m: number, d: number) =>
            this.zonedInstant(y, m, d, time.hours, time.minutes, timeZone);

        if (schedule.frequency === 'Weekly' && Number.isInteger(schedule.sendDay)) {
            const target = ((schedule.sendDay as number) % 7 + 7) % 7;
            // How many days back the target weekday last occurred.
            let back = (today.weekday - target + 7) % 7;
            let slot = at(today.year, today.month, today.day - back);
            if (slot.getTime() > now.getTime()) {
                back += 7;
                slot = at(today.year, today.month, today.day - back);
            }
            return slot;
        }

        if (
            (schedule.frequency === 'Monthly' || schedule.frequency === 'Quarterly') &&
            Number.isInteger(schedule.sendDay)
        ) {
            const wanted = Math.min(Math.max(schedule.sendDay as number, 1), 31);
            const thisMonth = at(
                today.year,
                today.month,
                Math.min(wanted, this.daysInMonth(today.year, today.month)),
            );
            if (thisMonth.getTime() <= now.getTime()) return thisMonth;
            // Not reached yet this month — the previous month's occurrence stands.
            const prevMonth = today.month === 1 ? 12 : today.month - 1;
            const prevYear = today.month === 1 ? today.year - 1 : today.year;
            return at(prevYear, prevMonth, Math.min(wanted, this.daysInMonth(prevYear, prevMonth)));
        }

        // Daily, or a longer frequency with no anchor: the most recent send time.
        const todaySlot = at(today.year, today.month, today.day);
        return todaySlot.getTime() <= now.getTime()
            ? todaySlot
            : at(today.year, today.month, today.day - 1);
    }

    /** Parses "HH:MM" into hours and minutes, or null if unusable. */
    private parseSendTime(value?: string): { hours: number; minutes: number } | null {
        const match = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? '').trim());
        if (!match) return null;
        const hours = Number(match[1]);
        const minutes = Number(match[2]);
        if (hours > 23 || minutes > 59) return null;
        return { hours, minutes };
    }

    /**
     * Whether a schedule is due.
     *
     * `sendTime` used to be ignored entirely: due-ness was purely "has one interval
     * elapsed since lastSent", so a Daily 08:00 report went out at whatever time of
     * day the tick landed on — and after a manual "Send now" it drifted to that
     * moment instead. The configured time was decorative.
     *
     * Now the schedule's own send moment is the anchor, resolved in the
     * organisation's timezone (Admin → General Settings) rather than the server's,
     * which on Railway is UTC. A schedule is due when its most recent send moment is
     * newer than its last send, so a window missed by a restart or a slow deploy
     * catches up on the following tick rather than being skipped.
     */
    private isDue(schedule: ReportSchedule, now: Date, timeZone: string): boolean {
        if (!schedule.enabled) return false;
        if (!schedule.recipients?.trim()) return false;

        const parsedLast = schedule.lastSent ? new Date(schedule.lastSent) : null;
        const last =
            parsedLast && !Number.isNaN(parsedLast.getTime()) ? parsedLast : null;
        const interval = this.intervalFor(schedule.frequency);
        const time = this.parseSendTime(schedule.sendTime);

        // Hourly has no meaningful time of day, and a schedule saved without a
        // usable sendTime keeps the old elapsed-interval behaviour rather than
        // never firing at all.
        if (!time || schedule.frequency === 'Hourly') {
            return !last || now.getTime() - last.getTime() >= interval;
        }

        const slot = this.mostRecentSlot(schedule, now, time, timeZone);
        const anchored =
            Number.isInteger(schedule.sendDay) &&
            (schedule.frequency === 'Weekly' ||
                schedule.frequency === 'Monthly' ||
                schedule.frequency === 'Quarterly');

        if (!last) {
            // First run waits for a send moment that falls after the schedule was
            // created, so creating an 08:00 daily at 10:00 delivers tomorrow at
            // 08:00 rather than within minutes of being saved.
            const createdRaw = schedule.createdAt ? new Date(schedule.createdAt) : null;
            const created =
                createdRaw && !Number.isNaN(createdRaw.getTime()) ? createdRaw : null;
            return !created || slot.getTime() >= created.getTime();
        }

        // Nothing new has come around since the last send.
        if (last.getTime() >= slot.getTime()) return false;

        // Daily is governed by the slot alone, and so is an anchored Weekly or
        // Monthly — the anchor only comes around once per period. Quarterly shares
        // the monthly anchor, so it still needs the interval to tell one quarter from
        // the following month. Unanchored longer frequencies keep the interval test.
        if (schedule.frequency === 'Daily') return true;
        if (anchored && schedule.frequency !== 'Quarterly') return true;
        return now.getTime() - last.getTime() >= interval;
    }

    /**
     * Resolves which data source and columns a schedule should run.
     *
     * The template is consulted FIRST, because it is the only thing that carries
     * the column selection the report was built with. This used to return early
     * on `schedule.source` alone — and the UI always sends `source` while never
     * sending `fields` — so the template branch was unreachable and every
     * scheduled email attached the source's entire column list instead of the
     * template's chosen columns. Recipients got the whole table.
     *
     * `schedule.source`/`schedule.fields` remain the fallback for a schedule whose
     * template has since been deleted, so those keep working rather than silently
     * stopping.
     */
    private async resolveSource(schedule: ReportSchedule, settings: Record<string, any>) {
        const templates = Array.isArray(settings.reportTemplates)
            ? settings.reportTemplates
            : [];
        const template = schedule.templateId
            ? templates.find((t: any) => t?.id === schedule.templateId)
            : undefined;

        if (template) {
            // Only deployed templates are automated; a draft is still being built.
            if (String(template.status ?? '').toLowerCase() !== 'deployed') return null;

            const fields = Array.isArray(template.selectedFields)
                ? template.selectedFields.map((f: any) => String(f?.key ?? f)).filter(Boolean)
                : [];

            return {
                source: String(template.dataSource ?? schedule.source ?? ''),
                // An empty selection means the template never picked columns, so
                // defer to the schedule's own list before letting the query fall
                // back to every field.
                fields: fields.length > 0 ? fields : schedule.fields,
            };
        }

        if (schedule.source) return { source: schedule.source, fields: schedule.fields };
        return null;
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
            // The organisation's timezone lives in the same settings row, so this
            // costs nothing extra to read.
            const timeZone =
                String(settings?.generalSettings?.timezone ?? '').trim() || 'UTC';
            const due = schedules.filter((s) => this.isDue(s, now, timeZone));
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
            this.lastTickError = null;
        } catch (error) {
            this.lastTickError = (error as Error).message;
            this.logger.error(`Report scheduler tick failed: ${(error as Error).message}`);
        } finally {
            this.lastTickAt = new Date().toISOString();
            this.ticks += 1;
            this.running = false;
        }
    }

    /**
     * Whether the loop is actually alive, and what it currently thinks is due.
     *
     * Delivery failures here are almost always environmental rather than logical
     * — the process not staying up between windows, or more than one instance —
     * and none of that is visible from the Report Automation screen, where a
     * schedule that never fires looks identical to one the loop has never seen.
     * This reports the loop's own heartbeat alongside each schedule's computed
     * due-ness so the two cases can be told apart.
     */
    async status() {
        const settings = await this.readSettings();
        const schedules: ReportSchedule[] = Array.isArray(settings.reportSchedules)
            ? settings.reportSchedules
            : [];
        const now = new Date();
        const timeZone =
            String(settings?.generalSettings?.timezone ?? '').trim() || 'UTC';

        return {
            running: this.timer !== null,
            startedAt: this.startedAt,
            lastTickAt: this.lastTickAt,
            lastTickError: this.lastTickError,
            ticks: this.ticks,
            tickIntervalMinutes: TICK_MS / 60000,
            timeZone,
            serverTime: now.toISOString(),
            schedules: schedules.map((s) => ({
                id: s.id,
                name: s.name,
                enabled: s.enabled,
                frequency: s.frequency,
                sendTime: s.sendTime,
                recipients: s.recipients,
                lastSent: s.lastSent ?? null,
                lastError: s.lastError ?? null,
                dueNow: this.isDue(s, now, timeZone),
            })),
        };
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
