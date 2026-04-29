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
├── studio.html         → 琉璃工坊 image editor (Vue 3 Composition API; see §5)
│
├── theme/              → Preset background PNGs (loaded by LapisCore._imgThemes)
│   ├── cherry.png, sky.png, sunset.png, sea.png, seaside.png
│   ├── forest.png, night.png, torii.png, waterfall.png
│   ├── ferriswheel.png, starrynight.png
│   └── plum-blossom.png    ← 梅花主題 (light theme; asset pending upload)
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
│   ├── holidays.js         → Holiday data for shift calendar
│   ├── lapis_studio_ui.js  → Studio Vue setup(): state, nav flows, history, download (see §5)
│   ├── lapis_studio_engine.js  → LEGACY canvas engine (pre-Phase 13.8.2; NOT loaded by studio.html)
│   └── fx/                 → Modular canvas FX (all loaded by studio.html; see §5)
│       ├── lapis_fx_base.js      → Exports window.LapisStudioEngine: colour filters, applyMask,
│       │                            triggerRealDownload, svgShapeInner; routes glass-/jigsaw- keys
│       ├── lapis_fx_shatter.js   → window.LapisFXShatter: impact / spiderweb / fractured variants
│       ├── lapis_fx_jigsaw.js    → window.LapisFXJigsaw: static / explode / drift / gravity / scattered
│       ├── lapis_fx_collage.js   → window.LapisFXCollage: 6 layouts + per-cell createFromLayout()
│       ├── lapis_fx_text.js      → window.LapisFXText: bold text overlay at normalised (x,y)
│       └── lapis_fx_sticker.js   → window.LapisFXSticker: 12 built-in emoji stickers
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
**Light themes** (frosted white glass, dark text): `light`, `cherry`, `sky`, `seaside`, `sunset`, `mapleavenue`, `waterfall`, `plum-blossom`

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

---

## 5. STUDIO MODULE — 琉璃工坊 (`studio.html`)

### Overview

`studio.html` is a standalone image editor built with **Vue 3 Composition API** (`setup()`).
It does NOT use Options API. It shares the global `useNav()` composable and the standard
`#lapis-bg-system` double-buffer background, but has its own bottom-nav state machine.

### Script Load Order

```
effects.js → storage.js → core_engine.js → nav.js → lapis_core_ui.js
  → cropperjs (CDN)
  → js/fx/lapis_fx_shatter.js
  → js/fx/lapis_fx_jigsaw.js
  → js/fx/lapis_fx_collage.js
  → js/fx/lapis_fx_text.js
  → js/fx/lapis_fx_sticker.js
  → js/fx/lapis_fx_base.js        ← exports window.LapisStudioEngine
  → js/lapis_studio_ui.js         ← mounts Vue after waitForDeps() polling
```

`waitForDeps()` polls every 20 ms and only mounts once all 7 globals
(`Vue`, `useNav`, `LapisFXShatter`, `LapisFXJigsaw`, `LapisFXCollage`,
`LapisFXText`, `LapisFXSticker`, `LapisStudioEngine`, `Cropper`) are defined.

> ⚠ `js/lapis_studio_engine.js` is a **legacy file** from before Phase 13.8.2 and is
> **not loaded** in `studio.html`. The active engine is `js/fx/lapis_fx_base.js`.

---

### Nav State Machine

| `activeNav` | Floating panel | Bottom nav |
|---|---|---|
| `'main'`    | hidden | Upload / Collage / Effects / Save |
| `'crop'`    | Crop controls (horizontal scroll) | Back / Undo / Apply / Save |
| `'effects'` | **FX Drawer** (3-layer vertical) | Back / Undo / Apply / Save |

`contentView` computed maps nav + cropMode to content sections:
- `'upload'` — drop zone (no image loaded)
- `'preview'` — image preview (main + effects)
- `'crop'` — Cropper.js workspace (manual)
- `'collage'` — per-cell grid (collage mode)

---

### FX Drawer — 3-Layer Architecture

The FX Drawer is a fixed `position:fixed` element shown only when `activeNav === 'effects'`.
It replaces the horizontal-scroll panel used in crop mode.

