---
name: detect-fix-tests
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (make|get)\s+(the\s+)?test(s|\s+suite)?\s+(\w+\s+)*(green|pass|passing)|fix(ing)?\s+(the\s+)?(failing|broken|red)\s+tests?|tests?\s+(are|is)\s+(red|failing|broken)
action: warn
---

Invoking `/debug-test-failure`. Isolates the failure, traces root cause, and fixes — rather than blindly patching.

Run the failing test(s) first to capture the exact error output. Read the test code and the implementation under test. Diagnose whether the failure is in the test expectation or the implementation. Fix the root cause, not the symptom. Re-run the test suite to confirm green.
