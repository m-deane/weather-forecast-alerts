---
name: detect-security-scan
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (security|vulnerability|vuln)\s+(scan|audit|review|check)|(check|scan|audit)\s+for\s+(vulnerabilit|security\s+issue|secret)
action: warn
---

Invoking `/security-scan`. Scans for vulnerabilities, secrets, auth issues, and input validation gaps.

Check for: hardcoded secrets and API keys, SQL injection and XSS vectors, missing input validation at boundaries, insecure dependencies (CVEs), authentication/authorization gaps, and sensitive data exposure in logs or error messages. Report findings by severity (critical, high, medium, low).
