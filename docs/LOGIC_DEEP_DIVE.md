# LOGIC_DEEP_DIVE.md
> Complex algorithm and business logic explanations for the Lapis project.

---

## Workout: Personal Best (PR) Calculation

**File:** `modules/workout_metrics.js` → `useWorkoutMetrics()`

**Algorithm:**
1. Iterate all non-deleted session logs (`wData.logs.filter(l => !l.isDeleted)`).
2. For each exercise entry in each session, extract `{ name, nameZh, weight, reps, numSets, date }`.
3. Track the maximum `weight` per exercise key (`name` field, case-sensitive).
4. Emit the set with the highest weight as the Personal Best.
5. Sort results alphabetically by display name (zh if lang=zh, else en).

**PR History (`getPRProgression`):**
- For a given exercise key, collect ALL sets from all logs (not just the max).
- Filter to only "breakthrough" entries — sets where `weight > previous best at that point in time`.
- Sort chronologically, return the last 5 milestones.

**Gotcha:** PR is based on `weight` only (not `weight × reps`). Two exercises with the same `name` but different `nameZh` are treated as the same exercise.

---

## Shift: Salary Calculation

**File:** `modules/shift.js` → `calcMonthSalary()`

**Method types:**
| `method` | Calculation |
|---|---|
| `hourly` | `rate × hoursPerShift × workDays` |
| `daily` | `rate × workDays` |
| `monthly` | `rate` (flat, regardless of days worked) |

**Holiday logic (`holidayLogic`):**
- `postpone` — payday moves to next working day if it falls on a holiday.
- `prepone` — payday moves to previous working day.
- `exact` — payday always on the configured day, no adjustment.

**Payday display:** `glassy_shift_settings.payday.display` controls whether the payday indicator dot appears on the calendar grid.

---

## Todo: Recurring Task Generation

**File:** `modules/todo.js`

**Trigger:** On every page load, `checkRecurring()` runs to materialise any overdue recurring tasks.

**Rules:**
- `daily` — creates a new instance if no active instance exists for today's date.
- `weekly` — creates if no instance exists for this ISO week number.
- `monthly` — creates if no instance exists for this calendar month.
- The original task is never deleted — new instances are cloned with a fresh `id` and `createdAt`.
- Completed or deleted instances are ignored when checking if "an instance exists".

---

## Nav: Theme Resolution

**File:** `js/nav.js` → `resolvedTheme` (computed)

**Priority chain:**
1. If `navSettings.theme === 'system'`, query `window.matchMedia('(prefers-color-scheme: dark)')`.
2. Map to `'dark'` or `'light'`.
3. All other theme names pass through directly.

**`isDarkTheme`:** Returns `true` for `dark`, `forest`, `night`, `torii`, `starrysky`, `ferriswheel`.

**`glassStyle`:** Computed object binding that provides `backgroundColor`, `border`, `color`, `backdropFilter` — values differ between dark and light themes to maintain contrast and legibility.

---

## LapisNav: Page Detection

**File:** `js/lapis_core_ui.js` → `_currentKey()`

```javascript
const file = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
if (file.includes('todo'))    return 'todo';
if (file.includes('shift'))   return 'shift';
if (file.includes('workout')) return 'workout';
if (file.includes('setting')) return 'setting';
return 'home';   // catches index.html and any unrecognised path
```

**Order matters:** `todo` must be checked before `home` to avoid false matches. The `includes()` approach is intentional — it handles both `todo.html` and `todo.html?v=2` query strings.

---

## Workout: Exercise Library Hierarchy

**File:** `modules/workout_library_ui.js`

The category tree is 3 levels deep: `L1 → L2 → L3`. Exercises can be tagged to any level.

**`_subtreeNames(node)`:** Recursively collects all descendant names (including the node itself). Used to filter exercises when a user selects an L1 or L2 category — exercises in any sub-category are included.

**`catPillStyle(name)`:** Assigns a colour from `_catColors[8]` by hashing the category name to an index (`indexOf(name) % 8`). This is deterministic — the same name always maps to the same colour across sessions.

---

## Glassmorphism Stacking Context Rule

`backdrop-filter` unconditionally creates a new CSS stacking context (like `transform`, `opacity < 1`, `filter`). This means z-index set on a *child* of a `.glass` element is scoped to that stacking context and cannot exceed the stacking context's z-index in the parent tree.

**Implication:** If a `.glass` container has no explicit `z-index`, its children cannot reliably appear above sibling `.glass` elements even with very high z-index values.

**Rule:** Always set `z-index` explicitly on the `.glass` element itself, not just on its children. Use the CSS variables from `lapis_shared_style.css` (see CONTEXT.md §2).
