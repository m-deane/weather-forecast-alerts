---
name: detect-review-schema
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (review|check|safe|verify)\s+(the\s+)?(schema|migration|database)\s+(change|update|alter)|schema\s+(change|update)\s+(safe|ready|review)|(migration|schema)\s+safe(ty)?
action: warn
---

Invoking `/review-schema-changes`. Runs the structured safety checklist before applying migrations.

Check for: backward compatibility (can the old code still run?), data loss risk (column drops, type narrowing), lock duration on large tables, index impact, rollback plan, and whether the migration is idempotent. Flag any irreversible operations as Tier C (confirm every action).
