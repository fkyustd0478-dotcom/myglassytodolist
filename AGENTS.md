# AGENTS.md — Unified AI Dev System (Final Version, v4)

---

#  1. Communication & Execution Style

- **Language:** Always respond in Traditional Chinese
- **Style:** Concise, bullet-pointed, action-oriented
- **No Fluff:** No background explanation unless explicitly requested
- **Clarification First:** If anything is unclear → MUST ask before proceeding

---

#  2. Core Execution Rules (Highest Priority)

##  Diff Enforcement (CRITICAL)

You MUST NOT directly modify files.

You MUST:
1. Produce a unified diff patch
2. Wait for explicit user confirmation
3. Apply changes ONLY after confirmation

---

##  Patch Size Limit

- Max modification per file: 30%
- If exceeded:
  → STOP
  → Propose phased patch plan

---

##  No Opportunistic Refactoring

You MUST NOT:
- Refactor unrelated code
- Rename variables outside scope
- Reformat code
- Improve nearby logic

Only modify what is strictly required.

---

##  Dependency Awareness (MANDATORY)

Before any change, you MUST:

- Identify direct dependencies
- Identify indirect dependencies (shared modules, storage, UI state)

Classify impact:

- LOCAL (single file)
- MODULE (2–3 files)
- SYSTEM (cross-module / shared schema)

If SYSTEM:
→ MUST ask for confirmation before proceeding

---

##  Virtual Execution Check

Before presenting patch, you MUST simulate:

- UI behavior
- Data flow
- Storage impact
- Cross-module interaction

If risk detected:
→ revise patch

---

##  Ambiguity Handling

If ANY of the following is unclear:

- Data format
- Expected behavior
- UI interaction
- Edge cases

You MUST:
- STOP
- Ask clarification
- DO NOT assume

---

#  3. Development Principles

## Simplicity First

- No over-engineering
- No speculative features
- Keep logic flat and readable

---

## Surgical Changes

- Modify only necessary lines
- Preserve original code style (indentation, quotes)
- Avoid unintended side effects

---

## Think Before Coding

Before producing patch, you MUST state:

- Assumptions
- Data scope
- Edge cases

---

## Goal-Driven Execution

Each task MUST include:

- Success criteria
- Verification steps (how to validate correctness)

---

#  4. Data & Schema Protection (CRITICAL)

##  Forbidden Actions

You MUST NOT:

- Modify existing schema fields
- Change field meanings
- Add new fields without explicit instruction
- Guess field semantics

All schemas are treated as stable contracts.

---

## Storage Principle

- Prefer simple array-based JSON
- Avoid complex structures

---

#  5. Testing Rules (STRICT)

Every change MUST include tests (Vitest):

### Required Coverage:

- Happy path
- Edge cases
- Failure scenarios (if applicable)

### Test Constraints:

- Must be executable
- Avoid mock-only validation
- No external dependencies

If test cannot be written:
→ MUST explain why

---

#  6. UI / UX Guidelines

- Maintain existing opacity rules (nav / header)
- Preserve modal interaction flow
- Keep monthly grouping logic (logs/history)
- Must support mobile UX

---

#  7. Date & Time Rules (STRICT)

##  Forbidden

```js
new Date().toISOString().split('T')[0]
````

##  Required

```js
toLocalISO(timestamp)
```

---

## Rules

* `date` → local date string (YYYY-MM-DD)
* `ts` → primary ordering key (Unix ms)

Fallback:

```js
ts || new Date(date + 'T00:00:00').getTime()
```

---

#  8. Architecture & Module Rules

## MUST NOT break:

* StorageProvider behavior
* Module responsibility boundaries
* UI state flow

---

## WorkoutConfig API

```js
WorkoutConfig.getAvailableExerciseCategories()
```

Constraints:

* Requires workout_data.js loaded first
* Only returns sub-categories with ≥1 exercise

---

#  9. Logging System (MANDATORY)

After confirmed patch application:

Append to:

 CodeX.log

---

## Format

```md
## TASK: <name>

### Files Modified
- file1.js

### Changes
- exact modifications

### Reason
- why change was needed

### Risk
Low / Medium / High
```

---

#  10. Commit Simulation (MANDATORY)

Each task MUST include:

```text
type(scope): short description

- What changed
- Why
- Scope
- Risk
```

---

#  11. Rollback Strategy (MANDATORY)

Each patch MUST include:

* How to revert
* Files to restore
* Expected behavior after rollback

---

#  12. Documentation System (DYNAMIC)

After ALL tasks are completed:

---

## Required Output:

###  CONTEXT.md

Must include:

* Real architecture (based on code)
* Module breakdown
* Data flow
* Storage design
* UI system
* Studio system
* Import/export system
* Known limitations
* Troubleshooting

---

###  /docs/

You MUST dynamically generate documentation structure.

NOT restricted to fixed filenames.

Examples (NOT mandatory):

* architecture.md
* storage.md
* ui-system.md
* studio.md
* fx-engine.md
* troubleshooting.md

---

## Rules:

* Reflect actual code only
* No hallucinated features
* Must match CodeX.log

---

#  13. Autonomy Boundaries

You MUST NOT:

* Expand task scope
* Modify architecture
* Introduce backend systems
* Perform global optimizations

---

#  14. Engineering Priority

1. Correctness
2. Stability
3. Minimal patch size
4. Readability
5. Performance (only if safe)

---

#  15. System Philosophy

* Stability > Features
* Traceability > Cleverness
* Minimal Patch > Refactor
* Reality > Assumptions
