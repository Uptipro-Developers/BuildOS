import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';

const FINANCE_CONFIG_KEY = 'finance-config';

@Injectable()
export class ExpensesService {
    constructor(
        private prisma: PrismaService,
        private notifications: NotificationDispatchService,
    ) { }

    /**
     * The approval threshold from Finance › Configuration.
     *
     * The screen says "expenses above this amount require manager approval" and
     * the value was stored, but no code read it: a submitted expense of any size
     * took the same path.
     */
    private async approvalThreshold(): Promise<number | null> {
        const row = await this.prisma.systemSetting
            .findUnique({ where: { key: FINANCE_CONFIG_KEY } })
            .catch(() => null);
        const raw = (row?.value as Record<string, unknown> | undefined)
            ?.approvalThreshold;
        const threshold = Number(raw);
        // Absent, blank or zero means "approve nothing automatically", which is
        // the behaviour every installation had before the setting was read.
        return Number.isFinite(threshold) && threshold > 0 ? threshold : null;
    }

    findAll(status?: string, projectId?: string) {
        return this.prisma.expense.findMany({
            where: {
                ...(status ? { status: status as any } : {}),
                ...(projectId ? { projectId } : {}),
            },
            include: { project: true },
            orderBy: { date: 'desc' },
        });
    }

    findOne(id: string) {
        return this.prisma.expense.findUniqueOrThrow({
            where: { id },
            include: { project: true },
        });
    }

    /**
     * Applies the configured threshold to an expense being submitted.
     *
     * Only submissions at or below the threshold are affected, and only when a
     * threshold is configured — with none set (the default) nothing is
     * auto-approved and every expense goes to a manager, exactly as before.
     */
    private async withThreshold(data: any, amount: number) {
        if (String(data?.status) !== 'Submitted') return data;

        const threshold = await this.approvalThreshold();
        if (threshold === null || !Number.isFinite(amount) || amount > threshold) {
            return data;
        }

        return {
            ...data,
            status: 'Approved',
            approvedBy: `Auto-approved (at or below the ${threshold} approval threshold)`,
            approvedAt: new Date(),
        };
    }

    async create(data: any) {
        const withStatus = await this.withThreshold(data, Number(data?.amount));
        const expense = await this.prisma.expense.create({
            data: withStatus,
            include: { project: true },
        });
        this.announce(expense, String(data?.status ?? ''));
        return expense;
    }

    async update(id: string, data: any) {
        // The amount may not be in the patch, so the stored one decides.
        const existing = await this.prisma.expense.findUnique({
            where: { id },
            select: { amount: true, status: true },
        });
        const amount = Number(data?.amount ?? existing?.amount);
        const withStatus = await this.withThreshold(data, amount);
        const expense = await this.prisma.expense.update({
            where: { id },
            data: withStatus,
            include: { project: true },
        });
        // Only a change of status is worth announcing; editing a description is
        // not something anyone asked to be notified about.
        if (existing?.status !== expense.status) {
            this.announce(expense, String(data?.status ?? ''));
        }
        return expense;
    }

    /**
     * Fires the notification rules configured for this expense's new status.
     * Deliberately not awaited: the expense is already saved, and a notification
     * problem must not turn a successful save into an error.
     */
    private announce(expense: any, requestedStatus: string) {
        const event =
            expense.status === 'Approved'
                ? 'expense.approved'
                : expense.status === 'Rejected'
                    ? 'expense.rejected'
                    : requestedStatus === 'Submitted'
                        ? 'expense.submitted'
                        : null;
        if (!event) return;

        void this.notifications.dispatch(event, {
            title:
                event === 'expense.approved'
                    ? 'Expense approved'
                    : event === 'expense.rejected'
                        ? 'Expense rejected'
                        : 'Expense submitted',
            message: `${expense.category} — ${expense.amount} (${expense.description})`,
            actionUrl: '/apps/finance/expenses',
            relatedId: expense.id,
            relatedType: 'Expense',
            vars: {
                category: expense.category,
                amount: expense.amount,
                description: expense.description,
                project: expense.project?.name ?? '',
            },
        });
    }

    remove(id: string) {
        return this.prisma.expense.delete({ where: { id } });
    }
}
