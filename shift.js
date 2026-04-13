// shift.js — Glassy Shift Vue app v3.0
// Depends on: storage.js (StorageProvider, ImageDB), nav.js (useNav)
// Theme state is provided by useNav() via navSettings / isDarkTheme / glassStyle.

const { createApp, ref, computed, onMounted, watch, nextTick, reactive } = Vue;

const app = createApp({
    setup() {
        // ── Nav & shared theme ───────────────────────────────────────────────
        const {
            navDropdownOpen, currentPageTitle, toggleNavDropdown,
            navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle
        } = useNav();

        // ── Calendar state ───────────────────────────────────────────────────
        const calendarDate = ref(new Date());
        const shiftData = ref(StorageProvider.getShiftData());

        const shiftSettings = ref({
            payroll: {
                name: 'Main Job',
                method: 'monthly',   // 'monthly' | 'daily' | 'weekly' | 'hourly'
                rate: 30000,
                payDay: 5,
                holidayLogic: 'early',
            },
            shiftTags: [
                { id: 'early',  name: '早班', startTime: '08:00', endTime: '16:00', color: '#3b82f6' },
                { id: 'middle', name: '中班', startTime: '12:00', endTime: '20:00', color: '#f59e0b' },
                { id: 'late',   name: '晚班', startTime: '16:00', endTime: '00:00', color: '#8b5cf6' }
            ],
            payTags: [
                { id: 'salary', name: '薪資', color: '#10b981' },
                { id: 'bonus',  name: '獎金', color: '#ef4444' }
            ],
            ...StorageProvider.getShiftSettings()
        });

        // ── UI state ─────────────────────────────────────────────────────────
        const activeQuickTag = ref(null);
        const activeQuickTagCategory = ref(null); // 'shift' | 'pay'
        const showTodayTasks = ref(false);
        const showDayDetail = ref(false);
        const selectedDay = ref(null);
        const showTagsModal = ref(false);
        const tagsTab = ref('shift'); // 'shift' | 'salary'

        const confirmModal = reactive({ show: false, title: '', message: '', onConfirm: null });

        // themeStyle is handled by bg-layer; kept as empty object for compatibility
        const themeStyle = computed(() => ({}));

        const isAnyModalOpen = computed(() =>
            showTodayTasks.value || showDayDetail.value ||
            jumpPicker.value.show || confirmModal.show ||
            showTagsModal.value || clockPicker.show
        );

        // ── Computed: calendar ───────────────────────────────────────────────
        const calendarDays = computed(() => {
            if (!(calendarDate.value instanceof Date)) return [];
            const year  = calendarDate.value.getFullYear();
            const month = calendarDate.value.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay  = new Date(year, month + 1, 0);
            const days = [];

            const startOffset = firstDay.getDay();
            const prevLast = new Date(year, month, 0).getDate();
            for (let i = startOffset - 1; i >= 0; i--)
                days.push({ date: new Date(year, month - 1, prevLast - i), isCurrentMonth: false });
            for (let i = 1; i <= lastDay.getDate(); i++)
                days.push({ date: new Date(year, month, i), isCurrentMonth: true });
            const remaining = 42 - days.length;
            for (let i = 1; i <= remaining; i++)
                days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });

            return days.map(day => {
                const dateStr = day.date.toISOString().split('T')[0];
                return {
                    ...day, dateStr,
                    data: shiftData.value[dateStr] || {},
                    isToday: dateStr === new Date().toISOString().split('T')[0]
                };
            });
        });

        const displayMonthYear = computed(() => {
            if (!(calendarDate.value instanceof Date)) return { year: '', month: '' };
            return {
                year: calendarDate.value.getFullYear(),
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
            if (activeQuickTag.value?.type === type && activeQuickTag.value?.id === id)
                activeQuickTag.value = null;
            else
                activeQuickTag.value = { type, id };
        };

        const getTagName  = (type, id) =>
            (type === 'shift' ? shiftSettings.value.shiftTags : shiftSettings.value.payTags)
                .find(t => t.id === id)?.name  || '';
        const getTagColor = (type, id) =>
            (type === 'shift' ? shiftSettings.value.shiftTags : shiftSettings.value.payTags)
                .find(t => t.id === id)?.color || 'rgba(255,255,255,0.2)';

        // ── Tag management ───────────────────────────────────────────────────
        const addShiftTag = () => shiftSettings.value.shiftTags.push(
            { id: 'shift_' + Date.now(), name: '新輪班', startTime: '09:00', endTime: '18:00', color: '#3b82f6' }
        );
        const removeShiftTag = (id) => {
            shiftSettings.value.shiftTags = shiftSettings.value.shiftTags.filter(t => t.id !== id);
        };
        const addPayTag = () => shiftSettings.value.payTags.push(
            { id: 'pay_' + Date.now(), name: '新項目', color: '#10b981' }
        );
        const removePayTag = (id) => {
            shiftSettings.value.payTags = shiftSettings.value.payTags.filter(t => t.id !== id);
        };

        // ── Salary calculation ───────────────────────────────────────────────
        const calculateMonthlySalary = computed(() => {
            const p = shiftSettings.value.payroll;
            if (!p.rate) return 0;
            switch (p.method) {
                case 'monthly': return p.rate;
                case 'daily':   return Math.round(p.rate * 22);
                case 'weekly':  return Math.round(p.rate * 4.3);
                case 'hourly':  return Math.round(p.rate * 8 * 22);
                default:        return p.rate;
            }
        });

        // ── Circular Clock Picker ────────────────────────────────────────────
        const clockPicker = reactive({
            show:        false,
            targetTagId: null,
            target:      null,   // 'startTime' | 'endTime'
            mode:        'hour', // 'hour' | 'minute'
            hour:        9,      // 24-hour (0–23)
            minute:      0,
        });

        const clockIsAM = computed(() => clockPicker.hour < 12);
        const clockDisplayHour = computed(() => { const h = clockPicker.hour % 12; return h === 0 ? 12 : h; });

        // 12 hour-marker positions on clock face
        const clockHourDots = computed(() =>
            [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h, i) => {
                const a = (i * 30 - 90) * (Math.PI / 180);
                return { h, x: 100 + 72 * Math.cos(a), y: 100 + 72 * Math.sin(a) };
            })
        );

        // 12 minute-marker positions (steps of 5)
        const clockMinuteDots = computed(() =>
            [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m, i) => {
                const a = (i * 30 - 90) * (Math.PI / 180);
                return { m, x: 100 + 72 * Math.cos(a), y: 100 + 72 * Math.sin(a) };
            })
        );

        // SVG clock hand tip
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

        // h = 1–12 from clock face
        const selectClockHour = (h) => {
            let h24;
            if (clockIsAM.value)  h24 = (h === 12) ? 0  : h;
            else                  h24 = (h === 12) ? 12 : h + 12;
            clockPicker.hour = h24;
            clockPicker.mode = 'minute'; // auto-advance to minute
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
                title: '清除暫存',
                message: '確定要清除介面暫存並更新嗎？輪班紀錄不受影響。',
                onConfirm: () => {
                    StorageProvider.saveCommonSettings({ theme: 'cherry', useCustomBg: false, customBg: '', lang: 'zh', effect: 'none', notificationsEnabled: true });
                    location.reload();
                }
            });
        };

        // ── Effects & background ──────────────────────────────────────────────
        const themeImages = {
            cherry: './theme/cherry.png', forest: './theme/forest.png', night: './theme/night.png',
            sea: './theme/sea.png', seaside: './theme/seaside.png', sky: './theme/sky.png',
            sunset: './theme/sunset.png', torii: './theme/torii.png'
        };

        const applyThemeBg = (theme) => {
            if (navSettings.useCustomBg) return;
            if (themeImages[theme]) {
                document.body.style.backgroundImage = `url(${themeImages[theme]}?v=${Date.now()})`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
                document.body.style.backgroundAttachment = 'fixed';
            } else {
                document.body.style.backgroundImage = '';
            }
        };

        // ── Lifecycle ─────────────────────────────────────────────────────────
        onMounted(() => {
            confirmModal.show = false;
            applyThemeBg(navSettings.theme);
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
                        const notify = () => new Notification('今日輪班', { body: `今日班次: ${first.name}` });
                        if (Notification.permission === 'granted') notify();
                        else if (Notification.permission !== 'denied')
                            Notification.requestPermission().then(p => { if (p === 'granted') notify(); });
                        data.notified = true;
                    }
                }
            }, 60000);
        });

        watch(() => navSettings.theme,  applyThemeBg);
        watch(() => navSettings.effect, (eff) => { if (window.ParticleEngine) ParticleEngine.setEffect(eff); });
        watch(shiftSettings, (val) => StorageProvider.saveShiftSettings(val), { deep: true });
        watch([showTodayTasks, showDayDetail, showTagsModal], () => {
            nextTick(() => { if (window.lucide) lucide.createIcons(); });
        });

        // ── Return ────────────────────────────────────────────────────────────
        return {
            // nav
            navDropdownOpen, currentPageTitle, toggleNavDropdown,
            // theme (from nav.js)
            navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle, themeStyle,
            // calendar
            calendarDate, calendarDays, displayMonthYear,
            changeMonth, handleDayClick,
            // quick tags
            activeQuickTag, activeQuickTagCategory,
            selectQuickTag, toggleQuickTagCategory,
            // shift data
            shiftData, getTagName, getTagColor, applyQuickTagToDay,
            // modals
            showTodayTasks, showDayDetail, selectedDay, todayTasks,
            // jump picker
            jumpPicker, openJumpPicker, updateJumpDate, confirmJump,
            // tags modal
            showTagsModal, tagsTab,
            shiftSettings, addShiftTag, removeShiftTag, addPayTag, removePayTag,
            // salary
            calculateMonthlySalary,
            // clock picker
            clockPicker, clockIsAM, clockDisplayHour,
            clockHourDots, clockMinuteDots, clockHandX, clockHandY,
            openClockPicker, selectClockHour, selectClockMinute,
            toggleClockAmPm, confirmClockPicker,
            // confirm modal
            confirmModal, clearCacheAndUpdate,
            // misc
            isAnyModalOpen,
        };
    }
});

app.mount('#app');
