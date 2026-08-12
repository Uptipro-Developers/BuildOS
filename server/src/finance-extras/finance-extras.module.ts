import { Module } from '@nestjs/common';
import { FinanceExtrasController } from './finance-extras.controller';
import { FinanceExtrasService } from './finance-extras.service';
import { PostingEngineService } from './posting-engine.service';
import { PayrollPostingService } from './payroll-posting.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [FinanceExtrasController],
    providers: [FinanceExtrasService, PostingEngineService, PayrollPostingService],
    // Payroll posts through the same engine, so it is exported rather than
    // reimplemented there — one posting path is the whole point of it.
    exports: [PostingEngineService],
})
export class FinanceExtrasModule { }
