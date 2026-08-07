import { Module } from '@nestjs/common';
import { DailyReportsController } from './daily-reports.controller';
import { DailyReportsService } from './daily-reports.service';
import { ConstructionReminderService } from './construction-reminder.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [DailyReportsController],
    providers: [DailyReportsService, ConstructionReminderService],
})
export class DailyReportsModule { }
