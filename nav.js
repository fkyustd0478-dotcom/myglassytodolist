// nav.js — Global navigation composable v3.0
// Loaded after storage.js, before page-specific scripts on all pages.
// Usage inside Vue setup():
//   const { navDropdownOpen, currentPageTitle, toggleNavDropdown,
//           navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle,
//           systemDark, resolvedTheme } = useNav();

function useNav() {
    const { ref, reactive, computed, onMounted, onUnmounted } = Vue;

    const navDropdownOpen = ref(false);
    const currentPageTitle = ref('琉璃待辦');

    // ── System color-scheme detection ──────────────────────────────────────
    // Tracks the OS dark/light preference. Stays reactive via a media query listener.
    const systemDark = ref(
        typeof window !== 'undefined' && window.matchMedia
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
            : false
    );

    // ── Shared theme state ─────────────────────────────────────────────────
    // Default theme is 'system' — automatically follows the OS preference.
    // Saved user preferences (from todo_settings) override this default.
    const navSettings = reactive({
        theme: 'system',          // 'system' | 'light' | 'dark' | 'cherry' | …
        useCustomBg: false,
        customBg: '',
        customBgOpacity: 0.5,
        effect: 'none',
        notificationsEnabled: true,
        lang: 'zh',
        ...StorageProvider.getCommonSettings()
    });

    // ── Theme resolution ───────────────────────────────────────────────────
    // 'system' resolves to the OS preference; all other values are used as-is.
    const resolvedTheme = computed(() => {
        if (navSettings.theme === 'system') return systemDark.value ? 'dark' : 'light';
        return navSettings.theme;
    });

    const isDarkTheme = computed(() => {
        if (navSettings.theme === 'system') return systemDark.value;
        const dark = ['forest', 'night', 'torii', 'dark'];
        if (navSettings.useCustomBg) return navSettings.customBgOpacity < 0.5;
        return dark.includes(navSettings.theme);
    });

    const glassStyle = computed(() => isDarkTheme.value
        ? { backgroundColor: 'rgba(0,0,0,0.5)', border: '2.5px solid rgba(255,255,255,0.9)', color: '#ffffff', backdropFilter: 'blur(16px) brightness(1.2)' }
        : { backgroundColor: 'rgba(255,255,255,0.65)', border: '2.5px solid rgba(0,0,0,0.9)', color: '#000000', backdropFilter: 'blur(16px)' }
    );

    const themeClasses = computed(() => `theme-${resolvedTheme.value}`);

    const customBgStyle = computed(() => ({
        backgroundImage: navSettings.customBg ? `url(${navSettings.customBg})` : '',
        opacity: navSettings.useCustomBg ? (1 - navSettings.customBgOpacity) : 0,
    }));

    // ── Navigation close handler ───────────────────────────────────────────
    const closeNav = (e) => {
        if (!e.target.closest('.nav-capsule')) navDropdownOpen.value = false;
    };

    let _mqCleanup = null;

    onMounted(async () => {
        // Detect current page for title
        const file = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        if (file.includes('shift'))   currentPageTitle.value = '琉璃輪班';
        else if (file.includes('setting')) currentPageTitle.value = '系統設定';
        else                          currentPageTitle.value = '琉璃待辦';

        document.addEventListener('click', closeNav);

        // React to OS color-scheme changes in real time
        if (window.matchMedia) {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
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

    const toggleNavDropdown = () => { navDropdownOpen.value = !navDropdownOpen.value; };

    return {
        navDropdownOpen, currentPageTitle, toggleNavDropdown,
        navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle,
        systemDark, resolvedTheme
    };
}
