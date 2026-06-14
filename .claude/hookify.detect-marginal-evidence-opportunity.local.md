---
name: detect-marginal-evidence-opportunity
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (ready to (dispatch|send|run|launch)|dispatch (this|the) (agent|prompt)|I('ve| have) (written|created|finished|drafted) (the |this )?(agent )?(prompt|conditions|L1|Bayesian)|before (I |we )?dispatch|about to (dispatch|launch|send))
action: warn
---

You are about to dispatch an agent prompt. Before sending, remove filler conditions that dilute signal without shifting the posterior.

**Run:** `/marginal-evidence-audit [prompt-file-or-pasted-text]`

Why this matters: The top 5 conditions capture ~95% of reducible entropy. Every sentence beyond the discriminating set costs attention weight — the model must allocate capacity to conditions that produce no categorical difference in output. Filler preserved alongside load-bearing constraints causes the load-bearing constraints to hold less attention weight over the course of a long context.

The audit flags 14 prohibited phrase classes (generic assertions, social hedges, restatements, posture fillers) and applies a marginal evidence test per sentence: if removing it would not change the posterior on any L1–L6 layer, it is waste. Run before dispatch, not after — waste added is harder to identify than waste prevented.
