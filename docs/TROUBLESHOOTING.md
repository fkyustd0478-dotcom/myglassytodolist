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

## Navigation Elements Misplaced (Top vs Bottom) ✅ RESOLVED 2026-04-24

**Symptom:** Tab controls for workout/todo/shift appeared at the top of the page instead of the established bottom navigation pattern.

**Root Cause:** During the hub-model refactor, page-internal navbars were moved to top strips (`.workout-top-tabs`, `.todo-view-tabs`, `.shift-action-bar`), breaking the consistent UX pattern.

**Fix:** Restored all page-specific bottom navs to `<nav class="bottom-nav glass">` elements at the correct position in each page's DOM. Each page now has its own dedicated bottom nav:
- `index.html`: Home / Quick Add (+) / Stats
- `todo.html`: Active / Completed / Bin / Add (+)
- `shift.html`: Today's Tasks / Salary / Shifts / Label Settings
- `workout.html`: Workout / Exercises / Records / Add (+)
