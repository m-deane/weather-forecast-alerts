---
name: detect-agent-output-integration
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (integrate|incorporate|use|apply|implement|ship).{0,50}(agent|checkpoint).{0,50}(output|result|finding|analysis|suggest|recommend)
action: warn
---

You are about to integrate agent output as source material. Agent outputs can contain hallucinated file paths, function names, version numbers, or causal claims that pass a surface read.

**Run:** `/hallucination-check [checkpoint-file-path]`

This skill extracts every factual claim from the checkpoint, runs N=5 independent boolean verification passes per claim (ChainPoll, AUROC 0.781), and classifies each as VERIFIED / UNCERTAIN / HALLUCINATED.

- **LOW risk** (0 HALLUCINATED): safe to integrate
- **MEDIUM risk** (≥1 UNCERTAIN): verify flagged claims against primary sources first
- **HIGH risk** (≥1 HALLUCINATED): do not integrate — listed claims require correction

Skipping this check when an agent references specific paths, model names, or API methods is the most common way a hallucination propagates into the codebase as if it were a verified finding.
