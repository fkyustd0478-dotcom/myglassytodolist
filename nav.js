// nav.js — Global navigation composable
// Loaded after storage.js, before page-specific scripts on all pages.
// Usage inside Vue setup(): const { navDropdownOpen, currentPageTitle, toggleNavDropdown } = useNav();

function useNav() {
    const { ref, onMounted, onUnmounted } = Vue;

    const navDropdownOpen = ref(false);
    const currentPageTitle = ref('琉璃待辦');

    const closeNav = (e) => {
        if (!e.target.closest('.nav-capsule')) {
            navDropdownOpen.value = false;
        }
    };

    onMounted(() => {
        const file = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        if (file.includes('shift')) currentPageTitle.value = '琉璃輪班';
        else if (file.includes('setting')) currentPageTitle.value = '系統設定';
        else currentPageTitle.value = '琉璃待辦';
        document.addEventListener('click', closeNav);
    });

    onUnmounted(() => {
        document.removeEventListener('click', closeNav);
    });

    const toggleNavDropdown = () => {
        navDropdownOpen.value = !navDropdownOpen.value;
    };

    return { navDropdownOpen, currentPageTitle, toggleNavDropdown };
}
