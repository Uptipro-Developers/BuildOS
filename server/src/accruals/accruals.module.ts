import { Module } from '@nestjs/common';
import { AccrualsController } from './accruals.controller';
import { AccrualsService } from './accruals.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [AccrualsController],
    providers: [AccrualsService],
})
export class AccrualsModule { }
