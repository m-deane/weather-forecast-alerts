---
name: detect-confirmation-seeking
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: (prove|confirm|validate|verify)\s+(that|whether|if|my|this|it)\s+.{0,40}(hypothesis|theory|belief|claim|view|opinion|position|argument|idea|(is|are)\s+(better|worse|superior|inferior|healthier|faster|slower|more\s+effective|more\s+efficient))|(prove|confirm)\s+\w+\s+(is|are)\s+(better|worse|superior|inferior|healthier|faster|slower|right|correct|true)|find\s+(evidence|articles?|papers?|sources?|proof|support)\s+(for|that\s+support|supporting|backing|confirming)|why\s+is\s+\w+\s+(better|worse|superior|inferior)\s+(?:than|to)|build\s+(an?\s+)?(argument|case)\s+(for|against|that)
action: warn
---

The prompt asks to confirm a specific position. Before proceeding, broaden the search:

1. Search for evidence **both for AND against** the stated position
2. Present findings in a "Evidence For / Evidence Against" structure
3. Note the strength of evidence on each side

If the user specifically wants one-sided advocacy, suggest: "Use /steelman [position] for the strongest case, or /bias-check to examine your assumptions first."
