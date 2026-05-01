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

    it('rehydrates todo nav icons after list switching', () => {
        const js = readFileSync('modules/todo.js', 'utf8');

        expect(js).toContain('watch(currentListId, () => {');
        expect(js).toMatch(/watch\(currentListId,[\s\S]*lucide\.createIcons\(\)/);
    });

    it('shows visible year controls in shift month picker', () => {
        const html = readFileSync('shift.html', 'utf8');

        expect(html).toContain("updateJumpDate('year', jumpPicker.year - 1)");
        expect(html).toContain("updateJumpDate('year', jumpPicker.year + 1)");
        expect(html).toContain('&lt;');
        expect(html).toContain('&gt;');
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

    it('labels Google authentication clearly in Settings', () => {
        const html = readFileSync('setting.html', 'utf8');
        const css = readFileSync('css/lapis_shared_style.css', 'utf8');

        expect(html).toContain('Login with Google');
        expect(html).toContain('google-g-logo');
        expect(css).toContain('.google-g-logo');
    });
});
