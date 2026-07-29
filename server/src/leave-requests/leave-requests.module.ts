import { Module } from '@nestjs/common';
import { LeaveRequestsController } from './leave-requests.controller';
import { LeaveRequestsService } from './leave-requests.service';
import { LeaveBalanceService } from './leave-balance.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
    imports: [PrismaModule, WorkflowsModule],
    controllers: [LeaveRequestsController],
    providers: [LeaveRequestsService, LeaveBalanceService],
    exports: [LeaveBalanceService],
})
export class LeaveRequestsModule { }
