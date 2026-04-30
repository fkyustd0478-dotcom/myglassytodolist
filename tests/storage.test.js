import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

function loadStorageContext() {
    const store = {};
    const context = {
        window: {},
        store,
        indexedDB: { open: () => ({}) },
        localStorage: {
            getItem: (key) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
            setItem: (key, value) => { store[key] = value; }
        }
    };
    const source = readFileSync('js/storage.js', 'utf8') + `
        window.__LapisStorage = LapisStorage;
        window.__StorageProvider = StorageProvider;
    `;
    vm.runInNewContext(source, context);
    return context;
}

describe('storage abstraction', () => {
    it('reads fallback values for missing keys', () => {
        const context = loadStorageContext();
        expect(context.window.__LapisStorage.get('missing', { ok: true })).toEqual({ ok: true });
    });

    it('writes and reads todo data through StorageProvider', () => {
        const context = loadStorageContext();
        context.window.__StorageProvider.saveData({ todos: [{ id: 'a' }] });
        expect(JSON.parse(context.store.todo_data)).toEqual({ todos: [{ id: 'a' }] });
        expect(context.window.__StorageProvider.getTodoData()).toEqual({ todos: [{ id: 'a' }] });
    });

    it('writes and reads shift data through StorageProvider', () => {
        const context = loadStorageContext();
        context.window.__StorageProvider.saveShiftData({ '2026-05-01': { shiftIds: ['early'] } });
        expect(context.window.__StorageProvider.getShiftData()).toEqual({
            '2026-05-01': { shiftIds: ['early'] }
        });
    });

    it('keeps sync as a local-first no-op placeholder', async () => {
        const context = loadStorageContext();
        await expect(context.window.__LapisStorage.sync()).resolves.toEqual({
            mode: 'local-first',
            status: 'noop'
        });
    });
});
