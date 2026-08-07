import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailQueueService } from '../queue/mail-queue.service';

/** How often the reminder condition is checked. */
const TICK_MS = 30 * 60 * 1000;
/** Grace period after boot before the first check, so the DB pool is warm. */
const STARTUP_DELAY_MS = 60 * 1000;
/** Local hour from which a same-day reminder may be sent. */
const REMIND_FROM_HOUR = 16;
/** The Construction › Settings toggle that gates this reminder. */
const REMINDER_KEY = 'daily_report_reminder';
const NOTIFICATION_TYPE = 'daily-report.reminder';

/**
 * Reminds a project's daily-report contributors when today's report is missing.
 *
 * "Daily report submission reminder" in Construction › Settings was a switch
 * that saved and did nothing. This is the job behind it. It reminds only the
 * contributors each project already names in its setup — no recipient list is
 * invented here — and only when today's report has genuinely not been submitted.
 *
 * It ticks on an interval rather than adding a cron dependency, and it is
 * restart-safe: the same contributor is never reminded twice for one project on
 * one day, because a prior reminder notification is looked up before sending.
 */
@Injectable()
export class ConstructionReminderService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ConstructionReminderService.name);
    private timer: NodeJS.Timeout | null = null;
    private startupTimer: NodeJS.Timeout | null = null;
    /** Guards against a slow tick overlapping the next one. */
    private running = false;

    constructor(
        private prisma: PrismaService,
        private mailQueue: MailQueueService,
    ) {}

    onModuleInit() {
        this.startupTimer = setTimeout(() => void this.tick(), STARTUP_DELAY_MS);
        this.startupTimer.unref?.();
        this.timer = setInterval(() => void this.tick(), TICK_MS);
        this.timer.unref?.();
    }

    onModuleDestroy() {
        if (this.startupTimer) clearTimeout(this.startupTimer);
        if (this.timer) clearInterval(this.timer);
    }

    private async tick(): Promise<void> {
        if (this.running) return;
        this.running = true;
        try {
            // Too early to nag: contributors still have the day to file.
            if (new Date().getHours() < REMIND_FROM_HOUR) return;
            if (!(await this.reminderEnabled())) return;

            // Matches how the form stamps `reportDate`: the UTC calendar day.
            const today = new Date().toISOString().slice(0, 10);
            const projects = await this.prisma.project.findMany({
                where: { status: 'Active' },
                select: { id: true, name: true },
            });

            for (const project of projects) {
                await this.remindProject(project, today).catch((error) => {
                    this.logger.warn(
                        `Daily-report reminder for "${project.name}" failed: ${(error as Error).message}`,
                    );
                });
            }
        } catch (error) {
            this.logger.error(`Reminder tick failed: ${(error as Error).message}`);
        } finally {
            this.running = false;
        }
    }

    /** The global Construction › Settings toggle; defaults on when unset. */
    private async reminderEnabled(): Promise<boolean> {
        const setting = await this.prisma.constructionSetting.findFirst({
            where: { scope: 'global' },
            select: { reportSettings: true },
        });
        const list = Array.isArray(setting?.reportSettings)
            ? (setting!.reportSettings as { key?: string; enabled?: boolean }[])
            : [];
        const row = list.find((r) => r?.key === REMINDER_KEY);
        return row ? row.enabled !== false : true;
    }

    private async remindProject(
        project: { id: string; name: string },
        today: string,
    ): Promise<void> {
        // Already filed today → nothing to remind.
        const submitted = await this.prisma.dailyReport.findFirst({
            where: {
                projectId: project.id,
                reportDate: today,
                status: { not: 'draft' },
            },
            select: { id: true },
        });
        if (submitted) return;

        const contributorIds = await this.contributorIds(project.id);
        if (contributorIds.length === 0) return;

        const employees = await this.prisma.employee.findMany({
            where: { id: { in: contributorIds }, status: 'active' },
            select: { userId: true, email: true },
        });
        if (employees.length === 0) return;

        const title = 'Daily report due';
        const message = `Today's daily report for ${project.name} has not been submitted yet.`;
        const actionUrl = `/apps/construction/projects/${project.id}/daily-reports/new`;

        // Restart- and re-tick-safe: skip contributors already reminded for this
        // project today.
        const userIds = employees
            .map((e) => e.userId)
            .filter((v): v is string => !!v);
        const alreadyReminded = new Set<string>();
        if (userIds.length > 0) {
            const dayStart = new Date(`${today}T00:00:00.000Z`);
            const existing = await this.prisma.notification.findMany({
                where: {
                    type: NOTIFICATION_TYPE,
                    relatedId: project.id,
                    userId: { in: userIds },
                    sentAt: { gte: dayStart },
                },
                select: { userId: true },
            });
            existing.forEach((n) => alreadyReminded.add(n.userId));
        }

        const rows = employees
            .filter((e) => e.userId && !alreadyReminded.has(e.userId))
            .map((e) => ({
                userId: e.userId as string,
                title,
                message,
                type: NOTIFICATION_TYPE,
                actionUrl,
                relatedId: project.id,
                relatedType: 'Project',
            }));
        if (rows.length === 0) return;

        await this.prisma.notification.createMany({ data: rows });

        // Best-effort email to the same contributors; a mail failure must not
        // stop the in-app reminder that already landed.
        const emails = employees.map((e) => e.email).filter(Boolean);
        if (emails.length > 0) {
            await this.mailQueue
                .enqueueEmail({ to: emails, subject: title, text: message })
                .catch(() => undefined);
        }
    }

    private async contributorIds(projectId: string): Promise<string[]> {
        const setup = await this.prisma.projectSetup.findUnique({
            where: { projectId },
            select: { dailyReporting: true },
        });
        const daily = setup?.dailyReporting as
            | { contributorEmployeeIds?: unknown }
            | null
            | undefined;
        const ids = daily?.contributorEmployeeIds;
        return Array.isArray(ids)
            ? ids.filter((v): v is string => typeof v === 'string')
            : [];
    }
}
