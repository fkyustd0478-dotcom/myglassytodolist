// setting.js — Settings page Vue app v1.2
// Depends on: storage.js (StorageProvider), nav.js (useNav)

const { createApp, ref, computed, watch, nextTick, onMounted, onUnmounted } = Vue;

createApp({
    setup() {
        const { navDropdownOpen, currentPageTitle, toggleNavDropdown, navSettings } = useNav();

        // ── System dark mode detection ─────────────────────────────────────
        const systemDark = ref(
            typeof window !== 'undefined' && window.matchMedia
                ? window.matchMedia('(prefers-color-scheme: dark)').matches
                : false
        );

        // ── Settings state ─────────────────────────────────────────────────
        const settingsTab = ref('theme');

        const settings = ref({
            theme: 'light',       // default when localStorage is empty
            useCustomBg: false,
            customBg: '',
            customBgOpacity: 0,
            themeOpacity: 1,
            lang: 'zh',
            effect: 'none',
            notificationsEnabled: true,
            calendarInfoEnabled: true,
            showHolidayTags: true,
            showLunarDates: true,
            showWeightChart: true,
            showLanguageStats: true,
            workoutCatCharts: { Chest: true, Back: true, Shoulders: true, Arms: true, Legs: true, Core: true, Cardio: true },
            ...StorageProvider.getCommonSettings()
        });

        const fileInput = ref(null);
        const showImportGuide = ref(false);
        const i18nT = (key, params) =>
            typeof LapisI18n !== 'undefined'
                ? LapisI18n.t(key, params, settings.value.lang)
                : key;
        const dataIoInput = ref(null);
        const dataIoType = ref('todo');
        const dataIoShiftImportKind = ref('shift');
        const dataIoExportFormat = ref('csv');
        const dataIoMessage = ref('');
        const dataIoError = ref('');
        const userProfile = ref(
            typeof LapisUserProfile !== 'undefined'
                ? LapisUserProfile.get()
                : { nickname: '', birthday: '' }
        );
        const profileMessage = ref('');
        const authUser = ref(null);
        const authEmail = ref('');
        const authPassword = ref('');
        const authMessage = ref('');
        const authError = ref('');
        const dataIoTypes = [
            {
                id: 'todo', label: 'Todo 事項', short: '任務與日期',
                csv: 'CSV: text,dueDate,dueTime,category,listName,completed',
                txt: 'TXT: Task A,2026-04-29',
            },
            {
                id: 'weight', label: '體重記錄', short: '日期與體重',
                csv: 'CSV: date,weight,unit',
                txt: 'TXT: 2026-04-29,70.5,kg',
            },
            {
                id: 'workoutLibrary', label: '運動庫', short: '動作資料',
                csv: 'CSV: name,nameZh,categories,type,preferredUnit,description,targetMuscles',
                txt: 'TXT: Bench Press,槓鈴臥推,sets,kg,Chest:Triceps',
            },
            {
                id: 'shift', label: '輪班表', short: '班別與標籤',
                csv: 'CSV: date,shifts,pays,others,note',
                txt: 'TXT: 2026-05-01,早班 / 2026-05-01,健身',
            },
        ];

        const dataIoLocalizedTypes = computed(() => dataIoTypes.map(type => ({
            ...type,
            label: i18nT(`settings.dataIo.types.${type.id}.label`),
            short: i18nT(`settings.dataIo.types.${type.id}.short`),
            csv: type.csv,
            txt: type.txt,
        })));

        const dataIoCurrentInfo = computed(() =>
            dataIoLocalizedTypes.value.find(type => type.id === dataIoType.value) || dataIoLocalizedTypes.value[0]
        );

        function _clearDataIoStatus() {
            dataIoMessage.value = '';
            dataIoError.value = '';
        }

        // ── Dynamic exercise categories (from Action Library) ──────────────
        const availableCategories = ref(
            typeof WorkoutConfig !== 'undefined'
                ? WorkoutConfig.getAvailableExerciseCategories()
                : []
        );

        // Toggle a sub-category chart on/off; undefined = on, false = off
        const toggleCatChart = (catName) => {
            settings.value.workoutCatCharts[catName] = settings.value.workoutCatCharts[catName] !== false ? false : true;
        };

        // ── Translations ───────────────────────────────────────────────────

        const translations = {
            en: {
                // Tabs
                tabTheme: 'Theme', tabUser: 'User', tabCalendar: 'Features',
                // Nav items
                navIndex: 'Glassy Todo', navShift: 'Glassy Shift', navSetting: 'Settings', navWorkout: 'Glassy Workout',
                // Theme section
                theme: 'Theme', system: 'System', light: 'Light', dark: 'Dark',
                themeOpacity: 'Theme Opacity',
                otherThemes: 'Other Themes',
                cherry: 'Cherry Blossom', sky: 'Sky', seaside: 'Seaside', sunset: 'Sunset',
                forest: 'Forest', sea: 'Sea', night: 'Night', torii: 'Torii',
                waterfall: 'Waterfall', ferriswheel: 'Ferris Wheel', starrynight: 'Starry Night',
                'plum-blossom': 'Plum Blossom',
                orange: 'Ember', purple: 'Cosmos', deepgray: 'Deep Gray',
                cherrrypink: 'Cherry Pink', skyblue: 'Sky Blue', grassgreen: 'Grass Green',
                beige: 'Beige', lightgrey: 'Light Grey', lavender: 'Lavender',
                // Effects
                visualFx: 'Visual Effects',
                effectNone: 'None', effectCherry: 'Petals', effectRain: 'Rain', effectSnow: 'Snow',
                // Custom background
                uiOpacity: 'Custom Image Opacity', custom: 'Custom (Upload)', upload: 'Upload Photo',
                removeImg: 'Remove Image', enable: 'Enable', disable: 'Disable',
                // User settings
                lang: 'Language', notifications: 'Notifications',
                // System
                systemSection: 'System',
                clearCache: 'Clear System Cache',
                confirmClearCache: 'This will reset your theme and language settings. Continue?',
                cancel: 'Cancel', confirm: 'Confirm',
                // User page
                userComingSoon: 'User page coming soon',
                // Calendar settings
                calendarSection: 'Calendar Info',
                calendarInfoEnabled: 'Show Calendar Info',
                showHolidayTags: 'Holiday Tags',
                showLunarDates: 'Lunar Dates',
                // Workout chart settings
                workoutSection: 'Workout Charts',
                showWeightChartLabel: 'Weight Trend',
                showLanguageStatsLabel: 'Language Achievements',
                workoutCatChartsLabel: 'Category Volume Charts',
                // Data management
                dataSection: 'Data Management',
                importGuideBtn: 'Format Guide',
                importGuideTitle: 'Data Format Reference',
                importGuideWeightTitle: 'Body Weight',
                importGuideWeightDesc: 'Stored in localStorage key: lapis_workout_metrics',
                importGuideWorkoutTitle: 'Workout Sessions',
                importGuideWorkoutDesc: 'Stored in localStorage key: lapis_workout',
                importGuideTodoTitle: 'Todo Tasks',
                importGuideTodoDesc: 'Stored in localStorage key: todo_data',
                importGuideSafetyNote: 'Tip: Use the browser DevTools → Application → Local Storage to directly edit or import JSON data. Changes are applied immediately on next page load.',
                importGuideClose: 'Close',
            },
            zh: {
                tabTheme: '主題設定', tabUser: '使用者頁面', tabCalendar: '頁面功能設定',
                navIndex: '琉璃待辦', navShift: '琉璃輪班', navSetting: '系統設定', navWorkout: '琉璃健身',
                theme: '主題', system: '系統', light: '明亮', dark: '深色',
                themeOpacity: '主題透明度',
                otherThemes: '其他主題',
                cherry: '櫻花', sky: '藍天', seaside: '海濱', sunset: '日落',
                forest: '森林', sea: '大海', night: '夜景', torii: '鳥居',
                waterfall: '瀑布', ferriswheel: '摩天輪', starrynight: '星空',
                'plum-blossom': '梅花',
                orange: '火焰', purple: '宇宙', deepgray: '深灰色',
                cherrrypink: '櫻花粉', skyblue: '天空藍', grassgreen: '草綠色',
                beige: '米黃色', lightgrey: '淺灰色', lavender: '淡紫色',
                visualFx: '視覺特效',
                effectNone: '無', effectCherry: '櫻花', effectRain: '下雨', effectSnow: '下雪',
                uiOpacity: '自定義圖片透明度', custom: '自定義 (上傳)', upload: '上傳照片',
                removeImg: '移除圖片', enable: '啟用', disable: '停用',
                lang: '語言', notifications: '通知',
                systemSection: 'System',
                clearCache: '清除介面暫存並更新',
                confirmClearCache: '這將會重置主題與語言設置，但您的資料將會保留。確定要繼續嗎？',
                cancel: '取消', confirm: '確認',
                userComingSoon: '使用者頁面即將推出',
                // Calendar settings
                calendarSection: '行事曆資訊',
                calendarInfoEnabled: '顯示行事曆資訊',
                showHolidayTags: '顯示節假日標籤',
                showLunarDates: '顯示農曆日期',
                // Workout chart settings
                workoutSection: '健身圖表',
                showWeightChartLabel: '體重趨勢圖',
                showLanguageStatsLabel: '語言成就',
                workoutCatChartsLabel: '分類訓練量圖',
                // Data management
                dataSection: '數據管理',
                importGuideBtn: '格式說明',
                importGuideTitle: '資料格式參考',
                importGuideWeightTitle: '體重記錄',
                importGuideWeightDesc: 'localStorage 鍵名：lapis_workout_metrics',
                importGuideWorkoutTitle: '訓練課程',
                importGuideWorkoutDesc: 'localStorage 鍵名：lapis_workout',
                importGuideTodoTitle: '待辦任務',
                importGuideTodoDesc: 'localStorage 鍵名：todo_data',
                importGuideSafetyNote: '提示：使用瀏覽器 DevTools → Application → Local Storage 可直接編輯或貼入 JSON 資料，重新載入頁面後立即生效。',
                importGuideClose: '關閉',
            }
        };

        const t = computed(() => translations[settings.value.lang] || translations.zh);

        const otherThemes = [
            { id: 'cherry' }, { id: 'forest' }, { id: 'night' },
            { id: 'sea' }, { id: 'seaside' }, { id: 'sky' },
            { id: 'sunset' }, { id: 'torii' }, { id: 'plum-blossom' },
            { id: 'waterfall' }, { id: 'ferriswheel' }, { id: 'starrynight' },
            { id: 'orange' }, { id: 'purple' }, { id: 'deepgray' },
            { id: 'cherrrypink' }, { id: 'skyblue' }, { id: 'grassgreen' },
            { id: 'beige' }, { id: 'lightgrey' }, { id: 'lavender' }
        ];

        // ── Theme computed ─────────────────────────────────────────────────
        const resolvedTheme = computed(() => {
            if (settings.value.theme === 'system') return systemDark.value ? 'dark' : 'light';
            return settings.value.theme;
        });

        const isDarkTheme = computed(() => {
            if (settings.value.theme === 'light')      return false;
            if (settings.value.theme === 'cherry')     return false;
            if (settings.value.theme === 'seaside')    return false;
            if (settings.value.theme === 'orange')     return false;
            if (settings.value.theme === 'waterfall')  return false;
            if (settings.value.theme === 'system')     return systemDark.value;
            const darkThemes = ['dark', 'night', 'torii', 'purple', 'ferriswheel', 'starrynight', 'deepgray'];
            if (settings.value.useCustomBg) return settings.value.customBgOpacity < 0.5;
            return darkThemes.includes(settings.value.theme);
        });

        const themeOpacity = computed(() => Math.max(0, Math.min(1, Number(settings.value.themeOpacity ?? 1))));

        const glassStyle = computed(() => isDarkTheme.value
            ? { backgroundColor: `rgba(0,0,0,${0.5 * themeOpacity.value})`, border: '2.5px solid rgba(255,255,255,0.9)', color: '#ffffff', backdropFilter: 'blur(16px) brightness(1.2)' }
            : { backgroundColor: `rgba(255,255,255,${0.75 * themeOpacity.value})`, border: '1.5px solid rgba(0,0,0,0.08)', color: '#1a1a1a', backdropFilter: 'blur(20px) brightness(1.03)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }
        );

        const themeClasses = computed(() => `theme-${resolvedTheme.value}`);

        const customBgStyle = computed(() => ({
            backgroundImage: settings.value.customBg ? `url(${settings.value.customBg})` : '',
            opacity: settings.value.useCustomBg ? (1 - settings.value.customBgOpacity) : 0,
        }));

        // Inactive button class — adapts to light/dark mode for visibility
        const inactiveBtn = computed(() =>
            isDarkTheme.value ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/5'
        );

        const themeDropdownOpen = ref(false);

        // ── Actions ────────────────────────────────────────────────────────
        // Delegate all bg-layer animation to LapisCore (triggered via navSettings.theme
        // watch in nav.js). Direct DOM manipulation here caused a race with _applyTheme.
        const selectTheme = (theme) => {
            themeDropdownOpen.value    = false;
            settings.value.useCustomBg = false;
            settings.value.theme       = theme;
        };

        const toggleLang = () => {
            settings.value.lang = settings.value.lang === 'en' ? 'zh' : 'en';
        };

        const toggleNotifications = () => {
            settings.value.notificationsEnabled = !settings.value.notificationsEnabled;
        };

        const toggleCustomBg = () => {
            settings.value.useCustomBg = !settings.value.useCustomBg;
        };

        const triggerUpload = () => {
            fileInput.value && fileInput.value.click();
        };

        const _MAX_BYTES = 2 * 1024 * 1024; // 2 MB

        // Resize image via canvas until data URL is within _MAX_BYTES.
        function _resizeToLimit(dataUrl) {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    let w = img.naturalWidth, h = img.naturalHeight;
                    let quality = 0.85;
                    const canvas = document.createElement('canvas');
                    const tryEncode = () => {
                        canvas.width  = w;
                        canvas.height = h;
                        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                        const result = canvas.toDataURL('image/jpeg', quality);
                        if (result.length <= _MAX_BYTES || quality < 0.25) {
                            resolve(result);
                        } else {
                            // Reduce quality first, then dimensions
                            quality > 0.4 ? (quality -= 0.15) : (w = Math.round(w * 0.75), h = Math.round(h * 0.75), quality = 0.75);
                            tryEncode();
                        }
                    };
                    tryEncode();
                };
                img.src = dataUrl;
            });
        }

        const handleUpload = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    let dataUrl = ev.target.result;
                    if (dataUrl.length > _MAX_BYTES) {
                        dataUrl = await _resizeToLimit(dataUrl);
                    }
                    settings.value.customBg    = dataUrl;
                    settings.value.useCustomBg = true;
                } catch (err) {
                    console.error('[Lapis] Upload failed', err);
                }
            };
            reader.readAsDataURL(file);
        };

        const clearCustomBg = () => {
            settings.value.customBg    = '';
            settings.value.useCustomBg = false;
        };

        const triggerDataImport = () => {
            _clearDataIoStatus();
            if (typeof LapisDataPortability === 'undefined') {
                dataIoError.value = '匯入工具尚未載入，請重新整理頁面。';
                return;
            }
            dataIoInput.value && dataIoInput.value.click();
        };

        const handleDataImport = (e) => {
            const file = e.target.files[0];
            e.target.value = '';
            if (!file) return;
            _clearDataIoStatus();
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const result = LapisDataPortability.importText(dataIoType.value, ev.target.result, {
                        shiftImportKind: dataIoShiftImportKind.value
                    });
                    dataIoMessage.value = `匯入完成：新增 ${result.added} 筆，格式 ${result.format.toUpperCase()}。`;
                } catch (err) {
                    dataIoError.value = err.message || '匯入失敗，請檢查檔案格式。';
                }
            };
            reader.onerror = () => {
                dataIoError.value = '無法讀取檔案，請重新選擇。';
            };
            reader.readAsText(file);
        };

        function _exportTimestamp() {
            const now = new Date();
            return `${toLocalISO(now)}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        }

        function _downloadExportText(type, format, text) {
            const mime = format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8';
            const blob = new Blob([text], { type: mime });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `lapis_${type}_${_exportTimestamp()}.${format}`;
            link.href = url;
            link.style.cssText = 'position:fixed;top:-100px;left:0;width:0;height:0;display:block;';
            document.body.appendChild(link);
            try { link.click(); } catch (_) {}
            setTimeout(() => {
                if (document.body.contains(link)) document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 200);
        }

        const exportDataFile = () => {
            _clearDataIoStatus();
            if (typeof LapisDataPortability === 'undefined') {
                dataIoError.value = '匯出工具尚未載入，請重新整理頁面。';
                return;
            }
            try {
                const format = dataIoExportFormat.value;
                const text = LapisDataPortability.exportText(dataIoType.value, format);
                _downloadExportText(dataIoType.value, format, text);
                dataIoMessage.value = `匯出完成：${dataIoCurrentInfo.value.label} ${format.toUpperCase()}。`;
            } catch (err) {
                dataIoError.value = err.message || '匯出失敗。';
            }
        };

        const clearCacheAndUpdate = () => {
            if (confirm(t.value.confirmClearCache)) {
                StorageProvider.saveCommonSettings({
                    theme: 'system', useCustomBg: false, customBg: '',
                    lang: settings.value.lang, effect: 'none',
                    notificationsEnabled: true, customBgOpacity: 0, themeOpacity: 1,
                    showLanguageStats: true
                });
                location.reload();
            }
        };

        // ── Persist on change + sync nav immediately ───────────────────────
        // navSettings (in nav.js) drives body class; without this sync,
        // picking light/dark in the UI reverts visually to the previous theme.
        watch(settings, (val) => {
            StorageProvider.saveCommonSettings(val);
            const prevCustomBg       = navSettings.customBg;
            navSettings.theme               = val.theme;
            navSettings.useCustomBg         = val.useCustomBg;
            navSettings.customBgOpacity     = val.customBgOpacity;
            navSettings.themeOpacity        = val.themeOpacity;
            navSettings.lang                = val.lang;
            navSettings.calendarInfoEnabled = val.calendarInfoEnabled;
            navSettings.showHolidayTags     = val.showHolidayTags;
            navSettings.showLunarDates      = val.showLunarDates;
            navSettings.showWeightChart     = val.showWeightChart;
            navSettings.showLanguageStats   = val.showLanguageStats;
            navSettings.workoutCatCharts    = val.workoutCatCharts;
            navSettings.customBg            = val.customBg;
            // customBg-only upload: Vue watch won't fire (theme/useCustomBg unchanged)
            if (val.customBg !== prevCustomBg && typeof LapisCore !== 'undefined') {
                LapisCore.applyTheme(val.theme, val.useCustomBg, {
                    customBg: val.customBg,
                    customBgOpacity: val.customBgOpacity,
                });
            }
        }, { deep: true });

        watch(() => settings.value.effect, (newEffect) => {
            if (window.ParticleEngine) ParticleEngine.setEffect(newEffect);
        });

        let _mqCleanup = null;
        let _authCleanup = null;

        const _setAuthStatus = (message, error = '') => {
            authMessage.value = message;
            authError.value = error;
        };

        const _authErrorMessage = (error) =>
            error && error.message ? error.message : 'Authentication failed.';

        const saveUserProfile = () => {
            try {
                if (typeof LapisUserProfile === 'undefined') throw new Error('Profile storage is not available.');
                userProfile.value = LapisUserProfile.save(userProfile.value);
                profileMessage.value = 'Profile saved.';
                authError.value = '';
            } catch (error) {
                profileMessage.value = '';
                authError.value = error.message || 'Profile save failed.';
            }
        };

        const loginWithGoogle = async () => {
            try {
                _setAuthStatus('');
                authUser.value = await AuthProvider.loginWithGoogle();
                _setAuthStatus('Signed in with Google.');
            } catch (error) {
                _setAuthStatus('', _authErrorMessage(error));
            }
        };

        const loginWithEmail = async () => {
            try {
                _setAuthStatus('');
                authUser.value = await AuthProvider.loginWithEmail(authEmail.value, authPassword.value);
                authPassword.value = '';
                _setAuthStatus('Signed in.');
            } catch (error) {
                _setAuthStatus('', _authErrorMessage(error));
            }
        };

        const signupWithEmail = async () => {
            try {
                _setAuthStatus('');
                authUser.value = await AuthProvider.signupWithEmail(authEmail.value, authPassword.value);
                authPassword.value = '';
                _setAuthStatus('Account created.');
            } catch (error) {
                _setAuthStatus('', _authErrorMessage(error));
            }
        };

        const logoutAuth = async () => {
            try {
                _setAuthStatus('');
                authUser.value = await AuthProvider.logout();
                _setAuthStatus('Signed out.');
            } catch (error) {
                _setAuthStatus('', _authErrorMessage(error));
            }
        };

        watch(navDropdownOpen, () => nextTick(() => { if (window.lucide) lucide.createIcons(); }));

        onMounted(async () => {
            if (typeof LapisNav !== 'undefined') LapisNav.inject({ bottom: false });
            if (typeof LapisModal !== 'undefined') LapisModal.init();
            if (window.lucide) lucide.createIcons();

            // Custom bg is stored as Base64 in localStorage; no restore needed.
            if (window.ParticleEngine) ParticleEngine.setEffect(settings.value.effect);

            // Live OS dark/light sync
            if (window.matchMedia) {
                const mq      = window.matchMedia('(prefers-color-scheme: dark)');
                const handler = (e) => { systemDark.value = e.matches; };
                if (mq.addEventListener) mq.addEventListener('change', handler);
                else mq.addListener(handler);
                _mqCleanup = () => {
                    if (mq.removeEventListener) mq.removeEventListener('change', handler);
                    else mq.removeListener(handler);
                };
            }

            if (typeof AuthProvider !== 'undefined') {
                if (AuthProvider.onChange) {
                    _authCleanup = AuthProvider.onChange((user) => { authUser.value = user; });
                } else {
                    authUser.value = AuthProvider.getUser();
                }
            }
        });

        onUnmounted(() => {
            if (_mqCleanup) _mqCleanup();
            if (_authCleanup) _authCleanup();
        });

        return {
            navDropdownOpen, currentPageTitle, toggleNavDropdown,
            settingsTab, settings, fileInput, t, otherThemes,
            systemDark, resolvedTheme, isDarkTheme, glassStyle, themeClasses,
            customBgStyle, inactiveBtn, themeDropdownOpen,
            selectTheme, toggleLang, toggleNotifications, toggleCustomBg,
            triggerUpload, handleUpload, clearCustomBg, clearCacheAndUpdate,
            triggerDataImport, handleDataImport, exportDataFile,
            availableCategories, toggleCatChart,
            showImportGuide,
            dataIoInput, dataIoType, dataIoShiftImportKind, dataIoExportFormat,
            dataIoTypes: dataIoLocalizedTypes, dataIoCurrentInfo,
            dataIoMessage, dataIoError,
            userProfile, saveUserProfile, profileMessage,
            authUser, authEmail, authPassword, authMessage, authError,
            loginWithGoogle, loginWithEmail, signupWithEmail, logoutAuth,
            i18nT,
        };
    }
}).component('LapisConfirm', window.LapisConfirm).mount('#app');
