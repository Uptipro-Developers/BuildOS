import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { Roles } from '../auth/decorators';

@Controller('audit-logs')
export class AuditLogController {
  constructor(private auditLogService: AuditLogService) {}

  @Get()
  @Roles('admin', 'compliance-officer')
  async getAuditLogs(
    @Query('userId') userId?: string,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const filters = { userId, entity, action };
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    const parsedSkip = skip ? parseInt(skip, 10) : 0;

    const result = await this.auditLogService.getAuditLog(
      filters,
      parsedLimit,
      parsedSkip,
    );

    return {
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        limit: result.limit,
        skip: result.skip,
      },
    };
  }
}
