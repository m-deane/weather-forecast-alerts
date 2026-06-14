---
name: retry
description: Re-dispatch a timed-out agent with stream idle timeout recovery — checks checkpoint for partial work, then retries with narrower scope or model sonnet. Invoke immediately after seeing "API Error: Stream idle timeout - partial response received".
argument-hint: (no arguments — infers failed agent from context)
allowed-tools: Read, Write, Bash, Agent
cluster: orchestrate
priority: 50
when_to_use: Immediately after an agent returns "API Error: Stream idle timeout - partial response received". Do not invoke for other errors.
disable-model-invocation: false
user-invocable: true
---

# Retry

**Jurisdiction:** Claude Code template · stream idle timeout recovery · agent re-dispatch

Invoke when an agent dispatch returns `API Error: Stream idle timeout - partial response received`. Do not retry automatically more than twice on the same task — escalate to the user instead.

---

## Step 1 — Find the failed agent's checkpoint

```bash
# List the most recent sprint checkpoint dir
ls -lt .claude/checkpoints/ | head -5

# Find any checkpoint file that is suspiciously small (< 200 bytes = likely partial)
find .claude/checkpoints/ -name "*.md" -size -200c 2>/dev/null
```

If no checkpoint is identifiable, ask: "Which agent timed out? Briefly describe its scope so I can re-dispatch."

---

## Step 2 — Check for partial work

Read any existing checkpoint file for the failed agent. Content that IS present is recoverable — identify:
- Sub-tasks completed (do not re-do these)
- Sub-tasks remaining (these go into the retry prompt)

If the checkpoint is a skeleton only (all TBD / empty sections), treat as no partial work.

---

## Step 2b — Read Autonomy Level

```bash
grep "autonomy-level" .claude/checkpoints/$(ls -t .claude/checkpoints/ 2>/dev/null | head -1)/session-conditions.md 2>/dev/null | tail -1
```

- `autonomous`: proceed with retry without asking the user; apply the decision tree below and dispatch immediately
- `supervised` or `assisted` (default): describe the retry plan and wait for user confirmation before dispatching

## Step 3 — Decide retry strategy

Apply this decision tree exactly:

| Condition | Action |
|-----------|--------|
| Scope had >5 files OR task combined research + implementation | Split into two agents, each with half the scope. Keep original model. |
| Scope ≤5 files, focused single-type task (implementation only or research only) | Retry same scope with `model: "sonnet"`. Enforce ≤150-word inline constraint. |
| Second consecutive timeout on same task (this is already a retry) | Retry with `model: "sonnet"` AND split scope in half, regardless of original size. |

When in doubt: sonnet + smaller scope is always safer than opus + full scope.

---

## Step 4 — Construct and dispatch retry prompt

The retry agent prompt MUST include all of these:

1. The original L3 objective (from context or the failed checkpoint)
2. Only the remaining sub-tasks (exclude anything already in checkpoint)
3. This constraint verbatim at the top of the prompt:

> **TIMEOUT PREVENTION — read this first:**
> Write your checkpoint file BEFORE generating any inline content. After writing the checkpoint, return ≤150 words inline only: files touched, 3 decisions, result. No code blocks inline. Stop immediately after the summary.

4. The checkpoint path: `.claude/checkpoints/{sprint_id}/{agent_name}-retry.md`

Set `model: "sonnet"` on the Agent tool call if Step 3 determined sonnet is needed.

---

## Step 5 — Verify

After the retry agent completes:

```bash
# Verify checkpoint was written and is substantive
[ -f ".claude/checkpoints/{sprint_id}/{agent_name}-retry.md" ] \
  && wc -c ".claude/checkpoints/{sprint_id}/{agent_name}-retry.md" \
  || echo "MISSING: retry checkpoint not written"
```

- Checkpoint exists and > 200 bytes → success, proceed with sprint synthesis
- Checkpoint missing or tiny → "Second timeout. Recommend: break this task into 3 sequential single-file agents with `model: 'sonnet'` each rather than one parallel agent."

Do not retry a third time automatically — surface to the user.

---

## Switch variables

| Variable | Correct assumption | Wrong assumption → consequence |
|----------|-------------------|-------------------------------|
| model-parameter | Set `model` on the Agent tool call itself | Pass model as a prompt instruction → has no effect, agent still uses default model |
| scope-check | Check the most recent sprint's checkpoint dir | Check all checkpoints → identifies wrong sprint's agent as failed |
| partial-recovery | Read checkpoint before re-dispatching | Skip checkpoint check → re-does completed work unnecessarily |
