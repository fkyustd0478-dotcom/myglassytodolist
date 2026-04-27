// core_engine.js — LapisCore standalone module v1.2
// Provides: window.LapisCore
//   .updateGlobalThemeVar(cssValue) — CSS variable style injection (gradient or url)
//   .preloadImage(url)              — GPU bitmap pre-decode via img.decode()
//   .applyTheme(theme, useCustomBg, opts) — hybrid gradient/image double-buffer swap
//   .setActiveOpacity(opacity)      — live custom-bg opacity update
//   .navigate(url) / .Maps(url)     — SPA-style navigation with View Transition
//
// Depends on: nothing (loads before nav.js and Vue)
// Load order: storage.js → core_engine.js → nav.js → lapis_core_ui.js → …
'use strict';

window.LapisCore = (() => {

    // ── Preset gradient map ───────────────────────────────────────────────────
    // All built-in themes use CSS gradients — no image files, no network requests.
    // Keys match the theme identifiers stored in localStorage / navSettings.theme.
    const _themeGradients = new Map([
        ['cherry',       'linear-gradient(135deg, #FFB7B2 0%, #FFDAC1 100%)'],
        ['sky',          'linear-gradient(180deg, #89f7fe 0%, #66a6ff 100%)'],
        ['sunset',       'linear-gradient(180deg, #fc4a1a 0%, #f7971e 50%, #ffd200 100%)'],
        ['sea',          'linear-gradient(180deg, #2a5298 0%, #1e3c72 100%)'],
        ['seaside',      'linear-gradient(180deg, #74ebd5 0%, #acb6e5 100%)'],
        ['forest',       'linear-gradient(135deg, #134E5E 0%, #71B280 100%)'],
        ['night',        'linear-gradient(135deg, #141E30 0%, #243B55 100%)'],
        ['torii',        'linear-gradient(135deg, #1a1a2e 0%, #4a1942 50%, #8b1a1a 100%)'],
        ['mapleavenue',  'linear-gradient(135deg, #8B0000 0%, #FF4500 100%)'],
        ['waterfall',    'linear-gradient(180deg, #1a6b8a 0%, #43b89c 50%, #85d8ce 100%)'],
        ['starrysky',    'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)'],
        ['ferriswheel',  'linear-gradient(135deg, #1a1a2e 0%, #0f3460 50%, #533483 100%)'],
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
    // Injects the background value into a persistent <style> tag as a CSS variable.
    // Gradient strings are passed through as-is; URL strings are wrapped in url().
    // Using a stylesheet (not element.style) ensures the browser treats images
    // as formal CSSOM resources — critical for Base64 rendering in WebView.
    function updateGlobalThemeVar(cssValue) {
        let tag = document.getElementById('lapis-dynamic-theme-css');
        if (!tag) {
            tag = document.createElement('style');
            tag.id = 'lapis-dynamic-theme-css';
            document.head.appendChild(tag);
        }
        let value = 'none';
        if (cssValue) {
            // Gradient strings begin with linear-/radial-/conic-gradient; URLs need url()
            value = /^(linear|radial|conic)-gradient\(/.test(cssValue)
                ? cssValue
                : `url("${cssValue}")`;
        }
        tag.textContent = `:root { --lapis-dynamic-bg: ${value}; }`;
        // Force synchronous CSS sheet parse: reading cssRules flushes the browser's
        // pending CSSOM processing before any subsequent style reads or reflows.
        void (tag.sheet && tag.sheet.cssRules.length);
        // data-theme-ts toggle forces CSS cascade re-evaluation across the tree
        document.documentElement.setAttribute('data-theme-ts', Date.now());
    }

    // ── B. GPU Pre-decode ─────────────────────────────────────────────────────
    // Decodes the image bitmap off-screen so VRAM holds it before transition.
    // onerror resolves immediately on 404/network error — no 3 s wait.
    // clearTimeout ensures the safety timer is cancelled once the image settles.
    function preloadImage(url) {
        return new Promise((resolve) => {
            if (!url) { resolve(); return; }
            const img = new Image();
            let timer;
            const done = () => { clearTimeout(timer); resolve(); };
            img.onload = () => {
                (typeof img.decode === 'function' ? img.decode() : Promise.resolve())
                    .catch(() => {}).then(done);
            };
            img.onerror = done;   // 404 or network error → resolve immediately
            img.src = url;
            timer = setTimeout(done, 3000); // absolute safety net
        });
    }

    // ── C. Html Background Sync ───────────────────────────────────────────────
    // Keeps <html> background aligned with the incoming theme before a View
    // Transition snapshot is captured.  Without this, the cross-fade reveals the
    // previous theme's html background colour between the two transition frames.
    const _darkSet = new Set(['dark', 'forest', 'night', 'torii', 'starrysky', 'ferriswheel']);
    function _syncHtmlBg(theme, hasCustBg) {
        document.documentElement.style.background =
            (!hasCustBg && _darkSet.has(theme)) ? '#0d1117' : '#f0f4ff';
    }

    // ── D. View Transition wrapper ────────────────────────────────────────────
    // Wraps DOM mutations in startViewTransition when available.
    // The update callback MUST be synchronous — async callbacks prevent screenshot
    // capture.  Returns a Promise that resolves once the animation finishes so
    // callers can await it, preventing overlapping concurrent transitions.
    async function _runTransition(syncCallback) {
        if (typeof document.startViewTransition === 'function') {
            let called = false;
            try {
                await document.startViewTransition(() => {
                    called = true;
                    syncCallback();
                }).finished;
            } catch (_) {
                // transition.finished rejected — animation was skipped or interrupted.
                // Only re-apply if callback never ran (e.g. startViewTransition threw
                // before invoking it — extremely rare but possible in degraded states).
                if (!called) syncCallback();
            }
        } else {
            syncCallback();
        }
    }

    // ── E. Theme Application ──────────────────────────────────────────────────
    // opts: { customBg, customBgOpacity, skipAnimation }
    //
    // Three execution paths:
    //   hasCustBg  — custom uploaded image: preload + spinner + GPU repaint hack
    //   gradient   — preset theme gradient: instant, no network, no spinner
    //   solid      — light/dark/system: deactivate bg layers, --bg-main shows
    async function applyTheme(theme, useCustomBg, opts) {
        opts = opts || {};
        const customBg        = opts.customBg        || '';
        const customBgOpacity = opts.customBgOpacity  || 0;
        const skipAnimation   = opts.skipAnimation    || false;

        const hasCustBg     = useCustomBg && customBg;
        const bgCssValue    = hasCustBg
            ? customBg
            : (_themeGradients.get(theme) || '');
        const targetOpacity = hasCustBg ? (1 - customBgOpacity) : 1;

        const nextId  = _otherId(_activeLayerId);
        const current = _bgLayer(_activeLayerId);
        const next    = _bgLayer(nextId);
        if (!next) return;

        // ── Initial paint: set immediately, page still invisible ──────────────
        // Must always leave UI in a visible state — no animation, no spinner.
        if (skipAnimation) {
            if (bgCssValue) {
                updateGlobalThemeVar(bgCssValue);
                next.style.setProperty('--lapis-bg-opacity', targetOpacity);
                next.classList.add('active');
                if (current) current.classList.remove('active');
                _activeLayerId = nextId;
            } else {
                // Solid theme: clear bg image and deactivate ALL layers so
                // #lapis-bg-system's background: var(--bg-main) gradient shows through.
                updateGlobalThemeVar('');
                if (current) current.classList.remove('active');
                next.classList.remove('active');
            }
            return;
        }

        // ── Animated swap ─────────────────────────────────────────────────────
        try {
            if (hasCustBg) {
                // Custom image path — GPU warm-up mandatory: the bitmap must be in VRAM
                // before startViewTransition captures its screenshot.
                _showSpinner();
                await preloadImage(bgCssValue);
                _hideSpinner();
                _syncHtmlBg(theme, true);

                await _runTransition(() => {
                    updateGlobalThemeVar(bgCssValue);
                    // GPU repaint hack: evict old texture, force compositor to pick up
                    // the new --lapis-dynamic-bg value from the updated CSS variable.
                    next.style.backgroundImage = 'none';
                    void next.offsetHeight;
                    next.style.backgroundImage = 'var(--lapis-dynamic-bg)';
                    // Suppress CSS opacity transition so View Transition snapshots the
                    // layer at its FINAL opacity, not at the start of a 0.6 s fade.
                    // Without this, the "after" screenshot captures opacity≈0 and the
                    // cross-fade animates to a transparent layer instead of the image.
                    next.style.transition = 'none';
                    if (current) current.style.transition = 'none';
                    next.style.setProperty('--lapis-bg-opacity', targetOpacity);
                    next.classList.add('active');
                    if (current) current.classList.remove('active');
                    _activeLayerId = nextId;
                });
                // Restore CSS transitions after VT snapshot is committed so future
                // opacity changes (e.g. custom-bg slider) still animate smoothly.
                next.style.transition = '';
                next.style.backgroundImage = '';   // inline override no longer needed
                if (current) current.style.transition = '';

            } else if (bgCssValue) {
                // Preset gradient path — computed by browser immediately, no preload needed.
                _syncHtmlBg(theme, false);
                await _runTransition(() => {
                    updateGlobalThemeVar(bgCssValue);
                    // Repaint shake: briefly show the layer at near-zero opacity to force
                    // the compositor to paint the gradient texture before the VT snapshot.
                    // At opacity:0 the compositor skips painting — this bypasses that.
                    next.style.opacity = '0.01';
                    void next.offsetHeight;
                    next.style.opacity = '';
                    // Suppress CSS opacity transition — same reason as custom image path.
                    next.style.transition = 'none';
                    if (current) current.style.transition = 'none';
                    next.style.setProperty('--lapis-bg-opacity', targetOpacity);
                    next.classList.add('active');
                    if (current) current.classList.remove('active');
                    _activeLayerId = nextId;
                });
                next.style.transition = '';
                if (current) current.style.transition = '';

            } else {
                // Solid theme (light / dark): clear CSS var, show --bg-main gradient.
                _syncHtmlBg(theme, false);
                await _runTransition(() => {
                    updateGlobalThemeVar('');
                    // Suppress transition so VT snapshots both layers at opacity:0
                    // immediately, not mid-fade.
                    next.style.transition = 'none';
                    if (current) current.style.transition = 'none';
                    if (current) current.classList.remove('active');
                    next.classList.remove('active');
                    _activeLayerId = nextId;
                });
                next.style.transition = '';
                if (current) current.style.transition = '';
            }
        } catch (err) {
            // Emergency fallback — guarantee the UI is NEVER left on a blank screen.
            _hideSpinner();
            console.warn('[LapisCore] applyTheme failed, applying instant fallback:', err);
            try {
                updateGlobalThemeVar(bgCssValue || '');
                if (bgCssValue) {
                    next.style.setProperty('--lapis-bg-opacity', targetOpacity);
                    next.classList.add('active');
                    if (current) current.classList.remove('active');
                    _activeLayerId = nextId;
                } else {
                    if (current) current.classList.remove('active');
                    next.classList.remove('active');
                }
            } catch (_) {}
        }
    }

    // ── F. Live Opacity Update ────────────────────────────────────────────────
    // Called by nav.js when the custom-bg opacity slider moves.
    function setActiveOpacity(opacity) {
        const layer = _bgLayer(_activeLayerId);
        if (layer) layer.style.setProperty('--lapis-bg-opacity', opacity);
    }

    // ── G. SPA Navigation ─────────────────────────────────────────────────────
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

    // ── H. Global Link Interception ───────────────────────────────────────────
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
