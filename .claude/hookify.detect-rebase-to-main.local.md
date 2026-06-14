---
name: detect-rebase-to-main
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: rebase\s+(to\s+)?(origin\/)?main|rebase\s+origin\/main|rebase\s+onto\s+main
action: warn
---

The user wants to rebase the current branch onto origin/main. Execute:
1. `git fetch origin`
2. `git rebase origin/main`
3. If conflicts: pause, list conflicting files, ask how to resolve
4. If clean: report success and current branch status
Apply the reversibility gate — confirm the current branch name before rebasing.
