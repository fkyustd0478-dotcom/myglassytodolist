# DATA_SCHEMAS.md
> All localStorage keys, JSON structures, and IndexedDB usage for the Lapis project.

---

## localStorage Keys

| Key | Owner | Type |
|---|---|---|
| `todo_settings` | nav.js / setting.js | Object (settings) |
| `todo_data` | todo.js | Object `{todos[], lists[]}` |
| `glassy_shift_data` | shift.js | Object keyed by `YYYY-MM-DD` |
| `glassy_shift_settings` | shift.js | Object (tags, jobs, payday) |
| `lapis_workout` | workout.js | Object `{logs[]}` |
| `lapis_workout_metrics` | workout.js | Object `{weights[], personalBests[]}` |
| `lapis_workout_library` | workout.js | Array of exercise objects |
| `lapis_workout_categories` | workout.js | Array (3-level category tree) |

---

## `todo_settings`
```jsonc
{
  "theme": "light",                // "system" | theme-name
  "lang": "zh",                    // "en" | "zh"
  "notificationsEnabled": false,
  "effect": "none",                // "none" | "cherry" | "rain" | "snow"
  "useCustomBg": false,
  "customBg": "",                  // object URL from IndexedDB blob
  "customBgOpacity": 0.5,
  "calendarInfoEnabled": true,
  "showHolidayTags": true,
  "showLunarDates": true
}
```

## `todo_data`
```jsonc
{
  "todos": [{
    "id": "uuid-string",
    "text": "Task content",
    "category": "urgent",          // "urgent"|"important"|"normal"|"daily"|"memo"
    "recurring": "none",           // "none"|"daily"|"weekly"|"monthly"
    "dueDate": "2026-04-24T09:00:00.000Z",
    "alertMinutes": 0,
    "completed": false,
    "isDeleted": false,
    "listId": "default",
    "createdAt": 1745000000000
  }],
  "lists": [{
    "id": "default",
    "name": "預設",
    "isDefault": true
  }]
}
```

## `glassy_shift_data`
```jsonc
{
  "2026-04-24": {
    "shiftIds": ["tagId1"],        // shift tag IDs for this day
    "payIds": ["jobId1"],          // job IDs that earn on this day
    "note": "備註"
  }
}
```

## `glassy_shift_settings`
```jsonc
{
  "shiftTags": [{ "id": "", "name": "", "startTime": "09:00", "endTime": "18:00", "color": "#3b82f6" }],
  "otherTags":  [{ "id": "", "name": "", "color": "#...", "icon": "star", "date": "2026-04-24" }],
  "jobs":       [{ "id": "", "name": "", "color": "#...", "method": "hourly", "rate": 0, "units": null, "payDay": 15, "holidayLogic": "postpone" }],
  "payday":     { "day": 15, "display": true, "holidayLogic": "postpone" }
}
```

## `lapis_workout`
```jsonc
{
  "logs": [{
    "id": "uuid",
    "date": "2026-04-24",
    "time": { "hour": 18, "minute": 30 },
    "exercises": [{
      "name": "Bench Press",
      "nameZh": "臥推",
      "type": "sets",              // "sets" | "duration"
      "categories": ["胸", "推"],
      "sets": [{ "reps": 10, "numSets": 3, "weight": 60, "done": true }],
      "isCompleted": true
    }],
    "isDeleted": false
  }]
}
```

## `lapis_workout_metrics`
```jsonc
{
  "weights": [{ "date": "2026-04-24", "weight": 70.5, "unit": "kg" }],
  "personalBests": [{ "name": "Bench Press", "nameZh": "臥推", "weight": 80, "reps": 5, "numSets": 3, "date": "2026-04-24" }]
}
```

## `lapis_workout_library`
```jsonc
[{
  "id": "uuid",
  "name": "Bench Press",
  "nameZh": "臥推",
  "type": "sets",
  "unit": "kg",
  "categories": ["胸", "推", ""],  // L1, L2, L3 (3-level hierarchy)
  "description": "",
  "targetMuscles": "",
  "order": 0
}]
```

## `lapis_workout_categories` (3-level tree)
```jsonc
[{
  "name": "Bodybuilding",
  "nameZh": "健美",
  "children": [{
    "name": "Push",
    "nameZh": "推",
    "children": [
      { "name": "Chest", "nameZh": "胸部", "children": [] }
    ]
  }]
}]
```

---

## IndexedDB (Image Blobs)

- **Database:** `glassy-todo-blobs`
- **Store:** `images`
- **API:**
  ```javascript
  ImageDB.saveBlob(id, blob)
  ImageDB.getBlob(id)      // → Blob | null
  ImageDB.deleteBlob(id)
  ```
- **Usage:** Custom background images — stored as blobs to survive page reloads. Object URLs are re-created on every page load from the blob.

---

## Rules

- Never invent new localStorage keys without adding them to this file.
- Never store blob/object URLs in localStorage — use IndexedDB via `ImageDB`.
- Always wrap `JSON.parse(localStorage.getItem(...))` in `try/catch`.
- Use `StorageProvider` methods (storage.js) instead of calling `localStorage` directly.
