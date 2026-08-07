import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConstructionExtrasService {
    constructor(private prisma: PrismaService) { }

    // ── Project Config (types + statuses), stored in the systemSetting KV store ──
    private async readSetting<T>(key: string, fallback: T): Promise<T> {
        const row = await this.prisma.systemSetting.findUnique({ where: { key } });
        return (row?.value as T) ?? fallback;
    }
    private async writeSetting(key: string, value: unknown): Promise<void> {
        const clean = JSON.parse(JSON.stringify(value ?? null));
        await this.prisma.systemSetting.upsert({
            where: { key },
            create: { key, value: clean },
            update: { value: clean },
        });
    }
    getProjectTypes() {
        return this.readSetting<any[]>('construction-project-types', []);
    }
    async saveProjectTypes(types: any[]) {
        const list = Array.isArray(types) ? types : [];
        await this.writeSetting('construction-project-types', list);
        return list;
    }
    getProjectStatuses() {
        return this.readSetting<any[]>('construction-project-statuses', []);
    }
    async saveProjectStatuses(statuses: any[]) {
        const list = Array.isArray(statuses) ? statuses : [];
        await this.writeSetting('construction-project-statuses', list);
        return list;
    }

    /**
     * Project roles and their permissions, from Construction › Settings.
     *
     * These lived only in React state, so adding a role, editing its
     * permissions or deleting one lasted until the next page refresh.
     */
    getProjectRoles() {
        return this.readSetting<any[]>('construction-project-roles', []);
    }
    async saveProjectRoles(roles: any[]) {
        const list = (Array.isArray(roles) ? roles : [])
            .filter((role) => role && String(role.id ?? '').trim())
            .map((role) => ({
                id: String(role.id),
                name: String(role.name ?? '').trim(),
                description: String(role.description ?? '').trim(),
                permissions: Array.isArray(role.permissions)
                    ? role.permissions.map((p: unknown) => String(p))
                    : [],
            }));
        await this.writeSetting('construction-project-roles', list);
        return list;
    }

    // ── Project Documents ──
    findAllDocs(projectId?: string) {
        return this.prisma.projectDocument.findMany({
            where: projectId ? { projectId } : {},
            orderBy: { createdAt: 'desc' },
        });
    }
    findDoc(id: string) {
        return this.prisma.projectDocument.findUniqueOrThrow({ where: { id } });
    }
    createDoc(data: any) {
        return this.prisma.projectDocument.create({ data });
    }
    updateDoc(id: string, data: any) {
        return this.prisma.projectDocument.update({ where: { id }, data });
    }
    deleteDoc(id: string) {
        return this.prisma.projectDocument.delete({ where: { id } });
    }

    // ── Construction Approvals ──
    findAllApprovals(status?: string, projectId?: string) {
        return this.prisma.constructionApproval.findMany({
            where: {
                ...(status ? { status } : {}),
                ...(projectId ? { projectId } : {}),
            },
            orderBy: { requestDate: 'desc' },
        });
    }
    findApproval(id: string) {
        return this.prisma.constructionApproval.findUniqueOrThrow({ where: { id } });
    }
    createApproval(data: any) {
        return this.prisma.constructionApproval.create({ data });
    }
    updateApproval(id: string, data: any) {
        return this.prisma.constructionApproval.update({ where: { id }, data });
    }
    deleteApproval(id: string) {
        return this.prisma.constructionApproval.delete({ where: { id } });
    }

    // ── Timelines ──
    findAllTimelines(projectId?: string) {
        return this.prisma.timeline.findMany({
            where: projectId ? { projectId } : {},
            orderBy: { createdAt: 'desc' },
        });
    }
    findTimeline(id: string) {
        return this.prisma.timeline.findUniqueOrThrow({ where: { id } });
    }
    createTimeline(data: any) {
        return this.prisma.timeline.create({ data });
    }
    updateTimeline(id: string, data: any) {
        return this.prisma.timeline.update({ where: { id }, data });
    }
    deleteTimeline(id: string) {
        return this.prisma.timeline.delete({ where: { id } });
    }
}
