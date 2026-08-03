import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Roles } from '../auth/decorators';
import { PayrollOrchestrationService } from './payroll-orchestration.service';
import { PayrollValidationService } from './payroll-validation.service';
import { LeaveBalanceService } from '../leave-requests/leave-balance.service';

@Controller('payroll')
export class PayrollController {
  constructor(
    private payrollService: PayrollOrchestrationService,
    private validationService: PayrollValidationService,
    private leaveBalanceService: LeaveBalanceService,
  ) {}

  // ── Payroll Processing ──
  @Post('process')
  @Roles('admin', 'hr-manager', 'finance-manager')
  async processPayroll(
    @Body() body: { periodId: string; employeeIds: string[] },
    @Request() req: any,
  ) {
    const result = await this.payrollService.processPayroll(
      body.periodId,
      body.employeeIds,
      req.user.id,
    );
    return { success: true, data: result, message: 'Payroll processed successfully' };
  }

  @Post('validate')
  @Roles('admin', 'hr-manager')
  async validatePayroll(
    @Body() body: { periodId: string; employeeIds: string[] },
  ) {
    const result = await this.validationService.validatePayroll(
      body.periodId,
      body.employeeIds,
    );
    return {
      success: result.valid,
      data: result,
      message: result.valid ? 'Payroll validation passed' : 'Payroll validation failed',
    };
  }

  // ── Payroll Summary ──
  @Get('summary/:periodId')
  @Roles('admin', 'hr-manager', 'finance-manager')
  async getPayrollSummary(@Param('periodId') periodId: string) {
    const summary = await this.payrollService.getPayrollSummary(periodId);
    return { success: true, data: summary };
  }

  @Get('employee-history/:employeeId')
  @Roles('admin', 'hr-manager', 'employee')
  async getEmployeePayrollHistory(
    @Param('employeeId') employeeId: string,
    @Query('limit') limit?: string,
  ) {
    const history = await this.payrollService.getEmployeePayrollHistory(
      employeeId,
      limit ? parseInt(limit) : 12,
    );
    return { success: true, data: history };
  }

  // ── Payroll Forecast ──
  @Post('forecast')
  @Roles('admin', 'hr-manager', 'finance-manager')
  async forecastPayroll(
    @Body() body: { employeeIds: string[]; months?: number },
  ) {
    const forecast = await this.payrollService.forecastPayroll(
      body.employeeIds,
      body.months || 3,
    );
    return { success: true, data: forecast };
  }

  // ── Leave Deduction Calculation ──
  @Get('leave-impact/:employeeId')
  @Roles('admin', 'hr-manager')
  async getLeaveDeductionImpact(
    @Param('employeeId') employeeId: string,
    @Query('leaveDays') leaveDays?: string,
  ) {
    const balances = await this.leaveBalanceService.getAllLeaveBalances(employeeId);
    return {
      success: true,
      data: {
        employeeId,
        leaveBalances: balances,
        leaveDays: leaveDays ? parseInt(leaveDays) : 0,
        estimatedDeduction: leaveDays ? parseInt(leaveDays) * 2000 : 0, // Example calculation
      },
    };
  }

  // ── Compliance Reports ──
  @Get('compliance/tax-summary/:year')
  @Roles('admin', 'finance-manager', 'compliance-officer')
  async getTaxSummary(@Param('year') year: string) {
    // Placeholder for tax summary report
    return {
      success: true,
      data: {
        year,
        message: 'Tax summary report - implement full report generation',
      },
    };
  }

  @Get('compliance/pension/:year')
  @Roles('admin', 'finance-manager', 'compliance-officer')
  async getPensionCompliance(@Param('year') year: string) {
    // Placeholder for pension compliance report
    return {
      success: true,
      data: {
        year,
        message: 'Pension compliance report - implement full report generation',
      },
    };
  }
}
