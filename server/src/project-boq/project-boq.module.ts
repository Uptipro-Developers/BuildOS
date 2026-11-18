import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectBoqController } from './project-boq.controller';
import { ProjectBoqService } from './project-boq.service';
@Module({ imports: [PrismaModule], controllers: [ProjectBoqController], providers: [ProjectBoqService] })
export class ProjectBoqModule {}
