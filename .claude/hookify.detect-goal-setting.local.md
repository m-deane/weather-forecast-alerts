---
name: detect-goal-setting
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (my (goal|objective) (for this session|today|this sprint) is|the (goal|objective) (is|for this)|I want to (achieve|accomplish|deliver|ship|complete).{0,60}(by|before|this sprint|end of)|success (looks like|means|criteria|is when)|by end of (sprint|session|today|this week) I want|what I want to get done)
action: warn
---

You have stated an explicit session goal. Inject structured conditions before the first tool call — goals stated without a conditions block are optimised for the average task, not this project.

**Run:** `/goal [implementation|debug|architecture|review]`

This skill chains:
1. `/session-conditioner` — injects L1 (project stack), L2 (sprint phase), and mandatory switch variables
2. `/evidence-injection-template {mode}` — emits a mode-specific pre-filled conditions block
3. `/condition-audit` — verifies L3 is an observable outcome, not a task description

Then, when work is complete: `/goal complete {sprint_id}` runs the completion gate (checkpoint-gate → synthesis-validator).

A goal stated without a conditions block produces work that is locally reasonable but not project-correct. The 60-second setup is always worth it.
