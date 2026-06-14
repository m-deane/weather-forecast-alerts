---
name: detect-continue
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: ^\s*continue\.?\s*$
action: warn
---

The user typed "continue" as a standalone message. Determine intent from context:
- If an ongoing multi-part report, analysis, or ultrareview is in progress: produce the next section immediately, without preamble.
- If a proposed action is pending confirmation: execute it (apply the reversibility gate for destructive actions).
- If neither: ask in one sentence what to continue.
Do not conflate these cases.
