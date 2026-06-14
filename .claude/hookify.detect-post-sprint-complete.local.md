---
name: detect-post-sprint-complete
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (sprint (complete|done|finished|over|wrapped)|all (the |my )?agents? (returned|complete|done|finished)|agents? all (done|complete|returned)|(wave|round) [0-9]+ (complete|done)|synthesis (complete|done|finished)|all [0-9]+ agents (done|complete|returned))
action: warn
---

Sprint complete. Before integrating results, run the calibration retrospective to verify conditions actually governed agent behaviour.

**Run:** `/calibration-retrospective {sprint_id}`

This retrospective scans each agent's checkpoint for:
- **Citations** — did the agent reference its switch variables and constraints?
- **Drift signals** — did the agent say "I assumed..." or "by default I would..."?
- **Violations** — did the agent break any L4 constraints from its Conditions block? (e.g. missing auth scoping, wrong error type, missing input validation)

A sprint that passes lint and tests but fails the calibration retrospective shipped code that coincidentally didn't violate constraints — not code that was guided by them. The distinction matters the next time the same conditions are tested.
