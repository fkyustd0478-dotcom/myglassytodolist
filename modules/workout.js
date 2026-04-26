// workout.js — Glassy Workout Vue app (session CRUD + orchestration)
// Depends on: workout_data.js, workout_metrics.js, workout_library_ui.js, storage.js, nav.js

window.addEventListener('DOMContentLoaded', () => {
    const { createApp, ref, reactive, computed, watch, onMounted, nextTick } = Vue;

    // ── Chart helpers (ApexCharts, outside Vue) ───────────────────────────────
    const _CRT_DAY_MS   = 86400000;
    const _MAIN_CATS    = ['Chest','Back','Shoulders','Arms','Legs','Core','Cardio'];
    let   _wBodyChart   = null;
    const _catCharts    = {};

    function _wBodySeries(weights) {
        return (weights || [])
            .filter(w => w.weight > 0)
            .map(w => ({ x: new Date(w.date + 'T00:00:00').getTime(), y: w.weight }));
    }

    function _catVolSeries(logs, mainCat, catTree) {
        const node = (catTree || []).find(n => n.name === mainCat);
        const subs = new Set(node ? (node.children || []).map(c => c.name) : []);
        subs.add(mainCat);
        const byDate = {};
        (logs || []).filter(l => !l.isDeleted).forEach(log => {
            let vol = 0;
            (log.exercises || []).forEach(e => {
                if (!e.categories || !e.categories.some(c => subs.has(c))) return;
                if (e.type !== 'sets') return;
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

    function _crtChartOpts(series, name, isDark, noDataText, color) {
        const c = color || '#3b82f6';
        const textColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)';
        const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
        const now = Date.now();
        return {
            chart: {
                type: 'area', height: 150, background: 'transparent',
                toolbar: { show: false, autoSelected: 'pan' },
                zoom: { type: 'x', enabled: true },
                animations: { enabled: false },
                fontFamily: '"Inter", system-ui, sans-serif',
            },
            series: [{ name, data: series }],
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
            markers: { size: 4, colors: [c], strokeColors: isDark ? '#ffffff' : '#1a1a1a', strokeWidth: 2, hover: { size: 7 } },
            xaxis: {
                type: 'datetime', min: now - 14 * _CRT_DAY_MS, max: now,
                labels: { datetimeUTC: false, format: 'MM/dd', style: { colors: textColor, fontSize: '10px', fontWeight: '700' } },
                axisBorder: { show: false }, axisTicks: { show: false },
            },
            yaxis: { labels: { style: { colors: textColor, fontSize: '10px', fontWeight: '700' } } },
            grid: { borderColor: gridColor, strokeDashArray: 4, padding: { left: 4, right: 8, top: 0, bottom: 0 } },
            tooltip: { theme: isDark ? 'dark' : 'light', x: { format: 'yyyy/MM/dd' }, style: { fontSize: '11px' } },
            noData: {
                text: noDataText, align: 'center', verticalAlign: 'middle',
                style: { fontSize: '12px', fontWeight: '700', color: textColor },
            },
            theme: { mode: isDark ? 'dark' : 'light' },
        };
    }

    function _crtThemeOpts(isDark) {
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

    createApp({
        setup() {
            // ── Nav ───────────────────────────────────────────────────────────
            const {
                navDropdownOpen, currentPageTitle, toggleNavDropdown,
                navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle
            } = useNav();

            const t = computed(() => _wT[navSettings.lang] || _wT.zh);

            const themeStyle = computed(() => ({
                color: 'var(--text-primary)',
                textShadow: 'var(--text-shadow)'
            }));

            // ── Storage ───────────────────────────────────────────────────────
            const STORAGE_KEY = 'lapis_workout';

            const wData       = reactive({ categories: [], logs: [] });
            const libData     = reactive({ exercises: [] });
            const catTree     = ref([]);
            const metricsData = reactive({ weights: [] });

            const persist        = () => localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, categories: wData.categories, logs: wData.logs }));
            const libPersist     = () => localStorage.setItem(LIBRARY_KEY, JSON.stringify(libData.exercises));
            const catsPersist    = () => localStorage.setItem(CATEGORIES_KEY, JSON.stringify(catTree.value));
            const metricsPersist = () => localStorage.setItem(METRICS_KEY, JSON.stringify(metricsData));

            const hydrate = () => {
                const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
                if (raw) {
                    wData.categories = raw.categories || _defaultWorkoutData().categories;
                    wData.logs = (raw.logs || []).map(l => ({
                        ...l,
                        isCompleted: l.isCompleted !== undefined ? l.isCompleted : false,
                        isDeleted:   l.isDeleted   !== undefined ? l.isDeleted   : false,
                    }));
                } else {
                    const def = _defaultWorkoutData();
                    wData.categories = def.categories;
                    wData.logs       = def.logs;
                    persist();
                }
            };

            const hydrateCats = () => {
                const raw = JSON.parse(localStorage.getItem(CATEGORIES_KEY) || 'null');
                catTree.value = (raw && Array.isArray(raw) && raw.length > 0) ? raw : _defaultCategoryTree();
                if (!raw) catsPersist();
            };

            const hydrateLib = () => {
                const raw = JSON.parse(localStorage.getItem(LIBRARY_KEY) || 'null');
                if (raw && Array.isArray(raw) && raw.length > 0) {
                    libData.exercises = raw.map(e => ({
                        ...e,
                        type: e.type === 'sets_reps' ? 'sets' : (e.type || 'sets'),
                        preferredUnit: e.preferredUnit || (e.type === 'duration' ? undefined : 'kg')
                    }));
                } else {
                    const old = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
                    if (old && Array.isArray(old.exercises) && old.exercises.length > 0) {
                        libData.exercises = old.exercises.map(e => ({
                            ...e,
                            type: e.type === 'sets_reps' ? 'sets' : (e.type || 'sets'),
                            preferredUnit: e.preferredUnit || (e.type === 'duration' ? undefined : 'kg')
                        }));
                    } else {
                        libData.exercises = _defaultExercises();
                    }
                    libPersist();
                }
            };

            const hydrateMetrics = () => {
                const raw = JSON.parse(localStorage.getItem(METRICS_KEY) || 'null');
                if (raw) metricsData.weights = raw.weights || [];
            };

            // ── Dynamic category list (from Action Library via WorkoutConfig) ────
            const dynCatCharts = computed(() => {
                void libData.exercises.length; // reactive dependency
                const groups = typeof WorkoutConfig !== 'undefined'
                    ? WorkoutConfig.getAvailableExerciseCategories()
                    : _MAIN_CATS.map(name => ({ main: { name, nameZh: name }, subs: [{ name, nameZh: name }] }));
                return groups.flatMap(g => g.subs.map(s => ({ subCat: s.name, name: s.name, nameZh: s.nameZh })));
            });

            // ── Session state ─────────────────────────────────────────────────
            const activeTab        = ref('workout');
            const recordsSubTab    = ref('today');
            const editingSessionId = ref(null);
            const _now             = () => new Date();
            const _todayStr        = () => toLocalISO(Date.now());
            const logDate          = ref(_todayStr());
            const logTime          = ref({ hour: _now().getHours(), minute: _now().getMinutes() });
            const logExercises     = ref([]);

            // ── Toast ─────────────────────────────────────────────────────────
            const showToast   = ref(false);
            const toastMsg    = ref('');
            let   _toastTimer = null;
            const _toast = (msg) => {
                toastMsg.value = msg; showToast.value = true;
                clearTimeout(_toastTimer);
                _toastTimer = setTimeout(() => { showToast.value = false; }, 2200);
            };

            // ── Lapis picker ──────────────────────────────────────────────────
            const showDateTimePicker = ref(false);
            const pickerMode = ref('date');
            const _picker = typeof LapisPickerManager !== 'undefined'
                ? new LapisPickerManager({
                    dateContainerId: 'lapis-workout-date-picker',
                    timeContainerId: 'lapis-workout-time-picker',
                    getDate: () => { const [y, m, d] = logDate.value.split('-').map(Number); return { year: y, month: m, day: d }; },
                    getTime: () => ({ hour: logTime.value.hour, minute: logTime.value.minute }),
                    setDate: (v) => { logDate.value = v.iso; },
                    setTime: (v) => { logTime.value.hour = v.hour; logTime.value.minute = v.minute; },
                    onOpen:       (visible, mode) => { showDateTimePicker.value = visible; if (mode) pickerMode.value = mode; },
                    onModeChange: (mode) => { pickerMode.value = mode; },
                }) : null;

            const openPicker         = (mode) => _picker && _picker.open(mode);
            const switchPickerMode   = (mode) => _picker ? _picker.switchMode(mode) : (pickerMode.value = mode);
            const closeWorkoutPicker = ()     => _picker ? _picker.close() : (showDateTimePicker.value = false);
            const setPickerToday     = ()     => _picker && _picker.setToday();

            // ── Weight date picker ────────────────────────────────────────────
            const showWeightDatePicker = ref(false);
            let _wdPicker = null;

            const openWeightDatePicker = () => {
                showWeightDatePicker.value = true;
                nextTick(() => {
                    if (_wdPicker && metrics) {
                        const dateStr = metrics.weightForm.date || toLocalISO(Date.now());
                        const [y, m, d] = dateStr.split('-').map(Number);
                        _wdPicker.setValue(y, m, d);
                    }
                });
            };
            const closeWeightDatePicker   = () => { showWeightDatePicker.value = false; };
            const confirmWeightDatePicker = () => {
                if (_wdPicker) _wdPicker.confirm();
                else showWeightDatePicker.value = false;
            };
            const setWeightDateToday = () => {
                if (_wdPicker) {
                    const n = new Date();
                    _wdPicker.setValue(n.getFullYear(), n.getMonth() + 1, n.getDate());
                }
            };

            // ── Library composable ────────────────────────────────────────────
            const lib = useWorkoutLibrary({
                ref, reactive, computed, nextTick,
                libData, catTree, libPersist, catsPersist, navSettings, t, logExercises
            });

            // ── Metrics composable ────────────────────────────────────────────
            const metrics = useWorkoutMetrics({
                ref, computed, reactive,
                wData, metricsData, metricsPersist, navSettings, t, _todayStr, _toast
            });

            // ── Snap charts to today ──────────────────────────────────────────
            const snapChartsToToday = () => {
                const now   = Date.now();
                const range = { xaxis: { min: now - 14 * _CRT_DAY_MS, max: now } };
                if (_wBodyChart) _wBodyChart.updateOptions(range, false, true);
                Object.values(_catCharts).forEach(c => c.updateOptions(range, false, true));
            };

            // ── Add tab — exercise actions ────────────────────────────────────
            const addSet = (eIdx) => {
                const prev = logExercises.value[eIdx].sets.slice(-1)[0] || {};
                logExercises.value[eIdx].sets.push({ reps: prev.reps || '', numSets: prev.numSets || '1', weight: prev.weight || '', done: false });
            };
            const removeSet         = (eIdx, sIdx) => logExercises.value[eIdx].sets.splice(sIdx, 1);
            const toggleSetDone     = (eIdx, sIdx) => { logExercises.value[eIdx].sets[sIdx].done = !logExercises.value[eIdx].sets[sIdx].done; };
            const removeLogExercise = (eIdx)       => logExercises.value.splice(eIdx, 1);

            // ── Save log ──────────────────────────────────────────────────────
            const shellStyle = computed(() => isDarkTheme.value
                ? { background: 'rgba(15,20,38,0.88)', color: '#ffffff', borderTop: '1px solid rgba(255,255,255,0.08)' }
                : { background: 'rgba(245,248,255,0.92)', color: '#1a1a1a', borderTop: '1px solid rgba(0,0,0,0.05)' }
            );

            const saveLog = () => {
                if (logExercises.value.length === 0) return;
                const isEditing = !!editingSessionId.value;
                const existing  = isEditing ? wData.logs.find(l => l.id === editingSessionId.value) : null;
                const entry = {
                    id:          isEditing ? editingSessionId.value : _wUid(),
                    date:        logDate.value,
                    time:        { ...logTime.value },
                    exercises:   JSON.parse(JSON.stringify(logExercises.value)),
                    isCompleted: existing ? existing.isCompleted : false,
                    isDeleted:   existing ? existing.isDeleted   : false,
                };
                const idx = isEditing ? wData.logs.findIndex(l => l.id === editingSessionId.value) : -1;
                if (idx >= 0) wData.logs.splice(idx, 1, entry);
                else          wData.logs.unshift(entry);
                persist();
                _toast(t.value.logSaved);
            };

            // ── Log modal ─────────────────────────────────────────────────────
            const showLogModal = ref(false);

            const saveLogAndClose = () => {
                saveLog();
                showLogModal.value = false; editingSessionId.value = null; logExercises.value = [];
            };
            const discardAndClose = () => {
                if (logExercises.value.length > 0 && !confirm(t.value.discardConfirm)) return;
                showLogModal.value = false; editingSessionId.value = null; logExercises.value = [];
            };
            const openNewSession = () => {
                editingSessionId.value = null;
                logDate.value = _todayStr();
                const now = new Date();
                logTime.value = { hour: now.getHours(), minute: now.getMinutes() };
                logExercises.value = [];
                showLogModal.value = true;
            };
            const openEditSession = (session) => {
                editingSessionId.value = session.id;
                logDate.value = session.date;
                logTime.value = { hour: session.time.hour, minute: session.time.minute };
                logExercises.value = JSON.parse(JSON.stringify(session.exercises));
                showLogModal.value = true;
            };

            // ── Session management ────────────────────────────────────────────
            const softDeleteSession = (id) => {
                const s = wData.logs.find(l => l.id === id);
                if (s) { s.isDeleted = true; persist(); _toast(t.value.logDeleted); }
            };
            const restoreSession = (id) => {
                const s = wData.logs.find(l => l.id === id);
                if (s) { s.isDeleted = false; persist(); _toast(t.value.restoreMsg); }
            };
            const permanentDeleteSession = (id) => {
                if (!confirm(t.value.deleteConfirm)) return;
                const idx = wData.logs.findIndex(l => l.id === id);
                if (idx >= 0) { wData.logs.splice(idx, 1); persist(); }
            };
            const toggleComplete = (id) => {
                const s = wData.logs.find(l => l.id === id);
                if (s) { s.isCompleted = !s.isCompleted; persist(); }
            };
            const toggleExerciseComplete = (sessionId, exIdx) => {
                const s = wData.logs.find(l => l.id === sessionId);
                if (s && s.exercises[exIdx] !== undefined) {
                    s.exercises[exIdx].isCompleted = !s.exercises[exIdx].isCompleted;
                    persist();
                }
            };

            // ── Settings ──────────────────────────────────────────────────────
            const showClearConfirm = ref(false);
            const confirmModal = reactive({ show: false, title: '', message: '', onConfirm: null });

            const clearAllData = () => {
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(LIBRARY_KEY);
                localStorage.removeItem(CATEGORIES_KEY);
                const def = _defaultWorkoutData();
                wData.categories  = def.categories;
                wData.logs        = def.logs;
                libData.exercises = _defaultExercises();
                catTree.value     = _defaultCategoryTree();
                logExercises.value     = [];
                logDate.value          = _todayStr();
                editingSessionId.value = null;
                metricsData.weights    = [];
                showClearConfirm.value = false;
                persist(); libPersist(); catsPersist(); metricsPersist();
            };

            const toggleLang = () => {
                navSettings.lang = navSettings.lang === 'zh' ? 'en' : 'zh';
                StorageProvider.saveCommonSettings(navSettings);
            };

            // ── Modal tracking ────────────────────────────────────────────────
            const isAnyModalOpen = computed(() =>
                showDateTimePicker.value || showLogModal.value ||
                lib.showPickModal.value  || lib.showExModal.value  ||
                lib.showCatMgr.value     || showClearConfirm.value ||
                confirmModal.show        || lib.showExDetail.value ||
                metrics.showPRModal.value || metrics.weightHistoryModal.value
            );

            // ── Lifecycle ─────────────────────────────────────────────────────
            onMounted(() => {
                hydrate(); hydrateCats(); hydrateLib(); hydrateMetrics();
                if (typeof LapisNav !== 'undefined')   LapisNav.inject({ bottom: false });
                if (typeof LapisModal !== 'undefined') LapisModal.init();
                if (_picker) _picker.init();
                if (typeof LapisDatePicker !== 'undefined') {
                    const wdEl = document.getElementById('weight-date-picker');
                    if (wdEl) {
                        const n = new Date();
                        _wdPicker = new LapisDatePicker(wdEl, {
                            year: n.getFullYear(), month: n.getMonth() + 1, day: n.getDate(),
                            onConfirm(val) {
                                metrics.weightForm.date = val.iso;
                                metrics.weightForm.ts   = new Date(val.iso + 'T00:00:00').getTime();
                                showWeightDatePicker.value = false;
                            }
                        });
                    }
                }
                // ── ApexCharts init ─────────────────────────────────────────
                if (typeof ApexCharts !== 'undefined') {
                    const dark     = isDarkTheme.value;
                    const noData   = t.value.noChartData || 'No data';
                    const catSetts = navSettings.workoutCatCharts || {};

                    if (navSettings.showWeightChart !== false) {
                        const el = document.getElementById('wk-weight-chart');
                        if (el) {
                            _wBodyChart = new ApexCharts(el, _crtChartOpts(
                                _wBodySeries(metricsData.weights),
                                t.value.chartWeight || 'Weight (kg)',
                                dark, noData
                            ));
                            _wBodyChart.render();
                        }
                    }

                    dynCatCharts.value.forEach((item, idx) => {
                        if (catSetts[item.subCat] === false) return;
                        const el = document.getElementById('wk-cat-chart-' + item.subCat);
                        if (!el) return;
                        const label = navSettings.lang === 'zh' ? (item.nameZh || item.name) : item.name;
                        const color = Array.isArray(LapisChartPalette)
                            ? LapisChartPalette[idx % LapisChartPalette.length]
                            : '#3b82f6';
                        _catCharts[item.subCat] = new ApexCharts(el, _crtChartOpts(
                            _catVolSeries(wData.logs, item.subCat, catTree.value),
                            label + ' Vol (kg)', dark, noData, color
                        ));
                        _catCharts[item.subCat].render();
                    });
                }

                nextTick(() => lucide.createIcons());
                if (typeof ParticleEngine !== 'undefined' && navSettings.effect && navSettings.effect !== 'none') {
                    ParticleEngine.setEffect(navSettings.effect);
                }
            });

            watch(isDarkTheme, (dark) => {
                const opts = _crtThemeOpts(dark);
                if (_wBodyChart) _wBodyChart.updateOptions(opts, false, false);
                Object.values(_catCharts).forEach(c => c.updateOptions(opts, false, false));
            });

            watch(navDropdownOpen, () => nextTick(() => lucide.createIcons()));
            watch(activeTab, () => nextTick(() => lucide.createIcons()));
            watch(isAnyModalOpen, () => nextTick(() => lucide.createIcons()));
            watch(() => libData.exercises.length, () => nextTick(() => lucide.createIcons()));
            watch(() => logExercises.value.length, () => nextTick(() => lucide.createIcons()));
            watch(lib.filteredPick, () => nextTick(() => lucide.createIcons()));
            watch(() => navSettings.lang, () => {
                currentPageTitle.value = navSettings.lang === 'zh' ? '琉璃健身' : 'Glassy Workout';
                nextTick(() => lucide.createIcons());
            });

            // ── Return ────────────────────────────────────────────────────────
            return {
                // nav
                navDropdownOpen, currentPageTitle, toggleNavDropdown,
                navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle, themeStyle, t,
                // tabs
                activeTab, recordsSubTab, editingSessionId,
                // session form
                logDate, logTime, logExercises,
                addSet, removeSet, toggleSetDone, removeLogExercise, saveLog,
                showToast, toastMsg,
                // lapis picker (session date/time)
                showDateTimePicker, pickerMode,
                openPicker, switchPickerMode, closeWorkoutPicker, setPickerToday,
                // weight date picker
                showWeightDatePicker, openWeightDatePicker, closeWeightDatePicker, confirmWeightDatePicker, setWeightDateToday,
                // charts
                dynCatCharts, snapChartsToToday,
                // log modal
                showLogModal, shellStyle, saveLogAndClose, discardAndClose,
                openNewSession, openEditSession,
                // session management
                softDeleteSession, restoreSession, permanentDeleteSession,
                toggleComplete, toggleExerciseComplete,
                // settings
                showClearConfirm, clearAllData, toggleLang, confirmModal,
                // category tree (used by filter chips in template)
                catTree,
                // metrics data (used directly by weight-log template)
                metricsData,
                // modal guard
                isAnyModalOpen,
                // icon constants
                ICON_CHECK, ICON_EDIT, ICON_TRASH, ICON_RESTORE, ICON_X,
                ICON_CALENDAR, ICON_CLOCK, ICON_DUMBBELL, ICON_TIMER,
                ICON_CIRCLE, ICON_MINUS, ICON_SEARCH, ICON_PLUS, ICON_PLUS_CIRCLE,
                // library composable
                ...lib,
                // metrics composable
                ...metrics,
            };
        }
    }).component('LapisConfirm', window.LapisConfirm).mount('#app');
});
