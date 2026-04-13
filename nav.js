// nav.js — Global navigation composable v2.0
// Loaded after storage.js, before page-specific scripts on all pages.
// Usage inside Vue setup():
//   const { navDropdownOpen, currentPageTitle, toggleNavDropdown,
//           navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle } = useNav();

function useNav() {
    const { ref, reactive, computed, onMounted, onUnmounted } = Vue;

    const navDropdownOpen = ref(false);
    const currentPageTitle = ref('琉璃待辦');

    // ── Shared theme state ─────────────────────────────────────────────────
    // Single source of truth: reads from the same 'todo_settings' key as all pages.
    // Pages that mutate settings (setting.js) write back via StorageProvider;
    // pages that only display (shift.js) can use navSettings directly.
    const navSettings = reactive({
        theme: 'cherry',
        useCustomBg: false,
        customBg: '',
        customBgOpacity: 0.5,
        effect: 'none',
        notificationsEnabled: true,
        lang: 'zh',
        ...StorageProvider.getCommonSettings()
    });

    const isDarkTheme = computed(() => {
        const dark = ['forest', 'night', 'torii'];
        if (navSettings.useCustomBg) return navSettings.customBgOpacity < 0.5;
        return dark.includes(navSettings.theme);
    });

    const glassStyle = computed(() => isDarkTheme.value
        ? { backgroundColor: 'rgba(0,0,0,0.5)', border: '2.5px solid rgba(255,255,255,0.9)', color: '#ffffff', backdropFilter: 'blur(16px) brightness(1.2)' }
        : { backgroundColor: 'rgba(255,255,255,0.65)', border: '2.5px solid rgba(0,0,0,0.9)', color: '#000000', backdropFilter: 'blur(16px)' }
    );

    const themeClasses = computed(() => `theme-${navSettings.theme}`);

    const customBgStyle = computed(() => ({
        backgroundImage: navSettings.customBg ? `url(${navSettings.customBg})` : '',
        opacity: navSettings.useCustomBg ? (1 - navSettings.customBgOpacity) : 0,
    }));

    // ── Navigation ─────────────────────────────────────────────────────────
    const closeNav = (e) => {
        if (!e.target.closest('.nav-capsule')) navDropdownOpen.value = false;
    };

    onMounted(async () => {
        // Detect current page for title
        const file = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        if (file.includes('shift')) currentPageTitle.value = '琉璃輪班';
        else if (file.includes('setting')) currentPageTitle.value = '系統設定';
        else currentPageTitle.value = '琉璃待辦';

        document.addEventListener('click', closeNav);

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
    });

    const toggleNavDropdown = () => { navDropdownOpen.value = !navDropdownOpen.value; };

    return {
        navDropdownOpen, currentPageTitle, toggleNavDropdown,
        navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle
    };
}
