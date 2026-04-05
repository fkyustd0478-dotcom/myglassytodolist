try {
    const { createApp, ref, reactive, onMounted, computed, watch, nextTick } = Vue;

    createApp({
        setup() {
            // --- State ---
            const todos = ref([]);
            const lists = ref([{ id: '1', name: 'Personal' }, { id: '2', name: 'Work' }]);
            const currentListId = ref('1');
            const settings = ref({ 
                theme: 'sky', 
                customBgOpacity: 0.5, 
                notificationsEnabled: false, 
                lang: 'zh', // Default to Chinese as per request
                customBg: '', 
                useCustomBg: false 
            });
            
            const view = ref('active');
            const isAdding = ref(false);
            const isEditing = ref(false);
            const editingId = ref(null);
            
            const showTimePicker = ref(false);
            const showDatePicker = ref(false);
            const clockMode = ref('hour');
            const dateMode = ref('day');
            
            const fileInput = ref(null);
            
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
                    alertBefore: 'Alert before (mins)', edit: 'Edit'
                },
                zh: {
                    noTasks: '暫無任務', completed: '已完成紀錄', settings: '設置', theme: '主題', uiOpacity: '自定義圖片透明度', lang: '語言', notifications: '通知', back: '返回', emptyBin: '清空回收站', newTask: '新任務', editTask: '編輯任務', placeholder: '任務內容...', category: '分類', recurring: '重複', date: '日期', time: '時間', add: '添加', save: '保存', nextGen: '下次生成', custom: '自定義 (上傳)', upload: '上傳照片', light: '明亮', dark: '深色', otherThemes: '其他主題',
                    daily: '日常', normal: '一般', important: '重要', urgent: '緊急', memo: '備忘錄', none: '無', weekly: '每週', monthly: '每月', cherry: '櫻花', sky: '藍天', seaside: '海濱', sunset: '日落', forest: '森林', sea: '大海',
                    active: '進行中', bin: '回收站', noCompleted: '暫無完成紀錄', tasks: '項任務', day: '日', month: '月',
                    alertBefore: '提醒時間 (分鐘前)', edit: '編輯'
                }
            };

            const categories = ['urgent', 'important', 'normal', 'daily', 'memo'];
            const recurringTypes = ['none', 'daily', 'weekly', 'monthly'];
            const otherThemes = [{ id: 'cherry' }, { id: 'sky' }, { id: 'seaside' }, { id: 'sunset' }, { id: 'forest' }, { id: 'sea' }];

            // --- Computed ---
            const t = computed(() => translations[settings.value.lang]);
            
            const isDarkTheme = computed(() => {
                if (settings.value.useCustomBg) return false;
                return ['dark', 'sunset', 'sky', 'forest', 'sea'].includes(settings.value.theme);
            });

            const glassStyle = computed(() => ({ 
                backgroundColor: isDarkTheme.value ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)', 
                borderColor: 'rgba(255,255,255,0.1)' 
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
                settings.value.theme = id;
                settings.value.useCustomBg = false;
            };

            const toggleCustomBg = () => {
                if (settings.value.customBg) {
                    settings.value.useCustomBg = !settings.value.useCustomBg;
                } else {
                    triggerUpload();
                }
            };

            const triggerUpload = () => fileInput.value.click();

            const handleUpload = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let w = img.width, h = img.height;
                        const max = 1280;
                        
                        if (w > max || h > max) { 
                            if (w > h) { h *= max / w; w = max; } 
                            else { w *= max / h; h = max; } 
                        }
                        
                        canvas.width = w; 
                        canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, w, h);
                        
                        // Compression: JPEG 0.7 quality
                        const compressedData = canvas.toDataURL('image/jpeg', 0.7);
                        settings.value.customBg = compressedData;
                        settings.value.useCustomBg = true;
                        e.target.value = '';
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
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
                const due = `${form.value.date}T${h.toString().padStart(2, '0')}:${form.value.time.minute.toString().padStart(2, '0')}:00`;
                
                if (isEditing.value) {
                    const t = todos.value.find(x => x.id === editingId.value);
                    if (t) Object.assign(t, { 
                        text: form.value.text, 
                        category: form.value.category, 
                        recurring: form.value.recurring, 
                        dueDate: due, 
                        notified: false,
                        alertMinutes: form.value.alertMinutes
                    });
                } else {
                    todos.value.unshift({ 
                        id: Date.now().toString(36), 
                        listId: currentListId.value, 
                        text: form.value.text, 
                        category: form.value.category, 
                        recurring: form.value.recurring, 
                        dueDate: due, 
                        completed: false, 
                        isDeleted: false, 
                        notified: false,
                        alertMinutes: form.value.alertMinutes
                    });
                }
                closeModal();
                form.value.text = ''; // Clear top input
            };

            const closeModal = () => { isAdding.value = isEditing.value = false; editingId.value = null; };
            
            const toggleTodo = (id) => { 
                const t = todos.value.find(x => x.id === id); 
                if (t) t.completed = !t.completed; 
            };
            
            const deleteTodo = (id) => { const t = todos.value.find(x => x.id === id); if (t) t.isDeleted = true; };
            const restoreTodo = (id) => { const t = todos.value.find(x => x.id === id); if (t) t.isDeleted = false; };
            const permanentDelete = (id) => todos.value = todos.value.filter(x => x.id !== id);
            const emptyBin = () => todos.value = todos.value.filter(x => !x.isDeleted);
            
            const addNewList = () => { 
                const name = prompt('List Name:'); 
                if (name) lists.value.push({ id: Date.now().toString(36), name }); 
            };

            const openDatePicker = () => showDatePicker.value = true;

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
            const petalStyle = (n) => ({ left: (n * 5) + '%', animationDuration: (5 + Math.random() * 5) + 's', animationDelay: (Math.random() * 5) + 's' });
            const cloudStyle = (n) => ({ top: (n * 15) + '%', animationDuration: (20 + Math.random() * 20) + 's', animationDelay: (-Math.random() * 20) + 's' });
            const rainStyle = (n) => ({ left: (n * 7) + '%', animationDelay: (Math.random() * 2) + 's' });

            const getAssetStyle = (asset) => {
                const style = {
                    left: asset.x + '%',
                    backgroundImage: `url(${asset.file})`,
                    transform: asset.flip ? 'scaleX(-1)' : 'none'
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
                    file: `/pic/${file}`,
                    flip,
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
                    asset.bottom = 100;
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

            const removeAsset = (id, type) => {
                activeAssets.value = activeAssets.value.filter(a => a.id !== id);
                setTimeout(() => {
                    const currentTheme = settings.value.theme;
                    if ((type === 'airplane' && currentTheme === 'sky') ||
                        (type === 'crab' && currentTheme === 'seaside') ||
                        (type === 'ship' && currentTheme === 'sea')) {
                        spawnAsset(type);
                    }
                }, 3000 + Math.random() * 5000);
            };

            const setupEffects = () => {
                setTimeout(() => { if (settings.value.theme === 'sky') spawnAsset('airplane'); }, 1000);
                setTimeout(() => { if (settings.value.theme === 'seaside') spawnAsset('crab'); }, 2000);
                setTimeout(() => { if (settings.value.theme === 'sea') spawnAsset('ship'); }, 3000);
                
                watch(() => settings.value.theme, (newTheme) => {
                    if (newTheme === 'sky' && !activeAssets.value.some(a => a.type === 'airplane')) spawnAsset('airplane');
                    if (newTheme === 'seaside' && !activeAssets.value.some(a => a.type === 'crab')) spawnAsset('crab');
                    if (newTheme === 'sea' && !activeAssets.value.some(a => a.type === 'ship')) spawnAsset('ship');
                });
            };

            // --- Lifecycle ---
            onMounted(() => {
                const saved = localStorage.getItem('glassy_todo_v12');
                if (saved) { 
                    const d = JSON.parse(saved); 
                    todos.value = d.todos || []; 
                    lists.value = d.lists || lists.value; 
                    settings.value = { ...settings.value, ...d.settings }; 
                }
                if (window.lucide) lucide.createIcons();
                setupEffects();
                
                // Notification Checker
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
            watch([todos, settings, lists], () => { 
                localStorage.setItem('glassy_todo_v12', JSON.stringify({ todos: todos.value, settings: settings.value, lists: lists.value })); 
                nextTick(() => lucide.createIcons()); 
            }, { deep: true });

            watch([view, isAdding, isEditing, showTimePicker, showDatePicker, currentListId], () => nextTick(() => lucide.createIcons()));

            return { 
                todos, lists, currentListId, settings, view, isAdding, isEditing, form, 
                showTimePicker, showDatePicker, clockMode, dateMode, fileInput, t, 
                categories, recurringTypes, otherThemes, glassStyle, themeClasses, 
                customBgStyle, formatTimeDisplay, clockNumbers, clockRotation, 
                dateNumbers, dateRotation, sortedTodos, completedTodos, groupedTodos, 
                deletedTodos, toggleLang, toggleNotifications, selectTheme, 
                toggleCustomBg, triggerUpload, handleUpload, startAdding, editTodo, 
                saveTodo, closeModal, toggleTodo, deleteTodo, restoreTodo, 
                permanentDelete, emptyBin, addNewList, openDatePicker, 
                handleClockInteraction, handleClockMove, getClockPos, 
                isClockNumberActive, handleDateInteraction, handleDateMove, 
                getDatePos, isDateNumberActive, adjustYear, calculateNextGen, 
                formatDateTime, petalStyle, cloudStyle, rainStyle, isDarkTheme, effects,
                activeAssets, getAssetStyle
            };
        }
    }).mount('#app');

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js');
    }
} catch (e) { 
    const errorReporter = document.getElementById('error-reporter');
    if (errorReporter) {
        errorReporter.style.display = 'block'; 
        errorReporter.innerText = 'ERROR: ' + e.message; 
    }
    console.error(e); 
}
