---
name: housekeeping
description: Multi-step post-merge housekeeping — tests, deprecation audit, docs, notebooks, deps, changelog, commit
argument-hint: (no arguments — works from current repo state)
allowed-tools: Bash(*), Read, Edit
cluster: ship
priority: 50
when_to_use: "When the user says 'housekeeping', 'carry out housekeeping', 'run housekeeping', or after a major merge or release"
disable-model-invocation: false
user-invocable: true
---

# Housekeeping

Run a structured housekeeping pass over the current repository. Each step is conditional — skip cleanly if the relevant files or tooling are not present.

## Step 0: Orientation

Inspect the repo to determine stack and what tooling is available:

```bash
ls pyproject.toml setup.py requirements.txt package.json Gemfile go.mod Cargo.toml 2>/dev/null
ls *.ipynb **/*.ipynb 2>/dev/null | head -5
ls CHANGELOG.md CHANGELOG.rst HISTORY.md 2>/dev/null
git log --oneline -10
```

Record findings. Steps below adapt based on what exists.

---

## Step 1: Compatibility Check — Run the Test Suite

Run the project's standard test command and flag any failures.

**Detect test command:**
- `pytest` if `pyproject.toml` or `setup.py` present
- `npm test` if `package.json` present
- `cargo test` if `Cargo.toml` present
- `go test ./...` if `go.mod` present

```bash
# Python
pytest --tb=short -q 2>&1 | tail -20

# Node
npm test 2>&1 | tail -20

# Go
go test ./... 2>&1 | tail -20

# Rust
cargo test 2>&1 | tail -20
```

**On failure:** list all failing tests. Do not stop — continue with remaining steps and note failures in the final summary. The user decides whether to fix before committing.

---

## Step 2: Deprecation Audit

Scan source files for common deprecated API patterns. Only grep in source directories that exist (e.g. `src/`, `lib/`, package subdirectories).

```bash
# Python — common deprecation patterns
grep -rn "\.iloc\[" --include="*.py" . | head -20
grep -rn "from sklearn.utils.testing" --include="*.py" . | head -10
grep -rn "np\.bool[^_8]" --include="*.py" . | head -10
grep -rn "pd\.DataFrame\.append\b" --include="*.py" . | head -10

# Node/TypeScript — common deprecation patterns
grep -rn "\.substr(" --include="*.ts" --include="*.tsx" --include="*.js" . | head -20
grep -rn "createServer\b" --include="*.ts" --include="*.js" . | head -10
```

Report any hits grouped by file. Flag patterns that must be fixed before the next release. If no hits found, note "No deprecated patterns found."

---

## Step 3: Docs / README Sync

Check whether documentation references match the current codebase.

**Actions:**
1. List all markdown/RST docs files:
   ```bash
   find . -name "*.md" -o -name "*.rst" | grep -v node_modules | grep -v .git | head -30
   ```
2. If a `quickstart/`, `docs/`, `guides/`, or `examples/` directory exists, scan for function calls, import paths, or class names that appear in docs but not in source:
   ```bash
   grep -rn "^from \|^import " --include="*.py" docs/ quickstart/ guides/ 2>/dev/null | head -20
   ```
3. Flag any import paths or function names that look stale (e.g. reference old module names identified in Step 2).

If docs directory does not exist, skip with: "No docs directory found — skipping docs sync."

---

## Step 4: Notebook Validation (conditional)

**Only run if `.ipynb` files are present in the repo.**

```bash
# Check for notebooks
NB_COUNT=$(find . -name "*.ipynb" | grep -v ".ipynb_checkpoints" | grep -v node_modules | wc -l | tr -d ' ')
echo "Notebooks found: $NB_COUNT"
```

If `NB_COUNT` is 0, skip this step entirely.

If notebooks exist, execute each one with `jupyter nbconvert --to notebook --execute`:

