---
name: run-prompt
description: Find the most recently generated prompt in the conversation context and execute it — the second half of the "generate a prompt → run the prompt" workflow
argument-hint: (no arguments — reads prior conversation context)
allowed-tools: Read, Write, Edit, Bash, Agent
cluster: prompt-eng
priority: 40
when_to_use: When the user says "run the prompt", "execute the prompt", "use that prompt", or "run it now" after Claude has just generated a prompt or instruction block
disable-model-invocation: false
user-invocable: true
---

# Run Prompt

## Step 1: Identify the Prompt to Execute

Scan the conversation context for the most recently generated prompt. Look for:

1. A fenced code block containing imperative instructions or a task description
2. A large quoted text block formatted as a standalone instruction set
3. A section prefixed with "Prompt:" or "Generated prompt:"

If no candidate is found, say: "I don't see a prompt I generated in recent context. Could you paste the prompt you'd like me to run?" and stop.

## Step 2: Confirm Intent in One Sentence

State what you are about to execute:
> "Executing: [5-10 word description of what the prompt instructs]."

## Step 3: Classify and Execute

### If the prompt is an agent dispatch instruction (contains "dispatch", "launch agents", "run in parallel", "Agent tool"):
- Invoke the Agent tool with the prompt as the task
- Apply the sprint/parallel-agent protocol

### If the prompt is a task description or feature spec:
- Execute it directly as a fresh instruction

### If the prompt contains shell commands:
- Apply the reversibility gate before running any destructive commands

## Step 4: Report

1. **Done**: What was completed
2. **Files touched**: List each file created or modified
3. **Next step**: What the user should do next
