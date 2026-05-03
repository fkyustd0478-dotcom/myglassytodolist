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

    function createLanguageLearningState(Vue, options = {}) {
        const { ref, computed, watch } = Vue;
        const savedProgress = readProgress();
        const vocabulary = ref(Data.sortVocabulary(options.words || Data.MOCK_WORDS));
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
        });

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
        const canGoNext = computed(() =>
            ['correct', 'revealed'].includes(currentState.value.feedback) &&
            deckIndex.value < studyDeck.value.length - 1
        );
        const deckFinished = computed(() =>
            studyDeck.value.length > 0 &&
            deckIndex.value >= studyDeck.value.length - 1 &&
            ['correct', 'revealed'].includes(currentState.value.feedback)
        );
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
        }

        function updateCurrentState(patch) {
            const word = currentWord.value?.word;
            if (!word) return;
            cardStates.value = {
                ...cardStates.value,
                [word]: { ...currentState.value, ...patch },
            };
        }

        function dealDeck(motion = 'refill') {
            const limit = clampDeckSize(settings.value.deckSize);
            settings.value = { ...settings.value, deckSize: limit };
            studyDeck.value = shuffleWords(eligibleWords.value).slice(0, limit);
            deckIndex.value = 0;
            deckCycle.value += 1;
            deckMotion.value = motion;
            setTimeout(() => { deckMotion.value = ''; }, 320);
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

        return {
            vocabulary,
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
            followingWords,
            errorWords,
            masteredWords,
            activeNoteWords,
            achievements,
            dealDeck,
            nextCard,
            previousCard,
            addToNotes,
            submitAnswer,
            showAnswer,
            markMastered,
            setDifficultyCap,
            setDeckSize,
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
