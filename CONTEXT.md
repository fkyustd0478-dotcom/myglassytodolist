# LAPIS PROJECT — CONTEXT.md
> Single Source of Truth for LLM-assisted development.
> Last audited: 2026-04-24

---

## 1. ARCHITECTURE OVERVIEW

### Tech Stack
| Layer | Technology |
|---|---|
| UI Framework | Vue 3 (CDN Global Build, Options API) |
| Styling | Tailwind CSS (CDN) + Custom CSS Variables |
| Icons | Lucide (CDN) |
| Drag-Sort | SortableJS (todo.html only) |
| Storage | localStorage + IndexedDB (image blobs) |
| Deployment | Static PWA (no build step) |

### File Responsibilities
```
myglassytodolist/
├── index.html          → Home dashboard (portal cards to modules)
├── todo.html           → Task management (lists, categories, recurring)
├── workout.html        → Fitness tracker (4-tab: exercises/workout/records/settings)
├── shift.html          → Shift scheduling (calendar grid, job earnings)
├── stats.html          → Workout read-only stats snapshot
├── setting.html        → App settings (theme, calendar, user profile)
│
├── css/
│   ├── shared_theme.css       → Global CSS vars: --glass-bg, --primary, --text-*
│   ├── lapis_shared_style.css → Z-index scale, .glass class, modal shells
│   ├── effects.css            → Particle animation keyframes
│   ├── style.css              → index/todo/stats shared layout
│   ├── shift_style.css        → Calendar grid, tag pills (shift + setting pages)
│   └── workout_style.css      → Workout-specific layout
│
├── js/
│   ├── nav.js              → useNav() composable: theme, glass styles, resolvedTheme
│   ├── storage.js          → StorageProvider (localStorage CRUD) + ImageDB (IndexedDB)
│   ├── effects.js          → ParticleEngine: setEffect('none'|'cherry'|'rain'|'snow')
│   ├── lapis_core_ui.js    → LapisNav (top+bottom bar injection), LapisModal (open/close/ESC)
│   ├── lapis_global_nav.js → Global quick-action nav bar + weight quick-input sheet
│   ├── lapis_picker.js     → LapisDatePicker + LapisTimePicker (drum-roll wheel)
│   ├── lapis_confirm.js    → Vue confirm dialog (LV3)
│   └── holidays.js         → Holiday data for shift calendar
│
└── modules/
    ├── index.js    → Home app (read-only, no localStorage writes)
    ├── todo.js     → Task app (full CRUD)
    ├── shift.js    → Shift app (calendar CRUD + earnings calc)
    ├── workout.js  → Workout app (sessions, library, metrics)
    ├── stats.js    → Stats app (read-only)
    └── setting.js  → Settings app (theme, lang, custom bg)
```

### Script Load Order (per page)
All pages: `effects.js` → `storage.js` → `nav.js` → `lapis_core_ui.js` (if needed) → `lapis_picker.js` → `lapis_confirm.js` → `lapis_global_nav.js` (if needed) → `modules/[page].js`

### Vue Mount Points
All pages mount a single Vue app on `<div id="app">`. No `<Teleport>` is used — modals render inline via `v-show`/`v-if`.

---

## 2. GLOBAL UI STANDARDS

### Z-Index Hierarchy (defined in `lapis_shared_style.css`)

```css
:root {
  --z-nav:                 7000;  /* Bottom nav, top nav, list-tabs, tag-pills */
  --z-modal-lv2-backdrop:  8000;  /* Primary modal overlay */
  --z-modal-lv2-content:   8001;  /* Primary modal shell (task editor, session log) */
  --z-modal-lv3-backdrop:  9000;  /* Secondary modal overlay */
  --z-modal-lv3-content:   9001;  /* Secondary modal (picker, confirm, PR history) */
  --z-top-overlay:         10000; /* Toasts, error reporter, global dropdowns */
}
```

> **Rule:** Never hardcode z-index integers in JS or inline styles. Always use these CSS variables.
> **Rule:** LV3 modals MUST always appear above LV2 modals (pickers/confirm are LV3).

