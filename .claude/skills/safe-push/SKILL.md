---
name: safe-push
description: Pre-push verification gate — confirms target remote, shows staged changes, runs test suite, then pushes only to the confirmed remote
argument-hint: "[remote-name] [branch]"
allowed-tools: Bash(git *), Bash(npm run *)
cluster: ship
priority: 50
when_to_use: When the user asks to push, deploy, or ship code to a remote repository
disable-model-invocation: true
user-invocable: true
---

# Safe Push

## Step 1: Verify Remotes

Current remotes:
!`git remote -v`

Current branch: !`git branch --show-current`

Pending commits (not yet on remote):
!`git log @{u}..HEAD --oneline 2>/dev/null || git log --oneline -5`

**Confirm with the user**: Which remote and branch should this be pushed to? Do not proceed until the user names the target explicitly.

## Step 2: Show Staged State

```bash
git status
git diff --stat HEAD
```

## Step 3: Run Quality Gate

Run lint and tests before pushing:
!`npm run lint 2>&1 | tail -5`
!`npm test 2>&1 | tail -10`

If lint or tests fail, STOP. Report the failures and do not push. Ask the user whether to fix first or abort.

## Step 4: Push to Confirmed Remote

Only after the user has named the remote in Step 1 and quality gate passes:

```bash
git push {confirmed-remote} {confirmed-branch}
```

Confirm the push succeeded and show the remote URL.
