// index.js — Glassy Home Dashboard Vue app
// Depends on: storage.js, nav.js, lapis_core_ui.js
'use strict';

window.addEventListener('DOMContentLoaded', () => {
    const { createApp, computed, ref, watch, nextTick, onMounted, onUnmounted } = Vue;

    const _DAYS_ZH = ['週日','週一','週二','週三','週四','週五','週六'];
    const _DAYS_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const _MON_ZH  = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    const _MON_EN  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    // ── Dashboard translations ────────────────────────────────────────────────
    const _strings = {
        zh: {
            greetMorn: '早安', greetAftn: '午安', greetEvng: '晚安',
            today: '今天', tomorrow: '明天',
            noEvents: '今日沒有安排',
            quickAdd: '快速新增',
            quickTask: '快速任務', logWeight: '記錄體重',
            taskNamePlaceholder: '輸入任務名稱…',
            weightPlaceholder: '體重（公斤）',
            save: '儲存', cancel: '取消',
            savedTask: '✓ 任務已新增', savedWeight: '✓ 體重已記錄',
            inputEmpty: '請輸入內容',
        },
        en: {
            greetMorn: 'Good morning', greetAftn: 'Good afternoon', greetEvng: 'Good evening',
            today: 'Today', tomorrow: 'Tomorrow',
            noEvents: 'No events scheduled',
            quickAdd: 'Quick Add',
            quickTask: 'Quick Task', logWeight: 'Log Weight',
            taskNamePlaceholder: 'Enter task name…',
            weightPlaceholder: 'Weight (kg)',
            save: 'Save', cancel: 'Cancel',
            savedTask: '✓ Task saved', savedWeight: '✓ Weight logged',
            inputEmpty: 'Please enter a value',
        },
    };

    if (typeof LapisI18n !== 'undefined') {
        LapisI18n.register('zh', { dashboard: _strings.zh });
        LapisI18n.register('en', { dashboard: _strings.en });
    }

    const DASHBOARD_TRANSLATION_KEYS = Object.keys(_strings.zh);

    function getDashboardTranslations(lang) {
        const fallback = _strings[lang] || _strings.zh;
        if (typeof LapisI18n === 'undefined') return fallback;

        return DASHBOARD_TRANSLATION_KEYS.reduce((dict, key) => {
            const i18nKey = `dashboard.${key}`;
            const value = LapisI18n.t(i18nKey, null, lang);
            dict[key] = value === i18nKey ? fallback[key] : value;
            return dict;
        }, {});
    }

    // ── Stats translations ────────────────────────────────────────────────────
    const _statsStrings = {
        zh: {
            sectionWorkout:  '健身',
            totalSessions:   '累計訓練',
            thisWeek:        '本週訓練',
            latestWeight:    '最新體重',
            exercises:       '動作庫',
            sectionCharts:   '圖表分析',
            chartWeight:     '體重趨勢 (kg)',
            chartVolume:     '訓練量趨勢 (kg)',
            snapToday:       '回今天',
            noWeightData:    '尚無體重紀錄',
            noVolumeData:    '尚無訓練紀錄',
            noChartsEnabled: '目前未啟用任何圖表，請至「頁面功能設定」開啟',
            sectionLanguage: '語言',
            languageCompleted: '完成單字',
        },
        en: {
            sectionWorkout:  'Workout',
            totalSessions:   'Total Sessions',
            thisWeek:        'This Week',
            latestWeight:    'Latest Weight',
            exercises:       'Exercises',
            sectionCharts:   'Charts',
            chartWeight:     'Body Weight (kg)',
            chartVolume:     'Volume (kg)',
            snapToday:       'Today',
            noWeightData:    'No weight data yet',
            noVolumeData:    'No workout data yet',
            noChartsEnabled: 'No charts enabled. Go to Settings → Features to enable.',
            sectionLanguage: 'Language',
            languageCompleted: 'Completed Words',
        },
    };

    if (typeof LapisI18n !== 'undefined') {
        LapisI18n.register('zh', { stats: _statsStrings.zh });
        LapisI18n.register('en', { stats: _statsStrings.en });
    }

    const STATS_TRANSLATION_KEYS = Object.keys(_statsStrings.zh);

    function getStatsTranslations(lang) {
        const fallback = _statsStrings[lang] || _statsStrings.zh;
        if (typeof LapisI18n === 'undefined') return fallback;
        return STATS_TRANSLATION_KEYS.reduce((dict, key) => {
            const i18nKey = `stats.${key}`;
            const value = LapisI18n.t(i18nKey, null, lang);
            dict[key] = value === i18nKey ? fallback[key] : value;
            return dict;
        }, {});
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    const _uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

    const _timeDigits = () => {
        const d = new Date();
        return `${d.getHours().toString().padStart(2, '0')}${d.getMinutes().toString().padStart(2, '0')}${d.getSeconds().toString().padStart(2, '0')}`
            .split('');
    };

    const _initialFlipDigits = () => _timeDigits().map(v => ({ value: v, previous: v, flipping: false }));

    const _dateStr = (offset = 0) => {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return toLocalISO(d);
    };

    const _shortLabel = (dateStr, lang) => {
        const d = new Date(dateStr + 'T00:00:00');
        if (lang === 'zh') {
            return `${_MON_ZH[d.getMonth()]}${d.getDate()}日 ${_DAYS_ZH[d.getDay()]}`;
        }
        return `${_MON_EN[d.getMonth()]} ${d.getDate()} (${_DAYS_EN[d.getDay()]})`;
    };

    const _loadDashboard = () => {
        const todayStr    = _dateStr(0);
        const tomorrowStr = _dateStr(1);

        const todos = StorageProvider.getTodoData().todos || [];

        const filterTasks = (dateStr) =>
            todos
                .filter(t => !t.completed && !t.isDeleted && t.dueDate && t.dueDate.startsWith(dateStr))
                .map(t => ({ type: 'task', id: t.id, text: t.text }));

        const shiftData     = StorageProvider.getShiftData();
        const shiftSettings = StorageProvider.getShiftSettings();
        const allTags       = shiftSettings.shiftTags || [];

        const filterShifts = (dateStr) => {
            const ids = (shiftData[dateStr] || {}).shiftIds || [];
            return ids
                .map(id => allTags.find(tag => tag.id === id))
                .filter(Boolean)
                .map(tag => ({
                    type: 'shift',
                    id: tag.id,
                    name: tag.name,
                    startTime: tag.startTime,
                    endTime: tag.endTime,
                    color: tag.color,
                }));
        };

        return {
            today:    { date: todayStr,    tasks: filterTasks(todayStr),    shifts: filterShifts(todayStr)    },
            tomorrow: { date: tomorrowStr, tasks: filterTasks(tomorrowStr), shifts: filterShifts(tomorrowStr) },
        };
    };

    // ── Stats helpers ─────────────────────────────────────────────────────────
    const _DAY_MS  = 86400000;
    const _palette = () => (typeof LapisChartPalette !== 'undefined' && Array.isArray(LapisChartPalette))
        ? LapisChartPalette : ['#3b82f6'];

    function _readStatsData() {
        const wRaw = JSON.parse(localStorage.getItem('lapis_workout')         || '{"logs":[]}');
        const mRaw = JSON.parse(localStorage.getItem('lapis_workout_metrics') || '{"weights":[]}');
        const lRaw = JSON.parse(localStorage.getItem('lapis_workout_library') || '[]');
        const logs    = Array.isArray(wRaw.logs)    ? wRaw.logs    : [];
        const weights = Array.isArray(mRaw.weights) ? mRaw.weights : [];
        const library = Array.isArray(lRaw)         ? lRaw         : [];

        const now = new Date();
        const mon = new Date(now);
        mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        const monStr = toLocalISO(mon);
        const total  = logs.filter(l => !l.isDeleted).length;
        const thisWk = logs.filter(l => !l.isDeleted && l.date >= monStr).length;
        const latest = weights.length > 0 ? weights[weights.length - 1] : null;

        return { total, thisWk, latest, exerciseCount: library.length, logs, weights };
    }

    function _languageAchievements() {
        let completed = [];
        try {
            const raw = JSON.parse(localStorage.getItem('lapis_language_progress') || '{}');
            completed = Array.isArray(raw.completed) ? [...new Set(raw.completed)] : [];
        } catch (_) {}
        const words  = (typeof LapisLanguageData !== 'undefined' && Array.isArray(LapisLanguageData.MOCK_WORDS))
            ? LapisLanguageData.MOCK_WORDS : [];
        const levels = (typeof LapisLanguageData !== 'undefined' && Array.isArray(LapisLanguageData.DIFFICULTIES))
            ? LapisLanguageData.DIFFICULTIES : ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        return {
            total: completed.length,
            byDifficulty: levels.reduce((acc, level) => {
                acc[level] = completed.filter(word =>
                    words.find(item => item.word === word && item.difficulty === level)
                ).length;
                return acc;
            }, {}),
        };
    }

    function _weightSeries(weights) {
        return weights
            .filter(w => w.weight > 0)
            .map(w => ({ x: new Date(w.date + 'T00:00:00').getTime(), y: w.weight }));
    }

    function _volumeSeries(logs) {
        const byDate = {};
        logs.filter(l => !l.isDeleted).forEach(log => {
            let vol = 0;
            log.exercises.forEach(e => {
                if (e.type === 'superset') {
                    const rounds = parseInt(e.rounds) || 1;
                    (e.items || []).forEach(item => {
                        const w = parseFloat(item.weight), r = parseInt(item.reps);
                        if (!isNaN(w) && !isNaN(r)) vol += w * r * rounds;
                    });
                } else if (e.type === 'sets') {
                    (e.sets || []).forEach(s => {
                        const w = parseFloat(s.weight), r = parseInt(s.reps), n = parseInt(s.numSets) || 1;
                        if (!isNaN(w) && !isNaN(r)) vol += w * r * n;
                    });
                }
            });
            if (vol > 0) byDate[log.date] = (byDate[log.date] || 0) + vol;
        });
        return Object.entries(byDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, vol]) => ({ x: new Date(date + 'T00:00:00').getTime(), y: Math.round(vol) }));
    }

    function _catVolSeries(logs, subCat) {
        const byDate = {};
        logs.filter(l => !l.isDeleted).forEach(log => {
            let vol = 0;
            log.exercises.forEach(e => {
                if (e.type === 'superset') {
                    const rounds = parseInt(e.rounds) || 1;
                    (e.items || []).forEach(item => {
                        if (!(item.categories || []).includes(subCat)) return;
                        const w = parseFloat(item.weight), r = parseInt(item.reps);
                        if (!isNaN(w) && !isNaN(r)) vol += w * r * rounds;
                    });
                    return;
                }
                if (e.type !== 'sets') return;
                if (!(e.categories || []).includes(subCat)) return;
                (e.sets || []).forEach(s => {
                    const w = parseFloat(s.weight), r = parseInt(s.reps), n = parseInt(s.numSets) || 1;
                    if (!isNaN(w) && !isNaN(r)) vol += w * r * n;
                });
            });
            if (vol > 0) byDate[log.date] = (byDate[log.date] || 0) + vol;
        });
        return Object.entries(byDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, vol]) => ({ x: new Date(date + 'T00:00:00').getTime(), y: Math.round(vol) }));
    }

    function _buildCatCharts(logs) {
        const catSetts = (StorageProvider.getCommonSettings() || {}).workoutCatCharts || {};
        const groups   = typeof WorkoutConfig !== 'undefined'
            ? WorkoutConfig.getAvailableExerciseCategories() : [];
        const pal = _palette();
        let idx = 0;
        const result = [];
        groups.forEach(g => {
            g.subs.forEach(sub => {
                if (catSetts[sub.name] === false) return;
                result.push({
                    subCat: sub.name,
                    name:   sub.name,
                    nameZh: sub.nameZh,
                    series: _catVolSeries(logs, sub.name),
                    color:  pal[idx++ % pal.length],
                });
            });
        });
        return result;
    }

    function _chartOpts(series, seriesName, isDark, noDataText, color) {
        const c         = color || '#3b82f6';
        const textColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)';
        const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
        const now       = Date.now();
        return {
            chart: {
                type: 'area', height: 200, background: 'transparent',
                toolbar: { show: false, autoSelected: 'pan' },
                zoom: { type: 'x', enabled: true },
                animations: { enabled: false },
                fontFamily: '"Inter", system-ui, sans-serif',
                sparkline: { enabled: false },
            },
            series: [{ name: seriesName, data: series }],
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 2, colors: [c] },
            fill: {
                type: 'gradient',
                gradient: {
                    type: 'vertical', shadeIntensity: 1,
                    colorStops: [
                        { offset: 0,   color: c, opacity: 0.28 },
                        { offset: 100, color: c, opacity: 0    },
                    ],
                },
            },
            markers: {
                size: 4, colors: [c],
                strokeColors: isDark ? '#ffffff' : '#1a1a1a',
                strokeWidth: 2, hover: { size: 7 },
            },
            xaxis: {
                type: 'datetime', min: now - 14 * _DAY_MS, max: now,
                labels: {
                    datetimeUTC: false, format: 'MM/dd',
                    style: { colors: textColor, fontSize: '10px', fontWeight: '700' },
                },
                axisBorder: { show: false }, axisTicks: { show: false },
            },
            yaxis: { labels: { style: { colors: textColor, fontSize: '10px', fontWeight: '700' } } },
            grid: {
                borderColor: gridColor, strokeDashArray: 4,
                padding: { left: 4, right: 8, top: 0, bottom: 0 },
            },
            tooltip: {
                theme: isDark ? 'dark' : 'light',
                x: { format: 'yyyy/MM/dd' },
                style: { fontSize: '11px', fontFamily: '"Inter", sans-serif' },
            },
            noData: {
                text: noDataText, align: 'center', verticalAlign: 'middle',
                style: { fontSize: '12px', fontWeight: '700', color: textColor },
            },
            theme: { mode: isDark ? 'dark' : 'light' },
        };
    }

    function _themeOpts(isDark) {
        const textColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)';
        const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
        return {
            markers: { strokeColors: isDark ? '#ffffff' : '#1a1a1a' },
            xaxis:   { labels: { style: { colors: textColor } } },
            yaxis:   { labels: { style: { colors: textColor } } },
            grid:    { borderColor: gridColor },
            tooltip: { theme: isDark ? 'dark' : 'light' },
            theme:   { mode: isDark ? 'dark' : 'light' },
            noData:  { style: { color: textColor } },
        };
    }

    // Chart instances (module-level for snapToToday access)
    let _wChart = null;
    let _vChart = null;
    const _catChartsMap = {};

    // ── Vue App ───────────────────────────────────────────────────────────────
    createApp({
        setup() {
            const { navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle } = useNav();

            const themeStyle = computed(() => ({
                color: 'var(--text-primary)',
                textShadow: 'var(--text-shadow)',
            }));

            const t  = computed(() => getDashboardTranslations(navSettings.lang));
            const ts = computed(() => getStatsTranslations(navSettings.lang));

            const userProfile = ref(
                typeof LapisUserProfile !== 'undefined'
                    ? LapisUserProfile.get()
                    : { nickname: '', birthday: '' }
            );

            const todayLabel = computed(() => {
                const d   = new Date();
                const lg  = navSettings.lang;
                const day = lg === 'zh' ? _DAYS_ZH[d.getDay()] : _DAYS_EN[d.getDay()];
                const mon = lg === 'zh' ? _MON_ZH[d.getMonth()] : _MON_EN[d.getMonth()];
                return lg === 'zh'
                    ? `${d.getFullYear()}年${mon}${d.getDate()}日 ${day}`
                    : `${day}, ${mon} ${d.getDate()}, ${d.getFullYear()}`;
            });

            const greeting = computed(() => {
                const h = new Date().getHours();
                const s = t.value;
                const base = h < 12 ? s.greetMorn : h < 18 ? s.greetAftn : s.greetEvng;
                const nickname = (userProfile.value.nickname || '').trim();
                return nickname ? `${nickname}, ${base}` : base;
            });

            // ── Tab state ─────────────────────────────────────────────────────
            const activeTab = ref('home');

            // ── Dashboard ─────────────────────────────────────────────────────
            const dashboard = ref(_loadDashboard());
            const todayShortLabel    = computed(() => _shortLabel(_dateStr(0), navSettings.lang));
            const tomorrowShortLabel = computed(() => _shortLabel(_dateStr(1), navSettings.lang));

            // ── Stats data (read once) ────────────────────────────────────────
            const { total, thisWk, latest, exerciseCount, logs, weights } = _readStatsData();
            const weightSeries   = _weightSeries(weights);
            const volumeSeries   = _volumeSeries(logs);
            const catCharts      = _buildCatCharts(logs);
            const commonSettings = StorageProvider.getCommonSettings() || {};
            const showWeightChart   = commonSettings.showWeightChart !== false;
            const showLanguageStats = commonSettings.showLanguageStats !== false;
            const languageAchievements = _languageAchievements();
            const languageLevelSummary = computed(() =>
                Object.entries(languageAchievements.byDifficulty)
                    .filter(([, count]) => count > 0)
                    .map(([level, count]) => `${level} ${count}`)
                    .join(' / ') || 'A1 0'
            );
            const hasAnyChart = showWeightChart || catCharts.length > 0;

            // ── Snap to today ─────────────────────────────────────────────────
            const snapToToday = () => {
                const now   = Date.now();
                const range = { xaxis: { min: now - 14 * _DAY_MS, max: now } };
                if (_wChart) _wChart.updateOptions(range, false, true);
                if (_vChart) _vChart.updateOptions(range, false, true);
                Object.values(_catChartsMap).forEach(c => c.updateOptions(range, false, true));
            };

            // ── Chart init (lazy — deferred to first stats tab visit) ─────────
            let _statsInited = false;
            const _initStatsCharts = () => {
                if (_statsInited || typeof ApexCharts === 'undefined') return;
                _statsInited = true;
                const dark = isDarkTheme.value;

                if (showWeightChart) {
                    const wEl = document.getElementById('weight-chart');
                    if (wEl && weightSeries.length > 0) {
                        _wChart = new ApexCharts(wEl, _chartOpts(weightSeries, ts.value.chartWeight, dark, ts.value.noWeightData));
                        _wChart.render();
                    }
                }
                const vEl = document.getElementById('volume-chart');
                if (vEl && volumeSeries.length > 0) {
                    _vChart = new ApexCharts(vEl, _chartOpts(volumeSeries, ts.value.chartVolume, dark, ts.value.noVolumeData));
                    _vChart.render();
                }
                catCharts.forEach(c => {
                    const el = document.getElementById('stats-cat-chart-' + c.subCat);
                    if (!el) return;
                    const label = (navSettings.lang === 'zh' ? c.nameZh : c.name) + ' Vol (kg)';
                    const inst  = new ApexCharts(el, _chartOpts(c.series, label, dark, ts.value.noVolumeData, c.color));
                    inst.render();
                    _catChartsMap[c.subCat] = inst;
                });
            };

            watch(activeTab, (val) => {
                if (val === 'stats') nextTick(_initStatsCharts);
            });

            watch(isDarkTheme, (dark) => {
                const opts = _themeOpts(dark);
                if (_wChart) _wChart.updateOptions(opts, false, false);
                if (_vChart) _vChart.updateOptions(opts, false, false);
                Object.values(_catChartsMap).forEach(c => c.updateOptions(opts, false, false));
            });

            // ── Quick Add ─────────────────────────────────────────────────────
            const quickMode   = ref('task');
            const quickText   = ref('');
            const quickWeight = ref('');
            const toastMsg    = ref('');
            const toastShow   = ref(false);
            const flipDigits  = ref(_initialFlipDigits());

            let _toastTimer = null;
            let _clockTimer = null;
            const _showToast = (msg) => {
                toastMsg.value  = msg;
                toastShow.value = true;
                if (_toastTimer) clearTimeout(_toastTimer);
                _toastTimer = setTimeout(() => { toastShow.value = false; }, 2400);
            };

            const tickFlipClock = () => {
                const next = _timeDigits();
                const changed = flipDigits.value.some((digit, i) => digit.value !== next[i]);
                if (!changed) return;
                flipDigits.value = flipDigits.value.map((digit, i) => ({
                    previous: digit.value,
                    value: next[i],
                    flipping: digit.value !== next[i],
                }));
                setTimeout(() => {
                    flipDigits.value = flipDigits.value.map(digit => ({
                        previous: digit.value,
                        value: digit.value,
                        flipping: false,
                    }));
                }, 620);
            };

            const openQuickAdd = () => {
                quickMode.value   = 'task';
                quickText.value   = '';
                quickWeight.value = '';
                LapisModal.open('quick-add-modal');
            };

            const closeQuickAdd = () => LapisModal.close('quick-add-modal');

            const saveQuick = () => {
                if (quickMode.value === 'task') {
                    const text = (quickText.value || '').trim();
                    if (!text) return;
                    const data = StorageProvider.getTodoData();
                    data.todos.push({
                        id: _uid(), text, category: 'normal', recurring: 'none',
                        dueDate: _dateStr(0), alertMinutes: 0, completed: false,
                        isDeleted: false, listId: 'default', createdAt: Date.now(),
                    });
                    StorageProvider.saveData(data);
                    closeQuickAdd();
                    _showToast(t.value.savedTask);
                } else {
                    const w = parseFloat(quickWeight.value);
                    if (!w || w <= 0) return;
                    const raw = JSON.parse(localStorage.getItem('lapis_workout_metrics') || '{"weights":[],"personalBests":[]}');
                    if (!Array.isArray(raw.weights))       raw.weights      = [];
                    if (!Array.isArray(raw.personalBests)) raw.personalBests = [];
                    raw.weights.push({ date: _dateStr(0), weight: w, unit: 'kg' });
                    localStorage.setItem('lapis_workout_metrics', JSON.stringify(raw));
                    closeQuickAdd();
                    _showToast(t.value.savedWeight);
                }
                dashboard.value = _loadDashboard();
            };

            onMounted(() => {
                if (typeof LapisNav   !== 'undefined') LapisNav.inject({ bottom: false });
                if (typeof LapisModal !== 'undefined') LapisModal.init();
                if (typeof ParticleEngine !== 'undefined' && navSettings.effect && navSettings.effect !== 'none') {
                    ParticleEngine.setEffect(navSettings.effect);
                }
                window.addEventListener('storage', (e) => {
                    if (e.key === 'todo_data' || e.key === 'glassy_shift_data') {
                        dashboard.value = _loadDashboard();
                    }
                    if (e.key === 'lapis_user_profile' && typeof LapisUserProfile !== 'undefined') {
                        userProfile.value = LapisUserProfile.get();
                    }
                });
                _clockTimer = setInterval(tickFlipClock, 1000);
            });

            onUnmounted(() => {
                if (_clockTimer) clearInterval(_clockTimer);
                if (_toastTimer) clearTimeout(_toastTimer);
            });

            return {
                navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle, themeStyle,
                t, ts,
                todayLabel, greeting, flipDigits,
                activeTab,
                dashboard, todayShortLabel, tomorrowShortLabel,
                workoutCount: total, thisWeek: thisWk, latestWeight: latest, exerciseCount,
                weightSeries, volumeSeries, catCharts,
                showWeightChart, showLanguageStats,
                languageAchievements, languageLevelSummary,
                hasAnyChart, snapToToday,
                quickMode, quickText, quickWeight, toastMsg, toastShow,
                openQuickAdd, closeQuickAdd, saveQuick,
            };
        },
    }).mount('#app');
});
