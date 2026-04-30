import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

function loadEngine(overrides = {}) {
    const context = {
        window: {},
        document: {
            createElement: () => ({
                style: {},
                setAttribute: vi.fn(),
                click: vi.fn()
            }),
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
        Date,
        ...overrides
    };
    vm.runInNewContext(readFileSync('js/fx/lapis_fx_base.js', 'utf8'), context);
    return { context, engine: context.window.LapisStudioEngine };
}

describe('studio download engine', () => {
    it('sanitizes invalid filename characters and forces png extension', () => {
        const { engine } = loadEngine();

        expect(engine.sanitizeDownloadName('my\\bad/:*?"<>|name')).toBe('my_bad________name.png');
    });

    it('keeps an existing png extension', () => {
        const { engine } = loadEngine();

        expect(engine.sanitizeDownloadName('lapis-image.PNG')).toBe('lapis-image.PNG');
    });

    it('writes image/png blob to a provided file handle', async () => {
        const { context, engine } = loadEngine();
        const blob = new Blob(['png'], { type: 'image/png' });
        const write = vi.fn();
        const close = vi.fn();
        const canvas = {
            toBlob: vi.fn((cb, type) => cb(blob))
        };
        const fileHandle = {
            createWritable: vi.fn(async () => ({ write, close }))
        };

        await engine.triggerRealDownload(canvas, 'lapis-image', fileHandle);

        expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
        expect(write).toHaveBeenCalledWith(blob);
        expect(close).toHaveBeenCalled();
        expect(context.URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('falls back to legacy blob download when no file handle is available', async () => {
        const { context, engine } = loadEngine();
        const blob = new Blob(['png'], { type: 'image/png' });
        const canvas = {
            toBlob: vi.fn((cb, type) => cb(blob))
        };

        await engine.triggerRealDownload(canvas, 'lapis-image');

        expect(context.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
        expect(context.document.body.appendChild).toHaveBeenCalled();
        expect(context.URL.revokeObjectURL).toHaveBeenCalledWith('blob:lapis-test');
    });
});
