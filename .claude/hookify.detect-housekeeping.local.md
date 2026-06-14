---
name: detect-housekeeping
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: ^housekeeping$|post[\s-]merge\s+clean|run\s+housekeeping|carry\s+out\s+housekeeping|clean\s*up\s+after\s+(merge|release)
action: warn
---

Invoking `/housekeeping`. Multi-step post-merge cleanup: tests, deprecation audit, docs, notebooks, deps, changelog.

Runs in sequence: (1) full test suite, (2) scan for deprecated APIs or removed imports, (3) update docs and changelog, (4) re-validate notebooks if present, (5) check for stale dependencies, (6) commit all cleanup changes with a conventional commit message.
