import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentTermDto, TrancheDto, UpdatePaymentTermDto } from './payment-terms.dto';

@Injectable()
export class PaymentTermsService {
    constructor(private prisma: PrismaService) { }

    findAll() {
        return this.prisma.paymentTerm.findMany({ orderBy: { createdAt: 'asc' } });
    }

    private async assertExists(id: string) {
        const existing = await this.prisma.paymentTerm.findUnique({ where: { id }, select: { id: true } });
        if (!existing) throw new NotFoundException(`Payment term "${id}" not found.`);
    }

    /** The modal already enforces this; a direct API caller doesn't get to skip it. */
    private assertTranchesSum(tranches: TrancheDto[]) {
        const total = tranches.reduce((s, t) => s + t.percent, 0);
        if (Math.round(total) !== 100) {
            throw new BadRequestException(
                `Tranches must total 100% (currently ${Math.round(total)}%).`,
            );
        }
    }

    async create(data: CreatePaymentTermDto) {
        this.assertTranchesSum(data.tranches);
        // The very first payment term configured has nothing to be "the
        // default" relative to yet, so it becomes the default itself rather
        // than leaving the Create-PO wizard with none at all.
        const count = await this.prisma.paymentTerm.count();
        return this.prisma.paymentTerm.create({
            data: {
                name: data.name,
                description: data.description ?? '',
                deliverySplit: data.deliverySplit,
                tranches: data.tranches as any,
                isDefault: count === 0,
            },
        });
    }

    async update(id: string, data: UpdatePaymentTermDto) {
        await this.assertExists(id);
        if (data.tranches) this.assertTranchesSum(data.tranches);
        return this.prisma.paymentTerm.update({
            where: { id },
            data: {
                ...(data.name !== undefined ? { name: data.name } : {}),
                ...(data.description !== undefined ? { description: data.description } : {}),
                ...(data.deliverySplit !== undefined ? { deliverySplit: data.deliverySplit } : {}),
                ...(data.tranches !== undefined ? { tranches: data.tranches as any } : {}),
            },
        });
    }

    async remove(id: string) {
        const term = await this.prisma.paymentTerm.findUnique({ where: { id } });
        if (!term) throw new NotFoundException(`Payment term "${id}" not found.`);
        if (term.isDefault) {
            throw new BadRequestException(
                'This is the default payment term — set another one as default before deleting it.',
            );
        }
        return this.prisma.paymentTerm.delete({ where: { id } });
    }

    /** Exactly one row carries isDefault — flipping it off everywhere else first. */
    async setDefault(id: string) {
        await this.assertExists(id);
        const [, updated] = await this.prisma.$transaction([
            this.prisma.paymentTerm.updateMany({
                where: { isDefault: true },
                data: { isDefault: false },
            }),
            this.prisma.paymentTerm.update({ where: { id }, data: { isDefault: true } }),
        ]);
        return updated;
    }
}
