# Date Logic & Initialization

> **Relevant files**: `js/lapis_core_ui.js` (`toLocalISO`), `modules/workout_metrics.js` (form init), `modules/workout.js` (`openWeightDatePicker`), `js/lapis_picker.js` (`LapisDatePicker`)

---

## Bug 1 — UTC Date Rollback (Midnight Rollback in UTC+8)

### Root Cause

`new Date().toISOString()` returns the UTC representation. In UTC+8, the local clock reads `2026-04-26 00:30` but UTC is `2026-04-25 16:30` — `toISOString().split('T')[0]` yields `"2026-04-25"` (yesterday).

### Fix

`window.toLocalISO(ts)` in `js/lapis_core_ui.js`:

```javascript
function _toLocalISO(ts) {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
window.toLocalISO = _toLocalISO;
```

Uses `getFullYear/getMonth/getDate` which respect the device timezone.

### Rule

- **Never** `new Date().toISOString().split('T')[0]`
- **Always** `toLocalISO(Date.now())` for local date strings

---

## Bug 2 — Picker Shows 1970/01/01 on Open

### Root Cause

`LapisDatePicker` / `LapisPickerManager` use `scrollTop` to position the drum-roll wheel. `scrollTop` assignments on hidden elements (`display:none` via `v-show=false`) are silently ignored by the browser — the wheel stays at scroll position 0, which is index 0 = year 1970 / month 1 / day 1.

### Old (Broken) Pattern

```javascript
const openPicker = () => {
    picker.setValue(y, m, d);        // ❌ element still hidden → scrollTop no-op
    showPicker.value = true;
};
```

### Fix

Show the container first, then `nextTick` to set value after Vue has rendered the element into the DOM:

```javascript
const openPicker = () => {
    showPicker.value = true;         // element becomes visible
    nextTick(() => {
        picker.setValue(y, m, d);   // ✅ scrollTop works on visible DOM
    });
};
```

### Applied Location

`modules/workout.js` → `openWeightDatePicker()`.

---

## Form Initialization Rule

Always initialize reactive forms with valid date + timestamp values:

```javascript
// workout_metrics.js
const weightForm = reactive({
    weight: '',
    unit:   'kg',
    date:   _todayStr(),    // → toLocalISO(Date.now()) — never ''
    ts:     Date.now(),     // never 0 or null
});
```

A falsy `date` causes the picker fallback to epoch; a falsy `ts` causes sort ordering to break.

---

## Unix Timestamp (`ts`) Storage Rule

Every persisted record with a `date` string must carry a `ts` field (Unix ms).

```json
{ "date": "2026-04-26", "weight": 70.5, "unit": "kg", "ts": 1745625600000 }
```

- `ts` is the **primary ordering key** — sort by `ts`, not `date` string
- `date` is for display only
- **Backward-compat read**: `ts || new Date(date + 'T00:00:00').getTime()`
  - `'YYYY-MM-DDT00:00:00'` (no timezone suffix) → ECMAScript spec: LOCAL midnight

---

## Safe Date String → Date Object

```javascript
// ✅ Correct — local midnight
new Date('2026-04-26T00:00:00').getTime()

// ❌ Wrong — UTC midnight, off by tz offset
new Date('2026-04-26').getTime()
```

Always append `T00:00:00` (no `Z`) when constructing a Date from a date-only string.
