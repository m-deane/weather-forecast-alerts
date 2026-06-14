---
name: detect-retry
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: ^\s*retry\s*[\.!]?\s*$
action: warn
---

The user typed `retry` — this typically signals recovery from an agent stream-idle timeout or a failed previous attempt. Run `/retry` to check the most recent checkpoint file and re-dispatch only the failed agent with narrower scope and `model: sonnet` if the timeout persists.

Do not re-run the entire sprint — check the checkpoint directory first to confirm which agents completed before re-dispatching.
