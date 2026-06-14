---
name: detect-safe-push
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: git\s+push|push\s+to\s+(origin|remote|main|master|HEAD|[a-zA-Z0-9/_-]+\s*$)|push\s+the\s+branch|push\s+this|deploy\s+to|ship\s+it|push\s+and\s+deploy
action: warn
---

Before pushing or deploying, invoke the `safe-push` skill to verify the target remote with `git remote -v`, confirm it with the user, run the quality gate (lint + tests), and only then push to the named remote. Never assume `origin` is the correct remote.
