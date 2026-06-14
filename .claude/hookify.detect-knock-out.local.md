---
name: detect-knock-out
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: knock\s+(it|them|these|those|this|all)\s+out
action: warn
---

The user wants immediate implementation of the items just listed or identified in this conversation. Do not ask for clarification. Assess whether the items are independent (no shared file ownership, no sequential dependency) or dependent (one item's output feeds the next). If independent, dispatch parallel agents using the sprint protocol. If dependent, execute sequentially in priority order. Begin immediately — do not narrate the plan before acting unless one of the items hits the reversibility gate (git push, deletion, external API).
