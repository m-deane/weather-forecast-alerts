---
name: detect-stability-needed
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: sync\s+this\s+skill|add\s+this\s+skill\s+to\s+all\s+repos?|sync\s+to\s+repos?|sync-claude-template|copy\s+to\s+all\s+projects?
action: warn
---

Before syncing, run /stability-test on the skill file to verify output stability across runs. A mean Jaccard similarity < 0.50 means the skill has missing conditions that will produce inconsistent behaviour across projects. Run /marginal-evidence-audit first to remove filler, then /stability-test to confirm conditions are sufficient.
