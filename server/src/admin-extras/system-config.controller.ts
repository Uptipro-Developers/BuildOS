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
} from '@nestjs/common';
import { Roles } from '../auth/decorators';
import { RolesGuard } from '../auth/roles.guard';
import { SystemConfigService } from './system-config.service';
import { ReportBuilderService } from '../reports/report-builder.service';
import { ReportQueryService } from '../reports/report-query.service';

@Controller('system-config')
@UseGuards(RolesGuard)
export class SystemConfigController {
  constructor(
    private configService: SystemConfigService,
    private reportService: ReportBuilderService,
  ) {}

  // ── Company Profile ──
  @Get('profile')
  @Roles('admin')
  async getProfile() {
    const profile = await this.configService.getCompanyProfile();
    return { success: true, data: profile };
  }

  @Put('profile')
  @Roles('admin')
  async updateProfile(@Body() data: any) {
    const profile = await this.configService.updateCompanyProfile(data);
    return { success: true, data: profile, message: 'Profile updated' };
  }

  // ── Tax Configuration ──
  @Get('tax-configs')
  @Roles('admin', 'finance-manager')
  async getTaxConfigs() {
    const configs = await this.configService.getTaxConfigs();
    return { success: true, data: configs };
  }

  @Post('tax-configs')
  @Roles('admin')
  async saveTaxConfig(@Body() data: any) {
    const config = await this.configService.saveTaxConfig(data);
    return { success: true, data: config, message: 'Tax config saved' };
  }

  @Delete('tax-configs/:id')
  @Roles('admin')
  async deleteTaxConfig(@Param('id') id: string) {
    await this.configService.deleteTaxConfig(id);
    return { success: true, message: 'Tax config deleted' };
  }

  // ── Approval Workflows ──
  @Get('approval-workflows')
  @Roles('admin', 'hr-manager')
  async getApprovalWorkflows() {
    const workflows = await this.configService.getApprovalWorkflows();
    return { success: true, data: workflows };
  }

  @Post('approval-workflows')
  @Roles('admin')
  async createApprovalWorkflow(@Body() data: any) {
    const workflow = await this.configService.createApprovalWorkflow(data);
    return { success: true, data: workflow, message: 'Workflow created' };
  }

  @Put('approval-workflows/:id')
  @Roles('admin')
  async updateApprovalWorkflow(@Param('id') id: string, @Body() data: any) {
    const workflow = await this.configService.updateApprovalWorkflow(id, data);
    return { success: true, data: workflow, message: 'Workflow updated' };
  }

  @Delete('approval-workflows/:id')
  @Roles('admin')
  async deleteApprovalWorkflow(@Param('id') id: string) {
    await this.configService.deleteApprovalWorkflow(id);
    return { success: true, message: 'Workflow deleted' };
  }

  // ── Holidays ──
  @Get('holidays')
  @Roles('admin', 'hr-manager')
  async getHolidays(@Query('year') year?: string) {
    const holidays = await this.configService.getHolidays(year ? parseInt(year) : undefined);
    return { success: true, data: holidays };
  }

  @Post('holidays')
  @Roles('admin')
  async createHoliday(@Body() data: any) {
    const holiday = await this.configService.createHoliday(data);
    return { success: true, data: holiday, message: 'Holiday created' };
  }

  @Delete('holidays/:id')
  @Roles('admin')
  async deleteHoliday(@Param('id') id: string) {
    await this.configService.deleteHoliday(id);
    return { success: true, message: 'Holiday deleted' };
  }

  // ── Salary Bands ──
  @Get('salary-bands')
  @Roles('admin', 'hr-manager')
  async getSalaryBands() {
    const bands = await this.configService.getSalaryBands();
    return { success: true, data: bands };
  }

  @Post('salary-bands')
  @Roles('admin')
  async createSalaryBand(@Body() data: any) {
    const band = await this.configService.createSalaryBand(data);
    return { success: true, data: band, message: 'Salary band created' };
  }

  @Put('salary-bands/:id')
  @Roles('admin')
  async updateSalaryBand(@Param('id') id: string, @Body() data: any) {
    const band = await this.configService.updateSalaryBand(id, data);
    return { success: true, data: band, message: 'Salary band updated' };
  }

  // ── Document Settings ──
  @Get('document-settings')
  @Roles('admin')
  async getDocumentSettings() {
    const settings = await this.configService.getDocumentSettings();
    return { success: true, data: settings };
  }

  // ── Compliance Settings ──
  @Get('compliance-settings')
  @Roles('admin', 'compliance-officer')
  async getComplianceSettings() {
    const settings = await this.configService.getComplianceSettings();
    return { success: true, data: settings };
  }

