try {
    const { createApp, ref, reactive, onMounted, computed, watch, nextTick } = Vue;

    const APP_VERSION = '1.2.0';

    createApp({
        setup() {
            const { navDropdownOpen, currentPageTitle, toggleNavDropdown,
                    navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle } = useNav();
            // --- State ---
            const todos = ref([]);
            const lists = ref([
                { id: 'default', name: 'Default' },
                { id: 'personal', name: 'Personal' },
                { id: 'work', name: 'Work' }
            ]);
            const currentListId = ref('default');
            const appMode = ref('todo'); // always 'todo' on this page
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

            const confirmModal = reactive({
                show: false,
                title: '',
                message: '',
                onConfirm: null
            });

            const settings = ref({
                theme: 'system',
                customBgOpacity: 0.5,
                notificationsEnabled: true,
                lang: 'zh',
                customBg: '',
                useCustomBg: false,
                effect: 'none',
                ...StorageProvider.getCommonSettings()
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
            const pickerMode = ref('date'); // 'date' | 'time'
            let _datePicker = null;
            let _timePicker = null;
            
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
                    navIndex: 'Glassy Todo', navShift: 'Glassy Shift', navSetting: 'Settings', navWorkout: 'Glassy Workout',
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
                    navIndex: '琉璃待辦', navShift: '琉璃輪班', navSetting: '系統設定', navWorkout: '琉璃健身',
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

            const t = computed(() => translations[navSettings.lang] || translations.zh);

            const modeTitle = computed(() => {
                if (navSettings.lang === 'zh') {
                    return appMode.value === 'todo' ? '琉璃待辦' : '琉璃輪班';
                }
                return appMode.value === 'todo' ? 'Glassy Todo' : 'Glassy Shift';
            });

            const isDefaultList = (id) => ['default', 'personal', 'work'].includes(id);

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
            const toggleLang = () => {
                navSettings.lang = navSettings.lang === 'en' ? 'zh' : 'en';
                StorageProvider.saveCommonSettings(navSettings);
            };
            
            const toggleNotifications = async () => {
                if (navSettings.notificationsEnabled) {
                    navSettings.notificationsEnabled = false;
                    StorageProvider.saveCommonSettings(navSettings);
                    return;
                }
                if (!('Notification' in window)) {
                    navSettings.notificationsEnabled = false;
                    StorageProvider.saveCommonSettings(navSettings);
                    return;
                }
                try {
                    const permission = await Notification.requestPermission();
                    navSettings.notificationsEnabled = permission === 'granted';
                } catch (e) {
                    navSettings.notificationsEnabled = false;
                }
                StorageProvider.saveCommonSettings(navSettings);
            };

            const selectTheme = (id) => {
                activeAssets.value = [];
                navSettings.theme = id;
                navSettings.useCustomBg = false;
                StorageProvider.saveCommonSettings(navSettings);
            };

            const toggleCustomBg = () => {
                if (navSettings.customBg) {
                    navSettings.useCustomBg = !navSettings.useCustomBg;
                    StorageProvider.saveCommonSettings(navSettings);
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
                navSettings.customBg = url;
                navSettings.useCustomBg = true;

                uploadProgress.value = 100;
                setTimeout(() => uploadProgress.value = 0, 500);
                StorageProvider.saveCommonSettings(navSettings);
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
                navSettings.customBg = '';
                navSettings.useCustomBg = false;

                await ImageDB.deleteBlob('custom-bg');
                StorageProvider.saveCommonSettings(navSettings);
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

            const scrollTaskToCenter = (el) => {
                const container = document.querySelector('main');
                if (!container || !el) return;
                const containerRect = container.getBoundingClientRect();
                const elRect = el.getBoundingClientRect();
                const offset = elRect.top - containerRect.top - (containerRect.height / 2) + (elRect.height / 2);
                container.scrollBy({ top: offset, behavior: 'smooth' });
            };

            const editTodo = (todo) => {
                const el = document.querySelector(`[data-todo-id="${todo.id}"]`);
                scrollTaskToCenter(el);
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

            const saveTodo = (event) => {
                if (event) { event.preventDefault(); event.stopPropagation(); }
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
                    const newId = Date.now().toString(36);
                    todos.value.unshift({
                        id: newId,
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
                    nextTick(() => {
                        scrollTaskToCenter(document.querySelector(`[data-todo-id="${newId}"]`));
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
                Object.assign(confirmModal, {
                    show: true,
                    title: t.value.clearAll,
                    message: t.value.confirmClearCompleted,
                    onConfirm: () => {
                        todos.value = todos.value.filter(x => !x.completed || x.isDeleted);
                        renderTrigger.value++;
                    }
                });
            };

            const promptClearBin = () => {
                Object.assign(confirmModal, {
                    show: true,
                    title: t.value.clearAll,
                    message: t.value.confirmClearBin,
                    onConfirm: () => {
                        todos.value = todos.value.filter(x => !x.isDeleted);
                        renderTrigger.value++;
                    }
                });
            };

            const executeConfirm = () => {
                if (confirmModal.onConfirm) confirmModal.onConfirm();
                confirmModal.show = false;
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
                openPicker('date');
            };

            const isAnyModalOpen = computed(() => {
                return view.value === 'settings' || 
                       isAdding.value || 
                       isEditing.value || 
                       manageModal.value.show || 
                       listModal.value.show || 
                       showDateTimePicker.value || 
                       confirmModal.show ||
                       showSettingsModal.value ||
                       isMenuOpen.value;
            });


            const dropdowns = reactive({
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
                    navSettings.theme = val;
                    navSettings.useCustomBg = false;
                    StorageProvider.saveCommonSettings(navSettings);
                } else {
                    form.value[key] = val;
                }
                dropdowns[key] = false;
            };

            const setToday = () => {
                const now = new Date();
                form.value.date = now.toISOString().split('T')[0];
                if (_datePicker) _datePicker.setValue(now.getFullYear(), now.getMonth() + 1, now.getDate());
            };

            const setTomorrow = () => {
                const t = new Date();
                t.setDate(t.getDate() + 1);
                form.value.date = t.toISOString().split('T')[0];
                if (_datePicker) _datePicker.setValue(t.getFullYear(), t.getMonth() + 1, t.getDate());
            };

            const scrollActiveTabIntoView = () => {
                nextTick(() => {
                    const activeTab = document.querySelector('.list-tab-item.active-tab');
                    if (activeTab) {
                        activeTab.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
                    }
                });
            };

            const pickerDateStr = computed(() => form.value.date ? form.value.date.replace(/-/g, '/') : '');
            const pickerTimeStr = computed(() =>
                `${form.value.time.hour.toString().padStart(2,'0')}:${form.value.time.minute.toString().padStart(2,'0')}`
            );

            const openPicker = (mode) => {
                pickerMode.value = mode;
                showDateTimePicker.value = true;
                // Set wheel positions after Vue makes the container visible
                nextTick(() => {
                    if (mode === 'date' && _datePicker) {
                        const d = form.value.date ? new Date(form.value.date + 'T00:00:00') : new Date();
                        _datePicker.setValue(d.getFullYear(), d.getMonth() + 1, d.getDate());
                    } else if (mode === 'time' && _timePicker) {
                        _timePicker.setValue(form.value.time.hour, form.value.time.minute);
                    }
                });
            };

            const switchPickerMode = (mode) => { pickerMode.value = mode; };

            const closeDateTimePicker = () => {
                if (_datePicker) {
                    const v = _datePicker.getValue();
                    form.value.date = v.iso;
                }
                if (_timePicker) {
                    const v = _timePicker.getValue();
                    form.value.time.hour = v.hour;
                    form.value.time.minute = v.minute;
                }
                showDateTimePicker.value = false;
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
                        const currentTheme = navSettings.theme;
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
                        ParticleEngine.setEffect(navSettings.effect);
                    }

                    if (!navSettings.useCustomBg) {
                        document.body.style.backgroundImage = '';
                    }
                };

                clearAndSchedule(navSettings.theme);

                watch(() => navSettings.theme, (newTheme) => {
                    clearAndSchedule(newTheme);
                });

                watch(() => navSettings.effect, (newEffect) => {
                    if (window.ParticleEngine) {
                        ParticleEngine.setEffect(newEffect);
                    }
                });

                watch(() => navSettings.useCustomBg, (isCustom) => {
                    if (isCustom) {
                        if (effectTimeout) clearTimeout(effectTimeout);
                        activeAssets.value = [];
                    } else {
                        clearAndSchedule(navSettings.theme);
                    }
                });
            };

            onMounted(async () => {
                appMode.value = window.location.pathname.includes('shift') ? 'shift' : 'todo';
                confirmModal.show = false;

                const storedVersion = localStorage.getItem('app_version');
                if (storedVersion !== APP_VERSION) {
                    localStorage.clear();
                    sessionStorage.clear();
                    localStorage.setItem('app_version', APP_VERSION);
                    location.reload(true);
                    return;
                }

                await ImageDB.init();

                // nav.js (useNav) handles loading navSettings and custom background image.
                const savedData = StorageProvider.loadData();

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

                // Inject Lapis navigation and initialize modal system
                if (typeof LapisNav !== 'undefined') LapisNav.inject({ bottom: false });
                if (typeof LapisModal !== 'undefined') LapisModal.init();

                // Initialize Lapis date/time pickers
                const _dateEl = document.getElementById('lapis-date-picker');
                const _timeEl = document.getElementById('lapis-time-picker');
                if (_dateEl && typeof LapisDatePicker !== 'undefined') {
                    const _now = new Date();
                    _datePicker = new LapisDatePicker(_dateEl, {
                        year: _now.getFullYear(), month: _now.getMonth() + 1, day: _now.getDate()
                    });
                }
                if (_timeEl && typeof LapisTimePicker !== 'undefined') {
                    const _now = new Date();
                    _timePicker = new LapisTimePicker(_timeEl, {
                        hour: _now.getHours(), minute: _now.getMinutes()
                    });
                }

                nextTick(() => {
                    if (window.lucide) lucide.createIcons();
                    scrollActiveTabIntoView();
                    scrollTaskToCenter(document.querySelector('[data-todo-id]'));
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
                        const parsed = JSON.parse(e.newValue);
                        Object.assign(navSettings, parsed);
                    }
                    if (e.key === 'todo_data' && e.newValue) {
                        const data = JSON.parse(e.newValue);
                        todos.value = data.todos || [];
                        lists.value = data.lists || [];
                    }
                });
                
                setInterval(() => {
                    if (!navSettings.notificationsEnabled) return;
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

            // navSettings persistence is handled per-mutation via StorageProvider.saveCommonSettings.

            watch(currentListId, () => scrollActiveTabIntoView());

            watch([todos, lists], () => {
                StorageProvider.saveData({ todos: todos.value, lists: lists.value });
                nextTick(() => lucide.createIcons());
            }, { deep: true });

            const clearCacheAndUpdate = () => {
                Object.assign(confirmModal, {
                    show: true,
                    title: t.value.clearCache,
                    message: t.value.confirmClearCache,
                    onConfirm: () => {
                        const currentSettings = JSON.parse(localStorage.getItem('todo_settings') || '{}');
                        const newSettings = {
                            theme: 'system',
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
                });
            };


            return {
                themeStyle,
                todos, lists, currentListId, settings, view, isAdding, isEditing, form,
                showDateTimePicker, pickerMode, fileInput, t,
                categories, recurringTypes, otherThemes, glassStyle, themeClasses,
                customBgStyle, formatTimeDisplay, sortedTodos, completedTodos, groupedTodos,
                deletedTodos, toggleLang, toggleNotifications, selectTheme,
                toggleCustomBg, triggerUpload, handleUpload, startAdding, editTodo,
                saveTodo, closeModal, toggleTodo, deleteTodo, restoreTodo,
                pickerDateStr, pickerTimeStr,
                openPicker, switchPickerMode, closeDateTimePicker,
                permanentDelete, addNewList, openDatePicker, closeSettings,
                renderTrigger, calculateNextGen,
                formatDateTime, petalStyle, cloudStyle, rainStyle, isDarkTheme, effects,
                activeAssets, getAssetStyle, tempCustomBg, saveCustomBg, cancelUpload, clearCustomBg,
                showPetals, showRain,
                dropdowns, toggleDropdown, selectDropdownOption,
                setToday, setTomorrow,
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
                navDropdownOpen, currentPageTitle, toggleNavDropdown,
                navSettings
            };
        }
    }).mount('#app');
} catch (e) { 
    console.error(e); 
}
