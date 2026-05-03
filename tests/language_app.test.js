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
        expect(logic.maskWordInExample('to peel an apple', 'apple')).toBe('to peel an a _ _ _ _');
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
        expect(data.partOfSpeechLabel('noun', 'zh')).toBe('名詞');
        expect(data.partOfSpeechLabel('adj.', 'en')).toBe('Adjective');
    });

    it('renders answer highlights and persists language progress helpers', () => {
        const { logic } = loadModules();
        const saved = [];
        const sandbox = {
            setTimeout,
            Math,
            encodeURIComponent,
            localStorage: {
                getItem: () => JSON.stringify({ completed: ['apple', 'apple'], following: ['horizon'] }),
                setItem: (_key, value) => saved.push(value),
            },
        };
        vm.runInNewContext(readFileSync('modules/language_data.js', 'utf8'), sandbox);
        vm.runInNewContext(readFileSync('modules/language_logic.js', 'utf8'), sandbox);

        expect(logic.exampleHtml('to peel an apple', 'apple', '')).toContain('a _ _ _ _');
        expect(logic.exampleHtml('to peel an apple', 'apple', 'correct')).toContain('is-correct');
        expect(logic.exampleHtml('to peel an apple', 'apple', 'revealed')).toContain('is-revealed');
        expect(sandbox.LapisLanguageLogic.readProgress().completed).toEqual(['apple', 'apple']);
        sandbox.LapisLanguageLogic.saveProgress({ completed: ['apple'], errors: ['river'] });
        expect(saved[0]).toContain('"errors":["river"]');
    });

    it('wires the single-page HTML to Swiper, Fuse, split modules, and settings navigation', () => {
        const html = readFileSync('language.html', 'utf8');
        const view = readFileSync('modules/language_view.js', 'utf8');
        const logic = readFileSync('modules/language_logic.js', 'utf8');

        expect(html).toContain('swiper-bundle.min.js');
        expect(html).toContain('fuse.js@7.0.0');
        expect(html).toContain('./modules/language_data.js');
        expect(html).toContain('./modules/language_logic.js');
        expect(html).toContain('./modules/language_view.js');
        expect(html).toContain("activeTab = 'settings'");
        expect(view).toContain('new global.Swiper');
        expect(view).toContain("effect: 'cards'");
        expect(view).toContain('language-card-swiper');
        expect(view).toContain('new Audio');
        expect(view).not.toContain('setLanguage');
        expect(logic).toContain('global.Fuse');
        expect(logic).toContain('vocabDifficulty');
        expect(logic).toContain('vocabLetter');
        expect(logic).toContain('noteList');
        expect(logic).toContain('groupByDifficultyAndLetter');
        expect(view).toContain('setDifficultyCap');
        expect(view).toContain('setDeckSize');
        expect(readFileSync('modules/language_data.js', 'utf8')).toContain('dictvoice?audio=');
        expect(view).toContain('v-html="exampleHtml(currentWord)"');
        expect(view).toContain('volume-2');
        expect(view).toContain('external-link');
        expect(view).toContain('language-native-select');
        expect(html).toContain('language-study-card.glass');
        expect(html).toContain('theme-light-mode .language-study-card.glass');
        expect(html).toContain('background: #ffffff !important');
        expect(html).toContain('background: #000000 !important');
        expect(view).toContain('currentWord.example_zh');
        expect(view).toContain('partLabel(currentWord) }} {{ currentWord.chinese_meaning');
    });

    it('wires language achievements into stats and settings visibility', () => {
        const statsHtml = readFileSync('index.html', 'utf8');
        const stats = readFileSync('modules/index.js', 'utf8');
        const settingHtml = readFileSync('setting.html', 'utf8');
        const setting = readFileSync('modules/setting.js', 'utf8');
        const nav = readFileSync('js/nav.js', 'utf8');

        expect(statsHtml).toContain('./modules/language_data.js');
        expect(statsHtml).toContain('showLanguageStats');
        expect(statsHtml).toContain('languageAchievements.total');
        expect(statsHtml).toContain('languageLevelSummary');
        expect(stats).toContain('lapis_language_progress');
        expect(stats).toContain('function _languageAchievements');
        expect(stats).toContain('showLanguageStats');
        expect(settingHtml).toContain('settings.showLanguageStats');
        expect(setting).toContain('showLanguageStats: true');
        expect(setting).toContain('showLanguageStatsLabel');
        expect(setting).toContain('navSettings.showLanguageStats');
        expect(nav).toContain('showLanguageStats: true');
    });
});
