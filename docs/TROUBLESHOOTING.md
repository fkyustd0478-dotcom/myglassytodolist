# TROUBLESHOOTING.md
> Known issues, debug notes, and resolved error history for the Lapis project.

---

## Black Screen on Load ✅ RESOLVED 2026-04-26

**Symptom:** Page loads but stays completely black / invisible. No UI is shown.

**Root Cause — opacity cloak never lifted:** Every HTML page starts with `body { opacity: 0 }`. `nav.js` adds the class `lapis-ready` (which sets `opacity: 1`) only after the initial theme image pre-decode completes. If anything in that async chain throws an uncaught exception, `lapis-ready` is never added and the body stays invisible.

**Root Cause — invalid localStorage theme:** A theme string that is not in the valid set (e.g. a corrupted value) was loaded and matched no CSS rule, leaving the body with `--bg-main` unset (defaults to `#121212`). For dark image themes the solid fallback colour `#0d1117` is near-black — identical to a black screen.

**Root Cause — concurrent overlapping transitions:** Rapid theme switching launched multiple concurrent `_applyTheme` async calls. The first call faded `primary.opacity` to `0`; the second call ran before the first restored it. If an error interrupted the second call's recovery path, primary was left at `opacity: 0`.

**Fix (nav.js — all three causes resolved):**

1. **`try-finally` lapis-ready gate** — `lapis-ready` is always added regardless of preload success/failure:
```javascript
try {
    await _preload(_themeUrl(activeTheme));
} catch (_) {}
document.body.classList.add('lapis-ready'); // always executes
```

2. **`try-catch` in `_applyTheme`** with emergency opacity recovery:
```javascript
} catch (err) {
    console.warn('[LapisNav] _applyTheme error, recovering:', err);
    _hideSpinner();
    document.body.className = cls;                     // correct body class applied
    if (primary) { primary.style.opacity = '1'; ... }  // opacity ALWAYS restored
    if (_bgSecondary) _bgSecondary.style.opacity = '0';
}
```

3. **Theme validation at init** — invalid saved theme is reset to `'light'` before any rendering:
```javascript
if (_savedSettings.theme && !_validThemes.has(_savedSettings.theme)) {
    _savedSettings.theme = 'light';
}
```

4. **100 ms debounce** on the Vue theme watch prevents concurrent overlapping transitions.

**Debug tip:** Open DevTools → Console and look for `[LapisNav] theme URL →` logs. This confirms the exact URL being requested. A 404 in the Network tab for that URL means the `theme/` directory is missing or pathing is wrong.

---



**Cause:** A lower z-index element has `position: relative/absolute` without explicit z-index, creating an unintended stacking context that traps the modal.

**Fix:**
1. Identify the blocking element via DevTools → Layers panel.
2. Ensure the blocking container does NOT set `transform`, `opacity < 1`, `filter`, or `will-change` without also setting a z-index that respects the hierarchy.
3. Use `--z-modal-lv3-content` (9001) for anything that must always be on top of LV2 modals.

---

## Scroll-Sync / Stuck Picker

**Cause:** `LapisDatePicker` / `LapisTimePicker` use `scrollTop` animation; if the picker container gets `overflow: hidden` from a parent, wheels freeze.

**Fix:** Ensure the picker's mount container has `overflow: visible` or `overflow: auto` with a fixed height. Never nest a picker inside a CSS `transform` ancestor.

> `ITEM_H = 44px` is hardcoded in `lapis_picker.js` — never change `.lapis-picker-item` height without updating that constant.

---

## Theme Flash on Load

**Cause:** Vue hydration applies body class after paint, causing a brief flash of the wrong background colour.

**Fix:** The anti-flash inline `<script>` in `<head>` applies `className='theme-X'` to `<html>` before the first paint. Do not remove it. Every new HTML page must include this block verbatim.

