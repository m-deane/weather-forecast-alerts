---
name: detect-red-team
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (red[\s-]?team|what\s+could\s+go\s+wrong|argue\s+against|poke\s+holes|devil'?s?\s+advocate|adversarial(ly)?\s+(evaluat|review|check))
action: warn
---

Invoking `/red-team`. Adversarially evaluates from three angles: correctness, performance, and security.

For each angle, assume the design is wrong and argue against it. Correctness: find logic errors, race conditions, missed edge cases. Performance: find N+1 queries, unbounded loops, missing caches. Security: find injection vectors, auth bypasses, data leaks. Present each finding with severity, exploit scenario, and mitigation.
