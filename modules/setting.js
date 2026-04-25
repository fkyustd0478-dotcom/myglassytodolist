// setting.js — Settings page Vue app v1.2
// Depends on: storage.js (StorageProvider, ImageDB), nav.js (useNav)

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
            lang: 'zh',
            effect: 'none',
            notificationsEnabled: true,
            calendarInfoEnabled: true,
            showHolidayTags: true,
            showLunarDates: true,
            ...StorageProvider.getCommonSettings()
        });

        const fileInput        = ref(null);
        const currentObjectUrl = ref(null);

        // ── Translations ───────────────────────────────────────────────────
        const translations = {
            en: {
                // Tabs
                tabTheme: 'Theme', tabUser: 'User', tabCalendar: 'Calendar',
                // Nav items
                navIndex: 'Glassy Todo', navShift: 'Glassy Shift', navSetting: 'Settings', navWorkout: 'Glassy Workout',
                // Theme section
                theme: 'Theme', system: 'System', light: 'Light', dark: 'Dark',
                otherThemes: 'Other Themes',
                cherry: 'Cherry Blossom', sky: 'Sky', seaside: 'Seaside', sunset: 'Sunset',
                forest: 'Forest', sea: 'Sea', night: 'Night', torii: 'Torii',
                mapleavenue: 'Maple Avenue', waterfall: 'Waterfall',
                starrysky: 'Starry Sky', ferriswheel: 'Ferris Wheel',
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
            },
            zh: {
                tabTheme: '主題設定', tabUser: '使用者頁面', tabCalendar: '行事曆',
                navIndex: '琉璃待辦', navShift: '琉璃輪班', navSetting: '系統設定', navWorkout: '琉璃健身',
                theme: '主題', system: '系統', light: '明亮', dark: '深色',
                otherThemes: '其他主題',
                cherry: '櫻花', sky: '藍天', seaside: '海濱', sunset: '日落',
                forest: '森林', sea: '大海', night: '夜景', torii: '鳥居',
                mapleavenue: '楓葉大道', waterfall: '瀑布',
                starrysky: '星空', ferriswheel: '摩天輪',
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
            }
        };

        const t = computed(() => translations[settings.value.lang] || translations.zh);

        const otherThemes = [
            { id: 'cherry' }, { id: 'forest' }, { id: 'night' },
            { id: 'sea' }, { id: 'seaside' }, { id: 'sky' },
            { id: 'sunset' }, { id: 'torii' },
            { id: 'mapleavenue' }, { id: 'waterfall' },
            { id: 'starrysky' }, { id: 'ferriswheel' }
        ];

        // ── Theme computed ─────────────────────────────────────────────────
        const resolvedTheme = computed(() => {
            if (settings.value.theme === 'system') return systemDark.value ? 'dark' : 'light';
            return settings.value.theme;
        });

        const isDarkTheme = computed(() => {
            if (settings.value.theme === 'light')        return false;
            if (settings.value.theme === 'cherry')       return false;
            if (settings.value.theme === 'seaside')      return false;
            if (settings.value.theme === 'mapleavenue')  return false;
            if (settings.value.theme === 'waterfall')    return false;
            if (settings.value.theme === 'system')       return systemDark.value;
            const darkThemes = ['dark', 'forest', 'night', 'torii', 'starrysky', 'ferriswheel'];
            if (settings.value.useCustomBg) return settings.value.customBgOpacity < 0.5;
            return darkThemes.includes(settings.value.theme);
        });

        const glassStyle = computed(() => isDarkTheme.value
            ? { backgroundColor: 'rgba(0,0,0,0.5)', border: '2.5px solid rgba(255,255,255,0.9)', color: '#ffffff', backdropFilter: 'blur(16px) brightness(1.2)' }
            : { backgroundColor: 'rgba(255,255,255,0.75)', border: '1.5px solid rgba(0,0,0,0.08)', color: '#1a1a1a', backdropFilter: 'blur(20px) brightness(1.03)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }
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
        const _imgThemes = new Set([
            'cherry','sky','sunset','sea','seaside','forest','night','torii',
            'mapleavenue','waterfall','starrysky','ferriswheel'
        ]);

        const selectTheme = async (theme) => {
            themeDropdownOpen.value = false;
            settings.value.useCustomBg = false;

            // 1. Fade out bg-layer synchronously while it's still showing old content
            const bgLayer = document.querySelector('.bg-layer');
            if (bgLayer) {
                bgLayer.style.transition = 'none';
                bgLayer.style.opacity    = '0';
                bgLayer.style.filter     = 'blur(10px)';
                bgLayer.offsetHeight; // force reflow
            }

            // 2. Swap body class immediately — CSS variables update while bg-layer is invisible
            document.body.className = 'theme-' + theme;

            // 3. Preload the new bg image before revealing the layer
            if (_imgThemes.has(theme)) {
                await new Promise(r => {
                    const img = new Image();
                    img.onload = img.onerror = r;
                    img.src = `./theme/${theme}.png`;
                    setTimeout(r, 3000);
                });
            }

            // 4. Push theme into reactive state (Vue re-render)
            settings.value.theme = theme;

            // 5. Fade bg-layer back in
            await nextTick();
            requestAnimationFrame(() => requestAnimationFrame(() => {
                if (bgLayer) {
                    bgLayer.style.transition = 'opacity 0.8s cubic-bezier(0.4,0,0.2,1), filter 0.8s ease';
                    bgLayer.style.opacity    = '';
                    bgLayer.style.filter     = '';
                }
            }));
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

        const handleUpload = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                await ImageDB.saveBlob('custom-bg', file);
                if (currentObjectUrl.value) URL.revokeObjectURL(currentObjectUrl.value);
                const blob = await ImageDB.getBlob('custom-bg');
                const objectUrl = URL.createObjectURL(blob);
                // Preload image so custom-bg-layer opacity transition is smooth
                await new Promise(r => {
                    const img = new Image();
                    img.onload = img.onerror = r;
                    img.src = objectUrl;
                });
                currentObjectUrl.value = objectUrl;
                settings.value.customBg = objectUrl;
                settings.value.useCustomBg = true;
            } catch (err) {
                console.error('Upload failed', err);
            }
        };

        const clearCustomBg = async () => {
            try { await ImageDB.deleteBlob('custom-bg'); } catch (_) {}
            if (currentObjectUrl.value) URL.revokeObjectURL(currentObjectUrl.value);
            currentObjectUrl.value = null;
            settings.value.customBg = '';
            settings.value.useCustomBg = false;
        };

        const clearCacheAndUpdate = () => {
            if (confirm(t.value.confirmClearCache)) {
                StorageProvider.saveCommonSettings({
                    theme: 'system', useCustomBg: false, customBg: '',
                    lang: settings.value.lang, effect: 'none',
                    notificationsEnabled: true, customBgOpacity: 0
                });
                location.reload();
            }
        };

        // ── Persist on change + sync nav immediately ───────────────────────
        // navSettings (in nav.js) drives body class; without this sync,
        // picking light/dark in the UI reverts visually to the previous theme.
        watch(settings, (val) => {
            StorageProvider.saveCommonSettings(val);
            navSettings.theme               = val.theme;
            navSettings.useCustomBg         = val.useCustomBg;
            navSettings.customBgOpacity     = val.customBgOpacity;
            navSettings.lang                = val.lang;
            navSettings.calendarInfoEnabled = val.calendarInfoEnabled;
            navSettings.showHolidayTags     = val.showHolidayTags;
            navSettings.showLunarDates      = val.showLunarDates;
            if (val.customBg) navSettings.customBg = val.customBg;
        }, { deep: true });

        watch(() => settings.value.effect, (newEffect) => {
            if (window.ParticleEngine) ParticleEngine.setEffect(newEffect);
        });

        let _mqCleanup = null;

        watch(navDropdownOpen, () => nextTick(() => { if (window.lucide) lucide.createIcons(); }));

        onMounted(async () => {
            if (typeof LapisNav !== 'undefined') LapisNav.inject({ bottom: false });
            if (typeof LapisModal !== 'undefined') LapisModal.init();
            if (window.lucide) lucide.createIcons();

            if (settings.value.useCustomBg) {
                try {
                    const blob = await ImageDB.getBlob('custom-bg');
                    if (blob) {
                        if (currentObjectUrl.value) URL.revokeObjectURL(currentObjectUrl.value);
                        currentObjectUrl.value = URL.createObjectURL(blob);
                        settings.value.customBg = currentObjectUrl.value;
                    }
                } catch (_) {}
            }
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
            document.body.classList.add('lapis-ready');
        });

        onUnmounted(() => { if (_mqCleanup) _mqCleanup(); });

        return {
            navDropdownOpen, currentPageTitle, toggleNavDropdown,
            settingsTab, settings, fileInput, t, otherThemes,
            systemDark, resolvedTheme, isDarkTheme, glassStyle, themeClasses,
            customBgStyle, inactiveBtn, themeDropdownOpen,
            selectTheme, toggleLang, toggleNotifications, toggleCustomBg,
            triggerUpload, handleUpload, clearCustomBg, clearCacheAndUpdate
        };
    }
}).component('LapisConfirm', window.LapisConfirm).mount('#app');
