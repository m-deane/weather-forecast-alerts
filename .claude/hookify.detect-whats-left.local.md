---
name: detect-whats-left
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: anything\s+else|what.?s\s+left|what\s+remains|what.?s\s+next|what\s+else|still\s+to\s+do|what\s+haven.?t\s+we|anything\s+remaining|anything\s+left
action: warn
---

The user is asking what work remains. Invoke the `whats-left` skill: check .claude_plans/ for the most recent plan file and scan for unchecked items, cross-reference with git status for uncommitted changes, and return a prioritised punch list of no more than 15 lines. Do not execute any items — this is a read-only audit.
