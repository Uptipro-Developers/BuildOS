import { Module } from '@nestjs/common';
import { StakeholdersController } from './stakeholders.controller';
import { StakeholdersService } from './stakeholders.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminExtrasModule } from '../admin-extras/admin-extras.module';

@Module({
    imports: [PrismaModule, AdminExtrasModule],
    controllers: [StakeholdersController],
    providers: [StakeholdersService],
})
export class StakeholdersModule { }
