import { findToOneRelation } from './report-query.service';

/**
 * Multi-table reports join through relations discovered from Prisma's DMMF
 * rather than a hand-maintained map. These cases pin the behaviour that matters:
 * a to-one relation is found in the direction it exists, and a to-many is not
 * mistaken for one — joining on a to-many would multiply the root's rows by its
 * children instead of producing one row per record.
 */
describe('findToOneRelation', () => {
    it('finds a to-one relation', () => {
        expect(findToOneRelation('expense', 'project')).toEqual({ field: 'project' });
        expect(findToOneRelation('income', 'project')).toEqual({ field: 'project' });
        expect(findToOneRelation('purchaseOrder', 'supplier')).toEqual({ field: 'supplier' });
        expect(findToOneRelation('employee', 'department')).toEqual({ field: 'department' });
    });

    it('does not treat a to-many as a join target', () => {
        // Project has many Expenses; joining that way would repeat the project
        // once per expense rather than giving one row per project.
        expect(findToOneRelation('project', 'expense')).toBeNull();
    });

    it('is directional, so the caller must try both sides as root', () => {
        expect(findToOneRelation('expense', 'project')).not.toBeNull();
        expect(findToOneRelation('project', 'expense')).toBeNull();
    });

    it('returns null for an unknown model', () => {
        expect(findToOneRelation('notAModel', 'project')).toBeNull();
        expect(findToOneRelation('project', 'notAModel')).toBeNull();
    });

    it('returns null for two unrelated models', () => {
        expect(findToOneRelation('supplier', 'department')).toBeNull();
    });
});
