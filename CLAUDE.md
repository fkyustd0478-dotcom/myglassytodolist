# CLAUDE.md - AI Behavioral & Coding Standards

## 1. Communication & Logic
* **Language:** Always respond in **Traditional Chinese**.
* **Style:** Concise, bullet-pointed, and action-oriented.
* **No Fluff:** Do not provide background knowledge unless requested; focus on executable results.
* **Clarification:** If requirements are ambiguous, **ask before implementing**.

## 2. Core Development Principles
* **Simplicity First:**
    * Avoid over-engineering or speculative features (no unrequested caching, validation, or complex patterns).
    * Keep logic flat and readable. Refactor only when complexity is a verified requirement.
* **Surgical Changes:**
    * **No Style Drift:** Match existing code style (quotes, indentation, type hints). Do not reformat unrelated lines.
    * **Precise Fixes:** Only modify lines directly relevant to the task. Avoid "drive-by" refactoring.
* **Think Before Coding:**
    * Explicitly state assumptions regarding data scope, formats, and edge cases before writing code.
* **Goal-Driven Execution:**
    * Define success criteria for every task.
    * Include verification steps (e.g., "Run X to verify Y").

## 3. Technical Standards
* **Data Integrity:**
    * Always follow the established schema configuration and row-building logic.
    * Do not guess field meanings or invent new data fields.
    * **Storage:** Prefer simplified array-based JSON formats to minimize footprint.
* **UI/UX Guidelines:**
    * **Transparency:** Maintain specific opacity rules for navigation menus and frozen headers as previously defined.
    * **Component Logic:** Ensure new entries and historical logs follow the existing modal and monthly grouping structures.
* **Naming:** Use semantic naming. Avoid generic terms like `data`, `temp`, or `item` unless contextually appropriate.

## 4. Data Schemas

### Weight Record (`lapis_workout_metrics` → `weights[]`)
```json
{ "date": "2026-04-26", "weight": 70.5, "unit": "kg", "ts": 1745625600000 }
```
* `date` — local calendar date string `YYYY-MM-DD` (derived from device clock, NOT UTC)
* `ts` — Unix timestamp in ms; primary source of truth for time ordering; backward-compatible (old records without `ts` are read from `date + 'T00:00:00'` local time)

### Date Utility Rule
* **Never** use `new Date().toISOString().split('T')[0]` for local date strings — this returns UTC date and causes rollback bugs in UTC+8 between midnight and 08:00.
* **Always** use `toLocalISO(timestamp)` (defined in `js/lapis_core_ui.js`, exposed as `window.toLocalISO`) for all local date string generation.
* `toLocalISO` uses `getFullYear()` / `getMonth()+1` / `getDate()` which respect the device timezone.
* Safe date-only string → Date object: `new Date('YYYY-MM-DDT00:00:00')` (with time, no timezone suffix) → LOCAL midnight per ECMAScript spec.

## 5. Workflow & Verification
1.  **Understand:** Analyze requirements and clarify ambiguities.
2.  **Propose:** Provide implementation plans before modifying files.
3.  **Diff Only:** Never overwrite files blindly; present a `diff` and wait for confirmation.
4.  **Test:** Every change must include unit tests (using `Vitest`) covering happy paths and edge cases.
