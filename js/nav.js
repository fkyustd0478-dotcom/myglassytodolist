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

    let _mqCleanup = null;

    // ── Background transition system ──────────────────────────────────────────
    const _imgThemes = new Set([
        'cherry','sky','sunset','sea','seaside','forest','night','torii',
        'mapleavenue','waterfall','starrysky','ferriswheel'
    ]);
    let _firstApply      = true;
    let _flashGuard      = null;
    let _bgSecondary     = null;
    let _storageCleanup  = null;

    // Flash guard: subtle dark-blur overlay for solid-theme transitions.
    function _getFlashGuard() {
        if (!_flashGuard) {
            _flashGuard = document.createElement('div');
            _flashGuard.id = 'lapis-flash-guard';
            _flashGuard.style.cssText = [
                'position:fixed', 'inset:0', 'z-index:9998',
                'backdrop-filter:blur(18px)', '-webkit-backdrop-filter:blur(18px)',
                'background:rgba(12,12,22,0.18)',
                'opacity:0', 'transition:opacity 0.18s ease',
                'pointer-events:none'
            ].join(';');
            document.body.appendChild(_flashGuard);
        }
        return _flashGuard;
    }

    // Secondary bg layer for double-buffer cross-dissolve.
    // Inserted immediately after .bg-layer so same z-index (0) stacks on top via DOM order.
    function _getBgSecondary() {
        if (!_bgSecondary) {
            _bgSecondary = document.createElement('div');
            _bgSecondary.id = 'lapis-bg-secondary';
            _bgSecondary.style.cssText = [
                'position:fixed', 'top:0', 'left:0',
                'width:100%', 'height:100%',
                'z-index:0',
                'pointer-events:none',
                'opacity:0',
                'background-size:cover',
                'background-position:center',
                'background-attachment:fixed',
                'will-change:opacity'
            ].join(';');
            const primary = document.querySelector('.bg-layer');
            if (primary && primary.parentNode) {
                primary.parentNode.insertBefore(_bgSecondary, primary.nextSibling);
            } else {
                document.body.appendChild(_bgSecondary);
            }
        }
        return _bgSecondary;
    }

    // Preload an image src and wait for GPU decode (img.decode) when available.
    // Returns a Promise that resolves once the asset is paint-ready.
    function _preload(src) {
        return new Promise(r => {
            const img = new Image();
            img.onload = () => {
                (typeof img.decode === 'function' ? img.decode() : Promise.resolve())
                    .catch(() => {}).then(r);
            };
            img.onerror = r;
            img.src     = src;
            setTimeout(r, 3000); // safety timeout
        });
    }

    async function _applyTheme(theme, useCustomBg) {
        const cls     = 'theme-' + theme + (useCustomBg ? ' using-custom-bg' : '');
        const primary = document.querySelector('.bg-layer');

        // First load: anti-flash inline script already set the correct body class.
        // Just align body.className and skip all animation.
        if (_firstApply) {
            _firstApply = false;
            document.body.className = cls;
            return;
        }

        if (_imgThemes.has(theme)) {
            // ── Image theme: true cross-dissolve, screen never blank ───────────
            const secondary = _getBgSecondary();

            // Freeze primary's current background-image via inline style so that
            // Vue's reactive CSS class update (which fires while we await) has
            // no visual effect until we deliberately unfreeze below.
            if (primary) {
                const cur = window.getComputedStyle(primary).backgroundImage;
                if (cur && cur !== 'none') primary.style.backgroundImage = cur;
            }

            // Stage new image in secondary (invisible, no transition yet)
            secondary.style.transition       = 'none';
            secondary.style.opacity          = '0';
            secondary.style.backgroundImage  = `url('./theme/${theme}.png')`;
            secondary.offsetHeight; // reflow

            // Confirm asset is GPU-decoded before starting the visual swap
            await _preload('./theme/' + theme + '.png');

            // Update body class → CSS vars change; bg-layer class also changes
            // but the inline freeze on primary prevents a visual pop
            document.body.className = cls;

            // Cross-dissolve: secondary (new) fades IN, primary (old) fades OUT
            secondary.style.transition = 'opacity 0.6s ease';
            secondary.style.opacity    = '1';
            if (primary) {
                primary.style.transition = 'opacity 0.6s ease';
                primary.style.opacity    = '0';
            }

            // Wait for dissolve to finish, then hand off back to primary
            await new Promise(r => setTimeout(r, 640));

            // Unfreeze primary — Vue's CSS class (already updated) now paints
            // the new theme. Reset opacity. Hide secondary.
            if (primary) {
                primary.style.backgroundImage = '';
                primary.style.transition      = 'none';
                primary.style.opacity         = '1';
                primary.style.filter          = '';
                primary.offsetHeight;
            }
            secondary.style.transition = 'opacity 0.4s ease';
            secondary.style.opacity    = '0';

        } else {
            // ── Solid/gradient theme: no asset to load, use flash guard ───────
            const guard = _getFlashGuard();
            guard.style.opacity = '1';

            if (primary) {
                primary.style.transition       = 'none';
                primary.style.opacity          = '0';
                primary.style.filter           = 'blur(10px)';
                primary.style.backgroundImage  = ''; // clear any cross-dissolve freeze
                primary.offsetHeight;
            }

            document.body.className = cls;
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

            if (primary) {
                primary.style.transition = 'opacity 0.8s cubic-bezier(0.4,0,0.2,1), filter 0.8s ease';
                primary.style.opacity    = '';
                primary.style.filter     = '';
            }
            guard.style.opacity = '0';
        }
    }

    // ── Body class injection ──────────────────────────────────────────────────
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

        // lapis-ready gate: decode the current theme image before lifting the
        // body opacity cloak. Prevents cold-load blank frames on image themes.
        const activeTheme = resolvedTheme.value;
        if (_imgThemes.has(activeTheme) && !navSettings.useCustomBg) {
            await _preload('./theme/' + activeTheme + '.png');
        }
        document.body.classList.add('lapis-ready');

        // Cross-tab theme sync: when any tab saves new settings to localStorage,
        // update navSettings here so the bg transitions without a page reload.
        const _onStorage = (e) => {
            if (e.key !== 'todo_settings' || !e.newValue) return;
            try {
                const s = JSON.parse(e.newValue);
                if (s.theme      !== undefined && s.theme      !== navSettings.theme)      navSettings.theme      = s.theme;
                if (s.useCustomBg !== undefined && s.useCustomBg !== navSettings.useCustomBg) navSettings.useCustomBg = s.useCustomBg;
                if (s.lang       !== undefined && s.lang       !== navSettings.lang)       navSettings.lang       = s.lang;
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
