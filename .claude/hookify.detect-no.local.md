---
name: detect-no
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: ^\s*(no|no\s+thanks?|no\s+thank\s+you|nope|stop|cancel|abort|never\s+mind)\s*[\.!]?\s*$
action: warn
---

The user is declining the most recently proposed action. Stop immediately. Do not re-propose the action, offer alternatives, suggest next steps, or ask why. Acknowledge with at most one word ("Noted." or "Ok.") and wait.
