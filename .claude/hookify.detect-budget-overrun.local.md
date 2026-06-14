---
name: detect-budget-overrun
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (L1 Jurisdiction|L1\s+Jurisdiction).{0,2000}(Switch variables|Switch\s+variables)
action: warn
---

You have written a full conditions block (L1 through Switch variables). Before dispatching, verify the condition budget is within effective range.

**Run:** `/condition-budget-auditor [conditions-block-or-file]`

Why this matters: The top 5 conditions capture ~95% of reducible entropy. Beyond 7 total conditions, signal dilution sets in — each additional condition competes for attention weight, reducing the probability that load-bearing conditions hold through the full context.

The auditor classifies each condition as:
- **MANDATORY** — one of the project-critical switch variables declared in `CLAUDE.md` → `## Critical Patterns` (read this section first; if absent, ask the user to declare them)
- **DISCRIMINATING** — removing it would produce a categorically different or broken implementation
- **FILLER** — removing it changes nothing about the output

It also flags **OVER-SPECIFIED** (>7 conditions) and checks that all mandatory switch variables are present. A budget-overrun prompt is worse than a lean one — more conditions means more filler, not more signal.
