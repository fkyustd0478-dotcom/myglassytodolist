# Navigation Engine

> **Where it lives**: `js/core_engine.js` (`LapisCore.navigate`, `LapisCore.Maps`)
> **CSS**: `css/shared_theme.css` (`@view-transition { navigation: auto; }`)

---

## Overview

`LapisCore` provides SPA-style navigation that wraps `window.location.href` inside the **View Transitions API** (`document.startViewTransition`). This gives animated cross-page transitions without needing a full SPA framework or Vue Router.

---

## View Transitions API

### `document.startViewTransition(callback)`

The browser:
1. Captures a screenshot of the **current state**
2. Executes `callback` (synchronously updates the DOM / triggers navigation)
3. Animates from the captured screenshot to the new state using a default cross-fade

When `callback` triggers `window.location.href = url`, the exit animation plays until the new page starts loading. The new page's entry animation plays when it finishes loading.

**Browser support**: Chrome 111+, Edge 111+, Safari 18.2+. Falls back gracefully to immediate navigation.

### Cross-Document Transitions (CSS-only, no JS needed)

```css
/* css/shared_theme.css */
@view-transition { navigation: auto; }
```

This opt-in declaration enables automatic cross-page transitions for **same-origin navigations**. Both the outgoing and incoming pages need this rule for a bidirectional animation. Requires Chrome 126+ / Safari 18.2+.

---

## `LapisCore.navigate(url)` Implementation

```javascript
function navigate(url) {
    if (!url || url.charAt(0) === '#') return;
    if (typeof document.startViewTransition === 'function') {
        document.startViewTransition(() => { window.location.href = url; });
    } else {
        window.location.href = url;
    }
}
```

`Maps` is an alias for `navigate` (per the original spec naming).

---

## Global Link Interception

`core_engine.js` installs a single delegated `click` listener on `document` that intercepts `<a href>` clicks for same-origin relative URLs and routes them through `navigate()`:

```javascript
document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    // Skip: fragments, absolute URLs, external links, _blank targets
    if (!href || href.startsWith('#') || href.startsWith('http') ||
        href.startsWith('mailto') || href.startsWith('tel') ||
        anchor.target === '_blank') return;
    e.preventDefault();
    navigate(href);
});
```

This gives every page link a smooth transition animation for free.

---

## Theme Swap with View Transition

Theme changes also use `_runTransition` inside `LapisCore.applyTheme`:

```javascript
function _runTransition(syncCallback) {
    if (typeof document.startViewTransition === 'function') {
        document.startViewTransition(syncCallback);
    } else {
        syncCallback();
    }
}
```

The transition captures the current background state, then the callback:
1. Updates `--lapis-dynamic-bg` via style tag
2. Forces GPU flush via `offsetHeight` reflow
3. Swaps `.active` class between layers A and B

The browser animates between the captured screenshot and the new rendered state.

---

## Lifecycle Summary

```
User clicks link / LapisCore.navigate(url) is called
        │
        ▼
document.startViewTransition available?
  ├── YES → startViewTransition(() => location.href = url)
  │         Browser captures screenshot → plays exit animation
  │         New page loads → entry animation plays
  └── NO  → window.location.href = url (immediate)
```

---

## Future: Full Fetch-Based SPA

The current implementation uses `location.href` inside the transition. A true fetch-based SPA approach (inject HTML into `#app`, re-run module script) is deferred because Vue 3 CDN apps require explicit `app.unmount()` before re-mounting, which needs lifecycle coordination across all 6 page modules. The groundwork (`LapisCore.navigate` + link interception) is already in place for this upgrade.
