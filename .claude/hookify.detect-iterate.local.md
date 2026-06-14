---
name: detect-iterate
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (\d+\s+)?(iteration\s+cycles?|improvement\s+(iterations?|loops?|cycles?)|separate\s+iteration\s+cycles?)|iterate\s+through\s+(\d+\s+)?cycles?|improve\s+through\s+(\d+\s+)?loops?|run\s+(\d+\s+)?improvement\s+iterations?|cycle\s+through\s+improvements?|(test|improve|iterate)\s+iteratively|iteratively\s+(improve|test|refine|optimis?e)
action: warn
---

The user wants a multi-cycle iterative improvement loop. Invoke the `qa-iterate` skill.

Before dispatching: extract the number N from the user's message if present (e.g. "5 cycles", "3 iterations", "through 4 loops") and pass it as `--cycles N` to the skill. If no number is present, use the default (5 cycles).

Read CLAUDE.md to infer the app and stack before generating success criteria.
