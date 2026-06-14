#!/usr/bin/env python3
"""PostToolUse hook: append a one-line activity record to .claude/activity.md.

Claude Code passes the hook payload as JSON on STDIN (not via environment
variables). This script parses that JSON, formats a single line, and appends it
to the activity log. It is best-effort and silent by design: any parse or IO
failure is swallowed (exit 0) so the hook never interferes with the tool call.

Wire up in settings.json (matcher is a TOOL-NAME regex, not a permission glob):

    { "matcher": "Write|Edit|MultiEdit|NotebookEdit|Bash",
      "hooks": [ { "type": "command",
                   "command": "python3 \"${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/log-activity.py\"" } ] }

The log path is resolved relative to this file (.claude/hooks/ -> .claude/), so
it is correct regardless of the hook's working directory or environment.
"""
import sys
import os
import json
import datetime


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0  # malformed/empty payload — do nothing

    tool = data.get("tool_name", "") or ""
    tool_input = data.get("tool_input", {}) or {}
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if tool == "Bash":
        detail = (tool_input.get("command") or "").replace("\n", " ")[:120]
        label = "Bash "
    elif tool in ("Write", "Edit", "MultiEdit", "NotebookEdit"):
        detail = tool_input.get("file_path") or tool_input.get("notebook_path") or ""
        # Don't log writes to the activity log or the TODO file themselves.
        if os.path.basename(detail) in ("activity.md", "TODO.md"):
            return 0
        label = "Write" if tool == "Write" else "Edit "
    else:
        return 0  # tool not tracked

    if not detail:
        return 0

    log_path = os.path.normpath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "activity.md")
    )
    try:
        with open(log_path, "a", encoding="utf-8") as fh:
            fh.write(f"{ts} | {label} | {detail}\n")
    except Exception:
        return 0  # log not writable — stay silent
    return 0


if __name__ == "__main__":
    sys.exit(main())
