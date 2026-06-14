---
name: detect-sprint
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: run\s+a\s+sprint|start\s+a\s+sprint|launch\s+a\s+sprint|sprint\s+(on|for|to)\s+
action: warn
---

Invoking `/sprint`. The user wants to launch a sprint. Invoke the `sprint` skill: decompose the goal into independent domains, dispatch parallel agents (max 4-5 per wave), create a checkpoint manifest, and write agent output to disk incrementally. Before dispatching: if this session has substantial prior work (git log shows recent commits), write a pre-dispatch checkpoint to `.claude/checkpoints/{timestamp}-pre-dispatch/context.md` first.
