'use strict';

(function (global) {
    const Data = global.LapisLanguageData;

    function buildHint(word) {
        const text = String(word || '');
        if (text.length < 3) return text.split('').map(() => '_').join(' ');
        return text.split('').map((char, index) => {
            if (index === 0) return char;
            if (text.length > 6 && index === text.length - 1) return char;
            return '_';
        }).join(' ');
    }

    function escapeRegExp(text) {
        return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function maskWordInExample(example, word) {
        const text = String(example || '');
        const target = String(word || '').trim();
        if (!target) return text;
        return text.replace(new RegExp(`\\b${escapeRegExp(target)}\\b`, 'gi'), () => buildHint(target));
    }

    function exampleHtml(example, word, feedback) {
        const text = String(example || '');
        const target = String(word || '').trim();
        if (!target) return escapeHtml(text);
        if (!['correct', 'revealed'].includes(feedback)) {
            return escapeHtml(maskWordInExample(text, target));
        }
        const cls = feedback === 'correct' ? 'is-correct' : 'is-revealed';
        return escapeHtml(text).replace(
            new RegExp(`\\b${escapeRegExp(escapeHtml(target))}\\b`, 'gi'),
            match => `<span class="language-card-answer ${cls}">${match}</span>`
        );
    }

    function normalizeAnswer(value) {
        return String(value || '').trim().toLowerCase();
    }

    function addUnique(list, word) {
        return list.includes(word) ? list : [...list, word];
    }

    function removeWord(list, word) {
        return list.filter(item => item !== word);
    }

    function shouldShowAnswer(attempts) {
        return attempts >= 3;
    }

    function clampDeckSize(value) {
        const numeric = Number(value) || 10;
        return Math.max(5, Math.min(100, Math.round(numeric / 5) * 5));
    }

    function shuffleWords(words) {
        return [...words].sort(() => Math.random() - 0.5);
    }

    function searchVocabulary(words, query) {
        const normalized = normalizeAnswer(query);
        if (!normalized) return Data.sortVocabulary(words);
        if (global.Fuse) {
            const fuse = new global.Fuse(words, {
                keys: ['word', 'example_en', 'example_zh', 'chinese_meaning', 'part_of_speech'],
                threshold: 0.35,
                ignoreLocation: true,
            });
            return Data.sortVocabulary(fuse.search(normalized).map(result => result.item));
        }
        return Data.sortVocabulary(words.filter(item =>
            item.word.toLowerCase().includes(normalized) ||
            item.example_en.toLowerCase().includes(normalized) ||
            item.example_zh.includes(query) ||
            item.chinese_meaning.includes(query)
        ));
    }

    function groupByDifficultyAndLetter(words) {
        return Data.DIFFICULTIES.map(difficulty => {
            const levelWords = words.filter(item => item.difficulty === difficulty);
            const letters = [...new Set(levelWords.map(item => Data.firstLetter(item.word)).filter(Boolean))].sort();
            return {
                difficulty,
                letters: letters.map(letter => ({
                    letter,
                    words: levelWords.filter(item => Data.firstLetter(item.word) === letter),
                })),
            };
        }).filter(group => group.letters.length);
    }

    function achievementCounts(words, completed) {
        const unique = [...new Set(completed)];
        return {
            total: unique.length,
            byDifficulty: Data.DIFFICULTIES.reduce((acc, level) => {
                acc[level] = unique.filter(word =>
                    words.find(item => item.word === word && item.difficulty === level)
                ).length;
                return acc;
            }, {}),
        };
    }

    function _emptyProgress() {
        return { completed: [], following: [], errors: [], mastered: [] };
    }

    function readProgress() {
        try {
            const raw = JSON.parse(global.localStorage?.getItem('lapis_language_progress') || '{}');
            return {
                completed: Array.isArray(raw.completed) ? raw.completed : [],
                following: Array.isArray(raw.following) ? raw.following : [],
                errors: Array.isArray(raw.errors) ? raw.errors : [],
                mastered: Array.isArray(raw.mastered) ? raw.mastered : [],
            };
        } catch (_) {
            return _emptyProgress();
        }
    }

    function saveProgress(progress) {
        try {
            global.localStorage?.setItem('lapis_language_progress', JSON.stringify({
                completed: progress.completed || [],
                following: progress.following || [],
                errors: progress.errors || [],
                mastered: progress.mastered || [],
            }));
        } catch (_) {}
    }

    function readStudyMode() {
        try {
            const v = global.localStorage?.getItem('lapis_lang_study_mode');
            return v === 'learn' ? 'learn' : 'quiz';
        } catch (_) { return 'quiz'; }
    }

    function saveStudyMode(mode) {
        try { global.localStorage?.setItem('lapis_lang_study_mode', mode); } catch (_) {}
    }

    function createLanguageLearningState(Vue, options = {}) {
        const { ref, computed, watch } = Vue;
        const savedProgress = readProgress();
        const vocabulary = ref(options.words && options.words.length
            ? Data.sortVocabulary(options.words)
            : []);
        const searchQuery = ref('');
        const vocabDifficulty = ref('all');
        const vocabLetter = ref('all');
        const noteList = ref('following');
        const deckIndex = ref(0);
        const deckCycle = ref(0);
        const deckMotion = ref('');
        const studyDeck = ref([]);
        const cardStates = ref({});
        const following = ref(savedProgress.following);
        const errors = ref(savedProgress.errors);
        const mastered = ref(savedProgress.mastered);
        const completed = ref(savedProgress.completed);
        const settings = ref({
            difficultyCap: 'C2',
            deckSize: 10,
            visibleStack: 7,
            studyMode: readStudyMode(),
        });

        const isLoadingVocab = ref(false);
        const isLoadingDeck  = ref(false);
        const indexEntries   = ref([]); // [{w, d, f}, ...]
        const _loadedKeys    = new Set();

        async function _mergeWords(incoming) {
            if (!incoming.length) return;
            const existing = new Set(vocabulary.value.map(w => `${w.difficulty}:${w.word}`));
            const fresh = incoming.filter(w => !existing.has(`${w.difficulty}:${w.word}`));
            if (fresh.length) vocabulary.value = Data.sortVocabulary([...vocabulary.value, ...fresh]);
        }

        async function loadVocabFile(difficulty, letter) {
            const key = `${Data.normalizeDifficulty(difficulty)}:${String(letter || '').toLowerCase()}`;
            if (_loadedKeys.has(key)) return;
            _loadedKeys.add(key);
            try {
                const words = await Data.fetchVocabularyFile(difficulty, letter);
                _mergeWords(words);
            } catch (_) {}
        }

        async function loadIndex() {
            try {
                const entries = await Data.fetchIndexFile();
                indexEntries.value = Array.isArray(entries) ? entries : [];
            } catch (_) {}
        }

        async function loadDifficultyFiles(difficulty) {
            const diff = Data.normalizeDifficulty(difficulty);
            if (!diff || !Data.DIFFICULTIES.includes(diff)) return;
            isLoadingVocab.value = true;
            await Promise.all('abcdefghijklmnopqrstuvwxyz'.split('').map(l => loadVocabFile(diff, l)));
            isLoadingVocab.value = false;
        }

        const eligibleWords = computed(() =>
            Data.wordsUpToDifficulty(vocabulary.value, settings.value.difficultyCap)
                .filter(item => !mastered.value.includes(item.word))
        );
        const vocabularyLetters = computed(() =>
            [...new Set(vocabulary.value
                .filter(item => vocabDifficulty.value === 'all' || item.difficulty === vocabDifficulty.value)
                .map(item => Data.firstLetter(item.word))
                .filter(Boolean))]
                .sort()
        );
        const filteredVocabulary = computed(() => {
            const searched = searchVocabulary(vocabulary.value, searchQuery.value);
            return searched.filter(item =>
                (vocabDifficulty.value === 'all' || item.difficulty === vocabDifficulty.value) &&
                (vocabLetter.value === 'all' || Data.firstLetter(item.word) === vocabLetter.value)
            );
        });
        const vocabularyGroups = computed(() => groupByDifficultyAndLetter(filteredVocabulary.value));
        const currentWord = computed(() => studyDeck.value[deckIndex.value] || null);
        const visibleStackCards = computed(() =>
            studyDeck.value.slice(deckIndex.value, deckIndex.value + settings.value.visibleStack)
        );
        const currentState = computed(() => {
            const word = currentWord.value?.word;
            return word ? (cardStates.value[word] || { answer: '', attempts: 0, feedback: 'idle' }) : { answer: '', attempts: 0, feedback: 'idle' };
        });
        const typedAnswer = computed({
            get() { return currentState.value.answer; },
            set(value) { updateCurrentState({ answer: value }); },
        });
        const hintText = computed(() => currentWord.value ? buildHint(currentWord.value.word) : '');
        const canShowAnswer = computed(() =>
            shouldShowAnswer(currentState.value.attempts) && !['correct', 'revealed'].includes(currentState.value.feedback)
        );
        const canGoPrevious = computed(() => deckIndex.value > 0);
        const isLearningMode = computed(() => settings.value.studyMode === 'learn');
        const canGoNext = computed(() => {
            if (isLearningMode.value) return deckIndex.value < studyDeck.value.length - 1;
            return ['correct', 'revealed'].includes(currentState.value.feedback) &&
                deckIndex.value < studyDeck.value.length - 1;
        });
        const deckFinished = computed(() => {
            if (studyDeck.value.length === 0) return false;
            if (isLearningMode.value) return deckIndex.value >= studyDeck.value.length - 1;
            return deckIndex.value >= studyDeck.value.length - 1 &&
                ['correct', 'revealed'].includes(currentState.value.feedback);
        });
        const followingWords = computed(() => following.value
            .map(word => vocabulary.value.find(item => item.word === word))
            .filter(Boolean));
        const errorWords = computed(() => errors.value
            .map(word => vocabulary.value.find(item => item.word === word))
            .filter(Boolean));
        const masteredWords = computed(() => mastered.value
            .map(word => vocabulary.value.find(item => item.word === word))
            .filter(Boolean));
        const activeNoteWords = computed(() => {
            if (noteList.value === 'errors') return errorWords.value;
            if (noteList.value === 'mastered') return masteredWords.value;
            return followingWords.value;
        });
        const achievements = computed(() => achievementCounts(vocabulary.value, completed.value));

        if (watch) {
            watch([completed, following, errors, mastered], () => {
                saveProgress({
                    completed: completed.value,
                    following: following.value,
                    errors: errors.value,
                    mastered: mastered.value,
                });
            }, { deep: true });
            watch(vocabDifficulty, (diff) => {
                if (diff && diff !== 'all') loadDifficultyFiles(diff);
            });
            watch(() => settings.value.difficultyCap, (cap) => {
                if (cap) loadDifficultyFiles(cap);
            });
        }

        function updateCurrentState(patch) {
            const word = currentWord.value?.word;
            if (!word) return;
            cardStates.value = {
                ...cardStates.value,
                [word]: { ...currentState.value, ...patch },
            };
        }

        async function dealDeck(motion = 'refill') {
            const limit = clampDeckSize(settings.value.deckSize);
            settings.value = { ...settings.value, deckSize: limit };

            // Step 1 — ensure index is loaded
            if (indexEntries.value.length === 0) await loadIndex();

            // Step 2 — filter index by difficulty cap and mastered list
            const capRank = Data.difficultyRank(settings.value.difficultyCap);
            const available = indexEntries.value.filter(e =>
                Data.difficultyRank(e.d) <= capRank && !mastered.value.includes(e.w)
            );

            const picked = [...available].sort(() => Math.random() - 0.5).slice(0, limit);

            if (!picked.length) {
                studyDeck.value = [];
                deckIndex.value = 0;
                deckCycle.value += 1;
                deckMotion.value = motion;
                setTimeout(() => { deckMotion.value = ''; }, 320);
                return;
            }

            isLoadingDeck.value = true;

            // Step 3 — pre-fetch detail files in parallel (cache shared with notebook view)
            const results = await Promise.all(picked.map(async entry => {
                try {
                    const words = await Data.fetchVocabularyFile(entry.d, entry.f);
                    return words.find(w => w.word === entry.w) || null;
                } catch (_) { return null; }
            }));

            const validWords = results.filter(Boolean);

            // Step 4 — merge into vocabulary for notes/mastered lookups
            _mergeWords(validWords);

            studyDeck.value = validWords;
            deckIndex.value = 0;
            deckCycle.value += 1;
            deckMotion.value = motion;
            setTimeout(() => { deckMotion.value = ''; }, 320);

            isLoadingDeck.value = false;
        }

        function nextCard() {
            if (!canGoNext.value) return;
            deckIndex.value += 1;
            deckMotion.value = 'next';
            setTimeout(() => { deckMotion.value = ''; }, 240);
        }

        function previousCard() {
            if (!canGoPrevious.value) return;
            deckIndex.value -= 1;
            deckMotion.value = 'previous';
            setTimeout(() => { deckMotion.value = ''; }, 240);
        }

        function addToNotes() {
            if (!currentWord.value) return;
            following.value = addUnique(following.value, currentWord.value.word);
        }

        function addCurrentError() {
            if (!currentWord.value) return;
            errors.value = addUnique(errors.value, currentWord.value.word);
        }

        function submitAnswer() {
            if (!currentWord.value || ['correct', 'revealed'].includes(currentState.value.feedback)) return;
            if (normalizeAnswer(typedAnswer.value) === currentWord.value.word.toLowerCase()) {
                updateCurrentState({ feedback: 'correct' });
                completed.value = addUnique(completed.value, currentWord.value.word);
                return;
            }
            const attempts = currentState.value.attempts + 1;
            updateCurrentState({ attempts, feedback: 'incorrect' });
            if (attempts >= 3) addCurrentError();
        }

        function showAnswer() {
            if (!currentWord.value) return;
            updateCurrentState({ feedback: 'revealed' });
            addCurrentError();
        }

        function markMastered(word) {
            mastered.value = addUnique(mastered.value, word);
            following.value = removeWord(following.value, word);
            errors.value = removeWord(errors.value, word);
        }

        function setDifficultyCap(difficultyCap) {
            settings.value = { ...settings.value, difficultyCap };
            dealDeck('refill');
        }

        function setDeckSize(value) {
            settings.value = { ...settings.value, deckSize: clampDeckSize(value) };
            dealDeck('refill');
        }

        function setStudyMode(mode) {
            settings.value = { ...settings.value, studyMode: mode === 'learn' ? 'learn' : 'quiz' };
            saveStudyMode(settings.value.studyMode);
        }

        return {
            vocabulary,
            isLoadingVocab,
            isLoadingDeck,
            indexEntries,
            searchQuery,
            vocabDifficulty,
            vocabLetter,
            noteList,
            studyDeck,
            deckIndex,
            deckCycle,
            deckMotion,
            cardStates,
            following,
            errors,
            mastered,
            completed,
            settings,
            eligibleWords,
            vocabularyLetters,
            filteredVocabulary,
            vocabularyGroups,
            currentWord,
            visibleStackCards,
            currentState,
            typedAnswer,
            hintText,
            canShowAnswer,
            canGoPrevious,
            canGoNext,
            deckFinished,
            isLearningMode,
            followingWords,
            errorWords,
            masteredWords,
            activeNoteWords,
            achievements,
            dealDeck,
            nextCard,
            previousCard,
            addToNotes,
            addCurrentError,
            submitAnswer,
            showAnswer,
            markMastered,
            setDifficultyCap,
            setDeckSize,
            setStudyMode,
            loadIndex,
            loadDifficultyFiles,
        };
    }

    global.LapisLanguageLogic = {
        buildHint,
        exampleHtml,
        maskWordInExample,
        normalizeAnswer,
        addUnique,
        removeWord,
        shouldShowAnswer,
        clampDeckSize,
        shuffleWords,
        searchVocabulary,
        groupByDifficultyAndLetter,
        achievementCounts,
        readProgress,
        saveProgress,
        createLanguageLearningState,
    };
})(typeof window !== 'undefined' ? window : globalThis);
