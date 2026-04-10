const { createApp, ref, computed, onMounted, watch, nextTick, reactive } = Vue;

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
            effect: 'none',
            notificationsEnabled: true,
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
        const settingsTab = ref('payroll'); // payroll, shifts, system
        const showTodayTasks = ref(false);
        const showDayDetail = ref(false);
        const selectedDay = ref(null); 

        const confirmModal = ref({
            show: false,
            title: '',
            message: '',
            onConfirm: null
        });

        const translations = {
            en: {
                settings: 'Settings', theme: 'Theme', uiOpacity: 'Custom Image Opacity', lang: 'Language', notifications: 'Notifications',
                custom: 'Custom (Upload)', upload: 'Upload Photo', light: 'Light', dark: 'Dark', otherThemes: 'Other Themes',
                cherry: 'Cherry Blossom', sky: 'Sky', seaside: 'Seaside', sunset: 'Sunset', forest: 'Forest', sea: 'Sea', night: 'Night', torii: 'Torii',
                clearCache: 'Clear System Cache', removeImg: 'Remove Image', enable: 'Enable', disable: 'Disable',
                confirmClearCache: 'This will reset your theme and language settings. Continue?',
                cancel: 'Cancel', confirm: 'Confirm'
            },
            zh: {
                settings: '主設定', theme: '主題', uiOpacity: '自定義圖片透明度', lang: '語言', notifications: '通知',
                custom: '自定義 (上傳)', upload: '上傳照片', light: '明亮', dark: '深色', otherThemes: '其他主題',
                cherry: '櫻花', sky: '藍天', seaside: '海濱', sunset: '日落', forest: '森林', sea: '大海', night: '夜景', torii: '鳥居',
                clearCache: '清除介面暫存並更新', removeImg: '移除圖片', enable: '啟用', disable: '停用',
                confirmClearCache: '這將會重置主題與語言設置，但您的輪班資料將會保留。確定要繼續嗎？',
                cancel: '取消', confirm: '確認'
            }
        };

        const t = computed(() => translations[commonSettings.value.lang] || translations.zh);

        const otherThemes = [
            { id: 'cherry' }, { id: 'forest' }, { id: 'night' }, 
            { id: 'sea' }, { id: 'seaside' }, { id: 'sky' },
            { id: 'sunset' }, { id: 'torii' }
        ];

        const dropdowns = reactive({
            theme: false,
            navMenu: false
        });

        const toggleDropdown = (key) => {
            Object.keys(dropdowns).forEach(k => {
                if (k !== key) dropdowns[k] = false;
            });
            dropdowns[key] = !dropdowns[key];
        };

        const selectDropdownOption = (key, val) => {
            if (key === 'theme') {
                commonSettings.value.theme = val;
                commonSettings.value.useCustomBg = false;
            }
            dropdowns[key] = false;
        };

        const toggleLang = () => {
            commonSettings.value.lang = commonSettings.value.lang === 'en' ? 'zh' : 'en';
        };

        const toggleNotifications = () => {
            commonSettings.value.notificationsEnabled = !commonSettings.value.notificationsEnabled;
        };

        const toggleCustomBg = () => {
            commonSettings.value.useCustomBg = !commonSettings.value.useCustomBg;
        };

        const selectTheme = (theme) => {
            commonSettings.value.theme = theme;
            commonSettings.value.useCustomBg = false;
        };

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
                // Circular 1970-2099 (130 years)
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
            d.setDate(1); // Reset to 1st to avoid overflow
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
            if (!shiftData.value[dateStr]) shiftData.value[dateStr] = { shiftIds: [], payIds: [] };
            
            const { type, id } = activeQuickTag.value;
            const field = type === 'shift' ? 'shiftIds' : 'payIds';
            
            // Compatibility for old data
            if (!shiftData.value[dateStr][field]) {
                shiftData.value[dateStr][field] = [];
                const oldField = type === 'shift' ? 'shiftId' : 'payId';
                if (shiftData.value[dateStr][oldField]) {
                    shiftData.value[dateStr][field].push(shiftData.value[dateStr][oldField]);
                    delete shiftData.value[dateStr][oldField];
                }
            }

            const index = shiftData.value[dateStr][field].indexOf(id);
            if (index > -1) {
                shiftData.value[dateStr][field].splice(index, 1);
            } else {
                shiftData.value[dateStr][field].push(id);
            }
            StorageProvider.saveShiftData(shiftData.value);
        };

        const applyQuickTagToDay = (dateStr, type, id) => {
            if (!shiftData.value[dateStr]) shiftData.value[dateStr] = { shiftIds: [], payIds: [] };
            const field = type === 'shift' ? 'shiftIds' : 'payIds';
            
            if (!shiftData.value[dateStr][field]) shiftData.value[dateStr][field] = [];
            
            const index = shiftData.value[dateStr][field].indexOf(id);
            if (index > -1) {
                shiftData.value[dateStr][field].splice(index, 1);
            } else {
                shiftData.value[dateStr][field].push(id);
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
                        lang: settings.lang || 'zh',
                        effect: 'none',
                        notificationsEnabled: true
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
        const setupEffects = () => {
            const clearAndSchedule = (theme) => {
                if (window.ParticleEngine) {
                    ParticleEngine.setEffect(commonSettings.value.effect);
                }
                
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
                
                if (!commonSettings.value.useCustomBg) {
                    if (themeImages[theme]) {
                        const v = Date.now();
                        document.body.style.backgroundImage = `url(${themeImages[theme]}?v=${v})`;
                        document.body.style.backgroundSize = 'cover';
                        document.body.style.backgroundPosition = 'center';
                        document.body.style.backgroundAttachment = 'fixed';
                    } else {
                        document.body.style.backgroundImage = '';
                    }
                }
            };

            clearAndSchedule(commonSettings.value.theme);
            
            watch(() => commonSettings.value.theme, (newTheme) => {
                clearAndSchedule(newTheme);
            });

            watch(() => commonSettings.value.effect, (newEffect) => {
                if (window.ParticleEngine) {
                    ParticleEngine.setEffect(newEffect);
                }
            });
        };

        onMounted(() => {
            setupEffects();
            if (window.lucide) lucide.createIcons();

            // Notifications
            setInterval(() => {
                if (!commonSettings.value.notificationsEnabled) return;
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
                const data = shiftData.value[todayStr];
                if (data && data.shiftIds && data.shiftIds.length > 0 && !data.notified) {
                    const firstShift = shiftSettings.value.shiftTags.find(t => t.id === data.shiftIds[0]);
                    if (firstShift) {
                        if (Notification.permission === 'granted') {
                            new Notification('今日輪班', { body: `今日班次: ${firstShift.name}` });
                        } else if (Notification.permission !== 'denied') {
                            Notification.requestPermission().then(p => {
                                if (p === 'granted') new Notification('今日輪班', { body: `今日班次: ${firstShift.name}` });
                            });
                        }
                        data.notified = true;
                    }
                }
            }, 60000);
        });

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
            addShiftTag, removeShiftTag, addPayTag, removePayTag, applyQuickTagToDay,
            activeQuickTagCategory, toggleQuickTagCategory, dropdowns, toggleDropdown,
            triggerUpload, handleUpload, clearCustomBg, fileInput, glassStyle, isAnyModalOpen,
            themeClasses, customBgStyle, t, otherThemes, selectDropdownOption, toggleLang,
            toggleNotifications, toggleCustomBg, selectTheme
        };
    }
});

app.mount('#app');
