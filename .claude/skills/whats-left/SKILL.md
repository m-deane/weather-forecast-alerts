---
name: whats-left
description: Scan open plan files (if any), git status, and recent activity to produce a prioritised punch list of remaining work
argument-hint: (no arguments — reads plan files and git state)
allowed-tools: Bash, Read
cluster: session
priority: 50
when_to_use: When the user asks what work remains, what's left to do, anything else, or what's next
disable-model-invocation: false
user-invocable: true
---

# What's Left

## Step 1: Collect Signals

Plan files (most recent first):
!`ls -t .claude_plans/ 2>/dev/null | head -5 || echo "(no .claude_plans/ directory)"`

Git status (uncommitted work):
!`git status --short 2>/dev/null`

Stash (interrupted work):
!`git stash list 2>/dev/null`

Recent commits (what just shipped):
!`git log --oneline -5 2>/dev/null`

## Step 2: Read the Most Recent Plan (if present)

If `.claude_plans/` exists and contains files, read the most recent one. Otherwise skip to Step 3. Scan for:

- Unchecked checkboxes: `- [ ]`
- Lines containing `TODO`, `FIXME`, `PENDING`, `NOT DONE`, `SKIPPED`
- Any section marked as incomplete, deferred, or "next session"

## Step 3: Produce the Punch List

Output a single "REMAINING WORK" block. Constraints:

- Maximum 15 lines total
- Sort by priority: blocking issues first, then quick wins, then deferred items
- Each line: `[P1/P2/P3] <one-sentence description>`
- Flag uncommitted files as `[IN PROGRESS]`
- If nothing remains: "Nothing outstanding — working tree is clean and all plan items are checked off."

Do not execute any items. This is a read-only audit.
