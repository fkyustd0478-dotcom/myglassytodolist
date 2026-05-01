# Architecture

Last updated: 2026-05-01

## Overview

Lapis is a browser-only Vue application served as static files. Pages are independent HTML entry points that load shared scripts and page modules. The app is designed around local-first storage and client-side rendering.

## Runtime Layers

1. HTML entry point.
2. Shared CSS and theme variables.
3. Shared JavaScript runtime:
   - storage
   - Firebase Auth wrapper
   - core theme/navigation engine
   - i18n
   - nav composable
   - shared UI helpers
4. Page module.
5. localStorage / IndexedDB persistence.

## Entry Points

- `index.html`: dashboard.
- `todo.html`: todo management.
- `shift.html`: shift schedule.
- `workout.html`: workout tracker.
- `stats.html`: stats snapshot.
- `setting.html`: settings and data import/export.
- `studio.html`: image editing.
- `language.html`: placeholder language page.

## Shared Modules

- `js/storage.js`: storage abstraction and providers.
- `js/auth.js`: Firebase Auth-only wrapper.
- `js/i18n.js`: central translation runtime.
- `js/core_engine.js`: theme and navigation helpers.
- `js/nav.js`: Vue navigation state.
- `js/lapis_core_ui.js`: nav and modal UI systems.
- `modules/data_portability.js`: data import/export conversion.
- `js/lapis_studio_jigsaw_manual.js`: Studio-only manual jigsaw arrangement helper.

## Page Modules

- `modules/index.js`: dashboard data aggregation.
- `modules/todo.js`: todo CRUD and recurring logic.
- `modules/shift.js`: shift calendar and tags.
- `modules/workout.js`: workout orchestration.
- `modules/workout_data.js`: workout constants/defaults.
- `modules/workout_library_ui.js`: library and categories.
- `modules/workout_metrics.js`: weight and personal best metrics.
- `modules/stats.js`: chart data snapshots.
- `modules/setting.js`: settings and data portability UI.

## Dependency Notes

- `workout.html` must load workout helper modules before `modules/workout.js`.
- `studio.html` must load FX modules and `js/lapis_studio_jigsaw_manual.js` before `js/lapis_studio_ui.js`.
- `i18n.js` must load before modules that register local dictionaries.
- `auth.js` is loaded as a module and is independent from app data.

## Non-Goals

- No backend rendering.
- No cloud data sync.
- No Firestore or database integration.
- No server authentication gate.
