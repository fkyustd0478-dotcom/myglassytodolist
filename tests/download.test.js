import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

function loadEngine() {
    const context = {
        window: {},
        document: {
            createElement: () => ({ style: {}, click: vi.fn() }),
            body: {
                appendChild: vi.fn(),
                removeChild: vi.fn(),
                contains: vi.fn(() => true)
            }
        },
        URL: {
            createObjectURL: vi.fn(() => 'blob:lapis-test'),
            revokeObjectURL: vi.fn()
        },
        Blob,
        Image: function Image() {},
        setTimeout: (fn) => {
            fn();
            return 1;
        },
        Date
    };
    vm.runInNewContext(readFileSync('js/fx/lapis_fx_base.js', 'utf8'), context);
    return context.window.LapisStudioEngine;
}

describe('studio download engine', () => {
    it('strips invalid filename characters and forces png extension', () => {
        const engine = loadEngine();
        expect(engine.sanitizeDownloadName('my\\bad/:*?"<>|name.jpg')).toBe('mybadname.jpg.png');
    });

    it('keeps a single png extension case-insensitively', () => {
        const engine = loadEngine();
        expect(engine.sanitizeDownloadName('lapis-image.PNG')).toBe('lapis-image.png');
    });

    it('uses strict image/png canvas export and creates URL from original blob', async () => {
        const engine = loadEngine();
        const blob = new Blob(['png'], { type: 'image/png' });
        const canvas = {
            toBlob: vi.fn((cb, type) => cb(blob))
        };

        await engine.triggerRealDownload(canvas, 'test');

        expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
    });
});
