---
name: detect-wrong-skill
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: wrong\s+skill|not\s+that\s+(one|skill)|that'?s?\s+not\s+what\s+I\s+meant|I\s+meant\s+/\w+|use\s+/\w+\s+instead
action: warn
---

The user is correcting a skill selection. Stop the current skill workflow immediately.

If the user named a specific skill (e.g., "I meant /X" or "use /X instead"), invoke that skill now. If no specific skill was named, ask: "Which skill would you like me to use instead?" Do not continue with the previously selected skill. Do not apologise at length — acknowledge the correction in one sentence and switch.
