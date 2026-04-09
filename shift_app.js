const { createApp, ref, computed, onMounted, watch, nextTick } = Vue;

const StorageProvider = {
    saveShiftData: (data) => localStorage.setItem('glassy_shift_data', JSON.stringify(data)),
    getShiftData: () => JSON.parse(localStorage.getItem('glassy_shift_data') || '{}'),
    saveShiftSettings: (settings) => localStorage.setItem('glassy_shift_settings', JSON.stringify(settings)),
    getShiftSettings: () => JSON.parse(localStorage.getItem('glassy_shift_settings') || '{}'),
    getTodoData: () => JSON.parse(localStorage.getItem('todo_data') || '{"todos":[]}'),
};

const app = createApp({
    setup() {
        // --- State ---
        const activeTab = ref('calendar'); // calendar, today, payroll_tags, shift_tags, settings
        const calendarDate = ref(new Date());
        const shiftData = ref(StorageProvider.getShiftData()); // { 'YYYY-MM-DD': { shiftId, payId, note } }
        const settings = ref({
            theme: 'cherry',
            useCustomBg: false,
            customBg: '',
            payroll: {
                name: 'Main Job',
                method: 'monthly', // daily, weekly, monthly
                rate: 150,
                payDay: 5,
                holidayLogic: 'early', // early, late
                holidayOffset: 1
            },
            shiftTags: [
                { id: 'early', name: '早班', startTime: '08:00', endTime: '16:00', color: '#FFD700' },
                { id: 'middle', name: '中班', startTime: '12:00', endTime: '20:00', color: '#FF8C00' },
                { id: 'late', name: '晚班', startTime: '16:00', endTime: '00:00', color: '#4B0082' }
            ],
            payTags: [
                { id: 'salary', name: '薪資', color: '#32CD32' },
                { id: 'bonus', name: '獎金', color: '#FF4500' }
            ],
            ...StorageProvider.getShiftSettings()
        });

        const activeQuickTag = ref(null); // { type: 'shift'|'pay', id: string }
        const showSettings = ref(false);
        const showTodayTasks = ref(false);
        const showDayDetail = ref(false);
        const selectedDay = ref(null); // 'YYYY-MM-DD'

        // --- Computed ---
        const isDarkTheme = computed(() => ['night', 'forest', 'sea'].includes(settings.value.theme));
        
        const themeStyle = computed(() => {
            const themeImages = {
                cherry: './theme/cherry.png',
                forest: './theme/forest.png',
                night: './theme/night.png',
                sea: './theme/sea.png',
                seaside: './theme/seaside.png',
                sky: './theme/sky.png',
                sunset: './theme/sunset.png',
                torii: './theme/torii.png'
            };
            const bg = settings.value.useCustomBg ? `url(${settings.value.customBg})` : `url(${themeImages[settings.value.theme]})`;
            return { backgroundImage: bg };
        });

        const calendarDays = computed(() => {
            const year = calendarDate.value.getFullYear();
            const month = calendarDate.value.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            
            const days = [];
            const startOffset = firstDay.getDay();
            
            // Previous month days
            const prevMonthLastDay = new Date(year, month, 0).getDate();
            for (let i = startOffset - 1; i >= 0; i--) {
                const d = new Date(year, month - 1, prevMonthLastDay - i);
                days.push({ date: d, isCurrentMonth: false });
            }
            
            // Current month days
            for (let i = 1; i <= lastDay.getDate(); i++) {
                const d = new Date(year, month, i);
                days.push({ date: d, isCurrentMonth: true });
            }
            
            // Next month days
            const remaining = 42 - days.length;
            for (let i = 1; i <= remaining; i++) {
                const d = new Date(year, month + 1, i);
                days.push({ date: d, isCurrentMonth: false });
            }
            
            return days.map(day => {
                const dateStr = day.date.toISOString().split('T')[0];
                return {
                    ...day,
                    dateStr,
                    data: shiftData.value[dateStr] || {},
                    isToday: dateStr === new Date().toISOString().split('T')[0]
                };
            });
        });

        const todayTasks = computed(() => {
            const todoData = StorageProvider.getTodoData();
            const todayStr = new Date().toISOString().split('T')[0];
            const todos = Array.isArray(todoData.todos) ? todoData.todos : [];
            return todos
                .filter(t => t.dueDate === todayStr && !t.isDeleted)
                .sort((a, b) => (b.priority || 0) - (a.priority || 0));
        });

        // --- Methods ---
        const changeMonth = (delta) => {
            const d = new Date(calendarDate.value);
            d.setMonth(d.getMonth() + delta);
            calendarDate.value = d;
        };

        const updatePickerDate = (type, val) => {
            const d = new Date(calendarDate.value);
            if (type === 'year') {
                // Circular 1970-2099
                let newYear = val;
                if (newYear < 1970) newYear = 2099;
                if (newYear > 2099) newYear = 1970;
                d.setFullYear(newYear);
            } else if (type === 'month') {
                // Circular 0-11
                let newMonth = val;
                if (newMonth < 0) newMonth = 11;
                if (newMonth > 11) newMonth = 0;
                d.setMonth(newMonth);
            }
            calendarDate.value = d;
        };

        const handleDayClick = (day) => {
            if (activeQuickTag.value) {
                applyQuickTag(day.dateStr);
            } else {
                selectedDay.value = day.dateStr;
                if (!shiftData.value[selectedDay.value]) {
                    shiftData.value[selectedDay.value] = {};
                }
                showDayDetail.value = true;
            }
        };

        const applyQuickTag = (dateStr) => {
            if (!shiftData.value[dateStr]) shiftData.value[dateStr] = {};
            
            if (activeQuickTag.value.type === 'shift') {
                shiftData.value[dateStr].shiftId = activeQuickTag.value.id;
            } else {
                shiftData.value[dateStr].payId = activeQuickTag.value.id;
            }
            StorageProvider.saveShiftData(shiftData.value);
        };

        const selectQuickTag = (type, id) => {
            if (activeQuickTag.value && activeQuickTag.value.type === type && activeQuickTag.value.id === id) {
                activeQuickTag.value = null;
            } else {
                activeQuickTag.value = { type, id };
            }
        };

        const getTagName = (type, id) => {
            const list = type === 'shift' ? settings.value.shiftTags : settings.value.payTags;
            return list.find(t => t.id === id)?.name || '';
        };

        const getTagColor = (type, id) => {
            const list = type === 'shift' ? settings.value.shiftTags : settings.value.payTags;
            return list.find(t => t.id === id)?.color || 'rgba(255,255,255,0.2)';
        };

        const toggleTheme = (theme) => {
            settings.value.theme = theme;
        };

        const handleFileUpload = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    settings.value.customBg = ev.target.result;
                    settings.value.useCustomBg = true;
                };
                reader.readAsDataURL(file);
            }
        };

        // --- Lifecycle ---
        onMounted(() => {
            if (window.lucide) lucide.createIcons();
        });

        watch(settings, (newVal) => {
            StorageProvider.saveShiftSettings(newVal);
        }, { deep: true });

        watch(activeTab, () => {
            nextTick(() => {
                if (window.lucide) lucide.createIcons();
            });
        });

        return {
            activeTab, calendarDate, calendarDays, settings, isDarkTheme, themeStyle,
            changeMonth, updatePickerDate, handleDayClick, activeQuickTag, selectQuickTag,
            getTagName, getTagColor, todayTasks, showSettings, showTodayTasks, showDayDetail,
            selectedDay, shiftData, toggleTheme, handleFileUpload,
            getMaxDays: (m, y) => new Date(y, m + 1, 0).getDate()
        };
    }
});

app.mount('#app');
