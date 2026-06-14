---
name: detect-sync
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: ^\s*sync\s*[\.!]?\s*$
action: warn
---

The user wants to commit and push in one action. Invoke the `sync` skill: run the full commit phase (status → diff → log → stage relevant files → conventional commit message), then run the push phase (show remotes → confirm push target with the user → push only after confirmation). Never skip the push confirmation gate.
