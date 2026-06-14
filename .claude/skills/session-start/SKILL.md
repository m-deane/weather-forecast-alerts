---
name: session-start
description: Run the session pre-flight briefing on demand — shows current branch, remotes, git status, incomplete sprints, and recent commits in a compact 8-line summary
argument-hint: (no arguments)
allowed-tools: Bash, Read, Agent
cluster: session
priority: 50
when_to_use: When the user wants a quick orientation at the start of a session, or asks "what's the current state" or "brief me"
disable-model-invocation: false
user-invocable: true
---

# Session Briefing

!`git branch --show-current 2>/dev/null`
!`git remote -v 2>/dev/null`
!`git status --porcelain 2>/dev/null | head -5`
!`git log --oneline -3 2>/dev/null`
!`ls .claude/checkpoints/ 2>/dev/null && echo "incomplete sprints found — run /resume" || echo "no incomplete sprints"`

## Instructions

Dispatch the `session-starter` agent to compile the above into a clean 8-line SESSION BRIEFING. The agent is fast (haiku model, read-only, 10 turns max).

After the briefing, ask: "Ready to start — what are we working on today?"
