'use strict';

(function (global) {
    const MOCK_WORDS = [
        { word: 'apple', difficulty: 1, phonetic: '[`aepel]' },
        { word: 'bridge', difficulty: 1, phonetic: '[brIdZ]' },
        { word: 'candle', difficulty: 1, phonetic: '[`kaendl]' },
        { word: 'diligent', difficulty: 2, phonetic: '[`dIlEdZEnt]' },
        { word: 'ecology', difficulty: 2, phonetic: '[I`kalEdZI]' },
        { word: 'fragment', difficulty: 2, phonetic: '[`fraegmEnt]' },
        { word: 'grateful', difficulty: 2, phonetic: '[`gretfEl]' },
        { word: 'horizon', difficulty: 3, phonetic: '[hE`raIzEn]' },
        { word: 'intricate', difficulty: 3, phonetic: '[`IntrEkIt]' },
        { word: 'journey', difficulty: 3, phonetic: '[`dZ3nI]' },
    ];

    function sortVocabulary(words) {
        return [...words].sort((a, b) =>
            (a.difficulty - b.difficulty) || a.word.localeCompare(b.word)
        );
    }

    function buildHint(word) {
        return word.split('').map((char, index) => {
            if (index === 0) return char;
            if (word.length > 6 && index === word.length - 1) return char;
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

    function achievementCounts(words, completed) {
        const unique = [...new Set(completed)];
        return {
            total: unique.length,
            byDifficulty: [1, 2, 3].reduce((acc, level) => {
                acc[level] = unique.filter(word =>
                    words.find(item => item.word === word && item.difficulty === level)
                ).length;
                return acc;
            }, {}),
        };
    }

    function refreshIcons() {
        setTimeout(() => {
            if (global.lucide) global.lucide.createIcons();
        }, 0);
    }

    function createLanguageLearningState(Vue) {
        const { ref, computed } = Vue;
        const vocabulary = ref(sortVocabulary(MOCK_WORDS));
        const searchQuery = ref('');
        const currentWord = ref(null);
        const typedAnswer = ref('');
        const attempts = ref(0);
        const feedback = ref('idle');
        const following = ref([]);
        const errors = ref([]);
        const mastered = ref([]);
        const completed = ref([]);

        const availableWords = computed(() =>
            vocabulary.value.filter(item => !mastered.value.includes(item.word))
        );
        const filteredVocabulary = computed(() => {
            const query = normalizeAnswer(searchQuery.value);
            return sortVocabulary(vocabulary.value.filter(item =>
                !query || item.word.toLowerCase().includes(query)
            ));
        });
        const hintText = computed(() =>
            currentWord.value ? buildHint(currentWord.value.word) : ''
        );
        const canShowAnswer = computed(() =>
            shouldShowAnswer(attempts.value) && !['correct', 'revealed'].includes(feedback.value)
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

        function chooseRandomCard() {
            const pool = availableWords.value;
            currentWord.value = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
            typedAnswer.value = '';
            attempts.value = 0;
            feedback.value = 'idle';
            refreshIcons();
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
            if (!currentWord.value || ['correct', 'revealed'].includes(feedback.value)) return;
            if (normalizeAnswer(typedAnswer.value) === currentWord.value.word.toLowerCase()) {
                feedback.value = 'correct';
                completed.value = addUnique(completed.value, currentWord.value.word);
                return;
            }
            attempts.value += 1;
            feedback.value = 'incorrect';
            if (attempts.value >= 3) addCurrentError();
        }

        function showAnswer() {
            if (!currentWord.value) return;
            feedback.value = 'revealed';
            addCurrentError();
        }

        function markMastered(word) {
            mastered.value = addUnique(mastered.value, word);
            following.value = removeWord(following.value, word);
            errors.value = removeWord(errors.value, word);
            if (currentWord.value && currentWord.value.word === word) chooseRandomCard();
        }

        return {
            vocabulary,
            searchQuery,
            currentWord,
            typedAnswer,
            attempts,
            feedback,
            following,
            errors,
            mastered,
            completed,
            availableWords,
            filteredVocabulary,
            hintText,
            canShowAnswer,
            followingWords,
            errorWords,
            masteredWords,
            achievements,
            chooseRandomCard,
            addToNotes,
            submitAnswer,
            showAnswer,
            markMastered,
        };
    }

    global.LapisLanguageLogic = {
        MOCK_WORDS,
        sortVocabulary,
        buildHint,
        normalizeAnswer,
        addUnique,
        removeWord,
        shouldShowAnswer,
        achievementCounts,
    };

    global.createLanguageLearningState = createLanguageLearningState;
    global.LanguageLearningView = {
        props: ['activeTab'],
        setup() {
            return createLanguageLearningState(global.Vue);
        },
        mounted() {
            this.chooseRandomCard();
            refreshIcons();
        },
        updated() {
            refreshIcons();
        },
        template: `
            <div class="language-page max-w-3xl mx-auto w-full space-y-4">
                <section v-show="activeTab === 'learn'" class="space-y-4">
                    <div class="glass rounded-[2rem] p-5 border border-white/10" :class="{
                        'bg-green-500/20 border-green-400/70': feedback === 'correct' || feedback === 'revealed',
                        'bg-red-500/15 border-red-400/70': feedback === 'incorrect'
                    }">
                        <div v-if="currentWord" class="space-y-5">
                            <div class="flex items-center justify-between gap-3">
                                <span class="text-xs font-black uppercase opacity-50">Level {{ currentWord.difficulty }}</span>
                                <button type="button" class="px-3 py-2 rounded-xl bg-white/10 text-xs font-black" @click="addToNotes">
                                    Add to Notes
                                </button>
                            </div>
                            <div class="text-center py-6">
                                <p class="text-4xl font-black tracking-widest break-all">
                                    {{ feedback === 'correct' || feedback === 'revealed' ? currentWord.word : hintText }}
                                </p>
                                <p v-if="feedback === 'correct' || feedback === 'revealed'" class="mt-3 text-lg font-bold opacity-70">
                                    {{ currentWord.phonetic }}
                                </p>
                            </div>
                            <input v-model="typedAnswer"
                                   type="text"
                                   autocomplete="off"
                                   class="w-full rounded-2xl px-4 py-4 bg-white/80 text-slate-900 font-bold outline-none"
                                   placeholder="Type the full word"
                                   @keyup.enter="submitAnswer">
                            <div class="grid grid-cols-2 gap-3">
                                <button type="button" class="rounded-2xl py-3 bg-blue-600 text-white font-black" @click="submitAnswer">
                                    Check
                                </button>
                                <button type="button" class="rounded-2xl py-3 bg-white/10 font-black" @click="chooseRandomCard">
                                    Next
                                </button>
                            </div>
                            <button v-if="canShowAnswer" type="button" class="w-full rounded-2xl py-3 bg-red-600 text-white font-black" @click="showAnswer">
                                Show Answer
                            </button>
                            <p class="text-center text-xs font-bold opacity-50">Attempts {{ attempts }} / 3</p>
                        </div>
                        <div v-else class="text-center py-16 space-y-4">
                            <p class="text-xl font-black">All available words are mastered.</p>
                            <p class="text-sm opacity-50">Review your Mastered list in Notes.</p>
                        </div>
                    </div>
                </section>

                <section v-show="activeTab === 'vocab'" class="space-y-4">
                    <input v-model="searchQuery"
                           type="search"
                           class="w-full rounded-2xl px-4 py-4 bg-white/80 text-slate-900 font-bold outline-none"
                           placeholder="Search vocabulary">
                    <div class="space-y-3">
                        <div v-for="item in filteredVocabulary" :key="item.word" class="glass rounded-2xl p-4 flex items-center justify-between gap-3">
                            <div>
                                <p class="text-lg font-black">{{ item.word }}</p>
                                <p class="text-sm opacity-60">{{ item.phonetic }}</p>
                            </div>
                            <span class="px-3 py-1 rounded-full bg-white/10 text-xs font-black">Level {{ item.difficulty }}</span>
                        </div>
                    </div>
                </section>

                <section v-show="activeTab === 'notes'" class="space-y-4">
                    <div class="glass rounded-2xl p-4">
                        <h2 class="font-black mb-3">Following</h2>
                        <p v-if="!followingWords.length" class="text-sm opacity-50">No following words.</p>
                        <div v-for="item in followingWords" :key="item.word" class="flex items-center justify-between gap-3 py-2 border-t border-white/10">
                            <span class="font-bold">{{ item.word }}</span>
                            <button type="button" class="px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-black" @click="markMastered(item.word)">
                                Mastered
                            </button>
                        </div>
                    </div>
                    <div class="glass rounded-2xl p-4">
                        <h2 class="font-black mb-3">Errors</h2>
                        <p v-if="!errorWords.length" class="text-sm opacity-50">No error words.</p>
                        <div v-for="item in errorWords" :key="item.word" class="flex items-center justify-between gap-3 py-2 border-t border-white/10">
                            <span class="font-bold">{{ item.word }}</span>
                            <button type="button" class="px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-black" @click="markMastered(item.word)">
                                Mastered
                            </button>
                        </div>
                    </div>
                    <div class="glass rounded-2xl p-4">
                        <h2 class="font-black mb-3">Mastered</h2>
                        <p v-if="!masteredWords.length" class="text-sm opacity-50">No mastered words.</p>
                        <div v-for="item in masteredWords" :key="item.word" class="py-2 border-t border-white/10">
                            <p class="font-bold">{{ item.word }}</p>
                            <p class="text-sm opacity-60">{{ item.phonetic }}</p>
                        </div>
                    </div>
                </section>

                <section v-show="activeTab === 'achievements'" class="space-y-4">
                    <div class="glass rounded-[2rem] p-6 text-center">
                        <p class="text-sm font-black uppercase opacity-50">Completed Words</p>
                        <p class="text-5xl font-black mt-3">{{ achievements.total }}</p>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                        <div v-for="level in [1, 2, 3]" :key="level" class="glass rounded-2xl p-4 text-center">
                            <p class="text-xs font-black opacity-50">Level {{ level }}</p>
                            <p class="text-3xl font-black">{{ achievements.byDifficulty[level] }}</p>
                        </div>
                    </div>
                </section>
            </div>
        `,
    };
})(typeof window !== 'undefined' ? window : globalThis);
