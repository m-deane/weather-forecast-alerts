---
name: detect-verify
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: verify\s+(the\s+)?(implementation|build|tests?|changes?)|run\s+(the\s+)?quality\s+gate|check\s+it\s+(still\s+)?works?|does\s+it\s+(still\s+)?build
action: warn
---

The user wants to run the quality gate. Invoke the `verify-implementation` skill: run npm run lint && npm run build && npm test in sequence, report results, and flag any failures.
