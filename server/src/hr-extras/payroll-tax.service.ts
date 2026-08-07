import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HrSetupService } from './hr-setup.service';

interface TaxCalculation {
  grossPay: number;
  taxableIncome: number;
  tax: number;
  netPay: number;
  breakdown: {
    annualIncome: number;
    annualTax: number;
    monthlyTax: number;
  };
}

@Injectable()
export class PayrollTaxService {
  /** The statutory schedule below is denominated in naira. */
  private static readonly STATUTORY_CURRENCY = 'NGN';

  constructor(
    private prisma: PrismaService,
    private hrSetup: HrSetupService,
  ) {}

  /**
   * Calculate income tax based on Nigerian tax brackets (2024)
   * Progressive tax system with exemptions
   *
   * The bands and the tax-free allowance are naira amounts, so they only mean
   * anything for payroll run in naira. When HR Setup names another currency the
   * configured Default Tax Rate applies as a flat rate instead — previously
   * that setting was stored and never read, and non-naira payroll was taxed
   * against naira thresholds.
   */
  async calculateIncomeTax(
    employeeId: string,
    grossPay: number,
    month: number,
    year: number,
  ): Promise<TaxCalculation> {
    const setup = await this.hrSetup.read();
    if (
      setup.currency.toUpperCase() !== PayrollTaxService.STATUTORY_CURRENCY
    ) {
      return this.flatRateTax(grossPay, setup.taxRate);
    }

    // Nigeria tax-free allowance: ₦392,200 per month (2024)
    const MONTHLY_TAX_FREE_ALLOWANCE = 392200;
    const taxableIncome = Math.max(0, grossPay - MONTHLY_TAX_FREE_ALLOWANCE);

    // Annual income for progressive calculation
    const annualIncome = grossPay * 12;
    const annualTaxableIncome = Math.max(0, annualIncome - MONTHLY_TAX_FREE_ALLOWANCE * 12);

    // Nigerian progressive tax brackets (annual)
    const annualTax = this.applyProgressiveTaxBrackets(annualTaxableIncome);
    const monthlyTax = annualTax / 12;

    const netPay = grossPay - monthlyTax;

    return {
      grossPay,
      taxableIncome,
      tax: Math.round(monthlyTax),
      netPay: Math.round(netPay),
      breakdown: {
        annualIncome,
        annualTax: Math.round(annualTax),
        monthlyTax: Math.round(monthlyTax),
      },
    };
  }

  /** Flat-rate tax, for payroll outside the statutory naira schedule. */
  private flatRateTax(grossPay: number, ratePercent: number): TaxCalculation {
    const rate = Math.min(100, Math.max(0, ratePercent)) / 100;
    const monthlyTax = grossPay * rate;

    return {
      grossPay,
      taxableIncome: grossPay,
      tax: Math.round(monthlyTax),
      netPay: Math.round(grossPay - monthlyTax),
      breakdown: {
        annualIncome: grossPay * 12,
        annualTax: Math.round(monthlyTax * 12),
        monthlyTax: Math.round(monthlyTax),
      },
    };
  }

  /**
   * Apply progressive tax brackets
   * Nigeria 2024 brackets:
   * - First ₦300,000: 0%
   * - ₦300,001 - ₦600,000: 1%
   * - ₦600,001 - ₦1,100,000: 3%
   * - ₦1,100,001 - ₦1,600,000: 12%
   * - ₦1,600,001 - ₦2,100,000: 24%
   * - ₦2,100,001 - ₦2,600,000: 24%
   * - Above ₦2,600,001: 24%
   */
  private applyProgressiveTaxBrackets(annualTaxableIncome: number): number {
    const brackets = [
      { limit: 300000, rate: 0 },
      { limit: 600000, rate: 0.01 },
      { limit: 1100000, rate: 0.03 },
      { limit: 1600000, rate: 0.12 },
      { limit: 2100000, rate: 0.24 },
      { limit: 2600000, rate: 0.24 },
      { limit: Infinity, rate: 0.24 },
    ];

    let tax = 0;
    let previousLimit = 0;

    for (const bracket of brackets) {
      if (annualTaxableIncome <= previousLimit) break;

      const incomeInBracket = Math.min(annualTaxableIncome, bracket.limit) - previousLimit;
      tax += incomeInBracket * bracket.rate;
      previousLimit = bracket.limit;
    }

    return tax;
  }

  /**
   * Apply tax exemptions (e.g., for dependents, medical)
   */
  async applyTaxExemptions(
    employeeId: string,
    baseTax: number,
  ): Promise<number> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    let exemptions = 0;

    // Children exemption: ₦20,800 per child (max 4)
    // Assuming max 4 dependents
    exemptions += 20800 * 4;

    // Personal exemption: ₦20,800
    exemptions += 20800;

    const exemptionReduction = (baseTax * exemptions) / 100;
    return Math.max(0, baseTax - exemptionReduction);
  }

  /**
   * Calculate take-home pay after tax
   */
  calculateNetPay(
    grossPay: number,
    incomeTax: number,
    otherDeductions: number = 0,
  ): number {
    return Math.round(grossPay - incomeTax - otherDeductions);
  }

  /**
   * Get tax configuration from database
   */
  async getTaxConfig(name?: string) {
    if (name) {
      return this.prisma.taxConfig.findFirst({ where: { name } });
    }
    return this.prisma.taxConfig.findMany();
  }

  /**
   * Calculate tax relief for low-income earners
   */
  calculateTaxRelief(grossPay: number, baseTax: number): number {
    // Relief for low-income earners: 1% if below threshold
    const LOW_INCOME_THRESHOLD = 500000;
    if (grossPay < LOW_INCOME_THRESHOLD) {
      return (baseTax * 0.01);
    }
    return 0;
  }
}
