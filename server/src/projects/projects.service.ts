import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResponsibilitiesService } from '../responsibilities/responsibilities.service';

@Injectable()
export class ProjectsService {
    constructor(private prisma: PrismaService, private responsibilities: ResponsibilitiesService) { }

    async findAll(status?: string, type?: string, userId?: string) {
        const projectIds = userId ? await this.responsibilities.allowedScopeIds(userId, 'construction', 'project', 'p_projects') : null;
        return this.prisma.project.findMany({
            where: {
                ...(projectIds ? { id: { in: projectIds } } : {}),
                ...(status ? { status: status as any } : {}),
                ...(type ? { type: type as any } : {}),
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string, userId?: string) {
        if (userId) await this.responsibilities.assertProcessAction(userId, 'construction', 'p_projects', 'view', 'project', id);
        return this.prisma.project.findUniqueOrThrow({ where: { id } });
    }

    async create(data: any, userId?: string) {
        if (userId) {
            await this.responsibilities.assertProcessAction(userId, 'construction', 'p_projects', 'create');
        }
        // Provide safe defaults for required, no-default columns so a partial
        // payload (e.g. from the construction module, which uses a richer
        // project shape) cannot crash with a Prisma validation 500.
        return this.prisma.project.create({
            data: {
                location: '',
                state: '',
                city: '',
                type: 'Commercial',
                manager: '',
                budget: 0,
                startDate: new Date(),
                endDate: new Date(),
                ...data,
            },
        });
    }

    async update(id: string, data: any, userId?: string) {
        if (userId) await this.responsibilities.assertProcessAction(userId, 'construction', 'p_projects', 'edit', 'project', id);
        return this.prisma.project.update({ where: { id }, data });
    }

    async remove(id: string, userId?: string) {
        if (userId) await this.responsibilities.assertProcessAction(userId, 'construction', 'p_projects', 'delete', 'project', id);
        return this.prisma.project.delete({ where: { id } });
    }
}
