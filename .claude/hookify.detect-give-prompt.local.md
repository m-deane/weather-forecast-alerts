---
name: detect-give-prompt
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: give\s+me\s+a\s+prompt|generate\s+(me\s+)?a\s+prompt|write\s+(me\s+)?a\s+prompt|create\s+(me\s+)?a\s+prompt
action: warn
---

Invoking `/generate-prompt`. The user is asking you to generate a prompt they can use. Respond by writing a standalone, self-contained prompt optimised for use in a new Claude Code session or passed to an agent. Do not execute the described task — generate the prompt text only, formatted as a copyable block.
