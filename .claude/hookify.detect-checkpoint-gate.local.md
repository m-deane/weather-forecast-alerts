---
name: detect-checkpoint-gate
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (all\s+agents?\s+(done|complete|finished|ready))|(check\s+checkpoint)|(gate\s+checkpoint)|(are\s+(all\s+)?agents?\s+done)|(verify\s+agents?)|(agents?\s+(all\s+)?complete)
action: warn
---

Invoking `/checkpoint-gate`. Verifies all expected agent checkpoints exist and are non-empty before synthesis.

Run: `/checkpoint-gate {sprint_id} {agent-names}`

Skipping this check means missing or empty agent work will be silently treated as complete. The two failure modes it catches: (1) silent missing agent — dispatched but failed or wrote to the wrong path; (2) empty checkpoint — 0-byte file from an interrupted run.

After the gate passes, proceed to `/synthesis-validator {sprint_id}`.
