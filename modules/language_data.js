'use strict';

(function (global) {
    const DIFFICULTIES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const PARTS_OF_SPEECH = [
        { zh: '名詞', en: 'Noun', code: 'n.', aliases: ['noun', 'n'] },
        { zh: '代名詞', en: 'Pronoun', code: 'pron.', aliases: ['pronoun', 'pron'] },
        { zh: '動詞', en: 'Verb', code: 'v.', aliases: ['verb', 'v'] },
        { zh: '形容詞', en: 'Adjective', code: 'adj.', aliases: ['adjective', 'adj'] },
        { zh: '副詞', en: 'Adverb', code: 'adv.', aliases: ['adverb', 'adv'] },
        { zh: '介系詞', en: 'Preposition', code: 'prep.', aliases: ['preposition', 'prep'] },
        { zh: '連接詞', en: 'Conjunction', code: 'conj.', aliases: ['conjunction', 'conj'] },
        { zh: '感嘆詞', en: 'Interjection', code: 'interj.', aliases: ['interjection', 'interj'] },
        { zh: '及物動詞', en: 'Transitive Verb', code: 'vt.', aliases: ['transitive verb', 'vt'] },
        { zh: '不及物動詞', en: 'Intransitive Verb', code: 'vi.', aliases: ['intransitive verb', 'vi'] },
        { zh: '助動詞', en: 'Auxiliary Verb', code: 'aux.', aliases: ['auxiliary verb', 'aux'] },
        { zh: '限定詞', en: 'Determiner', code: 'det.', aliases: ['determiner', 'det'] },
        { zh: '數詞', en: 'numeral', code: 'num', aliases: ['numeral', 'num'] },
        { zh: '片語', en: 'phrase(s)', code: 'phr.', aliases: ['phrase', 'phrases', 'phr'] },
        { zh: '縮寫', en: 'abbreviation', code: 'abbr.', aliases: ['abbreviation', 'abbr'] },
        { zh: '可數名詞', en: 'Countable noun', code: 'C.', aliases: ['countable noun', 'c'] },
        { zh: '不可數名詞', en: 'Uncountable noun', code: 'u.', aliases: ['uncountable noun', 'u'] },
        { zh: '複數詞', en: 'Plural', code: 'pl.', aliases: ['plural', 'pl'] },
        { zh: '過去式', en: 'Past tense', code: 'pt.', aliases: ['past tense', 'pt'] },
        { zh: '過去分詞', en: 'Past participle', code: 'pp.', aliases: ['past participle', 'pp'] },
    ];
    const MOCK_WORDS = [
        {
            word: 'apple',
            phonetic: '/ˈæp.əl/',
            part_of_speech: 'noun',
            difficulty: 'A1',
            chinese_meaning: '蘋果',
            example_en: 'to peel an apple',
            example_zh: '削蘋果',
            url: 'https://dictionary.cambridge.org/zht/詞典/英語-漢語-繁體/apple',
            error: null,
        },
        {
            word: 'be',
            phonetic: '/biː/',
            part_of_speech: 'verb',
            difficulty: 'A1',
            chinese_meaning: '是',
            example_en: 'Be kind to yourself.',
            example_zh: '善待你自己。',
            url: 'https://dictionary.cambridge.org/zht/詞典/英語-漢語-繁體/be',
            error: null,
        },
        {
            word: 'bridge',
            phonetic: '/brɪdʒ/',
            part_of_speech: 'noun',
            difficulty: 'A2',
            chinese_meaning: '橋',
            example_en: 'We crossed the bridge at sunset.',
            example_zh: '我們在日落時過橋。',
            url: 'https://dictionary.cambridge.org/zht/詞典/英語-漢語-繁體/bridge',
            error: null,
        },
        {
            word: 'candle',
            phonetic: '/ˈkæn.dəl/',
            part_of_speech: 'noun',
            difficulty: 'A2',
            chinese_meaning: '蠟燭',
            example_en: 'The candle burned through the night.',
            example_zh: '蠟燭燃燒了一整晚。',
            url: 'https://dictionary.cambridge.org/zht/詞典/英語-漢語-繁體/candle',
            error: null,
        },
        {
            word: 'diligent',
            phonetic: '/ˈdɪl.ə.dʒənt/',
            part_of_speech: 'adjective',
            difficulty: 'B1',
            chinese_meaning: '勤奮的',
            example_en: 'She is diligent in her studies.',
            example_zh: '她在學業上很勤奮。',
            url: 'https://dictionary.cambridge.org/zht/詞典/英語-漢語-繁體/diligent',
            error: null,
        },
        {
            word: 'ecology',
            phonetic: '/iˈkɑː.lə.dʒi/',
            part_of_speech: 'noun',
            difficulty: 'B1',
            chinese_meaning: '生態學',
            example_en: 'Ecology examines relationships in nature.',
            example_zh: '生態學研究自然界中的關係。',
            url: 'https://dictionary.cambridge.org/zht/詞典/英語-漢語-繁體/ecology',
            error: null,
        },
        {
            word: 'fragment',
            phonetic: '/ˈfræɡ.mənt/',
            part_of_speech: 'noun',
            difficulty: 'B2',
            chinese_meaning: '碎片',
            example_en: 'A fragment of glass lay on the floor.',
            example_zh: '地板上有一片玻璃碎片。',
            url: 'https://dictionary.cambridge.org/zht/詞典/英語-漢語-繁體/fragment',
            error: null,
        },
        {
            word: 'horizon',
            phonetic: '/həˈraɪ.zən/',
            part_of_speech: 'noun',
            difficulty: 'B2',
            chinese_meaning: '地平線',
            example_en: 'The sun sank below the horizon.',
            example_zh: '太陽沉到地平線下。',
            url: 'https://dictionary.cambridge.org/zht/詞典/英語-漢語-繁體/horizon',
            error: null,
        },
        {
            word: 'intricate',
            phonetic: '/ˈɪn.trə.kət/',
            part_of_speech: 'adjective',
            difficulty: 'C1',
            chinese_meaning: '複雜精細的',
            example_en: 'The machine has an intricate design.',
            example_zh: '這台機器有複雜精細的設計。',
            url: 'https://dictionary.cambridge.org/zht/詞典/英語-漢語-繁體/intricate',
            error: null,
        },
        {
            word: 'juxtapose',
            phonetic: '/ˌdʒʌk.stəˈpoʊz/',
            part_of_speech: 'verb',
            difficulty: 'C2',
            chinese_meaning: '並列；並置',
            example_en: 'The article juxtaposes hope and fear.',
            example_zh: '這篇文章並置了希望與恐懼。',
            url: 'https://dictionary.cambridge.org/zht/詞典/英語-漢語-繁體/juxtapose',
            error: null,
        },
    ];

    function difficultyRank(difficulty) {
        const rank = DIFFICULTIES.indexOf(String(difficulty || '').toUpperCase());
        return rank === -1 ? DIFFICULTIES.length : rank;
    }

    function firstLetter(word) {
        return String(word || '').trim().charAt(0).toLowerCase();
    }

    function normalizeWord(item) {
        return {
            word: String(item.word || '').trim(),
            phonetic: item.phonetic || '',
            part_of_speech: item.part_of_speech || '',
            difficulty: String(item.difficulty || 'A1').toUpperCase(),
            chinese_meaning: item.chinese_meaning || '',
            example_en: item.example_en || '',
            example_zh: item.example_zh || '',
            url: item.url || '',
            error: item.error || null,
        };
    }

    function sortVocabulary(words) {
        return [...words]
            .map(normalizeWord)
            .filter(item => item.word)
            .sort((a, b) =>
                (difficultyRank(a.difficulty) - difficultyRank(b.difficulty)) ||
                a.word.localeCompare(b.word)
            );
    }

    function vocabularyPath(difficulty, letter) {
        return `./vocabulary/${difficulty}/${String(letter || '').toLowerCase()}.json`;
    }

    function normalizeDifficulty(d) {
        // Strips suffix like '-Auto' so 'A1-Auto' → 'A1'
        return String(d || '').replace(/-.*$/, '').toUpperCase();
    }

    const _vocabFileCache = new Map(); // key: "A1:a" → Promise<word[]>

    async function fetchVocabularyFile(difficulty, letter) {
        const diff = normalizeDifficulty(difficulty);
        const ltr  = String(letter || '').toLowerCase();
        const key  = `${diff}:${ltr}`;
        if (_vocabFileCache.has(key)) return _vocabFileCache.get(key);
        const promise = fetch(vocabularyPath(diff, ltr))
            .then(res => res.ok ? res.json() : [])
            .then(arr  => arr.map(normalizeWord).filter(w => w.word))
            .catch(() => []);
        _vocabFileCache.set(key, promise);
        return promise;
    }

    function voiceUrl(word) {
        return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`;
    }

    function partOfSpeechLabel(partOfSpeech, lang = 'zh') {
        const normalized = String(partOfSpeech || '').trim().toLowerCase().replace(/\.$/, '');
        const found = PARTS_OF_SPEECH.find(item =>
            item.aliases.includes(normalized) ||
            item.code.toLowerCase().replace(/\.$/, '') === normalized ||
            item.en.toLowerCase() === normalized ||
            item.zh === partOfSpeech
        );
        if (!found) return partOfSpeech || '';
        return lang === 'en' ? found.en : found.zh;
    }

    function wordsUpToDifficulty(words, difficultyCap) {
        const cap = difficultyRank(difficultyCap);
        return sortVocabulary(words).filter(item => difficultyRank(item.difficulty) <= cap);
    }

    async function loadVocabulary(options = {}) {
        const source = options.words && options.words.length ? options.words : MOCK_WORDS;
        return wordsUpToDifficulty(source, options.difficultyCap || 'C2');
    }

    global.LapisLanguageData = {
        DIFFICULTIES,
        PARTS_OF_SPEECH,
        MOCK_WORDS,
        difficultyRank,
        firstLetter,
        normalizeWord,
        sortVocabulary,
        vocabularyPath,
        voiceUrl,
        partOfSpeechLabel,
        wordsUpToDifficulty,
        loadVocabulary,
        normalizeDifficulty,
        fetchVocabularyFile,
    };
})(typeof window !== 'undefined' ? window : globalThis);
