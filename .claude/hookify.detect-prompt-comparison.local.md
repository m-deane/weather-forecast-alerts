---
name: detect-prompt-comparison
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (which (version|variant|prompt|skill) is better|compare (these |the )?(prompts?|versions?|skills?|variants?)|should I use (version|prompt|variant|option) (A|B|1|2)|A vs\.? B|old.{0,20}vs.{0,20}new.{0,20}(skill|prompt)|new.{0,20}vs.{0,20}old.{0,20}(skill|prompt))
action: warn
---

You are comparing two prompt or skill versions. A single test case is not sufficient evidence to declare a winner — the case that motivated the change may not be representative of the full input distribution.

**Run:** `/prompt-ab-test [skill-name] --version-a [path-to-A] --version-b [path-to-B] --n 3`

This skill runs both versions against all reference inputs in `.claude/regression/{skill-name}/inputs/`, computes three metrics per input (length CV, hedge word density, structural consistency), and declares a winner only if Version B improves on ≥3/M inputs and regresses ≤1/M.

A version that fixes one case but regresses two others is a net loss. `/prompt-ab-test` catches this before you ship the change and sync it to 10 repos.
