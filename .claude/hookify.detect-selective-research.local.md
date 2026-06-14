---
name: detect-selective-research
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (only|just)\s+(find|look\s+for|search\s+for|show\s+me|give\s+me).{0,60}(support|agree|confirm|positive|favorable)|ignore\s+(the\s+)?(counter|opposing|alternative|dissenting|negative|critical|criticism)|don't\s+(include|show|mention)\s+(counter|opposing|criticism|negative|alternative)|filter\s+out\s+(negative|critical|opposing|dissenting)|skip\s+(the\s+|any\s+)?(criticism|counterargument|objection|opposing)
action: warn
---

The prompt requests one-sided evidence gathering. Present the requested evidence, then add: "For balance, the strongest counterarguments are:" followed by 2-3 opposing points with sources. This ensures the user sees the full picture even when they didn't ask for it.
