---
name: detect-destructive-confirm
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: ^\s*(yes\s+delete\s+(these|them|it|all|this)|yes\s+remove\s+(these|them|it|all)|go\s+ahead\s+and\s+delete|delete\s+(them\s+)?all|confirm\s+delete)\s*[\.!]?\s*$
action: warn
---

The user is confirming a destructive action. This always triggers the reversibility gate: state in one sentence exactly what will be deleted, then execute immediately. Do not ask for further confirmation — the user has already confirmed.
