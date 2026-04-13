// shift.js — Glassy Shift v3.0
// Depends on: storage.js, nav.js

const { createApp, ref, computed, onMounted, watch, nextTick, reactive } = Vue;

const app = createApp({
    setup() {
        const { navDropdownOpen, currentPageTitle, toggleNavDropdown,
                navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle } = useNav();

        // ── Calendar & shift data ──────────────────────────────────────────
        const calendarDate = ref(new Date());
        const shiftData    = ref(StorageProvider.getShiftData());

        // ── Shift settings (with payroll → jobs migration) ─────────────────
        const _saved = StorageProvider.getShiftSettings();
        const _defaultJobs = [{
            id: 'job_1', name: 'Main Job', color: '#3b82f6',
            method: 'monthly', rate: 30000, units: null,
            payDay: 5, holidayLogic: 'early'
        }];
        const _initJobs = _saved.jobs
            ? _saved.jobs.map(j => ({ units: null, ...j }))
            : _saved.payroll
                ? [{ id: 'job_1',
                     name:         _saved.payroll.name         || 'Main Job',
                     color:        '#3b82f6',
                     method:       _saved.payroll.method       || 'monthly',
                     rate:         _saved.payroll.rate         || 30000,
                     units:        null,
                     payDay:       _saved.payroll.payDay       || 5,
                     holidayLogic: _saved.payroll.holidayLogic || 'early' }]
                : _defaultJobs;

        const shiftSettings = ref({
            shiftTags: [
                { id: 'early',  name: '早班', startTime: '08:00', endTime: '16:00', color: '#3b82f6' },
                { id: 'middle', name: '中班', startTime: '12:00', endTime: '20:00', color: '#f59e0b' },
                { id: 'late',   name: '晚班', startTime: '16:00', endTime: '00:00', color: '#8b5cf6' }
            ],
            payTags: [
                { id: 'salary', name: '薪資', color: '#10b981' },
                { id: 'bonus',  name: '獎金', color: '#ef4444'  }
            ],
            ..._saved,
            jobs: _initJobs          // always use migrated jobs (override whatever _saved.jobs was)
        });

        // ── UI state ───────────────────────────────────────────────────────
        const activeQuickTag         = ref(null);
        const activeQuickTagCategory = ref(null);
        const showTodayTasks         = ref(false);
        const showDayDetail          = ref(false);
        const selectedDay            = ref(null);
        const showTagsModal          = ref(false);

        const jumpPicker = ref({
            show: false,
            year:  new Date().getFullYear(),
            month: new Date().getMonth()
        });

        // ── Shift time picker (chevron-up/down wheel) ──────────────────────
        const shiftTimePicker = reactive({
            show: false, tagId: null, field: null, hour: 9, minute: 0
        });

        const openShiftTimePicker = (tagId, field) => {
            const tag = shiftSettings.value.shiftTags.find(t => t.id === tagId);
            if (!tag) return;
            const [h, m] = (tag[field] || '00:00').split(':').map(Number);
            Object.assign(shiftTimePicker, { show: true, tagId, field, hour: h, minute: m });
            nextTick(() => { if (window.lucide) lucide.createIcons(); });
        };

        const confirmShiftTimePicker = () => {
            const tag = shiftSettings.value.shiftTags.find(t => t.id === shiftTimePicker.tagId);
            if (tag) {
                const hh = shiftTimePicker.hour.toString().padStart(2, '0');
                const mm = shiftTimePicker.minute.toString().padStart(2, '0');
                tag[shiftTimePicker.field] = `${hh}:${mm}`;
            }
            shiftTimePicker.show = false;
        };

        // ── Translations ───────────────────────────────────────────────────
        const shiftTranslations = {
            en: {
                navIndex: 'Glassy Todo', navShift: 'Glassy Shift', navSetting: 'Settings',
                todayTasks: "Today's Tasks", salary: 'Salary', shiftNav: 'Shifts', labelSettings: 'Labels',
                shiftTagsTitle: 'Shift Types', addShift: '+ Add Shift',
                salarySection: 'Salary', addJob: '+ Add Job', jobName: 'Job Name',
                monthly: 'Monthly', daily: 'Daily', weekly: 'Weekly', hourly: 'Hourly',
                amount: 'Amount', units: 'Units', payDay: 'Pay Day',
                holiday: 'Holiday', advance: 'Advance', postpone: 'Postpone',
                totalMonthly: 'Total Monthly Estimate',
                startTime: 'Clock In', endTime: 'Clock Out',
                noTasksToday: 'No tasks today',
                weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                confirmOk: 'OK', cancel: 'Cancel',
                jumpTitle: 'Jump to Month',
            },
            zh: {
                navIndex: '琉璃待辦', navShift: '琉璃輪班', navSetting: '系統設定',
                todayTasks: '今日事', salary: '薪資', shiftNav: '輪班', labelSettings: '標籤設定',
                shiftTagsTitle: '班別設定', addShift: '+ 新增班別',
                salarySection: '薪資設定', addJob: '+ 新增工作', jobName: '工作名稱',
                monthly: '月薪', daily: '日薪', weekly: '週薪', hourly: '時薪',
                amount: '金額', units: '工作量', payDay: '發薪日',
                holiday: '遇假日', advance: '提前', postpone: '延後',
                totalMonthly: '月薪合計預估',
                startTime: '上班', endTime: '下班',
                noTasksToday: '今日無待辦事項',
                weekdays: ['日', '一', '二', '三', '四', '五', '六'],
                confirmOk: '確認', cancel: '取消',
                jumpTitle: '選擇年月',
            }
        };

        const t = computed(() => shiftTranslations[navSettings.lang] || shiftTranslations.zh);

        // ── Salary logic ───────────────────────────────────────────────────
        const calcJobMonthly = (job) => {
            if (!job.rate) return 0;
            const u = (job.units != null && job.units !== '') ? Number(job.units) : null;
            switch (job.method) {
                case 'monthly': return Math.round(job.rate);
                case 'daily':   return Math.round(job.rate * (u ?? 22));
                case 'weekly':  return Math.round(job.rate * (u ?? 4));
                case 'hourly':  return Math.round(job.rate * (u ?? 176));
                default:        return Math.round(job.rate);
            }
        };

        const totalMonthlyEstimate = computed(() =>
            shiftSettings.value.jobs.reduce((s, j) => s + calcJobMonthly(j), 0)
        );

        const getUnitsPlaceholder = (method) =>
            ({ hourly: '176 hrs', daily: '22 days', weekly: '4 wks' })[method] || '';

        // ── Job management ─────────────────────────────────────────────────
        const addJob = () => {
            shiftSettings.value.jobs.push({
                id: 'job_' + Date.now(), name: '', color: '#3b82f6',
                method: 'monthly', rate: null, units: null,
                payDay: 5, holidayLogic: 'early'
            });
        };

        const removeJob = (id) => {
            shiftSettings.value.jobs = shiftSettings.value.jobs.filter(j => j.id !== id);
        };

        // ── Calendar computed ──────────────────────────────────────────────
        const calendarDays = computed(() => {
            if (!(calendarDate.value instanceof Date)) return [];
            const year  = calendarDate.value.getFullYear();
            const month = calendarDate.value.getMonth();
            const firstDay  = new Date(year, month, 1);
            const lastDay   = new Date(year, month + 1, 0);
            const days      = [];
            const startOff  = firstDay.getDay();
            const prevLast  = new Date(year, month, 0).getDate();

            for (let i = startOff - 1; i >= 0; i--)
                days.push({ date: new Date(year, month - 1, prevLast - i), isCurrentMonth: false });
            for (let i = 1; i <= lastDay.getDate(); i++)
                days.push({ date: new Date(year, month, i), isCurrentMonth: true });
            for (let i = 1; i <= 42 - days.length; i++)
                days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });

            const todayStr = new Date().toISOString().split('T')[0];
            return days.map(day => {
                const dateStr = day.date.toISOString().split('T')[0];
                return { ...day, dateStr, data: shiftData.value[dateStr] || {}, isToday: dateStr === todayStr };
            });
        });

        const displayMonthYear = computed(() => {
            if (!(calendarDate.value instanceof Date)) return { year: '', month: '' };
            return {
                year:  calendarDate.value.getFullYear(),
                month: (calendarDate.value.getMonth() + 1).toString().padStart(2, '0')
            };
        });

        const isAnyModalOpen = computed(() =>
            showTodayTasks.value || showDayDetail.value ||
            jumpPicker.value.show || showTagsModal.value || shiftTimePicker.show
        );

        const themeStyle = computed(() => ({}));

        // ── Jump picker ────────────────────────────────────────────────────
        const openJumpPicker = () => {
            if (!(calendarDate.value instanceof Date)) calendarDate.value = new Date();
            jumpPicker.value.year  = calendarDate.value.getFullYear();
            jumpPicker.value.month = calendarDate.value.getMonth();
            jumpPicker.value.show  = true;
        };

        const updateJumpDate = (type, val) => {
            if (type === 'year')  jumpPicker.value.year  = ((val - 1970 + 130) % 130) + 1970;
            if (type === 'month') jumpPicker.value.month = (val + 12) % 12;
        };

        const confirmJump = () => {
            const d = new Date(calendarDate.value);
            d.setFullYear(jumpPicker.value.year);
            d.setMonth(jumpPicker.value.month);
            d.setDate(1);
            calendarDate.value    = d;
            jumpPicker.value.show = false;
        };

        // ── Today's tasks (from todo localStorage) ─────────────────────────
        const todayTasks = computed(() => {
            const data     = StorageProvider.getTodoData();
            const todayStr = new Date().toISOString().split('T')[0];
            const todos    = Array.isArray(data.todos) ? data.todos : [];
            return todos
                .filter(t => t.date === todayStr && !t.isDeleted && !t.completed)
                .sort((a, b) => {
                    const order = { urgent: 0, important: 1, normal: 2, daily: 3, memo: 4 };
                    return (order[a.category] ?? 9) - (order[b.category] ?? 9);
                });
        });

        // ── Calendar actions ───────────────────────────────────────────────
        const changeMonth = (delta) => {
            const d = new Date(calendarDate.value);
            d.setMonth(d.getMonth() + delta);
            calendarDate.value = d;
        };

        const handleDayClick = (day) => {
            if (activeQuickTag.value) {
                applyQuickTag(day.dateStr);
            } else {
                selectedDay.value = day.dateStr;
                if (!shiftData.value[selectedDay.value]) shiftData.value[selectedDay.value] = {};
                showDayDetail.value = true;
            }
        };

        const applyQuickTag = (dateStr) => {
            if (!shiftData.value[dateStr]) shiftData.value[dateStr] = { shiftIds: [], payIds: [] };
            const { type, id } = activeQuickTag.value;
            const field = type === 'shift' ? 'shiftIds' : 'payIds';
            if (!shiftData.value[dateStr][field]) shiftData.value[dateStr][field] = [];
            const idx = shiftData.value[dateStr][field].indexOf(id);
            if (idx > -1) shiftData.value[dateStr][field].splice(idx, 1);
            else          shiftData.value[dateStr][field].push(id);
            StorageProvider.saveShiftData(shiftData.value);
        };

        const applyQuickTagToDay = (dateStr, type, id) => {
            if (!shiftData.value[dateStr]) shiftData.value[dateStr] = { shiftIds: [], payIds: [] };
            const field = type === 'shift' ? 'shiftIds' : 'payIds';
            if (!shiftData.value[dateStr][field]) shiftData.value[dateStr][field] = [];
            const idx = shiftData.value[dateStr][field].indexOf(id);
            if (idx > -1) shiftData.value[dateStr][field].splice(idx, 1);
            else          shiftData.value[dateStr][field].push(id);
            StorageProvider.saveShiftData(shiftData.value);
        };

        const toggleQuickTagCategory = (category) => {
            if (activeQuickTagCategory.value === category) {
                activeQuickTagCategory.value = null;
                activeQuickTag.value         = null;
            } else {
                activeQuickTagCategory.value = category;
                activeQuickTag.value         = null;
            }
        };

        const selectQuickTag = (type, id) => {
            if (activeQuickTag.value?.type === type && activeQuickTag.value?.id === id)
                activeQuickTag.value = null;
            else
                activeQuickTag.value = { type, id };
        };

        // ── Tag helpers ────────────────────────────────────────────────────
        const getTagName = (type, id) =>
            (type === 'shift' ? shiftSettings.value.shiftTags : shiftSettings.value.payTags)
                .find(t => t.id === id)?.name  || '';

        const getTagColor = (type, id) =>
            (type === 'shift' ? shiftSettings.value.shiftTags : shiftSettings.value.payTags)
                .find(t => t.id === id)?.color || 'rgba(255,255,255,0.2)';

        const addShiftTag = () => {
            shiftSettings.value.shiftTags.push({
                id: 'shift_' + Date.now(), name: '新輪班',
                startTime: '09:00', endTime: '18:00', color: '#3b82f6'
            });
        };
        const removeShiftTag = (id) => {
            shiftSettings.value.shiftTags = shiftSettings.value.shiftTags.filter(t => t.id !== id);
        };
        const addPayTag = () => {
            shiftSettings.value.payTags.push({ id: 'pay_' + Date.now(), name: '新項目', color: '#10b981' });
        };
        const removePayTag = (id) => {
            shiftSettings.value.payTags = shiftSettings.value.payTags.filter(t => t.id !== id);
        };

        // ── Effects ────────────────────────────────────────────────────────
        const setupEffects = () => {
            if (window.ParticleEngine) ParticleEngine.setEffect(navSettings.effect);
            watch(() => navSettings.effect, (e) => {
                if (window.ParticleEngine) ParticleEngine.setEffect(e);
            });
        };

        // ── Lifecycle ──────────────────────────────────────────────────────
        onMounted(() => {
            setupEffects();
            if (window.lucide) lucide.createIcons();
        });

        watch(shiftSettings, (v) => StorageProvider.saveShiftSettings(v), { deep: true });

        watch([showTodayTasks, showDayDetail, showTagsModal], () => {
            nextTick(() => { if (window.lucide) lucide.createIcons(); });
        });

        // ── Return ─────────────────────────────────────────────────────────
        return {
            // Nav
            navDropdownOpen, currentPageTitle, toggleNavDropdown,
            navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle, themeStyle,
            // Calendar
            calendarDate, calendarDays, displayMonthYear, shiftData, shiftSettings,
            changeMonth, handleDayClick, applyQuickTagToDay,
            activeQuickTag, activeQuickTagCategory, selectQuickTag, toggleQuickTagCategory,
            getTagName, getTagColor,
            // Today tasks
            todayTasks,
            // Modal states
            showTodayTasks, showDayDetail, selectedDay,
            jumpPicker, openJumpPicker, updateJumpDate, confirmJump,
            showTagsModal, isAnyModalOpen,
            // Shift tags
            addShiftTag, removeShiftTag, addPayTag, removePayTag,
            // Jobs / salary
            addJob, removeJob, calcJobMonthly, totalMonthlyEstimate, getUnitsPlaceholder,
            // Shift time picker
            shiftTimePicker, openShiftTimePicker, confirmShiftTimePicker,
            // Translations
            t
        };
    }
});

app.mount('#app');
