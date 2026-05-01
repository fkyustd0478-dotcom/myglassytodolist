# Lapis Project Context

Last updated: 2026-05-01

This document reflects the implemented code in this repository. It is the root context file for future maintenance, debugging, and AI-assisted development.

## System Architecture

Lapis is a static, local-first Vue application. Each HTML page loads Vue and shared scripts directly in the browser. There is no backend service, no server-rendered layer, and no database sync in the current implementation.

Core runtime layers:

- `js/storage.js`: local-first storage boundary. Exposes `LapisStorage`, `StorageProvider`, and `ImageDB`.
- `js/auth.js`: Firebase Authentication wrapper only. Exposes `AuthProvider`; it does not connect to storage or sync data.
- `js/i18n.js`: central key-based translation runtime. Exposes `LapisI18n`.
- `js/core_engine.js`: theme background transitions, image preloading, and navigation helpers.
- `js/nav.js`: shared Vue composable for theme, language, navigation state, and custom background loading.
- `js/lapis_core_ui.js`: shared `LapisNav` and `LapisModal` systems.
- `modules/*.js`: page-specific Vue applications and feature modules.
- `js/fx/*.js`: Studio canvas FX and export helpers.

The app remains local-first. Firebase Auth is authentication only and does not read or write app data.

## Module Breakdown

Pages:

- `index.html` + `modules/index.js`: dashboard, today/tomorrow summary, quick add.
- `todo.html` + `modules/todo.js`: todo lists, active/completed/bin views, recurring tasks, notification scheduling.
- `shift.html` + `modules/shift.js`: calendar-based shift schedule, pay tags, other tags, payday display, today tasks.
- `workout.html` + `modules/workout.js`: workout orchestration, exercise records, library, weight tracking, charts.
- `stats.html` + `modules/stats.js`: read-only workout and weight stats snapshot.
- `setting.html` + `modules/setting.js`: settings, theme, language, user data import/export controls.
- `studio.html` + `js/lapis_studio_ui.js`: image upload, crop, collage, FX, text/stickers, PNG export.
- `language.html`: placeholder language-learning page using existing navigation and i18n.

Shared modules:

- `modules/data_portability.js`: import/export conversion for todo, workout library, body weight, and shift data.
- `modules/workout_data.js`: workout defaults, category tree, exercise defaults, workout translations.
- `modules/workout_library_ui.js`: exercise library and category management.
- `modules/workout_metrics.js`: body weight, personal bests, and chart helpers.

## Data Flow

Typical page flow:

1. HTML loads shared CSS and CDN libraries.
2. `storage.js` creates storage APIs.
3. `firebase_config.js` and `auth.js` initialize auth if config exists.
4. `core_engine.js`, `i18n.js`, `nav.js`, and UI helpers load.
5. Page module reads local data through `StorageProvider` or direct localStorage for legacy workout metrics.
6. Vue renders the page and saves changes back to localStorage.

No data is sent to Firebase, Firestore, Realtime Database, Cloud Storage, or any backend.

## Storage System Design

`LapisStorage` is the abstraction boundary for future sync work:

- `get(key, fallback)`: reads JSON from localStorage.
- `set(key, value)`: writes JSON to localStorage.
- `sync()`: placeholder only; returns local-first no-op status.

`StorageProvider` preserves older method names and keys:

- `todo_settings`: shared settings and theme state.
- `todo_data`: todo lists and tasks.
- `glassy_shift_data`: shift calendar entries.
- `glassy_shift_settings`: shift tags, jobs, payday settings.

`ImageDB` uses IndexedDB for image blobs:

- Database: `glassy-todo-blobs`
- Store: `images`
- Used primarily for custom background image persistence.

Current limitations:

- Workout data still has direct localStorage access in workout modules for `lapis_workout`, `lapis_workout_library`, `lapis_workout_categories`, and `lapis_workout_metrics`.
- `sync()` is intentionally a placeholder and must not be treated as cloud sync.

## Authentication

`js/auth.js` implements Firebase Auth only:

- `AuthProvider.loginWithGoogle()`
- `AuthProvider.loginWithEmail(email, password)`
- `AuthProvider.logout()`
- `AuthProvider.getUser()`
- `AuthProvider.isLoggedIn()`

Auth uses Firebase browser local persistence. The Firebase config placeholder is in `js/firebase_config.js`.

Important constraints:

