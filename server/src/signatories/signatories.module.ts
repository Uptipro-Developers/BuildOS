import { Module } from '@nestjs/common';
import { SignatoriesController } from './signatories.controller';
import { SignatoriesService } from './signatories.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [SignatoriesController],
    providers: [SignatoriesService],
})
export class SignatoriesModule { }
