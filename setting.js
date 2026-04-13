// setting.js — Settings page Vue app
// Depends on: storage.js (StorageProvider, ImageDB), nav.js (useNav)

const { createApp, ref, computed, watch, onMounted, onUnmounted } = Vue;

createApp({
    setup() {
        const { navDropdownOpen, currentPageTitle, toggleNavDropdown } = useNav();

        // --- System dark mode detection ---
        const systemDark = ref(
            typeof window !== 'undefined' && window.matchMedia
                ? window.matchMedia('(prefers-color-scheme: dark)').matches
                : false
        );

        // --- Settings state ---
        const settingsTab = ref('theme'); // 'theme' | 'user'

        const settings = ref({
            theme: 'system',
            useCustomBg: false,
            customBg: '',
            customBgOpacity: 0.5,
            lang: 'zh',
            effect: 'none',
            notificationsEnabled: true,
            ...StorageProvider.getCommonSettings()
        });

        const fileInput = ref(null);
        const currentObjectUrl = ref(null);

        // --- Translations ---
        const translations = {
            en: {
                theme: 'Theme', uiOpacity: 'Custom Image Opacity', lang: 'Language',
                notifications: 'Notifications', custom: 'Custom (Upload)', upload: 'Upload Photo',
                system: 'System', light: 'Light', dark: 'Dark', otherThemes: 'Other Themes',
                cherry: 'Cherry Blossom', sky: 'Sky', seaside: 'Seaside', sunset: 'Sunset',
                forest: 'Forest', sea: 'Sea', night: 'Night', torii: 'Torii',
                clearCache: 'Clear System Cache', removeImg: 'Remove Image',
                enable: 'Enable', disable: 'Disable',
                confirmClearCache: 'This will reset your theme and language settings. Continue?',
                cancel: 'Cancel', confirm: 'Confirm'
            },
            zh: {
                theme: '主題', uiOpacity: '自定義圖片透明度', lang: '語言',
                notifications: '通知', custom: '自定義 (上傳)', upload: '上傳照片',
                system: '系統', light: '明亮', dark: '深色', otherThemes: '其他主題',
                cherry: '櫻花', sky: '藍天', seaside: '海濱', sunset: '日落',
                forest: '森林', sea: '大海', night: '夜景', torii: '鳥居',
                clearCache: '清除介面暫存並更新', removeImg: '移除圖片',
                enable: '啟用', disable: '停用',
                confirmClearCache: '這將會重置主題與語言設置，但您的資料將會保留。確定要繼續嗎？',
                cancel: '取消', confirm: '確認'
            }
        };

        const t = computed(() => translations[settings.value.lang] || translations.zh);

        const otherThemes = [
            { id: 'cherry' }, { id: 'forest' }, { id: 'night' },
            { id: 'sea' }, { id: 'seaside' }, { id: 'sky' },
            { id: 'sunset' }, { id: 'torii' }
        ];

        // --- Theme computed ---
        const resolvedTheme = computed(() => {
            if (settings.value.theme === 'system') return systemDark.value ? 'dark' : 'light';
            return settings.value.theme;
        });

        const isDarkTheme = computed(() => {
            if (settings.value.theme === 'system') return systemDark.value;
            const darkThemes = ['forest', 'night', 'torii', 'dark'];
            if (settings.value.useCustomBg) return settings.value.customBgOpacity < 0.5;
            return darkThemes.includes(settings.value.theme);
        });

        const glassStyle = computed(() => {
            return isDarkTheme.value
                ? { backgroundColor: 'rgba(0,0,0,0.5)', border: '2.5px solid rgba(255,255,255,0.9)', color: '#ffffff', backdropFilter: 'blur(16px) brightness(1.2)' }
                : { backgroundColor: 'rgba(255,255,255,0.65)', border: '2.5px solid rgba(0,0,0,0.9)', color: '#000000', backdropFilter: 'blur(16px)' };
        });

        const themeClasses = computed(() => `theme-${resolvedTheme.value}`);

        const customBgStyle = computed(() => ({
            backgroundImage: `url(${settings.value.customBg})`,
            opacity: 1 - settings.value.customBgOpacity,
            display: settings.value.useCustomBg ? 'block' : 'none'
        }));

        const themeDropdownOpen = ref(false);

        // --- Actions ---
        const selectTheme = (theme) => {
            settings.value.theme = theme;
            settings.value.useCustomBg = false;
            themeDropdownOpen.value = false;
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
                currentObjectUrl.value = URL.createObjectURL(blob);
                settings.value.customBg = currentObjectUrl.value;
                settings.value.useCustomBg = true;
            } catch (err) {
                console.error('Upload failed', err);
            }
        };

        const clearCustomBg = async () => {
            try {
                await ImageDB.deleteBlob('custom-bg');
            } catch (_) {}
            if (currentObjectUrl.value) URL.revokeObjectURL(currentObjectUrl.value);
            currentObjectUrl.value = null;
            settings.value.customBg = '';
            settings.value.useCustomBg = false;
        };

        const clearCacheAndUpdate = () => {
            if (confirm(t.value.confirmClearCache)) {
                const kept = { lang: settings.value.lang };
                StorageProvider.saveSettings({
                    theme: 'cherry', useCustomBg: false, customBg: '',
                    lang: kept.lang, effect: 'none', notificationsEnabled: true, customBgOpacity: 0.5
                });
                location.reload();
            }
        };

        // --- Persist on change ---
        watch(settings, (val) => {
            StorageProvider.saveCommonSettings(val);
        }, { deep: true });

        watch(() => settings.value.effect, (newEffect) => {
            if (window.ParticleEngine) ParticleEngine.setEffect(newEffect);
        });

        let _mqCleanup = null;

        onMounted(async () => {
            if (window.lucide) lucide.createIcons();
            // Restore custom background from IndexedDB
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

            // React to OS color-scheme changes in real time
            if (window.matchMedia) {
                const mq = window.matchMedia('(prefers-color-scheme: dark)');
                const handler = (e) => { systemDark.value = e.matches; };
                if (mq.addEventListener) mq.addEventListener('change', handler);
                else mq.addListener(handler);
                _mqCleanup = () => {
                    if (mq.removeEventListener) mq.removeEventListener('change', handler);
                    else mq.removeListener(handler);
                };
            }
        });

        onUnmounted(() => {
            if (_mqCleanup) _mqCleanup();
        });

        return {
            navDropdownOpen, currentPageTitle, toggleNavDropdown,
            settingsTab, settings, fileInput, t, otherThemes,
            systemDark, resolvedTheme, isDarkTheme, glassStyle, themeClasses, customBgStyle, themeDropdownOpen,
            selectTheme, toggleLang, toggleNotifications, toggleCustomBg,
            triggerUpload, handleUpload, clearCustomBg, clearCacheAndUpdate
        };
    }
}).mount('#app');
