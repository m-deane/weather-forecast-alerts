---
name: context-budget
description: Estimates context consumption and recommends prune / checkpoint / proceed. Treats the context window as finite RAM — proactively manages headroom before saturation causes condition decay or agent output flooding.
argument-hint: ""
allowed-tools: Bash, Read
cluster: session
priority: 50
when_to_use: Proactively in long sessions, after wave 2+ of a multi-agent sprint, or whenever the detect-context-saturation hookify fires. Run before dispatching a new agent wave to confirm headroom is adequate.
disable-model-invocation: false
user-invocable: true
---

# Context Budget

Goal: Assess context consumption and recommend the next action to prevent saturation-induced condition decay.

**Posture:** diagnostic (read-only — no files written unless the user proceeds to checkpoint)

## Step 1 — Estimate Session Size

Run the following to get rough signal on session scope:

```bash
# Checkpoint files written this session (proxy for agent output volume)
find .claude/checkpoints -name "*.md" -maxdepth 3 2>/dev/null | wc -l | tr -d ' '

# Skills and hookify files loaded (proxy for config surface)
ls .claude/skills/ 2>/dev/null | wc -l | tr -d ' '
ls .claude/hookify.*.local.md 2>/dev/null | wc -l | tr -d ' '

# Uncommitted changes this session (proxy for work volume)
git diff --stat HEAD 2>/dev/null | tail -1
```

## Step 2 — Assess Consumption Zone

Based on the signals from Step 1 and the observable conversation length, classify the session:

| Zone | Signal | Recommendation |
|------|--------|----------------|
| **GREEN** | Short session, ≤1 wave completed, few file reads | Proceed — headroom is adequate |
| **AMBER** | Multi-wave sprint, many file reads, long conversation | Prune — summarise stale tool output before next dispatch |
| **RED** | 3+ waves, very long conversation, conditions may have drifted | Checkpoint and resume — write pre-dispatch checkpoint, continue in fresh session |

State the zone clearly.

## Step 3 — Recommend Action

### If GREEN
> Context budget: GREEN. Headroom is adequate — proceed with the next wave or task.

### If AMBER — Prune
> Context budget: AMBER. Recommend pruning before the next dispatch.
>
> Run `/summarise` to compact the conversation, then re-read only the operative conditions and checkpoint files needed for the next wave.

### If RED — Checkpoint and Resume
> Context budget: RED. Recommend writing a pre-dispatch checkpoint and resuming in a fresh session.
>
> Write `.claude/checkpoints/{timestamp}-pre-dispatch/context.md` covering: current branch, recent commits, in-progress work, decisions made, and the next wave's objective. Then start a new session and run `/resume`.

## Step 4 — Operative Conditions Check

After stating the zone, check: are the operative session conditions (L1 jurisdiction, L3 objective, switch variables) still clearly in scope? If they have not been referenced in the last several exchanges, print:

> **Conditions check**: Re-anchor to session conditions before the next dispatch. L1 = {project stack from CLAUDE.md}, L3 = {restate the session objective}.

This prevents condition decay — the most common failure mode in long agent runs.

## Done

Context budget assessment complete. Act on the recommendation above before dispatching the next wave or task.
