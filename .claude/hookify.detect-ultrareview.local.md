---
name: detect-ultrareview
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: ultra.?review\s+(the\s+)?(entire\s+)?(codebase|repo|library|dashboard|project|app)|ultrareview
action: warn
---

The user wants a deep codebase review. Invoke the `ultra-think` skill with codebase-analysis framing:
1. Map the full architecture: entry points, key modules, data flows, external dependencies
2. Audit for: code quality, security vulnerabilities, performance bottlenecks, test coverage gaps, dead code, inconsistent patterns
3. Produce a prioritised findings report: P1 (critical/broken), P2 (important gaps), P3 (polish)
4. After the report, offer: "Want me to launch an agent team to implement the P1 and P2 fixes?"
Be thorough — the user expects a complete audit, not a summary. Use multiple passes if needed.
