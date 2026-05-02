import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

function loadLogic() {
    const code = readFileSync('modules/language.js', 'utf8');
    const sandbox = { setTimeout };
    vm.runInNewContext(code, sandbox);
    return sandbox.LapisLanguageLogic;
}

describe('language vocabulary learning module', () => {
    it('initializes ten English-only mock words with difficulty and phonetic data', () => {
        const logic = loadLogic();

        expect(logic.MOCK_WORDS).toHaveLength(10);
        expect(logic.MOCK_WORDS.every(item =>
            item.word && [1, 2, 3].includes(item.difficulty) && item.phonetic
        )).toBe(true);
    });

    it('sorts vocabulary by difficulty first and word alphabetically second', () => {
        const logic = loadLogic();
        const sorted = logic.sortVocabulary([
            { word: 'zebra', difficulty: 2 },
            { word: 'apple', difficulty: 1 },
            { word: 'bridge', difficulty: 1 },
        ]);

        expect(sorted.map(item => item.word)).toEqual(['apple', 'bridge', 'zebra']);
    });

    it('builds short and long word hints with first and conditional last letters', () => {
        const logic = loadLogic();

        expect(logic.buildHint('apple')).toBe('a _ _ _ _');
        expect(logic.buildHint('journey')).toBe('j _ _ _ _ _ y');
    });

    it('tracks unique achievements and reveals answers after three failures', () => {
        const logic = loadLogic();
        const counts = logic.achievementCounts(logic.MOCK_WORDS, ['apple', 'apple', 'horizon']);

        expect(counts.total).toBe(2);
        expect(counts.byDifficulty[1]).toBe(1);
        expect(counts.byDifficulty[3]).toBe(1);
        expect(logic.shouldShowAnswer(2)).toBe(false);
        expect(logic.shouldShowAnswer(3)).toBe(true);
    });

    it('wires the single-page HTML module to the language learning component', () => {
        const html = readFileSync('language.html', 'utf8');
        const js = readFileSync('modules/language.js', 'utf8');

        expect(html).toContain('./modules/language.js');
        expect(html).toContain('language-learning-view');
        expect(js).toContain('Add to Notes');
        expect(js).toContain('Show Answer');
        expect(js).toContain('Mastered');
        expect(js).toContain('filteredVocabulary');
    });
});
