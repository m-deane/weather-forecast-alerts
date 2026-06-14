---
name: branch-consolidation
description: Audit stale local and remote branches, rebase or delete them, and prune gone remote-tracking refs
argument-hint: (no arguments — audits all local branches against origin/main)
allowed-tools: Bash
cluster: ship
priority: 50
when_to_use: "When the user says 'consolidate branches', 'rebase stale branches', 'any branches that need merging', 'clean up branches', or 'tidy up the repo'"
disable-model-invocation: false
user-invocable: true
---

# Branch Consolidation

## Step 1: Fetch and Prune Remote-Tracking Refs

```bash
git fetch --prune
```

This removes any remote-tracking refs (e.g. `origin/feature-x`) whose remote branch has already been deleted.

## Step 2: List All Local Branches with Staleness Data

```bash
git for-each-ref --sort=-committerdate refs/heads \
  --format='%(refname:short)|%(committerdate:relative)|%(upstream:track)|%(upstream:short)|%(subject)'
```

This returns one row per local branch with:
- Branch name
- Last commit date (relative, e.g. "3 weeks ago")
- Upstream tracking status (`[gone]`, `[ahead 2]`, `[behind 1]`, blank if no upstream)
- Upstream ref name (e.g. `origin/feature-x`)
- Last commit subject

Also get the current branch to avoid acting on it:
```bash
git branch --show-current
```

## Step 3: Classify Each Branch

Apply the following rules in order:

| Condition | Classification | Recommended Action |
|-----------|---------------|-------------------|
| Is current branch | **active** | Skip — never touch current branch |
| Upstream tracking status is `[gone]` | **gone-remote** | Safe to delete locally (remote already deleted) |
| No upstream AND last commit >14 days ago | **stale-local** | Delete or rebase onto main |
| Has upstream AND fully merged into main | **merged** | Safe to delete |
| Has upstream AND has unmerged commits | **active** | Keep — do nothing |
| Last commit <=14 days ago | **recent** | Keep — likely in-progress work |

To check if a branch is fully merged into main:
```bash
git branch --merged main | grep "[branch-name]"
```

## Step 4: Present Classification Table

Output a table covering all non-active branches:

```
Branch Consolidation Report
===========================
Current branch: [branch] (skipped)

| Branch | Last Commit | Upstream Status | Classification | Recommended Action |
|--------|-------------|-----------------|----------------|--------------------|
| feature/old-thing | 3 weeks ago | [gone] | gone-remote | Delete locally |
| experiment/draft | 6 weeks ago | (none) | stale-local | Delete or rebase onto main |
| fix/issue-42 | 2 days ago | [ahead 1] | active | Keep |
| release/v1.2 | 1 month ago | (merged) | merged | Safe to delete |
```

Do not take any action yet — only present the table.

## Step 5: Offer Batch Action for Gone-Remote Branches

If there are any `gone-remote` branches, offer:
```
Found [N] branches whose remote has been deleted:
  [list branch names]

Run `git branch -d [branch]` for each? These are safe to delete — origin already removed them.
(yes/no)
```

Wait for confirmation. On yes, run `git branch -d` (not `-D`) for each gone-remote branch.
If `git branch -d` fails for any branch (e.g. not fully merged warning), report the failure and ask if the user wants to force-delete with `-D`. Never use `-D` without explicit per-branch user confirmation.

## Step 6: Handle Stale and Merged Branches

For each `stale-local` or `merged` branch, ask individually:
```
Branch: [name] — [classification] (last commit: [date])
Options:
  1. Delete (git branch -d [name])
  2. Rebase onto main (git rebase main [name])
  3. Skip
Choice (1/2/3):
```

Apply reversibility gate: state the exact command before running it. Never delete without per-branch confirmation.

If the user chooses rebase:
```bash
git rebase main [branch-name]
```

If rebase conflicts arise, stop and report:
```
Rebase conflict on [branch]. Pausing.
Conflicting files:
  [list from git status]
Resolve conflicts manually, then run: git rebase --continue
Or to abort: git rebase --abort
```

## Step 7: Final Prune and Summary

After processing all branches, run a final prune:
```bash
git remote prune origin
```

Report how many refs were pruned (parse output for "pruned" lines).

Print a closing summary:
```
Branch Consolidation Complete
==============================
Deleted (gone-remote):  [N] branches
Deleted (merged/stale): [N] branches
Rebased onto main:      [N] branches
Kept (active/recent):   [N] branches
Remote refs pruned:     [N] refs
```
