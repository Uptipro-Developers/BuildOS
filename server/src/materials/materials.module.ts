import { Module } from '@nestjs/common';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminExtrasModule } from '../admin-extras/admin-extras.module';

@Module({
    // AdminExtrasModule supplies AdminExtrasService, whose assertMayApprove
    // enforces the Workflow Approval configuration on request decisions.
    imports: [PrismaModule, AdminExtrasModule],
    controllers: [MaterialsController],
    providers: [MaterialsService],
})
export class MaterialsModule { }
