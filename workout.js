// workout.js — Glassy Workout Vue app v1.0
// Depends on: storage.js (StorageProvider), nav.js (useNav)

// ── Module-level helpers ──────────────────────────────────────────────────
const _wUid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ── Static SVG icon constants (no Lucide runtime dependency) ─────────────
const ICON_CHECK       = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_EDIT        = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`;
const ICON_TRASH       = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
const ICON_RESTORE     = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;
const ICON_X           = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const ICON_CALENDAR    = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
const ICON_CLOCK       = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
const ICON_DUMBBELL    = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v16"/><path d="M18 4v16"/><path d="M6 8h12"/><path d="M6 16h12"/><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h.5"/><path d="M3 17.5A1.5 1.5 0 0 0 4.5 19h.5"/><path d="M21 6.5A1.5 1.5 0 0 0 19.5 5h-.5"/><path d="M21 17.5A1.5 1.5 0 0 1 19.5 19h-.5"/></svg>`;
const ICON_TIMER       = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
const ICON_CIRCLE      = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`;
const ICON_MINUS       = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const ICON_SEARCH      = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
const ICON_PLUS        = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const ICON_PLUS_CIRCLE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`;

// ── Month name lookup tables ───────────────────────────────────────────────
const _MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const _MONTHS_ZH = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

const LIBRARY_KEY = 'lapis_workout_library';

