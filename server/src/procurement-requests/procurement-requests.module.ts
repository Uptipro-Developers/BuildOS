import { Module } from '@nestjs/common';
import { ProcurementRequestsController } from './procurement-requests.controller';
import { ProcurementRequestsService } from './procurement-requests.service';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AdminExtrasModule } from '../admin-extras/admin-extras.module';

@Module({
    imports: [PrismaModule, IntegrationsModule, AdminExtrasModule],
    controllers: [ProcurementRequestsController],
    providers: [ProcurementRequestsService],
})
export class ProcurementRequestsModule { }
