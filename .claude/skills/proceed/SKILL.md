---
name: proceed
description: Execute the action Claude described in its most recent turn — with a brief acknowledgment, a safety check for irreversible actions, and immediate execution otherwise
argument-hint: (no arguments needed — reads prior turn context)
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
cluster: orchestrate
priority: 30
when_to_use: When the user says "proceed", "go ahead", "do it", "run it", "yes do that", "execute that", or "make it so"
disable-model-invocation: false
user-invocable: true
---

# Proceed

Execute the action described in the immediately preceding assistant turn.

## Step 1: Reconstruct Intent

From the prior turn, extract:

1. **Action**: What was Claude about to do? (e.g., "create a module for X", "run the test suite", "push a PR")
2. **Files**: Which files would be created, modified, or deleted?
3. **Commands**: Which shell commands would be run?
4. **Reversibility**: Can this be undone easily? (git reset, file restore, etc.)

State this out loud in one sentence before acting:

> "Proceeding with: [one-sentence summary of the action]."

## Step 2: Safety Gate

Evaluate whether the action requires confirmation:

### Requires explicit confirmation before proceeding:
- `git push` / opening a pull request (affects remote/shared state)
- File deletion (especially outside the project directory)
- Database migrations (against production)
- Any operation that overwrites a file not tracked by git
- Sending external requests (email, webhooks, API calls)

If the action hits any of the above, say:

> "This action is [irreversible / affects shared state]: [describe exactly what will happen]. Confirm? (yes/no)"

Wait for confirmation. Do NOT proceed until the user replies affirmatively.

### Safe to execute immediately (no confirmation needed):
- File edits that are tracked in git
- Running lint, build, or test commands
- Creating new files within the project
- Reading files or searching the codebase
- Any operation the user can undo with `git checkout` or `git reset`

## Step 3: Execute

Run the action. Follow the project's quality gates:

- After editing source files: run lint (if applicable) to catch immediate issues
- After completing an implementation task: offer to run the project's quality gates (build + tests)
- After creating a new module: remind the user to register it in the project's entry/registry file (if applicable)
- After a schema change: remind the user to run schema generation and migration commands (if applicable)

## Step 4: Report

After execution, provide:

1. **Done**: What was completed
2. **Files touched**: List each file created or modified
3. **Next step**: What the user should do or say next (if anything)

Keep it brief. The user said "proceed" — they want action, not narration.

## Dry Run Mode

If the user says "proceed (dry run)" or "proceed — show me what you'd do first":

- List every file that would be created or modified with a one-line description
- List every command that would be run in order
- Do NOT execute anything
- End with: "Ready to proceed. Say 'proceed' to execute."

## Edge Cases

**If the prior turn described multiple options**: Ask "Which option would you like me to proceed with? [Option A / Option B]" before acting.

**If the prior turn was ambiguous about scope**: State your assumption explicitly before acting. Example: "I'm interpreting this as [scope]. Proceeding." Give the user one sentence to stop you if wrong.

**If nothing was described in the prior turn**: Say "I don't have a pending action from our last exchange. What would you like me to do?" and stop.
