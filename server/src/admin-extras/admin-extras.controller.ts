import {
    Controller, Get, Post, Put, Patch, Delete,
    Param, Body, Query, Req, UseGuards,
} from '@nestjs/common';
import { AdminExtrasService } from './admin-extras.service';
import { UserActivityService } from './user-activity.service';
import { ReportSchedulerService } from '../reports/report-scheduler.service';
import { Roles, Public } from '../auth/decorators';
import { RolesGuard } from '../auth/roles.guard';

@Controller('admin')
@UseGuards(RolesGuard)
export class AdminExtrasController {
    constructor(
        private readonly svc: AdminExtrasService,
        private readonly userActivity: UserActivityService,
        private readonly scheduler: ReportSchedulerService,
    ) { }

    // ── Per-user activity & requests (Admin → Users sidebar tabs) ──
    @Get('users/:id/activity')
    @Roles('admin')
    getUserActivity(@Param('id') id: string, @Query('limit') limit?: number) {
        return this.userActivity.findUserActivity(id, limit ? Number(limit) : 50);
    }

    @Get('users/:id/requests')
    @Roles('admin')
    getUserRequests(@Param('id') id: string) {
        return this.userActivity.findUserRequests(id);
    }

    // ── Approvals ──
    /** `mine=true` restricts to items whose configured workflow names the caller. */
    @Get('approvals')
    @Roles('admin', 'approver', 'manager', 'hr-manager', 'finance-manager', 'procurement-manager')
    getApprovals(
        @Req() req: any,
        @Query('module') module?: string,
        @Query('mine') mine?: string,
    ) {
        const user = req?.user;
        // The identity is passed whether or not `mine` is set: every row is stamped
        // with whether this caller may approve it, which is what lets a module queue
        // list the whole company's items while still showing approval controls only
        // where the Workflow Approval configuration allows.
        return this.svc.findApprovals(
            module,
            {
                userId: String(user?.sub ?? user?.id ?? ''),
                name: user?.name,
                email: user?.email,
                role: user?.role,
            },
            { onlyMine: String(mine ?? '').toLowerCase() === 'true' },
        );
    }

    /**
     * The write path behind every approval queue.
     *
     * `@Roles` alone was not enough: it let anyone holding the `approver` role decide
     * any item in any module, regardless of which processes the Workflow Approval
     * configuration actually names them on. The service now checks the row's own
     * process before applying an approve or reject.
     */
    @Patch('approvals/:id')
    @Roles('admin', 'approver')
    updateApproval(@Param('id') id: string, @Body() body: any, @Req() req?: any) {
        const user = req?.user;
        return this.svc.updateApproval(id, body, {
            userId: String(user?.sub ?? user?.id ?? ''),
            name: user?.name,
            email: user?.email,
            role: user?.role,
        });
    }

    /**
     * Process ids the caller may approve, per the Workflow Approval configuration.
     *
     * Deliberately open to any authenticated user: it reports only what the caller
     * themselves may approve, and every Approve/Reject control in the UI needs it
     * to decide whether to render. Gating it on `admin` would hide approval actions
     * from exactly the non-admin approvers the configuration names.
     */
    @Get('my-approval-processes')
    getMyApprovalProcesses(@Req() req: any) {
        const user = req?.user;
        return this.svc.findMyApprovalProcesses({
            userId: String(user?.sub ?? user?.id ?? ''),
            name: user?.name,
            email: user?.email,
            role: user?.role,
        });
    }

    @Get('reference-data')
    @Roles('admin')
    getReferenceData() { return this.svc.referenceData(); }

    @Get('system-summary')
    @Roles('admin')
    getSystemSummary() { return this.svc.systemSummary(); }

    @Get('activity-log')
    @Roles('admin')
    getActivityLog() { return this.svc.activityLog(); }

    @Get('audit-logs')
    @Roles('admin', 'compliance-officer')
    getAuditLogs(@Query('limit') limit?: number, @Query('offset') offset?: number) { 
        return this.svc.getAuditLogs(limit, offset); 
    }

    // ── Users ──
    @Post('users/invite')
    @Roles('admin')
    inviteUser(@Body() body: { email: string; name: string; role?: string; assignedApps?: string[]; department?: string }) { return this.svc.inviteUser(body); }
    
    @Post('users/:id/resend-invite')
    @Roles('admin')
    resendInvite(@Param('id') id: string) { return this.svc.resendInvite(id); }
    
    @Get('users')
    @Roles('admin')
    getAllUsers(@Query('search') search?: string) { return this.svc.findAllUsers(search); }

