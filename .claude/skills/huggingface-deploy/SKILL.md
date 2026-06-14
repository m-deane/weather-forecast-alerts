---
name: huggingface-deploy
description: Push current commit to a HuggingFace Space remote and verify the space starts
argument-hint: (no arguments — detects HF remote from git remote -v)
allowed-tools: Bash
cluster: ship
priority: 50
when_to_use: "When the user says 'refresh huggingface', 'push to huggingface', 'update huggingface space', 'deploy to huggingface', or 'refresh the app' in a project with a HF remote"
disable-model-invocation: false
user-invocable: true
---

# HuggingFace Deploy

## Step 1: Identify the HuggingFace Remote

Run:
```bash
git remote -v
```

Scan the output for a remote whose URL contains `huggingface.co`. Extract:
- Remote name (e.g. `hf`, `huggingface`, `space`)
- Full remote URL (e.g. `https://huggingface.co/spaces/username/space-name`)
- Space URL: `https://huggingface.co/spaces/[user]/[space]`

If no remote URL contains `huggingface.co`, stop and ask the user: "I couldn't find a HuggingFace remote. What is the remote name for your HF Space?"

## Step 2: Identify Current Branch

Run:
```bash
git branch --show-current
```

Note the current branch name.

## Step 3: Reversibility Gate — Confirm Before Pushing

State exactly what you are about to do before acting:

> "I will push `[current-branch]` to `[hf-remote-name]` (remote: `[full-url]`), targeting the `main` branch on HuggingFace Spaces. This will update your live Space. Confirm? (yes/no)"

Wait for user confirmation before proceeding.

## Step 4: Push to HuggingFace

```bash
git push [hf-remote] [current-branch]:main
```

HuggingFace Spaces always uses `main` as its default branch regardless of your local branch name.

## Step 5: Report Result

On success:
```
Push complete.
Space URL: https://huggingface.co/spaces/[user]/[space]
Space logs: https://huggingface.co/spaces/[user]/[space]/logs
The space may take 30–120 seconds to restart. Check the logs URL if it does not load.
```

## Step 6: Handle Failures

**Authentication error** (exit code non-zero with "403", "401", or "Authentication" in output):
```
Authentication failed. To fix:
  Option A: Run `huggingface-cli login` and enter your HF write token.
  Option B: Set HF_TOKEN in your environment: export HF_TOKEN=hf_...
  Option C: Set HF_TOKEN as an environment variable — never embed tokens in URLs. Token-in-URL patterns are logged in shell history and visible in git remote -v output.
```

**Push rejected** ("rejected", "non-fast-forward" in output):
```
Push rejected — the remote has commits your local branch does not.
Run: git pull [hf-remote] main --rebase
Then retry the push.
```

**Space builds but shows a blank screen** (not a git error — this occurs after a successful push):
```
The push succeeded but the Space may have a startup error.
Common causes:
  1. Missing dependency in requirements.txt — check the Space logs for ImportError or ModuleNotFoundError.
  2. Import error in app.py — check logs for the failing import.
  3. Port mismatch — ensure app.py binds to port 7860 (HF Spaces default).
Logs: https://huggingface.co/spaces/[user]/[space]/logs
```