### Stacking Layers Reference
| Z-Range | Layer | Examples |
|---|---|---|
| 0–1000 | Background & particles | bg-layer, custom-bg-layer, ParticleEngine canvas |
| 7000 | Navigation | Bottom nav, top capsule nav, list-tabs, tag-pills |
| 8000–8001 | LV2 Modal | Task editor, shift tags modal, workout session log |
| 9000–9001 | LV3 Modal | Date/time picker, LapisConfirm, PR history |
| 10000+ | Top overlay | Toast, #error-reporter, nav dropdowns |

### Glassmorphism Classes

**`.glass`** — primary surface style (defined in `lapis_shared_style.css`):
```css
.glass {
  backdrop-filter: blur(12px) brightness(0.85);
  -webkit-backdrop-filter: blur(12px) brightness(0.85);
  background: var(--glass-bg);              /* rgba(255,255,255,0.2) default */
  border: 2.5px solid rgba(255,255,255,0.9);
  box-shadow: 0 8px 32px 0 rgba(0,0,0,0.15);
}
/* Light themes override → frosted white */
body.theme-light .glass, body.theme-cherry .glass { ... }
/* Dark themes keep high-contrast borders */
```

| Class | Blur | Usage |
|---|---|---|
| `.glass` | 12px | Base component surface |
| `.lapis-modal-shell` | 28px | Large modal dialogs |
| `.lapis-bottom-nav` | 22px + saturate(1.4) | Navigation bar |
| `.lapis-picker-wrap` | N/A (rgba bg) | Date/time picker columns |
| `.task-item` | 16px | Task list cards |

### Theme System

**Dark themes** (dark glass, light text): `dark`, `forest`, `night`, `torii`, `starrysky`, `ferriswheel`
**Light themes** (frosted white glass, dark text): `light`, `cherry`, `sky`, `seaside`, `sunset`, `mapleavenue`, `waterfall`

Theme is applied by `nav.js → _applyTheme()` which switches `document.body.className`.

**Anti-flash inline script** is required in `<head>` of every HTML page:
```html
<script>!function(){
  try {
    var d = JSON.parse(localStorage.getItem('todo_settings')||'{}');
    var t = d.theme||'light';
    if(t==='system') t=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
    document.documentElement.className='theme-'+t;
    var dk=['dark','forest','night','torii','starrysky','ferriswheel'];
    document.documentElement.style.background=dk.indexOf(t)>=0?'#0d1117':'#f0f4ff';
  }catch(e){}
}();</script>
```

### CSS Custom Properties (Global)

```css
:root {
  /* Glassmorphism surface */
  --glass-bg:        rgba(255, 255, 255, 0.2);
  --glass-border:    rgba(255, 255, 255, 0.1);

  /* Brand */
  --primary:         #3b82f6;

  /* Typography */
  --text-primary:    #ffffff;
  --text-secondary:  rgba(255, 255, 255, 0.7);
  --text-shadow:     0 1px 3px rgba(0, 0, 0, 0.85);

  /* Aliases */
  --glass-text-primary: var(--text-primary);
  --glass-text-muted:   var(--text-secondary);
}
```

---

## 3. DATA SCHEMA

### localStorage Keys
| Key | Owner | Type |
|---|---|---|
| `todo_settings` | nav.js / setting.js | Object (settings) |
| `todo_data` | todo.js | Object `{todos[], lists[]}` |
| `glassy_shift_data` | shift.js | Object keyed by `YYYY-MM-DD` |
| `glassy_shift_settings` | shift.js | Object (tags, jobs, payday) |
| `lapis_workout` | workout.js | Object `{logs[]}` |
| `lapis_workout_metrics` | workout.js | Object `{weights[], personalBests[]}` |
| `lapis_workout_library` | workout.js | Array of exercise objects |

