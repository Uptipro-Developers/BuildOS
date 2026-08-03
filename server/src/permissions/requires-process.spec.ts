import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { DEFAULT_PROCESS_CATALOG } from '../common/process-catalog';

/**
 * Every `@RequiresProcess()` in the codebase must name a real catalog process and
 * an action that process supports.
 *
 * This fails open at runtime by design — `PermissionsService.can()` allows and logs
 * when a guard references an unknown process, so a mistyped id does not lock users
 * out of a working endpoint. The cost of that safety is that a typo is invisible in
 * production except as a log line, and the endpoint it was meant to protect is
 * simply unguarded. This test is what makes it visible instead.
 */
describe('@RequiresProcess declarations', () => {
    const SRC = join(__dirname, '..');

    const walk = (dir: string): string[] =>
        readdirSync(dir).flatMap((entry) => {
            const full = join(dir, entry);
            if (statSync(full).isDirectory()) return walk(full);
            return full.endsWith('.ts') && !full.endsWith('.spec.ts') ? [full] : [];
        });

    const declarations = walk(SRC).flatMap((file) => {
        const source = readFileSync(file, 'utf8');
        const found: { file: string; processId: string; action: string }[] = [];
        const pattern = /@RequiresProcess\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(source))) {
            found.push({ file: file.slice(SRC.length + 1), processId: match[1], action: match[2] });
        }
        return found;
    });

    const catalog = new Map(DEFAULT_PROCESS_CATALOG.map((p) => [p.id, p]));

    it('finds the declarations to check', () => {
        // Guards against the walk silently matching nothing and the suite passing
        // vacuously.
        expect(declarations.length).toBeGreaterThan(0);
    });

    it('every declared process exists in the catalog', () => {
        const unknown = declarations.filter((d) => !catalog.has(d.processId));
        expect(unknown).toEqual([]);
    });

    it('every declared action is supported by its process', () => {
        const unsupported = declarations.filter((d) => {
            const process = catalog.get(d.processId);
            return process ? !process.actions.includes(d.action as never) : false;
        });
        expect(unsupported).toEqual([]);
    });
});
