# SOP_REGISTRY.md
> Standard Operating Procedures for Lapis project development.
> Follow exactly — no improvisation without explicit approval.

---

## SOP-01: Add a Level 2 Modal (Bottom-Sheet)

**When to use:** Primary data-entry modals — task editor, session log, settings form.

**Procedure:**
1. Add the backdrop + shell HTML inside `#app` (Vue template or static HTML).
2. Register an `id` on the backdrop div.
3. Declare a `ref(false)` show state OR call `LapisModal.open('modal-id')`.
4. Wire the close button to `LapisModal.close('modal-id')`.
5. Call `LapisModal.init()` once in `onMounted`.

**Minimal Boilerplate (HTML):**
```html
<div id="my-modal" class="lapis-modal-backdrop"
     style="z-index: var(--z-modal-lv2-backdrop); display:none; align-items:flex-end; justify-content:center">
  <div class="lapis-modal-shell" style="z-index: var(--z-modal-lv2-content)">
    <div class="lapis-modal-header">
      <span class="lapis-modal-title">Title</span>
      <button class="lapis-modal-close" @click="LapisModal.close('my-modal')">✕</button>
    </div>
    <div class="lapis-modal-body"><!-- form fields --></div>
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

## SOP-02: Add a Level 3 Confirmation Dialog

**When to use:** Destructive or irreversible actions — delete, clear bin, reset data.

**Procedure:**
1. Declare a `reactive` confirmModal object (not `ref` — LapisConfirm mutates `.show` directly).
2. Register `LapisConfirm` as a Vue component.
3. Place `<lapis-confirm>` in the template with `v-model`.
4. Trigger via `Object.assign(confirmModal, { show: true, ... })`.

**Minimal Boilerplate:**
```javascript
const confirmModal = reactive({
  show: false, title: '', message: '',
  cancelText: '取消', confirmText: '確認',
  onConfirm: null
});
const askConfirm = ({ title, message, onConfirm }) =>
  Object.assign(confirmModal, { show: true, title, message, onConfirm });

app.component('LapisConfirm', LapisConfirm);
```
```html
<lapis-confirm v-model="confirmModal"></lapis-confirm>
```

**Anti-Patterns:**
- Do NOT use `ref()` for confirmModal — use `reactive()`.
- Do NOT open LapisConfirm via `LapisModal.open()` — it self-renders at LV3.

---

## SOP-03: Mount a Date/Time Picker

**When to use:** Any form field requiring date or time input (dueDate, session time, shift clock).

**Procedure:**
1. Add a container `<div id="picker-container">` inside the LV2 modal body.
2. Declare `showDateTimePicker = ref(false)` and `pickerMode = ref('date')`.
3. Instantiate in `onMounted` (or lazily on first open).
4. Wrap with `v-show="showDateTimePicker"` at `--z-modal-lv3-*`.
5. Call `picker.confirm()` on the OK button.

**Anti-Patterns:**
- Do NOT mount inside `overflow: hidden` — picker wheels will freeze.
- Do NOT nest inside a CSS `transform` ancestor.
- `ITEM_H = 44px` is hardcoded in `lapis_picker.js` — never change `.lapis-picker-item` height.

---

## SOP-04: Add a New Page

**When to use:** Creating a new HTML page in the Lapis navigation system.

**Procedure:**
1. Copy the anti-flash `<script>` block verbatim into `<head>`.
2. Load scripts in order: CDN → `effects.js` → `storage.js` → `nav.js` → `lapis_core_ui.js` → `modules/[page].js`.
3. Add `<div id="app" v-cloak>` as the Vue mount target.
4. Register the page in `lapis_core_ui.js → _pages[]` (key, href, icon, zh, en) and update `_currentKey()`.
5. Call `LapisNav.inject({ bottom: false })` inside `onMounted`.
6. Add a page-specific bottom nav `<nav class="bottom-nav glass">` with the page's own items.
7. Add `[page]_style.css` to `css/`.

**Anti-Patterns:**
- Do NOT forget to add the page to `_pages[]` in `lapis_core_ui.js`.
- Do NOT mix `js/` (shared utilities) with `modules/` (page-specific scripts).
- Do NOT replicate the `manifest.json` bug from todo.html.

---

## SOP-05: Persist Data to localStorage

**When to use:** Any module state that must survive page reload.

**Procedure:**
1. Use `StorageProvider` methods — never call `localStorage.setItem` directly.
2. Wrap load calls in `try/catch`.
3. Save on every mutation via watcher, not on page unload.

**Key mapping:**
| Data | Method |
|---|---|
| Settings | `saveCommonSettings` / `getCommonSettings` |
| Todo | `saveData` / `loadData` |
| Shift calendar | `saveShiftData` / `loadShiftData` |
| Shift config | `saveShiftSettings` / `getShiftSettings` |
| Workout | Direct `lapis_workout` key |

**Anti-Patterns:**
- Do NOT invent keys without adding to `docs/DATA_SCHEMAS.md`.
- Do NOT store blob URLs in localStorage — use `ImageDB`.

---

## SOP-06: Add Bilingual (zh/en) Support

**When to use:** Every user-visible string in any module or shared component.

**Procedure:**
1. Add both `zh` and `en` keys to the module's `translations` / `_wT` object.
2. Expose `t = computed(() => translations[navSettings.lang] || translations.zh)`.
3. Use `{{ t.myKey }}` in templates.
4. Call `LapisNav.refresh(navSettings.lang)` after language toggle.

**Anti-Patterns:**
- Do NOT hardcode strings inline in templates.
- Do NOT add `en` without matching `zh` (and vice versa).

---

## SOP-07: Write Theme-Aware CSS

**When to use:** Any new CSS class that must render correctly on both dark and light themes.

**Procedure:**
1. Write the **dark-theme default** first (unscoped rule).
2. Override for all 7 light themes using explicit body-class selectors.
3. Use CSS variables (`--glass-bg`, `--text-primary`, `--primary`) instead of literal colours.

**Pattern:**
```css
/* Dark default */
.my-component {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  border: 1.5px solid rgba(255, 255, 255, 0.15);
}

/* Light theme overrides */
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

**Light themes (require override):** `light`, `cherry`, `sky`, `seaside`, `sunset`, `mapleavenue`, `waterfall`
**Dark themes (no override):** `dark`, `forest`, `night`, `torii`, `starrysky`, `ferriswheel`

**Anti-Patterns:**
- Do NOT use `!important` on colour/background unless overriding a `.glass` rule.
- Do NOT add `backdrop-filter` without knowing it creates a stacking context.
