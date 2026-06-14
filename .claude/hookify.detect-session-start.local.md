---
name: detect-session-start
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: ^\s*(brief\s+me|orient\s+me|what.?s\s+the\s+(current\s+)?state|session\s+start|start\s+of\s+session|where\s+(are\s+we|did\s+we\s+leave\s+off))\s*[\.!?]?\s*$
action: warn
---

The user wants a session orientation. Invoke the `session-start` skill: run git log --oneline -5, check .claude_plans/ for open items, check .claude/checkpoints/ for incomplete sprints, and return a 5-8 line briefing covering current branch, recent commits, open plans, and any incomplete agent work.
