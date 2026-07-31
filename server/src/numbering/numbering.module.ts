import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NumberingController } from './numbering.controller';
import { NumberingService } from './numbering.service';

/**
 * Global so any feature service can inject NumberingService and allocate a
 * reference on create, without each module importing numbering explicitly.
 */
@Global()
@Module({
    imports: [PrismaModule],
    controllers: [NumberingController],
    providers: [NumberingService],
    exports: [NumberingService],
})
export class NumberingModule {}
