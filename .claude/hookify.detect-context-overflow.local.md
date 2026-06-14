---
name: detect-context-overflow
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: CONTEXT_WARNING|context.{0,10}(full|overflow|running out|80%|90%|almost full|nearly full)|save.{0,20}(prompt|work).{0,20}compact
action: warn
---

Context usage has exceeded 80%. Before continuing, preserve your work and free headroom:

**Step 1 — Save pending prompt work:**
If you have generated a prompt (via `/generate-prompt` or similar) that has not been executed, save it now:

```bash
mkdir -p .claude/prompts
```

Write the prompt to `.claude/prompts/{descriptive-name}.md` using the Write tool.

**Step 2 — Compact the session:**
Tell the user: "Context is at {X}%. I've saved the pending prompt to `.claude/prompts/{name}.md`. Run `/compact` to free headroom, then I'll resume from the saved file."

After compaction, read the saved prompt file and execute it:
```
Read .claude/prompts/{name}.md
```
Then follow the prompt instructions as if starting fresh.

**Step 3 — If compaction is insufficient:**
If context remains above 80% after compaction, recommend starting a new session:
"Context still high after compaction. Start a new session and run: 'Read .claude/prompts/{name}.md and execute it'"

**Automatic detection:** The PostToolUse hook `.claude/scripts/context-overflow-check.sh` monitors context usage and emits CONTEXT_WARNING when it exceeds 80%.