- Auth does not connect to `LapisStorage`.
- Auth does not change storage keys.
- No Firestore, Realtime Database, Cloud Storage, or backend calls are implemented.

## Studio Module Design

Studio is a client-side image editor.

Main UI:

- `studio.html`
- `js/lapis_studio_ui.js`
- `css/lapis_studio.css`

Engine and FX:

- `js/fx/lapis_fx_base.js`: exposes `LapisStudioEngine`, download routing, filters, masks.
- `js/fx/lapis_fx_collage.js`: collage layouts and rendering.
- `js/fx/lapis_fx_shatter.js`: glass/shatter effects with depth and reflections.
- `js/fx/lapis_fx_jigsaw.js`: jigsaw variants with shadow and depth rendering.
- `js/lapis_studio_jigsaw_manual.js`: manual jigsaw piece arrangement state and pointer handling.
- `js/fx/lapis_fx_text.js`: text overlay.
- `js/fx/lapis_fx_sticker.js`: built-in sticker overlays.

Flow:

1. User uploads an image.
2. Studio stores an object URL/data URL in Vue state.
3. Crop/collage/effects render to canvas.
4. Export produces PNG output.
5. Download uses the File System Access API when available, then falls back to the FX base helper's blob download path.

Technical highlights:

- Non-uniform cropping lets special masks such as heart and star stretch independently by width and height.
- High-fidelity jigsaw rendering uses Bezier tab/blank piece paths, depth strokes, shadows, and optional manual arrangement across all jigsaw variants.
- Text and sticker overlays support drag, scale, rotate, and local Death Note font files in `assets/fonts/`.

Known Studio limitations:

- Firebase Auth is unrelated to Studio export.
- Export is local browser download only.
- Large images may still be limited by browser memory.

## Import / Export System

`modules/data_portability.js` implements readable import/export conversion.

Supported data areas:

- Todo records.
- Body weight records.
- Workout library records.
- Shift records.

Supported formats:

- JSON for full data.
- CSV for simplified structured rows.
- TXT for plain line-based records.

Settings UI integration:

- `setting.html`
- `modules/setting.js`

Import behavior:

- Format auto-detection.
- Merge into existing local data.
- Validation with user-facing messages.
- Shift import can create missing tag names with defaults.

Export behavior:

- Exports currently selected data type.
- Produces readable JSON, CSV, or TXT depending on selected format.

Storage schema remains unchanged.

## UI System Overview

Shared UI files:

- `css/shared_theme.css`: theme variables, background layers, global contrast.
- `css/lapis_shared_style.css`: top nav, bottom nav, modal shell, picker surface, shared buttons.
- `css/lapis_studio.css`: Studio-specific drawer, crop, FX controls.
- `js/lapis_core_ui.js`: `LapisNav` and `LapisModal`.
- `js/lapis_picker.js`: date/time wheel pickers.
- `js/lapis_confirm.js`: secondary confirm modal.

Navigation:

- Top capsule navigation is injected by `LapisNav`.
- Bottom navigation is page-owned.
- Modal open state can hide navigation.

Modal system:

- `LapisModal.open(id)` displays `.lapis-modal-backdrop`.
- `LapisModal.close(id)` runs close animation before hiding.
- ESC closes top modal.

i18n:

- `LapisI18n.t(key)` returns translated text.
- `LapisI18n.setLang(lang)` changes runtime language.
- Existing page dictionaries are registered into the central runtime.

## Known Limitations

- There is no cloud data sync.
- Firebase Auth requires the project config to be filled in `js/firebase_config.js`.
- Direct localStorage calls still exist in workout metrics and some legacy helpers.
- `CodeX.log` is ignored by git because `.gitignore` excludes `*.log`.
- `language.html` is currently a placeholder page.
- Vitest coverage starts with storage smoke tests only.

## Troubleshooting Guide

Use `docs/TROUBLESHOOTING.md` for detailed cases.

Quick checks:

- Blank page: inspect console, confirm `lapis-ready` is applied to `body`.
- Theme issue: inspect `todo_settings.theme`.
- Modal hidden behind UI: inspect z-index and stacking contexts.
- Auth not working: fill `window.LAPIS_FIREBASE_CONFIG` and enable providers in Firebase Console.
- Import fails: confirm format matches the selected data type.
- Studio export fails: verify image is loaded and output canvas is not empty.

## Verification Commands

```bash
npm install
npm test
node --check js/storage.js
node --check js/auth.js
node --check js/lapis_core_ui.js
```
