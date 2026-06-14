---
name: detect-rubric-needed
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (is this (good|quality|correct|right|accurate|well.written|well done)|how (good|well|correct|accurate) (is|does)|rate (the|this) (quality|output|response|answer)|evaluate (the|this) (quality|output|result)|assess.{0,20}quality|does this (look|seem) (good|right|correct|acceptable))
action: warn
---

You are evaluating output quality. Subjective assessment introduces evaluator variance — the same output looks different depending on what you are looking for.

**Run:** `/rubric-eval [target-file-or-text] --criteria "criterion-name:weight,criterion-name:weight"`

This skill runs N=3 chain-of-thought scoring passes per criterion (0.0–1.0 scale), computes per-criterion mean and CV, and produces a weighted overall quality score:

- **≥0.70 → QUALITY PASS**
- **0.50–0.69 → QUALITY WARN**
- **<0.50 → QUALITY FAIL**

CV > 0.3 on a criterion flags the rubric as ambiguous — the criterion wording is underspecified and produces unstable scores. Tighten the criterion definition before using the score as a decision input.

**Note on scorer bias:** The same LLM scoring its own output will inflate scores relative to an independent judge. Use `/rubric-eval` for relative comparison across versions (A vs B), not as an absolute quality claim.
