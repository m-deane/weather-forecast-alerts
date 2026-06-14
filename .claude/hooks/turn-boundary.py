#!/usr/bin/env python3
"""Stop hook: append an informative turn boundary to .claude/activity.md.

The Stop event fires at the end of each assistant turn. This hook reads the
activity log, summarises the tool activity recorded since the previous boundary
(by the PostToolUse logging hook), and appends a single marker line:

    --- TURN END 2026-06-07 11:30:00 | 3 edits, 5 cmds | settings.json, log-activity.py ---

It is idempotent and quiet: if there has been no new tool activity since the last
boundary, it appends nothing (no empty markers on conversational turns). This
fulfils the "Turn boundaries marked with `--- TURN END ---`" intent documented in
the activity-log header and turns the flat log into a per-turn record.

Always exits 0. Wire up as a Stop hook (Stop hooks take no matcher):
  { "hooks": [ { "type": "command",
                 "command": "python3 \"${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/turn-boundary.py\"" } ] }
"""
import sys
import os
import json
import datetime

BOUNDARY_PREFIX = "--- TURN END"


def main() -> int:
    try:
        json.load(sys.stdin)  # consume the Stop payload (not needed)
    except Exception:
        pass

    log_path = os.path.normpath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "activity.md")
    )
    try:
        with open(log_path, "r", encoding="utf-8") as fh:
            content = fh.read()
    except Exception:
        return 0  # no activity log yet — nothing to mark

    # Look only at lines after the most recent boundary.
    idx = content.rfind(BOUNDARY_PREFIX)
    tail = content[idx:] if idx != -1 else content

    edits, cmds = [], 0
    for line in tail.splitlines():
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 3:
            continue
        tool = parts[1]
        if tool in ("Write", "Edit"):
            name = os.path.basename(parts[2])
            if name and name not in edits:
                edits.append(name)
        elif tool == "Bash":
            cmds += 1

    if not edits and cmds == 0:
        return 0  # no new tool activity this turn — don't append an empty marker

    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    files = ", ".join(edits[:10]) + ("…" if len(edits) > 10 else "")
    summary = f"{len(edits)} edits, {cmds} cmds"
    marker = f"{BOUNDARY_PREFIX} {ts} | {summary}"
    if files:
        marker += f" | {files}"
    marker += " ---\n"

    try:
        with open(log_path, "a", encoding="utf-8") as fh:
            fh.write(marker)
    except Exception:
        return 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
