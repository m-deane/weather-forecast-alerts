---
name: detect-unverified-claims
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (the (tasks?|habits?|calendar|router|schema|model|component|page|field|type|function|procedure) already|currently (has|returns|includes|contains|exposes)|was (added|created|modified) in|the existing (field|method|function|procedure|route|component|type))
action: warn
---

You are making an assertion about current codebase state without having read the file in this session.

**Annotate each claim before proceeding.** For every assertion about what currently exists, returns, or contains, mark it with one of:

- **[R]** — read this file in the current session (verified)
- **[I]** — inferred from context, git history, or prior knowledge (unverified)
- **[U]** — uncertain

**For any [I] or [U] claim**: use the Read tool on the relevant file before using the claim to drive a decision, generate code, or dispatch an agent.

**Why this matters**: Unverified claims about codebase state are the primary source of hallucinated file paths, non-existent fields, and stale API shapes in agent prompts. An agent dispatched with an [I] claim ("the Task model already has a `pinnedAt` field") that turns out to be wrong will generate code referencing a non-existent column, failing silently until build or runtime.

**Example**: Instead of "the tasks router already handles soft-delete via `deletedAt`", write "the tasks router [I] handles soft-delete — I will read `src/server/api/routers/tasks.ts` to verify before using this in an agent prompt."
