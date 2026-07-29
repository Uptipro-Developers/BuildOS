import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityHistoryService } from '../activity-history/activity-history.service';
import { AdminExtrasService } from '../admin-extras/admin-extras.service';

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
        private adminExtras: AdminExtrasService,
    ) { }

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

        // Onboarding sends a welcome email now, but deliberately does NOT create a
        // login account: the employee lands in Admin → Users → Pending Sync, where
        // an admin reviews their company email, role and app access before the user
        // is created. A failed email must not lose the HR record, so it degrades to
        // a warning the UI surfaces instead of throwing.
        let onboardingWarning: string | undefined;
        try {
            await this.adminExtras.sendEmployeeWelcomeEmail(employee);
        } catch (error) {
            onboardingWarning = `Employee saved, but the welcome email could not be sent: ${
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
