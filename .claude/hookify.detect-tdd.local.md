---
name: detect-tdd
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (with|using)\s+TDD|test[\s-]first|test[\s-]driven|TDD\s+(this|approach|style|workflow)|implement.{0,30}test[\s-]first
action: warn
---

Invoking `/tdd-feature`. Writes failing tests from your spec, iterates implementation until green, commits at each green state.

Workflow: (1) read the spec or requirements, (2) write the minimal failing test for the first behavior, (3) implement just enough code to make it pass, (4) refactor if needed, (5) commit at green, (6) repeat for each behavior. Do not write implementation code before a failing test exists.
