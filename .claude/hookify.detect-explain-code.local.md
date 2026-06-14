---
name: detect-explain-code
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (explain|walk\s+me\s+through|what\s+does)\s+(this|that|the)\s+(code|function|method|class|module|file)|how\s+does\s+(this|that|the)\s+(code|function|method|class)\s+work
action: warn
---

Invoking `/explain-code`. Provides structured explanation: purpose, patterns, key behaviors, and data flow.

Read the target code before explaining. Structure the explanation as: (1) purpose — what problem it solves, (2) patterns — design patterns or idioms used, (3) key behaviors — important logic branches and side effects, (4) data flow — inputs, transformations, outputs. Avoid restating code line-by-line; explain the why, not just the what.
