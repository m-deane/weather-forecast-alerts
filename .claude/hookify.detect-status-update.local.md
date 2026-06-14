---
name: detect-status-update
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: ^\s*(this\s+is\s+(fixed|done|resolved|working|complete)\s+now|(it.?s|that.?s)\s+(fixed|done|resolved|working|complete)(\s+now)?|fixed\s+now|done\s+now|resolved\s+now|all\s+good\s+now)\s*[\.!]?\s*$
action: warn
---

The user is signalling that an external blocker has been resolved. Scan context for the most recently paused or blocked task and resume it immediately from where it stopped. Do not re-explain what was blocked. If no blocked task exists, acknowledge and ask what to do next.
