# Storage

Last updated: 2026-05-01

## Current Design

Storage is local-first. The app uses localStorage for JSON data and IndexedDB for image blobs.

## `LapisStorage`

Defined in `js/storage.js`.

API:

- `get(key, fallback = null)`
- `set(key, value)`
- `sync()`

`sync()` is a placeholder. It returns a local-first no-op status and does not contact a server.

## `StorageProvider`

`StorageProvider` preserves existing APIs while routing through `LapisStorage`.

Todo:

- `saveSettings(settings)`
- `loadSettings()`
- `saveData(data)`
- `loadData()`
- `getTodoData()`

Shift:

- `saveShiftData(data)`
- `loadShiftData()`
- `getShiftData()`
- `saveShiftSettings(settings)`
- `getShiftSettings()`

Common settings:

- `saveCommonSettings(settings)`
- `getCommonSettings()`

## Storage Keys

- `todo_settings`: theme, language, notification and shared settings.
- `todo_data`: todo lists and task records.
- `glassy_shift_data`: date-keyed shift entries.
- `glassy_shift_settings`: shift tags, pay jobs, payday and other tags.
- `lapis_workout`: workout logs.
- `lapis_workout_library`: exercise library.
- `lapis_workout_categories`: workout category tree.
- `lapis_workout_metrics`: weight and personal best data.

## IndexedDB

`ImageDB` stores blobs in:

- Database: `glassy-todo-blobs`
- Object store: `images`

Current methods:

- `init()`
- `saveBlob(id, blob)`
- `getBlob(id)`
- `deleteBlob(id)`

## Auth Separation

Firebase Auth is not connected to storage. Logging in does not change data keys, migrate data, or sync local records.

## Known Limitations

- Some workout code still reads localStorage directly.
- Data validation is handled per feature, not centrally in `LapisStorage`.
- There is no remote backup or conflict resolution.

