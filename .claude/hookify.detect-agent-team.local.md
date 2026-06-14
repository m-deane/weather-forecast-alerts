---
name: detect-agent-team
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: launch\s+(an?\s+)?agent\s+team|dispatch\s+parallel\s+agents|spin\s+up\s+agents|run\s+agents\s+in\s+parallel|parallel\s+agents|(launch|dispatch|start|run|spin\s+up|create|build)\s+(an?\s+)?agent\s+team
action: warn
---

Invoking `/launch-agent-team`. The user wants to use parallel agent dispatch. Before responding, invoke the `launch-agent-team` skill to load the correct protocol for decomposing this task and launching parallel sub-agents with isolated context, clear file ownership, and no conflicts between agents.
