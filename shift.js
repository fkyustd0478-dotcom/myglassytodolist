// shift.js — Glassy Shift Vue app v4.1
// Depends on: storage.js (StorageProvider, ImageDB), nav.js (useNav)

// ── Translations (EN / ZH) ────────────────────────────────────────────────
const shiftTranslations = {
    zh: {
        // Nav dropdown labels
        navIndex: '琉璃待辦', navShift: '琉璃輪班', navSetting: '系統設定',
        // Bottom nav
        todayTasks: '今日事', salary: '薪資', shiftNav: '輪班', labelSettings: '標籤設定',
        // Tags modal
        labelSettingsTitle: '標籤設定',
        shiftTab: '輪班設定', salaryTab: '薪資設定',
        // Shift section
        shiftTagLabel: '班別', shiftNamePlaceholder: '班名', addShift: '+ 新增班別',
        // Salary section
        jobSourceLabel: '工作 / 薪資來源',
        jobNamePlaceholder: '工作名稱', addJob: '+ 新增工作',
        hourly: '時薪', daily: '日薪', weekly: '週薪', monthly: '月薪',
        amountPlaceholder: '金額',
        unitsHour: '小時/月', unitsDay: '天/月', unitsWeek: '週/月',
        payDayPrefix: '每月', payDaySuffix: '日發薪，遇假日',
        advance: '提前', postpone: '延後',
        totalMonthly: '總估算 (月)',
        // Clock picker
        clickHourHint: '點選時，自動跳至分', clickMinuteHint: '點選分鐘',
        // Today tasks modal
        noTasksToday: '今日無待辦事項',
        // Day detail
        shiftMarkLabel: '輪班設定', payMarkLabel: '薪資標記',
        noteLabel: '備註', notePlaceholder: '輸入當日備註...',
        // Jump picker
        selectYearMonth: '選擇年月',
        // Shared buttons
        cancel: '取消', confirm: '確定',
        // Confirm modal
        clearCacheTitle: '清除暫存',
        clearCacheMsg: '確定要清除介面暫存並更新嗎？輪班紀錄不受影響。',
        // Weekday headers
        weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    },
    en: {
        navIndex: 'Glassy Todo', navShift: 'Glassy Shift', navSetting: 'Settings',
        todayTasks: "Today's Tasks", salary: 'Salary', shiftNav: 'Shifts', labelSettings: 'Labels',
        labelSettingsTitle: 'Label Settings',
        shiftTab: 'Shift Config', salaryTab: 'Salary Config',
        shiftTagLabel: 'Shifts', shiftNamePlaceholder: 'Name', addShift: '+ Add Shift',
        jobSourceLabel: 'Jobs / Income Sources',
        jobNamePlaceholder: 'Job Name', addJob: '+ Add Job',
        hourly: 'Hourly', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
        amountPlaceholder: 'Amount',
        unitsHour: 'hrs/mo', unitsDay: 'days/mo', unitsWeek: 'wks/mo',
        payDayPrefix: 'Pay on', payDaySuffix: 'of month. If holiday:',
        advance: 'Advance', postpone: 'Postpone',
        totalMonthly: 'Monthly Total Est.',
        clickHourHint: 'Tap hour — advances to minute', clickMinuteHint: 'Tap minute',
        noTasksToday: 'No tasks for today',
        shiftMarkLabel: 'Shift Tags', payMarkLabel: 'Pay Tags',
        noteLabel: 'Notes', notePlaceholder: 'Notes for this day...',
        selectYearMonth: 'Select Year & Month',
        cancel: 'Cancel', confirm: 'Confirm',
        clearCacheTitle: 'Clear Cache',
        clearCacheMsg: 'Reset UI cache? Shift records will not be affected.',
        weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    }
};

const { createApp, ref, computed, onMounted, watch, nextTick, reactive } = Vue;

