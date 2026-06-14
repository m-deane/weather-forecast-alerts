# Skill Router

Reference for skill disambiguation when multiple skills could match or no hookify rule fires.

## Intent Clusters

| Cluster | Core skills | Discriminating signals | Negative signals (NOT this cluster) |
|---------|------------|----------------------|-------------------------------------|
| build | spec-first, tdd-feature, feature-dev, eval-harness, mcp-builder, generate-tests, refactor-code | "implement", "create", "add feature", "build", "write code for" | "review", "check", "audit" |
| review | code-review, architecture-review, security-scan, review-schema-changes, red-team, hallucination-check, rubric-eval, prompt-critique-rewrite | "review", "check", "audit", "evaluate", "is this safe" | "implement", "build", "create" |
| debug | debug-test-failure, verify-implementation, explain-code | "fix", "failing", "broken", "error", "debug", "why isn't" | "implement new", "add feature" |
| orchestrate | sprint, launch-agent-team, resume, retry, qa-iterate, goal, compose | "sprint", "agents", "parallel", "orchestrate", "recipe" | single-file changes |
| prompt-eng | generate-prompt, generate-agent-prompt, stability-test, prompt-ab-test, marginal-evidence-audit, condition-audit, version-prompt, eval-runner | "prompt", "skill", "stability", "regression", "version", "snapshot", "promote", "eval across the dataset" | "implement", "deploy" |
| session | session-start, session-conditioner, checkpoint-gate, synthesis-validator, calibration-retrospective, context-budget, summarise, whats-left, todo | "start", "status", "summarise", "what's left", "checkpoint" | implementation requests |
| ship | commit, create-pr, release, housekeeping, branch-consolidation, dependency-update, huggingface-deploy | "commit", "push", "release", "deploy", "sync", "PR" | "implement", "review" |
| reason | clarify, reverse-prompt, debate, steelman, ultra-think, success-criteria, bias-check, balanced-research | "clarify", "think deeply", "debate", "steelman", "argue for", "what am I missing", "check my bias", "balanced view" | direct implementation requests |

## Overlap Resolution

When two skills match, use this tiebreaker:

| Prompt pattern | Winner | Loser | Why |
|---------------|--------|-------|-----|
| "launch agents" / "run agents in parallel" | sprint | launch-agent-team | sprint has checkpoint persistence; prefer it for any multi-agent work |
| "review this code" / "check this PR" | code-review (project) | code-review:code-review (plugin) | project skill has project-specific context |
| "run it" / "go ahead" / "proceed" | proceed | run-prompt | proceed is the conversational convention; run-prompt is for generated prompts |
| "check the checkpoints" / "agents done?" | checkpoint-gate | synthesis-validator | checkpoint-gate is the precondition; run it first, then synthesis-validator |
| "generate a prompt to..." | generate-prompt | generate-agent-prompt | generate-agent-prompt is only for multi-agent dispatch prompts |
| "review the architecture" / "evaluate design" | architecture-review | code-review | architecture-review evaluates system-level design; code-review is file-level |
| "implement with TDD" / "test first" | tdd-feature | generate-tests | tdd-feature is the full workflow; generate-tests is test-only |

## Dark Skill Triggers

Skills with no hookify rule — route manually when these phrases appear:

| Phrase pattern | Route to |
|---------------|----------|
| "document the architecture" / "generate arch docs" | create-architecture-documentation |
| "build an MCP server" / "create a tool server" | mcp-builder |
| "evaluate the prompt" / "score against rubric" | rubric-eval |
| "review this prompt" / "improve this prompt" | prompt-critique-rewrite |
| "run the eval" / "scaffold an eval suite" | eval-harness |
| "workflow for this" / "multi-phase task" | workflow-orchestrator |
| "am I being biased?" / "check my assumptions" / "bias check" | bias-check |
| "balanced view on" / "both sides of" / "fair assessment" | balanced-research |
| "version this skill" / "snapshot this prompt" / "promote v2" / "roll back the skill" / "version history" | version-prompt |
| "evaluate this prompt across the dataset" / "score this summariser on all examples" / "dataset scorecard" | eval-runner |
| "verify against the source" / "is this summary faithful" / "check faithfulness" | hallucination-check (with `--source`) |

## Recipe Index

Multi-skill chains — invoke via `/compose {recipe-name}`:

| Recipe | Chain | Trigger |
|--------|-------|---------|
| feature-development | spec-first -> tdd-feature -> code-review -> verify-implementation | "full feature pipeline", "end-to-end feature" |
| skill-authoring | marginal-evidence-audit -> stability-test -> prompt-ab-test | "ship this skill", "prepare skill for sync" |
| post-sprint | checkpoint-gate -> hallucination-check -> synthesis-validator | "validate sprint results", "post-sprint checks" |
| debug-to-fix | debug-test-failure -> generate-tests -> verify-implementation | "fix and verify", "debug to green" |
| prompt-engineering | generate-prompt -> prompt-critique-rewrite -> stability-test | "create and test a prompt" |
| eval-summarisation | stability-test -> rubric-eval -> hallucination-check (--source) | "evaluate summarisation", "run summarisation eval", "test summarisation quality" (one email; for the whole dataset use the `/eval-runner` skill, which loops this recipe per example) |
| prompt-versioning | version-prompt create -> eval -> compare -> promote | "version this skill", "ship this skill change", "promote this prompt" |
