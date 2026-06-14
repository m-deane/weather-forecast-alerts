---
name: validate-notebooks
description: Execute all Jupyter notebooks and report pass/fail/error per notebook
argument-hint: (no arguments — finds all .ipynb files automatically)
allowed-tools: Bash
cluster: debug
priority: 50
when_to_use: "When the user says 'test the notebooks', 'validate notebooks', 'check notebooks still work', 'retest notebooks', or after major API changes"
disable-model-invocation: false
user-invocable: true
---

# Validate Notebooks

## Step 1: Find All Notebooks

Run:
```bash
find . -name "*.ipynb" -not -path "./.git/*" -not -path "./node_modules/*" -not -path "./.ipynb_checkpoints/*" | sort
```

If no notebooks are found, report: "No `.ipynb` files found in this project." and stop.

List the notebooks found so the user can see the scope before execution begins.

## Step 2: Verify Jupyter Is Available

```bash
which jupyter
```

If `jupyter` is not found, stop and report:
```
jupyter is not installed or not on PATH.
To install: pip install jupyter nbconvert
Then retry.
```

Also verify `nbconvert` is available:
```bash
jupyter nbconvert --version
```

## Step 3: Execute Each Notebook

For each notebook path found in Step 1, run:
```bash
jupyter nbconvert --to notebook --execute --inplace \
  --ExecutePreprocessor.timeout=120 \
  "[notebook_path]" 2>&1
```

Track each result:
- **pass**: command exits 0
- **fail**: command exits non-zero
- **timeout**: output contains "CellTimeoutError" or "TimeoutError" and "120"

Note: use `nbformat` for any programmatic notebook edits — never raw string manipulation.

## Step 4: Report Results Table

After all notebooks have been tested, output a results table:

```
Notebook Validation Results
===========================

| Notebook | Status | Error |
|----------|--------|-------|
| path/to/a.ipynb | PASS | — |
| path/to/b.ipynb | FAIL | Cell 4: NameError: name 'foo' is not defined |
| path/to/c.ipynb | TIMEOUT | Exceeded 120s at cell 7 |
```

For each **FAIL** or **TIMEOUT**, provide a detail block:
```
[FAIL] path/to/b.ipynb
  Cell index: 4
  Error: NameError: name 'foo' is not defined
  (Full traceback available in the notebook's output cell)
```

For **TIMEOUT**, report:
```
[TIMEOUT] path/to/c.ipynb
  Cell index: 7
  The cell ran for >120 seconds. Likely cause: infinite loop, blocking I/O, or very large dataset.
  To investigate: open the notebook and run that cell manually.
```

## Step 5: Summary and Offer to Fix

After the table, print a one-line summary:
```
Result: [N] passed, [N] failed, [N] timed out — out of [total] notebooks.
```

If there are any failures or timeouts, ask:
```
Want me to dispatch an agent to fix the [N] failing notebooks?
```

If yes, analyse the errors and implement fixes for each failing notebook. Prefer targeted cell-level fixes. Use `nbformat` to read and write notebook files programmatically — never edit `.ipynb` files with raw string substitution.
