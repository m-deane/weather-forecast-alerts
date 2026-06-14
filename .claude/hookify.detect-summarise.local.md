---
name: detect-summarise
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: give\s+me\s+a\s+summary|summari[sz]e|what\s+did\s+we\s+do|session\s+summary|wrap\s+up|end\s+of\s+session|what\s+have\s+we\s+done
action: warn
---

The user wants a session summary. Invoke the `summarise` skill to produce a compact 15-line report covering: commits made this session, files/areas changed, key decisions or patterns established, and open items for next session. No padding — one sentence per point.
