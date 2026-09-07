import { Module } from '@nestjs/common';
import { PaymentTermsController } from './payment-terms.controller';
import { PaymentTermsService } from './payment-terms.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [PaymentTermsController],
    providers: [PaymentTermsService],
})
export class PaymentTermsModule { }
