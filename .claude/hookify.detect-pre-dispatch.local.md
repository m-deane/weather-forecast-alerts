---
name: detect-pre-dispatch
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (about to|ready to|before I|going to)\s+(dispatch|launch)\s+(agents|the agent|an agent)
action: warn
---

You are about to dispatch agents. Before proceeding, confirm that switch variables have been identified for this task.

**What are switch variables?**

A switch variable is a condition where assuming it differently would produce a qualitatively different — and likely broken — implementation. They are not preferences; they are branch points in the implementation space.

**Complete this table before dispatching:**

| Variable | Correct assumption for this task | Wrong-assumption consequence |
|----------|----------------------------------|------------------------------|
| [name]   | [what you know to be true]       | [what breaks if agent assumes otherwise] |
| [name]   | [what you know to be true]       | [what breaks if agent assumes otherwise] |
| [name]   | [what you know to be true]       | [what breaks if agent assumes otherwise] |

**Identify switch variables for your project's stack:**

Read your project's `CLAUDE.md` → `## Critical Patterns` section to identify the 2-3 highest-stakes variables. If that section is absent, halt and ask the user to declare the highest-stakes switch variables for this project before continuing.

Common patterns by stack:
- Auth-scoped data: "All queries filter by authenticated user's identifier"
- Error handling: "All errors use the project's declared error type"
- Input validation: "All inputs validated with size/type bounds at the boundary"

Once the table is complete, proceed with dispatch. Include the populated table in each agent's `## Conditions` block under `Switch variables:`.
