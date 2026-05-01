import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

function loadPortability() {
    const store = {};
    const context = {
        window: {},
        store,
        localStorage: {
            getItem: (key) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
            setItem: (key, value) => { store[key] = value; }
        },
        Date,
        Math
    };
    vm.runInNewContext(readFileSync('modules/data_portability.js', 'utf8'), context);
    return { context, api: context.window.LapisDataPortability };
}

describe('data portability', () => {
    it('imports shift txt rows as shift tags with palette colors', () => {
        const { context, api } = loadPortability();

        const result = api.importText('shift', '2026-05-01,早班', { shiftImportKind: 'shift' });
        const settings = JSON.parse(context.store.glassy_shift_settings);
        const data = JSON.parse(context.store.glassy_shift_data);

        expect(result.format).toBe('txt');
        expect(settings.shiftTags[0].name).toBe('早班');
        expect(settings.shiftTags[0].color).toBe('#3b82f6');
        expect(data['2026-05-01'].shiftIds).toContain(settings.shiftTags[0].id);
    });

    it('imports shift txt rows as misc tags when selected', () => {
        const { context, api } = loadPortability();

        api.importText('shift', '2026-05-01,健身', { shiftImportKind: 'misc' });
        const settings = JSON.parse(context.store.glassy_shift_settings);
        const data = JSON.parse(context.store.glassy_shift_data);

        expect(settings.otherTags[0].name).toBe('健身');
        expect(data['2026-05-01'].otherIds).toContain(settings.otherTags[0].id);
    });

    it('imports workout library txt with Chinese names and category path', () => {
        const { context, api } = loadPortability();

        api.importText('workoutLibrary', 'Bench Press,槓鈴臥推,sets,kg,Chest:Triceps');
        const lib = JSON.parse(context.store.lapis_workout_library);

        expect(lib[0].name).toBe('Bench Press');
        expect(lib[0].nameZh).toBe('槓鈴臥推');
        expect(lib[0].type).toBe('sets');
        expect(lib[0].preferredUnit).toBe('kg');
        expect(lib[0].categories).toEqual(['Chest', 'Triceps']);
    });

    it('exports shift txt as one consolidated row per date', () => {
        const { context, api } = loadPortability();
        context.store.glassy_shift_settings = JSON.stringify({
            shiftTags: [{ id: 's1', name: '早班' }],
            otherTags: [{ id: 'o1', name: '健身' }],
            jobs: []
        });
        context.store.glassy_shift_data = JSON.stringify({
            '2026-05-01': { shiftIds: ['s1'], otherIds: ['o1'], payIds: [] }
        });

        expect(api.exportText('shift', 'txt')).toBe('2026-05-01,早班,健身');
    });
});
