import { Module } from '@nestjs/common';
import { AdminExtrasController } from './admin-extras.controller';
import { AdminPublicController } from './admin-public.controller';
import { ApprovalsPublicController } from './approvals-public.controller';
import { AdminExtrasService } from './admin-extras.service';
import { SystemConfigController, ReportsController } from './system-config.controller';
import { SystemConfigService } from './system-config.service';
import { ReportBuilderService } from '../reports/report-builder.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [AdminExtrasController, AdminPublicController, ApprovalsPublicController, SystemConfigController, ReportsController],
    providers: [AdminExtrasService, SystemConfigService, ReportBuilderService],
    exports: [AdminExtrasService, SystemConfigService, ReportBuilderService],
})
export class AdminExtrasModule { }
