try {
    const { createApp, ref, reactive, onMounted, computed, watch, nextTick } = Vue;

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
            
            // Custom Modal State
            const listModal = ref({
                show: false,
                mode: 'add', // 'add', 'edit', 'delete'
                id: null,
                name: ''
            });

            const manageModal = ref({
                show: false
            });

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
                theme: 'sky', 
                customBgOpacity: 0.5, 
                notificationsEnabled: false, 
                lang: 'zh',
                customBg: '', // This will hold the Object URL
                useCustomBg: false 
            });

            const currentObjectUrl = ref(null);
            
            const view = ref('active');
            const isAdding = ref(false);
            const isEditing = ref(false);
            const editingId = ref(null);
            const tempCustomBg = ref('');
            const originalCustomBg = ref('');
            const uploadProgress = ref(0);
            const showPetals = ref(false);
            
            const showTimePicker = ref(false);
            const showDatePicker = ref(false);
            const clockMode = ref('hour');
            const dateMode = ref('day');
            
            const fileInput = ref(null);
            
            const renderTrigger = ref(0);
            
            const form = ref({ 
                text: '', 
                category: 'normal', 
                recurring: 'none', 
                date: '', 
                time: { hour: 12, minute: 0, period: 'AM' },
                alertMinutes: 15
            });
            
            const effects = ref({ airplane: false, crab: false, ship: false });

            // --- Constants & Translations ---
            const translations = {
                en: {
                    noTasks: 'No active tasks', completed: 'Completed Records', settings: 'Settings', theme: 'Theme', uiOpacity: 'Custom Image Opacity', lang: 'Language', notifications: 'Notifications', back: 'Back', emptyBin: 'Empty Bin', newTask: 'New Task', editTask: 'Edit Task', placeholder: 'Task title...', category: 'Category', recurring: 'Recurring', date: 'Date', time: 'Time', add: 'Add', save: 'Save', nextGen: 'Next generation', custom: 'Custom (Upload)', upload: 'Upload Photo', light: 'Light', dark: 'Dark', otherThemes: 'Other Themes',
                    daily: 'Daily', normal: 'Normal', important: 'Important', urgent: 'Urgent', memo: 'Memo', none: 'None', weekly: 'Weekly', monthly: 'Monthly', cherry: 'Cherry Blossom', sky: 'Sky', seaside: 'Seaside', sunset: 'Sunset', forest: 'Forest', sea: 'Sea',
                    active: 'Active', bin: 'Recycle Bin', noCompleted: 'No completed records', tasks: 'Tasks', day: 'Day', month: 'Month',
                    alertBefore: 'Alert before (mins)', edit: 'Edit', enable: 'Enable', disable: 'Disable', removeImg: 'Remove Image',
                    editList: 'Edit List', deleteList: 'Delete List', newList: 'New List', confirmDeleteList: 'Are you sure you want to delete this list and all its tasks?',
                    cancel: 'Cancel', confirm: 'Confirm', listName: 'List Name',
                    default: 'Default', personal: 'Personal', work: 'Work',
                    clearAll: 'Clear All', restore: 'Restore', permDelete: 'Permanent Delete', noBin: 'Recycle Bin is empty',
                    confirmClearCompleted: 'Are you sure you want to permanently delete all completed tasks?',
                    confirmClearBin: 'Are you sure you want to permanently delete all items in the recycle bin?'
                },
                zh: {
                    noTasks: '暫無任務', completed: '已完成紀錄', settings: '設置', theme: '主題', uiOpacity: '自定義圖片透明度', lang: '語言', notifications: '通知', back: '返回', emptyBin: '清空回收站', newTask: '新任務', editTask: '編輯任務', placeholder: '任務內容...', category: '分類', recurring: '重複', date: '日期', time: '時間', add: '添加', save: '保存', nextGen: '下次生成', custom: '自定義 (上傳)', upload: '上傳照片', light: '明亮', dark: '深色', otherThemes: '其他主題',
                    daily: '日常', normal: '一般', important: '重要', urgent: '緊急', memo: '備忘錄', none: '無', weekly: '每週', monthly: '每月', cherry: '櫻花', sky: '藍天', seaside: '海濱', sunset: '日落', forest: '森林', sea: '大海',
                    active: '進行中', bin: '回收站', noCompleted: '暫無完成紀錄', tasks: '項任務', day: '日', month: '月',
                    alertBefore: '提醒時間 (分鐘前)', edit: '編輯', enable: '啟用', disable: '停用', removeImg: '移除圖片',
                    editList: '編輯名稱', deleteList: '刪除清單', newList: '新增清單', confirmDeleteList: '確定要刪除此清單及其所有任務嗎？',
                    cancel: '取消', confirm: '確認', listName: '清單名稱',
                    default: '預設', personal: '個人', work: '工作',
                    clearAll: '全部清空', restore: '還原', permDelete: '永久刪除', noBin: '回收站是空的',
                    confirmClearCompleted: '確定要永久刪除所有已完成的任務嗎？',
                    confirmClearBin: '確定要永久刪除回收站中的所有項目嗎？'
                }
            };

            const categories = ['urgent', 'important', 'normal', 'daily', 'memo'];
            const recurringTypes = ['none', 'daily', 'weekly', 'monthly'];
            const otherThemes = [{ id: 'cherry' }, { id: 'sky' }, { id: 'seaside' }, { id: 'sunset' }, { id: 'forest' }, { id: 'sea' }];

            // --- Computed ---
            const themeStyle = reactive({
                backgroundImage: '',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                transition: 'background-image 0.5s ease'
            });

            const t = computed(() => translations[settings.value.lang]);
            
            const isDarkTheme = computed(() => {
                // Bright Themes (Cherry, Seaside) -> Black text (isDarkTheme = false)
                // Dark Themes (Forest, Dark, Sunset, Sea, Sky) -> White text (isDarkTheme = true)
                const darkThemes = ['dark', 'sunset', 'sky', 'forest', 'sea'];
                if (settings.value.useCustomBg) {
                    return settings.value.customBgOpacity < 0.5;
                }
                return darkThemes.includes(settings.value.theme);
            });

            const isDefaultList = (id) => ['default', 'personal', 'work'].includes(id);

            const glassStyle = computed(() => ({ 
                backgroundColor: isDarkTheme.value ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)', 
                backdropFilter: 'blur(12px)',
                border: isDarkTheme.value ? '2.5px solid rgba(255, 255, 255, 0.55)' : '2.5px solid rgba(0, 0, 0, 0.45)'
            }));
            
            const themeClasses = computed(() => {
                if (settings.value.useCustomBg) return 'theme-light';
                return `theme-${settings.value.theme}`;
            });

            const customBgStyle = computed(() => ({
                backgroundImage: `url(${settings.value.customBg})`,
                opacity: 1 - settings.value.customBgOpacity // 100% opacity slider = 0% image opacity (Invisible)
            }));

            const formatTimeDisplay = computed(() => `${form.value.time.hour}:${form.value.time.minute.toString().padStart(2, '0')} ${form.value.time.period}`);
            
            const clockNumbers = computed(() => clockMode.value === 'hour' ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
            const clockRotation = computed(() => clockMode.value === 'hour' ? (form.value.time.hour % 12) * 30 : form.value.time.minute * 6);

            const dateNumbers = computed(() => {
                if (dateMode.value === 'month') return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                return [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30].slice(0, 12);
            });
            const dateRotation = computed(() => {
                const d = new Date(form.value.date);
                if (dateMode.value === 'month') return (d.getMonth() + 1) * 30;
                return (d.getDate() % 12 || 12) * 30;
            });

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
                if (!settings.value.notificationsEnabled) { 
                    const p = await Notification.requestPermission(); 
                    if (p === 'granted') settings.value.notificationsEnabled = true; 
                } else settings.value.notificationsEnabled = false; 
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
                // Legacy method, logic moved to handleUpload for stability
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
                    text: form.value.text || '', // Keep text from top input if any
                    category: 'normal', 
                    recurring: 'none', 
                    date: now.toISOString().split('T')[0], 
                    time: { 
                        hour: now.getHours() % 12 || 12, 
                        minute: Math.floor(now.getMinutes() / 5) * 5, 
                        period: now.getHours() >= 12 ? 'PM' : 'AM' 
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
                        hour: d.getHours() % 12 || 12, 
                        minute: d.getMinutes(), 
                        period: d.getHours() >= 12 ? 'PM' : 'AM' 
                    },
                    alertMinutes: todo.alertMinutes || 15
                };
            };

            const saveTodo = () => {
                if (!form.value.text.trim()) return;
                let h = form.value.time.hour;
                if (form.value.time.period === 'PM' && h < 12) h += 12;
                if (form.value.time.period === 'AM' && h === 12) h = 0;
                const dueStr = `${form.value.date}T${h.toString().padStart(2, '0')}:${form.value.time.minute.toString().padStart(2, '0')}:00`;
                const dueDate = new Date(dueStr);
                
                // Notification Guard: Only schedule if in the future
                const isFuture = dueDate.getTime() > Date.now();

                if (isEditing.value) {
                    const t = todos.value.find(x => x.id === editingId.value);
                    if (t) {
                        Object.assign(t, { 
                            text: form.value.text, 
                            category: form.value.category, 
                            recurring: form.value.recurring, 
                            dueDate: dueStr, 
                            notified: !isFuture, // Mark as notified if in past to prevent triggers
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
                renderTrigger.value++;
                nextTick(() => closeModal());
                form.value.text = ''; // Clear top input
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
                    // Triple-Action Logic: Clone-and-Kill
                    // 1. Deep-copy the task object
                    const originalTask = todos.value[index];
                    
                    // 2. Reset status to 'active' and update timestamp
                    const restoredTask = {
                        ...JSON.parse(JSON.stringify(originalTask)),
                        id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                        completed: false,
                        isDeleted: false,
                        notified: false,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    
                    // 3. Push the new copy to the main tasks array
                    todos.value.unshift(restoredTask);
                    
                    // 4. Immediately delete the original record
                    todos.value.splice(index + 1, 1); // index + 1 because we unshifted
                    
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
                    // Cascading Delete: Remove list and ALL associated tasks
                    lists.value = lists.value.filter(l => l.id !== id);
                    todos.value = todos.value.filter(t => t.listId !== id);
                    
                    if (currentListId.value === id) {
                        currentListId.value = lists.value[0]?.id || 'default';
                    }
                }
                
                // Immediate Sync & Force Re-render
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

            const openDatePicker = () => showDatePicker.value = true;

            const dropdowns = reactive({
                theme: false,
                category: false,
                recurring: false
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
                years: Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i),
                months: Array.from({ length: 12 }, (_, i) => i + 1),
                days: computed(() => {
                    const d = new Date(form.value.date);
                    const year = d.getFullYear();
                    const month = d.getMonth() + 1;
                    return Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1);
                }),
                hours: Array.from({ length: 12 }, (_, i) => i + 1),
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

            const updatePickerDate = (type, val, direction = 0) => {
                const d = new Date(form.value.date);
                let year = d.getFullYear();
                let month = d.getMonth() + 1;
                let day = d.getDate();

                if (type === 'year') {
                    year = wrapValue(val, 1900, 2099);
                } else if (type === 'month') {
                    month = wrapValue(val, 1, 12);
                } else if (type === 'day') {
                    const max = getMaxDays(month, year);
                    day = wrapValue(val, 1, max);
                }

                // Snap day if invalid for new month/year
                const max = getMaxDays(month, year);
                if (day > max) day = max;

                const newDate = new Date(year, month - 1, day);
                form.value.date = newDate.toISOString().split('T')[0];
            };

            const updatePickerTime = (type, val) => {
                if (type === 'hour') {
                    form.value.time.hour = wrapValue(val, 1, 12);
                } else if (type === 'minute') {
                    form.value.time.minute = wrapValue(val, 0, 59);
                }
            };

            const scrollActiveTabIntoView = () => {
                nextTick(() => {
                    const activeTab = document.querySelector('.list-tab-item.active-tab');
                    if (activeTab) {
                        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }
                });
            };

            // --- Clock & Date Interaction ---
            const handleClockInteraction = (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
                const x = e.touches ? e.touches[0].clientX : e.clientX, y = e.touches ? e.touches[0].clientY : e.clientY;
                const angle = (Math.atan2(y - cy, x - cx) * 180 / Math.PI + 450) % 360;
                if (clockMode.value === 'hour') form.value.time.hour = Math.round(angle / 30) || 12;
                else form.value.time.minute = Math.round(angle / 6) % 60;
            };
            const handleClockMove = (e) => { if (e.buttons === 1 || e.touches) handleClockInteraction(e); };
            const getClockPos = (i) => { const a = (i * 30 - 90) * (Math.PI / 180), r = clockMode.value === 'hour' ? 90 : 115; return { left: `${130 + r * Math.cos(a) - 17}px`, top: `${130 + r * Math.sin(a) - 17}px` }; };
            const isClockNumberActive = (n) => clockMode.value === 'hour' ? form.value.time.hour === n : form.value.time.minute === n;

            const handleDateInteraction = (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
                const x = e.touches ? e.touches[0].clientX : e.clientX, y = e.touches ? e.touches[0].clientY : e.clientY;
                const angle = (Math.atan2(y - cy, x - cx) * 180 / Math.PI + 450) % 360;
                const val = Math.round(angle / 30) || 12;
                const d = new Date(form.value.date);
                if (dateMode.value === 'month') d.setMonth(val - 1);
                else {
                    const currentDay = d.getDate();
                    const offset = Math.floor((currentDay - 1) / 12) * 12;
                    d.setDate(offset + val);
                }
                form.value.date = d.toISOString().split('T')[0];
            };
            const handleDateMove = (e) => { if (e.buttons === 1 || e.touches) handleDateInteraction(e); };
            const getDatePos = (i) => { const a = (i * 30 - 90) * (Math.PI / 180), r = 115; return { left: `${130 + r * Math.cos(a) - 17}px`, top: `${130 + r * Math.sin(a) - 17}px` }; };
            const isDateNumberActive = (n) => {
                const d = new Date(form.value.date);
                if (dateMode.value === 'month') return (d.getMonth() + 1) === n;
                return d.getDate() === n;
            };
            const adjustYear = (v) => {
                const d = new Date(form.value.date);
                d.setFullYear(d.getFullYear() + v);
                form.value.date = d.toISOString().split('T')[0];
            };
            
            // --- Recurring Logic ---
            const calculateNextGen = (r, d) => { 
                if (r === 'none') return ''; 
                const date = new Date(`${d}T00:00:00`); 
                if (r === 'daily') date.setDate(date.getDate() + 1); 
                else if (r === 'weekly') date.setDate(date.getDate() + 7); 
                else if (r === 'monthly') date.setMonth(date.getMonth() + 1); 
                return date.toISOString().split('T')[0]; 
            };

            const formatDateTime = (s) => new Date(s).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            // --- Visual Effects ---
            const activeAssets = ref([]);
            const petalStyle = (n) => {
                const drift = (Math.random() * 400 - 200) + 'px';
                const rotation = (360 + Math.random() * 720) + 'deg';
                return { 
                    left: (Math.random() * 100) + '%', 
                    top: '-150px',
                    animationDuration: (6 + Math.random() * 6) + 's', 
                    animationDelay: (Math.random() * 10) + 's',
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
                    // Restrict to Sand area: between 90px (nav) and 50% height (wave)
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
                // Only spawn a new batch if no more of this type are active
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
                    activeAssets.value = []; // Clear current objects
                    showPetals.value = false;
                    
                    // Background Image Migration
                    const themeImages = {
                        cherry: './theme/cherry.png',
                        seaside: './theme/seaside.png',
                        forest: './theme/forest.png'
                    };
                    
                    if (!settings.value.useCustomBg) {
                        if (themeImages[theme]) {
                            document.body.style.backgroundImage = `url(${themeImages[theme]})`;
                            document.body.style.backgroundSize = 'cover';
                            document.body.style.backgroundPosition = 'center';
                        } else {
                            document.body.style.backgroundImage = '';
                        }
                    }

                    // 15s Delay for Background Animations (Zero Latency UI)
                    if (!settings.value.useCustomBg) {
                        effectTimeout = setTimeout(() => {
                            if (theme === 'sky') spawnBatch('airplane');
                            if (theme === 'seaside') spawnBatch('crab');
                            if (theme === 'sea') spawnBatch('ship');
                            if (theme === 'sunset') { spawnBatch('airplane'); spawnBatch('ship'); }
                            if (theme === 'forest') spawnBatch('airplane');
                        }, 15000);

                        if (theme === 'cherry') {
                            petalTimeout = setTimeout(() => {
                                showPetals.value = true;
                            }, 15000);
                        }
                    }
                };

                // Initial load delay
                clearAndSchedule(settings.value.theme);
                
                watch(() => settings.value.theme, (newTheme) => {
                    clearAndSchedule(newTheme);
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

            // --- Watches ---
            watch(isDarkTheme, (val) => {
                document.body.classList.remove('theme-light-mode', 'theme-dark-mode');
                document.body.classList.add(val ? 'theme-dark-mode' : 'theme-light-mode');
            }, { immediate: true });

            watch(currentListId, () => {
                scrollActiveTabIntoView();
            });

            watch(() => settings.value.customBg, (newVal) => {
                nextTick(() => {
                    if (newVal && settings.value.useCustomBg) {
                        const url = `url(${newVal}?t=${Date.now()})`;
                        document.body.style.backgroundImage = url;
                        themeStyle.backgroundImage = url;
                        document.body.classList.add('custom-theme');
                    } else if (!newVal) {
                        document.body.style.backgroundImage = '';
                        themeStyle.backgroundImage = '';
                        document.body.classList.remove('custom-theme');
                    }
                });
            });

            watch(view, () => {
                nextTick(() => {
                    if (window.lucide) lucide.createIcons();
                });
            });

            const initSortable = () => {
                const listTabs = document.getElementById('list-tabs');
                if (listTabs) {
                    Sortable.create(listTabs, {
                        animation: 150,
                        ghostClass: 'sortable-ghost',
                        dragClass: 'sortable-drag',
                        onEnd: (evt) => {
                            const { oldIndex, newIndex } = evt;
                            if (oldIndex !== newIndex) {
                                const item = lists.value.splice(oldIndex, 1)[0];
                                lists.value.splice(newIndex, 0, item);
                                saveLists();
                            }
                        }
                    });
                }

                const manageItems = document.getElementById('manage-list-items');
                if (manageItems) {
                    Sortable.create(manageItems, {
                        animation: 150,
                        handle: '.list-grip',
                        ghostClass: 'sortable-ghost',
                        dragClass: 'sortable-drag',
                        onEnd: (evt) => {
                            const { oldIndex, newIndex } = evt;
                            if (oldIndex !== newIndex) {
                                const item = lists.value.splice(oldIndex, 1)[0];
                                lists.value.splice(newIndex, 0, item);
                                saveLists();
                            }
                        }
                    });
                }
            };

            // --- Lifecycle ---
            onMounted(async () => {
                await ImageDB.init();
                initSortable();

                // Force initial reflow for layout visibility
                window.dispatchEvent(new Event('resize'));
                nextTick(() => {
                    window.dispatchEvent(new Event('resize'));
                    document.body.offsetHeight; // force reflow
                });

                // Phase 2: Data Hydration
                const hydrateData = async () => {
                    const savedSettings = StorageProvider.loadSettings();
                    const savedData = StorageProvider.loadData();

                    if (savedSettings) {
                        settings.value = { ...settings.value, ...savedSettings };
                        
                        // Load Blob from IndexedDB
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
                        
                        // Merge lists to ensure defaults exist
                        const savedLists = savedData.lists || [];
                        const defaults = [
                            { id: 'default', name: 'Default' },
                            { id: 'personal', name: 'Personal' },
                            { id: 'work', name: 'Work' }
                        ];
                        
                        const customLists = savedLists.filter(l => !['default', 'personal', 'work', '1', '2'].includes(l.id));
                        lists.value = [...defaults, ...customLists];
                    }
                    
                    // Phase 3: DOM-dependent initializations
                    nextTick(() => {
                        if (window.lucide) lucide.createIcons();
                        scrollActiveTabIntoView();
                        
                        // Sortable.js Initialization
                        const el = document.getElementById('list-tabs');
                        if (el) {
                            Sortable.create(el, {
                                animation: 150,
                                draggable: '.list-tab-item',
                                onEnd: (evt) => {
                                    const newOrder = [];
                                    const items = el.querySelectorAll('.list-tab-item');
                                    items.forEach(item => {
                                        const id = item.getAttribute('data-id');
                                        const list = lists.value.find(l => l.id === id);
                                        if (list) newOrder.push(list);
                                    });
                                    lists.value = newOrder;
                                }
                            });
                        }
                    });
                };

                // Phase 4: Background Effects (Lowest priority)
                const initEffects = () => {
                    setupEffects();
                };

                // Use requestIdleCallback for non-critical hydration and effects
                if ('requestIdleCallback' in window) {
                    requestIdleCallback(() => {
                        hydrateData();
                        initEffects();
                    });
                } else {
                    // Fallback for browsers without requestIdleCallback
                    setTimeout(() => {
                        hydrateData();
                        initEffects();
                    }, 50);
                }

                // Multi-Tab Sync (Always active)
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
                
                // Notification Checker (Background task)
                setInterval(() => {
                    if (!settings.value.notificationsEnabled) return;
                    const now = Date.now();
                    todos.value.forEach(t => {
                        if (t.completed || t.isDeleted || !t.dueDate || t.notified) return;
                        const due = new Date(t.dueDate).getTime();
                        const alertMs = (t.alertMinutes || 15) * 60000;
                        if (due - now <= alertMs && due > now) { 
                            new Notification('Glassy Todo', { body: t.text }); 
                            t.notified = true; 
                        }
                    });
                }, 30000);
            });

            // --- Watchers ---
            watch(settings, (newVal) => {
                StorageProvider.saveSettings(newVal);
            }, { deep: true });

            watch([todos, lists], () => {
                StorageProvider.saveData({ todos: todos.value, lists: lists.value });
                nextTick(() => lucide.createIcons());
            }, { deep: true });

            // Image Sync with Base64
            watch(() => settings.value.customBg, (newImg) => {
                if (settings.value.useCustomBg && newImg) {
                    const url = `url(${newImg})`;
                    document.body.style.backgroundImage = url;
                    themeStyle.backgroundImage = url;
                    document.body.classList.add('custom-theme');
                }
            }, { immediate: true });

            watch(() => settings.value.useCustomBg, (val) => {
                if (!val) {
                    document.body.style.backgroundImage = '';
                    themeStyle.backgroundImage = '';
                    document.body.classList.remove('custom-theme');
                } else if (settings.value.customBg) {
                    const url = `url(${settings.value.customBg})`;
                    document.body.style.backgroundImage = url;
                    themeStyle.backgroundImage = url;
                    document.body.classList.add('custom-theme');
                }
            });

            watch(() => manageModal.value.show, (val) => {
                if (val) {
                    nextTick(() => {
                        if (window.lucide) lucide.createIcons();
                    });
                }
            });

            watch([view, isAdding, isEditing, showTimePicker, showDatePicker, currentListId], () => {
                if (view.value === 'settings') {
                    // Forced reflow / nextTick for settings panel initial visibility
                    nextTick(() => {
                        const panel = document.querySelector('.setting-window');
                        if (panel) {
                            panel.style.display = 'none';
                            panel.offsetHeight; // force reflow
                            panel.style.display = 'block';
                        }
                    });
                }
                nextTick(() => lucide.createIcons());
                scrollActiveTabIntoView();
            });

            return { 
                themeStyle,
                todos, lists, currentListId, settings, view, isAdding, isEditing, form, 
                showTimePicker, showDatePicker, clockMode, dateMode, fileInput, t, 
                categories, recurringTypes, otherThemes, glassStyle, themeClasses, 
                customBgStyle, formatTimeDisplay, clockNumbers, clockRotation, 
                dateNumbers, dateRotation, sortedTodos, completedTodos, groupedTodos, 
                deletedTodos, toggleLang, toggleNotifications, selectTheme, 
                toggleCustomBg, triggerUpload, handleUpload, startAdding, editTodo, 
                saveTodo, closeModal, toggleTodo, deleteTodo, restoreTodo, 
                permanentDelete, addNewList, openDatePicker, closeSettings,
                handleClockInteraction, handleClockMove, getClockPos, 
                renderTrigger,
                isClockNumberActive, handleDateInteraction, handleDateMove, 
                getDatePos, isDateNumberActive, adjustYear, calculateNextGen, 
                formatDateTime, petalStyle, cloudStyle, rainStyle, isDarkTheme, effects,
                activeAssets, getAssetStyle, tempCustomBg, saveCustomBg, cancelUpload, clearCustomBg,
                showPetals,
                dropdowns, toggleDropdown, selectDropdownOption,
                pickerData, setToday, setTomorrow, updatePickerDate, updatePickerTime,
                listModal, addNewList, editList, deleteListPrompt, confirmListModal, closeListModal,
                isDefaultList, uploadProgress, confirmModal, promptClearCompleted, promptClearBin, executeConfirm,
                manageModal, openManageModal: () => manageModal.value.show = true,
                closeManageModal: () => manageModal.value.show = false,
                saveLists
            };
        }
    }).mount('#app');

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js');
    }
} catch (e) { 
    const errorReporter = document.getElementById('error-reporter');
    if (errorReporter) {
        errorReporter.style.display = 'block'; 
        errorReporter.innerText = 'ERROR: ' + e.message; 
    }
    console.error(e); 
}
