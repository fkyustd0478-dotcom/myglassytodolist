const { createApp, ref, computed, onMounted, watch, nextTick } = Vue;

const StorageProvider = {
    saveShiftData: (data) => localStorage.setItem('glassy_shift_data', JSON.stringify(data)),
    getShiftData: () => JSON.parse(localStorage.getItem('glassy_shift_data') || '{}'),
    saveShiftSettings: (settings) => localStorage.setItem('glassy_shift_settings', JSON.stringify(settings)),
    getShiftSettings: () => JSON.parse(localStorage.getItem('glassy_shift_settings') || '{}'),
    saveCommonSettings: (settings) => localStorage.setItem('todo_settings', JSON.stringify(settings)),
    getCommonSettings: () => JSON.parse(localStorage.getItem('todo_settings') || '{}'),
    getTodoData: () => JSON.parse(localStorage.getItem('todo_data') || '{"todos":[]}'),
};

const app = createApp({
    setup() {
        // --- State ---
        const activeTab = ref('calendar'); 
        const calendarDate = ref(new Date());
        const shiftData = ref(StorageProvider.getShiftData()); 
        
        const commonSettings = ref({
            theme: 'cherry',
            useCustomBg: false,
            customBg: '',
            customBgOpacity: 0.5,
            lang: 'zh',
            ...StorageProvider.getCommonSettings()
        });

        const shiftSettings = ref({
            payroll: {
                name: 'Main Job',
                method: 'monthly',
                rate: 150,
                payDay: 5,
                holidayLogic: 'early',
                holidayOffset: 1
            },
            shiftTags: [
                { id: 'early', name: '早班', startTime: '08:00', endTime: '16:00', color: '#3b82f6' },
                { id: 'middle', name: '中班', startTime: '12:00', endTime: '20:00', color: '#f59e0b' },
                { id: 'late', name: '晚班', startTime: '16:00', endTime: '00:00', color: '#8b5cf6' }
            ],
            payTags: [
                { id: 'salary', name: '薪資', color: '#10b981' },
                { id: 'bonus', name: '獎金', color: '#ef4444' }
            ],
            ...StorageProvider.getShiftSettings()
        });

        const activeQuickTag = ref(null); 
        const activeQuickTagCategory = ref(null); // 'shift' or 'pay'
        const showSettings = ref(false);
        const settingsTab = ref('payroll'); // payroll, shifts
        const showTodayTasks = ref(false);
        const showDayDetail = ref(false);
        const selectedDay = ref(null); 

        const confirmModal = ref({
            show: false,
            title: '',
            message: '',
            onConfirm: null
        });

        // --- Computed ---
        const isDarkTheme = computed(() => {
            const darkThemes = ['forest', 'night', 'torii'];
            if (commonSettings.value.useCustomBg) {
                return commonSettings.value.customBgOpacity < 0.5;
            }
            return darkThemes.includes(commonSettings.value.theme);
        });
        
        const glassStyle = computed(() => {
            return isDarkTheme.value 
                ? { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.9)' }
                : { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(0,0,0,0.9)' };
        });

        const isAnyModalOpen = computed(() => {
            return showSettings.value || showTodayTasks.value || showDayDetail.value || jumpPicker.value.show || confirmModal.value.show;
        });
        
        const themeStyle = computed(() => ({})); // Handled by bg-layer and custom-bg-layer

        const themeClasses = computed(() => {
            return `theme-${commonSettings.value.theme}`;
        });

        const customBgStyle = computed(() => ({
            backgroundImage: `url(${commonSettings.value.customBg})`,
            opacity: 1 - commonSettings.value.customBgOpacity,
            display: commonSettings.value.useCustomBg ? 'block' : 'none'
        }));

        const calendarDays = computed(() => {
            if (!(calendarDate.value instanceof Date)) return [];
            const year = calendarDate.value.getFullYear();
            const month = calendarDate.value.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            
            const days = [];
            const startOffset = firstDay.getDay();
            
            const prevMonthLastDay = new Date(year, month, 0).getDate();
            for (let i = startOffset - 1; i >= 0; i--) {
                const d = new Date(year, month - 1, prevMonthLastDay - i);
                days.push({ date: d, isCurrentMonth: false });
            }
            
            for (let i = 1; i <= lastDay.getDate(); i++) {
                const d = new Date(year, month, i);
                days.push({ date: d, isCurrentMonth: true });
            }
            
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

        const displayMonthYear = computed(() => {
            if (!(calendarDate.value instanceof Date)) return { year: '', month: '' };
            return {
                year: calendarDate.value.getFullYear(),
                month: (calendarDate.value.getMonth() + 1).toString().padStart(2, '0')
            };
        });

        const jumpPicker = ref({
            show: false,
            year: new Date().getFullYear(),
            month: new Date().getMonth()
        });

        const openJumpPicker = () => {
            if (!(calendarDate.value instanceof Date)) {
                calendarDate.value = new Date();
            }
            jumpPicker.value.year = calendarDate.value.getFullYear();
            jumpPicker.value.month = calendarDate.value.getMonth();
            jumpPicker.value.show = true;
        };

        const updateJumpDate = (type, val) => {
            if (type === 'year') {
                // Circular 1970-2099
                jumpPicker.value.year = ((val - 1970 + 130) % 130) + 1970;
            } else if (type === 'month') {
                // Circular 0-11
                jumpPicker.value.month = (val + 12) % 12;
            }
        };

        const confirmJump = () => {
            const d = new Date(calendarDate.value);
            d.setFullYear(jumpPicker.value.year);
            d.setMonth(jumpPicker.value.month);
            calendarDate.value = d;
            jumpPicker.value.show = false;
        };
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
            
            const { type, id } = activeQuickTag.value;
            if (type === 'shift') {
                // Toggle if same
                shiftData.value[dateStr].shiftId = shiftData.value[dateStr].shiftId === id ? null : id;
            } else {
                shiftData.value[dateStr].payId = shiftData.value[dateStr].payId === id ? null : id;
            }
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
            if (activeQuickTag.value && activeQuickTag.value.type === type && activeQuickTag.value.id === id) {
                activeQuickTag.value = null;
            } else {
                activeQuickTag.value = { type, id };
            }
        };

        const dropdowns = reactive({
            navMenu: false
        });

        const toggleDropdown = (key) => {
            dropdowns[key] = !dropdowns[key];
        };

        const fileInput = ref(null);
        const triggerUpload = () => fileInput.value?.click();
        const handleUpload = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                commonSettings.value.customBg = event.target.result;
                commonSettings.value.useCustomBg = true;
            };
            reader.readAsDataURL(file);
        };
        const clearCustomBg = () => {
            commonSettings.value.customBg = '';
            commonSettings.value.useCustomBg = false;
        };

        const getTagName = (type, id) => {
            const list = type === 'shift' ? shiftSettings.value.shiftTags : shiftSettings.value.payTags;
            return list.find(t => t.id === id)?.name || '';
        };

        const getTagColor = (type, id) => {
            const list = type === 'shift' ? shiftSettings.value.shiftTags : shiftSettings.value.payTags;
            return list.find(t => t.id === id)?.color || 'rgba(255,255,255,0.2)';
        };

        const toggleTheme = (theme) => {
            commonSettings.value.theme = theme;
        };

        const clearCacheAndUpdate = () => {
            confirmModal.value = {
                show: true,
                title: '清除暫存',
                message: '確定要清除介面暫存並更新嗎？這將重置主題與語言設定，但不會刪除輪班紀錄。',
                onConfirm: () => {
                    const settings = StorageProvider.getCommonSettings();
                    const newSettings = {
                        theme: 'cherry',
                        useCustomBg: false,
                        customBg: '',
                        lang: settings.lang || 'zh'
                    };
                    StorageProvider.saveCommonSettings(newSettings);
                    location.reload();
                }
            };
        };

        // --- Tag Management ---
        const addShiftTag = () => {
            shiftSettings.value.shiftTags.push({
                id: 'shift_' + Date.now(),
                name: '新輪班',
                startTime: '09:00',
                endTime: '18:00',
                color: '#3b82f6'
            });
        };

        const removeShiftTag = (id) => {
            shiftSettings.value.shiftTags = shiftSettings.value.shiftTags.filter(t => t.id !== id);
        };

        const addPayTag = () => {
            shiftSettings.value.payTags.push({
                id: 'pay_' + Date.now(),
                name: '新項目',
                color: '#10b981'
            });
        };

        const removePayTag = (id) => {
            shiftSettings.value.payTags = shiftSettings.value.payTags.filter(t => t.id !== id);
        };

        // --- Lifecycle ---
        onMounted(() => {
            if (window.lucide) lucide.createIcons();
        });

        watch(commonSettings, (newVal) => {
            StorageProvider.saveCommonSettings(newVal);
        }, { deep: true });

        watch(shiftSettings, (newVal) => {
            StorageProvider.saveShiftSettings(newVal);
        }, { deep: true });

        watch([showSettings, showTodayTasks, showDayDetail, confirmModal], () => {
            nextTick(() => {
                if (window.lucide) lucide.createIcons();
            });
        }, { deep: true });

        return {
            activeTab, calendarDate, calendarDays, commonSettings, shiftSettings, isDarkTheme, themeStyle,
            changeMonth, handleDayClick, activeQuickTag, selectQuickTag,
            getTagName, getTagColor, todayTasks, showSettings, settingsTab, showTodayTasks, showDayDetail,
            selectedDay, shiftData, toggleTheme, clearCacheAndUpdate, confirmModal,
            displayMonthYear, openJumpPicker, jumpPicker, updateJumpDate, confirmJump,
            addShiftTag, removeShiftTag, addPayTag, removePayTag,
            activeQuickTagCategory, toggleQuickTagCategory, dropdowns, toggleDropdown,
            triggerUpload, handleUpload, clearCustomBg, fileInput, glassStyle, isAnyModalOpen,
            themeClasses, customBgStyle
        };
    }
});

app.mount('#app');
