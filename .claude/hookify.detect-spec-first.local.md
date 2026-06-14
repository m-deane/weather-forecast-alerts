---
name: detect-spec-first
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (implement|build|develop|create)\s+(?:a\s+)?(?:new\s+)?(feature|module|service|router|endpoint|page|route)\s+(?:that|to|for|which)\b
action: warn
---

You are about to plan or implement a feature. Check whether a spec exists first.

**Run:**
```bash
ls .claude/specs/ 2>/dev/null || echo "No specs directory"
```

- **Spec exists** for this feature: proceed — use the spec as the source of truth.
- **No spec directory or no matching spec**: invoke `/spec-first` before planning or coding. A signed-off `.claude/specs/{your-feature-slug}/spec.md` is required before agent dispatch or implementation begins.

Exception: if the user explicitly states "no spec needed" or "skip spec" for a declared throwaway/prototype scope, proceed and note the waiver.

Exception: if the change affects a single file or function, spec is optional — proceed directly.
