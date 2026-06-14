---
name: detect-give-and-run
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: give me a prompt to .{5,} and (run|execute|apply|use) it|give me a prompt .{5,} then (run|execute) it
action: warn
---

The user wants a prompt generated AND immediately executed in one step. Generate the prompt internally (do not output it as text), then execute it immediately. Classify the prompt type (agent dispatch / task / commands) and apply the reversibility gate for any destructive operations. Do not pause between generation and execution unless the reversibility gate triggers.
