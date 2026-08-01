import { BadRequestException, Injectable } from '@nestjs/common';
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
    async syncFromPortal(data: {
        sabiquotProfileId: string;
        name: string;
        email?: string;
        phone?: string;
        contactPerson?: string;
        city?: string;
        categories?: string[];
        /**
         * The vendor's existing BuildOS Supplier id, if they already trade with
         * the company and were given one. Lets an existing supplier claim its own
         * record rather than having a duplicate created alongside it.
         */
        supplierId?: string;
    }) {
        const {
            sabiquotProfileId, name, email, phone, contactPerson, city, categories, supplierId,
        } = data;
        if (!sabiquotProfileId) throw new Error('sabiquotProfileId is required');
        if (!name) throw new Error('name is required');

        const contactUpdates = {
            ...(email !== undefined ? { email } : {}),
            ...(phone !== undefined ? { phone } : {}),
            ...(contactPerson !== undefined ? { contactPerson } : {}),
            ...(city !== undefined ? { city } : {}),
        };

        // Already linked — nothing to reconcile.
        const linked = await this.prisma.supplier.findUnique({ where: { sabiquotProfileId } });
        if (linked) {
            return this.prisma.supplier.update({
                where: { id: linked.id },
                data: { name, ...contactUpdates },
            });
        }

        // An existing supplier is adopted rather than duplicated. Without this an
        // established supplier who registers on the portal ends up as two records
        // — the ERP's and the portal's — with orders split across them.
        const claimed = await this.claimExistingSupplier({
            supplierId,
            email,
            sabiquotProfileId,
        });
        if (claimed) {
            return this.prisma.supplier.update({
                where: { id: claimed.id },
                data: { name, sabiquotProfileId, ...contactUpdates },
            });
        }

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

    /**
     * Finds an unlinked Procurement supplier that this portal profile should
     * adopt, by explicit vendor id first and by email second.
     *
     * A supplier already bound to a different portal profile is never taken over
     * — that would silently move another vendor's orders — so it throws instead.
     * Returns null when there is nothing to adopt, and the caller creates a new
     * supplier.
     */
    private async claimExistingSupplier(input: {
        supplierId?: string;
        email?: string;
        sabiquotProfileId: string;
    }) {
        const id = String(input.supplierId ?? '').trim();
        if (id) {
            const byId = await this.prisma.supplier.findUnique({ where: { id } });
            if (!byId) {
                throw new BadRequestException(
                    `No supplier with id "${id}" exists in Procurement. Check the vendor ID or leave it blank to be added as a new supplier.`,
                );
            }
            if (byId.sabiquotProfileId && byId.sabiquotProfileId !== input.sabiquotProfileId) {
                throw new BadRequestException(
                    `Supplier "${byId.name}" is already linked to a different SabiQuot account.`,
                );
            }
            return byId;
        }

        // No id given: fall back to a unique email match, which is how an
        // existing vendor links without having been told their id.
        const email = String(input.email ?? '').trim().toLowerCase();
        if (!email) return null;
        const matches = await this.prisma.supplier.findMany({
            where: { email: { equals: email, mode: 'insensitive' } },
        });
        const unlinked = matches.filter((s) => !s.sabiquotProfileId);
        // Ambiguous: two suppliers share the address, so no automatic choice is
        // safe. A new record is created and an admin can merge.
        return unlinked.length === 1 ? unlinked[0] : null;
    }

    update(id: string, data: any) {
        return this.prisma.supplier.update({ where: { id }, data });
    }

    remove(id: string) {
        return this.prisma.supplier.delete({ where: { id } });
    }
}
