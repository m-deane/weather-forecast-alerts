---
name: detect-context-saturation
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (wave ([3-9]|\d{2,})|final wave|next wave|all agents (done|complete|finished)|after all (agents|waves)|sprint complete|resume sprint|dispatch wave [3-9])
action: warn
---

You are in a long-running multi-wave sprint. Context saturation is a risk — earlier tool output and file reads may be crowding out operative conditions.

**Run:** `/context-budget`

This skill estimates context consumption and recommends one of:
- **Proceed**: headroom is adequate for the next wave
- **Prune**: stale tool output should be summarised before dispatching more agents
- **Checkpoint and resume**: context is near saturation — write a pre-dispatch checkpoint and use `/resume` to continue in a fresh session

Skipping this check in a late wave is the most common cause of condition decay — agents receive degraded operative context and drift from the original objective.