### `todo_settings`
```jsonc
{
  "theme": "light",                // "system" | theme-name
  "lang": "zh",                    // "en" | "zh"
  "notificationsEnabled": false,
  "effect": "none",                // "none" | "cherry" | "rain" | "snow"
  "useCustomBg": false,
  "customBg": "",                  // object URL from IndexedDB blob
  "customBgOpacity": 0.5,
  "calendarInfoEnabled": true,
  "showHolidayTags": true,
  "showLunarDates": true
}
```

### `todo_data`
```jsonc
{
  "todos": [{
    "id": "uuid-string",
    "text": "Task content",
    "category": "urgent",          // "urgent"|"important"|"normal"|"daily"|"memo"
    "recurring": "none",           // "none"|"daily"|"weekly"|"monthly"
    "dueDate": "2026-04-24T09:00:00.000Z",
    "alertMinutes": 0,
    "completed": false,
    "isDeleted": false,
    "listId": "default",
    "createdAt": 1745000000000
  }],
  "lists": [{
    "id": "default",
    "name": "預設",
    "isDefault": true
  }]
}
```

### `glassy_shift_data`
```jsonc
{
  "2026-04-24": {
    "shiftIds": ["tagId1"],        // shift tag IDs for this day
    "payIds": ["jobId1"],          // job IDs that earn on this day
    "note": "備註"
  }
}
```

### `glassy_shift_settings`
```jsonc
{
  "shiftTags": [{ "id": "", "name": "", "startTime": "09:00", "endTime": "18:00", "color": "#3b82f6" }],
  "otherTags":  [{ "id": "", "name": "", "color": "#...", "icon": "star", "date": "2026-04-24" }],
  "jobs":       [{ "id": "", "name": "", "color": "#...", "method": "hourly", "rate": 0, "units": null, "payDay": 15, "holidayLogic": "postpone" }],
  "payday":     { "day": 15, "display": true, "holidayLogic": "postpone" }
}
```

### `lapis_workout`
```jsonc
{
  "logs": [{
    "id": "uuid",
    "date": "2026-04-24",
    "time": { "hour": 18, "minute": 30 },
    "exercises": [{
      "name": "Bench Press",
      "nameZh": "臥推",
      "type": "sets",              // "sets" | "duration"
      "categories": ["胸", "推"],
      "sets": [{ "reps": 10, "numSets": 3, "weight": 60, "done": true }],
      "isCompleted": true
    }],
    "isDeleted": false
  }]
}
```

### `lapis_workout_metrics`
```jsonc
{
  "weights": [{ "date": "2026-04-24", "weight": 70.5, "unit": "kg" }],
  "personalBests": [{ "name": "Bench Press", "nameZh": "臥推", "weight": 80, "reps": 5, "numSets": 3, "date": "2026-04-24" }]
}
```

### `lapis_workout_library`
```jsonc
[{
  "id": "uuid",
  "name": "Bench Press",
  "nameZh": "臥推",
  "type": "sets",
  "unit": "kg",
  "categories": ["胸", "推", ""],  // L1, L2, L3 (3-level hierarchy)
  "description": "",
  "targetMuscles": "",
  "order": 0
}]
```

### IndexedDB (Image Blobs)
- Database: `glassy-todo-blobs`
- Store: `images`
- API: `ImageDB.saveBlob(id, blob)` / `ImageDB.getBlob(id)` / `ImageDB.deleteBlob(id)`
- Used for custom background images to survive page reloads.

---

## 4. WEBVIEW READINESS

### Safe Area Insets
All pages that have a bottom nav must apply:
```css
padding-bottom: env(safe-area-inset-bottom, 0);
```
Apply to `.lapis-bottom-nav` and any fixed-bottom element.

### Asset Path Rules
- All local asset paths use `./` prefix (relative, not absolute).
- Version-bust query strings: `modules/todo.js?v=2.1`, `modules/shift.js?v=4.2`, `modules/setting.js?v=1.2`
- When adding a new shared JS change, bump the `?v=` on all affected `<script>` tags.

