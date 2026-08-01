import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NUMBERING_SEEDS } from './numbering.defaults';

/** Bounds on what an admin may configure, so a reference stays a reference. */
const MAX_PAD_LENGTH = 10;
const MAX_TEMPLATE_LENGTH = 40;
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
                    // Seeds predate templates and still define the parts, so the
                    // template is derived rather than duplicated in the seed list.
                    data: missing.map((seed) => ({
                        ...seed,
                        template: `${seed.prefix}${seed.separator}{N:${seed.padLength}}`,
                        startingNumber: 1,
                        incrementBy: 1,
                        lastUsedNumber: Math.max(seed.nextNumber - 1, 0),
                    })),
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

    /**
     * Formats a sequence value against a reference template.
     *
     * `{N}` inserts the number, `{N:4}` pads it to four digits. A config with no
     * template falls back to the prefix/separator/padding it was created with,
     * which is what rows written before templates existed carry.
     */
    private format(
        config: { template?: string | null; prefix: string; separator: string; padLength: number },
        value: number,
    ): string {
        const template = String(config.template ?? '').trim();
        if (!template) {
            return `${config.prefix}${config.separator}${String(value).padStart(config.padLength, '0')}`;
        }
        return template.replace(/\{N(?::(\d+))?\}/gi, (_m, pad?: string) =>
            String(value).padStart(pad ? Number(pad) : 1, '0'),
        );
    }

    /**
     * Derives prefix/separator/padding from a template.
     *
     * Those columns predate templates and are still what an un-templated row
     * formats from, so they are kept in step rather than left to go stale.
     */
    private partsFromTemplate(template: string) {
        const match = /^(.*?)\{N(?::(\d+))?\}/i.exec(template);
        const lead = match?.[1] ?? '';
        const padLength = match?.[2] ? Number(match[2]) : 1;
        const sep = /[^A-Za-z0-9]+$/.exec(lead);
        return {
            prefix: sep ? lead.slice(0, sep.index) : lead,
            separator: sep ? sep[0] : '',
            padLength: Math.min(Math.max(padLength, 1), MAX_PAD_LENGTH),
        };
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

        const current = await this.prisma.numberingConfig.findUnique({ where: { module: key } });
        if (!current) throw new BadRequestException(`No numbering is configured for "${key}".`);

        const value = current.nextNumber;
        // A bounded sequence must stop rather than run past its ceiling and issue
        // a reference outside the range an admin configured.
        if (current.endingNumber !== null && value > current.endingNumber) {
            throw new BadRequestException(
                `Numbering for "${key}" has reached its ending number (${current.endingNumber}). ` +
                    'Raise it in Settings before creating more records.',
            );
        }

        const step = Math.max(current.incrementBy || 1, 1);
        const updated = await this.prisma.numberingConfig.update({
            where: { module: key },
            data: {
                nextNumber: { increment: step },
                lastUsedNumber: value,
                lastUsedDate: new Date(),
            },
        });
        return { module: key, reference: this.format(updated, value), value };
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
        const template = String(input?.template ?? '').trim();
        if (!template) throw new BadRequestException('A template is required.');
        if (!/\{N(?::\d+)?\}/i.test(template)) {
            throw new BadRequestException(
                'A template must contain {N} — the sequence number — e.g. "PO-{N:4}".',
            );
        }
        if (template.length > MAX_TEMPLATE_LENGTH) {
            throw new BadRequestException(
                `A template may be at most ${MAX_TEMPLATE_LENGTH} characters.`,
            );
        }

        const startingNumber = Number(input?.startingNumber ?? 1);
        const incrementBy = Number(input?.incrementBy ?? 1);
        const endingRaw = input?.endingNumber;
        const endingNumber =
            endingRaw === null || endingRaw === undefined || endingRaw === ''
                ? null
                : Number(endingRaw);

        if (!Number.isInteger(startingNumber) || startingNumber < 1) {
            throw new BadRequestException('The starting number must be 1 or greater.');
        }
        if (!Number.isInteger(incrementBy) || incrementBy < 1) {
            throw new BadRequestException('Increment by must be 1 or greater.');
        }
        if (endingNumber !== null) {
            if (!Number.isInteger(endingNumber) || endingNumber < startingNumber) {
                throw new BadRequestException(
                    'The ending number must be a whole number no lower than the starting number.',
                );
            }
        }

        // `nextNumber` is the live sequence position. It is only taken from the
        // caller when supplied — an admin editing the template must not silently
        // rewind the counter and re-issue references that already exist.
        const nextRaw = input?.nextNumber;
        const nextNumber =
            nextRaw === undefined || nextRaw === null || nextRaw === ''
                ? undefined
                : Number(nextRaw);
        if (nextNumber !== undefined && (!Number.isInteger(nextNumber) || nextNumber < 1)) {
            throw new BadRequestException('The next number must be 1 or greater.');
        }

        return {
            template,
            startingNumber,
            endingNumber,
            incrementBy,
            ...(nextNumber === undefined ? {} : { nextNumber }),
            ...this.partsFromTemplate(template),
        };
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

        const data = this.sanitize(body);
        return this.prisma.numberingConfig.create({
            data: {
                module,
                app,
                description: String(body?.description ?? ''),
                ...data,
                // A brand-new sequence issues its starting number first.
                nextNumber: data.nextNumber ?? data.startingNumber,
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
                template: `${seed.prefix}${seed.separator}{N:${seed.padLength}}`,
                startingNumber: 1,
                endingNumber: null,
                incrementBy: 1,
                description: seed.description,
            },
        });
    }
}
