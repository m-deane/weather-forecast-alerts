---
name: summarise
description: Produce a compact end-of-session summary covering commits made, files changed, key decisions, and open items for next session
argument-hint: (no arguments — reads git history and current state)
allowed-tools: Bash(git log *), Bash(git diff *), Bash(git status)
cluster: session
priority: 50
when_to_use: When the user asks for a session summary, "what did we do?", "summarise", "summarize", or "wrap up"
disable-model-invocation: false
user-invocable: true
---

# Session Summary

## Step 1: Collect Session Data

Commits made (up to 10):
!`git log --oneline -10`

Files changed across recent commits:
!`git diff --stat HEAD~5 2>/dev/null || git diff --stat HEAD~1 2>/dev/null`

Current uncommitted state:
!`git status --short 2>/dev/null`

## Step 2: Produce the Summary

Output a "SESSION SUMMARY" block — maximum 15 lines, four sections:

### 1. Commits Made This Session
List each commit SHA (short) and subject line. If none: "No commits this session."

### 2. Areas Changed
Name the files or directories most affected, grouped by area. One line per area.

### 3. Key Decisions
One sentence per decision or pattern established. Omit if none were made.

### 4. Open Items for Next Session
Any uncommitted files, unchecked plan items, or explicitly deferred work. If nothing open: "Nothing outstanding."

## Format Rules

- No padding, no filler
- One sentence per bullet
- If data is missing, say so in one word ("None") and move on

## Step 3: Compact Suggestion

If this session has been substantial (many tool calls, large files read, or long agent work), append this line to the summary:
> "Tip: consider running /compact now to keep context fresh for the next session."
