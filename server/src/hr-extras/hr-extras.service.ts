import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// One definition of the settings key, shared with the typed reader payroll uses.
import { HR_SETUP_KEY, HrSetupService } from './hr-setup.service';

const EMPLOYMENT_TYPES_KEY = 'hr-employment-types';
const SALARY_FREQUENCIES_KEY = 'hr-salary-frequencies';
const DEFAULT_SALARY_FREQUENCIES = [
    { id: 'salary-frequency-monthly', name: 'Monthly' },
    { id: 'salary-frequency-weekly', name: 'Weekly' },
    { id: 'salary-frequency-fortnightly', name: 'Fortnightly' },
    { id: 'salary-frequency-annual', name: 'Annual' },
];
const DEFAULT_EMPLOYMENT_TYPES = [
    { id: 'full-time', name: 'Full-time', defaultSalaryType: 'Monthly', defaultSalaryFrequencyId: 'salary-frequency-monthly', paysSalary: true, defaultPaymentSource: 'company' },
    { id: 'contract', name: 'Contract', defaultSalaryType: 'Monthly', defaultSalaryFrequencyId: 'salary-frequency-monthly', paysSalary: true, defaultPaymentSource: 'company' },
];

@Injectable()
export class HrExtrasService {
    constructor(
        private prisma: PrismaService,
        private hrSetup: HrSetupService,
    ) { }

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
    async uploadProjectAttendance(data: any) {
        const projectId = String(data?.projectId ?? '');
        const rows = Array.isArray(data?.rows) ? data.rows : [];
        if (!projectId) throw new BadRequestException('Select a project.');
        if (rows.length === 0) throw new BadRequestException('Add at least one attendance row.');
        const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { id: true, name: true } });
        if (!project) throw new NotFoundException('Project not found.');
        const results: any[] = [];
        const errors: { row: number; message: string }[] = [];
        for (let index = 0; index < rows.length; index += 1) {
            const row = rows[index];
            const employeeId = String(row?.employeeId ?? '').trim();
            const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, include: { department: { select: { name: true } } } });
            if (!employee) { errors.push({ row: index + 1, message: `Employee ID ${employeeId || '(blank)'} was not found.` }); continue; }
            const date = new Date(row?.date);
            if (Number.isNaN(date.getTime())) { errors.push({ row: index + 1, message: 'A valid attendance date is required.' }); continue; }
            const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
            const recordData = {
                employeeId: employee.id, employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
                department: employee.department?.name ?? 'Unassigned', date, clockIn: row?.clockIn ? String(row.clockIn) : null,
                clockOut: row?.clockOut ? String(row.clockOut) : null, hoursWorked: Number(row?.hoursWorked ?? 0),
                status: String(row?.status ?? 'present').toLowerCase(), notes: row?.notes ? String(row.notes) : null,
                projectId: project.id, projectName: project.name, source: 'project', partnerId: row?.partnerId ? String(row.partnerId) : null,
                partnerName: row?.partnerName ? String(row.partnerName) : null,
            };
            const existing = await this.prisma.attendanceRecord.findFirst({ where: { employeeId: employee.id, projectId, date: { gte: dayStart, lt: dayEnd } } });
            results.push(existing
                ? await this.prisma.attendanceRecord.update({ where: { id: existing.id }, data: recordData })
                : await this.prisma.attendanceRecord.create({ data: recordData }));
        }
        return { imported: results.length, records: results, errors };
    }

    // ── Self-service clock in / out ──
    //
    // The employee is always resolved from the authenticated user, never from the
    // request body. The generic POST /attendance takes an employeeId, so trusting
    // one here would let any signed-in user record attendance for anybody.

    /** The Employee row behind a User id, matching by link first then by email. */
    private async employeeForUser(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true },
        });
        if (!user) throw new NotFoundException('Signed-in user not found');

        const employee = await this.prisma.employee.findFirst({
            where: { OR: [{ userId: user.id }, { email: user.email }] },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                department: { select: { name: true } },
            },
        });
        if (!employee) {
            throw new BadRequestException(
                'No employee record is linked to your account. Ask HR to link it before clocking in.',
            );
        }
        return {
            id: employee.id,
            name: `${employee.firstName} ${employee.lastName}`.trim() || user.name,
            department: employee.department?.name ?? '—',
        };
    }

    /** Today's record for an employee, in the server's local day. */
    private async todaysAttendance(employeeId: string) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);

        return this.prisma.attendanceRecord.findFirst({
            where: { employeeId, date: { gte: start, lt: end } },
            orderBy: { date: 'desc' },
        });
    }

    /** "HH:MM" local time. */
    private clockTime(at = new Date()) {
        return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
    }

    private toMinutes(value: string): number | null {
        const match = /^(\d{1,2}):(\d{2})/.exec(value ?? '');
        if (!match) return null;
        const hours = Number(match[1]);
        const minutes = Number(match[2]);
        if (hours > 23 || minutes > 59) return null;
        return hours * 60 + minutes;
    }

    /** Hours between two "HH:MM" values, allowing a shift past midnight. */
    private hoursBetween(clockIn: string, clockOut: string): number {
        const from = this.toMinutes(clockIn);
        const to = this.toMinutes(clockOut);
        if (from === null || to === null) return 0;
        const span = to >= from ? to - from : to + 24 * 60 - from;
        return Math.round((span / 60) * 10) / 10;
    }

    /**
     * Whether a clock-in counts as late, from HR Setup.
     *
     * Returns `present` when no workday start is configured: guessing a start time
     * would silently mark staff late against a number nobody chose.
     */
    private async statusForClockIn(clockIn: string): Promise<'present' | 'late'> {
        const setup = (await this.getHrSetup()) as Record<string, unknown>;
        const start = String(setup?.workDayStart ?? '').trim();
        const startMinutes = this.toMinutes(start);
        if (startMinutes === null) return 'present';

        const grace = Number(setup?.lateGraceMinutes ?? 0);
        const inMinutes = this.toMinutes(clockIn);
        if (inMinutes === null) return 'present';

        return inMinutes > startMinutes + (Number.isFinite(grace) ? grace : 0)
            ? 'late'
            : 'present';
    }

    /** The caller's own attendance state for today, for the ESS clock-in screen. */
    async myAttendanceToday(userId: string) {
        const employee = await this.employeeForUser(userId);
        const record = await this.todaysAttendance(employee.id);
        const setup = (await this.getHrSetup()) as Record<string, unknown>;

        return {
            employeeId: employee.id,
            employeeName: employee.name,
            department: employee.department,
            record,
            clockedIn: Boolean(record?.clockIn),
            clockedOut: Boolean(record?.clockOut),
            workDayStart: String(setup?.workDayStart ?? '') || null,
            lateGraceMinutes: Number(setup?.lateGraceMinutes ?? 0) || 0,
        };
    }

    async clockIn(userId: string) {
        const employee = await this.employeeForUser(userId);
        const existing = await this.todaysAttendance(employee.id);

        if (existing?.clockIn) {
            throw new ConflictException(
                `You already clocked in at ${existing.clockIn} today.`,
            );
        }

        const time = this.clockTime();
        const status = await this.statusForClockIn(time);

        if (existing) {
            // HR may have already marked them (e.g. absent); clocking in corrects it.
            return this.prisma.attendanceRecord.update({
                where: { id: existing.id },
                data: { clockIn: time, status, hoursWorked: 0 },
            });
        }

        return this.prisma.attendanceRecord.create({
            data: {
                employeeId: employee.id,
                employeeName: employee.name,
                department: employee.department,
                date: new Date(),
                clockIn: time,
                status,
                hoursWorked: 0,
            },
        });
    }

    async clockOut(userId: string) {
        const employee = await this.employeeForUser(userId);
        const existing = await this.todaysAttendance(employee.id);

        if (!existing?.clockIn) {
            throw new BadRequestException('You have not clocked in today.');
        }
        if (existing.clockOut) {
            throw new ConflictException(
                `You already clocked out at ${existing.clockOut} today.`,
            );
        }

        const time = this.clockTime();
        return this.prisma.attendanceRecord.update({
            where: { id: existing.id },
            data: {
                clockOut: time,
                hoursWorked: this.hoursBetween(existing.clockIn, time),
            },
        });
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

    /**
     * Proposes the payroll period that follows the last one, from the
     * configured payroll frequency.
     *
     * "Payroll Frequency" in HR Setup was stored and read by nothing: periods
     * had to be named and dated by hand every time, and a Bi-Weekly or Weekly
     * organisation got no help at all.
     */
    async nextPeriod(frequencyId?: string) {
        const setup = await this.hrSetup.read();
        const frequencies = await this.findSalaryFrequencies() as any[];
        const selected = frequencyId ? frequencies.find((item) => item.id === frequencyId) : undefined;
        const frequency = String(selected?.name ?? setup.payrollFrequency ?? 'Monthly');
        const normalized = frequency.toLowerCase().replace(/[\s-]/g, '');

        const last = await this.prisma.payrollPeriod.findFirst({
            where: selected ? { salaryFrequencyId: selected.id } : {},
            orderBy: { endDate: 'desc' },
        });

        // The day after the last period, or the start of this month on a fresh
        // installation.
        const start = last
            ? new Date(new Date(last.endDate).getTime() + 24 * 60 * 60 * 1000)
            : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        start.setHours(0, 0, 0, 0);

        // Weekly and bi-weekly runs begin on the configured week start day, so a
        // payroll week is the week HR Setup names rather than whichever day the
        // previous period happened to end on. "Week Start Day" was collected and
        // read by nothing until now.
        if (normalized === 'weekly' || normalized === 'biweekly' || normalized === 'fortnightly') {
            const targetDow = setup.weekStartDay === 'Sunday' ? 0 : 1;
            const shift = (targetDow - start.getDay() + 7) % 7;
            start.setDate(start.getDate() + shift);
        }

        const end = new Date(start);
        if (normalized === 'weekly') {
            end.setDate(end.getDate() + 6);
        } else if (normalized === 'biweekly' || normalized === 'fortnightly') {
            end.setDate(end.getDate() + 13);
        } else if (normalized === 'annual' || normalized === 'yearly') {
            end.setFullYear(end.getFullYear() + 1);
            end.setDate(end.getDate() - 1);
        } else if (normalized === 'bimonthly' || normalized === 'semimonthly') {
            if (start.getDate() <= 15) {
                end.setDate(15);
            } else {
                end.setMonth(end.getMonth() + 1);
                end.setDate(0);
            }
        } else {
            // Monthly: through the last day of the starting month.
            end.setMonth(end.getMonth() + 1);
            end.setDate(0);
        }

        const iso = (d: Date) => d.toISOString().slice(0, 10);
        const name =
            normalized === 'monthly'
                ? start.toLocaleString('en-US', { month: 'long', year: 'numeric' })
                : `${iso(start)} – ${iso(end)}`;

        return { name, startDate: iso(start), endDate: iso(end), frequency, salaryFrequencyId: selected?.id ?? null };
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
    async createRun(data: any) {
        const periodId = String(data?.periodId ?? '');
        if (!periodId) throw new BadRequestException('Select a payroll period.');
        const period = await this.prisma.payrollPeriod.findUnique({ where: { id: periodId } });
        if (!period) throw new NotFoundException('Payroll period not found.');
        if (String(period.status).toLowerCase() === 'closed') {
            throw new BadRequestException('A closed payroll period cannot be processed.');
        }

        const scope = data?.scope === 'project' ? 'project' : 'company';
        const projectId = scope === 'project' ? String(data?.projectId ?? '') : null;
        if (scope === 'project' && !projectId) throw new BadRequestException('Select a payroll project.');
        const project = projectId
            ? await this.prisma.project.findUnique({ where: { id: projectId }, select: { id: true, name: true } })
            : null;
        if (projectId && !project) throw new NotFoundException('Payroll project not found.');

        const salaryFrequencyId = String(data?.salaryFrequencyId ?? period.salaryFrequencyId ?? '');
        const frequencies = await this.findSalaryFrequencies() as any[];
        const frequency = frequencies.find((item) => item.id === salaryFrequencyId);
        const existingRun = await this.prisma.payrollRun.findFirst({
            where: { periodId, scope, projectId, salaryFrequencyId: salaryFrequencyId || null },
            select: { id: true },
        });
        if (existingRun) {
            throw new ConflictException('A payroll run already exists for this period, scope and frequency.');
        }
        const employees = await this.prisma.employee.findMany({
            where: {
                status: 'active',
                paysSalary: true,
                paymentSource: scope,
                ...(scope === 'project' ? { payrollProjectId: projectId } : {}),
                ...(salaryFrequencyId ? { salaryFrequencyId } : {}),
            },
            include: { department: { select: { name: true } } },
            orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        });
        if (employees.length === 0) {
            throw new BadRequestException('No active paid employees match this payroll scope and frequency.');
        }
        const employeeIds = employees.map((employee) => employee.id);
        const [inputs, attendance, unpaidLeave] = await Promise.all([
            this.prisma.payrollInput.findMany({ where: { employeeId: { in: employeeIds }, status: 'pending', effectiveDate: { gte: period.startDate, lte: period.endDate } } }),
            this.prisma.attendanceRecord.findMany({ where: { employeeId: { in: employeeIds }, date: { gte: period.startDate, lte: period.endDate } } }),
            this.prisma.leaveRequest.findMany({ where: { employeeId: { in: employeeIds }, status: 'approved', startDate: { lte: period.endDate }, endDate: { gte: period.startDate }, leaveType: { paid: false } }, include: { leaveType: true } }),
        ]);
        const exclusionTypes = new Set(['abscondment', 'dismissal', 'suspension', 'termination', 'resignation']);
        const additionTypes = new Set(['incentive', 'overtime', 'salary_variable', 'reinstatement', 'new_hire']);
        const deductionTypes = new Set(['absenteeism', 'penalty', 'loan', 'voluntary_contribution']);
        const workingDays = this.leaveBalanceWorkingDays(period.startDate, period.endDate);
        const computed = employees
            .filter((employee) => !inputs.some((input) => input.employeeId === employee.id && exclusionTypes.has(input.type.toLowerCase())))
            .map((employee) => {
                const base = Number(employee.baseSalary ?? 0);
                const dailyRate = workingDays > 0 ? base / workingDays : 0;
                const employeeInputs = inputs.filter((input) => input.employeeId === employee.id);
                const inputAllowances = employeeInputs.filter((input) => additionTypes.has(input.type.toLowerCase())).reduce((sum, input) => sum + Number(input.amount), 0);
                const inputDeductions = employeeInputs.filter((input) => deductionTypes.has(input.type.toLowerCase())).reduce((sum, input) => sum + Number(input.amount), 0);
                const absentDays = attendance.filter((record) => record.employeeId === employee.id && ['absent', 'absconded'].includes(record.status.toLowerCase())).length;
                const unpaidDays = unpaidLeave.filter((request) => request.employeeId === employee.id).reduce((sum, request) => sum + request.days, 0);
                const attendanceDeduction = dailyRate * (absentDays + unpaidDays);
                const allowances = inputAllowances;
                const deductions = Math.min(base + allowances, inputDeductions + attendanceDeduction);
                const grossPay = base + allowances;
                return { employee, grossPay, allowances, deductions, netPay: Math.max(0, grossPay - deductions), overtime: employeeInputs.filter((input) => input.type.toLowerCase() === 'overtime').reduce((sum, input) => sum + Number(input.amount), 0), overtimeHours: employeeInputs.filter((input) => input.type.toLowerCase() === 'overtime').reduce((sum, input) => sum + Number(input.quantity), 0) };
            });
        if (computed.length === 0) throw new BadRequestException('All matching employees are excluded by payroll status events.');
        const totalGross = computed.reduce((sum, row) => sum + row.grossPay, 0);
        const totalNet = computed.reduce((sum, row) => sum + row.netPay, 0);
        const runDate = period.startDate;
        return this.prisma.$transaction(async (tx) => {
            const run = await tx.payrollRun.create({
                data: {
                    periodId: period.id,
                    periodName: period.name,
                    month: runDate.getMonth() + 1,
                    year: runDate.getFullYear(),
                    status: 'Draft',
                    scope,
                    projectId,
                    projectName: project?.name ?? null,
                    salaryFrequencyId: salaryFrequencyId || null,
                    salaryFrequencyName: frequency?.name ?? period.salaryFrequencyName ?? null,
                    totalGross,
                    totalNet,
                    employeeCount: computed.length,
                    processedBy: data?.processedBy ? String(data.processedBy) : null,
                    entries: {
                        create: computed.map(({ employee, ...pay }) => ({
                            employeeId: employee.id,
                            employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
                            department: employee.department?.name ?? 'Unassigned',
                            grossPay: pay.grossPay,
                            deductions: pay.deductions,
                            netPay: pay.netPay,
                            allowances: pay.allowances,
                            overtime: pay.overtime,
                            overtimeHours: pay.overtimeHours,
                            status: 'Pending',
                        })),
                    },
                },
                include: { entries: true },
            });
            await tx.payrollPeriod.update({ where: { id: period.id }, data: { status: 'Processing' } });
            await tx.payrollInput.updateMany({ where: { id: { in: inputs.map((input) => input.id) } }, data: { status: 'applied', payrollRunId: run.id } });
            return run;
        });
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

    private leaveBalanceWorkingDays(start: Date, end: Date) {
        let count = 0;
        const day = new Date(start);
        while (day <= end) { if (day.getDay() !== 0 && day.getDay() !== 6) count += 1; day.setDate(day.getDate() + 1); }
        return count;
    }

    findPayrollInputs(employeeId?: string, status?: string) {
        return this.prisma.payrollInput.findMany({ where: { ...(employeeId ? { employeeId } : {}), ...(status ? { status } : {}) }, orderBy: { effectiveDate: 'desc' } });
    }
    async createPayrollInput(data: any) {
        const employeeId = String(data?.employeeId ?? '');
        const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { firstName: true, lastName: true } });
        if (!employee) throw new BadRequestException('Select a valid employee.');
        const type = String(data?.type ?? '').trim().toLowerCase();
        const allowed = ['abscondment', 'absenteeism', 'dismissal', 'incentive', 'new_hire', 'overtime', 'penalty', 'loan', 'reinstatement', 'resignation', 'salary_variable', 'suspension', 'termination', 'voluntary_contribution'];
        if (!allowed.includes(type)) throw new BadRequestException('Select a valid payroll input type.');
        return this.prisma.payrollInput.create({ data: { employeeId, employeeName: `${employee.firstName} ${employee.lastName}`.trim(), type, amount: Number(data?.amount ?? 0), quantity: Number(data?.quantity ?? 0), effectiveDate: new Date(data?.effectiveDate), notes: data?.notes ? String(data.notes) : null } });
    }
    async deletePayrollInput(id: string) {
        const input = await this.prisma.payrollInput.findUniqueOrThrow({ where: { id } });
        if (input.status !== 'pending') throw new ConflictException('Applied payroll inputs cannot be deleted.');
        await this.prisma.payrollInput.delete({ where: { id } });
        return { id, deleted: true };
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
        // The design keys grade by gradeName; `name` stays the unique key, so
        // fall back to gradeName when the caller only sends the design fields.
        const name = String(data?.name ?? data?.gradeName ?? '').trim();
        return this.prisma.salaryBand.create({
            data: {
                name,
                gradeLevel: String(data?.gradeLevel ?? '').trim(),
                minSalary: Number(data?.minSalary ?? 0),
                maxSalary: Number(data?.maxSalary ?? 0),
                midSalary: data?.midSalary != null ? Number(data.midSalary) : null,
                description: data?.description != null ? String(data.description) : null,
                gradeName: data?.gradeName != null ? String(data.gradeName) : null,
                department: data?.department != null ? String(data.department) : null,
                basicSalary: data?.basicSalary != null ? Number(data.basicSalary) : null,
                salaryType: String(data?.salaryType ?? 'Monthly'),
                salaryFrequencyId: data?.salaryFrequencyId != null ? String(data.salaryFrequencyId) : null,
                components: Array.isArray(data?.components) ? data.components : undefined,
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
        if (data?.gradeName !== undefined) patch.gradeName = data.gradeName != null ? String(data.gradeName) : null;
        if (data?.department !== undefined) patch.department = data.department != null ? String(data.department) : null;
        if (data?.basicSalary !== undefined) patch.basicSalary = data.basicSalary != null ? Number(data.basicSalary) : null;
        if (data?.salaryType !== undefined) patch.salaryType = String(data.salaryType);
        if (data?.salaryFrequencyId !== undefined) patch.salaryFrequencyId = data.salaryFrequencyId != null ? String(data.salaryFrequencyId) : null;
        if (data?.components !== undefined) patch.components = Array.isArray(data.components) ? data.components : null;
        return this.prisma.salaryBand.update({ where: { id }, data: patch });
    }
    async deleteSalaryBand(id: string) {
        await this.prisma.salaryBand.delete({ where: { id } });
        return { id, deleted: true };
    }

    // ── Salary Frequencies ──
    async findSalaryFrequencies() {
        const row = await this.prisma.systemSetting.findUnique({ where: { key: SALARY_FREQUENCIES_KEY } });
        const list = row?.value;
        return Array.isArray(list) && list.length > 0 ? list : DEFAULT_SALARY_FREQUENCIES;
    }
    private async saveSalaryFrequencies(items: any[]) {
        const value = JSON.parse(JSON.stringify(items));
        await this.prisma.systemSetting.upsert({
            where: { key: SALARY_FREQUENCIES_KEY },
            create: { key: SALARY_FREQUENCIES_KEY, value },
            update: { value },
        });
        return value;
    }
    async createSalaryFrequency(data: any) {
        const name = String(data?.name ?? '').trim();
        if (!name) throw new BadRequestException('Salary frequency name is required.');
        const items = await this.findSalaryFrequencies() as any[];
        if (items.some((item) => String(item.name).toLowerCase() === name.toLowerCase())) {
            throw new ConflictException(`Salary frequency "${name}" already exists.`);
        }
        const created = { id: `salary-frequency-${Date.now()}`, name };
        await this.saveSalaryFrequencies([...items, created]);
        return created;
    }
    async updateSalaryFrequency(id: string, data: any) {
        const items = await this.findSalaryFrequencies() as any[];
        const current = items.find((item) => item.id === id);
        if (!current) throw new NotFoundException('Salary frequency not found.');
        const name = data?.name === undefined ? current.name : String(data.name).trim();
        if (!name) throw new BadRequestException('Salary frequency name is required.');
        if (items.some((item) => item.id !== id && String(item.name).toLowerCase() === name.toLowerCase())) {
            throw new ConflictException(`Salary frequency "${name}" already exists.`);
        }
        const updated = { ...current, name };
        await this.saveSalaryFrequencies(items.map((item) => item.id === id ? updated : item));
        return updated;
    }
    async deleteSalaryFrequency(id: string) {
        const items = await this.findSalaryFrequencies() as any[];
        if (!items.some((item) => item.id === id)) throw new NotFoundException('Salary frequency not found.');
        const [bandCount, employmentTypes] = await Promise.all([
            this.prisma.salaryBand.count({ where: { salaryFrequencyId: id } }),
            this.findEmploymentTypes() as Promise<any[]>,
        ]);
        if (bandCount > 0 || employmentTypes.some((item) => item.defaultSalaryFrequencyId === id)) {
            throw new ConflictException('This salary frequency is in use and cannot be deleted.');
        }
        await this.saveSalaryFrequencies(items.filter((item) => item.id !== id));
        return { id, deleted: true };
    }

    // ── Employment Types ──
    async findEmploymentTypes() {
        const row = await this.prisma.systemSetting.findUnique({ where: { key: EMPLOYMENT_TYPES_KEY } });
        const list = row?.value;
        const items = Array.isArray(list) && list.length > 0 ? list : DEFAULT_EMPLOYMENT_TYPES;
        return items.map((item: any) => ({
            ...item,
            defaultSalaryType: item.defaultSalaryType || 'Monthly',
            defaultSalaryFrequencyId: item.defaultSalaryFrequencyId
                || (item.defaultSalaryType === 'Annual' ? 'salary-frequency-annual' : 'salary-frequency-monthly'),
            paysSalary: item.paysSalary !== false,
            defaultPaymentSource: item.defaultPaymentSource === 'project' ? 'project' : 'company',
        }));
    }
    private async saveEmploymentTypes(items: any[]) {
        const value = JSON.parse(JSON.stringify(items));
        await this.prisma.systemSetting.upsert({
            where: { key: EMPLOYMENT_TYPES_KEY },
            create: { key: EMPLOYMENT_TYPES_KEY, value },
            update: { value },
        });
        return value;
    }
    async createEmploymentType(data: any) {
        const name = String(data?.name ?? '').trim();
        if (!name) throw new BadRequestException('Employment type name is required.');
        const items = await this.findEmploymentTypes() as any[];
        if (items.some((item) => String(item.name).toLowerCase() === name.toLowerCase())) {
            throw new ConflictException(`Employment type "${name}" already exists.`);
        }
        const created = {
            id: `employment-type-${Date.now()}`,
            name,
            defaultSalaryType: String(data?.defaultSalaryType ?? 'Monthly'),
            defaultSalaryFrequencyId: String(data?.defaultSalaryFrequencyId ?? 'salary-frequency-monthly'),
            paysSalary: data?.paysSalary !== false,
            defaultPaymentSource: data?.defaultPaymentSource === 'project' ? 'project' : 'company',
        };
        await this.saveEmploymentTypes([...items, created]);
        return created;
    }
    async updateEmploymentType(id: string, data: any) {
        const items = await this.findEmploymentTypes() as any[];
        const current = items.find((item) => item.id === id);
        if (!current) throw new NotFoundException('Employment type not found.');
        const name = data?.name === undefined ? current.name : String(data.name).trim();
        if (!name) throw new BadRequestException('Employment type name is required.');
        if (items.some((item) => item.id !== id && String(item.name).toLowerCase() === name.toLowerCase())) {
            throw new ConflictException(`Employment type "${name}" already exists.`);
        }
        const updated = {
            ...current,
            name,
            defaultSalaryType: data?.defaultSalaryType === undefined ? current.defaultSalaryType : String(data.defaultSalaryType),
            defaultSalaryFrequencyId: data?.defaultSalaryFrequencyId === undefined
                ? current.defaultSalaryFrequencyId : String(data.defaultSalaryFrequencyId),
            paysSalary: data?.paysSalary === undefined ? current.paysSalary : data.paysSalary !== false,
            defaultPaymentSource: data?.defaultPaymentSource === undefined
                ? current.defaultPaymentSource : data.defaultPaymentSource === 'project' ? 'project' : 'company',
        };
        await this.saveEmploymentTypes(items.map((item) => item.id === id ? updated : item));
        return updated;
    }
    async deleteEmploymentType(id: string) {
        const items = await this.findEmploymentTypes() as any[];
        if (!items.some((item) => item.id === id)) throw new NotFoundException('Employment type not found.');
        await this.saveEmploymentTypes(items.filter((item) => item.id !== id));
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
    /**
     * Merged onto the stored setup rather than replacing it, so a caller that
     * submits a subset of the fields cannot blank the rest.
     */
    async saveHrSetup(data: any, actingUserId?: string) {
        const current = await this.getHrSetup();
        const incoming = { ...(data ?? {}) };
        // Audit fields are recorded here, never taken from the client.
        delete incoming.updatedBy;
        delete incoming.updatedAt;

        const updatedBy = actingUserId
            ? await this.prisma.user
                .findUnique({ where: { id: actingUserId }, select: { name: true, email: true } })
                .then((u) => u?.name || u?.email || '')
                .catch(() => '')
            : '';

        const value = JSON.parse(
            JSON.stringify({
                ...current,
                ...incoming,
                updatedAt: new Date().toISOString(),
                ...(updatedBy ? { updatedBy } : {}),
            }),
        );
        await this.prisma.systemSetting.upsert({
            where: { key: HR_SETUP_KEY },
            create: { key: HR_SETUP_KEY, value },
            update: { value },
        });
        return { saved: true, ...value };
    }

    /**
     * The System Information panel on the HR Setup screen.
     *
     * It displayed five hardcoded values — a version, a person's name, a date
     * and two counts — none of which came from this installation.
     */
    async getHrSetupSummary() {
        const setup = await this.getHrSetup();
        const [employees, departments] = await Promise.all([
            this.prisma.employee.count({ where: { status: { not: 'inactive' } } }),
            this.prisma.department.count(),
        ]);

        return {
            employees,
            departments,
            updatedAt: (setup.updatedAt as string) ?? null,
            updatedBy: (setup.updatedBy as string) ?? null,
        };
    }
}
