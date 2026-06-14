---
name: detect-success-criteria
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (with\s+)?(well.defined|well defined|clear|explicit|measurable)\s+success\s+criteria|success\s+criteria\s+first|define\s+success\s+criteria|what\s+does\s+success\s+look\s+like
action: warn
---

The user wants success criteria defined before acting. Before executing the task, invoke the `success-criteria` skill and output a numbered list of 3-5 measurable, verifiable success criteria that define when this task is complete. Then proceed with implementation.