    // ── Employee → User sync (Admin › Users › Pending Sync from HR) ──
    // Declared before 'users/:id' so "pending-sync" is not captured as an :id.
    @Get('users/pending-sync')
    @Roles('admin')
    getPendingSyncEmployees() { return this.svc.findPendingSyncEmployees(); }

    @Post('employees/:id/sync')
    @Roles('admin')
    syncEmployeeToUser(
        @Param('id') id: string,
        @Body() body: { email?: string; role?: string; assignedApps?: string[] },
    ) { return this.svc.syncEmployeeToUser(id, body); }

    @Get('users/:id')
    @Roles('admin')
    getUser(@Param('id') id: string) { return this.svc.findUser(id); }
    
    @Post('users')
    @Roles('admin')
    createUser(@Body() body: any) { return this.svc.createUser(body); }
    
    @Put('users/:id')
    @Roles('admin')
    updateUser(@Param('id') id: string, @Body() body: any) { return this.svc.updateUser(id, body); }
    
    @Delete('users/:id')
    @Roles('admin')
    deleteUser(@Param('id') id: string) { return this.svc.deleteUser(id); }

    // ── App Roles ──
    @Get('roles')
    @Roles('admin')
    getAllRoles() { return this.svc.findAllRoles(); }
    
    @Get('roles/:id')
    @Roles('admin')
    getRole(@Param('id') id: string) { return this.svc.findRole(id); }
    
    @Post('roles')
    @Roles('admin')
    createRole(@Body() body: any) { return this.svc.createRole(body); }
    
    @Put('roles/:id')
    @Roles('admin')
    updateRole(@Param('id') id: string, @Body() body: any) { return this.svc.updateRole(id, body); }
    
    @Delete('roles/:id')
    @Roles('admin')
    deleteRole(@Param('id') id: string) { return this.svc.deleteRole(id); }

    // ── Issue Types ──
    @Get('issue-types')
    @Roles('admin')
    getIssueTypes() { return this.svc.findAllIssueTypes(); }

    // Public read so ESS employees (non-admin) can populate the "Log Issue"
    // type dropdown from the same admin-configured list.
    @Get('issue-types/public')
    @Public()
    getPublicIssueTypes() { return this.svc.findAllIssueTypes(); }
    
    @Post('issue-types')
    @Roles('admin')
    createIssueType(@Body() body: any) { return this.svc.createIssueType(body); }
    
    @Put('issue-types/:id')
    @Roles('admin')
    updateIssueType(@Param('id') id: string, @Body() body: any) { return this.svc.updateIssueType(id, body); }
    
    @Delete('issue-types/:id')
    @Roles('admin')
    deleteIssueType(@Param('id') id: string) { return this.svc.deleteIssueType(id); }

    // ── Change Categories ──
    @Get('change-categories')
    @Roles('admin')
    getChangeCategories() { return this.svc.findAllChangeCategories(); }

    // Public read so ESS employees (non-admin) can populate the change-request
    // category dropdown from the same admin-configured list.
    @Get('change-categories/public')
    @Public()
    getPublicChangeCategories() { return this.svc.findAllChangeCategories(); }
    
    @Post('change-categories')
    @Roles('admin')
    createChangeCategory(@Body() body: any) { return this.svc.createChangeCategory(body); }
    
    @Put('change-categories/:id')
    @Roles('admin')
    updateChangeCategory(@Param('id') id: string, @Body() body: any) { return this.svc.updateChangeCategory(id, body); }
    
    @Delete('change-categories/:id')
    @Roles('admin')
    deleteChangeCategory(@Param('id') id: string) { return this.svc.deleteChangeCategory(id); }

    // ── Process Catalog ──
    @Get('process-catalog')
    @Roles('admin')
    getProcessCatalog() { return this.svc.findProcessCatalog(); }
    
    @Post('process-catalog')
    @Roles('admin')
    createProcessCatalogItem(@Body() body: any) { return this.svc.createProcessCatalogItem(body); }
    
    @Patch('process-catalog/:id')
    @Roles('admin')
    updateProcessCatalogItem(@Param('id') id: string, @Body() body: any) { return this.svc.updateProcessCatalogItem(id, body); }
    
    @Delete('process-catalog/:id')
    @Roles('admin')
    deleteProcessCatalogItem(@Param('id') id: string) { return this.svc.deleteProcessCatalogItem(id); }

    // ── Process Workflows ──
    @Get('process-workflows')
    @Roles('admin')
    getProcessWorkflows() { return this.svc.findProcessWorkflows(); }
    
