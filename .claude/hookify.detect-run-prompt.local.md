---
name: detect-run-prompt
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: run\s+the\s+prompt|execute\s+the\s+prompt|use\s+that\s+prompt|execute\s+that\s+prompt|run\s+the\s+prompt\s+above
action: warn
---

The user wants to execute the prompt Claude most recently generated. Invoke the `run-prompt` skill: find the most recent instruction block or code block in the conversation context, confirm in one sentence what you are about to execute, then run it. If it is an agent-dispatch prompt, use the Agent tool. If it is a task description, execute directly. Apply the reversibility gate for any destructive commands.
