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
import { GoodsReceiptsModule } from '../goods-receipts/goods-receipts.module';

@Module({
    // AuthModule supplies ServiceKeyService, which the API-key endpoints use to
    // invalidate the credential cache after a key is created or revoked.
    // GoodsReceiptsModule supplies GoodsReceiptsService, so a Goods Receipt
    // approved from the generic Approvals page runs the exact same accept()
    // (guard + stock posting) as the page's own Accept button — one gate,
    // two entry points. GoodsReceiptsModule does not import this module back,
    // so this is a one-directional dependency, not a cycle.
    imports: [PrismaModule, AuthModule, IntegrationsModule, GoodsReceiptsModule],
    controllers: [AdminExtrasController, AdminPublicController, ApprovalsPublicController, SystemConfigController, ReportsController],
    providers: [AdminExtrasService, UserActivityService, SystemConfigService, ReportBuilderService, ReportQueryService, ReportSchedulerService],
    exports: [AdminExtrasService, UserActivityService, SystemConfigService, ReportBuilderService, ReportQueryService, ReportSchedulerService],
})
export class AdminExtrasModule { }
