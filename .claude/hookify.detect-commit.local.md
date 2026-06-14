---
name: detect-commit
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: ^\s*commit(\s+it|\s+all|\s+this)?\s*[\.!]?\s*$|^\s*save\s+(my\s+)?changes\s*[.!]?\s*$
action: warn
---

The user wants to commit current changes. Invoke the `commit` skill: run git status, git diff --stat HEAD, and git log --oneline -5 to understand what has changed and how commits are worded in this repo, then stage relevant files (excluding .env, node_modules, .next), write a conventional commit message matching the repo's style, and commit with the Co-Authored-By trailer.
