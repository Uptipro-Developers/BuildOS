import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeaveTypesService {
    constructor(private prisma: PrismaService) { }

    findAll() {
        return this.prisma.leaveType.findMany({ orderBy: { name: 'asc' } });
    }

    findOne(id: string) {
        return this.prisma.leaveType.findUniqueOrThrow({ where: { id } });
    }

    private clean(data: any) {
        const patch: Record<string, any> = { ...data };
        if (data?.gradeEntitlements !== undefined) {
            if (!data.gradeEntitlements || typeof data.gradeEntitlements !== 'object' || Array.isArray(data.gradeEntitlements)) {
                throw new BadRequestException('Grade entitlements must be an object keyed by grade level.');
            }
            patch.gradeEntitlements = Object.fromEntries(Object.entries(data.gradeEntitlements)
                .filter(([grade, days]) => grade.trim() && Number(days) >= 0)
                .map(([grade, days]) => [grade.trim(), Number(days)]));
        }
        return patch;
    }

    create(data: any) {
        return this.prisma.leaveType.create({ data: this.clean(data) as any });
    }

    update(id: string, data: any) {
        return this.prisma.leaveType.update({ where: { id }, data: this.clean(data) as any });
    }

    remove(id: string) {
        return this.prisma.leaveType.delete({ where: { id } });
    }
}
