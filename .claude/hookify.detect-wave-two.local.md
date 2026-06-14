---
name: detect-wave-two
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (wave 2|second wave|next wave|dispatch wave 2|launch wave 2|wave two|wave-2)
action: warn
---

You are about to dispatch wave 2+ agents. Before proceeding, write a condition summary to lock in the operative conditions for all subsequent agents.

**Why this is required**: As the original goal statement recedes in context distance, each wave-2+ agent's posterior drifts back toward its training prior. A compact condition summary is the minimum sufficient evidence package to keep all subsequent agents anchored to the correct update. Without it, wave 2 agents may silently re-interpret the objective or relax constraints that wave 1 locked in.

**Write this file before dispatching wave 2:**

File path: `.claude/checkpoints/{sprint_id}/condition-summary.md`

Fill in every field:

```
Sprint: {sprint_id}
Generated after: wave {N-1} completion

Jurisdiction: {governing rule set — read from CLAUDE.md Stack line; e.g. "all patterns from CLAUDE.md"}
Objective: {one sentence — the observable end state, not the task description}
Switch variables: {var: assumption | var: assumption | ...}
Completed: {what wave N-1 produced — files created, decisions locked in}
Remaining: {what wave N must accomplish}
Constraints unchanged: {list any L4 constraints that wave N agents must not relax}
```

**Then include this line in every wave 2+ agent prompt:**

> Read `.claude/checkpoints/{sprint_id}/condition-summary.md` before acting. The conditions in that file override any assumptions you would make from the task description alone.

Do not re-paste the full original goal into wave 2+ prompts — the condition summary is the canonical reference.