    @Post('process-workflows')
    @Roles('admin')
    createProcessWorkflow(@Body() body: any) { return this.svc.createProcessWorkflow(body); }
    
    @Patch('process-workflows/:id')
    @Roles('admin')
    updateProcessWorkflow(@Param('id') id: string, @Body() body: any) { return this.svc.updateProcessWorkflow(id, body); }
    
    @Delete('process-workflows/:id')
    @Roles('admin')
    deleteProcessWorkflow(@Param('id') id: string) { return this.svc.deleteProcessWorkflow(id); }

    // ── General Settings ──
    @Get('general-settings')
    @Roles('admin')
    getGeneralSettings() { return this.svc.getGeneralSettings(); }

    // Read-only, non-sensitive display preferences (currency, date/number
    // formats, timezone, language) needed by every user across all apps so
    // the configured settings take effect system-wide, not just for admins.
    @Get('general-settings/public')
    @Public()
    getPublicGeneralSettings() { return this.svc.getGeneralSettings(); }

    @Put('general-settings')
    @Roles('admin')
    updateGeneralSettings(@Body() body: any) { return this.svc.updateGeneralSettings(body); }

    // ── Store Levels ──
    @Get('store-levels')
    getStoreLevels() { return this.svc.getStoreLevels(); }

    @Put('store-levels')
    updateStoreLevels(@Body() body: any) {
        return this.svc.updateStoreLevels(Array.isArray(body) ? body : body?.storeLevels ?? []);
    }

    // ── Store Thresholds ──
    @Get('store-thresholds')
    getStoreThresholds() { return this.svc.getStoreThresholds(); }

    @Put('store-thresholds')
    updateStoreThresholds(@Body() body: any) {
        return this.svc.updateStoreThresholds(Array.isArray(body) ? body : body?.storeThresholds ?? []);
    }

    // ── Company Profile ──
    @Get('company-profile')
    @Roles('admin')
    getCompanyProfile() { return this.svc.getCompanyProfile(); }
    
    @Put('company-profile')
    @Roles('admin')
    updateCompanyProfile(@Body() body: any) { return this.svc.updateCompanyProfile(body); }

    // ── Directors ──
    @Get('directors')
    @Roles('admin')
    getAllDirectors() { return this.svc.findAllDirectors(); }
    
    @Post('directors')
    @Roles('admin')
    createDirector(@Body() body: any) { return this.svc.createDirector(body); }
    
    @Put('directors/:id')
    @Roles('admin')
    updateDirector(@Param('id') id: string, @Body() body: any) { return this.svc.updateDirector(id, body); }

    @Patch('directors/reorder')
    @Roles('admin')
    reorderDirectors(@Body() body: { items?: Array<{ id: string; sequence: number }> } | Array<{ id: string; sequence: number }>) {
        const items = Array.isArray(body) ? body : (body?.items ?? []);
        return this.svc.reorderDirectors(items);
    }
    
    @Delete('directors/:id')
    @Roles('admin')
    deleteDirector(@Param('id') id: string) { return this.svc.deleteDirector(id); }

    // ── Email Config ──
    @Get('email-config')
    @Roles('admin')
    getEmailConfigs() { return this.svc.findEmailConfigs(); }

    @Get('email-config/variables')
    @Roles('admin')
    getEmailConfigVariables() { return this.svc.getEmailTemplateVariables(); }

    @Post('email-config')
    @Roles('admin')
    createEmailConfig(@Body() body: any) { return this.svc.createEmailConfig(body); }
    
    @Patch('email-config/:id')
    @Roles('admin')
    updateEmailConfig(@Param('id') id: string, @Body() body: any) { return this.svc.updateEmailConfig(id, body); }
    
    @Delete('email-config/:id')
    @Roles('admin')
    deleteEmailConfig(@Param('id') id: string) { return this.svc.deleteEmailConfig(id); }

    // ── Units of Measurement ──
    @Get('units')
    getUnits() { return this.svc.findUnits(); }
    
    @Post('units')
    createUnit(@Body() body: any) { return this.svc.createUnit(body); }
    
    @Patch('units/:id')
    updateUnit(@Param('id') id: string, @Body() body: any) { return this.svc.updateUnit(id, body); }
    
    @Delete('units/:id')
    deleteUnit(@Param('id') id: string) { return this.svc.deleteUnit(id); }

    // ── Material Categories ──
    @Get('material-categories')
    getMaterialCategories() { return this.svc.findMaterialCategories(); }

    @Post('material-categories')
    createMaterialCategory(@Body() body: any) { return this.svc.createMaterialCategory(body); }

