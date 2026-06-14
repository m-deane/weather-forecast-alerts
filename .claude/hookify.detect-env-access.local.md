---
name: detect-env-access
enabled: true
event: tool_use
conditions:
  - field: tool_name
    operator: regex_match
    pattern: (Read|Edit|Write|Bash)
  - field: tool_input
    operator: regex_match
    pattern: (\.env|secrets/|\.pem|\.key|credentials)
action: ask
---

You are about to read or modify a file that may contain secrets (`.env`, `secrets/`, key files, credentials).

Stop and confirm:
1. What specific value are you reading — is it a secret, or just a config key name?
2. Will any secret value appear in your response, a checkpoint file, or a tool call argument?
3. Has the user explicitly asked you to access this file?

Never include secret values (API keys, tokens, passwords) in inline responses, checkpoint files, or agent prompts. If you need to reference a secret, use the environment variable name only — never the value.
