# DATA_FORMAT.md — Lapis System Data Schema Reference

All data is stored in browser **localStorage** (and IndexedDB for blob assets).
No server-side storage is used.

---

## Storage Keys

| Key | Page | Description |
|-----|------|-------------|
| `todo_data` | Todo | Task lists and todo items |
| `todo_settings` | All | Shared UI settings (theme, lang, …) |
| `glassy_shift_data` | Shift | Shift records and salary data |
| `glassy_shift_settings` | Shift | Shift-specific settings (tags, rates) |
| `lapis_workout` | Workout | Session logs and categories |
| `lapis_workout_library` | Workout | Custom exercise library |
| `lapis_workout_metrics` | Workout | Body weight history |
| `lapis_workout_categories` | Workout | Category tree (user-defined) |

---

## 1. Body Weight — `lapis_workout_metrics`

```json
{
  "weights": [
    {
      "date": "2026-04-26",
      "weight": 70.5,
      "unit": "kg",
      "ts": 1745625600000
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `date` | `string` | Local calendar date `YYYY-MM-DD` (device timezone, NOT UTC) |
| `weight` | `number` | Numeric value |
| `unit` | `string` | `"kg"` or `"lbs"` |
| `ts` | `number` | Unix timestamp ms — primary sort key; back-compat read: `new Date(date + 'T00:00:00').getTime()` |

**Rule**: Never derive `date` from `new Date().toISOString().split('T')[0]` — use `toLocalISO(Date.now())` (UTC+8 safe).

---

## 2. Workout Sessions — `lapis_workout`

```json
{
  "version": 1,
  "categories": [],
  "logs": [
    {
      "id": "abc123",
      "date": "2026-04-26",
      "isDeleted": false,
      "exercises": [
        {
          "name": "Bench Press",
          "type": "sets",
          "sets": [
            { "reps": 10, "weight": 60, "numSets": 3 }
          ]
        },
        {
          "name": "Treadmill",
          "type": "cardio",
          "duration": 30,
          "distance": 5
        }
      ]
    }
  ]
}
```

### `logs[]` entry

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique ID (`_wUid()` — base-36 timestamp + random) |
| `date` | `string` | Local date `YYYY-MM-DD` |
| `isDeleted` | `boolean` | Soft-delete flag (default `false`) |
| `exercises` | `array` | Ordered list of exercise entries |

### `exercises[]` — type `"sets"` (strength)

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Exercise name (matches library) |
| `type` | `"sets"` | Strength exercise type |
| `sets` | `array` | Array of set objects |
| `sets[].reps` | `number` | Reps per set |
| `sets[].weight` | `number` | Load in kg (or lb) |
| `sets[].numSets` | `number` | Number of identical sets (default `1`) |

### `exercises[]` — type `"cardio"`

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Exercise name |
| `type` | `"cardio"` | Cardio exercise type |
| `duration` | `number` | Minutes |
| `distance` | `number` | km (optional) |

---

## 3. Exercise Library — `lapis_workout_library`

```json
[
  {
    "id": "ex_abc",
    "name": "Bench Press",
    "nameZh": "臥推",
    "category": "Chest",
    "type": "sets"
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique ID |
| `name` | `string` | English name |
| `nameZh` | `string` | Chinese name (optional) |
| `category` | `string` | Sub-category name (e.g. `"Chest"`, `"Back"`) |
| `type` | `"sets"` \| `"cardio"` | Exercise type |

---

## 4. Todo Tasks — `todo_data`

```json
{
  "todos": [
    {
      "id": "t_abc",
      "text": "Buy groceries",
      "category": "normal",
      "completed": false,
      "dueDate": "2026-04-26",
      "dueTime": "18:00",
      "listId": "default",
      "isDeleted": false,
      "recurring": "none",
      "ts": 1745625600000
    }
  ],
  "lists": [
    { "id": "default", "name": "Default" },
    { "id": "work",    "name": "Work" }
  ]
}
```

### `todos[]` entry

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique ID |
| `text` | `string` | Task title |
| `category` | `"normal"` \| `"important"` \| `"urgent"` \| `"memo"` | Priority |
| `completed` | `boolean` | Completion state |
| `dueDate` | `string \| null` | Local date `YYYY-MM-DD` |
| `dueTime` | `string \| null` | `"HH:MM"` 24h |
| `listId` | `string` | References `lists[].id` |
| `isDeleted` | `boolean` | Soft-delete / recycle-bin flag |
| `recurring` | `"none"` \| `"daily"` \| `"weekly"` \| `"monthly"` | Recurrence |
| `ts` | `number` | Creation timestamp Unix ms |

### `lists[]` entry

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | `"default"` / `"personal"` / `"work"` are built-in; custom lists use `"list-<base36>"` |
| `name` | `string` | Display name |

---

## 5. Shared Settings — `todo_settings`

```json
{
  "theme": "light",
  "useCustomBg": false,
  "customBg": "",
  "customBgOpacity": 0,
  "lang": "zh",
  "effect": "none",
  "notificationsEnabled": true,
  "calendarInfoEnabled": true,
  "showHolidayTags": true,
  "showLunarDates": true,
  "showWeightChart": true,
  "workoutCatCharts": { "Chest": true }
}
```

`workoutCatCharts`: missing key = visible (default on); `false` = hidden.
Valid `theme` values: `light`, `dark`, `system`, `cherry`, `sky`, `sunset`, `sea`, `seaside`, `forest`, `night`, `torii`, `waterfall`, `ferriswheel`, `starrynight`, `orange`, `purple`, `cherrrypink`, `skyblue`, `grassgreen`, `beige`, `lightgrey`, `lavender`.

---

## Importing Data (Developer Guide)

1. Open **DevTools → Application → Local Storage → your-origin**
2. Click the target key
3. Paste valid JSON in the value column
4. Reload the page — data is applied immediately

For blob assets (custom background images), use **IndexedDB** → `glassy-todo-blobs` → `images` store, key `"custom-bg"`.

---

## Date Rule (Critical)

> See [`docs/date_logic.md`](./date_logic.md) for full details.

- `date` strings are always **local timezone** `YYYY-MM-DD`
- `ts` is Unix ms — the **primary ordering key**
- Back-compat read: `ts || new Date(date + 'T00:00:00').getTime()`
- Never use `new Date().toISOString().split('T')[0]` — returns UTC date
