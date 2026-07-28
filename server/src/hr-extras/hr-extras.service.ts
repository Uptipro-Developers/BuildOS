import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const HR_SETUP_KEY = 'hr-setup';

@Injectable()
export class HrExtrasService {
    constructor(private prisma: PrismaService) { }

    // ── Attendance ──
    findAllAttendance(employeeId?: string, date?: string) {
        let dateFilter: { gte: Date; lt: Date } | undefined;
        if (date) {
            const start = new Date(`${date}T00:00:00.000Z`);
            const end = new Date(start);
            end.setUTCDate(end.getUTCDate() + 1);
            dateFilter = { gte: start, lt: end };
        }
        return this.prisma.attendanceRecord.findMany({
            where: {
                ...(employeeId ? { employeeId } : {}),
                ...(dateFilter ? { date: dateFilter } : {}),
            },
            orderBy: { date: 'desc' },
        });
    }
    findAttendance(id: string) {
        return this.prisma.attendanceRecord.findUniqueOrThrow({ where: { id } });
    }
    createAttendance(data: any) {
        return this.prisma.attendanceRecord.create({ data });
    }
    updateAttendance(id: string, data: any) {
        return this.prisma.attendanceRecord.update({ where: { id }, data });
    }
    deleteAttendance(id: string) {
        return this.prisma.attendanceRecord.delete({ where: { id } });
    }

    // ── Payroll Periods ──
    findAllPeriods() {
        return this.prisma.payrollPeriod.findMany({ orderBy: { startDate: 'desc' } });
    }
    findPeriod(id: string) {
        return this.prisma.payrollPeriod.findUniqueOrThrow({
            where: { id },
            include: { payrollRuns: true },
        });
    }
    createPeriod(data: any) {
        return this.prisma.payrollPeriod.create({ data });
    }
    updatePeriod(id: string, data: any) {
        return this.prisma.payrollPeriod.update({ where: { id }, data });
    }
    deletePeriod(id: string) {
        return this.prisma.payrollPeriod.delete({ where: { id } });
    }