```html
<script>!function(){try{
  var d=JSON.parse(localStorage.getItem('todo_settings')||'{}'),t=d.theme||'light';
  if(t==='system')t=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
  document.documentElement.className='theme-'+t;
  var dk=['dark','forest','night','torii','starrysky','ferriswheel'];
  document.documentElement.style.background=dk.indexOf(t)>=0?'#0d1117':'#f0f4ff';
}catch(e){}}();</script>
```

---

## Custom Background Lost After Reload

**Cause:** Object URLs (`URL.createObjectURL()`) are session-scoped and invalidated on page reload.

**Fix:** `nav.js` re-fetches the blob from IndexedDB on every page load via `ImageDB.getBlob('custom-bg')` and calls `URL.createObjectURL()` again. No action needed — this is working as designed.

---

## Stacking Context Created by Glassmorphism

**Cause:** `backdrop-filter` always creates a new stacking context in CSS.

**Fix:** Any element with `.glass` will create its own stacking context. Do not rely on z-index inheritance through a `.glass` ancestor — set z-index explicitly on the `.glass` element itself.

---

## LapisNav Not Rendered

**Cause:** `LapisNav.inject()` is called before the DOM is ready.

**Fix:** Call `LapisNav.inject()` inside `onMounted()` (Vue) or a `DOMContentLoaded` listener.

---

## workout.html Vue Variables Not Interpolated ✅ RESOLVED 2026-04-24

**Symptom:** `{{ toastMsg }}`, `{{ t.date }}` and all other `{{ }}` bindings display as raw mustache text. Page appears unstyled/broken.

**Root Cause:** `workout.html` had `<script src="./js/workout_data.js">` etc., but all four workout module files (`workout_data.js`, `workout_metrics.js`, `workout_library_ui.js`, `workout.js`) live in `./modules/`, not `./js/`. Vue mounted with undefined globals (`_wT`, `useWorkoutLibrary`, `useWorkoutMetrics`), throwing a JS error that halted the entire app setup.

**Fix:** Changed all four `<script src>` paths from `./js/` to `./modules/` in `workout.html`.

**Verification:** DevTools → Console should show zero "is not defined" errors. All `{{ }}` bindings resolve on load.

**Prevention Rule:** When creating workout sub-modules (`_data`, `_metrics`, `_library_ui`), always place them in the **same directory** as the orchestrating module (`modules/`). Never mix `js/` (shared utilities) with `modules/` (page-specific logic).

---

## Theme Image 404 — CSS `url()` Relative Path & GitHub Pages Sub-directory ✅ RESOLVED 2026-04-25 / 2026-04-26

**Symptom A — CSS file resolution:** Browser shows `GET /css/theme/cherry.png 404`.
**Root Cause A:** `url('./theme/cherry.png')` inside a CSS file (e.g. `css/shared_theme.css`) resolves relative to the **CSS file's location**. From `css/shared_theme.css`, `./theme/` maps to `css/theme/` — which does not exist.

**Symptom B — GitHub Pages sub-directory 404:** Hosted at `https://user.github.io/repo-name/`. Browser shows `GET /theme/cherry.png 404` (missing `repo-name` segment).
**Root Cause B:** CSS custom property `url()` values may be resolved by the browser at the point the `var()` is **consumed** (i.e. in the CSS file that contains the `background-image: var(--x)` rule), not where the property was defined. If the variable is defined in an injected `<style>` tag but consumed in `css/shared_theme.css`, some browsers resolve the URL relative to `css/shared_theme.css`. A root-relative path like `/theme/cherry.png` skips the GitHub Pages repository sub-directory entirely.

**Fix (both symptoms):** Use `document.baseURI` to compute an **absolute URL** in JavaScript before the path ever enters any CSS context:
```javascript
const _docBase = (() => {
    const b = document.baseURI || location.href;
    return b.slice(0, b.lastIndexOf('/') + 1);
})();
const _themeUrl = (name) => _docBase + 'theme/' + name + '.png';
// → 'https://user.github.io/repo-name/theme/cherry.png'  (unambiguous)
```
Absolute URLs contain the full origin + path and are never re-resolved against any CSS file's location.

