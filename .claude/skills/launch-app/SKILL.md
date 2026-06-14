---
name: launch-app
description: Kill any running dev server and restart it cleanly — supports single-service (npm/port-3000) and multi-service projects via a Services block in CLAUDE.md
argument-hint: (optional: service name — e.g. "frontend", "backend", "streamlit". Omit to restart all services or the default npm dev server)
allowed-tools: Bash
cluster: build
priority: 50
when_to_use: When the user says "launch", "relaunch", "launch the app", "restart the dev server", "relaunch the dashboard", "relaunch the [service name]", "relaunch all", "refresh [service]", or "start the app"
disable-model-invocation: true
user-invocable: true
---

# Launch App

## Service Map Format (add to your project CLAUDE.md to enable multi-service mode)

```
## Services
- name: frontend
  port: 5173
  command: npm run dev
- name: backend
  port: 8000
  command: uvicorn main:app --reload --port 8000
- name: streamlit
  port: 8501
  command: streamlit run app.py --server.port 8501
```

If no `## Services` section is present in CLAUDE.md, the skill falls back to single-service mode: kill port 3000 and run `npm run dev`.

---

## Step 1: Detect Mode (Multi-Service or Single-Service)

Check whether CLAUDE.md contains a `## Services` section:

!`grep -n "^## Services" CLAUDE.md 2>/dev/null | head -1 || echo "NO_SERVICES_BLOCK"`

**If the output is `NO_SERVICES_BLOCK`** → skip to **Single-Service Mode** below.

**If a `## Services` line is found** → continue to **Multi-Service Mode**.

---

## Multi-Service Mode

### Step 2a: Parse the Service Map

Extract the service definitions from CLAUDE.md:

!`python3 - <<'EOF'
import re, sys

try:
    text = open("CLAUDE.md").read()
except FileNotFoundError:
    print("ERROR: CLAUDE.md not found"); sys.exit(1)

# Extract the Services block (everything after ## Services until the next ## heading)
match = re.search(r"^## Services\s*\n(.*?)(?=^## |\Z)", text, re.MULTILINE | re.DOTALL)
if not match:
    print("ERROR: Services block not parseable"); sys.exit(1)

block = match.group(1)

# Parse YAML-like list items: - name: x\n  port: y\n  command: z
services = []
current = {}
for line in block.splitlines():
    line = line.rstrip()
    if re.match(r"^\s*-\s*name:", line):
        if current: services.append(current)
        current = {"name": re.sub(r"^\s*-\s*name:\s*", "", line).strip()}
    elif re.match(r"^\s+port:", line):
        current["port"] = re.sub(r"^\s+port:\s*", "", line).strip()
    elif re.match(r"^\s+command:", line):
        current["command"] = re.sub(r"^\s+command:\s*", "", line).strip()
if current and "name" in current:
    services.append(current)

for svc in services:
    print(f"{svc.get('name','')}|{svc.get('port','')}|{svc.get('command','')}")
EOF
`

The output is one line per service in the format: `name|port|command`.

### Step 3a: Determine Which Services to (Re)launch

- If the user named a specific service (e.g. "relaunch the backend"), match that name from the parsed list.
- If the user said "relaunch all", "launch the app" with no specific service, or triggered this skill without a named service argument, restart **all** services in order.

### Step 4a: For Each Target Service — Port Conflict Pre-Check

Before starting each service, check whether the port is occupied:

```bash
lsof -ti :<port> 2>/dev/null
```

- If the command returns output, a process is using the port. Show the PID and process name:
  ```bash
  lsof -i :<port> 2>/dev/null
  ```
- Then kill it:
  ```bash
  lsof -ti :<port> | xargs kill -9 2>/dev/null || true
  ```
- Verify the port is now free:
  ```bash
  lsof -ti :<port> 2>/dev/null || echo "port <port> is free"
  ```

### Step 5a: Start Each Service

For each target service, run its configured command in the background:

```bash
<command> &
```

After issuing the start command for each service, report:
```
<name> starting on http://localhost:<port>
```

After all services are started, print a summary:
```
Services launched:
  frontend  → http://localhost:5173
  backend   → http://localhost:8000
  streamlit → http://localhost:8501
```

If any service port could not be freed (e.g. permission denied), report the PID and suggest: `sudo kill -9 <pid>`.

---

## Single-Service Mode (fallback — no ## Services block in CLAUDE.md)

### Step 2b: Detect Start Command

!`cat package.json 2>/dev/null | python3 -c "import json,sys; p=json.load(sys.stdin); print(p.get('scripts',{}).get('dev','npm run dev'))" 2>/dev/null || echo "npm run dev"`

### Step 3b: Port Conflict Pre-Check on Port 3000

Check what's running on port 3000:

!`lsof -ti :3000 2>/dev/null || echo "port 3000 is free"`

If the port is occupied, show details before killing:
```bash
lsof -i :3000 2>/dev/null
```

Kill the existing process:
```bash
lsof -ti :3000 | xargs kill -9 2>/dev/null || true
```

Verify port is free:
```bash
lsof -ti :3000 2>/dev/null || echo "port 3000 is free"
```

### Step 4b: Start Dev Server

```bash
npm run dev
```

Run in background so the user can continue working. Report:
```
Dev server starting on http://localhost:3000
Run: lsof -ti :3000 to verify the process started
```

If killing failed (permission issue), report the PID and suggest: `sudo kill -9 <pid>`.
