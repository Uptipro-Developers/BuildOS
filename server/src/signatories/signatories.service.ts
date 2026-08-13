import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSignatoryDto, UpdateSignatoryDto } from './signatories.dto';

const USER_SELECT = { id: true, name: true, email: true, department: true, role: true };

@Injectable()
export class SignatoriesService {
    constructor(private prisma: PrismaService) { }

    findAll() {
        return this.prisma.signatory.findMany({
            include: { user: { select: USER_SELECT } },
            orderBy: { createdAt: 'asc' },
        });
    }

    private async assertExists(id: string) {
        const existing = await this.prisma.signatory.findUnique({ where: { id }, select: { id: true } });
        if (!existing) throw new NotFoundException(`Signatory "${id}" not found.`);
    }

    /** A `userId` that doesn't resolve to a real user would otherwise surface
     * as a raw Prisma foreign-key error instead of a clean 400. */
    private async assertUserExists(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!user) throw new BadRequestException(`No user found with id "${userId}".`);
    }

    async create(data: CreateSignatoryDto) {
        await this.assertUserExists(data.userId);
        try {
            return await this.prisma.signatory.create({
                data: {
                    department: data.department,
                    role: data.role,
                    userId: data.userId,
                },
                include: { user: { select: USER_SELECT } },
            });
        } catch (err) {
            throw this.friendlyConflict(err);
        }
    }

    async update(id: string, data: UpdateSignatoryDto) {
        await this.assertExists(id);
        if (data.userId) await this.assertUserExists(data.userId);
        try {
            return await this.prisma.signatory.update({
                where: { id },
                data,
                include: { user: { select: USER_SELECT } },
            });
        } catch (err) {
            throw this.friendlyConflict(err);
        }
    }

    async remove(id: string) {
        await this.assertExists(id);
        return this.prisma.signatory.delete({ where: { id } });
    }

    /** The unique constraint on `userId` throws Prisma's raw P2002 otherwise. */
    private friendlyConflict(err: unknown) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            return new ConflictException('This person is already a signatory.');
        }
        return err;
    }
}
