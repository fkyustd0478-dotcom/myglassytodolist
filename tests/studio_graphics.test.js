import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('studio graphics rendering controls', () => {
    it('allows non-uniform special shape cropping', () => {
        const ui = readFileSync('js/lapis_studio_ui.js', 'utf8');
        const base = readFileSync('js/fx/lapis_fx_base.js', 'utf8');

        expect(ui).toContain('setAspectRatio(NaN)');
        expect(base).toContain('ctx.ellipse(w / 2, h / 2, w / 2, h / 2');
        expect(base).toContain('ctx.scale(w * 0.46, h * 0.46)');
    });

    it('passes jigsaw grid size from Studio UI to renderer', () => {
        const html = readFileSync('studio.html', 'utf8');
        const ui = readFileSync('js/lapis_studio_ui.js', 'utf8');

        expect(html).toContain('v-model.number="jigsawGrid"');
        expect(html).toContain('3,4,5,6');
        expect(ui).toContain('gridSize: jigsawGrid.value');
    });

    it('uses bezier puzzle piece paths for scattered jigsaw pieces', () => {
        const jigsaw = readFileSync('js/fx/lapis_fx_jigsaw.js', 'utf8');

        expect(jigsaw).toContain('function _piecePath');
        expect(jigsaw).toContain('bezierCurveTo');
        expect(jigsaw).toContain('_piecePath(ctx, -pw / 2, -ph / 2, pw, ph, c, r, cols, rows)');
    });

    it('scales glass impact hole by intensity', () => {
        const shatter = readFileSync('js/fx/lapis_fx_shatter.js', 'utf8');

        expect(shatter).toContain('holeRadius');
        expect(shatter).toContain('0.018 + 0.035 * Math.min(1, scale)');
    });

    it('exposes text style toggles and local font fallbacks', () => {
        const html = readFileSync('studio.html', 'utf8');
        const css = readFileSync('css/lapis_studio.css', 'utf8');
        const text = readFileSync('js/fx/lapis_fx_text.js', 'utf8');

        expect(html).toContain('textConfig.bold');
        expect(html).toContain('textConfig.italic');
        expect(html).toContain('textConfig.strike');
        expect(html).toContain('KaiTi');
        expect(html).toContain('PMingLiU');
        expect(html).toContain('Death Note');
        expect(html).toContain('Death Note 2');
        expect(css).toContain('assets/fonts/death-note.woff2');
        expect(css).toContain('assets/fonts/death-note2.woff2');
        expect(text).toContain('const weight = bold');
        expect(text).toContain('const style = italic');
        expect(text).toContain('if (strike)');
    });

    it('groups stickers into larger built-in categories', () => {
        const html = readFileSync('studio.html', 'utf8');
        const ui = readFileSync('js/lapis_studio_ui.js', 'utf8');
        const sticker = readFileSync('js/fx/lapis_fx_sticker.js', 'utf8');

        expect(html).toContain('stickerCategoryList');
        expect(ui).toContain("const stickerCategory = ref('emojis')");
        expect(sticker).toContain('const CATEGORIES = {');
        expect(sticker).toContain('emojis:');
        expect(sticker).toContain('deco:');
        expect(sticker).toContain('shapes:');
    });

    it('supports sandbox drag scale and rotate controls', () => {
        const html = readFileSync('studio.html', 'utf8');
        const ui = readFileSync('js/lapis_studio_ui.js', 'utf8');
        const text = readFileSync('js/fx/lapis_fx_text.js', 'utf8');
        const sticker = readFileSync('js/fx/lapis_fx_sticker.js', 'utf8');

        expect(html).toContain('fx-sandbox-box');
        expect(html).toContain('beginSandboxMove');
        expect(html).toContain('beginSandboxScale');
        expect(html).toContain('beginSandboxRotate');
        expect(ui).toContain('function moveSandbox');
        expect(ui).toContain('function endSandbox');
        expect(text).toContain('rotation = 0');
        expect(sticker).toContain('rotation = 0');
    });

    it('supports manual arrange for all jigsaw modes', () => {
        const html = readFileSync('studio.html', 'utf8');
        const ui = readFileSync('js/lapis_studio_ui.js', 'utf8');
        const jigsaw = readFileSync('js/fx/lapis_fx_jigsaw.js', 'utf8');
        const manual = readFileSync('js/lapis_studio_jigsaw_manual.js', 'utf8');

        expect(html).toContain('jigsaw-manual-layer');
        expect(html).toContain('lapis_studio_jigsaw_manual.js');
        expect(html).toContain('toggleJigsawManual');
        expect(ui).toContain('const jigsawManual');
        expect(manual).toContain('function beginDrag');
        expect(manual).toContain('function moveDrag');
        expect(jigsaw).toContain('function createLayout');
        expect(jigsaw).toContain("case 'explode':   return _jigsawExplode(src, intensity, gridSize, layout)");
        expect(jigsaw).toContain("case 'drift':     return _jigsawDrift(src, intensity, gridSize, layout)");
        expect(jigsaw).toContain("case 'gravity':   return _jigsawGravity(src, intensity, gridSize, layout)");
        expect(jigsaw).toContain("case 'scattered': return _jigsawScattered(src, intensity, gridSize, layout)");
    });
});
