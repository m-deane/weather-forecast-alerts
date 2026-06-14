---
name: detect-synthesis-without-validation
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (synthesi[sz]e?|synthesis|summarise?|summarize?)\s*.{0,40}(agent|sprint|checkpoint|result|finding)
action: warn
---

You are about to synthesise agent outputs. Before stating this conclusion, run `/synthesis-validator {sprint_id}`.

**Why this is required**: Synthesis drift is the primary cause of sprints that pass all agent checkpoints but ship incorrect work. Each agent's checkpoint may be correct, yet the orchestrator's synthesis can still draw conclusions that no agent's L3 output supports, or silently drop a flag that one agent explicitly raised. The validator cross-checks each conclusion against the agent outputs that ground it.

**Two failure modes this catches:**

1. **UNSUPPORTED conclusions** — the orchestrator draws a conclusion from its training prior rather than from a specific agent's verified output. Example: "Authentication is fully consistent" when no agent's L3 objective covered the auth module.

2. **DROPPED FLAGS** — an agent explicitly flagged an issue ("note: the `expiresAt` field is missing from two query returns") but this warning did not appear in the synthesis, causing it to be buried and ship unfixed.

**Run before finalising your summary:**
```
/synthesis-validator {sprint_id}
```

If you do not have a sprint_id (the work was not run under /sprint), provide the checkpoint directory path instead.
