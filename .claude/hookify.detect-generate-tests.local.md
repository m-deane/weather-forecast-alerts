---
name: detect-generate-tests
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (write|generate|add|create)\s+(unit\s+)?(tests?|specs?)\s+(for|to|covering)|(add|improve)\s+(test\s+)?coverage\s+(for|to|of)
action: warn
---

Invoking `/generate-tests`. Detects framework from project config and generates comprehensive tests with edge cases.

Read the project's test configuration (jest.config, pytest.ini, vitest.config, etc.) to determine the correct framework, assertion style, and file naming convention. Generate tests that cover the happy path, edge cases (empty input, invalid types, boundary values), and error paths. Place test files according to the project's existing convention (co-located or in a test directory).
