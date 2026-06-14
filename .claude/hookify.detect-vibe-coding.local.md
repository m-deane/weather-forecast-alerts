---
name: detect-vibe-coding
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (just make it work|don't worry about how|ship it|won't read (the )?(code|diff)|whatever('s| is) fastest|just get it (working|done)|don't care how|do whatever|vibe (code|coding)|i trust you( on this)?|just do it)
action: warn
---

You are about to accept or produce code without reading or reviewing it — this is vibe coding.

**Classify scope before proceeding:**

- **Throwaway / prototype scope** (the user explicitly says this is a spike, demo, or throwaway): vibe coding is permitted. State the waiver explicitly: "Proceeding as throwaway — diff review skipped by user request."
- **Production scope** (default — any doubt means production): vibe coding is prohibited. Run the standard gates: review the diff, run lint + build + tests, confirm no placeholders or unreviewed changes before reporting done.

If the user has not explicitly declared throwaway scope, treat this as production and apply the full Agentic Engineering workflow.
