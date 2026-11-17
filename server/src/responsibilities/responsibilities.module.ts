import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ResponsibilitiesController } from './responsibilities.controller';
import { ResponsibilitiesService } from './responsibilities.service';
import { AdminExtrasModule } from '../admin-extras/admin-extras.module';

@Global()
@Module({
    imports: [PrismaModule, AdminExtrasModule],
    controllers: [ResponsibilitiesController],
    providers: [ResponsibilitiesService],
    exports: [ResponsibilitiesService],
})
export class ResponsibilitiesModule {}
