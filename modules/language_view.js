'use strict';

(function (global) {
    const Data = global.LapisLanguageData;
    const Logic = global.LapisLanguageLogic;

    const TEXT = {
        zh: {
            level: '難度',
            addNotes: '加入筆記',
            typeWord: '輸入完整單字',
            check: '檢查',
            previous: '上一張',
            next: '下一張',
            continue: '繼續',
            showAnswer: '顯示答案',
            attempts: '錯誤次數',
            finished: '本輪字卡已完成',
            refillHint: '繼續後會補充新的字卡。',
            search: '搜尋單字、例句或中文例句',
            following: '追蹤中',
            errors: '錯誤單字',
            mastered: '已熟練',
            noFollowing: '尚未加入追蹤。',
            noErrors: '目前沒有錯誤單字。',
            noMastered: '尚無熟練單字。',
            markMastered: '標記熟練',
            completed: '完成單字',
            settings: '設定',
            difficultyCap: '難度上限',
            deckSize: '每輪最多字卡',
            deckSizeHint: '預設 10 張，最多 100 張，以 5 為單位。',
            noCards: '目前沒有可學習字卡。',
            noCardsHint: '請調整難度上限，或查看已熟練清單。',
            pronunciation: '發音',
            source: '來源',
            all: '全部',
            list: '清單',
        },
        en: {
            level: 'Level',
            addNotes: 'Add to Notes',
            typeWord: 'Type the full word',
            check: 'Check',
            previous: 'Previous',
            next: 'Next',
            continue: 'Continue',
            showAnswer: 'Show Answer',
            attempts: 'Attempts',
            finished: 'Deck complete',
            refillHint: 'Continue to refill the deck.',
            search: 'Search word, example, or Chinese example',
            following: 'Following',
            errors: 'Errors',
            mastered: 'Mastered',
            noFollowing: 'No following words.',
            noErrors: 'No error words.',
            noMastered: 'No mastered words.',
            markMastered: 'Mastered',
            completed: 'Completed Words',
            settings: 'Settings',
            difficultyCap: 'Difficulty Cap',
            deckSize: 'Cards per Deck',
            deckSizeHint: 'Default 10, max 100, step 5.',
            noCards: 'No available cards.',
            noCardsHint: 'Adjust difficulty cap or review mastered words.',
            pronunciation: 'Pronunciation',
            source: 'Source',
            all: 'All',
            list: 'List',
        },
    };

    function refreshIcons() {
        setTimeout(() => {
            if (global.lucide) global.lucide.createIcons();
        }, 0);
    }

    global.LanguageLearningView = {
        props: ['activeTab', 'lang', 'navSettings'],
        setup() {
            return Logic.createLanguageLearningState(global.Vue);
        },
        computed: {
            ui() {
                return TEXT[this.lang] || TEXT.zh;
            },
            isDarkMode() {
                const dk = ['dark','night','torii','purple','ferriswheel','starrynight','deepgray'];
                if (!this.navSettings) return false;
                const t = this.navSettings.theme;
                if (t === 'system') return typeof window !== 'undefined' && window.matchMedia
                    ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
                return dk.includes(t);
            },
        },
        mounted() {
            // dealDeck is now async: loads index → fetches detail files → populates deck
            this.dealDeck('refill');
            this.initSwiper();
            refreshIcons();
        },
        updated() {
            refreshIcons();
        },
        methods: {
            cardStyle(index) {
                if (!this.isDarkMode) return {};
                const fb = this.currentState.feedback;
                if (index === this.deckIndex && (fb === 'correct' || fb === 'revealed'))
                    return { background: 'rgba(34,197,94,0.22)', color: '#ffffff', borderColor: 'rgba(74,222,128,0.65)' };
                if (index === this.deckIndex && fb === 'incorrect')
                    return { background: 'rgba(239,68,68,0.18)', color: '#ffffff', borderColor: 'rgba(248,113,113,0.65)' };
                return { background: '#000000', color: '#ffffff', borderColor: 'rgba(255,255,255,0.18)' };
            },
            initSwiper() {
                if (!global.Swiper || this.swiper) return;
                this.$nextTick(() => {
                    const el = this.$el.querySelector('.language-card-swiper');
                    if (!el || this.swiper) return;
                    this.swiper = new global.Swiper(el, {
                        effect: 'cards',
                        grabCursor: false,
                        allowTouchMove: false,
                        cardsEffect: {
                            perSlideOffset: 9,
                            perSlideRotate: 2,
                            rotate: true,
                            slideShadows: false,
                        },
                        on: {
                            slideChange: swiper => {
                                this.deckIndex = swiper.activeIndex;
                            },
                        },
                    });
                });
            },
            syncSwiper() {
                this.$nextTick(() => {
                    if (!this.swiper) {
                        this.initSwiper();
                        return;
                    }
                    this.swiper.update();
                    this.swiper.slideTo(this.deckIndex, 0);
                });
            },
            voiceUrl(word) {
                return Data.voiceUrl(word);
            },
            playVoice(word) {
                const audio = new Audio(this.voiceUrl(word));
                audio.play().catch(() => {});
            },
            exampleHtml(item) {
                return Logic.exampleHtml(item.example_en, item.word, this.currentState.feedback);
            },
            partLabel(item) {
                return Data.partOfSpeechLabel(item.part_of_speech, this.lang);
            },
            handleNext() {
                this.nextCard();
                this.$nextTick(() => this.swiper?.slideTo(this.deckIndex));
            },
            handlePrevious() {
                this.previousCard();
                this.$nextTick(() => this.swiper?.slideTo(this.deckIndex));
            },
            handleRefill() {
                this.dealDeck('refill');
                this.syncSwiper();
            },
            handleDifficultyCap(value) {
                this.setDifficultyCap(value);
                this.syncSwiper();
            },
            handleDeckSize(value) {
                this.setDeckSize(value);
                this.syncSwiper();
            },
            stackStyle(index) {
                const offset = Math.min(index, 7);
                return {
                    transform: `translateY(${offset * 9}px) scale(${1 - offset * 0.018})`,
                    opacity: String(Math.max(0.35, 1 - offset * 0.08)),
                    zIndex: String(20 - offset),
                };
            },
        },
        template: `
            <div class="language-page max-w-3xl mx-auto w-full space-y-4">
                <section v-show="activeTab === 'learn'" class="space-y-4">
                    <div v-if="currentWord" class="swiper language-card-swiper min-h-[470px]">
                        <div class="swiper-wrapper">
                            <div v-for="(card, index) in studyDeck"
                                 :key="card.word + '-' + deckCycle"
                                 class="swiper-slide">
                            <div class="language-study-card rounded-[2rem] p-5 border shadow-2xl min-h-[440px]"
                                 :style="cardStyle(index)"
                                 :class="{
                                    'glass border-white/10': !isDarkMode,
                                    'bg-green-500/20 border-green-400/70': !isDarkMode && index === deckIndex && (currentState.feedback === 'correct' || currentState.feedback === 'revealed'),
                                    'bg-red-500/15 border-red-400/70': !isDarkMode && index === deckIndex && currentState.feedback === 'incorrect',
                                    'translate-x-3 rotate-1': index === deckIndex && deckMotion === 'next',
                                    '-translate-x-3 -rotate-1': index === deckIndex && deckMotion === 'previous',
                                    'scale-95': index === deckIndex && deckMotion === 'refill'
                                  }">
                                <div v-if="index === deckIndex" class="space-y-5">
                                    <div class="flex items-center justify-between gap-3">
                                        <span class="text-xs font-black uppercase opacity-50">{{ ui.level }} {{ currentWord.difficulty }}</span>
                                        <button type="button" class="px-3 py-2 rounded-xl bg-white/10 text-xs font-black" @click="addToNotes">
                                            {{ ui.addNotes }}
                                        </button>
                                    </div>

                                    <div class="rounded-2xl bg-white/10 p-4 space-y-3">
                                        <p class="text-lg font-black leading-snug" v-html="exampleHtml(currentWord)"></p>
                                        <p class="text-sm font-bold opacity-70">{{ currentWord.example_zh }}</p>
                                    </div>

                                    <div class="text-center py-4">
                                        <p class="text-4xl font-black tracking-widest break-all">
                                            {{ currentState.feedback === 'correct' || currentState.feedback === 'revealed' ? currentWord.word : hintText }}
                                        </p>
                                        <div v-if="currentState.feedback === 'correct' || currentState.feedback === 'revealed'" class="mt-4 space-y-2">
                                            <p class="text-lg font-bold opacity-80">{{ currentWord.phonetic }}</p>
                                            <p class="text-sm font-bold opacity-70">{{ partLabel(currentWord) }} {{ currentWord.chinese_meaning }}</p>
                                            <div class="flex items-center justify-center gap-2 pt-2">
                                                <button type="button" class="w-11 h-11 rounded-full bg-blue-600 text-white inline-flex items-center justify-center"
                                                        :title="ui.pronunciation"
                                                        @click="playVoice(currentWord.word)">
                                                    <i data-lucide="volume-2" class="w-5 h-5"></i>
                                                </button>
                                                <a class="w-11 h-11 rounded-full bg-white/10 inline-flex items-center justify-center"
                                                   :href="currentWord.url" target="_blank" rel="noopener">
                                                    <i data-lucide="external-link" class="w-5 h-5"></i>
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    <input v-model="typedAnswer"
                                           type="text"
                                           autocomplete="off"
                                           class="w-full rounded-2xl px-4 py-4 bg-white/80 text-slate-900 font-bold outline-none"
                                           :placeholder="ui.typeWord"
                                           @keyup.enter="submitAnswer">
                                    <div class="grid grid-cols-3 gap-2">
                                        <button type="button" class="rounded-2xl py-3 bg-white/10 font-black disabled:opacity-35"
                                                :disabled="!canGoPrevious" @click="handlePrevious">
                                            {{ ui.previous }}
                                        </button>
                                        <button type="button" class="rounded-2xl py-3 bg-blue-600 text-white font-black" @click="submitAnswer">
                                            {{ ui.check }}
                                        </button>
                                        <button type="button" class="rounded-2xl py-3 bg-white/10 font-black disabled:opacity-35"
                                                :disabled="!canGoNext" @click="handleNext">
                                            {{ ui.next }}
                                        </button>
                                    </div>
                                    <button v-if="canShowAnswer" type="button" class="w-full rounded-2xl py-3 bg-red-600 text-white font-black" @click="showAnswer">
                                        {{ ui.showAnswer }}
                                    </button>
                                    <button v-if="deckFinished" type="button" class="w-full rounded-2xl py-3 bg-emerald-600 text-white font-black" @click="handleRefill">
                                        {{ ui.continue }}
                                    </button>
                                    <p class="text-center text-xs font-bold opacity-50">
                                        {{ deckIndex + 1 }} / {{ studyDeck.length }} · {{ ui.attempts }} {{ currentState.attempts }} / 3
                                    </p>
                                </div>
                                <div v-else class="h-[400px]"></div>
                            </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="glass rounded-[2rem] p-8 text-center space-y-3">
                        <p class="text-xl font-black">{{ ui.noCards }}</p>
                        <p class="text-sm opacity-60">{{ ui.noCardsHint }}</p>
                            <button type="button" class="px-4 py-3 rounded-2xl bg-blue-600 text-white font-black" @click="handleRefill">
                            {{ ui.continue }}
                        </button>
                    </div>
                </section>

                <section v-show="activeTab === 'vocab'" class="space-y-4">
                    <input v-model="searchQuery"
                           type="search"
                           class="w-full rounded-2xl px-4 py-4 bg-white/80 text-slate-900 font-bold outline-none"
                           :placeholder="ui.search">
                    <div class="grid grid-cols-2 gap-2">
                        <select v-model="vocabDifficulty" class="language-native-select">
                            <option value="all">{{ ui.all }}</option>
                            <option v-for="level in ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']" :key="level" :value="level">{{ level }}</option>
                        </select>
                        <select v-model="vocabLetter" class="language-native-select">
                            <option value="all">{{ ui.all }}</option>
                            <option v-for="letter in vocabularyLetters" :key="letter" :value="letter">{{ letter.toUpperCase() }}</option>
                        </select>
                    </div>
                    <div class="space-y-4">
                        <div v-for="group in vocabularyGroups" :key="group.difficulty" class="space-y-3">
                            <h2 class="px-1 text-sm font-black opacity-60">{{ group.difficulty }}</h2>
                            <div v-for="letterGroup in group.letters" :key="group.difficulty + letterGroup.letter" class="space-y-2">
                                <h3 class="px-1 text-xs font-black uppercase opacity-45">{{ letterGroup.letter }}</h3>
                                <div v-for="item in letterGroup.words" :key="item.word" class="glass rounded-2xl p-4 flex items-center justify-between gap-3">
                                    <div>
                                        <p class="text-lg font-black">{{ item.word }}</p>
                                        <p class="text-sm opacity-60">{{ item.phonetic }} · {{ partLabel(item) }}</p>
                                    </div>
                                    <span class="px-3 py-1 rounded-full bg-white/10 text-xs font-black">{{ item.difficulty }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section v-show="activeTab === 'notes'" class="space-y-4">
                    <div class="grid grid-cols-3 gap-2">
                        <button type="button" class="rounded-2xl py-3 font-black" :class="noteList === 'following' ? 'bg-blue-600 text-white' : 'bg-white/10'" @click="noteList = 'following'">{{ ui.following }}</button>
                        <button type="button" class="rounded-2xl py-3 font-black" :class="noteList === 'errors' ? 'bg-blue-600 text-white' : 'bg-white/10'" @click="noteList = 'errors'">{{ ui.errors }}</button>
                        <button type="button" class="rounded-2xl py-3 font-black" :class="noteList === 'mastered' ? 'bg-blue-600 text-white' : 'bg-white/10'" @click="noteList = 'mastered'">{{ ui.mastered }}</button>
                    </div>
                    <div class="glass rounded-2xl p-4">
                        <h2 class="font-black mb-3">{{ noteList === 'errors' ? ui.errors : noteList === 'mastered' ? ui.mastered : ui.following }}</h2>
                        <p v-if="!activeNoteWords.length" class="text-sm opacity-50">
                            {{ noteList === 'errors' ? ui.noErrors : noteList === 'mastered' ? ui.noMastered : ui.noFollowing }}
                        </p>
                        <div v-for="item in activeNoteWords" :key="item.word" class="flex items-center justify-between gap-3 py-2 border-t border-white/10">
                            <span class="font-bold">{{ item.word }}</span>
                            <button v-if="noteList !== 'mastered'" type="button" class="px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-black" @click="markMastered(item.word)">
                                {{ ui.markMastered }}
                            </button>
                        </div>
                    </div>
                </section>

                <section v-show="activeTab === 'achievements'" class="space-y-4">
                    <div class="glass rounded-[2rem] p-6 text-center">
                        <p class="text-sm font-black uppercase opacity-50">{{ ui.completed }}</p>
                        <p class="text-5xl font-black mt-3">{{ achievements.total }}</p>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                        <div v-for="level in ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']" :key="level" class="glass rounded-2xl p-4 text-center">
                            <p class="text-xs font-black opacity-50">{{ level }}</p>
                            <p class="text-3xl font-black">{{ achievements.byDifficulty[level] }}</p>
                        </div>
                    </div>
                </section>

                <section v-show="activeTab === 'settings'" class="space-y-4">
                    <div class="glass rounded-2xl p-4 space-y-4">
                        <h2 class="font-black">{{ ui.settings }}</h2>
                        <label class="block space-y-2">
                            <span class="text-sm font-black opacity-70">{{ ui.difficultyCap }}</span>
                            <select class="w-full rounded-2xl px-4 py-3 bg-white/80 text-slate-900 font-bold"
                                    :value="settings.difficultyCap"
                                    @change="handleDifficultyCap($event.target.value)">
                                <option v-for="level in ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']" :key="level" :value="level">{{ level }}</option>
                            </select>
                        </label>
                        <label class="block space-y-2">
                            <span class="text-sm font-black opacity-70">{{ ui.deckSize }}: {{ settings.deckSize }}</span>
                            <input type="range" min="5" max="100" step="5"
                                   class="w-full"
                                   :value="settings.deckSize"
                                   @input="handleDeckSize($event.target.value)">
                            <p class="text-xs opacity-50">{{ ui.deckSizeHint }}</p>
                        </label>
                    </div>
                </section>
            </div>
        `,
    };
})(typeof window !== 'undefined' ? window : globalThis);
