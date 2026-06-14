---
name: detect-proceed
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: ^\s*(proceed|go ahead|do it|yes please|confirm|execute|run it|make it so|yes|go|ok|okay|sure|yep|yup)\s*[\.!]?\s*$
action: warn
---

Invoking `/proceed`. The user is confirming a pending action with a short affirmative. Do not ask for clarification. Review the most recently proposed action in your context window and execute it immediately. Apply the reversibility gate: if the action involves git push, PR creation, file deletion, or an external API call, state what you are about to do in one sentence first. For everything else tracked in git, execute without preamble.
