// workout.js — Glassy Workout Vue app v1.0
// Depends on: storage.js (StorageProvider), nav.js (useNav)

// ── Module-level helpers ──────────────────────────────────────────────────
const _wUid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const LIBRARY_KEY = 'lapis_workout_library';

const _defaultExercises = () => [
    { id: _wUid(), name: 'Bench Press',    nameZh: '槓鈴臥推',   categories: ['Push','Chest'],         type: 'sets', preferredUnit: 'kg' },
    { id: _wUid(), name: 'Squat',          nameZh: '深蹲',       categories: ['Legs'],                 type: 'sets', preferredUnit: 'kg' },
    { id: _wUid(), name: 'Deadlift',       nameZh: '硬舉',       categories: ['Pull','Back','Legs'],   type: 'sets', preferredUnit: 'kg' },
    { id: _wUid(), name: 'Pull-up',        nameZh: '引體向上',   categories: ['Pull','Back'],          type: 'sets', preferredUnit: 'kg' },
    { id: _wUid(), name: 'Overhead Press', nameZh: '肩推',       categories: ['Push','Shoulders'],     type: 'sets', preferredUnit: 'kg' },
    { id: _wUid(), name: 'Barbell Row',    nameZh: '槓鈴划船',   categories: ['Pull','Back'],          type: 'sets', preferredUnit: 'kg' },
    { id: _wUid(), name: 'Bicep Curl',     nameZh: '二頭彎舉',   categories: ['Arms'],                 type: 'sets', preferredUnit: 'kg' },
    { id: _wUid(), name: 'Tricep Dip',     nameZh: '三頭撐',     categories: ['Push','Arms'],          type: 'sets', preferredUnit: 'kg' },
    { id: _wUid(), name: 'Lateral Raise',  nameZh: '啞鈴側平舉', categories: ['Shoulders'],            type: 'sets', preferredUnit: 'g'  },
    { id: _wUid(), name: 'Leg Press',      nameZh: '腿推',       categories: ['Legs'],                 type: 'sets', preferredUnit: 'kg' },
    { id: _wUid(), name: 'Plank',          nameZh: '棒式',       categories: ['Core'],                 type: 'duration' },
    { id: _wUid(), name: 'Running',        nameZh: '跑步機',     categories: ['Cardio'],               type: 'duration' },
    { id: _wUid(), name: 'Cycling',        nameZh: '騎單車',     categories: ['Cardio'],               type: 'duration' },
];

const _defaultWorkoutData = () => ({
    version: 1,
    categories: ['Push','Pull','Legs','Core','Cardio','Back','Chest','Shoulders','Arms'],
    logs: []
});

const _catLabels = {
    Push: '推', Pull: '拉', Legs: '腿部', Core: '核心',
    Cardio: '有氧', Back: '背部', Chest: '胸部', Shoulders: '肩部', Arms: '手臂'
};

