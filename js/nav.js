// nav.js — Global navigation composable v4.0
// Loaded after core_engine.js (LapisCore handles all bg rendering).
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
        customBgOpacity: 0,
        effect: 'none',
        notificationsEnabled: true,
        lang: 'zh',
        calendarInfoEnabled: true,
        showHolidayTags: true,
        showLunarDates: true,
        ...StorageProvider.getCommonSettings()
    });

    // ── Theme resolution ───────────────────────────────────────────────────
    const resolvedTheme = computed(() => {
        if (navSettings.theme === 'system') return systemDark.value ? 'dark' : 'light';
        return navSettings.theme;
    });

    const isDarkTheme = computed(() => {
        if (navSettings.theme === 'light')        return false;
        if (navSettings.theme === 'cherry')       return false;
        if (navSettings.theme === 'seaside')      return false;
        if (navSettings.theme === 'mapleavenue')  return false;
        if (navSettings.theme === 'waterfall')    return false;
        if (navSettings.theme === 'system')       return systemDark.value;
        const dark = ['dark', 'forest', 'night', 'torii', 'starrysky', 'ferriswheel'];
        if (navSettings.useCustomBg) return navSettings.customBgOpacity < 0.5;
        return dark.includes(navSettings.theme);
    });

    // ── Theme display names (EN / ZH) ─────────────────────────────────────────
    const themeNames = {
        zh: {
            system: '系統', light: '明亮', dark: '深色',
            cherry: '櫻花', sky: '藍天', seaside: '海濱',
            sunset: '日落', forest: '森林', sea: '大海',
            night: '夜景', torii: '鳥居',
            mapleavenue: '楓葉大道', waterfall: '瀑布',
            starrysky: '星空', ferriswheel: '摩天輪'
        },
        en: {
            system: 'System', light: 'Light', dark: 'Dark',
            cherry: 'Cherry', sky: 'Sky', seaside: 'Seaside',
            sunset: 'Sunset', forest: 'Forest', sea: 'Sea',
            night: 'Night', torii: 'Torii',
            mapleavenue: 'Maple Avenue', waterfall: 'Waterfall',
            starrysky: 'Starry Sky', ferriswheel: 'Ferris Wheel'
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
        zh: { shift: '琉璃輪班', setting: '系統設定', index: '琉璃待辦', workout: '琉璃健身' },
        en: { shift: 'Glassy Shift', setting: 'Settings', index: 'Glassy Todo', workout: 'Glassy Workout' }
    };

    const _updateTitle = () => {
        const file   = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        const titles = _pageTitles[navSettings.lang] || _pageTitles.zh;
        if      (file.includes('shift'))   currentPageTitle.value = titles.shift;
        else if (file.includes('setting')) currentPageTitle.value = titles.setting;
        else if (file.includes('workout')) currentPageTitle.value = titles.workout;
        else                               currentPageTitle.value = titles.index;
    };

    // ── Navigation close handler ───────────────────────────────────────────
    const closeNav = (e) => {
        if (!e.target.closest('.nav-capsule')) navDropdownOpen.value = false;
    };

    let _mqCleanup      = null;
    let _storageCleanup = null;

    // ── Background Engine (delegates to LapisCore) ────────────────────────────
    let _firstApply = true;
    let _applyTimer = null;

    function _themeOpts() {
        return {
            customBg:        navSettings.customBg,
            customBgOpacity: navSettings.customBgOpacity,
        };
    }

    function _applyTheme(theme, useCustomBg) {
        // Update body class immediately (drives CSS variables / glass style)
        document.body.className = 'theme-' + theme + (useCustomBg ? ' using-custom-bg' : '');
        if (typeof LapisCore === 'undefined') return;
        const skipAnimation = _firstApply;
        if (_firstApply) _firstApply = false;
        LapisCore.applyTheme(theme, useCustomBg, { ..._themeOpts(), skipAnimation });
    }

    // Exposed for same-tab direct calls (setting.js on customBg-only changes)
    window.LapisNav = window.LapisNav || {};
    window.LapisNav._applyTheme = () => _applyTheme(resolvedTheme.value, navSettings.useCustomBg);

    // ── Body class injection + theme watch ────────────────────────────────────
    watch([resolvedTheme, () => navSettings.useCustomBg], ([theme, useCustomBg]) => {
        if (_firstApply) { _applyTheme(theme, useCustomBg); return; }
        clearTimeout(_applyTimer);
        _applyTimer = setTimeout(() => _applyTheme(theme, useCustomBg), 100);
    }, { immediate: true });

    // Live opacity update when custom-bg slider moves
    watch(() => navSettings.customBgOpacity, (opacity) => {
        if (!navSettings.useCustomBg) return;
        if (typeof LapisCore !== 'undefined') LapisCore.setActiveOpacity(1 - opacity);
    });

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

        // lapis-ready gate: pre-decode theme image before revealing the page.
        try {
            if (typeof LapisCore !== 'undefined') {
                const activeTheme = resolvedTheme.value;
                const isImgTheme  = ['cherry','sky','sunset','sea','seaside','forest',
                    'night','torii','mapleavenue','waterfall','starrysky','ferriswheel']
                    .includes(activeTheme);
                if (isImgTheme && !navSettings.useCustomBg) {
                    await LapisCore.preloadImage('./theme/' + activeTheme + '.png');
                } else if (navSettings.useCustomBg && navSettings.customBg) {
                    await LapisCore.preloadImage(navSettings.customBg);
                }
            }
        } catch (_) {}
        document.body.classList.add('lapis-ready');

        // Cross-tab sync
        const _onStorage = (e) => {
            if (e.key !== 'todo_settings' || !e.newValue) return;
            try {
                const s = JSON.parse(e.newValue);
                if (s.theme           !== undefined && s.theme           !== navSettings.theme)           navSettings.theme           = s.theme;
                if (s.useCustomBg     !== undefined && s.useCustomBg     !== navSettings.useCustomBg)     navSettings.useCustomBg     = s.useCustomBg;
                if (s.customBgOpacity !== undefined && s.customBgOpacity !== navSettings.customBgOpacity) navSettings.customBgOpacity = s.customBgOpacity;
                if (s.lang            !== undefined && s.lang            !== navSettings.lang)            navSettings.lang            = s.lang;
                if (s.customBg !== undefined && s.customBg !== navSettings.customBg) {
                    navSettings.customBg = s.customBg;
                    _applyTheme(resolvedTheme.value, navSettings.useCustomBg);
                }
            } catch (_) {}
        };
        window.addEventListener('storage', _onStorage);
        _storageCleanup = () => window.removeEventListener('storage', _onStorage);
    });

    onUnmounted(() => {
        document.removeEventListener('click', closeNav);
        if (_mqCleanup)      _mqCleanup();
        if (_storageCleanup) _storageCleanup();
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
