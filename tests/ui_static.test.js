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

    it('defines shared glass panels for dropdowns modals and Studio FX drawer', () => {
        const shared = readFileSync('css/lapis_shared_style.css', 'utf8');
        const studio = readFileSync('studio.html', 'utf8');

        expect(shared).toContain('.glass-panel');
        expect(shared).toContain('backdrop-filter: blur(10px)');
        expect(shared).toContain('.lapis-dropdown');
        expect(shared).toContain('.lapis-modal-shell');
        expect(studio).toContain('fx-drawer glass glass-panel');
    });

    it('keeps the index greeting paired with a 24-hour flip clock', () => {
        const html = readFileSync('index.html', 'utf8');
        const js = readFileSync('modules/index.js', 'utf8');

        expect(html).toContain('lapis-flip-clock');
        expect(html).toContain('lapis-flip-card');
        expect(html).toContain('flipDigits');
        expect(js).toContain('const _timeDigits');
        expect(js).toContain("getHours().toString().padStart(2, '0')");
        expect(js).toContain('setInterval(tickFlipClock, 1000)');
    });

    it('opens shift day detail with point-origin morphing animation', () => {
        const html = readFileSync('shift.html', 'utf8');
        const js = readFileSync('modules/shift.js', 'utf8');
        const css = readFileSync('css/shift_style.css', 'utf8');

        expect(html).toContain('handleDayClick(day, $event)');
        expect(html).toContain('name="day-detail-morph"');
        expect(js).toContain('dayDetailOrigin');
        expect(js).toContain('dayDetailMorphStyle');
        expect(css).toContain('@keyframes dayDetailReveal');
        expect(css).toContain('clip-path: circle(0 at var(--morph-x');
    });
});
