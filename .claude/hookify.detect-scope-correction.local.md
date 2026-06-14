---
name: detect-scope-correction
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: sorry\s+i\s+meant|i\s+meant\s+(the\s+)?whole|actually\s+i\s+meant|correction[,:]?\s+i\s+meant|i\s+should\s+have\s+said
action: warn
---

The user is correcting the scope or target of the most recently executed action. Identify that action in context, discard the incorrect scope, and re-execute using the corrected target now specified. Do not ask for confirmation unless the corrected action hits the reversibility gate (deletion, git push, external API). Acknowledge the correction in one sentence before re-executing.
