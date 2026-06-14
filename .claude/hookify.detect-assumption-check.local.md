---
name: detect-assumption-check
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: I think (the|it|this) (bug|issue|problem|error) is|does .* still work|should (still|be|work) fine|that should (work|be fine|still)|is it still|still works?
action: warn
---

The user may be stating an unverified premise or asking for confirmation of an assumption. Before confirming or agreeing, verify independently: grep for the relevant code, run the relevant test, or read the relevant file. Do not confirm based on plausibility alone. If the premise turns out to be incorrect, say so directly.
