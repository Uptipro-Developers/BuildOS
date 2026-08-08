import { Module } from '@nestjs/common';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminExtrasModule } from '../admin-extras/admin-extras.module';
import { ProcurementRequestsModule } from '../procurement-requests/procurement-requests.module';

@Module({
    // AdminExtrasModule supplies AdminExtrasService, whose assertMayApprove
    // enforces the Workflow Approval configuration on request decisions.
    // ProcurementRequestsModule supplies ProcurementRequestsService, used to
    // auto-raise a Purchase Request when a Material Request is approved.
    imports: [PrismaModule, AdminExtrasModule, ProcurementRequestsModule],
    controllers: [MaterialsController],
    providers: [MaterialsService],
})
export class MaterialsModule { }