```
┌─────────────────────────────────────────┐  ← 38px
│  Intensity Slider  ███████████  100%    │  Layer 1 (always visible)
├─────────────────────────────────────────┤  ← 68px
│  [chip] [chip] [chip] [chip] …          │  Layer 2 (slides on category change)
├─────────────────────────────────────────┤  ← ~48px
│  濾鏡  碎玻璃  拼圖  文字  貼圖         │  Layer 3 (category tabs)
└─────────────────────────────────────────┘
```

Layer 2 uses `<transition name="fx-slide" mode="out-in">` with `:key="effectCategory"`.
CSS: `.fx-slide-enter-from { transform: translateY(100%); opacity: 0 }`.
Main content `paddingBottom` = `246px` in effects mode, `134px` in crop, `80px` in main.

**Effect categories**: `'filters'` | `'glass'` | `'jigsaw'` | `'text'` | `'stickers'`

---

### FX Module API

| Global | Entry point | Accepts |
|---|---|---|
| `LapisStudioEngine` | `applyEffect(srcCanvas, key, { intensity })` | All effect keys |
| `LapisFXShatter` | `render(srcCanvas, variant, { intensity })` | `'impact'` \| `'spiderweb'` \| `'fractured'` |
| `LapisFXJigsaw` | `render(srcCanvas, variant, { intensity })` | `'static'` \| `'explode'` \| `'drift'` \| `'gravity'` \| `'scattered'` |
| `LapisFXCollage` | `createFromLayout(layoutKey, cellUrls[])` | `'1x2'` \| `'2x1'` \| `'2x2'` \| `'2x3'` \| `'3x2'` \| `'3x3'` |
| `LapisFXText` | `render(srcCanvas, { text, fontFamily, fontSize, color, strokeColor, x, y })` | normalised `x/y` 0‥1 |
| `LapisFXSticker` | `render(srcCanvas, { sticker, x, y, scale })` | emoji string |

`applyEffect` key routing:
- `'glass-*'` → `LapisFXShatter.render(src, key.slice(6), config)`
- `'jigsaw-*'` → `LapisFXJigsaw.render(src, key.slice(7), config)`
- Other keys → CSS `ctx.filter` (colour filters); `intensity < 1` blends via `globalAlpha`

---

### Key Logic Details

#### Crop Coordinate Precision
- Use `_cropper.getData(true)` to get **full-image pixel coords** (not display coords).
- `applyMask(srcCanvas, shape, data)` draws the shape at `(0,0)‥(w,h)`,
  then `ctx.translate(-data.x, -data.y)` before `drawImage(src)` so the
  crop region aligns with the output canvas origin.

#### Intensity Slider Debounce
- `fxIntensity` ref drives a 100 ms debounce via `_sliderTimer`.
- On fire: re-calls `applyEffectFilter(activeEffect.value)` from `_effectsBase`.
- Prevents mobile GPU thrashing during continuous drag.

#### Effects Base (`_effectsBase`)
- Snapshot of `resultUrl` taken when entering effects mode.
- Every `applyEffectFilter()` call re-renders FROM `_effectsBase` (not from
  the last preview), preventing filter stacking.
- `applyCurrentEffect()` (Apply button) commits preview → advances `_effectsBase`.

#### Download (`triggerRealDownload`)
1. `canvas.toBlob()` → `new Blob([blob], { type: 'application/octet-stream' })`
2. Create off-screen `<a download="...">` with blob URL; call `link.click()`.
3. If `link.click()` throws (sandboxed iframe), fallback: `window.location.assign(blobUrl)`.
4. Revoke blob URL after 5 000 ms.

#### Pro-Collage
- `LapisFXCollage.LAYOUTS` — 6 static presets (`{ cols, rows, label }`).
- `collageCells` ref — per-cell URL array; cell 0 defaults to current image.
- `triggerCellInput(ci)` stores index → triggers `#collage-cell-input` click.
- `onCellFileInput` creates a new blob URL, revokes the previous one (if not base image).
- `buildCollage()` calls `createFromLayout(layout, cells)` → cover-fit renders all cells
  at full resolution → bakes to `resultUrl` data URL.

---

### Theme System Integration

`studio.html` shares the same anti-flash script and `#lapis-bg-system` as all other pages.
The dark-theme array in the anti-flash `<script>` inline block:
```javascript
var dk = ['dark','forest','night','torii','purple','ferriswheel','starrynight'];
```
`plum-blossom` is a **light** theme — no changes to `dk` are needed.
