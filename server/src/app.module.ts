import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import IORedis from 'ioredis';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis/redis.module';
import { getRedisConnectionOptions, isRedisEnabled } from './redis/redis.config';
import { AppCacheModule } from './cache/app-cache.module';
import { EmailModule } from './email/email.module';
import { QueueModule } from './queue/queue.module';
import { PrismaModule } from './prisma/prisma.module';
import { NumberingModule } from './numbering/numbering.module';
import { ProjectsModule } from './projects/projects.module';
import { ProjectSetupModule } from './project-setup/project-setup.module';
import { EmployeesModule } from './employees/employees.module';
import { DepartmentsModule } from './departments/departments.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { LeaveTypesModule } from './leave-types/leave-types.module';
import { ClaimTypesModule } from './claim-types/claim-types.module';
import { LeaveRequestsModule } from './leave-requests/leave-requests.module';
import { ClaimsModule } from './claims/claims.module';
import { ExpensesModule } from './expenses/expenses.module';
import { IncomeModule } from './income/income.module';
import { BudgetsModule } from './budgets/budgets.module';
import { PaymentsModule } from './payments/payments.module';
import { AuthModule } from './auth/auth.module';
import { MaterialsModule } from './materials/materials.module';
import { AccrualsModule } from './accruals/accruals.module';
import { ProcurementRequestsModule } from './procurement-requests/procurement-requests.module';
import { ConstructionExtrasModule } from './construction-extras/construction-extras.module';
import { HrExtrasModule } from './hr-extras/hr-extras.module';
import { FinanceExtrasModule } from './finance-extras/finance-extras.module';
import { AdminExtrasModule } from './admin-extras/admin-extras.module';
import { HealthModule } from './health/health.module';
import { TasksModule } from './tasks/tasks.module';
import { JobRolesModule } from './job-roles/job-roles.module';
import { WorkforceAllocationModule } from './workforce-allocation/workforce-allocation.module';
import { ActivityHistoryModule } from './activity-history/activity-history.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ReportsModule } from './reports/reports.module';
import { ResourcePlanningModule } from './resource-planning/resource-planning.module';
import { ComplianceDocumentsModule } from './compliance-documents/compliance-documents.module';
import { AppCatalogModule } from './app-catalog/app-catalog.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { ClustersModule } from './clusters/clusters.module';
import { EquipmentModule } from './equipment/equipment.module';
import { ConstructionIssuesModule } from './construction-issues/construction-issues.module';
import { ChangeRequestsModule } from './change-requests/change-requests.module';
import { DelaysModule } from './delays/delays.module';
import { StakeholdersModule } from './stakeholders/stakeholders.module';
import { VisitorLogsModule } from './visitor-logs/visitor-logs.module';
import { QualityNcrsModule } from './quality-ncrs/quality-ncrs.module';
import { HseRecordsModule } from './hse-records/hse-records.module';
import { CommunicationsModule } from './communications/communications.module';
import { FundingAllocationsModule } from './funding-allocations/funding-allocations.module';
import { FundingReleasesModule } from './funding-releases/funding-releases.module';
import { DisbursementsModule } from './disbursements/disbursements.module';
import { DailyReportsModule } from './daily-reports/daily-reports.module';
import { DocumentFoldersModule } from './document-folders/document-folders.module';
import { DocumentFilesModule } from './document-files/document-files.module';
import { EarnedValueRecordsModule } from './earned-value-records/earned-value-records.module';
import { ConstructionBaselinesModule } from './construction-baselines/construction-baselines.module';
import { ConstructionCalendarsModule } from './construction-calendars/construction-calendars.module';
import { ConstructionSettingsModule } from './construction-settings/construction-settings.module';
import { ConstructionTasksModule } from './construction-tasks/construction-tasks.module';
import { HumanResourcesModule } from './human-resources/human-resources.module';
import { MaterialResourcesModule } from './material-resources/material-resources.module';
import { EquipmentResourcesModule } from './equipment-resources/equipment-resources.module';
import { ContractorsModule } from './contractors/contractors.module';
import { VendorsModule } from './vendors/vendors.module';
import { OrgUnitsModule } from './org-units/org-units.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        RedisModule,
        AppCacheModule,
        EmailModule,
        QueueModule,
        AuthModule,
        PrismaModule,
        NumberingModule,
        AuditLogModule,
        NotificationsModule,
        WorkflowsModule,
        IntegrationsModule,
        ProjectsModule,
        ProjectSetupModule,
        EmployeesModule,
        DepartmentsModule,
        HealthModule,
        SuppliersModule,
        PurchaseOrdersModule,
        LeaveTypesModule,
        ClaimTypesModule,
        LeaveRequestsModule,
        ClaimsModule,
        ExpensesModule,
        IncomeModule,
        BudgetsModule,
        PaymentsModule,
        MaterialsModule,
        AccrualsModule,
        ProcurementRequestsModule,
        ConstructionExtrasModule,
        HrExtrasModule,
        FinanceExtrasModule,
        AdminExtrasModule,
        TasksModule,
        JobRolesModule,
        WorkforceAllocationModule,
        ActivityHistoryModule,
        PermissionsModule,
        ReportsModule,
        ResourcePlanningModule,
        ComplianceDocumentsModule,
        AppCatalogModule,
        ClustersModule,
        EquipmentModule,
        OrgUnitsModule,
        ConstructionIssuesModule,
        ChangeRequestsModule,
        DelaysModule,
        StakeholdersModule,
        VisitorLogsModule,
        QualityNcrsModule,
        HseRecordsModule,
        CommunicationsModule,
        FundingAllocationsModule,
        FundingReleasesModule,
        DisbursementsModule,
        DailyReportsModule,
        DocumentFoldersModule,
        DocumentFilesModule,
        EarnedValueRecordsModule,
        ConstructionBaselinesModule,
        ConstructionCalendarsModule,
        ConstructionSettingsModule,
        ConstructionTasksModule,
        HumanResourcesModule,
        MaterialResourcesModule,
        EquipmentResourcesModule,
        ContractorsModule,
        VendorsModule,
        ThrottlerModule.forRootAsync({
            useFactory: () => ({
                throttlers: [{ ttl: 60000, limit: 100 }],
                // Distributed rate limiting via Redis when configured; otherwise
                // falls back to the default in-memory throttler storage.
                storage: isRedisEnabled()
                    ? new ThrottlerStorageRedisService(
                          new IORedis(
                              getRedisConnectionOptions({
                                  maxRetriesPerRequest: null,
                                  retryStrategy: (times: number) =>
                                      times > 10 ? null : Math.min(times * 200, 2000),
                              }),
                          ),
                      )
                    : undefined,
            }),
        }),
    ],
    providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
    ],
})
export class AppModule { }