**Ghost 404 Guard:** Never pass an empty string to `new Image().src` or to any CSS `url()`. Guard preload calls:
```javascript
function _preload(src) {
    if (!src) return Promise.resolve(); // prevents url('') spurious request
    ...
}
```

**Prevention Rules:**
1. Never write `url('./theme/X.png')` inside a CSS file — use paths relative to that CSS file (`../theme/X.png`) or absolute URLs.
2. For JS-driven dynamic paths, compute an absolute URL via `document.baseURI` before injecting into any CSS context.
3. Never use root-relative paths (`/theme/X.png`) on GitHub Pages — they omit the repository sub-directory name.

---

## Navigation Elements Misplaced (Top vs Bottom) ✅ RESOLVED 2026-04-24

**Symptom:** Tab controls for workout/todo/shift appeared at the top of the page instead of the established bottom navigation pattern.

**Root Cause:** During the hub-model refactor, page-internal navbars were moved to top strips (`.workout-top-tabs`, `.todo-view-tabs`, `.shift-action-bar`), breaking the consistent UX pattern.

**Fix:** Restored all page-specific bottom navs to `<nav class="bottom-nav glass">` elements at the correct position in each page's DOM. Each page now has its own dedicated bottom nav:
- `index.html`: Home / Quick Add (+) / Stats
- `todo.html`: Active / Completed / Bin / Add (+)
- `shift.html`: Today's Tasks / Salary / Shifts / Label Settings
- `workout.html`: Workout / Exercises / Records / Add (+)

---

## Theme Switch Results in Black/White Screen (Opacity Loss) ✅ RESOLVED 2026-04-27

**Symptom:** After switching any theme type (gradient, light/dark, or custom image) via `LapisCore.applyTheme()`, the screen turns completely black or white. No console errors. Manual F5 restores normal display.

**Root Cause — `className` assignment strips `lapis-ready`:**

Every HTML page starts with `body { opacity: 0 }` and reveals itself by adding `lapis-ready` in `onMounted`:

```css
body              { opacity: 0; }
body.lapis-ready  { opacity: 1; }
```

The previous `_applyTheme` in `nav.js` used a direct assignment:

```javascript
document.body.className = 'theme-' + theme;  // ← replaces the entire class string
```

This silently removed `lapis-ready` from the body, returning it to `opacity: 0` on every theme switch.

**Why it appeared to work briefly (the View Transition mask):**

View Transition pseudo-elements (`::view-transition-old(root)`, `::view-transition-new(root)`) are composited above the page content. While the cross-fade animation played, these pseudo-elements showed the correct theme, masking the invisible (`opacity: 0`) DOM underneath. Once the animation ended and the pseudo-elements were removed, the actual body (now without `lapis-ready`) was revealed — all white or all black depending on the theme's `--bg-main` fallback colour.

This is why F5 fixed it: a fresh load re-ran `onMounted`, which re-added `lapis-ready`.

**Fix (`js/nav.js` — `_applyTheme`):**

Replace the destructive `className =` assignment with `classList` operations that only touch theme-related classes, leaving `lapis-ready` and any other classes intact:

```javascript
// Before (bug): wipes all classes including lapis-ready
document.body.className = 'theme-' + theme + (useCustomBg ? ' using-custom-bg' : '');

// After (fix): only swap theme-* and using-custom-bg; preserve everything else
const keep = Array.from(document.body.classList)
    .filter(c => !c.startsWith('theme-') && c !== 'using-custom-bg');
document.body.className = [
    'theme-' + theme,
    ...(useCustomBg ? ['using-custom-bg'] : []),
    ...keep,
].join(' ');
```

**Prevention rule:** Never use `element.className =` to set a subset of classes on elements that may have framework-managed or lifecycle-managed classes. Use `classList.add` / `classList.remove` or a filter-and-rebuild approach so unrelated classes are preserved.