const _defaultExercises = () => [
    { id: _wUid(), name: 'Bench Press',    nameZh: '槓鈴臥推',   categories: ['Chest'],       type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: 'Pectoralis Major, Triceps, Anterior Deltoid' },
    { id: _wUid(), name: 'Squat',          nameZh: '深蹲',       categories: ['Quads','Legs'],type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: 'Quadriceps, Glutes, Hamstrings' },
    { id: _wUid(), name: 'Deadlift',       nameZh: '硬舉',       categories: ['Back','Legs'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: 'Erector Spinae, Glutes, Hamstrings' },
    { id: _wUid(), name: 'Pull-up',        nameZh: '引體向上',   categories: ['Back'],        type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: 'Latissimus Dorsi, Biceps' },
    { id: _wUid(), name: 'Overhead Press', nameZh: '肩推',       categories: ['Shoulders'],   type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: 'Deltoids, Triceps' },
    { id: _wUid(), name: 'Barbell Row',    nameZh: '槓鈴划船',   categories: ['Back'],        type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: 'Latissimus Dorsi, Rhomboids, Biceps' },
    { id: _wUid(), name: 'Bicep Curl',     nameZh: '二頭彎舉',   categories: ['Biceps'],      type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: 'Biceps Brachii' },
    { id: _wUid(), name: 'Tricep Dip',     nameZh: '三頭撐',     categories: ['Triceps'],     type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: 'Triceps Brachii' },
    { id: _wUid(), name: 'Lateral Raise',  nameZh: '啞鈴側平舉', categories: ['Side Delt'],   type: 'sets', preferredUnit: 'g',  description: '', targetMuscles: 'Lateral Deltoid' },
    { id: _wUid(), name: 'Leg Press',      nameZh: '腿推',       categories: ['Quads'],       type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: 'Quadriceps, Glutes' },
    { id: _wUid(), name: 'Plank',          nameZh: '棒式',       categories: ['Abs'],         type: 'duration', description: '', targetMuscles: 'Core, Abdominals' },
    { id: _wUid(), name: 'Running',        nameZh: '跑步機',     categories: ['Running'],     type: 'duration', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Cycling',        nameZh: '騎單車',     categories: ['Cycling'],     type: 'duration', description: '', targetMuscles: '' },
];

const _defaultWorkoutData = () => ({
    version: 1,
    categories: ['Bodybuilding', 'Cardio', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'],
    logs: []
});

const _catLabels = {
    Bodybuilding: '健美',
    Push: '推', Pull: '拉', Legs: '腿部', Core: '核心',
    Cardio: '有氧', Back: '背部', Chest: '胸部', Shoulders: '肩部', Arms: '手臂'
};

const CATEGORIES_KEY = 'lapis_workout_categories';

const _catColors = [
    { background:'rgba(239,68,68,0.18)',  color:'#ef4444', border:'1px solid rgba(239,68,68,0.35)'   },
    { background:'rgba(59,130,246,0.18)', color:'#3b82f6', border:'1px solid rgba(59,130,246,0.35)'  },
    { background:'rgba(168,85,247,0.18)', color:'#a855f7', border:'1px solid rgba(168,85,247,0.35)'  },
    { background:'rgba(245,158,11,0.18)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.35)'  },
    { background:'rgba(34,197,94,0.18)',  color:'#22c55e', border:'1px solid rgba(34,197,94,0.35)'   },
    { background:'rgba(20,184,166,0.18)', color:'#14b8a6', border:'1px solid rgba(20,184,166,0.35)'  },
    { background:'rgba(249,115,22,0.18)', color:'#f97316', border:'1px solid rgba(249,115,22,0.35)'  },
    { background:'rgba(236,72,153,0.18)', color:'#ec4899', border:'1px solid rgba(236,72,153,0.35)'  },
];

const _defaultCategoryTree = () => [
    { id: _wUid(), name: 'Bodybuilding', nameZh: '健美', children: [
        { id: _wUid(), name: 'Chest', nameZh: '胸部', children: [
            { id: _wUid(), name: 'Upper Chest', nameZh: '上胸', children: [] },
            { id: _wUid(), name: 'Lower Chest', nameZh: '下胸', children: [] },
        ]},
        { id: _wUid(), name: 'Back', nameZh: '背部', children: [
            { id: _wUid(), name: 'Upper Back', nameZh: '上背', children: [] },
            { id: _wUid(), name: 'Lower Back', nameZh: '下背', children: [] },
        ]},
        { id: _wUid(), name: 'Shoulders', nameZh: '肩部', children: [
            { id: _wUid(), name: 'Front Delt', nameZh: '前三角', children: [] },
            { id: _wUid(), name: 'Side Delt',  nameZh: '側三角', children: [] },
        ]},
        { id: _wUid(), name: 'Arms', nameZh: '手臂', children: [
            { id: _wUid(), name: 'Biceps',  nameZh: '二頭肌', children: [] },
            { id: _wUid(), name: 'Triceps', nameZh: '三頭肌', children: [] },
        ]},
        { id: _wUid(), name: 'Legs', nameZh: '腿部', children: [
            { id: _wUid(), name: 'Quads',      nameZh: '股四頭肌', children: [] },
            { id: _wUid(), name: 'Hamstrings', nameZh: '大腿後側', children: [] },
            { id: _wUid(), name: 'Glutes',     nameZh: '臀部',     children: [] },
            { id: _wUid(), name: 'Calves',     nameZh: '小腿',     children: [] },
        ]},
        { id: _wUid(), name: 'Core', nameZh: '核心', children: [
            { id: _wUid(), name: 'Abs', nameZh: '腹部', children: [] },
        ]},
    ]},
    { id: _wUid(), name: 'Cardio', nameZh: '有氧', children: [
        { id: _wUid(), name: 'Running', nameZh: '跑步', children: [] },
        { id: _wUid(), name: 'Cycling', nameZh: '騎車', children: [] },
    ]},
];

// ── Translations ──────────────────────────────────────────────────────────
const _wT = {
    zh: {
        navIndex: '琉璃待辦', navShift: '琉璃輪班', navSetting: '系統設定', navWorkout: '琉璃健身',
        tabAdd: '新增', tabExercises: '所有訓練動作', tabRecords: '紀錄', tabSettings: '設定',
        date: '日期', time: '時間', today: '今天',
        setsReps: '組數 / 次數', duration: '時間',
        weight: '重量', reps: '次數', sets: '組', minutes: '分鐘', min: 'min', kg: 'kg',
        startWorkout: '開始訓練', workoutLog: '訓練紀錄',
        addExercise: '新增訓練動作', saveLog: '儲存訓練紀錄',
        noExercises: '尚未記錄任何動作', noLogs: '尚無訓練紀錄', noLibrary: '動作庫為空',
        search: '搜尋動作…', all: '全部',
        edit: '編輯', delete: '刪除', save: '儲存', cancel: '取消', confirm: '確認',
        addToLibrary: '新增至動作庫', editExercise: '編輯訓練動作',
        exerciseNameEn: '動作名稱（英文）', exerciseNameZh: '動作名稱（中文，選填）',
        description: '動作描述', targetMuscles: '目標肌群',
        selectCategories: '選擇類別（可複選）', trackingType: '紀錄方式',
        addSet: '新增組數', selectExercise: '選擇動作',
        existingLog: '此日期已有訓練紀錄，儲存將會覆蓋。', pickExercise: '選擇訓練動作',
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
        addL1: '新增主分支', addL2: '新增子分支', addL3: '新增末端',
        catName: '類別名稱（英文）', catNameZh: '類別名稱（中文）',
        tabToday: '今天', tabHistory: '歷史', tabBin: '回收桶',
        completed: '已完成', pending: '進行中',
        restore: '還原', permanentDelete: '永久刪除',
        noTodaySessions: '今天沒有訓練紀錄', noHistorySessions: '沒有歷史紀錄',
        noBinSessions: '回收桶是空的', newSession: '新增訓練',
        editSession: '編輯訓練', discardConfirm: '確定要放棄未儲存的變更嗎？',
        moreEx: '項', restoreMsg: '已還原',
    },
    en: {
        navIndex: 'Glassy Todo', navShift: 'Glassy Shift', navSetting: 'Settings', navWorkout: 'Glassy Workout',
        tabAdd: 'Add', tabExercises: 'Exercises', tabRecords: 'Records', tabSettings: 'Settings',
        date: 'Date', time: 'Time', today: 'Today',
        setsReps: 'Sets / Reps', duration: 'Duration',
        weight: 'Weight', reps: 'Reps', sets: 'Set', minutes: 'Minutes', min: 'min', kg: 'kg',
        startWorkout: 'Start Workout', workoutLog: 'Workout Log',
        addExercise: 'Add Exercise', saveLog: 'Save Workout Log',
        noExercises: 'No exercises logged yet', noLogs: 'No workout records yet', noLibrary: 'Library is empty',
        search: 'Search exercises…', all: 'All',
        edit: 'Edit', delete: 'Delete', save: 'Save', cancel: 'Cancel', confirm: 'Confirm',
        addToLibrary: 'Add to Library', editExercise: 'Edit Exercise',
        exerciseNameEn: 'Exercise Name (English)', exerciseNameZh: 'Exercise Name (Chinese, optional)',
        description: 'Description', targetMuscles: 'Target Muscles',
        selectCategories: 'Select Categories (multi-select)', trackingType: 'Tracking Type',
        addSet: 'Add Set', selectExercise: 'Select Exercise',
        existingLog: 'A log exists for this date. Saving will overwrite it.', pickExercise: 'Pick Exercise',
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
        addL1: 'Add Branch', addL2: 'Add Sub-branch', addL3: 'Add Leaf',
        catName: 'Category Name (EN)', catNameZh: 'Category Name (ZH)',
        tabToday: 'Today', tabHistory: 'History', tabBin: 'Bin',
        completed: 'Completed', pending: 'Pending',
        restore: 'Restore', permanentDelete: 'Permanently Delete',
        noTodaySessions: 'No sessions today', noHistorySessions: 'No history yet',
        noBinSessions: 'Recycle bin is empty', newSession: 'New Session',
        editSession: 'Edit Session', discardConfirm: 'Discard unsaved changes?',
        moreEx: 'more', restoreMsg: 'Session restored',
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

            const wData   = reactive({ categories: [], logs: [] });
            const libData = reactive({ exercises: [] });
            const catTree = ref([]);

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

            const catsPersist = () => localStorage.setItem(CATEGORIES_KEY, JSON.stringify(catTree.value));

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
            const recordsSubTab = ref('today');
            const editingSessionId = ref(null);

            // ── ADD TAB — date/time state ─────────────────────────────────
            const _now = () => new Date();
            const _todayStr = () => _now().toISOString().split('T')[0];

            const logDate = ref(_todayStr());
            const logTime = ref({ hour: _now().getHours(), minute: _now().getMinutes() });
            const logExercises = ref([]); // [{exerciseId, name, nameZh, type, categories, sets[], minutes}]


            // ── LAPIS PICKER ──────────────────────────────────────────────
            const showDateTimePicker = ref(false);
            const pickerMode = ref('date'); // 'date' | 'time'
            let _wDatePicker = null;
            let _wTimePicker = null;

            const openPicker = (mode) => {
                pickerMode.value = mode;
                showDateTimePicker.value = true;
                nextTick(() => {
                    if (mode === 'date' && _wDatePicker) {
                        const [y, m, d] = logDate.value.split('-').map(Number);
                        _wDatePicker.setValue(y, m, d);
                    } else if (mode === 'time' && _wTimePicker) {
                        _wTimePicker.setValue(logTime.value.hour, logTime.value.minute);
                    }
                });
            };

            const switchPickerMode = (mode) => { pickerMode.value = mode; };

            const closeWorkoutPicker = () => {
                if (_wDatePicker) {
                    const v = _wDatePicker.getValue();
                    logDate.value = v.iso;
                }
                if (_wTimePicker) {
                    const v = _wTimePicker.getValue();
                    logTime.value.hour = v.hour;
                    logTime.value.minute = v.minute;
                }
                showDateTimePicker.value = false;
            };

            const setPickerToday = () => {
                const now = new Date();
                logDate.value = _todayStr();
                if (_wDatePicker) _wDatePicker.setValue(now.getFullYear(), now.getMonth() + 1, now.getDate());
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
                const isEditing = !!editingSessionId.value;
                const existing = isEditing ? wData.logs.find(l => l.id === editingSessionId.value) : null;
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

            // ── WORKOUT LOG MODAL ─────────────────────────────────────────
            const showLogModal = ref(false);

            const shellStyle = computed(() => isDarkTheme.value
                ? { background: 'rgba(15,20,38,0.88)', color: '#ffffff', borderTop: '1px solid rgba(255,255,255,0.08)' }
                : { background: 'rgba(245,248,255,0.92)', color: '#1a1a1a', borderTop: '1px solid rgba(0,0,0,0.05)' }
            );

            const saveLogAndClose = () => {
                saveLog();
                showLogModal.value     = false;
                editingSessionId.value = null;
                logExercises.value     = [];
            };

            const discardAndClose = () => {
                if (logExercises.value.length > 0 && !confirm(t.value.discardConfirm)) return;
                showLogModal.value     = false;
                editingSessionId.value = null;
                logExercises.value     = [];
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
                if (pickCategory.value) {
                    const sub = _subtreeNames(pickCategory.value);
                    list = list.filter(e => (e.categories || []).some(c => sub.includes(c)));
                }
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
                pickSearch.value   = '';
                pickCategory.value = '';
                // Auto-focus the weight input (or minutes input) of the newly added exercise
                nextTick(() => {
                    if (isSets) {
                        const inputs = document.querySelectorAll('.log-body .compact-input');
                        if (inputs.length >= 2) inputs[inputs.length - 2].focus();
                    } else {
                        const inputs = document.querySelectorAll('.log-body input[inputmode="numeric"]');
                        if (inputs.length) inputs[inputs.length - 1].focus();
                    }
                });
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
                if (libCategory.value) {
                    const sub = _subtreeNames(libCategory.value);
                    list = list.filter(e => (e.categories || []).some(c => sub.includes(c)));
                }
                return list;
            });

            const showExModal = ref(false);
            const isEditEx    = ref(false);
            const editExId    = ref(null);

            const exForm = reactive({ name: '', nameZh: '', categories: [], type: 'sets', unit: 'kg', description: '', targetMuscles: '' });

            const openAddEx = () => {
                isEditEx.value = false;
                editExId.value = null;
                Object.assign(exForm, { name: '', nameZh: '', categories: [], type: 'sets', unit: 'kg', description: '', targetMuscles: '' });
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
                    unit: ex.preferredUnit || 'kg',
                    description: ex.description || '',
                    targetMuscles: ex.targetMuscles || ''
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
                    preferredUnit: exForm.type === 'sets' ? exForm.unit : undefined,
                    description:   exForm.description.trim(),
                    targetMuscles: exForm.targetMuscles.trim()
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

            // ── DRAG-AND-DROP REORDERING ──────────────────────────────────
            const dragSrcId = ref(null);

            const onDragStart = (ex, event) => {
                dragSrcId.value = ex.id;
                event.dataTransfer.effectAllowed = 'move';
            };

            const onDragOver = (event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
            };

            const onDrop = (targetEx, event) => {
                event.preventDefault();
                if (!dragSrcId.value || dragSrcId.value === targetEx.id) { dragSrcId.value = null; return; }
                const exArr = libData.exercises;
                const srcIdx = exArr.findIndex(e => e.id === dragSrcId.value);
                const tgtIdx = exArr.findIndex(e => e.id === targetEx.id);
                if (srcIdx < 0 || tgtIdx < 0) { dragSrcId.value = null; return; }
                const [removed] = exArr.splice(srcIdx, 1);
                exArr.splice(tgtIdx, 0, removed);
                libPersist();
                dragSrcId.value = null;
                nextTick(() => lucide.createIcons());
            };

            // ── EXERCISE DETAIL VIEW ──────────────────────────────────────
            const showExDetail = ref(false);
            const exDetailData = ref(null);

            const openExDetail = (ex) => {
                exDetailData.value = ex;
                showExDetail.value = true;
                nextTick(() => lucide.createIcons());
            };

            // ── CATEGORY MANAGEMENT ───────────────────────────────────────
            const showCatMgr = ref(false);
            const catMgrMode = ref('view'); // 'view' | 'add' | 'edit'
            const catMgrForm = reactive({ name: '', nameZh: '', parentName: null, level: 1, editOldName: null });

            const catMgrAdd = (parentName, level) => {
                catMgrForm.name = ''; catMgrForm.nameZh = '';
                catMgrForm.parentName = parentName; catMgrForm.level = level;
                catMgrForm.editOldName = null;
                catMgrMode.value = 'add';
            };
            const catMgrEdit = (node) => {
                catMgrForm.editOldName = node.name;
                catMgrForm.name        = node.name;
                catMgrForm.nameZh      = node.nameZh || '';
                catMgrMode.value       = 'edit';
            };
            const catMgrSave = () => {
                const name = catMgrForm.name.trim();
                if (!name) return;
                if (catMgrMode.value === 'edit') {
                    const found = _findByName(catMgrForm.editOldName);
                    if (found) {
                        const old = found.node.name;
                        found.node.name   = name;
                        found.node.nameZh = catMgrForm.nameZh.trim();
                        // Rename in all exercises
                        libData.exercises.forEach(ex => {
                            const ci = (ex.categories || []).indexOf(old);
                            if (ci >= 0) ex.categories.splice(ci, 1, name);
                        });
                        libPersist();
                    }
                } else {
                    const newNode = { id: _wUid(), name, nameZh: catMgrForm.nameZh.trim(), children: [] };
                    if (catMgrForm.level === 1) {
                        catTree.value.push(newNode);
                    } else {
                        const found = _findByName(catMgrForm.parentName);
                        if (found) found.node.children.push(newNode);
                    }
                }
                catsPersist();
                catMgrMode.value = 'view';
                catMgrForm.name = ''; catMgrForm.nameZh = ''; catMgrForm.editOldName = null;
                nextTick(() => lucide.createIcons());
            };
            const catMgrDelete = (node, parentNode) => {
                if (!confirm(t.value.deleteConfirm)) return;
                const arr = parentNode ? (parentNode.children || []) : catTree.value;
                const idx = arr.findIndex(n => n.name === node.name);
                if (idx >= 0) arr.splice(idx, 1);
                catsPersist();
            };

            // ── EXERCISE FORM — cascading selector ────────────────────────
            const exCatSel = reactive({ l1: null, l2: null, l3: null });

            const exCatL2s = computed(() => {
                if (!exCatSel.l1) return [];
                const n = catTree.value.find(l => l.name === exCatSel.l1);
                return n ? (n.children || []) : [];
            });
            const exCatL3s = computed(() => {
                if (!exCatSel.l2) return [];
                for (const l1 of catTree.value) {
                    const n = (l1.children || []).find(l => l.name === exCatSel.l2);
                    if (n) return n.children || [];
                }
                return [];
            });
            const addCatToForm = () => {
                const name = exCatSel.l3 || exCatSel.l2 || exCatSel.l1;
                if (!name || exForm.categories.includes(name)) return;
                exForm.categories.push(name);
                exCatSel.l1 = null; exCatSel.l2 = null; exCatSel.l3 = null;
            };
            const removeCatFromForm = (name) => {
                const idx = exForm.categories.indexOf(name);
                if (idx >= 0) exForm.categories.splice(idx, 1);
            };

            // ── GROUPED EXERCISE ROWS ─────────────────────────────────────
            const exGroupedRows = computed(() => {
                const rows = [], shown = new Set(), filtered = filteredLib.value;
                catTree.value.forEach((l1, ci) => {
                    const sub = [l1.name, ...(l1.children || []).flatMap(l2 => [l2.name, ...(l2.children || []).map(l3 => l3.name)])];
                    const exes = filtered.filter(ex => !shown.has(ex.id) && (ex.categories || []).some(c => sub.includes(c)));
                    if (!exes.length) return;
                    rows.push({ type: 'hdr', node: l1, ci });
                    exes.forEach(ex => { shown.add(ex.id); rows.push({ type: 'ex', ex, ci }); });
                });
                const uncats = filtered.filter(ex => !shown.has(ex.id));
                if (uncats.length) {
                    rows.push({ type: 'hdr', node: { name: 'Other', nameZh: '其他' }, ci: -1 });
                    uncats.forEach(ex => rows.push({ type: 'ex', ex, ci: -1 }));
                }
                return rows;
            });

            // ── RECORDS TAB ───────────────────────────────────────────────
            const todaySessions = computed(() => {
                const today = _todayStr();
                return [...wData.logs]
                    .filter(l => !l.isDeleted && l.date === today)
                    .sort((a, b) => (a.time.hour * 60 + a.time.minute) - (b.time.hour * 60 + b.time.minute));
            });

            const historySessions = computed(() => {
                const today = _todayStr();
                const filtered = [...wData.logs]
                    .filter(l => !l.isDeleted && l.date !== today)
                    .sort((a, b) => b.date.localeCompare(a.date));
                const groups = [];
                let lastKey = null;
                filtered.forEach(l => {
                    const [y, m] = l.date.split('-');
                    const key = `${y}-${m}`;
                    if (key !== lastKey) {
                        lastKey = key;
                        groups.push({ key, year: y, month: m, sessions: [] });
                    }
                    groups[groups.length - 1].sessions.push(l);
                });
                return groups;
            });

            const binSessions = computed(() =>
                [...wData.logs].filter(l => l.isDeleted).sort((a, b) => b.date.localeCompare(a.date))
            );

            const groupedHistory = computed(() =>
                historySessions.value.map(g => ({
                    ...g,
                    monthLabel: navSettings.lang === 'zh'
                        ? `${g.year}年${_MONTHS_ZH[parseInt(g.month) - 1]}`
                        : `${_MONTHS_EN[parseInt(g.month) - 1]} ${g.year}`
                }))
            );

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
                localStorage.removeItem(CATEGORIES_KEY);
                const def = _defaultWorkoutData();
                wData.categories  = def.categories;
                wData.logs        = def.logs;
                libData.exercises = _defaultExercises();
                catTree.value     = _defaultCategoryTree();
                logExercises.value     = [];
                logDate.value          = _todayStr();
                editingSessionId.value = null;
                showClearConfirm.value = false;
                persist(); libPersist(); catsPersist();
            };

            const toggleLang = () => {
                navSettings.lang = navSettings.lang === 'zh' ? 'en' : 'zh';
                StorageProvider.saveCommonSettings(navSettings);
            };

            // ── Modal / overlay state ────────────────────────────────────
            const isAnyModalOpen = computed(() =>
                showDateTimePicker.value ||
                showLogModal.value       ||
                showPickModal.value      ||
                showExModal.value        ||
                showCatMgr.value         ||
                showClearConfirm.value   ||
                showExDetail.value
            );

            // ── Display helpers ───────────────────────────────────────────
            const _nodeName = (n) => (navSettings.lang === 'zh' && n.nameZh) ? n.nameZh : n.name;

            // Safe 3-level tree lookup — no recursion
            const _findByName = (name) => {
                for (const l1 of catTree.value) {
                    if (l1.name === name) return { node: l1, level: 1, parent: null };
                    for (const l2 of (l1.children || [])) {
                        if (l2.name === name) return { node: l2, level: 2, parent: l1 };
                        for (const l3 of (l2.children || [])) {
                            if (l3.name === name) return { node: l3, level: 3, parent: l2 };
                        }
                    }
                }
                return null;
            };

            // Returns all names in the subtree rooted at `name` (max depth 3)
            const _subtreeNames = (name) => {
                for (const l1 of catTree.value) {
                    if (l1.name === name) {
                        const ns = [l1.name];
                        (l1.children || []).forEach(l2 => { ns.push(l2.name); (l2.children || []).forEach(l3 => ns.push(l3.name)); });
                        return ns;
                    }
                    for (const l2 of (l1.children || [])) {
                        if (l2.name === name) {
                            const ns = [l2.name]; (l2.children || []).forEach(l3 => ns.push(l3.name)); return ns;
                        }
                        for (const l3 of (l2.children || [])) {
                            if (l3.name === name) return [l3.name];
                        }
                    }
                }
                return [name];
            };

            const catLabel = (name) => {
                if (navSettings.lang !== 'zh') return name;
                const found = _findByName(name);
                return found ? (found.node.nameZh || name) : (_catLabels[name] || name);
            };

            const catPillStyle = (name) => {
                for (let i = 0; i < catTree.value.length; i++) {
                    const l1 = catTree.value[i];
                    const sub = [l1.name, ...(l1.children || []).flatMap(l2 => [l2.name, ...(l2.children || []).map(l3 => l3.name)])];
                    if (sub.includes(name)) return _catColors[i % _catColors.length];
                }
                return _catColors[0];
            };

            const unitLabel = (ex)  => ex.type === 'duration'
                ? t.value.min
                : `${ex.preferredUnit || 'kg'}/${t.value.sets_unit}`;

            // ── Lifecycle ─────────────────────────────────────────────────
            onMounted(() => {
                hydrate();
                hydrateCats();
                hydrateLib();

                // Inject Lapis navigation and initialize modal system
                if (typeof LapisNav !== 'undefined') LapisNav.inject({ bottom: false });
                if (typeof LapisModal !== 'undefined') LapisModal.init();

                // Initialize Lapis date/time pickers for workout Add tab
                const _dateEl = document.getElementById('lapis-workout-date-picker');
                const _timeEl = document.getElementById('lapis-workout-time-picker');
                if (_dateEl && typeof LapisDatePicker !== 'undefined') {
                    const [y, m, d] = logDate.value.split('-').map(Number);
                    _wDatePicker = new LapisDatePicker(_dateEl, { year: y, month: m, day: d });
                }
                if (_timeEl && typeof LapisTimePicker !== 'undefined') {
                    _wTimePicker = new LapisTimePicker(_timeEl, {
                        hour: logTime.value.hour, minute: logTime.value.minute
                    });
                }

                nextTick(() => lucide.createIcons());
                if (typeof ParticleEngine !== 'undefined' && navSettings.effect && navSettings.effect !== 'none') {
                    ParticleEngine.setEffect(navSettings.effect);
                }
            });

            watch(navDropdownOpen, () => nextTick(() => lucide.createIcons()));
            watch(activeTab, () => nextTick(() => lucide.createIcons()));
            watch(isAnyModalOpen, () => nextTick(() => lucide.createIcons()));
            watch(() => libData.exercises.length, () => nextTick(() => lucide.createIcons()));
            // Re-render icons when log exercises change (new exercise cards appear in log modal)
            watch(() => logExercises.value.length, () => nextTick(() => lucide.createIcons()));
            // Re-render icons when the inline exercise picker list is filtered
            watch(filteredPick, () => nextTick(() => lucide.createIcons()));
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
                logDate, logTime, logExercises,
                addSet, removeSet, toggleSetDone, removeLogExercise, saveLog,
                showToast, toastMsg,
                // lapis picker
                showDateTimePicker, pickerMode,
                openPicker, switchPickerMode, closeWorkoutPicker, setPickerToday,
                // workout log modal
                showLogModal, shellStyle, saveLogAndClose, discardAndClose,
                openNewSession, openEditSession,
                // pick exercise modal
                showPickModal, pickSearch, pickCategory, filteredPick, pickExercise,
                // exercises tab
                libData, libSearch, libCategory, filteredLib,
                showExModal, isEditEx, exForm, openAddEx, openEditEx,
                toggleExCat, saveEx, deleteEx,
                dragSrcId, onDragStart, onDragOver, onDrop,
                showExDetail, exDetailData, openExDetail,
                catLabel, catPillStyle, unitLabel,
                // category tree
                catTree,
                showCatMgr, catMgrMode, catMgrForm, catMgrAdd, catMgrEdit, catMgrSave, catMgrDelete,
                // exercise form cascading selector
                exCatSel, exCatL2s, exCatL3s, addCatToForm, removeCatFromForm,
                // grouped rows
                exGroupedRows,
                // records tab
                recordsSubTab, editingSessionId,
                todaySessions, historySessions, binSessions, groupedHistory,
                softDeleteSession, restoreSession, permanentDeleteSession, toggleComplete,
                logSummary, logVolume, exDisplayName,
                // svg icon constants
                ICON_CHECK, ICON_EDIT, ICON_TRASH, ICON_RESTORE, ICON_X,
                ICON_CALENDAR, ICON_CLOCK, ICON_DUMBBELL, ICON_TIMER,
                ICON_CIRCLE, ICON_MINUS, ICON_SEARCH, ICON_PLUS, ICON_PLUS_CIRCLE,
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
