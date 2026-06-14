---
name: detect-missing-l3
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (use your judgment|decide what makes sense|implement as needed|figure out the best approach|do what you think is best|use best practices).{0,200}(agent|dispatch|launch)|(agent|dispatch|launch).{0,200}(use your judgment|decide what makes sense|implement as needed|figure out the best approach|do what you think is best|use best practices)
action: warn
---

The prompt delegates an open-ended decision to an agent without specifying L3 — the observable outcome that defines done.

**Why this matters**: Agents given no objective function optimise for their training prior's definition of "good", which is calibrated on the average task in the training distribution, not this project. "Use your judgment" is a prior-filling instruction: the agent fills the gap with whatever it was rewarded for most in training, which may conflict with this project's constraints.

**What to do before dispatching**:

Write one sentence stating the observable outcome — not the work to do, but what "done" looks like after the work is complete.

Bad L3 (task description, not objective):
> "Implement the [feature] module and build the [feature] page."

Good L3 (observable outcome):
> "The [feature] module exposes all required operations; all operations are correctly scoped to the authenticated user; tests pass with no regressions; lint exits 0."

Add this sentence to your agent prompt as:
```
L3 Objective : [your one-sentence observable outcome here]
```

Then proceed with dispatch.
