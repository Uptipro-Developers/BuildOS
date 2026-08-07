import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const HR_SETUP_KEY = 'hr-setup';

/**
 * HR Setup as the payroll and attendance code needs it: parsed, defaulted and
 * typed, rather than a bag of strings each caller re-parses.
 *
 * The stored record holds whatever the HR General Setup form submitted, so
 * every value arrives as a string and any field may be missing.
 */
export interface HrSetup {
    /** "HH:MM", or empty when lateness is not judged. */
    workDayStart: string;
    lateGraceMinutes: number;
    workHoursPerDay: number;
    workDaysPerWeek: number;
    weekStartDay: string;
    overtimeMultiplier: number;
    probationMonths: number;
    noticePeriodDays: number;
    retirementAge: number;
    /** Payroll currency; decides whether the statutory NGN tax table applies. */
    currency: string;
    fiscalYearStart: string;
    payrollFrequency: string;
    /** Flat rate, as a percentage, used where no statutory schedule applies. */
    taxRate: number;
    /** Employee pension contribution, as a percentage of gross pay. */
    pensionRate: number;
    hrEmail: string;
    notificationEmail: string;
    senderEmail: string;
}

const DEFAULTS: HrSetup = {
    workDayStart: '',
    lateGraceMinutes: 0,
    workHoursPerDay: 8,
    workDaysPerWeek: 5,
    weekStartDay: 'Monday',
    overtimeMultiplier: 1.5,
    probationMonths: 3,
    noticePeriodDays: 30,
    retirementAge: 60,
    currency: 'NGN',
    fiscalYearStart: 'January',
    payrollFrequency: 'Monthly',
    taxRate: 15,
    pensionRate: 8,
    hrEmail: '',
    notificationEmail: '',
    senderEmail: '',
};

function num(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function str(value: unknown, fallback: string): string {
    const parsed = String(value ?? '').trim();
    return parsed || fallback;
}

/**
 * Reads the single HR Setup record.
 *
 * Payroll, attendance and HR share one copy of these settings; without a common
 * reader each consumer grew its own hardcoded constant instead (an 8% pension
 * rate, a 22-day month), and configuring the screen changed nothing.
 */
@Injectable()
export class HrSetupService {
    constructor(private prisma: PrismaService) {}

    /** The raw stored record, as the HR Setup screen submitted it. */
    async raw(): Promise<Record<string, unknown>> {
        const row = await this.prisma.systemSetting
            .findUnique({ where: { key: HR_SETUP_KEY } })
            .catch(() => null);
        return (row?.value as Record<string, unknown>) ?? {};
    }

    async read(): Promise<HrSetup> {
        const raw = await this.raw();
        return {
            // Deliberately not defaulted to a start time: guessing one would
            // mark staff late against a number nobody chose.
            workDayStart: String(raw.workDayStart ?? '').trim(),
            lateGraceMinutes: num(raw.lateGraceMinutes, DEFAULTS.lateGraceMinutes),
            workHoursPerDay: num(raw.workHoursPerDay, DEFAULTS.workHoursPerDay),
            workDaysPerWeek: num(raw.workDaysPerWeek, DEFAULTS.workDaysPerWeek),
            weekStartDay: str(raw.weekStartDay, DEFAULTS.weekStartDay),
            overtimeMultiplier: num(raw.overtimeMultiplier, DEFAULTS.overtimeMultiplier),
            probationMonths: num(raw.probationMonths, DEFAULTS.probationMonths),
            noticePeriodDays: num(raw.noticePeriodDays, DEFAULTS.noticePeriodDays),
            retirementAge: num(raw.retirementAge, DEFAULTS.retirementAge),
            currency: str(raw.currency, DEFAULTS.currency),
            fiscalYearStart: str(raw.fiscalYearStart, DEFAULTS.fiscalYearStart),
            payrollFrequency: str(raw.payrollFrequency, DEFAULTS.payrollFrequency),
            taxRate: num(raw.taxRate, DEFAULTS.taxRate),
            pensionRate: num(raw.pensionRate, DEFAULTS.pensionRate),
            hrEmail: String(raw.hrEmail ?? '').trim(),
            notificationEmail: String(raw.notificationEmail ?? '').trim(),
            senderEmail: String(raw.senderEmail ?? '').trim(),
        };
    }

    /**
     * Working days in an average month, from the configured week.
     *
     * Used to pro-rate a monthly salary across days; the deduction code assumed
     * a fixed 22 regardless of the configured working week.
     */
    async workingDaysPerMonth(): Promise<number> {
        const { workDaysPerWeek } = await this.read();
        const days = (Math.min(7, Math.max(1, workDaysPerWeek)) * 52) / 12;
        return Math.round(days * 100) / 100;
    }

    /**
     * The employment policy dates for one employee, from the configured
     * probation period, notice period and retirement age.
     *
     * All three were collected by HR Setup and read by nothing, so an
     * employee's record could not say when their probation ended or when they
     * reach retirement.
     */
    async employmentTerms(employee: {
        dateHired?: Date | string | null;
        dateOfBirth?: Date | string | null;
    }): Promise<EmploymentTerms> {
        const setup = await this.read();
        const hired = toDate(employee.dateHired);
        const born = toDate(employee.dateOfBirth);
        const today = startOfDay(new Date());

        let probationEndDate: string | null = null;
        let onProbation = false;
        if (hired && setup.probationMonths > 0) {
            const end = new Date(hired);
            end.setMonth(end.getMonth() + setup.probationMonths);
            probationEndDate = iso(end);
            onProbation = startOfDay(end).getTime() > today.getTime();
        }

        let retirementDate: string | null = null;
        let yearsToRetirement: number | null = null;
        if (born && setup.retirementAge > 0) {
            const retires = new Date(born);
            retires.setFullYear(retires.getFullYear() + setup.retirementAge);
            retirementDate = iso(retires);
            yearsToRetirement =
                Math.round(
                    ((startOfDay(retires).getTime() - today.getTime()) /
                        (365.25 * 24 * 60 * 60 * 1000)) *
                        10,
                ) / 10;
        }

        return {
            probationMonths: setup.probationMonths,
            probationEndDate,
            onProbation,
            noticePeriodDays: setup.noticePeriodDays,
            retirementAge: setup.retirementAge,
            retirementDate,
            yearsToRetirement,
        };
    }
}

export interface EmploymentTerms {
    probationMonths: number;
    /** Null when the employee has no hire date or probation is not used. */
    probationEndDate: string | null;
    onProbation: boolean;
    noticePeriodDays: number;
    retirementAge: number;
    /** Null when the employee's date of birth is not on file. */
    retirementDate: string | null;
    yearsToRetirement: number | null;
}

function toDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date): Date {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

function iso(d: Date): string {
    return d.toISOString().slice(0, 10);
}