### PWA / Service Worker
- `manifest.json` referenced in `todo.html` as a CSS link (likely a bug — should be `<link rel="manifest">`).
- `old/sw.js` exists but is not actively registered. No active service worker in current build.

---

## 5. TROUBLESHOOTING LEDGER

### UI Blocking (Modal Cannot Be Clicked)
**Cause:** A lower z-index element has `position: relative/absolute` without explicit z-index, creating an unintended stacking context that traps the modal.
**Fix:**
1. Identify the blocking element via DevTools → Layers panel.
2. Ensure the blocking container does NOT set `transform`, `opacity < 1`, `filter`, or `will-change` without also setting a z-index that respects the hierarchy.
3. Use `--z-modal-lv3-content` (9001) for anything that must always be on top of LV2 modals.

### Scroll-Sync / Stuck Picker
**Cause:** `LapisDatePicker` / `LapisTimePicker` use `scrollTop` animation; if the picker container gets `overflow: hidden` from a parent, wheels freeze.
**Fix:** Ensure the picker's mount container has `overflow: visible` or `overflow: auto` with a fixed height. Never nest a picker inside a CSS `transform` ancestor.

### Theme Flash on Load
**Cause:** Vue hydration applies body class after paint.
**Fix:** The anti-flash inline `<script>` in `<head>` (see §2) applies the theme class to `<html>` before the first paint. Do not remove it.

### Custom Background Lost After Reload
**Cause:** Object URLs are session-scoped.
**Fix:** `nav.js` re-fetches the blob from IndexedDB on every page load via `ImageDB.getBlob('custom-bg')` and calls `URL.createObjectURL()` again.

### Stacking Context Created by Glassmorphism
**Cause:** `backdrop-filter` always creates a new stacking context.
**Fix:** Any element with `.glass` will create its own stacking context. Do not rely on z-index inheritance through a `.glass` ancestor — set z-index explicitly on the `.glass` element itself.

### LapisNav Not Rendered (lapis_core_ui.js)
**Cause:** `LapisNav.inject()` is called before DOM is ready.
**Fix:** Call `LapisNav.inject()` inside `DOMContentLoaded` or at the bottom of `<body>`.

---

## 6. COMPONENT API REFERENCE

### `useNav()` (nav.js)
```javascript
const { navSettings, isDarkTheme, glassStyle, resolvedTheme, themeClasses } = useNav();
// navSettings: reactive { theme, useCustomBg, customBg, customBgOpacity, effect, lang, ... }
// glassStyle: computed { backgroundColor, border, color, backdropFilter }
// resolvedTheme: computed — resolves 'system' to actual 'dark'/'light'
```

### `StorageProvider` (storage.js)
```javascript
StorageProvider.saveSettings(obj)        // todo_settings
StorageProvider.loadSettings()
StorageProvider.saveData(obj)            // todo_data
StorageProvider.loadData()
StorageProvider.saveShiftData(obj)       // glassy_shift_data
StorageProvider.loadShiftData()
StorageProvider.saveShiftSettings(obj)   // glassy_shift_settings
StorageProvider.getShiftSettings()
```

### `LapisModal` (lapis_core_ui.js)
```javascript
LapisModal.open('modal-id')
LapisModal.close('modal-id')
LapisModal.closeTop()          // closes topmost open modal
// ESC key automatically triggers closeTop()
```

### `LapisNav` (lapis_core_ui.js)
```javascript
LapisNav.inject({ activePage: 'todo' })  // activePage: 'index'|'shift'|'workout'|'setting'
LapisNav.refresh('zh')                   // re-render labels after lang change
```

### `LapisDatePicker` / `LapisTimePicker` (lapis_picker.js)
```javascript
const picker = new LapisDatePicker(containerEl, {
  year, month, day, minYear, maxYear,
  onConfirm(val) { /* val: { year, month, day } */ }
});
picker.getValue()         // → { year, month, day }
picker.setValue(y, m, d)
picker.confirm()

const tp = new LapisTimePicker(containerEl, {
  hour, minute,
  onConfirm(val) { /* val: { hour, minute } */ }
});
```