// ── Translations ──────────────────────────────────────────────────────────
const _wT = {
    zh: {
        navIndex: '琉璃待辦', navShift: '琉璃輪班', navSetting: '系統設定', navWorkout: '琉璃健身',
        tabAdd: '新增', tabExercises: '所有訓練動作', tabRecords: '紀錄', tabSettings: '設定',
        date: '日期', time: '時間', today: '今天',
        setsReps: '組數 / 次數', duration: '時間',
        weight: '重量', reps: '次數', sets: '組', minutes: '分鐘', min: 'min', kg: 'kg',
        addExercise: '新增訓練動作', saveLog: '儲存訓練紀錄',
        noExercises: '尚未記錄任何動作', noLogs: '尚無訓練紀錄', noLibrary: '動作庫為空',
        search: '搜尋動作…', all: '全部',
        edit: '編輯', delete: '刪除', save: '儲存', cancel: '取消', confirm: '確認',
        addToLibrary: '新增至動作庫', editExercise: '編輯動作',
        exerciseNameEn: '動作名稱（英文）', exerciseNameZh: '動作名稱（中文，選填）',
        selectCategories: '選擇類別（可複選）', trackingType: '紀錄方式',
        addSet: '新增組數', selectExercise: '選擇動作',
        deleteConfirm: '確定要刪除嗎？此操作無法復原。',
        clearData: '清除所有訓練資料', clearConfirm: '確定要清除所有訓練資料嗎？此操作無法復原。',
        lang: '語言', langZh: '繁體中文', langEn: 'English',
        statsTitle: '訓練統計', totalWorkouts: '累計訓練次數', thisWeek: '本週訓練',
        totalVolume: '累計訓練量', favExercise: '最常訓練', times: '次', kg_unit: 'kg',
        logSaved: '訓練紀錄已儲存！', logDeleted: '紀錄已刪除',
        exerciseCount: '動作', sets_unit: '組',
        unit: '單位',
        about: '關於', version: '版本 1.0',
        manageCategories: '管理類別',
    },
    en: {
        navIndex: 'Glassy Todo', navShift: 'Glassy Shift', navSetting: 'Settings', navWorkout: 'Glassy Workout',
        tabAdd: 'Add', tabExercises: 'Exercises', tabRecords: 'Records', tabSettings: 'Settings',
        date: 'Date', time: 'Time', today: 'Today',
        setsReps: 'Sets / Reps', duration: 'Duration',
        weight: 'Weight', reps: 'Reps', sets: 'Set', minutes: 'Minutes', min: 'min', kg: 'kg',
        addExercise: 'Add Exercise', saveLog: 'Save Workout Log',
        noExercises: 'No exercises logged yet', noLogs: 'No workout records yet', noLibrary: 'Library is empty',
        search: 'Search exercises…', all: 'All',
        edit: 'Edit', delete: 'Delete', save: 'Save', cancel: 'Cancel', confirm: 'Confirm',
        addToLibrary: 'Add to Library', editExercise: 'Edit Exercise',
        exerciseNameEn: 'Exercise Name (English)', exerciseNameZh: 'Exercise Name (Chinese, optional)',
        selectCategories: 'Select Categories (multi-select)', trackingType: 'Tracking Type',
        addSet: 'Add Set', selectExercise: 'Select Exercise',
        deleteConfirm: 'Confirm delete? This cannot be undone.',
        clearData: 'Clear All Workout Data', clearConfirm: 'Clear all workout data? This cannot be undone.',
        lang: 'Language', langZh: '繁體中文', langEn: 'English',
        statsTitle: 'Workout Stats', totalWorkouts: 'Total Workouts', thisWeek: 'This Week',
        totalVolume: 'Total Volume', favExercise: 'Favorite Exercise', times: 'times', kg_unit: 'kg',
        logSaved: 'Workout saved!', logDeleted: 'Record deleted',
        exerciseCount: 'exercises', sets_unit: 'sets',
        unit: 'Unit',
        about: 'About', version: 'Version 1.0',
        manageCategories: 'Manage Categories',
    }
};

