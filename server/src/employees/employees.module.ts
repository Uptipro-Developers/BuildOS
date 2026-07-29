import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ActivityHistoryModule } from '../activity-history/activity-history.module';
import { AdminExtrasModule } from '../admin-extras/admin-extras.module';

@Module({
    imports: [PrismaModule, ActivityHistoryModule, AdminExtrasModule],
    controllers: [EmployeesController],
    providers: [EmployeesService],
})
export class EmployeesModule { }
