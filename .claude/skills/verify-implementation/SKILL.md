---
name: verify-implementation
description: Run the full quality gate — lint, build, and test suite — and report failures
argument-hint: (no arguments needed)
allowed-tools: Bash(npm run *)
cluster: debug
priority: 40
when_to_use: When the user asks to verify, check, or validate that the implementation is working correctly
disable-model-invocation: false
user-invocable: true
---

# Verify Implementation

Run all quality gates and report results.

## Step 0: Capture Baseline

Before running quality gates, capture the current state for regression detection:

```bash
# Capture test count baseline (adapt command to project's test runner)
npm test -- --listTests 2>/dev/null | wc -l || pytest --collect-only -q 2>/dev/null | tail -1 || echo 'no baseline available'
```

Store this count. After the quality gate runs, compare:
- If fewer tests pass now than in the baseline, flag as **REGRESSION** (not just failure)
- If test count decreased, flag as **TESTS REMOVED** (may be intentional, but verify)

## Steps

1. **Lint**: `npm run lint`
2. **Build**: `npm run build`
3. **Tests**: `npm test`

## Current Status

- Lint: !`npm run lint 2>&1 | tail -5`
- Build: !`npm run build 2>&1 | tail -10`
- Tests: !`npm test 2>&1 | tail -20`

## Instructions

Run each gate sequentially. If any gate fails, report:
- Which gate failed
- The specific error messages
- The files/lines involved
- Suggested fix

Do not proceed to the next gate if the previous one fails — fix the current failure first.

## Regression Report

After all gates complete, compare against the Step 0 baseline:

Report: {X} tests passed (baseline: {Y}). Regressions: {list or 'none'}.

If X < Y, list the specific tests that regressed. If test count decreased, list removed test files. Flag both conditions prominently — regressions are higher priority than new failures.

## Assumption Log

After running all gates, surface any conditions that were assumed rather than verified:
- Was the test baseline established before this session's changes? If not, pre-existing failures may be reported as regressions.
- Are there new tests covering the implemented behaviour, or is the gate passing solely on pre-existing tests?
- State these explicitly rather than reporting a clean gate with hidden assumptions.

## Output Stability Note

For prompts or skills being validated: run the same prompt 3-5× on the same input and compare outputs. Jaccard pairwise similarity < 0.50 between runs indicates missing condition specification rather than implementation variance — the fix is to add missing conditions to the prompt, not to change the implementation.
