import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConstructionSettingsService {
    constructor(private prisma: PrismaService) { }

    findAll(_projectId?: string) {
        return this.prisma.constructionSetting.findMany({
            orderBy: { createdAt: 'asc' },
        });
    }

    findOne(id: string) {
        return this.prisma.constructionSetting.findUniqueOrThrow({ where: { id } });
    }

    create(data: any) {
        return this.prisma.constructionSetting.create({ data });
    }

    update(id: string, data: any) {
        return this.prisma.constructionSetting.update({ where: { id }, data });
    }

    remove(id: string) {
        return this.prisma.constructionSetting.delete({ where: { id } });
    }

    // ── Project Types: Sectors ──────────────────────────────────────────
    // Real reference data (Settings → Project Types), not a JSON blob — see
    // the schema comment on ProjectSector/ProjectCategory.

    findProjectSectors() {
        return this.prisma.projectSector.findMany({
            orderBy: { name: 'asc' },
            include: { categories: { orderBy: { name: 'asc' } } },
        });
    }

    async createProjectSector(data: any) {
        const name = String(data?.name ?? '').trim();
        if (!name) throw new BadRequestException('Sector name is required');

        const existing = await this.prisma.projectSector.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } },
        });
        if (existing) throw new BadRequestException(`"${name}" already exists`);

        return this.prisma.projectSector.create({
            data: { name },
            include: { categories: true },
        });
    }

    async removeProjectSector(id: string) {
        const sector = await this.prisma.projectSector.findUnique({ where: { id } });
        if (!sector) throw new NotFoundException('Sector not found');
        return this.prisma.projectSector.delete({ where: { id } });
    }

    // ── Project Types: Categories ───────────────────────────────────────

    async createProjectCategory(sectorId: string, data: any) {
        const name = String(data?.name ?? '').trim();
        if (!name) throw new BadRequestException('Category name is required');

        const sector = await this.prisma.projectSector.findUnique({ where: { id: sectorId } });
        if (!sector) throw new NotFoundException('Sector not found');

        const existing = await this.prisma.projectCategory.findFirst({
            where: { sectorId, name: { equals: name, mode: 'insensitive' } },
        });
        if (existing) throw new BadRequestException(`"${name}" already exists under ${sector.name}`);

        return this.prisma.projectCategory.create({ data: { sectorId, name } });
    }

    async removeProjectCategory(id: string) {
        const category = await this.prisma.projectCategory.findUnique({ where: { id } });
        if (!category) throw new NotFoundException('Category not found');
        return this.prisma.projectCategory.delete({ where: { id } });
    }

    /**
     * Level 3 (descriptor mode/options) and Level 4 (structure header/
     * description/fields) editing — the Settings UI persists each atomic
     * change (toggle mode, add/remove an option, add/edit/remove a field,
     * blur a text field) immediately, so this accepts a partial patch of
     * whichever of these five columns changed rather than requiring the
     * whole category.
     */
    async updateProjectCategory(id: string, data: any) {
        const category = await this.prisma.projectCategory.findUnique({ where: { id } });
        if (!category) throw new NotFoundException('Category not found');

        const patch: any = {};

        if (data?.descriptorMode !== undefined) {
            if (data.descriptorMode !== 'dropdown' && data.descriptorMode !== 'free_text') {
                throw new BadRequestException('descriptorMode must be "dropdown" or "free_text"');
            }
            patch.descriptorMode = data.descriptorMode;
        }
        if (data?.descriptorOptions !== undefined) {
            if (!Array.isArray(data.descriptorOptions)) {
                throw new BadRequestException('descriptorOptions must be an array');
            }
            patch.descriptorOptions = data.descriptorOptions
                .map((o: unknown) => String(o ?? '').trim())
                .filter(Boolean);
        }
        if (data?.structureHeaderLabel !== undefined) {
            patch.structureHeaderLabel = String(data.structureHeaderLabel ?? '').trim() || null;
        }
        if (data?.structureDescription !== undefined) {
            patch.structureDescription = String(data.structureDescription ?? '').trim() || null;
        }
        if (data?.structureFields !== undefined) {
            if (!Array.isArray(data.structureFields)) {
                throw new BadRequestException('structureFields must be an array');
            }
            patch.structureFields = data.structureFields.map((f: any) => {
                const label = String(f?.label ?? '').trim();
                if (!label) throw new BadRequestException('Every structure field needs a label');
                const type = f?.type;
                if (type !== 'text' && type !== 'number' && type !== 'select') {
                    throw new BadRequestException('Field type must be text, number, or select');
                }
                return {
                    id: String(f?.id ?? '').trim() || undefined,
                    key: String(f?.key ?? '').trim() || label,
                    label,
                    type,
                    options: type === 'select'
                        ? (Array.isArray(f?.options) ? f.options.map((o: unknown) => String(o ?? '').trim()).filter(Boolean) : [])
                        : undefined,
                };
            });
        }

        return this.prisma.projectCategory.update({ where: { id }, data: patch });
    }
}
