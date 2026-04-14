// nav.js — Global navigation composable v3.1
// Loaded after storage.js, before page-specific scripts on all pages.
// Usage inside Vue setup():
//   const { navDropdownOpen, currentPageTitle, toggleNavDropdown,
//           navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle,
//           systemDark, resolvedTheme } = useNav();

function useNav() {
    const { ref, reactive, computed, watch, onMounted, onUnmounted } = Vue;

    const navDropdownOpen  = ref(false);
    const currentPageTitle = ref('琉璃待辦');

    // ── System color-scheme detection ──────────────────────────────────────
    const systemDark = ref(
        typeof window !== 'undefined' && window.matchMedia
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
            : false
    );

    // ── Shared theme state ─────────────────────────────────────────────────
    const navSettings = reactive({
        theme: 'light',           // default when localStorage is empty
        useCustomBg: false,
        customBg: '',
        customBgOpacity: 0.5,
        effect: 'none',
        notificationsEnabled: true,
        lang: 'zh',
        ...StorageProvider.getCommonSettings()
    });

    // ── Theme resolution ───────────────────────────────────────────────────
    const resolvedTheme = computed(() => {
        if (navSettings.theme === 'system') return systemDark.value ? 'dark' : 'light';
        return navSettings.theme;
    });

    const isDarkTheme = computed(() => {
        if (navSettings.theme === 'light')   return false;
        if (navSettings.theme === 'cherry')  return false;
        if (navSettings.theme === 'seaside') return false;
        if (navSettings.theme === 'system')  return systemDark.value;
        const dark = ['dark', 'forest', 'night', 'torii'];
        if (navSettings.useCustomBg) return navSettings.customBgOpacity < 0.5;
        return dark.includes(navSettings.theme);
    });

    // ── Theme display names (EN / ZH) ─────────────────────────────────────────
    const themeNames = {
        zh: {
            system: '系統', light: '明亮', dark: '深色',
            cherry: '櫻花', sky: '藍天', seaside: '海濱',
            sunset: '日落', forest: '森林', sea: '大海',
            night: '夜景', torii: '鳥居'
        },
        en: {
            system: 'System', light: 'Light', dark: 'Dark',
            cherry: 'Cherry', sky: 'Sky', seaside: 'Seaside',
            sunset: 'Sunset', forest: 'Forest', sea: 'Sea',
            night: 'Night', torii: 'Torii'
        }
    };

    const glassStyle = computed(() => isDarkTheme.value
        ? { backgroundColor: 'rgba(0,0,0,0.5)', border: '2.5px solid rgba(255,255,255,0.9)', color: '#ffffff', backdropFilter: 'blur(16px) brightness(1.2)' }
        : { backgroundColor: 'rgba(255,255,255,0.75)', border: '1.5px solid rgba(0,0,0,0.08)', color: '#1a1a1a', backdropFilter: 'blur(20px) brightness(1.03)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }
    );

    const themeClasses  = computed(() => `theme-${resolvedTheme.value}`);

    const customBgStyle = computed(() => ({
        backgroundImage: navSettings.customBg ? `url(${navSettings.customBg})` : '',
        opacity: navSettings.useCustomBg ? (1 - navSettings.customBgOpacity) : 0,
    }));

    // ── Language-aware page title ──────────────────────────────────────────
    const _pageTitles = {
        zh: { shift: '琉璃輪班', setting: '系統設定', index: '琉璃待辦' },
        en: { shift: 'Glassy Shift', setting: 'Settings', index: 'Glassy Todo' }
    };

    const _updateTitle = () => {
        const file   = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        const titles = _pageTitles[navSettings.lang] || _pageTitles.zh;
        if      (file.includes('shift'))   currentPageTitle.value = titles.shift;
        else if (file.includes('setting')) currentPageTitle.value = titles.setting;
        else                               currentPageTitle.value = titles.index;
    };

    // ── Navigation close handler ───────────────────────────────────────────
    const closeNav = (e) => {
        if (!e.target.closest('.nav-capsule')) navDropdownOpen.value = false;
    };

    let _mqCleanup = null;

    // ── Body class injection — immediate so CSS vars apply before first paint ──
    // { immediate: true } fires synchronously when the watcher is created,
    // before onMounted, eliminating the flash on every page including setting.html
    watch(resolvedTheme, (theme) => {
        document.body.className = 'theme-' + theme;
    }, { immediate: true });

    onMounted(async () => {
        _updateTitle();
        document.addEventListener('click', closeNav);

        // React to OS color-scheme changes in real time
        if (window.matchMedia) {
            const mq      = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = (e) => { systemDark.value = e.matches; };
            if (mq.addEventListener) mq.addEventListener('change', handler);
            else mq.addListener(handler); // Safari < 14 fallback
            _mqCleanup = () => {
                if (mq.removeEventListener) mq.removeEventListener('change', handler);
                else mq.removeListener(handler);
            };
        }

        // Restore custom background from IndexedDB (object URLs are session-scoped)
        if (navSettings.useCustomBg && typeof ImageDB !== 'undefined') {
            try {
                const blob = await ImageDB.getBlob('custom-bg');
                if (blob) navSettings.customBg = URL.createObjectURL(blob);
            } catch (_) {}
        }
    });

    onUnmounted(() => {
        document.removeEventListener('click', closeNav);
        if (_mqCleanup) _mqCleanup();
    });

    // Re-compute title when language is changed at runtime
    watch(() => navSettings.lang, _updateTitle);

    const toggleNavDropdown = () => { navDropdownOpen.value = !navDropdownOpen.value; };

    return {
        navDropdownOpen, currentPageTitle, toggleNavDropdown,
        navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle,
        systemDark, resolvedTheme, themeNames
    };
}
