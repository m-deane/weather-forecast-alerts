---
name: detect-pre-skill-ship
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (ship|merge|publish|finaliz|push|sync).{0,40}(skill|SKILL\.md|\.claude/skills/)
action: warn
---

You are about to ship a skill change. Before merging or syncing, verify it does not regress existing reference inputs.

**Run:** `/skill-regression-test [skill-name]`

Why this is required: A change motivated by one failing case frequently regresses other cases that the failing case did not exercise. A single passing test is insufficient evidence that a skill change is safe to ship — `/skill-regression-test` compares against the full reference input library and classifies diffs as STABLE / DIFFERENT / BROKEN before you commit.

If no reference inputs exist yet: create them in `.claude/regression/{skill-name}/inputs/` before shipping, so future changes have a baseline to compare against.
