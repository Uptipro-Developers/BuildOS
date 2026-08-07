import { Global, Module } from '@nestjs/common';
import { HrSetupService } from './hr-setup.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * HR Setup on its own, and global.
 *
 * Payroll, attendance and the employee record all need the same policy values,
 * and they live in different modules. A shared global provider keeps them
 * reading one copy rather than each module importing HR wholesale — or, as
 * before, growing its own hardcoded constant.
 */
@Global()
@Module({
    imports: [PrismaModule],
    providers: [HrSetupService],
    exports: [HrSetupService],
})
export class HrSetupModule {}
