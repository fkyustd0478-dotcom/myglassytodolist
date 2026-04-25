# UI Interaction & Theme Stability Hardening

_Session: Lapis System — UI Interaction & Theme Stability Hardening_
_Date: 2026-04-25_

---

## 1. Enhanced Visual Feedback for Shift Tag Pills

**Files:** `css/shift_style.css`

### Problem
`.tag-pill.active` only applied a border + scale transform — insufficient contrast to indicate which Salary or Shift tag is currently selected.

### Solution
- Added `@keyframes tagPillPulse`: an expanding ring animation using `box-shadow` that pulses outward and fades, repeating every 1.8s.
- Updated `.tag-pill.active`:
  - `animation: tagPillPulse 1.8s ease-out infinite` — continuous pulse ring
  - `color: #ffffff !important` + `text-shadow` — forced white text over the filled tag color (background fill already done via Vue `:style` binding `tag.color`)
  - `z-index: 7999` — respects the z-8000 modal boundary
  - Slightly larger scale (`1.06`) and -2px lift

Both "Salary" and "Shift" tag pills share `.tag-pill.active`, so both categories get the same treatment. The unique `tag.color` provides per-category differentiation via Vue's dynamic `:style`.

---

## 2. Setting Page "White-Screen" Fix

**Files:** `js/nav.js`, `modules/setting.js`

### Root Cause
`setting.js`'s `selectTheme` function was performing **two independent bg-layer transitions** simultaneously:

1. `selectTheme` manually faded out `.bg-layer`, preloaded the image, updated `document.body.className`, then faded `.bg-layer` back in.
2. When `settings.value.theme = theme` was set (step 4), Vue's `watch(settings, ...)` fired, updating `navSettings.theme`, which triggered `nav.js`'s `_applyTheme` — which also faded `.bg-layer` out, switched body class, and faded back in.

These two transitions **interrupted each other**: nav.js's fade-out reset the opacity mid-way through setting.js's fade-in, producing a white/blank frame that persisted until the next repaint (i.e., only resolved by manual refresh).

### Fix: Single Source of Truth

**`modules/setting.js` — `selectTheme` simplified:**
```js
const selectTheme = (theme) => {
    themeDropdownOpen.value    = false;
    settings.value.useCustomBg = false;
    settings.value.theme       = theme;
};
```
All DOM animation removed. The existing `watch(settings, val => { navSettings.theme = val.theme; })` chain already triggers `nav.js`'s `_applyTheme`, which is the single authoritative handler.

### Enhancement: Flash Guard + `img.decode()`

**`js/nav.js` — `_applyTheme` rewritten:**

1. **Flash Guard** (`#lapis-flash-guard`): A lazily-created fixed overlay (`position:fixed; inset:0; backdrop-filter:blur(18px); z-index:9998`) fades in at the start of any transition, hiding the bg-layer-hidden window from the user. Fades out after the new bg-layer has begun fading in. Duration: ~18ms per direction.

2. **`img.decode()`**: `_preload()` now chains `img.decode()` after `img.onload`. This confirms the image is GPU-decoded and ready for paint before `_applyTheme` proceeds to show the bg-layer, preventing a "loaded-but-not-painted" flash.

3. **Sequence:**
   ```
   guard.opacity → 1           (cover artifacts)
   bgLayer.opacity → 0         (hide old theme)
   await _preload + img.decode  (new image GPU-ready)
   document.body.className = cls (CSS vars update)
   double-RAF                   (Vue re-renders bg-layer class)
   bgLayer.opacity → 1          (reveal new theme)
   guard.opacity → 0            (remove overlay)
   ```

**No `window.location.reload()` is used.** The fix is a seamless SPA transition.

### Cold Load Persistence
The anti-flash inline `<script>` in every HTML `<head>` reads `localStorage` and applies `document.documentElement.className` synchronously before CSS renders, so the correct theme is always applied on cold load without a flash. `StorageProvider.saveCommonSettings()` (called via the settings deep watch) persists theme changes for subsequent loads.

---

## 3. Global Scrollbar Consistency via CSS Variable

**Files:** `css/lapis_shared_style.css`, `css/workout_style.css`, `setting.html`, `shift.html`, `todo.html`, `index.html`

### Change
Added `--nav-height: 120px` to `:root` in `lapis_shared_style.css` alongside the existing z-index tokens.

All scroll containers' `padding-bottom` now reference this variable:

| File | Before | After |
|------|--------|-------|
| `css/workout_style.css` | `padding: 0 24px 120px` | `padding: 0 24px var(--nav-height)` |
| `setting.html` | `padding-bottom:120px` | `padding-bottom:var(--nav-height)` |
| `shift.html` | Tailwind `pb-[120px]` | `style="padding-bottom:var(--nav-height)"` |
| `todo.html` | Tailwind `pb-[120px]` | `style="padding-bottom:var(--nav-height)"` |
| `index.html` | `padding:0 20px 120px` | `padding:0 20px var(--nav-height)` |

Any future page or component that needs bottom padding only needs `padding-bottom: var(--nav-height)`. If the bottom nav height changes, one token update propagates everywhere.

---

## Z-Index Reference (unchanged)

| Layer | Value |
|-------|-------|
| `--z-nav` | 7000 |
| Tag pill active | 7999 |
| `--z-modal-lv2-backdrop` | 8000 |
| `--z-modal-lv2-content` | 8001 |
| `--z-modal-lv3-backdrop` | 9000 |
| `--z-modal-lv3-content` | 9001 |
| Flash guard (`#lapis-flash-guard`) | 9998 |
| `--z-top-overlay` | 10000 |
| Top capsule nav | 10001 |
| Nav dropdown | 10002 |
