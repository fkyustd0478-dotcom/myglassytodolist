# Theme & Background Engine

> **Where it lives**: `js/nav.js` (`_applyTheme`, `_decodeImage`, `_bgLayer`, `_onStorage`)
> **CSS**: `css/shared_theme.css` (`#lapis-bg-system`, `.lapis-bg-layer`)

---

## Architecture: Double-Buffer System

Two static `<div>` layers live **outside** the Vue `#app` element, directly after `<body>`:

```html
<div id="lapis-bg-system">
  <div id="bg-layer-a" class="lapis-bg-layer active"></div>
  <div id="bg-layer-b" class="lapis-bg-layer"></div>
</div>
```

One layer is always active (visible); the other is staged off-screen. On theme change, the inactive layer loads the new image, then CSS opacity transitions it in while the old layer fades out.

**Why outside Vue `#app`**: `[v-cloak]` hides `#app` until Vue mounts. Placing bg layers outside means the background renders instantly — no dependency on JS initialization.

---

## Core Functions (`js/nav.js`)

| Function | Purpose |
|---|---|
| `_bgLayer(id)` | Returns `document.getElementById('bg-layer-' + id)` |
| `_otherId(id)` | Returns `'b'` if `id === 'a'`, else `'a'` |
| `_decodeImage(src)` | Off-screen `img.decode()` — ensures GPU decompression before layer swap; 3 s safety timeout |
| `_applyTheme(theme, useCustomBg)` | Orchestrates the full swap: determine URL → stage inactive layer → decode → toggle `.active` |

### `_applyTheme` Flow

1. Determine `bgUrl`: custom Base64 if `useCustomBg && customBg`, else `./theme/${theme}.png` if image theme, else `''`
2. Compute `targetOpacity = hasCustBg ? (1 - customBgOpacity) : 1`
3. **First apply** (`_firstApply === true`): set layer immediately, no animation (body is still invisible behind `opacity:0`)
4. **Normal path**: stage next layer → `_showSpinner()` → `await _decodeImage(bgUrl)` → set `--lapis-bg-opacity` → add `.active` to next → remove `.active` from current → update `_activeLayerId`
5. **Solid/gradient themes** (`bgUrl === ''`): clear both layers; `#lapis-bg-system { background: var(--bg-main) }` shows through

---

## CSS (`css/shared_theme.css`)

```css
#lapis-bg-system {
    position: fixed; inset: 0; z-index: 0;
    background: var(--bg-main, #0d0d0d);   /* solid-theme fallback */
    pointer-events: none;
}
.lapis-bg-layer {
    position: absolute; inset: 0; opacity: 0;
    transition: opacity 0.6s ease;
    background-size: cover; background-position: center;
    will-change: opacity;
}
.lapis-bg-layer.active { opacity: var(--lapis-bg-opacity, 1); }
```

`--lapis-bg-opacity` is set per-layer by JS before adding `.active`, enabling fractional opacity for the custom-bg dimmer slider without conflicting with the transition system.

---

## Custom Background Storage

| Approach | Problem | Resolution |
|---|---|---|
| IndexedDB + Blob URL | Blob URLs are session-scoped; lost on page reload | Replaced with `FileReader.readAsDataURL()` — Base64 string survives in `localStorage` |
| Large file storage | Base64 can exceed localStorage quota | `_resizeToLimit()` in `modules/setting.js`: iteratively reduces JPEG quality (0.85 → 0.4) then dimensions (×0.75) until ≤ 2 MB |

---

## Cross-Tab Real-Time Sync

`_onStorage` in `nav.js` listens to the `storage` event on `window`:

```javascript
window.addEventListener('storage', (e) => {
    if (e.key !== 'todo_settings') return;
    const s = JSON.parse(e.newValue);
    // theme / useCustomBg changes → Vue watch fires _applyTheme automatically
    // customBg changes require explicit call (Vue only watches theme + useCustomBg)
    if (s.customBg !== navSettings.customBg) {
        navSettings.customBg = s.customBg;
        _applyTheme(resolvedTheme.value, navSettings.useCustomBg);
    }
});
```

**Why explicit call for `customBg`**: The Vue `watch([resolvedTheme, useCustomBg], ...)` only fires when `theme` or `useCustomBg` changes. If the user uploads a new image while `useCustomBg` was already `true`, neither watched value changes, so `_applyTheme` must be called manually.

---

## Reflow Hack (WebView / Capacitor GPU Fix)

### Problem

In WebView / Capacitor environments (and occasionally mobile Safari), setting `backgroundImage` on a layer and immediately triggering a CSS opacity transition can result in a **black or white flash** — the GPU has not yet committed the new texture to the compositor, so it shows a blank buffer for one or two frames before the image appears.

### Fix

After `await _decodeImage(bgUrl)` but before adding `.active`, force a synchronous layout calculation by momentarily setting `display: none` and reading `offsetHeight`:

```javascript
// Force GPU pipeline flush
next.style.display = 'none';
void next.offsetHeight;   // reading layout property → synchronous reflow
next.style.display = 'block';

// Now safe to start the opacity transition
next.style.setProperty('--lapis-bg-opacity', targetOpacity);
next.classList.add('active');
```

Reading `offsetHeight` (or any layout property like `getBoundingClientRect()`) forces the browser to perform a **synchronous layout pass**, which commits the current render tree — including the new `backgroundImage` — to the GPU compositor before the transition begins. This eliminates the blank-frame artifact.

### Inline Style Overrides

To prevent stale CSS cascade values from overriding the background sizing (another WebView gotcha), these properties are set explicitly via inline styles on every swap:

```javascript
next.style.backgroundSize     = 'cover';
next.style.backgroundPosition = 'center';
next.style.backgroundRepeat   = 'no-repeat';
```

### Debounce (GPU Decoder Thrashing Prevention)

Rapid theme clicks can queue multiple `_decodeImage` calls simultaneously, saturating the GPU decoder. A 100 ms debounce on the Vue watch prevents this:

```javascript
watch([resolvedTheme, () => navSettings.useCustomBg], ([theme, useCustomBg]) => {
    if (_firstApply) { _applyTheme(theme, useCustomBg); return; }  // no debounce on init
    clearTimeout(_applyTimer);
    _applyTimer = setTimeout(() => _applyTheme(theme, useCustomBg), 100);
}, { immediate: true });
```

The first apply bypasses debounce because the page is still invisible (body `opacity: 0`).

---

## `window.LapisNav._applyTheme` (Same-Tab Direct Call)

The Vue watch in `nav.js` only triggers on `[resolvedTheme, useCustomBg]`. When the user uploads a new image while `useCustomBg` is already `true`, neither watched value changes — the background would not update until refresh.

Fix: expose `_applyTheme` on the global `LapisNav` object so `setting.js` can call it directly:

```javascript
// nav.js — inside useNav()
window.LapisNav = window.LapisNav || {};
window.LapisNav._applyTheme = () => _applyTheme(resolvedTheme.value, navSettings.useCustomBg);

// setting.js — in watch(settings, ...)
if (val.customBg !== prevCustomBg && window.LapisNav && window.LapisNav._applyTheme) {
    window.LapisNav._applyTheme();
}
```

---

## Clearing Custom Background

`clearCustomBg()` in `modules/setting.js` sets both `customBg = ''` and `useCustomBg = false`. The `watch(settings, ...)` in `setting.js` unconditionally syncs `navSettings.customBg = val.customBg`, so the empty string propagates and `_applyTheme` falls back to the active theme image or solid color.

> **Important**: the sync must be unconditional — `if (val.customBg)` would silently swallow the clear operation.
