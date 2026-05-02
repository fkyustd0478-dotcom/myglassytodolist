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
        const css = readFileSync('css/lapis_studio.css', 'utf8');
        const ui = readFileSync('js/lapis_studio_ui.js', 'utf8');
        const jigsaw = readFileSync('js/fx/lapis_fx_jigsaw.js', 'utf8');

        expect(html).toContain('v-model.number="jigsawGrid"');
        expect(html).toContain('3,4,5,6');
        expect(html).toContain('id="jigsaw-roi-layer"');
        expect(html).toContain('beginJigsawRoiMove');
        expect(html).toContain("beginJigsawRoiResize('se', $event)");
        expect(css).toContain('.jigsaw-roi-box');
        expect(ui).toContain('gridSize: jigsawGrid.value');
        expect(ui).toContain('const jigsawRoi');
        expect(ui).toContain('config.roi = _jigsawRoiPixels(sc.width, sc.height)');
        expect(ui).toContain('function moveJigsawRoi');
        expect(jigsaw).toContain('function _centerRoi');
        expect(jigsaw).toContain('function _renderRoi');
        expect(jigsaw).toContain('config.roi');
    });

    it('uses bezier puzzle piece paths for scattered jigsaw pieces', () => {
        const jigsaw = readFileSync('js/fx/lapis_fx_jigsaw.js', 'utf8');

        expect(jigsaw).toContain('function _piecePath');
        expect(jigsaw).toContain('bezierCurveTo');
        expect(jigsaw).toContain('_piecePath(ctx, -pw / 2, -ph / 2, pw, ph, c, r, cols, rows)');
    });

    it('removes Special FX category from Studio menu', () => {
        const html = readFileSync('studio.html', 'utf8');
        const ui = readFileSync('js/lapis_studio_ui.js', 'utf8');

        expect(html).not.toContain("effectCategory === 'special'");
        expect(html).not.toContain('specialVariants');
        expect(html).not.toContain('glass-fragments');
        expect(html).not.toContain('glass-spiderweb');
        expect(html).not.toContain('glass-smudge');
        expect(ui).not.toContain('specialVariants');
        expect(ui).not.toContain('smudgeConfig');
        expect(ui).not.toContain("effectCategory.value === 'special'");
        expect(ui).not.toContain("specialCat: 'Special'");
        expect(ui).not.toContain("glassFragments: 'Fragments'");
        expect(html).not.toContain('glass-impact');
    });

    it('uses LapisModal for Studio delete and download prompts', () => {
        const html = readFileSync('studio.html', 'utf8');
        const css = readFileSync('css/lapis_studio.css', 'utf8');
        const ui = readFileSync('js/lapis_studio_ui.js', 'utf8');

        expect(html).toContain('id="studio-delete-modal"');
        expect(html).toContain('id="studio-download-modal"');
        expect(html).toContain('lapis-modal-backdrop centered studio-action-modal');
        expect(html).toContain('class="lapis-modal-shell glass-panel studio-confirm-shell"');
        expect(html).toContain('v-model="downloadName"');
        expect(css).toContain('backdrop-filter: blur(10px)');
        expect(ui).toContain("LapisModal.open(id)");
        expect(ui).toContain("LapisModal.init()");
        expect(ui).toContain("downloadName.value = 'lapis-image'");
        expect(ui).toContain('confirmDownloadImage');
        expect(ui).toContain('confirmDeleteImage');
        expect(ui).not.toContain('window.prompt');
        expect(ui).not.toContain('confirm(t.value.confirmDelete)');
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

    it('supports dynamic duo collage slot masking', () => {
        const html = readFileSync('studio.html', 'utf8');
        const ui = readFileSync('js/lapis_studio_ui.js', 'utf8');
        const collage = readFileSync('js/fx/lapis_fx_collage.js', 'utf8');
        const css = readFileSync('css/lapis_studio.css', 'utf8');

        expect(collage).toContain('const DUO_LAYOUTS');
        expect(collage).toContain('async function createDuo');
        expect(collage).toContain('ctx.clip()');
        expect(collage).toContain('ctx.drawImage(img, x, y, dw, dh)');
        expect(ui).toContain('const collageSlots');
        expect(ui).toContain('{ image, maskType: collageLayout.value, scale: 1, offsetX: 0, offsetY: 0, fixed: false }');
        expect(ui).toContain('collageSlots.value = collageSlots.value.map(slot => ({ ...slot, maskType: key }))');
        expect(ui).toContain('LapisFXCollage.createDuo(collageSlots.value, collageLayout.value, { gap: collageGap.value })');
        expect(html).toContain('v-model.number="collageGap"');
        expect(html).toContain('beginCollageSlotDrag');
        expect(html).toContain('toggleCollageFixed');
        expect(css).toContain('.duo-collage-preview');
    });

    it('supports sandbox drag scale and rotate controls', () => {
        const html = readFileSync('studio.html', 'utf8');
        const css = readFileSync('css/lapis_studio.css', 'utf8');
        const ui = readFileSync('js/lapis_studio_ui.js', 'utf8');
        const text = readFileSync('js/fx/lapis_fx_text.js', 'utf8');
        const sticker = readFileSync('js/fx/lapis_fx_sticker.js', 'utf8');

        expect(html).toContain('fx-sandbox-box');
        expect(html).toContain('beginSandboxMove');
        expect(html).toContain('beginSandboxScale');
        expect(html).toContain('beginSandboxRotate');
        expect(ui).toContain('function moveSandbox');
        expect(ui).toContain('function endSandbox');
        expect(ui).toContain('requestAnimationFrame');
        expect(html).toContain("{ 'is-dragging': sandboxDragging }");
        expect(css).toContain('.fx-sandbox-layer.is-dragging .fx-sandbox-box');
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
        expect(manual).toContain('requestAnimationFrame');
        expect(manual).toContain('const dragging = ref(false)');
        expect(manual).toContain('jigsawRoi');
        expect(manual).toContain('pure: true');
        expect(jigsaw).toContain('pure ? 0');
        expect(html).toContain("{ 'is-dragging': jigsawDragging }");
        expect(jigsaw).toContain('function createLayout');
        expect(jigsaw).toContain("case 'explode':   return _jigsawExplode(src, intensity, gridSize, layout)");
        expect(jigsaw).toContain("case 'drift':     return _jigsawDrift(src, intensity, gridSize, layout)");
        expect(jigsaw).toContain("case 'gravity':   return _jigsawGravity(src, intensity, gridSize, layout)");
        expect(jigsaw).toContain("case 'scattered': return _jigsawScattered(src, intensity, gridSize, layout)");
    });
});
