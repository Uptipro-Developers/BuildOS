import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityHistoryService } from '../activity-history/activity-history.service';
import { NotificationService } from '../notifications/notification.service';

/** Columns accepted from clients; everything else is dropped. */
const EMPLOYEE_FIELDS = [
    'firstName', 'lastName', 'middleName', 'email', 'phone', 'dateOfBirth',
    'gender', 'dateHired', 'status', 'employmentType', 'projectCount', 'projects',
    'baseSalary', 'gradeLevel', 'jobRoleId', 'bankName', 'accountNumber',
    'accountHolder', 'supervisorId', 'taxId', 'pensionId', 'healthInsuranceId',
    'emergencyContact', 'emergencyPhone', 'address', 'city', 'state', 'zipCode',
    'departmentId', 'role',
] as const;

const DATE_FIELDS = new Set(['dateOfBirth', 'dateHired']);

function sanitizeEmployeeInput(data: any): Record<string, any> {
    const out: Record<string, any> = {};
    for (const key of EMPLOYEE_FIELDS) {
        if (data?.[key] === undefined) continue;
        if (DATE_FIELDS.has(key)) {
            // Coerce to Date or omit (empty string → undefined so Prisma skips the field)
            out[key] = data[key] ? new Date(data[key]) : undefined;
        } else {
            out[key] = data[key];
        }
    }
    return out;
}

@Injectable()
export class EmployeesService {
    private readonly logger = new Logger(EmployeesService.name);

    constructor(
        private prisma: PrismaService,
        private activityHistory: ActivityHistoryService,
        private notificationService: NotificationService,
    ) { }

    private getFrontendBaseUrl(): string {
        const configured = (process.env.FRONTEND_URL || process.env.APP_WEB_URL || '').replace(/\/$/, '');
        if (configured) return configured;
        return process.env.NODE_ENV === 'production'
            ? 'https://build-os-delta.vercel.app'
            : 'http://localhost:5173';
    }

    /**
     * Creates the login account a newly onboarded employee uses to activate BuildOS access,
     * and sends the "New User Created" welcome email via the admin-configured template.
     * Failures here don't fail employee creation — they surface as a warning so HR data
     * isn't lost over an unrelated email/infra issue.
     */
    private async createLinkedUserAccount(employee: { id: string; firstName: string; lastName: string; email: string }) {
        const existing = await this.prisma.user.findUnique({ where: { email: employee.email } });
        if (existing) {
            await this.prisma.employee.update({ where: { id: employee.id }, data: { userId: existing.id } });
            return;
        }

        const name = `${employee.firstName} ${employee.lastName}`.trim();
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const placeholder = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);

        const user = await this.prisma.user.create({
            data: {
                email: employee.email,
                name,
                role: 'employee',
                assignedApps: ['ess', 'hr'],
                password: placeholder,
                status: 'pending_invite',
                inviteToken: token,
                inviteExpiresAt: expiresAt,
            },
        });

        try {
            const activationLink = `${this.getFrontendBaseUrl()}/auth/activate?token=${encodeURIComponent(token)}`;
            await this.notificationService.renderAndSendTemplate('New User Created', employee.email, {
                user_name: name,
                user_email: employee.email,
                activation_link: activationLink,
            });
        } catch (error) {
            await this.prisma.user.delete({ where: { id: user.id } }).catch(() => null);
            throw error;
        }

        await this.prisma.employee.update({ where: { id: employee.id }, data: { userId: user.id } });
    }

    findAll(status?: string, departmentId?: string) {
        return this.prisma.employee.findMany({
            where: {
                ...(status ? { status: status as any } : {}),
                ...(departmentId ? { departmentId } : {}),
            },
            include: { department: true },
            orderBy: { firstName: 'asc' },
        });
    }

    findOne(id: string) {
        return this.prisma.employee.findUniqueOrThrow({
            where: { id },
            include: { department: true },
        });
    }

    async create(data: any) {
        const clean = sanitizeEmployeeInput(data);
        if (!clean.departmentId && typeof data?.department === 'string' && data.department.trim()) {
            const department = await this.prisma.department.findFirst({
                where: { name: { equals: data.department.trim(), mode: 'insensitive' } },
            });
            if (department) clean.departmentId = department.id;
        }
        // Required columns without Prisma defaults.
        clean.phone = clean.phone ?? '';
        clean.dateHired = clean.dateHired ?? new Date();
        const employee = await this.prisma.employee.create({ data: clean as any, include: { department: true } });
        this.activityHistory.create({
            userId: employee.id,
            userName: `${employee.firstName} ${employee.lastName}`,
            action: 'CREATE',
            module: 'Employee',
            description: `Employee profile created for ${employee.firstName} ${employee.lastName}`,
        }).catch(() => {});

        let onboardingWarning: string | undefined;
        try {
            await this.createLinkedUserAccount(employee);
        } catch (error) {
            onboardingWarning = `Employee saved, but the welcome email/account could not be created: ${
                error instanceof Error ? error.message : 'unknown error'
            }`;
            this.logger.warn(onboardingWarning);
        }

        return onboardingWarning ? { ...employee, onboardingWarning } : employee;
    }

    async update(id: string, data: any) {
        const clean = sanitizeEmployeeInput(data);
        if (!clean.departmentId && typeof data?.department === 'string' && data.department.trim()) {
            const department = await this.prisma.department.findFirst({
                where: { name: { equals: data.department.trim(), mode: 'insensitive' } },
            });
            if (department) clean.departmentId = department.id;
        }
        const employee = await this.prisma.employee.update({ where: { id }, data: clean as any, include: { department: true } });
        this.activityHistory.create({
            userId: employee.id,
            userName: `${employee.firstName} ${employee.lastName}`,
            action: 'UPDATE',
            module: 'Employee',
            description: `Employee profile updated for ${employee.firstName} ${employee.lastName}`,
        }).catch(() => {});
        return employee;
    }

    async remove(id: string) {
        const employee = await this.prisma.employee.findUnique({ where: { id } });
        if (employee) {
            this.activityHistory.create({
                userId: id,
                userName: `${employee.firstName} ${employee.lastName}`,
                action: 'DELETE',
                module: 'Employee',
                description: `Employee profile deleted for ${employee.firstName} ${employee.lastName}`,
            }).catch(() => {});
        }
        return this.prisma.employee.delete({ where: { id } });
    }
}
