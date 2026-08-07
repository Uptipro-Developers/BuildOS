import { Injectable, BadRequestException } from '@nestjs/common';
import { POStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ReportDefinition {
  id: string;
  name: string;
  type: 'financial' | 'hr' | 'project' | 'procurement' | 'custom';
  module: string;
  description?: string;
  isScheduled: boolean;
  schedule?: string;
}

@Injectable()
export class ReportBuilderService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create report definition
   */
  async createReportDefinition(data: any) {
    return this.prisma.reportDefinition.create({
      data,
    });
  }

  /**
   * Get all report definitions
   */
  async getReportDefinitions(module?: string) {
    const where: any = {};
    if (module) where.module = module;

    return this.prisma.reportDefinition.findMany({
      where,
      include: { runs: { take: 5, orderBy: { startedAt: 'desc' } } },
    });
  }

  /**
   * Generate financial summary report
   */
  async generateFinancialSummary(startDate: Date, endDate: Date) {
    const [expenses, income, payments, budgets] = await Promise.all([
      this.prisma.expense.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          status: 'Approved',
        },
      }),
      this.prisma.income.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          status: 'Confirmed',
        },
      }),
      this.prisma.payment.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          status: 'PaymentCompleted',
        },
      }),
      this.prisma.budget.findMany({
        where: {
          period: { contains: startDate.getFullYear().toString() },
        },
      }),
    ]);

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalBudget = budgets.reduce((sum, b) => sum + b.totalBudget, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

    return {
      period: { startDate, endDate },
      summary: {
        totalIncome,
        totalExpenses,
        totalPayments,
        netResult: totalIncome - totalExpenses - totalPayments,
      },
      budget: {
        totalBudget,
        totalSpent,
        totalRemaining: totalBudget - totalSpent,
        utilizationPercent: (totalSpent / totalBudget) * 100,
      },
      breakdown: {
        expensesByCategory: this.groupByCategory(expenses),
        incomeBySource: this.groupBySource(income),
        paymentsByType: this.groupByType(payments),
      },
      timestamp: new Date(),
    };
  }

  /**
   * Generate HR summary report
   */
  async generateHRSummary() {
    const [totalEmployees, activeEmployees, departmentCounts, leaveRequests] = await Promise.all([
      this.prisma.employee.count(),
      this.prisma.employee.count({ where: { status: 'active' } }),
      this.prisma.employee.groupBy({
        by: ['departmentId'],
        _count: { id: true },
      }),
      this.prisma.leaveRequest.findMany({
        where: { status: 'approved' },
        take: 100,
      }),
    ]);

    return {
      employeeSummary: {
        total: totalEmployees,
        active: activeEmployees,
        inactive: totalEmployees - activeEmployees,
      },
      departmentDistribution: departmentCounts,
      leaveTrends: {
        approvedLeaves: leaveRequests.length,
        totalLeaveDays: leaveRequests.reduce((sum, l) => sum + l.days, 0),
      },
      timestamp: new Date(),
    };
  }

  /**
   * Generate project status report
   */
  async generateProjectStatus(projectId?: string) {
    const where: any = {};
    if (projectId) where.id = projectId;

    const [projects, tasks, budgets] = await Promise.all([
      this.prisma.project.findMany({ where, take: 10 }),
      this.prisma.task.findMany({ where: projectId ? { projectId } : undefined }),
      this.prisma.budget.findMany({ where: projectId ? { projectId } : undefined }),
    ]);

    return {
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        progress: p.progress,
        budget: p.budget,
        spent: p.spent,
        budgetUtilization: (p.spent / p.budget) * 100,
      })),
      taskSummary: {
        total: tasks.length,
        completed: tasks.filter((t) => t.status === 'done').length,
        inProgress: tasks.filter((t) => t.status === 'in_progress').length,
        blocked: tasks.filter((t) => t.status === 'blocked').length,
      },
      budgetSummary: {
        totalBudget: budgets.reduce((sum, b) => sum + b.totalBudget, 0),
        totalSpent: budgets.reduce((sum, b) => sum + b.spent, 0),
      },
      timestamp: new Date(),
    };
  }

  /**
   * Generate procurement report
   */
  async generateProcurementReport(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate && endDate) {
      where.createdDate = { gte: startDate, lte: endDate };
    }

    const [purchaseOrders, suppliers, invoices] = await Promise.all([
      this.prisma.purchaseOrder.findMany({ where }),
      this.prisma.supplier.findMany(),
      this.prisma.purchaseInvoice.findMany({ where }),
    ]);

    const totalOrderValue = purchaseOrders.reduce((sum, po) => sum + po.totalValue, 0);
    // "Pending" is everything not yet paid for and not abandoned; "completed"
    // is the end of the chain, which is the goods arriving — not a `completed`
    // status, which no longer exists because no step ever set it.
    const OPEN: POStatus[] = ['draft', 'sent_to_finance', 'finance_accepted', 'finance_declined'];
    const pendingOrders = purchaseOrders.filter((po) => OPEN.includes(po.status));
    const completedOrders = purchaseOrders.filter((po) => po.status === 'goods_received');

    return {
      summary: {
        totalOrdersValue: totalOrderValue,
        totalOrders: purchaseOrders.length,
        pendingOrders: pendingOrders.length,
        completedOrders: completedOrders.length,
      },
      suppliers: {
        total: suppliers.length,
        topSuppliers: suppliers
          .sort((a, b) => b.totalSpend - a.totalSpend)
          .slice(0, 5),
      },
      invoices: {
        total: invoices.length,
        pending: invoices.filter((i) => i.status === 'Pending').length,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Save report run
   */
  async saveReportRun(reportId: string, status: string, outputUrl?: string, error?: string) {
    return this.prisma.reportRun.create({
      data: {
        reportId,
        status,
        outputUrl,
        errorMsg: error,
      },
    });
  }

  /**
   * Get report history
   */
  async getReportHistory(reportId: string, limit = 10) {
    return this.prisma.reportRun.findMany({
      where: { reportId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Schedule report
   */
  async scheduleReport(reportId: string, schedule: string) {
    return this.prisma.reportDefinition.update({
      where: { id: reportId },
      data: {
        isScheduled: true,
        schedule,
      },
    });
  }

  /**
   * Generate custom report
   */
  async generateCustomReport(config: any) {
    const { type, filters, fields } = config;

    switch (type) {
      case 'expense':
        return this.generateExpenseReport(filters, fields);
      case 'payroll':
        return this.generatePayrollReport(filters, fields);
      case 'attendance':
        return this.generateAttendanceReport(filters, fields);
      default:
        throw new BadRequestException(`Unknown report type: ${type}`);
    }
  }

  private async generateExpenseReport(filters: any, fields: string[]) {
    const expenses = await this.prisma.expense.findMany({
      where: filters,
      take: 500,
    });

    return {
      type: 'expense',
      recordCount: expenses.length,
      data: expenses,
      generatedAt: new Date(),
    };
  }

  private async generatePayrollReport(filters: any, fields: string[]) {
    const entries = await this.prisma.payrollEntry.findMany({
      where: filters,
      take: 500,
    });

    return {
      type: 'payroll',
      recordCount: entries.length,
      data: entries,
      generatedAt: new Date(),
    };
  }

  private async generateAttendanceReport(filters: any, fields: string[]) {
    const records = await this.prisma.attendanceRecord.findMany({
      where: filters,
      take: 500,
    });

    return {
      type: 'attendance',
      recordCount: records.length,
      data: records,
      generatedAt: new Date(),
    };
  }

  // ── Helper Functions ──
  private groupByCategory(expenses: any[]) {
    return expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});
  }

  private groupBySource(income: any[]) {
    return income.reduce((acc, i) => {
      acc[i.source] = (acc[i.source] || 0) + i.amount;
      return acc;
    }, {});
  }

  private groupByType(payments: any[]) {
    return payments.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + p.amount;
      return acc;
    }, {});
  }
}
