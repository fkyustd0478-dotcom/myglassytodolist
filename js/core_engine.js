// core_engine.js — LapisCore standalone module v1.0
// Provides: window.LapisCore
//   .updateGlobalThemeVar(url)  — CSS variable style injection
//   .preloadImage(url)          — GPU bitmap pre-decode via img.decode()
//   .applyTheme(theme, useCustomBg, opts) — double-buffer theme swap
//   .setActiveOpacity(opacity)  — live custom-bg opacity update
//   .navigate(url) / .Maps(url) — SPA-style navigation with View Transition
//
// Depends on: nothing (loads before nav.js and Vue)
// Load order: storage.js → core_engine.js → nav.js → lapis_core_ui.js → …
'use strict';

window.LapisCore = (() => {

    // ── Image theme set ───────────────────────────────────────────────────────
    const _imgThemes = new Set([
        'cherry', 'sky', 'sunset', 'sea', 'seaside', 'forest', 'night', 'torii',
        'mapleavenue', 'waterfall', 'starrysky', 'ferriswheel',
    ]);

    // ── Double-buffer state ───────────────────────────────────────────────────
    let _activeLayerId = 'a';
    function _bgLayer(id) { return document.getElementById('bg-layer-' + id); }
    function _otherId(id) { return id === 'a' ? 'b' : 'a'; }

    // ── Spinner ───────────────────────────────────────────────────────────────
    let _spinner = null;
    function _showSpinner() {
        if (!_spinner) {
            _spinner = document.createElement('div');
            _spinner.id = 'lapis-theme-spinner';
            document.body.appendChild(_spinner);
        }
        _spinner.style.opacity = '1';
    }
    function _hideSpinner() { if (_spinner) _spinner.style.opacity = '0'; }

    // ── A. Style Invalidator ──────────────────────────────────────────────────
    // Injects the background URL into a persistent <style> tag as a CSS variable.
    // Using a stylesheet (not element.style) ensures the browser treats the image
    // as a formal CSSOM resource — critical for Base64 rendering in WebView.
    function updateGlobalThemeVar(url) {
        let tag = document.getElementById('lapis-dynamic-theme-css');
        if (!tag) {
            tag = document.createElement('style');
            tag.id = 'lapis-dynamic-theme-css';
            document.head.appendChild(tag);
        }
        tag.textContent = url
            ? `:root { --lapis-dynamic-bg: url("${url}"); }`
            : ':root { --lapis-dynamic-bg: none; }';
        // data-theme-ts toggle forces CSS cascade re-evaluation across the tree
        document.documentElement.setAttribute('data-theme-ts', Date.now());
    }

    // ── B. GPU Pre-decode ─────────────────────────────────────────────────────
    // Decodes the image bitmap off-screen so VRAM holds it before transition.
    function preloadImage(url) {
        return new Promise((resolve) => {
            if (!url) { resolve(); return; }
            const img = new Image();
            img.onload = () => {
                (typeof img.decode === 'function' ? img.decode() : Promise.resolve())
                    .catch(() => {}).then(resolve);
            };
            img.onerror = resolve;
            img.src = url;
            setTimeout(resolve, 3000); // safety timeout
        });
    }

    // ── C. View Transition wrapper ────────────────────────────────────────────
    // Wraps DOM mutations in startViewTransition when available.
    // The callback MUST be synchronous — async callbacks prevent screenshot capture.
    function _runTransition(syncCallback) {
        if (typeof document.startViewTransition === 'function') {
            document.startViewTransition(syncCallback);
        } else {
            syncCallback();
        }
    }

    // ── D. Theme Application ──────────────────────────────────────────────────
    // opts: { customBg, customBgOpacity, skipAnimation }
    async function applyTheme(theme, useCustomBg, opts) {
        opts = opts || {};
        const customBg         = opts.customBg         || '';
        const customBgOpacity  = opts.customBgOpacity  || 0;
        const skipAnimation    = opts.skipAnimation    || false;

        const hasCustBg     = useCustomBg && customBg;
        const bgUrl         = hasCustBg
            ? customBg
            : (_imgThemes.has(theme) ? `../theme/${theme}.png` : '');
        const targetOpacity = hasCustBg ? (1 - customBgOpacity) : 1;

        const nextId  = _otherId(_activeLayerId);
        const current = _bgLayer(_activeLayerId);
        const next    = _bgLayer(nextId);
        if (!next) return;

        // ── Initial paint: set immediately, page still invisible ──────────────
        if (skipAnimation) {
            if (bgUrl) {
                updateGlobalThemeVar(bgUrl);
                next.style.setProperty('--lapis-bg-opacity', targetOpacity);
                next.classList.add('active');
                if (current) current.classList.remove('active');
                _activeLayerId = nextId;
            } else {
                updateGlobalThemeVar('');
            }
            return;
        }

        // ── Animated swap ─────────────────────────────────────────────────────
        try {
            if (bgUrl) {
                // 1. Pre-decode bitmap into VRAM before touching the DOM
                _showSpinner();
                await preloadImage(bgUrl);
                _hideSpinner();

                // 2. startViewTransition captures before-state; callback updates DOM
                _runTransition(() => {
                    next.classList.remove('active');
                    next.style.removeProperty('--lapis-bg-opacity');

                    // 3. Inject URL via CSSOM (avoids WebView inline-style rendering bugs)
                    updateGlobalThemeVar(bgUrl);

                    // 4. Force GPU pipeline flush — synchronous reflow commits new pixels
                    next.style.display = 'none';
                    void next.offsetHeight;   // triggers synchronous layout
                    next.style.display = 'block';

                    // 5. Swap layers — CSS opacity transition plays from here
                    next.style.setProperty('--lapis-bg-opacity', targetOpacity);
                    next.classList.add('active');
                    if (current) current.classList.remove('active');
                    _activeLayerId = nextId;
                });

            } else {
                // Solid theme: clear CSS var, deactivate all layers
                _runTransition(() => {
                    updateGlobalThemeVar('');
                    if (current) current.classList.remove('active');
                    if (next)    next.classList.remove('active');
                    _activeLayerId = nextId;
                });
            }
        } catch (err) {
            _hideSpinner();
            console.warn('[LapisCore] applyTheme failed:', err);
        }
    }

    // ── E. Live Opacity Update ────────────────────────────────────────────────
    // Called by nav.js when the custom-bg opacity slider moves.
    function setActiveOpacity(opacity) {
        const layer = _bgLayer(_activeLayerId);
        if (layer) layer.style.setProperty('--lapis-bg-opacity', opacity);
    }

    // ── F. SPA Navigation ─────────────────────────────────────────────────────
    // Uses View Transition API for a smooth cross-page animation; falls back to
    // a plain location.href if the API is unavailable. Full fetch-based SPA
    // injection is planned for a future phase once Vue app lifecycle hooks are
    // standardised across all pages.
    function navigate(url) {
        if (!url || url.charAt(0) === '#') return;
        if (typeof document.startViewTransition === 'function') {
            document.startViewTransition(() => { window.location.href = url; });
        } else {
            window.location.href = url;
        }
    }

    // ── G. Global Link Interception ───────────────────────────────────────────
    // Intercepts same-origin <a> clicks and routes them through navigate()
    // to get the View Transition animation on every page change.
    function _initLinkInterception() {
        document.addEventListener('click', (e) => {
            const anchor = e.target.closest('a[href]');
            if (!anchor) return;
            const href = anchor.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('http') ||
                href.startsWith('mailto') || href.startsWith('tel') ||
                anchor.target === '_blank') return;
            e.preventDefault();
            navigate(href);
        });
    }

    // Initialise link interception once DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _initLinkInterception);
    } else {
        _initLinkInterception();
    }

    return {
        updateGlobalThemeVar,
        preloadImage,
        applyTheme,
        setActiveOpacity,
        navigate,
        Maps: navigate,          // alias per spec
    };

})();
