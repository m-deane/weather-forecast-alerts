---
name: resume
description: Detect and resume an interrupted sprint — reads checkpoint directory, identifies incomplete agents, re-dispatches only the failed units
argument-hint: "[sprint-id] | (omit to use most recent)"
allowed-tools: Read, Write, Bash, Agent
cluster: orchestrate
priority: 50
when_to_use: When the user wants to resume interrupted work, recover from a timeout, or continue a partially completed agent sprint
disable-model-invocation: false
user-invocable: true
---

# Resume Interrupted Sprint

## Detect Incomplete Work

Find checkpoints:
!`ls -lt .claude/checkpoints/ 2>/dev/null | head -10`

Read the most recent (or specified) manifest:
!`cat .claude/checkpoints/$(ls -t .claude/checkpoints/ 2>/dev/null | head -1)/manifest.json 2>/dev/null || echo "No checkpoints found"`

## Analysis

1. Compare agents listed in manifest vs. output files present in the checkpoint directory
2. An agent is **complete** if its `.md` output file exists and is non-empty
3. An agent is **incomplete** if its output file is missing or empty

List completed agents and incomplete agents.

## Summarise Completed Work

Before re-dispatching incomplete agents, compress each completed agent's output into a 3-line summary:
1. **What was done**: one sentence on the agent's completed work
2. **Key decisions**: one sentence on non-obvious choices the agent made
3. **Blockers found**: one sentence on issues flagged (or 'none')

Include these summaries in the re-dispatch prompt for incomplete agents as context: 'The following agents have already completed: {summaries}'. This prevents re-dispatched agents from duplicating or contradicting completed work.

## Read Autonomy Level

```bash
grep "autonomy-level" .claude/checkpoints/$(ls -t .claude/checkpoints/ 2>/dev/null | head -1)/session-conditions.md 2>/dev/null | tail -1
```

Default to `supervised` if not found.

## Confirm Before Re-Dispatching

Show the user:
- Sprint goal (from manifest)
- Completed agents and what they produced (one-line summary per file)
- Incomplete agents that will be re-dispatched

**If `autonomy-level: autonomous`**: skip confirmation — print the re-dispatch plan and proceed immediately.
**Otherwise** (`assisted` or `supervised`): wait for confirmation before dispatching.

## Re-Dispatch

Re-dispatch only the incomplete agents with their original scope instructions (read from manifest). Include the same checkpoint-write instruction at the end of each agent prompt.

After completion, present the consolidated summary across ALL agents (both original completions and new completions).

## No Checkpoints Found

If `.claude/checkpoints/` is empty or missing, report: "No incomplete sprints found. Use `/sprint [goal]` to start a new one."
