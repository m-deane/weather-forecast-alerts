---
name: detect-create-pr
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (create|open|make|submit|raise|put\s+up)\s+(a\s+)?(PR|pull\s+request|merge\s+request)
action: warn
---

Invoking `/create-pr`. Creates a PR with proper title, description, and checklist.

Before creating the PR: verify the branch is pushed to the remote, run `git diff main...HEAD` to understand all changes, and draft a title under 70 characters. Include a summary section, test plan checklist, and link to any related issues. Apply the reversibility gate — confirm the target branch with the user before submitting.
