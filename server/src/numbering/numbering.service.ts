import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NUMBERING_SEEDS } from './numbering.defaults';

/** Bounds on what an admin may configure, so a reference stays a reference. */
const MAX_PAD_LENGTH = 10;
const MAX_PREFIX_LENGTH = 12;
const MAX_SEPARATOR_LENGTH = 3;

@Injectable()
export class NumberingService implements OnModuleInit {
    private readonly logger = new Logger(NumberingService.name);
    private seeded = false;

    constructor(private prisma: PrismaService) {}

    /**
     * Inserts any module missing from the table.
     *
     * Runs on boot but never overwrites an existing row: the stored `nextNumber` is
     * the live sequence position, and resetting it to the seed value would hand out
     * references that already exist.
     */
    async onModuleInit() {
        // Deliberately not awaited into bootstrap — a database that is briefly
        // unreachable must not stop the app from starting. Seeding retries on the
        // first request that needs it.
        void this.ensureSeeded();
    }

    private async ensureSeeded(): Promise<void> {
        if (this.seeded) return;
        try {
            const existing = await this.prisma.numberingConfig.findMany({
                select: { module: true },
            });
            const have = new Set(existing.map((row) => row.module));
            const missing = NUMBERING_SEEDS.filter((seed) => !have.has(seed.module));

            if (missing.length > 0) {
                await this.prisma.numberingConfig.createMany({
                    data: missing,
                    skipDuplicates: true,
                });
                this.logger.log(`Seeded ${missing.length} numbering config(s).`);
            }
            this.seeded = true;
        } catch (error) {
            this.logger.error(
                `Could not seed numbering configs: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
        }
    }

    /** Every config, ordered for display. */
    async findAll(app?: string) {
        await this.ensureSeeded();
        return this.prisma.numberingConfig.findMany({
            where: app ? { app } : undefined,
            orderBy: [{ app: 'asc' }, { module: 'asc' }],
        });
    }

    /** Formats a sequence value using a config's prefix/separator/padding. */
    private format(
        config: { prefix: string; separator: string; padLength: number },
        value: number,
    ): string {
        return `${config.prefix}${config.separator}${String(value).padStart(config.padLength, '0')}`;
    }

    /**
     * Reserves and returns the next reference for a module.
     *
     * The increment is a single atomic UPDATE, so two concurrent callers get two
     * different numbers. Doing this in the browser — as the old client-side store
     * did — could not offer that: both tabs read the same `nextNumber` and both
     * produced the same reference.
     *
     * A module with no configured sequence is a programming error rather than
     * something to paper over with a random id, so it throws.
     */
    async allocate(module: string): Promise<{ module: string; reference: string; value: number }> {
        await this.ensureSeeded();
        const key = String(module ?? '').trim();
        if (!key) throw new BadRequestException('A module is required.');

        try {
            const updated = await this.prisma.numberingConfig.update({
                where: { module: key },
                data: { nextNumber: { increment: 1 } },
            });
            // `update` returns the row after incrementing, so the value handed out
            // is the one that was there before.
            const value = updated.nextNumber - 1;
            return { module: key, reference: this.format(updated, value), value };
        } catch {
            throw new BadRequestException(`No numbering is configured for "${key}".`);
        }
    }

    /** The reference a module would produce next, without consuming it. */
    async peek(module: string): Promise<string> {
        await this.ensureSeeded();
        const config = await this.prisma.numberingConfig.findUnique({
            where: { module: String(module ?? '').trim() },
        });
        if (!config) throw new BadRequestException(`No numbering is configured for "${module}".`);
        return this.format(config, config.nextNumber);
    }

    private sanitize(input: any) {
        const padLength = Number(input?.padLength);
        const nextNumber = Number(input?.nextNumber);
        const prefix = String(input?.prefix ?? '').trim();
        const separator = String(input?.separator ?? '');

        if (prefix.length === 0) throw new BadRequestException('A prefix is required.');
        if (prefix.length > MAX_PREFIX_LENGTH) {
            throw new BadRequestException(`A prefix may be at most ${MAX_PREFIX_LENGTH} characters.`);
        }
        if (separator.length > MAX_SEPARATOR_LENGTH) {
            throw new BadRequestException(
                `A separator may be at most ${MAX_SEPARATOR_LENGTH} characters.`,
            );
        }
        if (!Number.isInteger(padLength) || padLength < 1 || padLength > MAX_PAD_LENGTH) {
            throw new BadRequestException(`Padding must be between 1 and ${MAX_PAD_LENGTH}.`);
        }
        if (!Number.isInteger(nextNumber) || nextNumber < 1) {
            throw new BadRequestException('The next number must be 1 or greater.');
        }

        return { prefix, separator, padLength, nextNumber };
    }

    /** Updates one module's format. */
    async update(module: string, body: any) {
        await this.ensureSeeded();
        const key = String(module ?? '').trim();
        const data = this.sanitize(body);
        const description =
            body?.description === undefined ? undefined : String(body.description);

        const existing = await this.prisma.numberingConfig.findUnique({ where: { module: key } });
        if (!existing) throw new BadRequestException(`No numbering is configured for "${key}".`);

        return this.prisma.numberingConfig.update({
            where: { module: key },
            data: { ...data, ...(description === undefined ? {} : { description }) },
        });
    }

    /** Adds a module sequence that is not in the seed list. */
    async create(body: any) {
        await this.ensureSeeded();
        const module = String(body?.module ?? '').trim();
        const app = String(body?.app ?? '').trim();
        if (!module) throw new BadRequestException('A module is required.');
        if (!app) throw new BadRequestException('An app is required.');

        const existing = await this.prisma.numberingConfig.findUnique({ where: { module } });
        if (existing) throw new BadRequestException(`"${module}" already has numbering configured.`);

        return this.prisma.numberingConfig.create({
            data: {
                module,
                app,
                description: String(body?.description ?? ''),
                ...this.sanitize(body),
            },
        });
    }

    async remove(module: string) {
        await this.ensureSeeded();
        await this.prisma.numberingConfig.delete({
            where: { module: String(module ?? '').trim() },
        });
        return { deleted: true };
    }

    /**
     * Restores a module to its seed format.
     *
     * `nextNumber` is left alone on purpose — the seed value is a historical
     * starting point, and rewinding the counter would re-issue references that
     * existing records already carry.
     */
    async reset(module: string) {
        await this.ensureSeeded();
        const key = String(module ?? '').trim();
        const seed = NUMBERING_SEEDS.find((s) => s.module === key);
        if (!seed) throw new BadRequestException(`"${key}" has no default to reset to.`);

        return this.prisma.numberingConfig.update({
            where: { module: key },
            data: {
                prefix: seed.prefix,
                separator: seed.separator,
                padLength: seed.padLength,
                description: seed.description,
            },
        });
    }
}
