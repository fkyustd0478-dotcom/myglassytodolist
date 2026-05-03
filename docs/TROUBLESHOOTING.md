# Troubleshooting

Last updated: 2026-05-01

## Blank Page or Black Screen

Check:

- Console errors before `document.body.classList.add('lapis-ready')`.
- Invalid theme value in `todo_settings`.
- Missing theme image asset.

Relevant files:

- `js/nav.js`
- `js/core_engine.js`
- `css/shared_theme.css`

Fix:

- Reset `todo_settings.theme` to `light`.
- Confirm theme assets exist in `theme/`.
- Confirm `lapis-ready` remains on `body` after theme switches.

## Modal Behind Page Content

Cause:

- A parent glass surface or transformed element created a stacking context.

Check:

- `.lapis-modal-backdrop`
- `.lapis-modal-shell`
- z-index variables in `css/lapis_shared_style.css`

Fix:

- Use the shared z-index variables.
- Avoid putting modal shells inside transformed containers.

## Modal Closes Instantly or Leaves Invisible Overlay

Current modal close uses `.is-closing` and a timeout in `LapisModal.close()`.

Check:

- `js/lapis_core_ui.js`
- `.lapis-modal-backdrop.is-closing`
- `lapisShellDown`
- `lapisShellFadeScale`

If the overlay remains, confirm no code removes the class before the timeout finishes.

## Firebase Auth Not Working

Symptoms:

- `AuthProvider.loginWithGoogle()` throws configuration error.
- Popup fails.
- Email login fails.

Check:

- `js/firebase_config.js` contains a real Firebase Web App config.
- Firebase Console has Google provider enabled.
- Firebase Console has Email/Password provider enabled.
- The app domain is allowed in Firebase Authentication settings.

Important:

- Auth does not sync app data.
- No Firestore, Realtime Database, or Cloud Storage SDK is loaded.

## Storage Data Missing

Check localStorage keys:

- `todo_settings`
- `todo_data`
- `glassy_shift_data`
- `glassy_shift_settings`
- `lapis_workout`
- `lapis_workout_library`
- `lapis_workout_categories`
- `lapis_workout_metrics`

`LapisStorage.get(key, fallback)` returns fallback only when the key is missing. Invalid JSON can still throw.

## Custom Background Missing After Reload

Custom background blobs live in IndexedDB through `ImageDB`.

Check:

- IndexedDB database `glassy-todo-blobs`
- Store `images`
- Key `custom-bg`

The object URL is rebuilt on page load by `nav.js`.

## Import Fails

Check:

- Correct data type is selected in Settings.
- CSV header matches the selected data type.
- TXT format is line-based and matches examples.
- JSON matches the existing app schema.

Relevant files:

- `modules/data_portability.js`
- `modules/setting.js`

## Export Downloads Unexpected Format

Check selected export format in Settings.

Supported:

- JSON
- CSV
- TXT

The export system converts local app data into readable text. It does not change storage schema.

## Studio Export Fails

Check:

- Image is loaded.
- Crop/effect result exists.
- Browser allows downloads.
- Canvas is not tainted by cross-origin content.

Relevant files:

- `js/lapis_studio_ui.js`
- `js/fx/lapis_fx_base.js`

## Studio FX Drawer Feels Wrong

Check:

- `css/lapis_studio.css`
- `drawer-swap`
- `fxDrawerIn`
- `fx-slide`

The drawer is tuned for subtle transitions. Avoid large motion changes on mobile.

## Language Study Card Transparent in Dark Mode

Symptom:

- Vocabulary study cards appear semi-transparent or show blurred background content in dark themes.

Root cause:

- The `.glass` CSS class sets `background: rgba(255,255,255,0.2)` and `backdrop-filter: blur(12px) brightness(0.85)`.
- CSS `!important` overrides in `language.html`'s `<style>` tag can be lost when Tailwind CDN's JIT runtime injects utility styles after the inline `<style>` block, creating cascade order conflicts.
- Tailwind `bg-white/10` utility classes on inner card elements compound the perceived transparency.

Fix (applied 2026-05-03):

- Removed `.glass` class from the outer `.language-study-card` div in `modules/language_view.js`.
- Added `isDarkMode` computed property to `LanguageLearningView` derived from `navSettings.theme`.
- Added `cardStyle(index)` method that returns an inline `style` object with `background: '#000000'` and `color: '#ffffff'` for dark mode, bypassing CSS cascade entirely.
- Feedback states (correct/incorrect) are handled via `cardStyle()` with explicit RGBA values instead of Tailwind class-based semi-transparent overlays.
- Light mode cards retain the `.glass` class and Tailwind feedback classes unchanged.

Relevant files:

- `modules/language_view.js` — `isDarkMode` computed, `cardStyle()` method, card template
- `language.html` — inline `<style>` fallback rules (kept as safety net)

## Vitest Does Not Run

Run:

```bash
npm install
npm test
```

Files:

- `vitest.config.js`
- `tests/storage.test.js`

The initial tests validate storage smoke behavior only.
