# UI System

Last updated: 2026-05-01

## Design Language

The app uses a glassmorphism style based on existing CSS variables, blurred surfaces, rounded modal shells, and fixed bottom navigation.

## Main CSS Files

- `css/shared_theme.css`: global theme variables and background layers.
- `css/lapis_shared_style.css`: shared nav, modal, buttons, z-index scale.
- `css/style.css`: todo/dashboard/stats shared layout.
- `css/shift_style.css`: shift calendar and tags.
- `css/workout_style.css`: workout layout.
- `css/lapis_studio.css`: Studio drawer and controls.

## Z-Index

Defined in `css/lapis_shared_style.css`:

- `--z-nav`
- `--z-modal-lv2-backdrop`
- `--z-modal-lv2-content`
- `--z-modal-lv3-backdrop`
- `--z-modal-lv3-content`
- `--z-top-overlay`

Use these variables instead of hardcoded z-index values.

## Navigation

`LapisNav` injects the top capsule navigation. Each page owns its own bottom navigation.

`useNav()` provides:

- `navSettings`
- `currentPageTitle`
- `toggleNavDropdown`
- theme helpers
- custom background style

## Modal System

`LapisModal` works with `.lapis-modal-backdrop` and `.lapis-modal-shell`.

API:

- `LapisModal.init()`
- `LapisModal.open(id)`
- `LapisModal.close(id)`
- `LapisModal.closeTop()`

Close animations are CSS-driven with the `is-closing` class.

## i18n

`LapisI18n` provides:

- `t(key, params, lang)`
- `setLang(lang)`
- `getLang()`
- `use(state)`
- `register(lang, entries)`

Existing page dictionaries are registered into this central runtime but local fallback dictionaries remain.

## Auth UI

`setting.html` includes a User Profile block with Google login, email/password login, logout, and local nickname/birthday fields. The Google login action uses a visible Google "G" mark and clear "Login with Google" text.

## Motion

Motion is intentionally subtle:

- Modal open/close transitions.
- Navigation item transform/opacity transitions.
- Studio FX drawer entry and category slide transitions.

Do not redesign page structure when tuning motion.
