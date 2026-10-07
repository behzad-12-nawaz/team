# Contract tests + mock API (Task 6)

Tests check the **shapes** from `../contract/00_contract.md` — status codes and
required keys only, never exact fixture values (except where the contract pins
them, e.g. confirm -> `"active"`, bot send -> `true`).

## Run against the mock (Day 2)

```bash
pip install -r requirements.txt        # once

# terminal 1 — start the mock on port 9000
cd mock-api
uvicorn main:app --port 9000

# terminal 2 — run the tests
BASE_URL=http://localhost:9000 pytest
```

PowerShell:

```powershell
$env:BASE_URL="http://localhost:9000"; pytest
```

## Run against the real backend (Day 4)

```bash
BASE_URL=<real-backend-url> pytest
```

## Files

- `test_contract.py` — one test per contract API row + error shapes (401/403/404/422)
- `mock-api/` — `# MOCK: replace on merge day`; delete it when the real backend exists