// ── App bootstrap ─────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    const { createApp, ref, reactive, computed, watch, onMounted, nextTick } = Vue;

    createApp({
        setup() {
            // ── Nav ───────────────────────────────────────────────────────
            const {
                navDropdownOpen, currentPageTitle, toggleNavDropdown,
                navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle
            } = useNav();

            const t = computed(() => _wT[navSettings.lang] || _wT.zh);

            const themeStyle = computed(() => ({
                color: 'var(--text-primary)',
                textShadow: 'var(--text-shadow)'
            }));

            // ── Storage ───────────────────────────────────────────────────
            const STORAGE_KEY = 'lapis_workout';

            const wData  = reactive({ categories: [], logs: [] });
            const libData = reactive({ exercises: [] });

            const persist = () => {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    version: 1, categories: wData.categories, logs: wData.logs
                }));
            };

            const libPersist = () => {
                localStorage.setItem(LIBRARY_KEY, JSON.stringify(libData.exercises));
            };

            const hydrate = () => {
                const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
                if (raw) {
                    wData.categories = raw.categories || _defaultWorkoutData().categories;
                    wData.logs       = raw.logs       || [];
                } else {
                    const def = _defaultWorkoutData();
                    wData.categories = def.categories;
                    wData.logs       = def.logs;
                    persist();
                }
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
                    // migrate from legacy lapis_workout if present
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

            // ── Tabs ──────────────────────────────────────────────────────
            const activeTab = ref('add');

            // ── ADD TAB — date/time state ─────────────────────────────────
            const _now = () => new Date();
            const _todayStr = () => _now().toISOString().split('T')[0];

            const logDate = ref(_todayStr());
            const logTime = ref({ hour: _now().getHours(), minute: _now().getMinutes() });
            const logExercises = ref([]); // [{exerciseId, name, nameZh, type, categories, sets[], minutes}]

            // Load existing log for the selected date whenever date changes
            watch(logDate, (d) => {
                const existing = wData.logs.find(l => l.date === d);
                if (existing) {
                    logExercises.value = JSON.parse(JSON.stringify(existing.exercises));
                    logTime.value = { hour: existing.time.hour, minute: existing.time.minute };
                } else {
                    logExercises.value = [];
                }
            });

            const hasExistingLog = computed(() => wData.logs.some(l => l.date === logDate.value));

            // ── DRUM-ROLL PICKER ──────────────────────────────────────────
            const showDateTimePicker = ref(false);
            const pickerMode = ref('date'); // 'date' | 'time'

            const yearCol   = ref(null);
            const monthCol  = ref(null);
            const dayCol    = ref(null);
            const hourCol   = ref(null);
            const minuteCol = ref(null);

            const pickerData = reactive({
                years: Array.from({ length: 2099 - 1970 + 1 }, (_, i) => 1970 + i)
            });

            const pickerYear   = computed(() => parseInt(logDate.value.slice(0, 4), 10));
            const pickerMonth  = computed(() => parseInt(logDate.value.slice(5, 7), 10));
            const pickerDay    = computed(() => parseInt(logDate.value.slice(8, 10), 10));
            const pickerHour   = computed(() => logTime.value.hour);
            const pickerMinute = computed(() => logTime.value.minute);
            const pickerMaxDays = computed(() => {
                const [y, m] = logDate.value.split('-').map(Number);
                return new Date(y, m, 0).getDate();
            });
            const pickerDateStr = computed(() => logDate.value.replace(/-/g, '/'));
            const pickerTimeStr = computed(() =>
                `${logTime.value.hour.toString().padStart(2, '0')}:${logTime.value.minute.toString().padStart(2, '0')}`
            );

            const PICKER_H = 44;

            const _isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
            const _maxD   = (m, y) => {
                if ([4,6,9,11].includes(m)) return 30;
                if (m === 2) return _isLeap(y) ? 29 : 28;
                return 31;
            };

            const scrollPickerCols = () => {
                nextTick(() => {
                    if (pickerMode.value === 'date') {
                        if (yearCol.value)   yearCol.value.scrollTop   = (pickerYear.value - 1970) * PICKER_H;
                        if (monthCol.value)  monthCol.value.scrollTop  = (pickerMonth.value - 1)   * PICKER_H;
                        if (dayCol.value)    dayCol.value.scrollTop    = (pickerDay.value - 1)     * PICKER_H;
                    } else {
                        if (hourCol.value)   hourCol.value.scrollTop   = pickerHour.value   * PICKER_H;
                        if (minuteCol.value) minuteCol.value.scrollTop = pickerMinute.value * PICKER_H;
                    }
                });
            };

            const openPicker = (mode) => {
                pickerMode.value = mode;
                showDateTimePicker.value = true;
                setTimeout(scrollPickerCols, 60);
            };

            const switchPickerMode = (mode) => {
                pickerMode.value = mode;
                setTimeout(scrollPickerCols, 20);
            };

            const _setLogDate = (y, m, d) => {
                const maxD = _maxD(m, y);
                if (d > maxD) d = maxD;
                logDate.value = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            };

            const updatePickerDate = (type, val) => {
                let y = pickerYear.value, m = pickerMonth.value, d = pickerDay.value;
                if (type === 'year')  y = ((val - 1970 + 130) % 130) + 1970;
                if (type === 'month') m = ((val - 1 + 12) % 12) + 1;
                if (type === 'day')   d = ((val - 1 + _maxD(m, y)) % _maxD(m, y)) + 1;
                _setLogDate(y, m, d);
            };

            const selectPickerYear   = (y) => updatePickerDate('year', y);
            const selectPickerMonth  = (m) => updatePickerDate('month', m);
            const selectPickerDay    = (d) => updatePickerDate('day', d);
            const selectPickerHour   = (h) => { logTime.value.hour   = h; };
            const selectPickerMinute = (m) => { logTime.value.minute = m; };

            const onPickerDateInput = (e) => {
                const match = e.target.value.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
                if (!match) return;
                const [, y, mo, d] = match.map(Number);
                if (y >= 1970 && y <= 2099 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31)
                    _setLogDate(y, mo, d);
                setTimeout(scrollPickerCols, 20);
            };

            const onPickerTimeInput = (e) => {
                const match = e.target.value.match(/^(\d{1,2}):(\d{1,2})$/);
                if (!match) return;
                const [, h, mi] = match.map(Number);
                if (h >= 0 && h <= 23)  logTime.value.hour   = h;
                if (mi >= 0 && mi <= 59) logTime.value.minute = mi;
                setTimeout(scrollPickerCols, 20);
            };

            const setPickerToday = () => {
                logDate.value = _todayStr();
            };

            // ── ADD TAB — exercise actions ────────────────────────────────
            const addSet = (eIdx) => {
                const prev = logExercises.value[eIdx].sets.slice(-1)[0] || {};
                logExercises.value[eIdx].sets.push({
                    weight: prev.weight || '',
                    reps:   prev.reps   || '',
                    done:   false
                });
            };

            const removeSet = (eIdx, sIdx) => {
                logExercises.value[eIdx].sets.splice(sIdx, 1);
            };

            const toggleSetDone = (eIdx, sIdx) => {
                logExercises.value[eIdx].sets[sIdx].done = !logExercises.value[eIdx].sets[sIdx].done;
            };

            const removeLogExercise = (eIdx) => {
                logExercises.value.splice(eIdx, 1);
            };

            // ── ADD TAB — save log ────────────────────────────────────────
            const showToast   = ref(false);
            const toastMsg    = ref('');
            let   _toastTimer = null;

            const _toast = (msg) => {
                toastMsg.value = msg;
                showToast.value = true;
                clearTimeout(_toastTimer);
                _toastTimer = setTimeout(() => { showToast.value = false; }, 2200);
            };

            const saveLog = () => {
                if (logExercises.value.length === 0) return;
                const entry = {
                    id:        _wUid(),
                    date:      logDate.value,
                    time:      { ...logTime.value },
                    exercises: JSON.parse(JSON.stringify(logExercises.value))
                };
                const idx = wData.logs.findIndex(l => l.date === logDate.value);
                if (idx >= 0) wData.logs.splice(idx, 1, entry);
                else          wData.logs.unshift(entry);
                persist();
                _toast(t.value.logSaved);
            };

            // ── PICK-EXERCISE MODAL (add to log) ─────────────────────────
            const showPickModal  = ref(false);
            const pickSearch     = ref('');
            const pickCategory   = ref('');

            const filteredPick = computed(() => {
                let list = libData.exercises;
                const q = pickSearch.value.toLowerCase();
                if (q) list = list.filter(e =>
                    e.name.toLowerCase().includes(q) ||
                    (e.nameZh && e.nameZh.includes(q))
                );
                if (pickCategory.value) list = list.filter(e => e.categories.includes(pickCategory.value));
                return list;
            });

            const pickExercise = (ex) => {
                const isSets = ex.type === 'sets' || ex.type === 'sets_reps';
                logExercises.value.push({
                    exerciseId:    ex.id,
                    name:          ex.name,
                    nameZh:        ex.nameZh || '',
                    type:          isSets ? 'sets' : 'duration',
                    preferredUnit: isSets ? (ex.preferredUnit || 'kg') : undefined,
                    categories:    [...ex.categories],
                    sets:          isSets ? [{ weight: '', reps: '', done: false }] : [],
                    minutes:       isSets ? undefined : ''
                });
                showPickModal.value = false;
                pickSearch.value    = '';
                pickCategory.value  = '';
            };

            // ── EXERCISES TAB ─────────────────────────────────────────────
            const libSearch   = ref('');
            const libCategory = ref('');

            const filteredLib = computed(() => {
                let list = libData.exercises;
                const q = libSearch.value.toLowerCase();
                if (q) list = list.filter(e =>
                    e.name.toLowerCase().includes(q) ||
                    (e.nameZh && e.nameZh.includes(q))
                );
                if (libCategory.value) list = list.filter(e => e.categories.includes(libCategory.value));
                return list;
            });

            const showExModal = ref(false);
            const isEditEx    = ref(false);
            const editExId    = ref(null);

            const exForm = reactive({ name: '', nameZh: '', categories: [], type: 'sets', unit: 'kg' });

            const openAddEx = () => {
                isEditEx.value = false;
                editExId.value = null;
                Object.assign(exForm, { name: '', nameZh: '', categories: [], type: 'sets', unit: 'kg' });
                showExModal.value = true;
            };

            const openEditEx = (ex) => {
                isEditEx.value = true;
                editExId.value = ex.id;
                const normType = (ex.type === 'sets_reps') ? 'sets' : (ex.type || 'sets');
                Object.assign(exForm, {
                    name: ex.name, nameZh: ex.nameZh || '',
                    categories: [...ex.categories],
                    type: normType,
                    unit: ex.preferredUnit || 'kg'
                });
                showExModal.value = true;
            };

            const toggleExCat = (cat) => {
                const idx = exForm.categories.indexOf(cat);
                if (idx >= 0) exForm.categories.splice(idx, 1);
                else          exForm.categories.push(cat);
            };

            const saveEx = () => {
                if (!exForm.name.trim()) return;
                const payload = {
                    name:          exForm.name.trim(),
                    nameZh:        exForm.nameZh.trim(),
                    categories:    [...exForm.categories],
                    type:          exForm.type,
                    preferredUnit: exForm.type === 'sets' ? exForm.unit : undefined
                };
                if (isEditEx.value) {
                    const idx = libData.exercises.findIndex(e => e.id === editExId.value);
                    if (idx >= 0) libData.exercises.splice(idx, 1, { ...libData.exercises[idx], ...payload });
                } else {
                    libData.exercises.push({ id: _wUid(), ...payload });
                }
                libPersist();
                showExModal.value = false;
            };

            const deleteEx = (id) => {
                if (!confirm(t.value.deleteConfirm)) return;
                const idx = libData.exercises.findIndex(e => e.id === id);
                if (idx >= 0) libData.exercises.splice(idx, 1);
                libPersist();
            };

            // ── RECORDS TAB ───────────────────────────────────────────────
            const sortedLogs    = computed(() =>
                [...wData.logs].sort((a, b) => b.date.localeCompare(a.date))
            );
            const expandedLogId = ref(null);

            const toggleExpand = (id) => {
                expandedLogId.value = expandedLogId.value === id ? null : id;
            };

            const deleteLog = (id) => {
                if (!confirm(t.value.deleteConfirm)) return;
                const idx = wData.logs.findIndex(l => l.id === id);
                if (idx >= 0) wData.logs.splice(idx, 1);
                persist();
                _toast(t.value.logDeleted);
            };

            // Compute a brief summary for a log entry
            const _isSets = (type) => type === 'sets' || type === 'sets_reps';

            const logSummary = (log) => {
                const exCount = log.exercises.length;
                let totalSets = 0;
                log.exercises.forEach(e => { if (_isSets(e.type)) totalSets += (e.sets || []).length; });
                return { exCount, totalSets };
            };

            const logVolume = (log) => {
                let vol = 0;
                log.exercises.forEach(e => {
                    if (_isSets(e.type)) {
                        (e.sets || []).forEach(s => {
                            const w = parseFloat(s.weight), r = parseInt(s.reps);
                            if (!isNaN(w) && !isNaN(r)) vol += w * r;
                        });
                    }
                });
                return vol > 0 ? `${Math.round(vol)} kg` : null;
            };

            const exDisplayName = (entry) =>
                (navSettings.lang === 'zh' && entry.nameZh) ? entry.nameZh : entry.name;

            // ── STATS ─────────────────────────────────────────────────────
            const stats = computed(() => {
                const logs = wData.logs;
                const now  = new Date();
                const mon  = new Date(now);
                mon.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // ISO Monday
                const monStr = mon.toISOString().split('T')[0];

                let totalVol = 0, exCount = {};
                logs.forEach(log => {
                    log.exercises.forEach(e => {
                        exCount[e.name] = (exCount[e.name] || 0) + 1;
                        if (_isSets(e.type)) {
                            (e.sets || []).forEach(s => {
                                const w = parseFloat(s.weight), r = parseInt(s.reps);
                                if (!isNaN(w) && !isNaN(r)) totalVol += w * r;
                            });
                        }
                    });
                });

                const fav = Object.entries(exCount).sort((a, b) => b[1] - a[1])[0];
                return {
                    total:    logs.length,
                    thisWeek: logs.filter(l => l.date >= monStr).length,
                    totalVol: Math.round(totalVol),
                    fav:      fav ? fav[0] : '—'
                };
            });

            // ── SETTINGS TAB ──────────────────────────────────────────────
            const showClearConfirm = ref(false);

            const clearAllData = () => {
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(LIBRARY_KEY);
                const def = _defaultWorkoutData();
                wData.categories  = def.categories;
                wData.logs        = def.logs;
                libData.exercises = _defaultExercises();
                logExercises.value     = [];
                logDate.value          = _todayStr();
                showClearConfirm.value = false;
                persist();
                libPersist();
            };

            const toggleLang = () => {
                navSettings.lang = navSettings.lang === 'zh' ? 'en' : 'zh';
                StorageProvider.saveCommonSettings(navSettings);
            };

            // ── Modal / overlay state ────────────────────────────────────
            const isAnyModalOpen = computed(() =>
                showDateTimePicker.value ||
                showPickModal.value      ||
                showExModal.value        ||
                showClearConfirm.value
            );

            // ── Display helpers ───────────────────────────────────────────
            const catLabel  = (cat) => navSettings.lang !== 'zh' ? cat : (_catLabels[cat] || cat);
            const unitLabel = (ex)  => ex.type === 'duration'
                ? t.value.min
                : `${ex.preferredUnit || 'kg'}/${t.value.sets_unit}`;

            // ── Lifecycle ─────────────────────────────────────────────────
            onMounted(() => {
                hydrate();
                hydrateLib();
                // Load today's log if exists
                const existing = wData.logs.find(l => l.date === logDate.value);
                if (existing) {
                    logExercises.value = JSON.parse(JSON.stringify(existing.exercises));
                    logTime.value = { ...existing.time };
                }
                nextTick(() => lucide.createIcons());
                if (typeof ParticleEngine !== 'undefined' && navSettings.effect && navSettings.effect !== 'none') {
                    ParticleEngine.setEffect(navSettings.effect);
                }
            });

            watch(navDropdownOpen, () => nextTick(() => lucide.createIcons()));
            watch(activeTab, () => nextTick(() => lucide.createIcons()));
            watch(isAnyModalOpen, () => nextTick(() => lucide.createIcons()));
            watch(() => navSettings.lang, () => {
                currentPageTitle.value = navSettings.lang === 'zh' ? '琉璃健身' : 'Glassy Workout';
                nextTick(() => lucide.createIcons());
            });

            // ── Return ────────────────────────────────────────────────────
            return {
                // nav
                navDropdownOpen, currentPageTitle, toggleNavDropdown,
                navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle,
                themeStyle, t,
                // tabs
                activeTab,
                // add tab
                logDate, logTime, logExercises, hasExistingLog,
                addSet, removeSet, toggleSetDone, removeLogExercise, saveLog,
                showToast, toastMsg,
                // drum-roll picker
                showDateTimePicker, pickerMode,
                yearCol, monthCol, dayCol, hourCol, minuteCol,
                pickerData,
                pickerYear, pickerMonth, pickerDay, pickerHour, pickerMinute,
                pickerMaxDays, pickerDateStr, pickerTimeStr,
                openPicker, switchPickerMode, scrollPickerCols, setPickerToday,
                selectPickerYear, selectPickerMonth, selectPickerDay,
                selectPickerHour, selectPickerMinute,
                onPickerDateInput, onPickerTimeInput,
                // pick exercise modal
                showPickModal, pickSearch, pickCategory, filteredPick, pickExercise,
                // exercises tab
                libData, libSearch, libCategory, filteredLib,
                showExModal, isEditEx, exForm, openAddEx, openEditEx,
                toggleExCat, saveEx, deleteEx,
                catLabel, unitLabel,
                // records tab
                sortedLogs, expandedLogId, toggleExpand, deleteLog,
                logSummary, logVolume, exDisplayName,
                // stats
                stats,
                // settings
                showClearConfirm, clearAllData, toggleLang,
                // shared
                wData, isAnyModalOpen,
            };
        }
    }).mount('#app');
});
