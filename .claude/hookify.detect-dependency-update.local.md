---
name: detect-dependency-update
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (update|upgrade|audit|check)\s+(the\s+)?(dependenc|package|dep|npm\s+package)|outdated\s+(package|dep|npm)|npm\s+outdated|pip\s+list\s+--outdated
action: warn
---

Invoking `/dependency-update`. Audits and updates dependencies with compatibility checks and staged strategy.

Detect the package manager (npm, pip, poetry, cargo, etc.) from project config. List outdated packages, classify updates as patch/minor/major, check changelogs for breaking changes, update in stages (patch first, then minor, then major), and run the test suite after each stage.
