import { Module } from '@nestjs/common';
import { AdminExtrasController } from './admin-extras.controller';
import { AdminPublicController } from './admin-public.controller';
import { ApprovalsPublicController } from './approvals-public.controller';
import { AdminExtrasService } from './admin-extras.service';
import { UserActivityService } from './user-activity.service';
import { SystemConfigController, ReportsController } from './system-config.controller';
import { SystemConfigService } from './system-config.service';
import { ReportBuilderService } from '../reports/report-builder.service';
import { ReportQueryService } from '../reports/report-query.service';
import { ReportSchedulerService } from '../reports/report-scheduler.service';
import { IntegrationsModule } from '../integrations/integrations.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    // AuthModule supplies ServiceKeyService, which the API-key endpoints use to
    // invalidate the credential cache after a key is created or revoked.
    imports: [PrismaModule, AuthModule, IntegrationsModule],
    controllers: [AdminExtrasController, AdminPublicController, ApprovalsPublicController, SystemConfigController, ReportsController],
    providers: [AdminExtrasService, UserActivityService, SystemConfigService, ReportBuilderService, ReportQueryService, ReportSchedulerService],
    exports: [AdminExtrasService, UserActivityService, SystemConfigService, ReportBuilderService, ReportQueryService, ReportSchedulerService],
})
export class AdminExtrasModule { }
