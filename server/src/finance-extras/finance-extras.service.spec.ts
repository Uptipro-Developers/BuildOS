import { BadRequestException } from '@nestjs/common';
import { FinanceExtrasService } from './finance-extras.service';
import { PostingEngineService } from './posting-engine.service';

/**
 * The Posting Engine's configuration, and where it is kept.
 *
 * Process categories previously had nowhere to live at all: the page held them
 * in component state seeded with an empty array, so the list was empty on every
 * load, a category created by hand vanished on refresh, and posting to the
 * ledger — which looks its category up first — could never run at all. These
 * assert the round trip, and the defaults that stop a fresh install from
 * crashing on a setting nobody has written yet.
 */

function makeService(stored: Record<string, unknown> = {}) {
    const settings = new Map<string, unknown>(Object.entries(stored));

    const prisma: any = {
        systemSetting: {
            findUnique: jest.fn(({ where }: any) =>
                Promise.resolve(
                    settings.has(where.key)
                        ? { key: where.key, value: settings.get(where.key) }
                        : null,
                ),
            ),
            upsert: jest.fn(({ where, create }: any) => {
                settings.set(where.key, create.value);
                return Promise.resolve({ key: where.key, value: create.value });
            }),
        },
    };
    const numbering: any = {
        allocate: jest.fn(() => Promise.resolve({ reference: 'JE-001' })),
    };

    const posting = new PostingEngineService(prisma, numbering);

    return {
        service: new FinanceExtrasService(prisma, numbering, posting),
        settings,
        prisma,
        posting,
    };
}

const CATEGORY = {
    id: 'cat-1',
    name: 'Payroll Disbursement',
    description: 'Post approved payroll batches to the general ledger',
    sourceApp: 'HR',
    linkedProcess: 'Payroll Processing',
    debitAccount: '5100 Labour Costs',
    creditAccount: '1110 Cash & Bank',
};

describe('process categories', () => {
    it('survives the round trip that component state did not', async () => {
        const { service } = makeService();
        await service.saveProcessCategories([CATEGORY]);

        expect(await service.getProcessCategories()).toEqual([CATEGORY]);
    });

    it('is empty rather than undefined on a fresh install', async () => {
        // The page maps over this on first paint; undefined would throw before
        // anything rendered.
        const { service } = makeService();
        expect(await service.getProcessCategories()).toEqual([]);
    });

    it('is stored apart from the account mappings', async () => {
        // Same storage mechanism, different keys — writing one must not clear
        // the other, which is the failure mode of sharing a settings row.
        const { service, settings } = makeService();
        await service.saveProcessMappings([{ id: 'pm-1', process: 'Payroll Disbursement' }]);
        await service.saveProcessCategories([CATEGORY]);

        expect(settings.get('finance-process-mappings')).toHaveLength(1);
        expect(settings.get('finance-process-categories')).toHaveLength(1);
        expect(await service.getProcessMappings()).toHaveLength(1);
    });

    it('refuses to store something that is not a list', async () => {
        // The endpoint unwraps `body.categories ?? body`, so a malformed request
        // can reach this with an object. Storing it would make every later read
        // throw on .map.
        const { service } = makeService();
        await service.saveProcessCategories({ nope: true } as any);

        expect(await service.getProcessCategories()).toEqual([]);
    });

    it('replaces the list rather than appending to it', async () => {
        // The screen edits the whole set and sends it back; a merge would
        // resurrect categories the user had just removed.
        const { service } = makeService();
        await service.saveProcessCategories([CATEGORY]);
        await service.saveProcessCategories([{ ...CATEGORY, id: 'cat-2', name: 'Expense Claims' }]);

        const stored = await service.getProcessCategories();
        expect(stored).toHaveLength(1);
        expect(stored[0].id).toBe('cat-2');
    });
});

describe('process mappings', () => {
    it('refuses a list with two mappings for the same process', async () => {
        // The frontend already gates this in the modal, but the whole list is
        // replaced wholesale here, so a duplicate must be rejected server-side
        // too rather than trusted.
        const { service } = makeService();
        await expect(
            service.saveProcessMappings([
                { id: 'pm-1', process: 'Payroll Disbursement' },
                { id: 'pm-2', process: 'Payroll Disbursement' },
            ]),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows distinct processes in the same save', async () => {
        const { service } = makeService();
        const saved = await service.saveProcessMappings([
            { id: 'pm-1', process: 'Payroll Disbursement' },
            { id: 'pm-2', process: 'Expense Claim' },
        ]);
        expect(saved).toHaveLength(2);
    });

    it('does not reject rows with a blank process', async () => {
        const { service } = makeService();
        const saved = await service.saveProcessMappings([
            { id: 'pm-1', process: '' },
            { id: 'pm-2', process: '' },
        ]);
        expect(saved).toHaveLength(2);
    });
});