    // ── Payroll Runs ──
    findAllRuns(periodId?: string) {
        return this.prisma.payrollRun.findMany({
            where: periodId ? { periodId } : {},
            include: { entries: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    findRun(id: string) {
        return this.prisma.payrollRun.findUniqueOrThrow({
            where: { id },
            include: { entries: true },
        });
    }
    createRun(data: any) {
        return this.prisma.payrollRun.create({ data });
    }
    updateRun(id: string, data: any) {
        return this.prisma.payrollRun.update({ where: { id }, data });
    }

    // ── Payroll Entries ──
    findEntriesByRun(runId: string) {
        return this.prisma.payrollEntry.findMany({ where: { runId } });
    }
    async departmentPayrollSummary() {
        const latest = await this.prisma.payrollRun.findFirst({
            orderBy: { createdAt: 'desc' },
            include: { entries: true },
        });
        if (!latest) return [];
        const map = new Map<string, { department: string; employees: number; grossPay: number; netPay: number }>();
        latest.entries.forEach((entry) => {
            const department = entry.department || 'Unassigned';
            const current = map.get(department) ?? { department, employees: 0, grossPay: 0, netPay: 0 };
            current.employees += 1;
            current.grossPay += entry.grossPay;
            current.netPay += entry.netPay;
            map.set(department, current);
        });
        return Array.from(map.values());
    }
    updateEntry(id: string, data: any) {
        return this.prisma.payrollEntry.update({ where: { id }, data });
    }

    // ── Payslips ──
    findAllPayslips(employeeId?: string) {
        return this.prisma.payslip.findMany({
            where: employeeId ? { employeeId } : {},
            orderBy: { issuedAt: 'desc' },
        });
    }
    findPayslip(id: string) {
        return this.prisma.payslip.findUniqueOrThrow({ where: { id } });
    }
    createPayslip(data: any) {
        return this.prisma.payslip.create({ data });
    }
    updatePayslip(id: string, data: any) {
        return this.prisma.payslip.update({ where: { id }, data });
    }

    // ── Appraisals ──
    findAllAppraisals(employeeId?: string) {
        return this.prisma.appraisal.findMany({
            where: employeeId ? { employeeId } : {},
            orderBy: { reviewDate: 'desc' },
        });
    }
    findAppraisal(id: string) {
        return this.prisma.appraisal.findUniqueOrThrow({ where: { id } });
    }
    createAppraisal(data: any) {
        return this.prisma.appraisal.create({ data });
    }
    updateAppraisal(id: string, data: any) {
        return this.prisma.appraisal.update({ where: { id }, data });
    }
    deleteAppraisal(id: string) {
        return this.prisma.appraisal.delete({ where: { id } });
    }

    // ── Issues ──
    findAllIssues(status?: string, projectId?: string) {
        return this.prisma.issue.findMany({
            where: {
                ...(status ? { status } : {}),
                ...(projectId ? { projectId } : {}),
            },
            orderBy: { reportedAt: 'desc' },
        });
    }
    findIssue(id: string) {
        return this.prisma.issue.findUniqueOrThrow({ where: { id } });
    }
    createIssue(data: any) {
        return this.prisma.issue.create({ data });
    }
    updateIssue(id: string, data: any) {
        return this.prisma.issue.update({ where: { id }, data });
    }
    deleteIssue(id: string) {
        return this.prisma.issue.delete({ where: { id } });
    }

    // ── Bank Names ──
    findBankNames() {
        return this.prisma.bankName.findMany({ orderBy: { name: 'asc' } });
    }
    createBankName(data: any) {
        return this.prisma.bankName.create({
            data: {
                name: String(data?.name ?? '').trim(),
                code: String(data?.code ?? '').trim(),
                country: String(data?.country ?? 'Nigeria').trim() || 'Nigeria',
                swiftCode: String(data?.swiftCode ?? '').trim(),
                active: data?.active !== false,
            },
        });
    }
    updateBankName(id: string, data: any) {
        const patch: Record<string, unknown> = {};
        if (data?.name !== undefined) patch.name = String(data.name).trim();
        if (data?.code !== undefined) patch.code = String(data.code).trim();
        if (data?.country !== undefined) patch.country = String(data.country).trim();
        if (data?.swiftCode !== undefined) patch.swiftCode = String(data.swiftCode).trim();
        if (data?.active !== undefined) patch.active = !!data.active;
        return this.prisma.bankName.update({ where: { id }, data: patch });
    }
    async toggleBankNameActive(id: string) {
        const bank = await this.prisma.bankName.findUniqueOrThrow({ where: { id } });
        return this.prisma.bankName.update({ where: { id }, data: { active: !bank.active } });
    }
    async deleteBankName(id: string) {
        await this.prisma.bankName.delete({ where: { id } });
        return { id, deleted: true };
    }

    // ── Salary Bands ──
    findSalaryBands() {
        return this.prisma.salaryBand.findMany({ orderBy: { gradeLevel: 'asc' } });
    }
    createSalaryBand(data: any) {
        return this.prisma.salaryBand.create({
            data: {
                name: String(data?.name ?? '').trim(),
                gradeLevel: String(data?.gradeLevel ?? '').trim(),
                minSalary: Number(data?.minSalary ?? 0),
                maxSalary: Number(data?.maxSalary ?? 0),
                midSalary: data?.midSalary != null ? Number(data.midSalary) : null,
                description: data?.description != null ? String(data.description) : null,
            },
        });
    }
    updateSalaryBand(id: string, data: any) {
        const patch: Record<string, unknown> = {};
        if (data?.name !== undefined) patch.name = String(data.name).trim();
        if (data?.gradeLevel !== undefined) patch.gradeLevel = String(data.gradeLevel).trim();
        if (data?.minSalary !== undefined) patch.minSalary = Number(data.minSalary);
        if (data?.maxSalary !== undefined) patch.maxSalary = Number(data.maxSalary);
        if (data?.midSalary !== undefined) patch.midSalary = data.midSalary != null ? Number(data.midSalary) : null;
        if (data?.description !== undefined) patch.description = data.description != null ? String(data.description) : null;
        return this.prisma.salaryBand.update({ where: { id }, data: patch });
    }
    async deleteSalaryBand(id: string) {
        await this.prisma.salaryBand.delete({ where: { id } });
        return { id, deleted: true };
    }

    // ── Holidays ──
    async findHolidays() {
        const rows = await this.prisma.holiday.findMany({ orderBy: { date: 'asc' } });
        return rows.map((h) => ({
            id: h.id,
            name: h.name,
            date: h.date.toISOString().slice(0, 10),
            recurring: h.isRecurring,
            type: h.type,
            affectedDepts: h.affectedDepts,
        }));
    }
    createHoliday(data: any) {
        return this.prisma.holiday.create({
            data: {
                name: String(data?.name ?? '').trim(),
                date: new Date(data?.date),
                type: String(data?.type ?? 'public'),
                isRecurring: data?.isRecurring ?? data?.recurring ?? false,
                affectedDepts: Array.isArray(data?.affectedDepts) ? data.affectedDepts : [],
            },
        });
    }
    async deleteHoliday(id: string) {
        await this.prisma.holiday.delete({ where: { id } });
        return { id, deleted: true };
    }

    // ── HR Setup ──
    async getHrSetup() {
        const row = await this.prisma.systemSetting.findUnique({ where: { key: HR_SETUP_KEY } });
        return (row?.value as Record<string, unknown>) ?? {};
    }
    async saveHrSetup(data: any) {
        const value = JSON.parse(JSON.stringify(data ?? {}));
        await this.prisma.systemSetting.upsert({
            where: { key: HR_SETUP_KEY },
            create: { key: HR_SETUP_KEY, value },
            update: { value },
        });
        return { saved: true, ...data };
    }
}
