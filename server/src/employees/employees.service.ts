import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityHistoryService } from '../activity-history/activity-history.service';
import { AdminExtrasService } from '../admin-extras/admin-extras.service';
import { HrSetupService } from '../hr-extras/hr-setup.service';

/** Columns accepted from clients; everything else is dropped. */
const EMPLOYEE_FIELDS = [
    'firstName', 'lastName', 'middleName', 'email', 'phone', 'dateOfBirth',
    'gender', 'dateHired', 'status', 'employmentType', 'salaryType', 'salaryFrequencyId',
    'paysSalary', 'paymentSource', 'payrollProjectId', 'projectCount', 'projects',
    'baseSalary', 'gradeLevel', 'jobRoleId', 'bankName', 'accountNumber',
    'accountHolder', 'supervisorId', 'taxId', 'pensionId', 'healthInsuranceId',
    'emergencyContact', 'emergencyPhone', 'address', 'city', 'state', 'zipCode',
    'departmentId', 'role', 'position',
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

const normalizeEmploymentType = (value: unknown) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

@Injectable()
export class EmployeesService {
    private readonly logger = new Logger(EmployeesService.name);

    constructor(
        private prisma: PrismaService,
        private activityHistory: ActivityHistoryService,
        private adminExtras: AdminExtrasService,
        private hrSetup: HrSetupService,
    ) { }

    /** Employment-type payroll rules are authoritative; clients only select the type. */
    private async applyEmploymentTypeDefaults(clean: Record<string, any>) {
        if (!clean.employmentType) return;
        const row = await this.prisma.systemSetting.findUnique({ where: { key: 'hr-employment-types' } });
        const items = Array.isArray(row?.value) ? row.value as any[] : [];
        const selected = items.find((item) => normalizeEmploymentType(item?.name) === normalizeEmploymentType(clean.employmentType));
        if (!selected) return;
        clean.paysSalary = selected.paysSalary !== false;
        clean.salaryFrequencyId = clean.salaryFrequencyId || String(selected.defaultSalaryFrequencyId
            ?? (selected.defaultSalaryType === 'Annual' ? 'salary-frequency-annual' : 'salary-frequency-monthly'));
        clean.salaryType = clean.salaryType || String(selected.defaultSalaryType ?? 'Monthly');
        clean.paymentSource = clean.paymentSource === 'project' || clean.paymentSource === 'company'
            ? clean.paymentSource
            : selected.defaultPaymentSource === 'project' ? 'project' : 'company';
        if (clean.paymentSource !== 'project') clean.payrollProjectId = null;
    }

    findAll(status?: string, departmentId?: string) {
        return this.prisma.employee.findMany({
            where: {
                ...(status ? { status: status as any } : {}),
                ...(departmentId ? { departmentId } : {}),
            },
            include: { department: true, user: { select: { role: true } } },
            orderBy: { firstName: 'asc' },
        });
    }

    findOne(id: string) {
        return this.prisma.employee.findUniqueOrThrow({
            where: { id },
            include: { department: true, user: { select: { role: true } } },
        });
    }

    /**
     * The employee's probation, notice and retirement dates.
     *
     * The policy lives in HR Setup and the dates on the employee; neither side
     * was ever put together, so the configured probation period, notice period
     * and retirement age described nothing about anybody.
     */
    async employmentTerms(id: string) {
        const employee = await this.prisma.employee.findUniqueOrThrow({
            where: { id },
            select: { id: true, dateHired: true, dateOfBirth: true },
        });
        const terms = await this.hrSetup.employmentTerms(employee);
        return { employeeId: employee.id, ...terms };
    }

    async create(data: any) {
        const clean = sanitizeEmployeeInput(data);
        await this.applyEmploymentTypeDefaults(clean);
        if (!clean.departmentId && typeof data?.department === 'string' && data.department.trim()) {
            const department = await this.prisma.department.findFirst({
                where: { name: { equals: data.department.trim(), mode: 'insensitive' } },
            });
            if (department) clean.departmentId = department.id;
        }
        // Required columns without Prisma defaults.
        clean.phone = clean.phone ?? '';
        clean.dateHired = clean.dateHired ?? new Date();
        const employee = await this.prisma.employee.create({
            data: clean as any,
            include: { department: true, user: { select: { role: true } } },
        });
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
        await this.applyEmploymentTypeDefaults(clean);
        if (!clean.departmentId && typeof data?.department === 'string' && data.department.trim()) {
            const department = await this.prisma.department.findFirst({
                where: { name: { equals: data.department.trim(), mode: 'insensitive' } },
            });
            if (department) clean.departmentId = department.id;
        }
        const employee = await this.prisma.employee.update({
            where: { id },
            data: clean as any,
            include: { department: true, user: { select: { role: true } } },
        });
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

    listDocuments(employeeId: string) {
        return this.prisma.documentUpload.findMany({ where: { employeeId }, orderBy: { uploadedAt: 'desc' } });
    }

    async addDocument(employeeId: string, data: any) {
        await this.prisma.employee.findUniqueOrThrow({ where: { id: employeeId } });
        const fileName = String(data?.fileName ?? '').trim();
        const fileUrl = String(data?.fileUrl ?? '');
        if (!fileName || !fileUrl.startsWith('data:')) throw new BadRequestException('A valid document file is required.');
        return this.prisma.documentUpload.create({ data: {
            employeeId, fileName, fileUrl, fileSize: Number(data?.fileSize ?? 0),
            mimeType: String(data?.mimeType ?? 'application/octet-stream'),
            documentType: String(data?.documentType ?? 'employee-document'),
            uploadedBy: String(data?.uploadedBy ?? 'HR'), tags: Array.isArray(data?.tags) ? data.tags : [],
        } });
    }

    async deleteDocument(employeeId: string, documentId: string) {
        const document = await this.prisma.documentUpload.findFirst({ where: { id: documentId, employeeId } });
        if (!document) throw new NotFoundException('Employee document not found.');
        await this.prisma.documentUpload.delete({ where: { id: documentId } });
        return { id: documentId, deleted: true };
    }
}