const app = createApp({
    setup() {
        // ── Nav & shared theme ───────────────────────────────────────────────
        const {
            navDropdownOpen, currentPageTitle, toggleNavDropdown,
            navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle
        } = useNav();

        // ── Language / translations ──────────────────────────────────────────
        const t = computed(() => shiftTranslations[navSettings.lang] || shiftTranslations.zh);

        // ── Shift settings with migration ────────────────────────────────────
        const rawSettings = StorageProvider.getShiftSettings();

        // Migrate old payTags + payroll → jobs array (backwards compat)
        if ((rawSettings.payTags || rawSettings.payroll) && !rawSettings.jobs) {
            const payroll = rawSettings.payroll || {};
            const tags    = rawSettings.payTags  || [
                { id: 'salary', name: '薪資', color: '#10b981' },
                { id: 'bonus',  name: '獎金', color: '#ef4444' }
            ];
            rawSettings.jobs = tags.map((tag, i) => ({
                id:           tag.id,
                name:         tag.name,
                color:        tag.color,
                method:       i === 0 ? (payroll.method || 'monthly') : 'monthly',
                rate:         i === 0 ? (payroll.rate   || 0)         : 0,
                units:        null,
                payDay:       payroll.payDay       || 5,
                holidayLogic: payroll.holidayLogic || 'early'
            }));
            delete rawSettings.payTags;
            delete rawSettings.payroll;
        }

        // Ensure existing jobs have `units` field
        if (rawSettings.jobs) {
            rawSettings.jobs = rawSettings.jobs.map(j =>
                j.units === undefined ? { ...j, units: null } : j
            );
        }

        const shiftSettings = ref({
            jobs: [
                { id: 'salary', name: '薪資', color: '#10b981', method: 'monthly', rate: 30000, units: null, payDay: 5, holidayLogic: 'early' },
                { id: 'bonus',  name: '獎金', color: '#ef4444', method: 'monthly', rate: 0,     units: null, payDay: 5, holidayLogic: 'early' }
            ],
            shiftTags: [
                { id: 'early',  name: '早班', startTime: '08:00', endTime: '16:00', color: '#3b82f6' },
                { id: 'middle', name: '中班', startTime: '12:00', endTime: '20:00', color: '#f59e0b' },
                { id: 'late',   name: '晚班', startTime: '16:00', endTime: '00:00', color: '#8b5cf6' }
            ],
            ...rawSettings
        });

        // ── Calendar state ───────────────────────────────────────────────────
        const calendarDate = ref(new Date());
        const shiftData    = ref(StorageProvider.getShiftData());

        // ── UI state ─────────────────────────────────────────────────────────
        const activeQuickTag         = ref(null);
        const activeQuickTagCategory = ref(null); // 'shift' | 'pay'
        const showTodayTasks  = ref(false);
        const showDayDetail   = ref(false);
        const selectedDay     = ref(null);
        const showTagsModal   = ref(false);
        const tagsTab         = ref('shift');

        const confirmModal = reactive({ show: false, title: '', message: '', onConfirm: null });

        const themeStyle = computed(() => ({}));

        const isAnyModalOpen = computed(() =>
            showTodayTasks.value || showDayDetail.value ||
            jumpPicker.value.show || confirmModal.show ||
            showTagsModal.value   || clockPicker.show
        );

        // ── Computed: calendar ───────────────────────────────────────────────
        const calendarDays = computed(() => {
            if (!(calendarDate.value instanceof Date)) return [];
            const year  = calendarDate.value.getFullYear();
            const month = calendarDate.value.getMonth();
            const days  = [];

            const startOffset = new Date(year, month, 1).getDay();
            const prevLast    = new Date(year, month, 0).getDate();
            const lastDay     = new Date(year, month + 1, 0).getDate();

            for (let i = startOffset - 1; i >= 0; i--)
                days.push({ date: new Date(year, month - 1, prevLast - i), isCurrentMonth: false });
            for (let i = 1; i <= lastDay; i++)
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

        // ── Jump Picker ──────────────────────────────────────────────────────
        const jumpPicker = ref({ show: false, year: new Date().getFullYear(), month: new Date().getMonth() });

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
            calendarDate.value = d;
            jumpPicker.value.show = false;
        };

        // ── Today Tasks ──────────────────────────────────────────────────────
        const todayTasks = computed(() => {
            const todoData = StorageProvider.getTodoData();
            const todayStr = new Date().toISOString().split('T')[0];
            const todos = Array.isArray(todoData.todos) ? todoData.todos : [];
            return todos
                .filter(t => t.dueDate === todayStr && !t.isDeleted)
                .sort((a, b) => (b.priority || 0) - (a.priority || 0));
        });

        // ── Calendar actions ─────────────────────────────────────────────────
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
            if (!shiftData.value[dateStr][field]) {
                shiftData.value[dateStr][field] = [];
                const old = type === 'shift' ? 'shiftId' : 'payId';
                if (shiftData.value[dateStr][old]) {
                    shiftData.value[dateStr][field].push(shiftData.value[dateStr][old]);
                    delete shiftData.value[dateStr][old];
                }
            }
            const idx = shiftData.value[dateStr][field].indexOf(id);
            if (idx > -1) shiftData.value[dateStr][field].splice(idx, 1);
            else shiftData.value[dateStr][field].push(id);
            StorageProvider.saveShiftData(shiftData.value);
        };

        const applyQuickTagToDay = (dateStr, type, id) => {
            if (!shiftData.value[dateStr]) shiftData.value[dateStr] = { shiftIds: [], payIds: [] };
            const field = type === 'shift' ? 'shiftIds' : 'payIds';
            if (!shiftData.value[dateStr][field]) shiftData.value[dateStr][field] = [];
            const idx = shiftData.value[dateStr][field].indexOf(id);
            if (idx > -1) shiftData.value[dateStr][field].splice(idx, 1);
            else shiftData.value[dateStr][field].push(id);
            StorageProvider.saveShiftData(shiftData.value);
        };

        const toggleQuickTagCategory = (category) => {
            if (activeQuickTagCategory.value === category) {
                activeQuickTagCategory.value = null;
                activeQuickTag.value = null;
            } else {
                activeQuickTagCategory.value = category;
                activeQuickTag.value = null;
            }
        };

        const selectQuickTag = (type, id) => {
            if (activeQuickTag.value && activeQuickTag.value.type === type && activeQuickTag.value.id === id)
                activeQuickTag.value = null;
            else
                activeQuickTag.value = { type, id };
        };

        const getTagName = (type, id) => {
            if (type === 'shift') return shiftSettings.value.shiftTags.find(t => t.id === id)?.name || '';
            return shiftSettings.value.jobs.find(j => j.id === id)?.name || '';
        };
        const getTagColor = (type, id) => {
            if (type === 'shift') return shiftSettings.value.shiftTags.find(t => t.id === id)?.color || 'rgba(255,255,255,0.2)';
            return shiftSettings.value.jobs.find(j => j.id === id)?.color || 'rgba(255,255,255,0.2)';
        };

        // ── Shift tag management ─────────────────────────────────────────────
        const addShiftTag = () => shiftSettings.value.shiftTags.push(
            { id: 'shift_' + Date.now(), name: '新輪班', startTime: '09:00', endTime: '18:00', color: '#3b82f6' }
        );
        const removeShiftTag = (id) => {
            shiftSettings.value.shiftTags = shiftSettings.value.shiftTags.filter(t => t.id !== id);
        };

        // ── Multi-job salary management ──────────────────────────────────────
        const addJob = () => shiftSettings.value.jobs.push({
            id: 'job_' + Date.now(),
            name: t.value.jobNamePlaceholder,
            color: '#6366f1',
            method: 'monthly', rate: 0, units: null,
            payDay: 5, holidayLogic: 'early'
        });
        const removeJob = (id) => {
            shiftSettings.value.jobs = shiftSettings.value.jobs.filter(j => j.id !== id);
        };

        // Units-aware monthly salary estimate
        // units = null → use smart default (hourly:176h, daily:22d, weekly:4w, monthly: N/A)
        const calcJobMonthly = (job) => {
            if (!job.rate) return 0;
            const u = job.units;
            switch (job.method) {
                case 'monthly': return job.rate;
                case 'daily':   return Math.round(job.rate * (u != null ? u : 22));
                case 'weekly':  return Math.round(job.rate * (u != null ? u : 4));
                case 'hourly':  return Math.round(job.rate * (u != null ? u : 176));
                default:        return job.rate;
            }
        };

        const calculateTotalMonthlySalary = computed(() =>
            (shiftSettings.value.jobs || []).reduce((sum, job) => sum + calcJobMonthly(job), 0)
        );

        // Units label & placeholder for a given method
        const getUnitsLabel = (method) => {
            if (method === 'hourly') return t.value.unitsHour;
            if (method === 'daily')  return t.value.unitsDay;
            if (method === 'weekly') return t.value.unitsWeek;
            return '';
        };

        // ── Circular Clock Picker ────────────────────────────────────────────
        const clockPicker = reactive({
            show: false, targetTagId: null, target: null,
            mode: 'hour', hour: 9, minute: 0,
        });

        const clockIsAM        = computed(() => clockPicker.hour < 12);
        const clockDisplayHour = computed(() => { const h = clockPicker.hour % 12; return h === 0 ? 12 : h; });

        const clockHourDots = computed(() =>
            [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h, i) => {
                const a = (i * 30 - 90) * (Math.PI / 180);
                return { h, x: 100 + 72 * Math.cos(a), y: 100 + 72 * Math.sin(a) };
            })
        );

        const clockMinuteDots = computed(() =>
            [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m, i) => {
                const a = (i * 30 - 90) * (Math.PI / 180);
                return { m, x: 100 + 72 * Math.cos(a), y: 100 + 72 * Math.sin(a) };
            })
        );

        const _clockAngle = computed(() => {
            if (clockPicker.mode === 'hour') {
                const idx = clockDisplayHour.value === 12 ? 0 : clockDisplayHour.value;
                return (idx * 30 - 90) * (Math.PI / 180);
            }
            return (clockPicker.minute / 5 * 30 - 90) * (Math.PI / 180);
        });
        const clockHandX = computed(() => 100 + 65 * Math.cos(_clockAngle.value));
        const clockHandY = computed(() => 100 + 65 * Math.sin(_clockAngle.value));

        const openClockPicker = (tagId, field) => {
            const tag = shiftSettings.value.shiftTags.find(t => t.id === tagId);
            if (!tag) return;
            const [h, m] = (field === 'startTime' ? tag.startTime : tag.endTime).split(':').map(Number);
            Object.assign(clockPicker, { show: true, targetTagId: tagId, target: field, hour: h, minute: m, mode: 'hour' });
        };

        const selectClockHour = (h) => {
            let h24;
            if (clockIsAM.value) h24 = (h === 12) ? 0  : h;
            else                 h24 = (h === 12) ? 12 : h + 12;
            clockPicker.hour = h24;
            clockPicker.mode = 'minute';
        };

        const toggleClockAmPm = (toAM) => {
            if (toAM  && clockPicker.hour >= 12) clockPicker.hour -= 12;
            if (!toAM && clockPicker.hour < 12)  clockPicker.hour += 12;
        };

        const selectClockMinute = (m) => { clockPicker.minute = m; };

        const confirmClockPicker = () => {
            const tag = shiftSettings.value.shiftTags.find(t => t.id === clockPicker.targetTagId);
            if (tag) {
                const ts = `${clockPicker.hour.toString().padStart(2,'0')}:${clockPicker.minute.toString().padStart(2,'0')}`;
                if (clockPicker.target === 'startTime') tag.startTime = ts;
                else tag.endTime = ts;
            }
            clockPicker.show = false;
        };

        // ── Confirm modal ─────────────────────────────────────────────────────
        const clearCacheAndUpdate = () => {
            Object.assign(confirmModal, {
                show: true,
                title:   t.value.clearCacheTitle,
                message: t.value.clearCacheMsg,
                onConfirm: () => {
                    StorageProvider.saveCommonSettings({
                        theme: 'system', useCustomBg: false, customBg: '',
                        lang: navSettings.lang, effect: 'none', notificationsEnabled: true
                    });
                    location.reload();
                }
            });
        };

        // ── Lifecycle ─────────────────────────────────────────────────────────
        onMounted(() => {
            confirmModal.show = false;
            if (window.ParticleEngine) ParticleEngine.setEffect(navSettings.effect);
            if (window.lucide) lucide.createIcons();

            setInterval(() => {
                if (!navSettings.notificationsEnabled) return;
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`;
                const data = shiftData.value[todayStr];
                if (data?.shiftIds?.length > 0 && !data.notified) {
                    const first = shiftSettings.value.shiftTags.find(t => t.id === data.shiftIds[0]);
                    if (first) {
                        const notify = () => new Notification(t.value.todayTasks, { body: first.name });
                        if (Notification.permission === 'granted') notify();
                        else if (Notification.permission !== 'denied')
                            Notification.requestPermission().then(p => { if (p === 'granted') notify(); });
                        data.notified = true;
                    }
                }
            }, 60000);
        });

        watch(() => navSettings.effect, (eff) => { if (window.ParticleEngine) ParticleEngine.setEffect(eff); });
        watch(shiftSettings, (val) => StorageProvider.saveShiftSettings(val), { deep: true });
        watch([showTodayTasks, showDayDetail, showTagsModal], () => {
            nextTick(() => { if (window.lucide) lucide.createIcons(); });
        });

        // ── Return ────────────────────────────────────────────────────────────
        return {
            t,
            navDropdownOpen, currentPageTitle, toggleNavDropdown,
            navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle, themeStyle,
            calendarDate, calendarDays, displayMonthYear, changeMonth, handleDayClick,
            activeQuickTag, activeQuickTagCategory, selectQuickTag, toggleQuickTagCategory,
            shiftData, getTagName, getTagColor, applyQuickTagToDay,
            showTodayTasks, showDayDetail, selectedDay, todayTasks,
            jumpPicker, openJumpPicker, updateJumpDate, confirmJump,
            showTagsModal, tagsTab, shiftSettings,
            addShiftTag, removeShiftTag,
            addJob, removeJob, calcJobMonthly, calculateTotalMonthlySalary, getUnitsLabel,
            clockPicker, clockIsAM, clockDisplayHour,
            clockHourDots, clockMinuteDots, clockHandX, clockHandY,
            openClockPicker, selectClockHour, selectClockMinute, toggleClockAmPm, confirmClockPicker,
            confirmModal, clearCacheAndUpdate,
            isAnyModalOpen,
        };
    }
});

app.mount('#app');
