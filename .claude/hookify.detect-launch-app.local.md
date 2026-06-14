---
name: detect-launch-app
enabled: true
event: prompt
conditions:
  - field: user_prompt
    operator: regex_match
    pattern: relaunch|refresh\s+(the\s+)?(app|dashboard|server|dev\s+server|streamlit|textbook|backend|frontend)|launch\s+the\s+(app|dashboard|server|dev\s+server)|restart\s+the\s+(app|server|dev\s+server)|start\s+the\s+(app|server)|spin\s+up\s+the\s+(app|server)
action: warn
---

The user wants to restart the dev server. Invoke the `launch-app` skill. Read CLAUDE.md for the project's dev command and port. Check what process is running on that port with lsof, kill it, then restart with the dev command. Always check lsof before killing to avoid killing the wrong process.
