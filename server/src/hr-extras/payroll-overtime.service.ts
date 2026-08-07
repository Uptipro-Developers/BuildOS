import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HrSetupService } from './hr-setup.service';

export interface OvertimeResult {
    /** Hours worked beyond the standard day, summed across the month. */
    hours: number;
    /** The employee's derived hourly rate. */
    hourlyRate: number;
    /** Multiplier applied to the hourly rate, from HR Setup. */
    multiplier: number;
    pay: number;
}

const NONE: OvertimeResult = { hours: 0, hourlyRate: 0, multiplier: 1, pay: 0 };

/**
 * Overtime earned in a payroll month, from attendance.
 *
 * HR Setup has always collected a standard working day and an overtime
 * multiplier, and nothing read either: hours recorded beyond the standard day
 * earned nothing, so a payslip looked identical whether somebody worked their
 * hours or well past them.
 *
 * Hours come from the attendance records themselves rather than a separate
 * overtime claim, because attendance is what the clock-in screen already
 * produces. Only whole hours above the standard day count, and only on days
 * actually worked.
 */
@Injectable()
export class PayrollOvertimeService {
    constructor(
        private prisma: PrismaService,
        private hrSetup: HrSetupService,
    ) {}

    /**
     * @param month 1–12, matching PayrollRun.month.
     */
    async calculate(
        employeeId: string,
        baseSalary: number,
        month: number,
        year: number,
    ): Promise<OvertimeResult> {
        const setup = await this.hrSetup.read();
        const standardDay = setup.workHoursPerDay;
        const multiplier = setup.overtimeMultiplier;

        // A zero-hour standard day would make every recorded hour overtime, and
        // a multiplier of zero or less pays nothing — either way there is
        // nothing sensible to add.
        if (!(standardDay > 0) || !(multiplier > 0) || !(baseSalary > 0)) {
            return { ...NONE, multiplier };
        }

        // PayrollRun months are 1-based; Date's are 0-based.
        const start = new Date(Date.UTC(year, month - 1, 1));
        const end = new Date(Date.UTC(year, month, 1));

        const records = await this.prisma.attendanceRecord.findMany({
            where: { employeeId, date: { gte: start, lt: end } },
            select: { hoursWorked: true },
        });

        const hours = records.reduce(
            (sum, record) => sum + Math.max(0, (record.hoursWorked ?? 0) - standardDay),
            0,
        );
        if (hours <= 0) return { ...NONE, multiplier };

        const workingDaysPerMonth = await this.hrSetup.workingDaysPerMonth();
        const monthlyHours = workingDaysPerMonth * standardDay;
        if (!(monthlyHours > 0)) return { ...NONE, multiplier };

        const hourlyRate = baseSalary / monthlyHours;

        return {
            hours: Math.round(hours * 100) / 100,
            hourlyRate: Math.round(hourlyRate * 100) / 100,
            multiplier,
            pay: Math.round(hours * hourlyRate * multiplier),
        };
    }
}
