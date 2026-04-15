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

    // ── Background transition system ──────────────────────────────────────────
    // Image themes are preloaded before the class switch so the bg-layer
    // never flickers during the opacity/blur entrance animation.
    const _imgThemes = new Set([
        'cherry','sky','sunset','sea','seaside','forest','night','torii',
        'mapleavenue','waterfall','starrysky','ferriswheel'
    ]);
    let _firstApply = true;

    function _preload(src) {
        return new Promise(r => {
            const img = new Image();
            img.onload = img.onerror = r;
            img.src = src;
            setTimeout(r, 3000); // safety timeout
        });
    }

    async function _applyTheme(theme, useCustomBg) {
        const cls = 'theme-' + theme + (useCustomBg ? ' using-custom-bg' : '');

        // First load: apply synchronously — anti-flash script already set
        // the html background; just update body class with no animation.
        if (_firstApply) {
            _firstApply = false;
            document.body.className = cls;
            return;
        }

        // Animate out the bg-layer before switching
        const bgLayer = document.querySelector('.bg-layer');
        if (bgLayer) {
            bgLayer.style.transition = 'none';
            bgLayer.style.opacity   = '0';
            bgLayer.style.filter    = 'blur(10px)';
            bgLayer.offsetHeight;   // force reflow so the state registers
        }

        // For image themes: wait until the asset is in browser cache
        // For solid/gradient themes: proceed immediately
        if (_imgThemes.has(theme)) {
            await _preload('./theme/' + theme + '.png');
        }

        document.body.className = cls;

        // Double-RAF ensures the new background-image is painted before we
        // remove the override, triggering the CSS opacity+blur transition.
        requestAnimationFrame(() => requestAnimationFrame(() => {
            if (bgLayer) {
                bgLayer.style.transition = 'opacity 0.8s cubic-bezier(0.4,0,0.2,1), filter 0.8s ease';
                bgLayer.style.opacity    = '';
                bgLayer.style.filter     = '';
            }
        }));
    }

    // ── Body class injection ──────────────────────────────────────────────────
    // { immediate: true } fires synchronously before onMounted (first load).
    // Subsequent reactive changes go through the preload + transition path.
    watch([resolvedTheme, () => navSettings.useCustomBg], ([theme, useCustomBg]) => {
        _applyTheme(theme, useCustomBg);
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
