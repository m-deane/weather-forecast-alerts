---
name: detect-leading-question
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (isn't it (true|obvious|clear)|don't you (agree|think)|obviously\s+.{1,30}\s+(is|are|was|has)|clearly\s+(superior|inferior|better|worse|flawed|wrong|the best|the worst)|clearly\s+\w+\s+(is|are|was|has)|everyone knows|it's well (established|known|accepted|documented) that|undeniably|unquestionably|indisputably)
action: warn
---

The prompt contains a leading assertion. Before agreeing, evaluate independently. State whether you agree, partially agree, or disagree — and why. Do not defer to the user's framing just because it was stated confidently.
