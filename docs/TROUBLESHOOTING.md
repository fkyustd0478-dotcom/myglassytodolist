# TROUBLESHOOTING.md
> Known issues, debug notes, and resolved error history for the Lapis project.

---

## UI Blocking (Modal Cannot Be Clicked)

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
