---
name: detect-stability-check
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (is this (skill|prompt|condition) (stable|consistent|reliable|deterministic)|test (this|the) (skill|prompt|conditions?)|stability (check|test|score)|does this produce consistent|how (stable|reliable|consistent) is|will this (skill|prompt) (behave|work) (consistently|reliably))
action: warn
---

You are asking about prompt or skill stability. Measure it precisely rather than reasoning about it.

**Run:** `/stability-test [skill-path-or-pasted-text] --runs 3`

This skill dispatches 3 independent measurement agents sequentially (no shared context), tokenises each output, and computes pairwise Jaccard similarity (`|A∩B|/|A∪B|`):

- **≥0.80 → STABLE**: safe to deploy (uncalibrated practitioner heuristic)
- **0.50–0.79 → MARGINAL**: identify variance zone and add condition to the implicated layer
- **<0.50 → UNSTABLE**: missing condition specification — do not deploy
- **<0.30 → BROKEN**: fundamental underspecification — rewrite the implicated layer

Zone localisation maps variance to the condition layer responsible: opening variance → L3; middle variance → L4/L5; conclusion variance → L6. This tells you exactly which condition to add rather than requiring you to guess.
