import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ActivityHistoryModule } from '../activity-history/activity-history.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [PrismaModule, ActivityHistoryModule, NotificationsModule],
    controllers: [EmployeesController],
    providers: [EmployeesService],
})
export class EmployeesModule { }
