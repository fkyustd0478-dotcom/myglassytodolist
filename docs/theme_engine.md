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

## Clearing Custom Background

`clearCustomBg()` in `modules/setting.js` sets both `customBg = ''` and `useCustomBg = false`. The `watch(settings, ...)` in `setting.js` unconditionally syncs `navSettings.customBg = val.customBg`, so the empty string propagates and `_applyTheme` falls back to the active theme image or solid color.

> **Important**: the sync must be unconditional — `if (val.customBg)` would silently swallow the clear operation.
