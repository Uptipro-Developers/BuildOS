import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
    constructor(private prisma: PrismaService) { }

    findAll() {
        return this.prisma.supplier.findMany({
            include: { materials: true },
            orderBy: { name: 'asc' },
        });
    }

    findOne(id: string) {
        return this.prisma.supplier.findUniqueOrThrow({
            where: { id },
            include: { materials: true },
        });
    }

    create(data: any) {
        return this.prisma.supplier.create({ data });
    }

    /**
     * Upsert a Supplier from a SabiQuot portal profile, keyed on the stable
     * `sabiquotProfileId` bridge rather than name/email, so re-registration or a
     * later login (which resend the same profile) update the existing record
     * instead of creating a duplicate.
     */
    syncFromPortal(data: {
        sabiquotProfileId: string;
        name: string;
        email?: string;
        phone?: string;
        contactPerson?: string;
        city?: string;
        categories?: string[];
    }) {
        const { sabiquotProfileId, name, email, phone, contactPerson, city, categories } = data;
        if (!sabiquotProfileId) throw new Error('sabiquotProfileId is required');
        if (!name) throw new Error('name is required');

        return this.prisma.supplier.upsert({
            where: { sabiquotProfileId },
            create: {
                sabiquotProfileId,
                source: 'sabiquot',
                name,
                email: email ?? '',
                phone: phone ?? '',
                contactPerson: contactPerson ?? '',
                city: city ?? '',
                categories: categories ?? [],
            },
            update: {
                name,
                ...(email !== undefined ? { email } : {}),
                ...(phone !== undefined ? { phone } : {}),
                ...(contactPerson !== undefined ? { contactPerson } : {}),
                ...(city !== undefined ? { city } : {}),
            },
        });
    }

    update(id: string, data: any) {
        return this.prisma.supplier.update({ where: { id }, data });
    }

    remove(id: string) {
        return this.prisma.supplier.delete({ where: { id } });
    }
}
