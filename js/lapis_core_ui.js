// lapis_core_ui.js — Lapis System UI Toolkit v1.0
// Provides: LapisNav (navigation injection) + LapisModal (modal system)
// Requires: Lucide icons loaded on page, lapis_shared_style.css

(function (global) {
    'use strict';

    // ── Helpers ───────────────────────────────────────────────────────────────
    const _getLang = () => {
        try { return JSON.parse(localStorage.getItem('todo_settings') || '{}').lang || 'zh'; }
        catch (_) { return 'zh'; }
    };

    // Timezone-safe local date string: never uses toISOString() to avoid UTC rollback
    function _toLocalISO(ts) {
        const d = (ts instanceof Date) ? ts : new Date(ts !== undefined ? ts : Date.now());
        const y  = d.getFullYear();
        const m  = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    }
    global.toLocalISO = _toLocalISO;

    // Chart color palette — 10 distinct colors for dynamic category charts
    global.LapisChartPalette = [
        '#3b82f6','#ef4444','#22c55e','#f59e0b','#a855f7',
        '#14b8a6','#f97316','#ec4899','#06b6d4','#84cc16'
    ];

    // ── Page registry ─────────────────────────────────────────────────────────
    const _pages = [
        { key: 'home',    href: './index.html',   icon: 'home',         zh: '首頁',     en: 'Home'           },
        { key: 'todo',    href: './todo.html',    icon: 'check-square', zh: '琉璃任務', en: 'Glassy Todo'    },
        { key: 'shift',   href: './shift.html',   icon: 'calendar',     zh: '琉璃班表', en: 'Glassy Shift'   },
        { key: 'workout', href: './workout.html', icon: 'dumbbell',     zh: '琉璃健身', en: 'Glassy Workout'  },
        { key: 'setting', href: './setting.html', icon: 'settings',     zh: '系統設定', en: 'Settings'        },
    ];

    const _currentKey = () => {
        const file = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        if (file.includes('todo'))    return 'todo';
        if (file.includes('shift'))   return 'shift';
        if (file.includes('workout')) return 'workout';
        if (file.includes('setting')) return 'setting';
        return 'home';
    };

    const _pageTitle = (lang) => {
        const page = _pages.find(p => p.key === _currentKey());
        return page ? (lang === 'en' ? page.en : page.zh) : '琉璃任務';
    };

    // ── LapisNav ──────────────────────────────────────────────────────────────
    const LapisNav = {
        _open: false,

        _buildTopNav(lang) {
            const currentKey = _currentKey();
            const items = _pages.map(p => {
                const label = lang === 'en' ? p.en : p.zh;
                const active = p.key === currentKey ? ' active' : '';
                return `<a href="${p.href}" class="lapis-dropdown-item${active}">
                    <i data-lucide="${p.icon}" style="width:16px;height:16px;flex-shrink:0"></i>
                    <span>${label}</span>
                </a>`;
            }).join('');

            return `<header class="lapis-top-nav" data-lapis-top-nav>
                <div class="lapis-nav-capsule glass" data-lapis-capsule>
                    <button class="lapis-capsule-btn" data-lapis-capsule-btn aria-expanded="false">
                        <span class="lapis-capsule-title">${_pageTitle(lang)}</span>
                        <i data-lucide="chevron-down" style="width:16px;height:16px;opacity:0.4;transition:transform 0.25s"></i>
                    </button>
                    <div class="lapis-dropdown glass" data-lapis-dropdown aria-hidden="true" style="display:none">
                        ${items}
                    </div>
                </div>
            </header>`;
        },

        // ── Public: inject top nav into target (default: document.body) ──────
        inject(options = {}) {
            const lang   = options.lang   || _getLang();
            const target = options.target || document.body;

            if (!document.querySelector('[data-lapis-top-nav]')) {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = this._buildTopNav(lang);
                target.insertBefore(wrapper.firstElementChild, target.firstChild);
            }

            this._bindEvents();
            if (typeof lucide !== 'undefined') lucide.createIcons();
        },

        // ── Public: re-render top nav labels after language change ──────────
        refresh(lang) {
            lang = lang || _getLang();
            const top = document.querySelector('[data-lapis-top-nav]');

            if (top) {
                top.insertAdjacentHTML('afterend', this._buildTopNav(lang));
                top.remove();
            }

            this._open = false;
            this._bindEvents();
            if (typeof lucide !== 'undefined') lucide.createIcons();
        },

        _bindEvents() {
            const btn      = document.querySelector('[data-lapis-capsule-btn]');
            const dropdown = document.querySelector('[data-lapis-dropdown]');
            const chevron  = btn && btn.querySelector('[data-lucide="chevron-down"]');
            if (!btn || !dropdown) return;

            const _setOpen = (open) => {
                this._open = open;
                dropdown.style.display = open ? 'block' : 'none';
                dropdown.setAttribute('aria-hidden', String(!open));
                btn.setAttribute('aria-expanded', String(open));
                if (chevron) chevron.style.transform = open ? 'rotate(180deg)' : '';
            };

            // Remove old listeners by cloning the button
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                _setOpen(!this._open);
            });

            // Single global click listener — guard against double-bind
            if (!document._lapisNavBound) {
                document._lapisNavBound = true;
                document.addEventListener('click', (e) => {
                    if (!e.target.closest('[data-lapis-capsule]')) _setOpen(false);
                });
            }
        },
    };

    // ── LapisModal ────────────────────────────────────────────────────────────
    const LapisModal = {
        _stack: [],

        // Call once after page load to wire backdrop-click-to-close on all
        // .lapis-modal-backdrop elements already in the DOM.
        init() {
            document.querySelectorAll('.lapis-modal-backdrop').forEach(el => {
                this._wire(el);
            });
            // Keyboard ESC closes top modal
            if (!document._lapisModalEscBound) {
                document._lapisModalEscBound = true;
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') this.closeTop();
                });
            }
        },

        // Wire backdrop click-to-close + shell click-stop on a single element.
        // Call this manually for modals injected after init().
        _wire(el) {
            if (el._lapisWired) return;
            el._lapisWired = true;
            el.addEventListener('click', (e) => {
                if (e.target === el) this.close(el.id);
            });
            const shell = el.querySelector('.lapis-modal-shell');
            if (shell) shell.addEventListener('click', e => e.stopPropagation());
        },

        // Alias kept for clarity in calling code
        register(id) {
            const el = document.getElementById(id);
            if (el) this._wire(el);
        },

        open(id) {
            const el = document.getElementById(id);
            if (!el) return;
            this._wire(el);
            el.style.display = 'flex';
            // Re-trigger entry animation on the shell
            const shell = el.querySelector('.lapis-modal-shell');
            if (shell) {
                shell.style.animation = 'none';
                shell.offsetHeight; // force reflow
                shell.style.animation = '';
            }
            if (!this._stack.includes(id)) this._stack.push(id);
            if (typeof lucide !== 'undefined') lucide.createIcons();
        },

        close(id) {
            const el = document.getElementById(id);
            if (!el) return;
            el.style.display = 'none';
            this._stack = this._stack.filter(i => i !== id);
        },

        closeTop() {
            const top = this._stack[this._stack.length - 1];
            if (top) this.close(top);
        },

        closeAll() {
            [...this._stack].forEach(id => this.close(id));
        },
    };

    // ── Expose ────────────────────────────────────────────────────────────────
    global.LapisNav   = LapisNav;
    global.LapisModal = LapisModal;

})(window);
