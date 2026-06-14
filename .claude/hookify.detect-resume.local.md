---
name: detect-resume
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: resume\s+(the\s+)?(sprint|work|task|agents?)|pick\s+up\s+where|continue\s+(the\s+)?sprint|recover\s+(from\s+)?interrupted
action: warn
---

The user wants to resume interrupted sprint work. Invoke the `resume` skill: read .claude/checkpoints/ for the most recent sprint manifest, identify incomplete agents (output file missing), and re-dispatch only those agents.
