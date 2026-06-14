---
name: detect-claude-md-edit
enabled: true
event: tool_use
conditions:
  - field: tool_name
    operator: regex_match
    pattern: (Edit|Write)
  - field: tool_input
    operator: regex_match
    pattern: CLAUDE\.md
action: ask
---

You are about to modify a CLAUDE.md file. This is a Tier C (supervised) action — CLAUDE.md edits affect operator-level rules that govern every agent and session in this project.

Before proceeding:
1. State which specific finding or directive you are implementing
2. Confirm the edit does not contradict any existing Constitution or Grounding Rules item
3. Confirm the user has reviewed and approved the change (not inferred from a general "proceed")

If you are implementing a planned change from an audit or synthesis document, quote the specific finding ID. If this is an exploratory edit, stop and propose the change in text first — let the user approve before writing.