### `ParticleEngine` (effects.js)
```javascript
ParticleEngine.setEffect('cherry')  // 'none'|'cherry'|'rain'|'snow'
```

---

## 7. STANDARD DEVELOPMENT SOPs

> Call a skill by name: "Use **[Skill Name]** to add Feature X."

---

### SOP-01: Add a Level 2 Modal (Bottom-Sheet)

**When to use:** Primary data-entry modals — task editor, session log, settings form.

**Procedure:**
1. Add the backdrop + shell HTML inside `#app` (Vue template or static HTML).
2. Register an `id` on the backdrop div.
3. Declare a `ref(false)` show state OR call `LapisModal.open('modal-id')`.
4. Wire the close button to `LapisModal.close('modal-id')`.
5. Call `LapisModal.init()` once in `onMounted`.

**Minimal Boilerplate (HTML):**
```html
<!-- Backdrop -->
<div id="my-modal" class="lapis-modal-backdrop"
     style="z-index: var(--z-modal-lv2-backdrop); display:none; align-items:flex-end; justify-content:center">
  <!-- Shell -->
  <div class="lapis-modal-shell" style="z-index: var(--z-modal-lv2-content)">
    <div class="lapis-modal-header">
      <span class="lapis-modal-title">Title</span>
      <button class="lapis-modal-close" @click="LapisModal.close('my-modal')">✕</button>
    </div>
    <div class="lapis-modal-body">
      <!-- form fields -->
    </div>
    <div class="lapis-modal-footer">
      <button class="lapis-btn-secondary" @click="LapisModal.close('my-modal')">取消</button>
      <button class="lapis-btn-primary"   @click="save">確認</button>
    </div>
  </div>
</div>
```

**Open trigger:**
```javascript
LapisModal.open('my-modal');   // adds to stack; ESC auto-closes
```

**Anti-Patterns:**
- Do NOT set `display:flex` directly in CSS — `LapisModal.open()` manages this.
- Do NOT hardcode `z-index: 8000` — use `var(--z-modal-lv2-backdrop)`.
- Do NOT nest modals inside a parent with `transform` or `opacity < 1`.

---

### SOP-02: Add a Level 3 Confirmation Dialog

**When to use:** Destructive or irreversible actions — delete, clear bin, reset data.

**Procedure:**
1. Declare a `reactive` confirmModal object (not `ref` — LapisConfirm mutates `.show` directly).
2. Register `LapisConfirm` as a Vue component.
3. Place `<lapis-confirm>` in the template with `v-model`.
4. Trigger via `Object.assign(confirmModal, { show: true, ... })`.

**Minimal Boilerplate (Vue setup):**
```javascript
// State
const confirmModal = reactive({
  show: false, title: '', message: '',
  cancelText: '取消', confirmText: '確認',
  onConfirm: null
});

// Trigger helper
const askConfirm = ({ title, message, onConfirm }) => {
  Object.assign(confirmModal, { show: true, title, message, onConfirm });
};

// Component registration
const app = createApp({ setup() { return { confirmModal, askConfirm }; } });
app.component('LapisConfirm', LapisConfirm);
```

```html
<!-- Template -->
<lapis-confirm v-model="confirmModal"></lapis-confirm>

<!-- Usage -->
<button @click="askConfirm({ title:'刪除？', message:'無法復原', onConfirm: doDelete })">
  刪除
</button>
```

**Anti-Patterns:**
- Do NOT use `ref()` for confirmModal — the component mutates `modelValue.show` directly; a `reactive()` object propagates this correctly.
- Do NOT open a LapisConfirm from inside a LV2 modal using `LapisModal.open()` — it already renders at `--z-modal-lv3-backdrop` (9000) without going through the modal stack.

---

### SOP-03: Mount a Date/Time Picker

**When to use:** Any form field requiring date or time input (dueDate, session time, shift clock).

