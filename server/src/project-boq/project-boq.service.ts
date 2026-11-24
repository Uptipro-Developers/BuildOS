import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectBoqService {
  constructor(private prisma: PrismaService) {}
  list(projectId: string) { return this.prisma.projectBoqLevel.findMany({ where: { projectId }, include: { items: { orderBy: { createdAt: 'asc' } } }, orderBy: { sequence: 'asc' } }); }
  async createLevel(data: any) { if (!data?.projectId || !String(data?.name ?? '').trim()) throw new BadRequestException('Project and level name are required.'); return this.prisma.projectBoqLevel.create({ data: { projectId: String(data.projectId), name: String(data.name).trim(), description: String(data.description ?? ''), sequence: Number(data.sequence ?? 0) }, include: { items: true } }); }
  updateLevel(id: string, data: any) { return this.prisma.projectBoqLevel.update({ where: { id }, data: { ...(data.name !== undefined ? { name: String(data.name).trim() } : {}), ...(data.description !== undefined ? { description: String(data.description) } : {}), ...(data.sequence !== undefined ? { sequence: Number(data.sequence) } : {}) }, include: { items: true } }); }
  deleteLevel(id: string) { return this.prisma.projectBoqLevel.delete({ where: { id } }); }
  async createItem(levelId: string, data: any) { if (!String(data?.description ?? '').trim() || !String(data?.unit ?? '').trim()) throw new BadRequestException('Description and unit are required.'); return this.prisma.projectBoqItem.create({ data: { levelId, kind: data?.kind === 'quantity' ? 'quantity' : 'material', code: String(data?.code ?? ''), description: String(data.description).trim(), unit: String(data.unit).trim(), quantity: Number(data?.quantity ?? 0), unitRate: Number(data?.unitRate ?? 0), notes: String(data?.notes ?? '') } }); }
  updateItem(id: string, data: any) { return this.prisma.projectBoqItem.update({ where: { id }, data: { ...data, quantity: data.quantity !== undefined ? Number(data.quantity) : undefined, unitRate: data.unitRate !== undefined ? Number(data.unitRate) : undefined } }); }
  deleteItem(id: string) { return this.prisma.projectBoqItem.delete({ where: { id } }); }
}
