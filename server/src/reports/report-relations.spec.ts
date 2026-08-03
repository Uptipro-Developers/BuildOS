import { findToOneRelation, findToOnePath } from './report-query.service';

/**
 * Multi-table reports join through relations discovered from Prisma's DMMF
 * rather than a hand-maintained map. These cases pin the behaviour that matters:
 * a to-one relation is found in the direction it exists, and a to-many is not
 * mistaken for one — joining on a to-many would multiply the root's rows by its
 * children instead of producing one row per record.
 */
describe('findToOneRelation', () => {
    it('finds a to-one relation', () => {
        expect(findToOneRelation('expense', 'project')).toMatchObject({ field: 'project' });
        expect(findToOneRelation('income', 'project')).toMatchObject({ field: 'project' });
        expect(findToOneRelation('purchaseOrder', 'supplier')).toMatchObject({ field: 'supplier' });
        expect(findToOneRelation('employee', 'department')).toMatchObject({ field: 'department' });
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

/**
 * Reports routinely select two tables that are related only through a third —
 * leave requests and departments meet at the employee, purchase order lines and
 * suppliers meet at the order. Only direct relations were considered, so no root
 * reached both and the result was rendered as disjoint stacked blocks with a
 * Source column instead of a single joined table.
 */
describe('findToOnePath', () => {
    it('finds a direct relation as a single hop', () => {
        expect(findToOnePath('purchaseOrder', 'supplier')).toEqual({
            field: 'supplier',
            path: ['supplier'],
        });
    });

    it('reaches a table through an intermediate one', () => {
        expect(findToOnePath('leaveRequest', 'department')).toEqual({
            field: 'employee',
            path: ['employee', 'department'],
        });
        expect(findToOnePath('pOItem', 'supplier')).toEqual({
            field: 'purchaseOrder',
            path: ['purchaseOrder', 'supplier'],
        });
    });

    it('keeps the first hop in `field` so a direct join is unchanged', () => {
        const direct = findToOnePath('employee', 'department');
        expect(direct?.field).toBe('department');
        expect(direct?.path).toEqual(['department']);
    });

    it('still refuses to traverse a to-many', () => {
        // Project has many Expenses; no chain of to-one hops leads back.
        expect(findToOnePath('project', 'expense')).toBeNull();
    });

    it('returns null when no chain of to-one relations connects the two', () => {
        expect(findToOnePath('supplier', 'department')).toBeNull();
    });

    it('returns null for unknown models and for a model to itself', () => {
        expect(findToOnePath('notAModel', 'project')).toBeNull();
        expect(findToOnePath('project', 'project')).toBeNull();
    });
});
