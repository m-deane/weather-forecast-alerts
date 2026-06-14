---
name: detect-force-push
enabled: true
event: tool_use
conditions:
  - field: tool_name
    operator: equals
    value: Bash
  - field: tool_input.command
    operator: regex_match
    pattern: git\s+push\s+(--force|-f|--force-with-lease)
action: ask
---

You are about to force-push. This is a destructive operation that can permanently overwrite remote history and break collaborators' branches.

Before proceeding:
1. Confirm the target remote with `git remote -v`
2. Confirm this is not `main` or `master` — force-pushing to shared branches is prohibited without explicit user authorisation
3. State exactly what commits will be overwritten on the remote
4. Confirm the user has explicitly requested this action in this session

If the user did not explicitly request a force-push, stop and ask. Do not proceed on inference.
