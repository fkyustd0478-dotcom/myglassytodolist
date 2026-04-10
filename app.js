try {
    const { createApp, ref, reactive, onMounted, computed, watch, nextTick } = Vue;

    const APP_VERSION = '1.2.0';

    // --- Modular Storage Provider ---
    const StorageProvider = {
        saveSettings(settings) {
            localStorage.setItem('todo_settings', JSON.stringify(settings));
        },
        loadSettings() {
            const saved = localStorage.getItem('todo_settings');
            return saved ? JSON.parse(saved) : null;
        },
        saveData(data) {
            localStorage.setItem('todo_data', JSON.stringify(data));
        },
        loadData() {
            const saved = localStorage.getItem('todo_data');
            return saved ? JSON.parse(saved) : null;
        },
        saveShiftData(data) {
            localStorage.setItem('shift_data', JSON.stringify(data));
        },
        loadShiftData() {
            const saved = localStorage.getItem('shift_data');
            return saved ? JSON.parse(saved) : null;
        }
    };

    // --- IndexedDB Provider for Blobs ---
    const ImageDB = {
        dbName: 'glassy-todo-blobs',
        storeName: 'images',
        db: null,

        async init() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, 1);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        db.createObjectStore(this.storeName);
                    }
                };
                request.onsuccess = (e) => {
                    this.db = e.target.result;
                    resolve();
                };
                request.onerror = (e) => reject(e);
            });
        },

        async saveBlob(id, blob) {
            if (!this.db) await this.init();
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.put(blob, id);
                request.onsuccess = () => resolve();
                request.onerror = (e) => reject(e);
            });
        },

        async getBlob(id) {
            if (!this.db) await this.init();
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(id);
                request.onsuccess = (e) => resolve(e.target.result);
                request.onerror = (e) => reject(e);
            });
        },

        async deleteBlob(id) {
            if (!this.db) await this.init();
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.delete(id);
                request.onsuccess = () => resolve();
                request.onerror = (e) => reject(e);
            });
        }
    };

    createApp({
        setup() {
            // --- State ---
            const todos = ref([]);
            const lists = ref([
                { id: 'default', name: 'Default' },
                { id: 'personal', name: 'Personal' },
                { id: 'work', name: 'Work' }
            ]);
            const currentListId = ref('default');
            const appMode = ref('todo'); // 'todo' or 'shift'
            const shiftData = ref({}); // { 'YYYY-MM-DD': 'shift-type' }
            
            const calendarDate = ref(new Date());
            const listModal = ref({
                show: false,
                mode: 'add', // 'add', 'edit', 'delete'
                id: null,
                name: ''
            });

            const manageModal = ref({
                show: false
            });

            const showSettingsModal = ref(false);

            const saveLists = () => {
                StorageProvider.saveData({ todos: todos.value, lists: lists.value });
                renderTrigger.value++;
                nextTick(() => {
                    if (window.lucide) lucide.createIcons();
                    scrollActiveTabIntoView();
                });
            };

            const confirmModal = ref({
                show: false,
                title: '',
                message: '',
                onConfirm: null
            });

            const settings = ref({ 
                theme: 'cherry', 
                customBgOpacity: 0.5, 
                notificationsEnabled: false, 
                lang: 'zh',
                customBg: '', 
                useCustomBg: false,
                effect: 'none'
            });

            const isMenuOpen = ref(false);
            const currentObjectUrl = ref(null);
            
            const view = ref('active');
            const isAdding = ref(false);
            const isEditing = ref(false);
            const editingId = ref(null);
            const tempCustomBg = ref('');
            const originalCustomBg = ref('');
            const uploadProgress = ref(0);
            const showPetals = ref(false);
            const showRain = ref(false);
            
            const showDateTimePicker = ref(false);
            const clockMode = ref('hour');
            const dateMode = ref('day');
            
            const fileInput = ref(null);
            
            const renderTrigger = ref(0);
            
            const form = ref({ 
                text: '', 
                category: 'normal', 
                recurring: 'none', 
                date: new Date().toISOString().split('T')[0], 
                time: { hour: new Date().getHours(), minute: new Date().getMinutes() },
                alertMinutes: 15
            });
            
            const effects = ref({ airplane: false, crab: false, ship: false });

            // --- Constants & Translations ---
            const translations = {
                en: {
                    noTasks: 'No active tasks', completed: 'Completed Records', settings: 'Settings', theme: 'Theme', uiOpacity: 'Custom Image Opacity', lang: 'Language', notifications: 'Notifications', back: 'Back', emptyBin: 'Empty Bin', newTask: 'New Task', editTask: 'Edit Task', placeholder: 'Task title...', category: 'Category', recurring: 'Recurring', date: 'Date', time: 'Time', add: 'Add', save: 'Save', nextGen: 'Next generation', custom: 'Custom (Upload)', upload: 'Upload Photo', light: 'Light', dark: 'Dark', otherThemes: 'Other Themes',
                    daily: 'Daily', normal: 'Normal', important: 'Important', urgent: 'Urgent', memo: 'Memo', none: 'None', weekly: 'Weekly', monthly: 'Monthly', cherry: 'Cherry Blossom', sky: 'Sky', seaside: 'Seaside', sunset: 'Sunset', forest: 'Forest', sea: 'Sea', night: 'Night', torii: 'Torii',
                    active: 'Active', bin: 'Recycle Bin', noCompleted: 'No completed records', tasks: 'Tasks', day: 'Day', month: 'Month',
                    alertBefore: 'Alert before (mins)', edit: 'Edit', enable: 'Enable', disable: 'Disable', removeImg: 'Remove Image',
                    editList: 'Edit List', deleteList: 'Delete List', newList: 'New List', confirmDeleteList: 'Are you sure you want to delete this list and all its tasks?',
                    cancel: 'Cancel', confirm: 'Confirm', listName: 'List Name',
                    default: 'Default', personal: 'Personal', work: 'Work',
                    clearAll: 'Clear All', restore: 'Restore', permDelete: 'Permanent Delete', noBin: 'Recycle Bin is empty',
                    confirmClearCompleted: 'Are you sure you want to permanently delete all completed tasks?',
                    confirmClearBin: 'Are you sure you want to permanently delete all items in the recycle bin?',
                    clearCache: '清除介面暫存並更新',
                    confirmClearCache: 'This will reset your theme and language settings, but your tasks will be preserved. Continue?',
                    menu: 'Menu', analytics: 'Analytics', taskList: 'Task List'
                },
                zh: {
                    noTasks: '暫無任務', completed: '已完成紀錄', settings: '設置', theme: '主題', uiOpacity: '自定義圖片透明度', lang: '語言', notifications: '通知', back: '返回', emptyBin: '清空回收站', newTask: '新任務', editTask: '編輯任務', placeholder: '任務內容...', category: '分類', recurring: '重複', date: '日期', time: '時間', add: '添加', save: '保存', nextGen: '下次生成', custom: '自定義 (上傳)', upload: '上傳照片', light: '明亮', dark: '深色', otherThemes: '其他主題',
                    daily: '日常', normal: '一般', important: '重要', urgent: '緊急', memo: '備忘錄', none: '無', weekly: '每週', monthly: '每月', cherry: '櫻花', sky: '藍天', seaside: '海濱', sunset: '日落', forest: '森林', sea: '大海', night: '夜景', torii: '鳥居',
                    active: '進行中', bin: '回收站', noCompleted: '暫無完成紀錄', tasks: '項任務', day: '日', month: '月',
                    alertBefore: '提醒時間 (分鐘前)', edit: '編輯', enable: '啟用', disable: '停用', removeImg: '移除圖片',
                    editList: '編輯名稱', deleteList: '刪除清單', newList: '新增清單', confirmDeleteList: '確定要刪除此清單及其所有任務嗎？',
                    cancel: '取消', confirm: '確認', listName: '清單名稱',
                    default: '預設', personal: '個人', work: '工作',
                    clearAll: '全部清空', restore: '還原', permDelete: '永久刪除', noBin: '回收站是空的',
                    confirmClearCompleted: '確定要永久刪除所有已完成的任務嗎？',
                    confirmClearBin: '確定要永久刪除回收站中的所有項目嗎？',
                    clearCache: '清除介面暫存並更新',
                    confirmClearCache: '這將會重置主題與語言設置，但您的任務資料將會保留。確定要繼續嗎？',
                    menu: '選單', analytics: '數據分析', taskList: '任務列表'
                }
            };

            const categories = ['urgent', 'important', 'normal', 'daily', 'memo'];
            const recurringTypes = ['none', 'daily', 'weekly', 'monthly'];
            const otherThemes = [
                { id: 'cherry' }, { id: 'forest' }, { id: 'night' }, 
                { id: 'sea' }, { id: 'seaside' }, { id: 'sky' },
                { id: 'sunset' }, { id: 'torii' }
            ];

            // --- Computed ---
            const themeStyle = reactive({
                backgroundImage: '',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                transition: 'background-image 0.5s ease'
            });

            const t = computed(() => translations[settings.value.lang]);
            
            const modeTitle = computed(() => {
                if (settings.value.lang === 'zh') {
                    return appMode.value === 'todo' ? '琉璃待辦' : '琉璃輪班';
                }
                return appMode.value === 'todo' ? 'Glassy Todo' : 'Glassy Shift';
            });

            const isDarkTheme = computed(() => {
                const darkThemes = ['forest', 'night', 'torii'];
                if (settings.value.useCustomBg) {
                    return settings.value.customBgOpacity < 0.5;
                }
                return darkThemes.includes(settings.value.theme);
            });

            const isDefaultList = (id) => ['default', 'personal', 'work'].includes(id);

            const glassStyle = computed(() => ({ 
                backgroundColor: isDarkTheme.value ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)', 
                backdropFilter: 'blur(12px)',
                border: isDarkTheme.value ? '2.5px solid rgba(255, 255, 255, 0.9)' : '2.5px solid rgba(0, 0, 0, 0.9)',
                color: isDarkTheme.value ? '#FFFFFF' : '#000000'
            }));
            
            const themeClasses = computed(() => {
                let classes = isDarkTheme.value ? 'theme-dark-mode ' : '';
                if (settings.value.useCustomBg) return classes + 'theme-light';
                return classes + `theme-${settings.value.theme}`;
            });

            const customBgStyle = computed(() => ({
                backgroundImage: `url(${settings.value.customBg})`,
                opacity: 1 - settings.value.customBgOpacity // 100% opacity slider = 0% image opacity (Invisible)
            }));

            const formatTimeDisplay = computed(() => `${form.value.time.hour.toString().padStart(2, '0')}:${form.value.time.minute.toString().padStart(2, '0')}`);
            
            const sortedTodos = computed(() => {
                const priority = { urgent: 0, important: 1, normal: 2, daily: 3, memo: 4 };
                return todos.value.filter(t => !t.isDeleted && !t.completed && t.listId === currentListId.value).sort((a, b) => {
                    return priority[a.category] - priority[b.category];
                });
            });

            const completedTodos = computed(() => {
                return todos.value.filter(t => t.completed && !t.isDeleted && t.listId === currentListId.value);
            });

            const groupedTodos = computed(() => {
                const groups = [];
                sortedTodos.value.forEach(todo => {
                    const lastGroup = groups[groups.length - 1];
                    if (lastGroup && lastGroup.category === todo.category) {
                        lastGroup.items.push(todo);
                    } else {
                        groups.push({ category: todo.category, items: [todo] });
                    }
                });
                return groups;
            });

            const deletedTodos = computed(() => todos.value.filter(t => t.isDeleted));

            // --- Methods ---
            const toggleLang = () => settings.value.lang = settings.value.lang === 'en' ? 'zh' : 'en';
            
            const toggleNotifications = async () => {
                if (settings.value.notificationsEnabled) {
                    settings.value.notificationsEnabled = false;
                    return;
                }
                if (!('Notification' in window)) {
                    settings.value.notificationsEnabled = false;
                    return;
                }
                try {
                    const permission = await Notification.requestPermission();
                    settings.value.notificationsEnabled = permission === 'granted';
                } catch (e) {
                    settings.value.notificationsEnabled = false;
                }
            };
            
            const selectTheme = (id) => {
                activeAssets.value = []; // Clear assets immediately
                settings.value.theme = id;
                settings.value.useCustomBg = false;
                document.body.classList.remove('custom-theme');
                document.body.style.backgroundImage = '';
            };

            const toggleCustomBg = () => {
                if (settings.value.customBg) {
                    settings.value.useCustomBg = !settings.value.useCustomBg;
                    if (settings.value.useCustomBg) {
                        activeAssets.value = [];
                        document.body.classList.add('custom-theme');
                        const url = `url(${settings.value.customBg})`;
                        document.body.style.backgroundImage = url;
                        themeStyle.backgroundImage = url;
                    } else {
                        document.body.classList.remove('custom-theme');
                        document.body.style.backgroundImage = '';
                    }
                } else {
                    triggerUpload();
                }
            };

            const triggerUpload = () => fileInput.value.click();

            const closeSettings = () => {
                view.value = 'active';
            };

            const handleUpload = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                uploadProgress.value = 10;
                
                // Revoke old URL
                if (currentObjectUrl.value) {
                    URL.revokeObjectURL(currentObjectUrl.value);
                }

                // Save to IndexedDB
                await ImageDB.saveBlob('custom-bg', file);
                
                // Create new URL
                const url = URL.createObjectURL(file);
                currentObjectUrl.value = url;
                settings.value.customBg = url;
                settings.value.useCustomBg = true;
                
                uploadProgress.value = 100;
                setTimeout(() => uploadProgress.value = 0, 500);
                StorageProvider.saveSettings(settings.value);
                e.target.value = '';
            };

            const saveCustomBg = () => {
                tempCustomBg.value = '';
            };

            const cancelUpload = () => {
                tempCustomBg.value = '';
                uploadProgress.value = 0;
            };

            const clearCustomBg = async () => {
                if (currentObjectUrl.value) {
                    URL.revokeObjectURL(currentObjectUrl.value);
                    currentObjectUrl.value = null;
                }
                settings.value.customBg = '';
                settings.value.useCustomBg = false;
                
                // Instant UI reset
                document.body.style.backgroundImage = '';
                themeStyle.backgroundImage = '';
                document.body.classList.remove('custom-theme');
                
                await ImageDB.deleteBlob('custom-bg');
                StorageProvider.saveSettings(settings.value);
                renderTrigger.value++;
            };

            const startAdding = () => {
                isAdding.value = true;
                const now = new Date();
                form.value = { 
                    text: form.value.text || '', 
                    category: 'normal', 
                    recurring: 'none', 
                    date: now.toISOString().split('T')[0], 
                    time: { 
                        hour: now.getHours(), 
                        minute: now.getMinutes()
                    },
                    alertMinutes: 15
                };
            };

            const editTodo = (todo) => {
                isEditing.value = true; 
                editingId.value = todo.id;
                const d = todo.dueDate ? new Date(todo.dueDate) : new Date();
                form.value = { 
                    text: todo.text, 
                    category: todo.category, 
                    recurring: todo.recurring, 
                    date: d.toISOString().split('T')[0], 
                    time: { 
                        hour: d.getHours(), 
                        minute: d.getMinutes()
                    },
                    alertMinutes: todo.alertMinutes || 15
                };
            };

            const saveTodo = () => {
                if (document.activeElement) document.activeElement.blur();
                if (!form.value.text.trim()) return;
                const dueStr = `${form.value.date}T${form.value.time.hour.toString().padStart(2, '0')}:${form.value.time.minute.toString().padStart(2, '0')}:00`;
                const dueDate = new Date(dueStr);
                const isFuture = dueDate.getTime() > Date.now();

                if (isEditing.value) {
                    const t = todos.value.find(x => x.id === editingId.value);
                    if (t) {
                        Object.assign(t, {
                            text: form.value.text,
                            category: form.value.category,
                            recurring: form.value.recurring,
                            dueDate: dueStr,
                            notified: !isFuture,
                            alertMinutes: form.value.alertMinutes,
                            updatedAt: new Date().toISOString()
                        });
                    }
                } else {
                    todos.value.unshift({
                        id: Date.now().toString(36),
                        listId: currentListId.value,
                        text: form.value.text,
                        category: form.value.category,
                        recurring: form.value.recurring,
                        dueDate: dueStr,
                        completed: false,
                        isDeleted: false,
                        notified: !isFuture,
                        alertMinutes: form.value.alertMinutes,
                        updatedAt: new Date().toISOString()
                    });
                }
                StorageProvider.saveData({ todos: todos.value, lists: lists.value });
                renderTrigger.value++;
                form.value.text = '';
                closeModal();
            };

            const closeModal = () => { isAdding.value = isEditing.value = false; editingId.value = null; };
            
            const toggleTodo = (id) => { 
                const t = todos.value.find(x => x.id === id); 
                if (t) {
                    t.completed = !t.completed;
                    t.notified = false;
                    t.updatedAt = new Date().toISOString();
                    renderTrigger.value++;
                }
            };
            
            const deleteTodo = (id) => { const t = todos.value.find(x => x.id === id); if (t) t.isDeleted = true; };
            
            const restoreTodo = (id) => {
                const index = todos.value.findIndex(x => x.id === id);
                if (index !== -1) {
                    const originalTask = todos.value[index];
                    const restoredTask = {
                        ...JSON.parse(JSON.stringify(originalTask)),
                        id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                        completed: false,
                        isDeleted: false,
                        notified: false,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    todos.value.unshift(restoredTask);
                    todos.value.splice(index + 1, 1); 
                    renderTrigger.value++;
                    nextTick(() => {
                        if (window.lucide) lucide.createIcons();
                    });
                }
            };

            const permanentDelete = (id) => {
                todos.value = todos.value.filter(x => x.id !== id);
                renderTrigger.value++;
            };
            
            const promptClearCompleted = () => {
                confirmModal.value = {
                    show: true,
                    title: t.value.clearAll,
                    message: t.value.confirmClearCompleted,
                    onConfirm: () => {
                        todos.value = todos.value.filter(x => !x.completed || x.isDeleted);
                        renderTrigger.value++;
                    }
                };
            };

            const promptClearBin = () => {
                confirmModal.value = {
                    show: true,
                    title: t.value.clearAll,
                    message: t.value.confirmClearBin,
                    onConfirm: () => {
                        todos.value = todos.value.filter(x => !x.isDeleted);
                        renderTrigger.value++;
                    }
                };
            };

            const executeConfirm = () => {
                if (confirmModal.value.onConfirm) confirmModal.value.onConfirm();
                confirmModal.value.show = false;
            };

            const addNewList = () => { 
                listModal.value = { show: true, mode: 'add', id: null, name: '' };
            };

            const editList = (list) => {
                if (isDefaultList(list.id)) return;
                listModal.value = { show: true, mode: 'edit', id: list.id, name: list.name };
            };
            
            const deleteListPrompt = (list) => {
                if (isDefaultList(list.id)) return;
                listModal.value = { show: true, mode: 'delete', id: list.id, name: list.name };
            };

            const confirmListModal = () => {
                const { mode, id, name } = listModal.value;
                if (mode === 'add' && name.trim()) {
                    const newId = 'list-' + Date.now().toString(36);
                    lists.value.push({ id: newId, name: name.trim() });
                    currentListId.value = newId;
                } else if (mode === 'edit' && name.trim()) {
                    const list = lists.value.find(l => l.id === id);
                    if (list) list.name = name.trim();
                } else if (mode === 'delete') {
                    lists.value = lists.value.filter(l => l.id !== id);
                    todos.value = todos.value.filter(t => t.listId !== id);
                    if (currentListId.value === id) {
                        currentListId.value = lists.value[0]?.id || 'default';
                    }
                }
                StorageProvider.saveData({ todos: todos.value, lists: lists.value });
                renderTrigger.value++;
                nextTick(() => {
                    closeListModal();
                    scrollActiveTabIntoView();
                    if (window.lucide) lucide.createIcons();
                });
            };

            const closeListModal = () => {
                listModal.value.show = false;
            };

            const openDatePicker = () => {
                const now = new Date();
                if (!form.value.date) {
                    form.value.date = now.toISOString().split('T')[0];
                }
                // Only default time if it's a new task (hour/minute are 0)
                if (!isEditing.value && form.value.time.hour === 0 && form.value.time.minute === 0) {
                    form.value.time.hour = now.getHours();
                    form.value.time.minute = now.getMinutes();
                }
                showDateTimePicker.value = true;
            };

            const isAnyModalOpen = computed(() => {
                return view.value === 'settings' || 
                       isAdding.value || 
                       isEditing.value || 
                       manageModal.value.show || 
                       listModal.value.show || 
                       showDateTimePicker.value || 
                       confirmModal.value.show ||
                       showSettingsModal.value ||
                       isMenuOpen.value;
            });

            const calendarDays = computed(() => {
                const year = calendarDate.value.getFullYear();
                const month = calendarDate.value.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                
                const days = [];
                // Padding for start of month
                for (let i = 0; i < firstDay; i++) {
                    days.push({ day: null, date: null });
                }
                // Actual days
                for (let i = 1; i <= daysInMonth; i++) {
                    const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
                    days.push({
                        day: i,
                        date: dateStr,
                        isToday: new Date().toDateString() === new Date(year, month, i).toDateString()
                    });
                }
                return days;
            });

            const changeMonth = (delta) => {
                const newDate = new Date(calendarDate.value);
                newDate.setMonth(newDate.getMonth() + delta);
                calendarDate.value = newDate;
            };

            const dropdowns = reactive({
                theme: false,
                category: false,
                recurring: false,
                year: false,
                month: false,
                day: false,
                hour: false,
                minute: false,
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
                    settings.value.theme = val;
                    settings.value.useCustomBg = false;
                } else {
                    form.value[key] = val;
                }
                dropdowns[key] = false;
            };

            const pickerData = reactive({
                years: Array.from({ length: 2099 - 1970 + 1 }, (_, i) => 1970 + i),
                months: Array.from({ length: 12 }, (_, i) => i + 1),
                days: computed(() => {
                    const d = new Date(form.value.date);
                    if (isNaN(d.getTime())) return [];
                    const year = d.getFullYear();
                    const month = d.getMonth() + 1;
                    return Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1);
                }),
                hours: Array.from({ length: 24 }, (_, i) => i),
                minutes: Array.from({ length: 60 }, (_, i) => i)
            });

            const setToday = () => {
                const now = new Date();
                form.value.date = now.toISOString().split('T')[0];
            };

            const setTomorrow = () => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                form.value.date = tomorrow.toISOString().split('T')[0];
            };

            const wrapValue = (val, min, max) => {
                if (val < min) return max;
                if (val > max) return min;
                return val;
            };

            const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

            const getMaxDays = (month, year) => {
                if ([4, 6, 9, 11].includes(month)) return 30;
                if (month === 2) return isLeapYear(year) ? 29 : 28;
                return 31;
            };

            const updatePickerDate = (type, val) => {
                const d = new Date(form.value.date);
                if (isNaN(d.getTime())) return;
                let year = d.getFullYear();
                let month = d.getMonth() + 1;
                let day = d.getDate();

                if (type === 'year') {
                    // Circular Loop 1970-2099 (130 years)
                    year = ((val - 1970 + 130) % 130) + 1970;
                } else if (type === 'month') {
                    // Circular Loop 1-12
                    month = ((val - 1 + 12) % 12) + 1;
                } else if (type === 'day') {
                    const max = getMaxDays(month, year);
                    // Circular Loop 1-Max
                    day = ((val - 1 + max) % max) + 1;
                }

                // Adjust day if month/year changed and caused overflow
                const newMax = getMaxDays(month, year);
                if (day > newMax) day = newMax;

                form.value.date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            };

            const updatePickerTime = (type, val) => {
                if (type === 'hour') {
                    form.value.time.hour = (val + 24) % 24;
                } else if (type === 'minute') {
                    form.value.time.minute = (val + 60) % 60;
                }
            };

            const scrollActiveTabIntoView = () => {
                nextTick(() => {
                    const activeTab = document.querySelector('.list-tab-item.active-tab');
                    if (activeTab) {
                        activeTab.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
                    }
                });
            };

            const calculateNextGen = (r, d) => { 
                if (r === 'none') return ''; 
                const date = new Date(`${d}T00:00:00`); 
                if (r === 'daily') date.setDate(date.getDate() + 1); 
                else if (r === 'weekly') date.setDate(date.getDate() + 7); 
                else if (r === 'monthly') date.setMonth(date.getMonth() + 1); 
                return date.toISOString().split('T')[0]; 
            };

            const formatDateTime = (s) => new Date(s).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            const activeAssets = ref([]);
            const petalStyle = (n) => {
                const drift = (Math.random() * 800 - 400) + 'px'; 
                const rotation = (360 + Math.random() * 1080) + 'deg';
                return { 
                    left: (Math.random() * 120 - 10) + '%', 
                    top: '-150px', 
                    animationDuration: (8 + Math.random() * 10) + 's', 
                    animationDelay: (Math.random() * 15) + 's',
                    '--drift': drift,
                    '--rotation': rotation
                };
            };
            const cloudStyle = (n) => ({ top: (n * 15) + '%', animationDuration: (20 + Math.random() * 20) + 's', animationDelay: (-Math.random() * 20) + 's' });
            const rainStyle = (n) => ({ left: (n * 7) + '%', animationDelay: (Math.random() * 2) + 's' });

            const getAssetStyle = (asset) => {
                const style = {
                    left: asset.x + '%',
                    backgroundImage: `url(${asset.file})`,
                    transform: `${asset.flip ? 'scaleX(-1)' : 'scaleX(1)'} scale(${asset.scale})`
                };
                if (asset.type === 'airplane') {
                    style.top = asset.y + '%';
                } else if (asset.type === 'crab' || asset.type === 'ship') {
                    style.bottom = asset.bottom + (asset.type === 'ship' ? '%' : 'px');
                }
                return style;
            };

            const spawnAsset = (type) => {
                const inventory = {
                    airplane: ['plane-1-l.png', 'plane-2-l.png', 'plane-3-l.png'],
                    crab: ['crab-1-l.png', 'crab-2-r.png'],
                    ship: ['ship-1-l.png', 'ship-2-r.png', 'ship-3-l.png', 'ship-4-l.png', 'ship-5-l.png']
                };

                const files = inventory[type];
                const file = files[Math.floor(Math.random() * files.length)];
                const inherentDir = file.includes('-l') ? 'right' : 'left';
                
                const moveDir = Math.random() > 0.5 ? 'LtoR' : 'RtoL';
                const startX = moveDir === 'LtoR' ? -25 : 125;
                const endX = moveDir === 'LtoR' ? 125 : -25;
                
                let flip = false;
                if (moveDir === 'LtoR') {
                    if (inherentDir === 'left') flip = true;
                } else {
                    if (inherentDir === 'right') flip = true;
                }

                const id = Math.random().toString(36).substr(2, 9);
                const asset = reactive({
                    id,
                    type,
                    file: `./pic/${file}`,
                    flip,
                    scale: 0.8 + Math.random() * 0.4,
                    x: startX,
                    y: 0,
                    bottom: 0
                });

                if (type === 'airplane') {
                    asset.y = 10 + Math.random() * 40;
                    const endY = 10 + Math.random() * 40;
                    const duration = 8000 + Math.random() * 6000;
                    animateAsset(asset, startX, endX, asset.y, endY, duration);
                } else if (type === 'crab') {
                    const navHeight = 90;
                    const sandTop = window.innerHeight * 0.5;
                    const crabHeight = 50;
                    const maxBottom = Math.max(navHeight, sandTop - crabHeight);
                    asset.bottom = navHeight + Math.random() * (maxBottom - navHeight);
                    const duration = 40000 + Math.random() * 20000;
                    animateCrab(asset, startX, endX, duration);
                } else if (type === 'ship') {
                    asset.bottom = 35 + Math.random() * 10;
                    const duration = 25000 + Math.random() * 15000;
                    animateAsset(asset, startX, endX, null, null, duration);
                }

                activeAssets.value.push(asset);
            };

            const animateAsset = (asset, startX, endX, startY, endY, duration) => {
                const startTime = performance.now();
                const step = (now) => {
                    if (!activeAssets.value.find(a => a.id === asset.id)) return;
                    const elapsed = now - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    asset.x = startX + (endX - startX) * progress;
                    if (startY !== null && endY !== null) {
                        asset.y = startY + (endY - startY) * progress;
                    }
                    if (progress < 1) {
                        requestAnimationFrame(step);
                    } else {
                        removeAsset(asset.id, asset.type);
                    }
                };
                requestAnimationFrame(step);
            };

            const animateCrab = (asset, startX, endX, duration) => {
                const startTime = performance.now();
                let pausedTime = 0;
                let lastPauseEnd = startTime;
                let isPaused = false;
                let pauseUntil = 0;

                const step = (now) => {
                    if (!activeAssets.value.find(a => a.id === asset.id)) return;
                    if (isPaused) {
                        if (now >= pauseUntil) {
                            isPaused = false;
                            lastPauseEnd = now;
                        } else {
                            requestAnimationFrame(step);
                            return;
                        }
                    }
                    if (!isPaused && now - lastPauseEnd > 5000 + Math.random() * 5000) {
                        isPaused = true;
                        const pauseDuration = 1000 + Math.random() * 1000;
                        pauseUntil = now + pauseDuration;
                        pausedTime += pauseDuration;
                        requestAnimationFrame(step);
                        return;
                    }
                    const elapsed = now - startTime - pausedTime;
                    const progress = Math.min(elapsed / duration, 1);
                    asset.x = startX + (endX - startX) * progress;
                    if (progress < 1) {
                        requestAnimationFrame(step);
                    } else {
                        removeAsset(asset.id, asset.type);
                    }
                };
                requestAnimationFrame(step);
            };

            const spawnBatch = (type) => {
                const count = Math.floor(Math.random() * 3) + 1;
                for (let i = 0; i < count; i++) {
                    setTimeout(() => {
                        const currentTheme = settings.value.theme;
                        if ((type === 'airplane' && currentTheme === 'sky') ||
                            (type === 'crab' && currentTheme === 'seaside') ||
                            (type === 'ship' && currentTheme === 'sea')) {
                            spawnAsset(type);
                        }
                    }, i * (1000 + Math.random() * 2000));
                }
            };

            const removeAsset = (id, type) => {
                activeAssets.value = activeAssets.value.filter(a => a.id !== id);
                if (!activeAssets.value.some(a => a.type === type)) {
                    setTimeout(() => {
                        spawnBatch(type);
                    }, 3000 + Math.random() * 5000);
                }
            };

            const setupEffects = () => {
                let effectTimeout = null;
                let petalTimeout = null;

                const clearAndSchedule = (theme) => {
                    if (effectTimeout) clearTimeout(effectTimeout);
                    if (petalTimeout) clearTimeout(petalTimeout);
                    activeAssets.value = []; 
                    
                    // Modular Effects Logic
                    if (window.ParticleEngine) {
                        if (settings.value.effect === 'none') {
                            // Auto-set effect based on theme if not manually set?
                            // No, user wants independent control.
                            // But let's initialize it if it's the first time or if they haven't touched it.
                        }
                        ParticleEngine.setEffect(settings.value.effect);
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
                    
                    if (!settings.value.useCustomBg) {
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

                    if (!settings.value.useCustomBg) {
                        // No automatic assets like planes or crabs anymore.
                    }
                };

                clearAndSchedule(settings.value.theme);
                
                watch(() => settings.value.theme, (newTheme) => {
                    clearAndSchedule(newTheme);
                });

                watch(() => settings.value.effect, (newEffect) => {
                    if (window.ParticleEngine) {
                        ParticleEngine.setEffect(newEffect);
                    }
                });

                watch(() => settings.value.useCustomBg, (isCustom) => {
                    if (isCustom) {
                        if (effectTimeout) clearTimeout(effectTimeout);
                        activeAssets.value = [];
                    } else {
                        clearAndSchedule(settings.value.theme);
                    }
                });
            };

            onMounted(async () => {
                const storedVersion = localStorage.getItem('app_version');
                if (storedVersion !== APP_VERSION) {
                    localStorage.clear();
                    sessionStorage.clear();
                    localStorage.setItem('app_version', APP_VERSION);
                    location.reload(true);
                    return;
                }

                await ImageDB.init();
                
                const savedSettings = StorageProvider.loadSettings();
                const savedData = StorageProvider.loadData();
                const savedShiftData = StorageProvider.loadShiftData();

                if (savedSettings) {
                    settings.value = { ...settings.value, ...savedSettings };
                    const blob = await ImageDB.getBlob('custom-bg');
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        currentObjectUrl.value = url;
                        settings.value.customBg = url;
                        if (settings.value.useCustomBg) {
                            document.body.classList.add('custom-theme');
                            document.body.style.backgroundImage = `url(${url})`;
                            themeStyle.backgroundImage = `url(${url})`;
                        }
                    }
                }

                if (savedData) {
                    todos.value = savedData.todos || [];
                    if (savedData.lists && savedData.lists.length > 0) {
                        lists.value = savedData.lists;
                    } else {
                        const defaults = [
                            { id: 'default', name: 'Default' },
                            { id: 'personal', name: 'Personal' },
                            { id: 'work', name: 'Work' }
                        ];
                        lists.value = defaults;
                    }
                }

                if (savedShiftData) {
                    shiftData.value = savedShiftData;
                }
                
                nextTick(() => {
                    if (window.lucide) lucide.createIcons();
                    scrollActiveTabIntoView();
                    setupEffects();

                    // Initialize Sortable for lists
                    const listEl = document.getElementById('manage-list-items');
                    if (listEl && window.Sortable) {
                        new Sortable(listEl, {
                            handle: '.list-grip',
                            animation: 150,
                            onEnd: (evt) => {
                                const movedItem = lists.value.splice(evt.oldIndex, 1)[0];
                                lists.value.splice(evt.newIndex, 0, movedItem);
                                saveLists();
                            }
                        });
                    }
                });

                window.addEventListener('storage', (e) => {
                    if (e.key === 'todo_settings' && e.newValue) {
                        settings.value = { ...settings.value, ...JSON.parse(e.newValue) };
                    }
                    if (e.key === 'todo_data' && e.newValue) {
                        const data = JSON.parse(e.newValue);
                        todos.value = data.todos || [];
                        lists.value = data.lists || [];
                    }
                });
                
                setInterval(() => {
                    if (!settings.value.notificationsEnabled) return;
                    const now = Date.now();
                    todos.value.forEach(t => {
                        if (t.completed || t.isDeleted || !t.dueDate || t.notified) return;
                        const due = new Date(`${t.date}T${t.time.hour.toString().padStart(2, '0')}:${t.time.minute.toString().padStart(2, '0')}`).getTime();
                        const alertMs = (t.alertMinutes || 15) * 60000;
                        if (due - now <= alertMs && due > now) { 
                            if (Notification.permission === 'granted') {
                                new Notification('Glassy Todo', { body: t.text }); 
                            } else if (Notification.permission !== 'denied') {
                                Notification.requestPermission().then(permission => {
                                    if (permission === 'granted') {
                                        new Notification('Glassy Todo', { body: t.text });
                                    }
                                });
                            }
                            t.notified = true; 
                        }
                    });
                }, 30000);
            });

            watch(settings, (newVal) => {
                StorageProvider.saveSettings(newVal);
            }, { deep: true });

            watch([todos, lists], () => {
                StorageProvider.saveData({ todos: todos.value, lists: lists.value });
                nextTick(() => lucide.createIcons());
            }, { deep: true });

            watch(shiftData, (newVal) => {
                StorageProvider.saveShiftData(newVal);
            }, { deep: true });

            const clearCacheAndUpdate = () => {
                confirmModal.value = {
                    show: true,
                    title: t.value.clearCache,
                    message: t.value.confirmClearCache,
                    onConfirm: () => {
                        const currentSettings = JSON.parse(localStorage.getItem('todo_settings') || '{}');
                        const newSettings = {
                            theme: 'cherry',
                            useCustomBg: false,
                            customBg: '',
                            lang: currentSettings.lang || 'zh',
                            effect: 'none',
                            notificationsEnabled: true,
                            customBgOpacity: 0.5
                        };
                        localStorage.setItem('todo_settings', JSON.stringify(newSettings));
                        location.reload();
                    }
                };
            };

            const openPickerDropdown = (key) => {
                toggleDropdown(key);
                nextTick(() => {
                    const d = new Date(form.value.date || new Date());
                    let idx = 0;
                    if (key === 'year')   idx = d.getFullYear() - 1970;
                    else if (key === 'month')  idx = d.getMonth();
                    else if (key === 'day')    idx = d.getDate() - 1;
                    else if (key === 'hour')   idx = form.value.time.hour;
                    else if (key === 'minute') idx = form.value.time.minute;
                    document.querySelectorAll('.picker-dropdown').forEach(el => {
                        if (el.offsetParent !== null) {
                            const first = el.querySelector('.dropdown-item');
                            if (first) el.scrollTop = idx * first.offsetHeight;
                        }
                    });
                });
            };

            return {
                themeStyle,
                todos, lists, currentListId, settings, view, isAdding, isEditing, form, 
                showDateTimePicker, clockMode, dateMode, fileInput, t, 
                categories, recurringTypes, otherThemes, glassStyle, themeClasses, 
                customBgStyle, formatTimeDisplay, sortedTodos, completedTodos, groupedTodos, 
                deletedTodos, toggleLang, toggleNotifications, selectTheme, 
                toggleCustomBg, triggerUpload, handleUpload, startAdding, editTodo, 
                saveTodo, closeModal, toggleTodo, deleteTodo, restoreTodo, openPickerDropdown,
                permanentDelete, addNewList, openDatePicker, closeSettings,
                renderTrigger, calculateNextGen, 
                formatDateTime, petalStyle, cloudStyle, rainStyle, isDarkTheme, effects,
                activeAssets, getAssetStyle, tempCustomBg, saveCustomBg, cancelUpload, clearCustomBg,
                showPetals, showRain,
                dropdowns, toggleDropdown, selectDropdownOption,
                pickerData, setToday, setTomorrow, updatePickerDate, updatePickerTime,
                listModal, addNewList, editList, deleteListPrompt, confirmListModal, closeListModal,
                isDefaultList, uploadProgress, confirmModal, promptClearCompleted, promptClearBin, executeConfirm,
                manageModal, openManageModal: () => manageModal.value.show = true,
                closeManageModal: () => manageModal.value.show = false,
                saveLists,
                clearCacheAndUpdate,
                isAnyModalOpen,
                showSettingsModal,
                isMenuOpen,
                appMode,
                modeTitle,
                calendarDate,
                calendarDays,
                changeMonth,
                shiftData
            };
        }
    }).mount('#app');
} catch (e) { 
    console.error(e); 
}
