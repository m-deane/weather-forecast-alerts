---
name: detect-session-start-opportunity
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (let's (start|work on|tackle|build|fix|implement)|I('d like to| want to) (start|work on|build|implement|tackle)|starting (a new|the) (session|sprint|feature|task|workstream)|new sprint|fresh (start|session)|beginning.{0,20}work on|kicking off)
action: warn
---

You are starting a new workstream. Inject session conditions before the first tool call — not after the first wrong assumption.

**Run:** `/session-conditioner [brief task description]`

This skill auto-fills:
- **L1 Jurisdiction** — reads Stack line from CLAUDE.md (e.g. "Next.js 15 / tRPC v11 / Prisma 6")
- **L2 Posture** — infers implementation/diagnosis/refactor/review from recent git log
- **L3 Objective** — prompts you for the observable outcome if not already stated
- **Switch variables** — injects project-specific defaults read from CLAUDE.md Critical Patterns

A session without a populated L3 at the start produces work that is locally reasonable but not project-correct. The session-conditioner turns a 30-second upfront investment into a session that stays on target without mid-task corrections.
