import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

function loadModules() {
    const sandbox = { setTimeout, Math, encodeURIComponent };
    vm.runInNewContext(readFileSync('modules/language_data.js', 'utf8'), sandbox);
    vm.runInNewContext(readFileSync('modules/language_logic.js', 'utf8'), sandbox);
    return {
        data: sandbox.LapisLanguageData,
        logic: sandbox.LapisLanguageLogic,
    };
}

describe('language vocabulary learning module', () => {
    it('initializes mock words in the vocabulary file format', () => {
        const { data } = loadModules();

        expect(data.MOCK_WORDS).toHaveLength(10);
        expect(data.MOCK_WORDS[0]).toMatchObject({
            word: 'apple',
            phonetic: '/ˈæp.əl/',
            part_of_speech: 'noun',
            difficulty: 'A1',
            chinese_meaning: '蘋果',
            example_en: 'to peel an apple',
            example_zh: '削蘋果',
            error: null,
        });
        expect(data.MOCK_WORDS[0].url).toContain('dictionary.cambridge.org');
    });

    it('sorts vocabulary by CEFR difficulty first and word alphabetically second', () => {
        const { data } = loadModules();
        const sorted = data.sortVocabulary([
            { word: 'zebra', difficulty: 'B1' },
            { word: 'bridge', difficulty: 'A1' },
            { word: 'apple', difficulty: 'A1' },
            { word: 'candle', difficulty: 'A2' },
        ]);

        expect(sorted.map(item => item.word)).toEqual(['apple', 'bridge', 'candle', 'zebra']);
    });

    it('builds hints without first or last letters for words under three letters', () => {
        const { logic } = loadModules();

        expect(logic.buildHint('be')).toBe('_ _');
        expect(logic.buildHint('apple')).toBe('a _ _ _ _');
        expect(logic.buildHint('journey')).toBe('j _ _ _ _ _ y');
    });

    it('tracks unique achievements by CEFR level and reveals answers after three failures', () => {
        const { data, logic } = loadModules();
        const counts = logic.achievementCounts(data.MOCK_WORDS, ['apple', 'apple', 'horizon']);

        expect(counts.total).toBe(2);
        expect(counts.byDifficulty.A1).toBe(1);
        expect(counts.byDifficulty.B2).toBe(1);
        expect(logic.shouldShowAnswer(2)).toBe(false);
        expect(logic.shouldShowAnswer(3)).toBe(true);
    });

    it('clamps deck settings and builds future vocabulary paths and voice links', () => {
        const { data, logic } = loadModules();

        expect(logic.clampDeckSize(3)).toBe(5);
        expect(logic.clampDeckSize(102)).toBe(100);
        expect(logic.clampDeckSize(12)).toBe(10);
        expect(data.vocabularyPath('A1', 'A')).toBe('./vocabulary/A1/a.json');
        expect(data.voiceUrl('apple')).toBe('https://dict.youdao.com/dictvoice?audio=apple&type=2');
    });

    it('wires the single-page HTML to split language modules and settings navigation', () => {
        const html = readFileSync('language.html', 'utf8');
        const view = readFileSync('modules/language_view.js', 'utf8');

        expect(html).toContain('./modules/language_data.js');
        expect(html).toContain('./modules/language_logic.js');
        expect(html).toContain('./modules/language_view.js');
        expect(html).toContain("activeTab = 'settings'");
        expect(view).toContain('visibleStackCards');
        expect(view).toContain('setDifficultyCap');
        expect(view).toContain('setDeckSize');
        expect(readFileSync('modules/language_data.js', 'utf8')).toContain('dictvoice?audio=');
        expect(view).toContain('currentWord.example_en');
        expect(view).toContain('currentWord.example_zh');
    });
});
