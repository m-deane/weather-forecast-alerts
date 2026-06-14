---
name: detect-debug-without-conditions
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (debug|diagnose|investigate|troubleshoot|why (is|does|did|isn't|doesn't|didn't)).{0,60}(bug|error|issue|fail|crash|broken|wrong|not working|unexpected)
action: warn
---

Invoking `/evidence-injection-template debug`. You are starting a debugging session. Before dispatching a diagnostic agent, inject structured evidence so the agent starts at the right layer — not at the wrong hypothesis.

**Run:** `/evidence-injection-template debug`

This template pre-fills:
- **last-known-good-state** — when did it last work?
- **minimal-repro-path** — exact steps to reproduce
- **already-ruled-out** — what you have already checked (prevents the agent from re-investigating dead ends)
- **exact-error** — the precise error message or symptom
- **hypothesis-being-tested** — your current best guess, so the agent confirms or refutes it rather than starting from scratch

An agent given these 5 fields diagnoses in one pass. An agent given only "it's broken" diagnoses in three — if it converges at all.
