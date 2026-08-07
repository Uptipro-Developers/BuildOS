import { Module } from '@nestjs/common';
import { HrExtrasController } from './hr-extras.controller';
import { HrExtrasService } from './hr-extras.service';
import { PayrollController } from './payroll.controller';
import { PayrollOrchestrationService } from './payroll-orchestration.service';
import { PayrollValidationService } from './payroll-validation.service';
import { PayrollTaxService } from './payroll-tax.service';
import { PayrollDeductionsService } from './payroll-deductions.service';
import { PayslipGenerationService } from './payslip-generation.service';
import { PayrollOvertimeService } from './payroll-overtime.service';
import { HrSetupModule } from './hr-setup.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LeaveRequestsModule } from '../leave-requests/leave-requests.module';

@Module({
    // HrSetupModule is global; imported here so this module still stands alone
    // in tests that instantiate it directly.
    imports: [PrismaModule, LeaveRequestsModule, HrSetupModule],
    controllers: [HrExtrasController, PayrollController],
    providers: [
        HrExtrasService,
        PayrollOrchestrationService,
        PayrollValidationService,
        PayrollTaxService,
        PayrollDeductionsService,
        PayrollOvertimeService,
        PayslipGenerationService,
    ],
    exports: [
        PayrollOrchestrationService,
        PayrollValidationService,
        PayrollTaxService,
        PayrollDeductionsService,
        PayrollOvertimeService,
        PayslipGenerationService,
    ],
})
export class HrExtrasModule { }
