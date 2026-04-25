// workout.js — Glassy Workout Vue app (session CRUD + orchestration)
// Depends on: workout_data.js, workout_metrics.js, workout_library_ui.js, storage.js, nav.js

window.addEventListener('DOMContentLoaded', () => {
    const { createApp, ref, reactive, computed, watch, onMounted, nextTick } = Vue;

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

            // ── Session state ─────────────────────────────────────────────────
            const activeTab        = ref('workout');
            const recordsSubTab    = ref('today');
            const editingSessionId = ref(null);
            const _now             = () => new Date();
            const _todayStr        = () => _now().toISOString().split('T')[0];
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
                metrics.showPRModal.value
            );

            // ── Lifecycle ─────────────────────────────────────────────────────
            onMounted(() => {
                hydrate(); hydrateCats(); hydrateLib(); hydrateMetrics();
                if (typeof LapisNav !== 'undefined')   LapisNav.inject({ bottom: false });
                if (typeof LapisModal !== 'undefined') LapisModal.init();
                if (_picker) _picker.init();
                nextTick(() => lucide.createIcons());
                if (typeof ParticleEngine !== 'undefined' && navSettings.effect && navSettings.effect !== 'none') {
                    ParticleEngine.setEffect(navSettings.effect);
                }
                document.body.classList.add('lapis-ready');
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
                // lapis picker
                showDateTimePicker, pickerMode,
                openPicker, switchPickerMode, closeWorkoutPicker, setPickerToday,
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
