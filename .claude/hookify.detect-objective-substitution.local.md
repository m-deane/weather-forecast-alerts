---
name: detect-objective-substitution
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: L3 Objective\s*:\s*(implement|create|build|add|update|write|refactor|migrate|convert|fix).{5,200}
action: warn
---

Your L3 Objective contains a task description, not an observable outcome.

**The distinction:**

| Bad (task description) | Good (observable outcome) |
|------------------------|--------------------------|
| `L3 Objective : Implement the [feature] module` | `L3 Objective : Agent produces [feature] module such that all operations are auth-scoped, tests pass with 0 regressions, and lint exits 0` |
| `L3 Objective : Fix the auth bug` | `L3 Objective : Agent produces a root cause statement of the form "bug occurs because X at file:line" such that applying the fix causes the symptom to stop occurring` |
| `L3 Objective : Add a [field] to [model]` | `L3 Objective : Agent produces schema migration and handler update such that [field] is queryable, all handlers include [field] in response shape, and 0 existing tests regress` |

**Why this matters:** An agent whose L3 is a task description has no way to verify its own done-ness. It stops when the task *sounds* done from the task description — not when the outcome is demonstrably achieved. An agent whose L3 is an observable outcome can self-check: "have I produced X such that Y?" A task list cannot be self-checked.

**Rewrite L3 as:** `Agent produces {artifact} such that {externally verifiable condition}` — where the verifiable condition is something a third party (or a test runner) could confirm without reading the agent's reasoning.

This pairs with the `detect-missing-l3` hookify rule (which catches L3 absent) — together they ensure L3 is both present and an objective function, not a task description.
