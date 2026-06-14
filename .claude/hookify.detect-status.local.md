---
name: detect-status
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: ^\s*status\??\s*$
action: warn
---

The user wants a quick mid-session read-out (not a full session orientation). Run these in parallel and return a 5-line summary:
1. `git status --short` — uncommitted files
2. `git log --oneline -3` — recent commits
3. Check `.claude_plans/` for any open plan files (if directory exists)
4. Check `.claude/checkpoints/` for any incomplete sprint dirs
Report: branch, dirty files count, last 3 commits, open plans, incomplete sprints. Nothing else.
