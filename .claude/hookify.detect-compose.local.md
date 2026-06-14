---
name: detect-compose
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (full|end[\s-]to[\s-]end|complete)\s+(feature|development|workflow)\s+(pipeline|chain|sequence)|run\s+(the\s+)?(feature|dev|prompt)\s+(recipe|pipeline|workflow)
action: warn
---

Invoking `/compose`. Reads a recipe file and orchestrates a multi-skill chain with gates between steps.

Available recipes: feature-development, skill-authoring, post-sprint, debug-to-fix, prompt-engineering. Each recipe defines a sequence of skills with approval gates between phases. If no recipe is specified, ask the user which recipe to run. Custom recipes can be defined in `.claude/recipes/`.
