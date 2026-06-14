---
name: detect-anchored-framing
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: the\s+(definitive|best|only|greatest|most\s+important|seminal|authoritative|quintessential|ultimate|go-to)\s+(work|book|paper|article|source|study|guide|text|resource|reference)\s+(on|about|for|regarding|to)
action: warn
---

The prompt uses absolute framing for a source. Before proceeding, check: is this assessment widely shared among experts? Note any credible alternative canonical works. Present the named work's strengths AND any widely-cited alternatives.
