// index.js — Glassy Home Dashboard Vue app
// Depends on: storage.js, nav.js, lapis_core_ui.js
'use strict';

window.addEventListener('DOMContentLoaded', () => {
    const { createApp, computed, ref, onMounted } = Vue;

    const _DAYS_ZH = ['週日','週一','週二','週三','週四','週五','週六'];
    const _DAYS_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const _MON_ZH  = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    const _MON_EN  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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

    const _uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

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

    createApp({
        setup() {
            const { navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle } = useNav();

            const themeStyle = computed(() => ({
                color: 'var(--text-primary)',
                textShadow: 'var(--text-shadow)',
            }));

            const t = computed(() => _strings[navSettings.lang] || _strings.zh);

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
                if (h < 12) return s.greetMorn;
                if (h < 18) return s.greetAftn;
                return s.greetEvng;
            });

            // ── Dashboard ─────────────────────────────────────────────────────
            const dashboard = ref(_loadDashboard());
            const todayShortLabel    = computed(() => _shortLabel(_dateStr(0), navSettings.lang));
            const tomorrowShortLabel = computed(() => _shortLabel(_dateStr(1), navSettings.lang));

            // ── Quick Add ─────────────────────────────────────────────────────
            const quickMode   = ref('task');
            const quickText   = ref('');
            const quickWeight = ref('');
            const toastMsg    = ref('');
            const toastShow   = ref(false);

            let _toastTimer = null;
            const _showToast = (msg) => {
                toastMsg.value  = msg;
                toastShow.value = true;
                if (_toastTimer) clearTimeout(_toastTimer);
                _toastTimer = setTimeout(() => { toastShow.value = false; }, 2400);
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
                    if (!Array.isArray(raw.weights))      raw.weights      = [];
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
                });
                document.body.classList.add('lapis-ready');
            });

            return {
                navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle, themeStyle, t,
                todayLabel, greeting,
                dashboard, todayShortLabel, tomorrowShortLabel,
                quickMode, quickText, quickWeight, toastMsg, toastShow,
                openQuickAdd, closeQuickAdd, saveQuick,
            };
        },
    }).mount('#app');
});
