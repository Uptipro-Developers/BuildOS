import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PayrollValidationService } from './payroll-validation.service';
import { PayrollTaxService } from './payroll-tax.service';
import { PayrollDeductionsService } from './payroll-deductions.service';
import { PayslipGenerationService } from './payslip-generation.service';
import { LeaveBalanceService } from '../leave-requests/leave-balance.service';

@Injectable()
export class PayrollOrchestrationService {
  constructor(
    private prisma: PrismaService,
    private validationService: PayrollValidationService,
    private taxService: PayrollTaxService,
    private deductionsService: PayrollDeductionsService,
    private payslipService: PayslipGenerationService,
    private leaveBalanceService: LeaveBalanceService,
  ) {}

  /**
   * Complete payroll processing workflow
   */
  async processPayroll(
    periodId: string,
    employeeIds: string[],
    processedBy: string,
  ) {
    // Step 1: Validate
    const validation = await this.validationService.validatePayroll(periodId, employeeIds);

    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Payroll validation failed',
        errors: validation.errors,
      });
    }

    // Step 2: Create payroll run
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new NotFoundException(`Period ${periodId} not found`);
    }

    const payrollRun = await this.prisma.payrollRun.create({
      data: {
        periodId,
        periodName: period.name,
        month: new Date(period.startDate).getMonth() + 1,
        year: new Date(period.startDate).getFullYear(),
        status: 'Processing',
        employeeCount: employeeIds.length,
        processedBy,
      },
    });

    // Step 3: Generate payroll entries
    let totalGross = 0;
    let totalNet = 0;

    for (const empId of employeeIds) {
      const payslip = await this.payslipService.generatePayslip(empId, payrollRun.id);

      await this.prisma.payrollEntry.create({
        data: {
          runId: payrollRun.id,
          employeeId: empId,
          employeeName: payslip.employeeName,
          department: payslip.department,
          grossPay: payslip.grossPay,
          deductions: payslip.totalDeductions,
          netPay: payslip.netPay,
          tax: payslip.incomeTax,
          pension: payslip.pension,
          allowances: payslip.allowances,
          overtime: payslip.overtime,
          overtimeHours: payslip.overtimeHours,
          status: 'Pending',
        },
      });

      totalGross += payslip.grossPay;
      totalNet += payslip.netPay;

      // Save payslip
      await this.payslipService.savePayslip(payslip);
    }

    // Step 4: Update payroll run totals
    await this.prisma.payrollRun.update({
      where: { id: payrollRun.id },
      data: {
        totalGross,
        totalNet,
        status: 'Completed',
        processedAt: new Date(),
      },
    });

    return {
      payrollRunId: payrollRun.id,
      employeesProcessed: employeeIds.length,
      totalGross,
      totalNet,
      validation: {
        errors: validation.errors,
        warnings: validation.warnings,
      },
    };
  }

  /**
   * Get payroll summary for a period
   */
  async getPayrollSummary(periodId: string) {
    const runs = await this.prisma.payrollRun.findMany({
      where: { periodId },
    });

    const entries = await this.prisma.payrollEntry.findMany({
      where: { runId: { in: runs.map((r) => r.id) } },
    });

    return {
      period: (await this.prisma.payrollPeriod.findUnique({ where: { id: periodId } }))?.name,
      runs: runs.length,
      employeesProcessed: entries.length,
      totalGross: entries.reduce((sum, e) => sum + e.grossPay, 0),
      totalDeductions: entries.reduce((sum, e) => sum + e.deductions, 0),
      totalNetPay: entries.reduce((sum, e) => sum + e.netPay, 0),
      totalTax: entries.reduce((sum, e) => sum + e.tax, 0),
    };
  }

  /**
   * Get employee payroll history
   */
  async getEmployeePayrollHistory(employeeId: string, limit = 12) {
    return this.prisma.payrollEntry.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Calculate payroll forecast
   */
  async forecastPayroll(employeeIds: string[], months: number = 1) {
    const forecast = [];

    for (let i = 0; i < months; i++) {
      const forecastDate = new Date();
      forecastDate.setMonth(forecastDate.getMonth() + i);

      let monthlyGross = 0;
      let monthlyDeductions = 0;

      for (const empId of employeeIds) {
        const employee = await this.prisma.employee.findUnique({
          where: { id: empId },
        });

        if (!employee?.baseSalary) continue;

        const deductions = await this.deductionsService.calculateDeductions(
          empId,
          employee.baseSalary,
        );

        monthlyGross += employee.baseSalary;
        monthlyDeductions += deductions.total;
      }

      forecast.push({
        month: forecastDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        grossPay: Math.round(monthlyGross),
        deductions: Math.round(monthlyDeductions),
        netPay: Math.round(monthlyGross - monthlyDeductions),
      });
    }

    return forecast;
  }
}
