import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PayrollTaxService } from './payroll-tax.service';
import { PayrollDeductionsService } from './payroll-deductions.service';
import { PayrollOvertimeService } from './payroll-overtime.service';

interface PayslipData {
  employeeId: string;
  employeeName: string;
  department: string;
  period: string;
  month: number;
  year: number;

  // Earnings
  baseSalary: number;
  allowances: number;
  bonusOrIncentive: number;
  /** Earned on hours beyond the standard working day, at the configured rate. */
  overtime: number;
  overtimeHours: number;
  grossPay: number;
  
  // Deductions
  incomeTax: number;
  pension: number;
  nhis: number;
  leaveDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  
  // Summary
  netPay: number;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  
  // Metadata
  generatedAt: Date;
  status: string;
}

@Injectable()
export class PayslipGenerationService {
  constructor(
    private prisma: PrismaService,
    private taxService: PayrollTaxService,
    private deductionsService: PayrollDeductionsService,
    private overtimeService: PayrollOvertimeService,
  ) {}

  /**
   * Generate payslip for a single employee
   */
  async generatePayslip(
    employeeId: string,
    runId: string,
    baseSalary?: number,
  ): Promise<PayslipData> {
    const payrollRun = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
    });

    if (!payrollRun) {
      throw new Error(`Payroll run ${runId} not found`);
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: true },
    });

    if (!employee) {
      throw new Error(`Employee ${employeeId} not found`);
    }

    const salary = baseSalary || employee.baseSalary || 0;
    const allowances = await this.calculateAllowances(employee.id, salary);
    // Overtime is part of gross, so it is taxed and pensioned like the rest of
    // pay rather than bolted on after the deductions are worked out.
    const overtime = await this.overtimeService.calculate(
      employee.id,
      salary,
      payrollRun.month,
      payrollRun.year,
    );
    const grossPay = salary + allowances + overtime.pay;

    // Calculate tax
    const taxCalc = await this.taxService.calculateIncomeTax(
      employee.id,
      grossPay,
      payrollRun.month,
      payrollRun.year,
    );

    // Calculate deductions
    const deductions = await this.deductionsService.calculateDeductions(
      employee.id,
      grossPay,
      0, // Leave days would come from attendance
    );

    const totalDeductions = deductions.total + taxCalc.tax;
    const netPay = grossPay - totalDeductions;

    const payslip: PayslipData = {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      department: employee.department?.name || '',
      period: payrollRun.periodName,
      month: payrollRun.month,
      year: payrollRun.year,
      
      baseSalary: salary,
      allowances: Math.round(allowances),
      bonusOrIncentive: 0,
      overtime: overtime.pay,
      overtimeHours: overtime.hours,
      grossPay: Math.round(grossPay),
      
      incomeTax: taxCalc.tax,
      pension: deductions.pension,
      nhis: deductions.nhis,
      leaveDeduction: deductions.leaveDeduction,
      otherDeductions: deductions.otherDeductions,
      totalDeductions: Math.round(totalDeductions),
      
      netPay: Math.round(netPay),
      bankDetails: {
        bankName: employee.bankName || '',
        accountNumber: employee.accountNumber || '',
        accountHolder: employee.accountHolder || employee.firstName,
      },
      
      generatedAt: new Date(),
      status: 'Generated',
    };

    return payslip;
  }

  /**
   * Generate payslips for entire payroll run
   */
  async generatePayslipsForRun(runId: string): Promise<PayslipData[]> {
    const payrollEntries = await this.prisma.payrollEntry.findMany({
      where: { runId },
    });

    const payslips: PayslipData[] = [];

    for (const entry of payrollEntries) {
      const payslip = await this.generatePayslip(entry.employeeId || '', runId, entry.grossPay);
      payslips.push(payslip);
    }

    return payslips;
  }

  /**
   * Save generated payslip to database
   */
  async savePayslip(payslipData: PayslipData): Promise<void> {
    await this.prisma.payslip.create({
      data: {
        employeeId: payslipData.employeeId,
        employeeName: payslipData.employeeName,
        department: payslipData.department,
        period: payslipData.period,
        month: payslipData.month,
        year: payslipData.year,
        grossPay: payslipData.grossPay,
        deductions: payslipData.totalDeductions,
        netPay: payslipData.netPay,
        tax: payslipData.incomeTax,
        pension: payslipData.pension,
        allowances: payslipData.allowances,
        overtime: payslipData.overtime,
        overtimeHours: payslipData.overtimeHours,
        status: 'Issued',
      },
    });
  }

  /**
   * Save all payslips for a run
   */
  async savePayslipsForRun(runId: string): Promise<void> {
    const payslips = await this.generatePayslipsForRun(runId);

    for (const payslip of payslips) {
      await this.savePayslip(payslip);
    }

    // Update payroll run status
    await this.prisma.payrollRun.update({
      where: { id: runId },
      data: {
        status: 'Completed',
        processedAt: new Date(),
      },
    });
  }

  /**
   * Calculate total allowances for employee
   */
  private async calculateAllowances(employeeId: string, baseSalary: number): Promise<number> {
    const breakdown = await this.deductionsService.calculateAllowances(
      employeeId,
      baseSalary,
    );
    return breakdown.total;
  }

  /**
   * Export payslips as PDF (placeholder)
   */
  async exportPayslipsPdf(runId: string): Promise<string> {
    // This would integrate with a PDF library like pdfkit or puppeteer
    // For now, returning placeholder
    return `Payslips for run ${runId} exported as PDF`;
  }

  /**
   * Send payslips to employees via email (placeholder)
   */
  async sendPayslipsEmail(runId: string): Promise<{ sent: number; failed: number }> {
    const payslips = await this.prisma.payslip.findMany({
      where: {
        period: { contains: new Date().getFullYear().toString() },
      },
    });

    // This would integrate with an email service
    return { sent: payslips.length, failed: 0 };
  }

  /**
   * Get payslip history for employee
   */
  async getPayslipHistory(employeeId: string, limit = 12) {
    return this.prisma.payslip.findMany({
      where: { employeeId },
      orderBy: { issuedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Calculate year-to-date totals
   */
  async getYearToDateSummary(employeeId: string, year: number) {
    const payslips = await this.prisma.payslip.findMany({
      where: {
        employeeId,
        year,
      },
    });

    return {
      totalGrossPay: payslips.reduce((sum, p) => sum + p.grossPay, 0),
      totalTax: payslips.reduce((sum, p) => sum + p.tax, 0),
      totalPension: payslips.reduce((sum, p) => sum + p.pension, 0),
      totalDeductions: payslips.reduce((sum, p) => sum + p.deductions, 0),
      totalNetPay: payslips.reduce((sum, p) => sum + p.netPay, 0),
      payslipsCount: payslips.length,
    };
  }
}
