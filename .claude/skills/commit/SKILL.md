---
name: commit
description: Stage relevant files and create a conventional commit — reads git status, diff, and recent log to auto-generate a meaningful commit message with Co-Authored-By trailer
argument-hint: (no arguments — reads current git state)
allowed-tools: Bash(git status), Bash(git diff *), Bash(git log *), Bash(git add *), Bash(git commit *)
cluster: ship
priority: 50
when_to_use: When the user says "commit", "commit it", "commit this", or "commit all" — a short single-word commit instruction
disable-model-invocation: true
user-invocable: true
---

# Commit

## Step 1: Read Current State

Current git status:
!`git status --short`

Changes to be committed:
!`git diff HEAD --stat`

Recent commits (for message style reference):
!`git log --oneline -5`

## Step 2: Determine What to Stage

From `git status`, identify all modified/untracked files. Apply these exclusions — never stage:

- `.env`, `.env.*`, `.env.local`, `.env.*.local`
- `node_modules/`
- `.next/`
- Any file matching `*.pem`, `*.key`, `*.secret`

Stage all other modified and untracked files by name (not with `git add -A` or `git add .`):

```bash
git add <file1> <file2> ...
```

If there is nothing to stage (working tree is clean), say: "Nothing to commit — working tree is clean." and stop.

## Step 3: Write the Commit Message

Analyse the staged diff and the five most recent commit messages. Use these type prefixes:

- `feat` — new capability
- `fix` — bug fix
- `refactor` — restructuring without behaviour change
- `test` — adding or updating tests
- `chore` — tooling, deps, config
- `docs` — documentation only

Rules:
- Subject line: 50 chars max, imperative mood, no trailing period
- Body (optional): one sentence only if the diff is non-obvious
- Always append the Co-Authored-By trailer

## Step 4: Commit

```bash
git commit -m "$(cat <<'EOF'
<type>(<optional-scope>): <subject>

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

## Step 5: Confirm

After committing, print:
```
Committed: <short-hash> — "<subject line>"
Files staged: <count>
```

Do not run lint or build unless the user requests it.