    @Patch('material-categories/:id')
    updateMaterialCategory(@Param('id') id: string, @Body() body: any) { return this.svc.updateMaterialCategory(id, body); }

    @Delete('material-categories/:id')
    deleteMaterialCategory(@Param('id') id: string) { return this.svc.deleteMaterialCategory(id); }

    // ── API Keys ──
    @Get('api-keys')
    @Roles('admin')
    getApiKeys() { return this.svc.findApiKeys(); }

    @Post('api-keys')
    @Roles('admin')
    createApiKey(@Body() body: any) { return this.svc.createApiKey(body); }

    @Delete('api-keys/:id')
    @Roles('admin')
    deleteApiKey(@Param('id') id: string) { return this.svc.deleteApiKey(id); }

    // ── Webhooks ──
    @Get('webhooks')
    @Roles('admin')
    getWebhooks() { return this.svc.findWebhooks(); }

    @Post('webhooks')
    @Roles('admin')
    createWebhook(@Body() body: any) { return this.svc.createWebhook(body); }

    @Delete('webhooks/:id')
    @Roles('admin')
    deleteWebhook(@Param('id') id: string) { return this.svc.deleteWebhook(id); }

    // ── Email Templates ──
    @Get('email-templates')
    getEmailTemplates() { return this.svc.findEmailTemplates(); }

    @Post('email-templates')
    @Roles('admin')
    createEmailTemplate(@Body() body: any) { return this.svc.createEmailTemplate(body); }

    @Patch('email-templates/:id')
    @Roles('admin')
    updateEmailTemplate(@Param('id') id: string, @Body() body: any) { return this.svc.updateEmailTemplate(id, body); }

    @Delete('email-templates/:id')
    @Roles('admin')
    deleteEmailTemplate(@Param('id') id: string) { return this.svc.deleteEmailTemplate(id); }

    // ── Notification Rules ──
    @Get('notification-rules')
    getNotificationRules() { return this.svc.findNotificationRules(); }

    @Post('notification-rules')
    @Roles('admin')
    createNotificationRule(@Body() body: any) { return this.svc.createNotificationRule(body); }

    @Patch('notification-rules/:id')
    @Roles('admin')
    updateNotificationRule(@Param('id') id: string, @Body() body: any) { return this.svc.updateNotificationRule(id, body); }

    @Delete('notification-rules/:id')
    @Roles('admin')
    deleteNotificationRule(@Param('id') id: string) { return this.svc.deleteNotificationRule(id); }

    // ── Report Schedules ──
    @Get('report-schedules')
    getReportSchedules() { return this.svc.findReportSchedules(); }

    @Post('report-schedules')
    @Roles('admin')
    createReportSchedule(@Body() body: any) { return this.svc.createReportSchedule(body); }

    @Patch('report-schedules/:id')
    @Roles('admin')
    updateReportSchedule(@Param('id') id: string, @Body() body: any) {
        return this.svc.updateReportSchedule(id, body);
    }

    @Delete('report-schedules/:id')
    @Roles('admin')
    deleteReportSchedule(@Param('id') id: string) { return this.svc.deleteReportSchedule(id); }

    /** Runs a schedule immediately and stamps its last-sent time. */
    @Post('report-schedules/:id/send-now')
    @Roles('admin')
    sendReportScheduleNow(@Param('id') id: string) { return this.scheduler.sendNow(id); }

    /**
     * Scheduler heartbeat and per-schedule due-ness.
     *
     * Diagnostic for "the scheduled email never arrives": it distinguishes a loop
     * that is not running in the deployed environment from a schedule the loop
     * has seen but does not consider due.
     */
    @Get('report-schedules/status')
    @Roles('admin')
    getReportSchedulerStatus() { return this.scheduler.status(); }

    /** Forces a scheduler pass now, without waiting for the next tick. */
    @Post('report-schedules/run-due')
    @Roles('admin')
    async runDueReportSchedules() {
        await this.scheduler.tick();
        return this.scheduler.status();
    }

    // ── Report Templates ──
    @Get('report-templates')
    @Roles('admin')
    getReportTemplates() { return this.svc.findReportTemplates(); }

    @Post('report-templates')
    @Roles('admin')
    createReportTemplate(@Body() body: any) { return this.svc.createReportTemplate(body); }

    @Patch('report-templates/:id')
    @Roles('admin')
    updateReportTemplate(@Param('id') id: string, @Body() body: any) { return this.svc.updateReportTemplate(id, body); }

    @Delete('report-templates/:id')
    @Roles('admin')
    deleteReportTemplate(@Param('id') id: string) { return this.svc.deleteReportTemplate(id); }
}
