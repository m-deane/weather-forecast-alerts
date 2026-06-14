---
name: sync
description: Commit all staged changes with a conventional message, then confirm the push target and push — the complete commit + push sequence in one action
argument-hint: (no arguments — reads current git state)
allowed-tools: Bash(git status), Bash(git diff *), Bash(git log *), Bash(git add *), Bash(git commit *), Bash(git remote *), Bash(git push *)
cluster: ship
priority: 50
when_to_use: When the user says "sync" meaning commit and push in one action
disable-model-invocation: true
user-invocable: true
---

# Sync

Sync = commit + push. Two phases, one gate.

## Phase 1: Commit

### Step 1: Read Current State

!`git status --short`
!`git diff HEAD --stat`
!`git log --oneline -5`

### Step 2: Stage Relevant Files

Stage all modified/untracked files by name. Never stage `.env*`, `node_modules/`, `.next/`, `*.pem`, `*.key`.

If working tree is already clean, skip to Phase 2.

### Step 3: Commit

Write a conventional commit message matching recent commit style. Commit with Co-Authored-By trailer.

## Phase 2: Push

### Step 4: Show Remotes

!`git remote -v`
!`git branch --show-current`
!`git log @{u}..HEAD --oneline 2>/dev/null || git log --oneline -3`

### Step 5: Confirm Push Target

State the intended target and ask:
> "About to push to [remote] / [branch]. Confirm?"

Do NOT push until the user confirms. This is the only gate in this skill.

### Step 6: Push and Confirm

```bash
git push <confirmed-remote> <confirmed-branch>
```

After pushing:
```
Synced: <commit-hash> pushed to <remote>/<branch>
Commits pushed: <count>
```
