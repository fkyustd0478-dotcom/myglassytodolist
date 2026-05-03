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

    function createLanguageLearningState(Vue, options = {}) {
        const { ref, computed } = Vue;
        const vocabulary = ref(Data.sortVocabulary(options.words || Data.MOCK_WORDS));
        const searchQuery = ref('');
        const deckIndex = ref(0);
        const deckCycle = ref(0);
        const deckMotion = ref('');
        const studyDeck = ref([]);
        const cardStates = ref({});
        const following = ref([]);
        const errors = ref([]);
        const mastered = ref([]);
        const completed = ref([]);
        const settings = ref({
            difficultyCap: 'C2',
            deckSize: 10,
            visibleStack: 7,
        });

        const eligibleWords = computed(() =>
            Data.wordsUpToDifficulty(vocabulary.value, settings.value.difficultyCap)
                .filter(item => !mastered.value.includes(item.word))
        );
        const filteredVocabulary = computed(() => {
            const query = normalizeAnswer(searchQuery.value);
            return Data.sortVocabulary(vocabulary.value.filter(item =>
                !query ||
                item.word.toLowerCase().includes(query) ||
                item.example_en.toLowerCase().includes(query) ||
                item.example_zh.includes(query)
            ));
        });
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
        const achievements = computed(() => achievementCounts(vocabulary.value, completed.value));

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
            filteredVocabulary,
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
        normalizeAnswer,
        addUnique,
        removeWord,
        shouldShowAnswer,
        clampDeckSize,
        shuffleWords,
        achievementCounts,
        createLanguageLearningState,
    };
})(typeof window !== 'undefined' ? window : globalThis);