  // ── All Application Settings ──
  @Get('all')
  @Roles('admin')
  async getAllSettings() {
    const settings = await this.configService.getApplicationSettings();
    return { success: true, data: settings };
  }
}

@Controller('reports')
@UseGuards(RolesGuard)
export class ReportsController {
  constructor(
    private reportService: ReportBuilderService,
    private reportQuery: ReportQueryService,
  ) {}

  // ── Report Definitions ──
  @Get('definitions')
  @Roles('admin', 'finance-manager', 'hr-manager')
  async getReportDefinitions(@Query('module') module?: string) {
    const definitions = await this.reportService.getReportDefinitions(module);
    return { success: true, data: definitions };
  }

  @Post('definitions')
  @Roles('admin')
  async createReportDefinition(@Body() data: any) {
    const definition = await this.reportService.createReportDefinition(data);
    return { success: true, data: definition, message: 'Report definition created' };
  }

  // ── Financial Reports ──
  @Post('generate/financial-summary')
  @Roles('admin', 'finance-manager')
  async generateFinancialSummary(
    @Body() body: { startDate: string; endDate: string },
  ) {
    const report = await this.reportService.generateFinancialSummary(
      new Date(body.startDate),
      new Date(body.endDate),
    );
    return { success: true, data: report, message: 'Financial summary generated' };
  }

  // ── HR Reports ──
  @Get('generate/hr-summary')
  @Roles('admin', 'hr-manager')
  async generateHRSummary() {
    const report = await this.reportService.generateHRSummary();
    return { success: true, data: report, message: 'HR summary generated' };
  }

  // ── Project Reports ──
  @Get('generate/project-status')
  @Roles('admin', 'project-manager')
  async generateProjectStatus(@Query('projectId') projectId?: string) {
    const report = await this.reportService.generateProjectStatus(projectId);
    return { success: true, data: report, message: 'Project status report generated' };
  }

  // ── Procurement Reports ──
  @Post('generate/procurement')
  @Roles('admin', 'procurement-manager')
  async generateProcurementReport(
    @Body() body: { startDate?: string; endDate?: string },
  ) {
    const report = await this.reportService.generateProcurementReport(
      body.startDate ? new Date(body.startDate) : undefined,
      body.endDate ? new Date(body.endDate) : undefined,
    );
    return { success: true, data: report, message: 'Procurement report generated' };
  }

  // ── Report Builder ──
  /**
   * The sources and fields Report Builder may offer, from the query registry.
   *
   * Open to any authenticated user for the same reason as `run` below.
   */
  @Get('sources')
  listReportSources() {
    return { success: true, data: this.reportQuery.listSources() };
  }

  /**
   * Runs a built report. Filters and sorts are resolved through the registry, so
   * only listed fields can reach the database.
   *
   * This was `@Roles('admin', 'finance-manager', 'hr-manager')`, which meant an
   * ordinary user opening their application's Reports module and pressing
   * Generate Report got a 403 — the reports are listed for everyone, so gating
   * the execution on three specific roles made the button dead for most of the
   * people it is shown to.
   *
   * Authentication is still required by the global guard, and the registry is
   * what constrains this: a caller can only reach sources and columns it
   * declares, so opening the route does not widen what any report can read.
   */
  @Post('run')
  async runReport(@Body() body: any) {
    const result = await this.reportQuery.run(body ?? {});
    return { success: true, data: result };
  }

  // ── Custom Reports ──
  @Post('generate/custom')
  @Roles('admin', 'finance-manager', 'hr-manager')
  async generateCustomReport(@Body() config: any) {
    const report = await this.reportService.generateCustomReport(config);
    return { success: true, data: report, message: 'Custom report generated' };
  }

  // ── Report History ──
  @Get(':reportId/history')
  @Roles('admin', 'finance-manager', 'hr-manager')
  async getReportHistory(
    @Param('reportId') reportId: string,
    @Query('limit') limit?: string,
  ) {
    const history = await this.reportService.getReportHistory(
      reportId,
      limit ? parseInt(limit) : 10,
    );
    return { success: true, data: history };
  }

  // ── Schedule Report ──
  @Put(':reportId/schedule')
  @Roles('admin')
  async scheduleReport(
    @Param('reportId') reportId: string,
    @Body('schedule') schedule: string,
  ) {
    const report = await this.reportService.scheduleReport(reportId, schedule);
    return { success: true, data: report, message: 'Report scheduled' };
  }
}
