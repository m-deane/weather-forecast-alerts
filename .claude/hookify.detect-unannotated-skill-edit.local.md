---
name: detect-unannotated-skill-edit
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (edit|modify|update|change|add to|remove from|fix|patch|improve) .*(skill|SKILL\.md|\.claude/skills/)
action: warn
---

You are modifying a skill. Before writing the change, annotate each condition you are adding or modifying.

**For every condition you add or change, annotate it inline:**

```
# [LOAD-BEARING: what fails without this condition]
```
or
```
# [COSMETIC: why this wording preference, what is acceptable variation]
```

**Why this is required:**

Skill conditions lose their documentation value over time. Within a few update cycles, future editors cannot tell which conditions are load-bearing (would cause a security violation, broken output, or wrong pattern if removed) and which are cosmetic (wording preferences, style choices). This causes two symmetric failures:

1. **Preserving filler**: conditions marked by no annotation look the same as critical ones, so editors preserve everything — diluting the condition budget until no single condition has enough attention weight to reliably hold.

2. **Removing constraints**: an editor who needs to slim a bloated skill removes what *looks* redundant — which may be the load-bearing constraint that prevents a security pattern from drifting.

**Examples:**

```
# [LOAD-BEARING: project error type only — wrong → raw errors expose stack traces to clients]
L4 Constraints   : use project's standard error type only · ...

# [LOAD-BEARING: input bounds required — wrong → no server-side length validation, DoS vector]
Switch variables : input-validation: all inputs validated with size bounds ...

# [COSMETIC: "immediately" vs "right away" — both acceptable]
After completing your work, immediately write a summary...
```

Annotate before editing, not after — the annotation documents your intent at the moment of change, which is when it is easiest to capture.
