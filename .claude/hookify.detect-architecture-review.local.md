---
name: detect-architecture-review
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (review|evaluate|assess|audit)\s+(the\s+)?(architecture|system\s+design|tech(nical)?\s+debt)|(architecture|design)\s+(review|audit|assessment)
action: warn
---

Invoking `/architecture-review`. Evaluates system structure, patterns, dependencies, data flow, scalability, and security.

Read the project structure, entry points, and key modules before evaluating. Assess: separation of concerns, dependency direction, coupling/cohesion, error handling patterns, data flow clarity, scalability bottlenecks, and technical debt hotspots. Produce a findings table with severity and recommended actions.
