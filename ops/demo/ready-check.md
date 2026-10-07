# Day 3 evening — READY CHECK

Rules: every box must tick before merge day (PLAN "Ready when"). Owner
confirmations go through the team chat; Task 6 automation fills the rows it can.

## Status table

| # | Check | Owner | Result | Note |
|---|---|---|---|---|
| 1 | Task 1 (backend) "Ready when" test passed | @muhammadabdullah181 | ⬜ pending | ping in team chat |
| 2 | Task 2 (bot) "Ready when" test passed | @abdulrehman516820-del | ⬜ pending | ping in team chat |
| 3 | Task 3 (AI) "Ready when" test passed | @Ali-Hamza01 | ⬜ pending | ping in team chat |
| 4 | Task 4 (caregiver dashboard) "Ready when" test passed | @kamran33678 | ⬜ pending | ping in team chat |
| 5 | Task 5 (clinic portal) "Ready when" test passed | @AliAzeem92 | ⬜ pending | ping in team chat |
| 6 | Task 6 (ops) "Ready when": checklist + demo script written | @behzad-12-nawaz | ✅ PASS | checklist.md, demo-script.md exist |
| 7 | Contract tests pass against mock-api | Task 6 | ✅ PASS | 22 passed, 1.01 s — `BASE_URL=http://localhost:9000 pytest` |
| 8 | Deploy pipeline redeploys on merge (hello services green) | Task 6 | ⬜ pending | 404 at guessed URLs from shell — grab the real per-project URLs from vercel.com → Deployments and re-check in a browser |

## Last automated run (Day 3)

- `python -m pytest -q` vs a fresh mock on :9000 → **22 passed in 1.01 s**
- Deliverables on disk: `ops/demo/checklist.md` ✅ · `ops/demo/demo-script.md` ✅
- Hello URL probe (shell): `dosecare-hello-api.vercel.app` and
  `dosecare-hello-dashboard.vercel.app` returned 404 — need the **actual** URLs
  from the Vercel dashboard; do not guess project names.

## Day 4 consequence

Rows 1–5 and 8 must be ✅ before the merge order in `README_team_schedule.md`.
Anything FAIL → file a GitHub issue (owner tag `task1`–`task6`) the same evening.