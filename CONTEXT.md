# LAPIS PROJECT — CONTEXT.md
> **Documentation Hub** — entry point for all LLM-assisted development.
> Last audited: 2026-04-26

## Documentation Map

### Rulebook
| File | Role |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | AI coding standards, guardrails, naming/date/asset rules |

### Manifests (this file + sub-indexes)
| File | Contents |
|---|---|
| [`docs/DATA_SCHEMAS.md`](./docs/DATA_SCHEMAS.md) | localStorage keys, JSON schemas, IndexedDB API |
| [`docs/SOP_REGISTRY.md`](./docs/SOP_REGISTRY.md) | SOP-01 → SOP-07 standard procedures |
| [`docs/LOGIC_DEEP_DIVE.md`](./docs/LOGIC_DEEP_DIVE.md) | PR calculation, salary logic, recurring tasks, nav detection |

### Tech Manuals (implementation details & bug history)
| File | Contents |
|---|---|
| [`docs/theme_engine.md`](./docs/theme_engine.md) | CSS variable engine, `LapisCore.applyTheme`, style invalidation, reflow hack, cross-tab sync |
| [`docs/navigation_engine.md`](./docs/navigation_engine.md) | View Transitions API, `LapisCore.navigate`, link interception, cross-document transitions |
| [`docs/date_logic.md`](./docs/date_logic.md) | UTC rollback bug, 1970 picker bug, `ts` storage rule, safe date parsing |
| [`docs/TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md) | Known UI issues, z-index conflicts, picker freeze, theme flash |
| [`docs/UI_HARDENING.md`](./docs/UI_HARDENING.md) | UI edge cases and hardening notes |

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
├── index.html          → Home hub (greeting + LapisNav + bottom nav)
├── todo.html           → Task management (lists, categories, recurring)
├── workout.html        → Fitness tracker (3-tab: workout/exercises/records + add)
├── shift.html          → Shift scheduling (calendar grid, job earnings)
├── stats.html          → Workout read-only stats snapshot
├── setting.html        → App settings (theme, calendar, user profile)
│
├── docs/               → Documentation hub (sub-documents)
│   ├── DATA_SCHEMAS.md       → localStorage keys, JSON schemas
│   ├── TROUBLESHOOTING.md    → Known issues & resolved bugs
│   ├── SOP_REGISTRY.md       → Standard operating procedures
│   ├── LOGIC_DEEP_DIVE.md    → PR calc, salary, recurring logic
│   ├── theme_engine.md       → CSS variable engine, LapisCore, reflow hack
│   ├── navigation_engine.md  → View Transitions API, SPA navigate, link interception
│   └── date_logic.md         → Date init, 1970 bug, UTC fix
│
├── css/
│   ├── shared_theme.css       → Global CSS vars: --glass-bg, --primary, --text-*
│   ├── lapis_shared_style.css → Z-index scale, .glass class, modal shells
│   ├── effects.css            → Particle animation keyframes
│   ├── style.css              → index/todo/stats shared layout
│   ├── shift_style.css        → Calendar grid, tag pills
│   └── workout_style.css      → Workout-specific layout
│
├── js/
│   ├── core_engine.js      → LapisCore: CSS var injection, preloadImage, applyTheme, navigate
│   ├── nav.js              → useNav() composable: Vue reactivity layer over LapisCore
│   ├── storage.js          → StorageProvider (localStorage CRUD) + ImageDB (IndexedDB)
│   ├── effects.js          → ParticleEngine: setEffect('none'|'cherry'|'rain'|'snow')
│   ├── lapis_core_ui.js    → LapisNav (top capsule dropdown), LapisModal (open/close/ESC)
│   ├── lapis_picker.js     → LapisDatePicker + LapisTimePicker (drum-roll wheel)
│   ├── lapis_confirm.js    → Vue confirm dialog (LV3)
│   └── holidays.js         → Holiday data for shift calendar
│
└── modules/
    ├── index.js         → Home app
    ├── todo.js          → Task app (full CRUD)
    ├── shift.js         → Shift app (calendar CRUD + earnings calc)
    ├── workout.js       → Workout orchestrator
    ├── workout_data.js  → Workout constants, defaults, translations (_wT)
    ├── workout_metrics.js     → Weight tracking + PR calculation
    ├── workout_library_ui.js  → Exercise library CRUD + category tree
    ├── stats.js         → Stats app (read-only)
    └── setting.js       → Settings app (theme, lang, custom bg)
```

### Navigation Structure
| Page | Top | Bottom Nav items | Cross-page nav |
|---|---|---|---|
| `index.html` | LapisNav capsule (dropdown) | Home / Quick Add (+) / Stats | Via capsule dropdown |
| `todo.html` | LapisNav capsule | Active / Completed / Bin / Add (+) | Via capsule dropdown |
| `workout.html` | LapisNav capsule | Workout / Exercises / Records / Add (+) | Via capsule dropdown |
| `shift.html` | LapisNav capsule | Today's Tasks / Salary / Shifts / Labels | Via capsule dropdown |
| `setting.html` | Inline tab switcher | — (no bottom nav) | Via capsule dropdown |

> **Rule:** Each detail page owns its own `<nav class="bottom-nav glass">`. Cross-page links live only in the LapisNav top capsule dropdown. Never use a shared global bottom nav on detail pages.

### Script Load Order
Standard: `effects.js` → `storage.js` → `core_engine.js` → `nav.js` → `lapis_core_ui.js` → `lapis_picker.js` → `lapis_confirm.js` → `modules/[page].js`

**workout.html specifically:** `modules/workout_data.js` → `modules/workout_metrics.js` → `modules/workout_library_ui.js` → `modules/workout.js` *(all in `modules/`, NOT `js/`)*

---

## 2. GLOBAL UI STANDARDS

### Z-Index Hierarchy (defined in `lapis_shared_style.css`)

```css
:root {
  --z-nav:                 7000;  /* Bottom nav, top nav, list-tabs */
  --z-modal-lv2-backdrop:  8000;  /* Primary modal overlay */
  --z-modal-lv2-content:   8001;  /* Primary modal shell */
  --z-modal-lv3-backdrop:  9000;  /* Secondary modal overlay */
  --z-modal-lv3-content:   9001;  /* Picker, confirm, PR history */
  --z-top-overlay:         10000; /* Toasts, error reporter */
}
```

> **Rule:** Never hardcode z-index integers. Always use these CSS variables.
> **Rule:** LV3 modals MUST always appear above LV2 modals.

### Glassmorphism Classes

| Class | Blur | Usage |
|---|---|---|
| `.glass` | 12px | Base component surface |
| `.lapis-modal-shell` | 28px | Large modal dialogs |
| `.bottom-nav` | 22px + saturate(1.4) | Navigation bar |
| `.task-item` | 16px | Task list cards |

### Theme System

**Dark themes** (dark glass, light text): `dark`, `forest`, `night`, `torii`, `starrysky`, `ferriswheel`
**Light themes** (frosted white glass, dark text): `light`, `cherry`, `sky`, `seaside`, `sunset`, `mapleavenue`, `waterfall`

**Anti-flash script** (required in `<head>` of every HTML page):
```html
<script>!function(){try{
  var d=JSON.parse(localStorage.getItem('todo_settings')||'{}'),t=d.theme||'light';
  if(t==='system')t=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
  document.documentElement.className='theme-'+t;
  var dk=['dark','forest','night','torii','starrysky','ferriswheel'];
  document.documentElement.style.background=dk.indexOf(t)>=0?'#0d1117':'#f0f4ff';
}catch(e){}}();</script>
```

### CSS Custom Properties (Global)

```css
:root {
  --glass-bg:        rgba(255, 255, 255, 0.2);
  --glass-border:    rgba(255, 255, 255, 0.1);
  --primary:         #3b82f6;
  --text-primary:    #ffffff;
  --text-secondary:  rgba(255, 255, 255, 0.7);
  --text-shadow:     0 1px 3px rgba(0, 0, 0, 0.85);
}
```

---

## 3. COMPONENT API QUICK REFERENCE

```javascript
// nav.js
const { navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle } = useNav();

// lapis_core_ui.js — LapisNav
// Page keys: 'home' | 'todo' | 'shift' | 'workout' | 'setting'
LapisNav.inject({ bottom: false })   // top capsule only
LapisNav.refresh('zh')               // re-render after lang change

// lapis_core_ui.js — LapisModal
LapisModal.open('modal-id')          // shows + adds to ESC stack
LapisModal.close('modal-id')
LapisModal.closeTop()                // ESC handler

// storage.js
StorageProvider.saveSettings(obj)    // todo_settings
StorageProvider.loadSettings()
StorageProvider.saveData(obj)        // todo_data
StorageProvider.loadData()
StorageProvider.saveShiftData(obj)
StorageProvider.loadShiftData()
StorageProvider.saveShiftSettings(obj)
StorageProvider.getShiftSettings()
ImageDB.saveBlob(id, blob)
ImageDB.getBlob(id)                  // → Blob | null

// effects.js
ParticleEngine.setEffect('cherry')   // 'none'|'cherry'|'rain'|'snow'
```

---

## 4. WEBVIEW / PWA READINESS

- All local asset paths use `./` prefix (relative).
- Version-bust query strings: `modules/todo.js?v=2.1`, `modules/shift.js?v=4.2`
- Bump `?v=` on every breaking module change.
- Safe area insets: apply `padding-bottom: env(safe-area-inset-bottom, 0)` to `.bottom-nav` and fixed-bottom elements.
- `manifest.json` referenced as a CSS `<link>` in todo.html — known bug, do not replicate.
- No active service worker in current build (`old/sw.js` exists but is not registered).
