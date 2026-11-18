import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminExtrasService } from '../admin-extras/admin-extras.service';

@Injectable()
export class StakeholdersService {
    constructor(private prisma: PrismaService, private admin: AdminExtrasService) { }

    findAll(projectId?: string) {
        return this.prisma.stakeholder.findMany({
            where: projectId ? { projectId } : undefined,
            orderBy: { name: 'asc' },
        });
    }

    findOne(id: string) {
        return this.prisma.stakeholder.findUniqueOrThrow({ where: { id } });
    }

    create(data: any) {
        return this.prisma.stakeholder.create({ data });
    }

    update(id: string, data: any) {
        return this.prisma.stakeholder.update({ where: { id }, data });
    }

    remove(id: string) {
        return this.prisma.stakeholder.delete({ where: { id } });
    }

    async invite(id: string) {
        const partner = await this.prisma.stakeholder.findUniqueOrThrow({ where: { id } });
        if (!partner.isPartner || !partner.email) throw new BadRequestException('Partner name and email are required before inviting.');
        await this.prisma.appRole.upsert({ where: { name: 'Project Partner' }, create: { name: 'Project Partner', description: 'External consortium project partner', appScope: ['ess'] }, update: {} });
        const invited = await this.admin.inviteUser({ email: partner.email, name: partner.name, role: 'Project Partner', assignedApps: ['ess'], department: partner.organization });
        const updated = await this.prisma.stakeholder.update({ where: { id }, data: { inviteStatus: 'invited', invitedAt: new Date(), partnerUserId: invited.id } });
        return { ...updated, activationLink: invited.activationLink };
    }

    async partnerWorkspace(email: string) {
        const assignments = await this.prisma.stakeholder.findMany({ where: { isPartner: true, email: { equals: email, mode: 'insensitive' } }, orderBy: { createdAt: 'desc' } });
        const projectIds = Array.from(new Set(assignments.map((item) => item.projectId)));
        const [projects, attendance, communications] = await Promise.all([
            this.prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true, status: true, location: true, startDate: true, endDate: true } }),
            this.prisma.attendanceRecord.findMany({ where: { partnerId: { in: assignments.map((item) => item.id) } }, orderBy: { date: 'desc' } }),
            this.prisma.communicationLog.findMany({ where: { partnerId: { in: assignments.map((item) => item.id) } }, orderBy: { createdAt: 'asc' } }),
        ]);
        return { assignments, projects, attendance, communications };
    }
}