**Procedure:**
1. Add a container `<div>` with a stable DOM id inside the LV2 modal body.
2. Declare `showDateTimePicker = ref(false)` and `pickerMode = ref('date')`.
3. Instantiate the picker inside `onMounted` (or lazily on first open).
4. Wrap the container with `v-show="showDateTimePicker"`.
5. Call `picker.confirm()` on the Confirm button to fire `onConfirm`.

**Minimal Boilerplate:**
```html
<!-- Trigger buttons -->
<button @click="pickerMode='date'; showDateTimePicker=true">{{ form.date }}</button>
<button @click="pickerMode='time'; showDateTimePicker=true">{{ formatTime }}</button>

<!-- Picker container (inside LV2 modal or its own LV3 backdrop) -->
<div v-show="showDateTimePicker"
     class="fixed inset-0 flex items-center justify-center"
     style="z-index: var(--z-modal-lv3-backdrop)">
  <div style="z-index: var(--z-modal-lv3-content); width:320px">
    <div class="lapis-picker-wrap">
      <div class="lapis-picker-inner">
        <div id="picker-container"></div>
      </div>
      <div class="lapis-picker-line"></div>
      <div class="lapis-picker-mask-top"></div>
      <div class="lapis-picker-mask-bot"></div>
    </div>
    <button @click="activePicker.confirm(); showDateTimePicker=false">確認</button>
  </div>
</div>
```

```javascript
let datePicker, timePicker, activePicker;

onMounted(() => {
  const el = document.getElementById('picker-container');
  datePicker = new LapisDatePicker(el, {
    year: 2026, month: 4, day: 24,
    onConfirm(val) {
      form.value.date = val.iso;   // val: { year, month, day, iso }
    }
  });
  timePicker = new LapisTimePicker(el, {
    hour: 9, minute: 0,
    onConfirm(val) {
      form.value.time = { hour: val.hour, minute: val.minute };
    }
  });
  activePicker = datePicker;
});

watch(pickerMode, (mode) => {
  activePicker = mode === 'date' ? datePicker : timePicker;
});
```

**Anti-Patterns:**
- Do NOT mount the picker container inside an element with `overflow: hidden` — wheels will freeze.
- Do NOT nest the picker inside a CSS `transform` ancestor — `scrollTop` calculations break.
- Always use `--z-modal-lv3-*` for the picker overlay (it floats above LV2 modals).
- `ITEM_H = 44px` is hardcoded in `lapis_picker.js` — never change `.lapis-picker-item` height without updating that constant.

---

### SOP-04: Add a New Page

**When to use:** Creating a new HTML page that is part of the Lapis navigation system.

**Procedure:**
1. Copy the `<head>` anti-flash script block verbatim (§2 of this document).
2. Load scripts in this exact order: CDN libs → `effects.js` → `storage.js` → `nav.js` → `lapis_core_ui.js` → `lapis_picker.js` → `lapis_confirm.js` → `lapis_global_nav.js` → `modules/[page].js`.
3. Add `<div id="app" v-cloak>` as the Vue mount target.
4. Register the page in `lapis_core_ui.js → _pages[]` array (key, href, icon, zh, en).
5. Call `LapisNav.inject()` inside `DOMContentLoaded` or at the end of the module's `onMounted`.
6. Add the page's CSS file to `css/` following the naming convention `[page]_style.css`.

**Required `<head>` snippet:**
```html
<link rel="stylesheet" href="./css/shared_theme.css">
<link rel="stylesheet" href="./css/effects.css">
<link rel="stylesheet" href="./css/lapis_shared_style.css">
<script>/* anti-flash — see §2 */</script>
```

**Anti-Patterns:**
- Do NOT load `lapis_global_nav.js` on pages that already use `lapis_core_ui.js` bottom nav — they will conflict.
- Do NOT forget to bump `?v=` on the module script tag after any breaking change.
- Do NOT add `manifest.json` as a `<link rel="stylesheet">` (existing bug in todo.html — do not replicate).

---

### SOP-05: Persist Data to localStorage

