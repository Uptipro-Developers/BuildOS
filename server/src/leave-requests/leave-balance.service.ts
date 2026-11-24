import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeaveBalanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate current leave balance for an employee
   */
  async getLeaveBalance(employeeId: string, leaveTypeId: string) {
    const leaveType = await this.prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
    });

    if (!leaveType) {
      throw new BadRequestException(`Leave type ${leaveTypeId} not found`);
    }
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { gradeLevel: true },
    });
    if (!employee) throw new BadRequestException(`Employee ${employeeId} not found`);
    const gradeEntitlements = leaveType.gradeEntitlements && typeof leaveType.gradeEntitlements === 'object'
      ? leaveType.gradeEntitlements as Record<string, unknown>
      : {};
    const gradeDays = employee.gradeLevel ? Number(gradeEntitlements[employee.gradeLevel]) : NaN;
    const totalAllowed = Number.isFinite(gradeDays) ? gradeDays : leaveType.daysAllowed;

    // Get all approved leave requests for this year
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const endOfYear = new Date(new Date().getFullYear(), 11, 31);

    const approvedDays = await this.prisma.leaveRequest.aggregate({
      where: {
        employeeId,
        leaveTypeId,
        status: 'approved',
        approvedAt: { gte: startOfYear, lte: endOfYear },
      },
      _sum: { days: true },
    });

    const usedDays = approvedDays._sum.days || 0;
    const availableDays = totalAllowed - usedDays;

    return {
      leaveTypeId,
      leaveTypeName: leaveType.name,
      totalAllowed,
      employeeGrade: employee.gradeLevel,
      usedDays,
      availableDays: Math.max(0, availableDays),
      carryOverDays: leaveType.carryOver ? leaveType.maxCarryOver : 0,
    };
  }

  /**
   * Get all leave balances for an employee
   */
  async getAllLeaveBalances(employeeId: string) {
    const leaveTypes = await this.prisma.leaveType.findMany();

    const balances = await Promise.all(
      leaveTypes.map((lt) => this.getLeaveBalance(employeeId, lt.id)),
    );

    return balances;
  }

  /**
   * Validate if employee has sufficient leave balance
   */
  async validateLeaveBalance(
    employeeId: string,
    leaveTypeId: string,
    requestedDays: number,
  ): Promise<{ valid: boolean; reason?: string }> {
    const balance = await this.getLeaveBalance(employeeId, leaveTypeId);

    if (requestedDays > balance.availableDays) {
      return {
        valid: false,
        reason: `Insufficient leave balance. Requested: ${requestedDays}, Available: ${balance.availableDays}`,
      };
    }

    return { valid: true };
  }

  /**
   * Check for leave conflicts
   */
  async checkLeaveConflict(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    excludeRequestId?: string,
  ) {
    const conflictingRequests = await this.prisma.leaveRequest.findMany({
      where: {
        employeeId,
        id: excludeRequestId ? { not: excludeRequestId } : undefined,
        status: { in: ['pending', 'approved'] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    return {
      hasConflict: conflictingRequests.length > 0,
      conflictingRequests,
    };
  }

  /**
   * Calculate working days between two dates (excluding weekends)
   */
  calculateWorkingDays(startDate: Date, endDate: Date): number {
    let days = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    return days;
  }

  /**
   * Get leave request history for employee
   */
  async getLeaveHistory(employeeId: string, limit = 50, skip = 0) {
    const [requests, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where: { employeeId },
        include: { leaveType: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.leaveRequest.count({ where: { employeeId } }),
    ]);

    return { requests, total, limit, skip };
  }

  /**
   * Get pending approvals for manager
   */
  async getPendingApprovals(managerId: string) {
    // Get employees under this manager
    const employees = await this.prisma.employee.findMany({
      where: { supervisorId: managerId },
      select: { id: true },
    });

    const employeeIds = employees.map((e) => e.id);

    if (employeeIds.length === 0) {
      return { pendingRequests: [], total: 0 };
    }

    const [pendingRequests, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where: {
          employeeId: { in: employeeIds },
          status: 'pending',
        },
        include: { employee: true, leaveType: true },
        orderBy: { submittedAt: 'asc' },
      }),
      this.prisma.leaveRequest.count({
        where: {
          employeeId: { in: employeeIds },
          status: 'pending',
        },
      }),
    ]);

    return { pendingRequests, total };
  }
}