```bash
find . -name "*.ipynb" \
  | grep -v ".ipynb_checkpoints" \
  | grep -v node_modules \
  | sort \
  | while read nb; do
    echo -n "Testing: $nb ... "
    jupyter nbconvert --to notebook --execute --ExecutePreprocessor.timeout=120 \
      --output /tmp/nb_test_out.ipynb "$nb" 2>&1 \
      && echo "PASS" || echo "FAIL"
  done
```

**Handling timeouts and server-launching notebooks:**
- If a notebook launches a server (Dash, Streamlit, Flask), it will hang. Skip it and note it as "SKIP (server-launch detected)".
- Set `--ExecutePreprocessor.timeout=120` to cap each notebook at 2 minutes.
- Notebooks that fail: display the failing cell and error message.

Produce a summary table: `PASS / FAIL / SKIP` per notebook.

---

## Step 5: Requirements / Lock File Sync

Ensure dependency lock files are in sync with declared dependencies.

**Python:**
```bash
# If requirements.txt exists, check if pip freeze output differs significantly
if [ -f requirements.txt ]; then
  echo "Current requirements.txt:"
  cat requirements.txt | head -20
  echo ""
  echo "Suggest running: pip freeze > requirements.txt"
  echo "(Review diff before committing — pip freeze includes all transitive deps)"
fi

# If pyproject.toml exists with poetry, check lock file
if [ -f poetry.lock ]; then
  poetry check
fi
```

**Node:**
```bash
# If package-lock.json or yarn.lock exists, verify integrity
if [ -f package-lock.json ]; then
  npm ci --dry-run 2>&1 | tail -5
elif [ -f yarn.lock ]; then
  yarn check --integrity 2>&1 | tail -5
fi
```

Report any mismatches. If everything is in sync, note "Dependencies in sync."

---

## Step 6: Changelog Entry

Add an entry to the changelog for today's work.

**Detect changelog file:**
```bash
ls CHANGELOG.md CHANGELOG.rst HISTORY.md CHANGES.md 2>/dev/null | head -1
```

If no changelog exists, create `CHANGELOG.md` with an initial entry.

**Get commits since last changelog entry:**
```bash
# Get commits since last tag, or last 20 if no tags
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [ -n "$LAST_TAG" ]; then
  git log "${LAST_TAG}..HEAD" --oneline
else
  git log --oneline -20
fi
```

**Write the entry** at the top of the changelog (below any title heading) in this format:

```markdown
## [Unreleased] — 2026-05-13

### Changed
- <commit summary 1>
- <commit summary 2>

### Fixed
- <commit summary 3>
```

Use today's date. Group commits into Changed / Fixed / Added / Removed where you can infer the type from the commit message. Skip merge commits and bot commits.

If the most recent entry is already dated today (a previous housekeeping run), append to it rather than creating a duplicate.

---

## Step 7: Commit All Changes

Stage all files modified by this housekeeping run and create a single commit.

```bash
git status --short
```

Stage by name (never `git add -A` or `git add .` blindly):
- Updated docs files
- Updated changelog
- Updated requirements/lock files
- Fixed notebooks (if any were repaired)

Exclude: `.env*`, `node_modules/`, `__pycache__/`, `.next/`, `*.pem`, generated build output.

```bash
git add <file1> <file2> ...
git commit -m "$(cat <<'EOF'
chore: post-merge housekeeping

- Tests: <pass/fail summary>
- Deprecation audit: <clean/N issues>
- Docs sync: <clean/N updates>
- Notebooks: <N pass / N fail / N skip> (if applicable)
- Deps: <in sync / updated>
- Changelog: entry added for <date>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Final Summary

Print a structured summary:

```
Housekeeping complete — <date>

Step 1 Tests:        PASS (X tests) | FAIL (X failures)
Step 2 Deprecation:  Clean | X patterns found
Step 3 Docs:         In sync | X files updated
Step 4 Notebooks:    N/A | X pass / X fail / X skip
Step 5 Deps:         In sync | Updated
Step 6 Changelog:    Entry added
Step 7 Commit:       <short-hash> | Nothing to commit

Action required: <list any failures or items that need manual attention>
```