**When to use:** Any time module state must survive page reload.

**Procedure:**
1. Always use `StorageProvider` methods — never call `localStorage.setItem` directly.
2. Wrap load calls in `try/catch` in case of corrupt JSON.
3. Save on every mutation (watcher or method call), not on page unload.

**Pattern:**
```javascript
// Load on mount
onMounted(() => {
  const raw = StorageProvider.loadData();       // returns parsed object or {}
  todos.value = raw.todos || [];
});

// Save on mutation (watcher)
watch([todos, lists], () => {
  StorageProvider.saveData({ todos: todos.value, lists: lists.value });
}, { deep: true });
```

**Key mapping reminder:**
| Data | Method |
|---|---|
| Settings (theme/lang/effect) | `saveCommonSettings` / `getCommonSettings` |
| Todo items + lists | `saveData` / `loadData` |
| Shift calendar data | `saveShiftData` / `loadShiftData` |
| Shift tag/job config | `saveShiftSettings` / `getShiftSettings` |
| Workout sessions | Direct key `lapis_workout` (workout.js manages its own) |

**Anti-Patterns:**
- Do NOT invent new localStorage keys without adding them to the Data Schema table (§3).
- Do NOT store blob/object URLs in localStorage — use IndexedDB via `ImageDB`.
- Do NOT use `JSON.parse(localStorage.getItem(...))` directly — always go through `StorageProvider`.

---

### SOP-06: Add Bilingual (zh/en) Support to a New Component

**When to use:** Every user-visible string in any module or shared component.

**Procedure:**
1. Add both `zh` and `en` keys to the module's `translations` object.
2. Expose `t = computed(() => translations[navSettings.lang] || translations.zh)`.
3. Reference strings as `t.value.myKey` in the template.
4. After language toggle, call `LapisNav.refresh(navSettings.lang)` to update nav labels.

**Pattern:**
```javascript
const translations = {
  zh: { title: '新功能', confirm: '確認', cancel: '取消' },
  en: { title: 'New Feature', confirm: 'Confirm', cancel: 'Cancel' }
};

const t = computed(() => translations[navSettings.lang] || translations.zh);

// In template:
// {{ t.title }}  {{ t.confirm }}
```

**Anti-Patterns:**
- Do NOT hardcode Chinese strings inline in the template — always go through `t`.
- Do NOT add an `en` key without also adding the matching `zh` key (and vice versa).

---

### SOP-07: Write Theme-Aware CSS

**When to use:** Any new CSS class that must look correct on both dark and light themes.

**Procedure:**
1. Write the **dark-theme default** first (the base `:root` / unscoped rule).
2. Override for light themes using the explicit body-class selectors.
3. Use CSS variables (`--glass-bg`, `--text-primary`, `--primary`) wherever possible instead of literal colors.

**Pattern:**
```css
/* 1. Dark default */
.my-component {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  border: 1.5px solid rgba(255, 255, 255, 0.15);
}

/* 2. Light theme overrides */
body.theme-light       .my-component,
body.theme-cherry      .my-component,
body.theme-sky         .my-component,
body.theme-seaside     .my-component,
body.theme-sunset      .my-component,
body.theme-mapleavenue .my-component,
body.theme-waterfall   .my-component {
  background: rgba(0, 0, 0, 0.05);
  color: #1a1a1a;
  border-color: rgba(0, 0, 0, 0.10);
}
```

**Light themes requiring override:** `light`, `cherry`, `sky`, `seaside`, `sunset`, `mapleavenue`, `waterfall`
**Dark themes (no override needed):** `dark`, `forest`, `night`, `torii`, `starrysky`, `ferriswheel`

**Anti-Patterns:**
- Do NOT use `!important` on color/background unless overriding a `.glass` rule (which itself uses `!important` for theme variants).
- Do NOT add `backdrop-filter` without knowing it creates a new stacking context (see §5 Troubleshooting).
- Do NOT write `body.theme-dark .my-component` overrides — dark is the default; only light themes need explicit rules.
