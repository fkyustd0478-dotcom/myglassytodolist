import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('static UI structure', () => {
    it('keeps todo new task as a semantic static button', () => {
        const html = readFileSync('todo.html', 'utf8');

        expect(html).toContain('type="button"');
        expect(html).toContain('@click="startAdding"');
        expect(html).toContain('{{ t.newTask }}');
        expect(html).toContain('data-lucide="plus"');
    });

    it('keeps shift quick tag popup compact and calendar scrollable', () => {
        const html = readFileSync('shift.html', 'utf8');
        const css = readFileSync('css/shift_style.css', 'utf8');

        expect(html).toContain("'quick-tags-open': activeQuickTagCategory");
        expect(css).toContain('.calendar-container.quick-tags-open');
        expect(css).toContain('max-height: 96px');
        expect(css).toContain('min-height: 540px');
    });

    it('routes label delete actions through confirmation', () => {
        const html = readFileSync('shift.html', 'utf8');

        expect(html).toContain("confirmDeleteTag('shift', tag.id)");
        expect(html).toContain("confirmDeleteTag('other', tag.id)");
        expect(html).toContain("confirmDeleteTag('pay', job.id)");
    });
});
