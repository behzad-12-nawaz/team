# Day 3 evening — READY CHECK

Rules: every box must tick before merge day (PLAN "Ready when"). Owner
confirmations go through the team chat; Task 6 automation fills the rows it can.

## Status table

| # | Check | Owner | Result | Note |
|---|---|---|---|---|
| 1 | Task 1 (backend) "Ready when" test passed | @muhammadabdullah181 | ⬜ awaiting reply | pinged via issue #6 |
| 2 | Task 2 (bot) "Ready when" test passed | @abdulrehman516820-del | ⬜ awaiting reply | pinged via issue #7 |
| 3 | Task 3 (AI) "Ready when" test passed | @Ali-Hamza01 | ⬜ awaiting reply | pinged via issue #8 |
| 4 | Task 4 (caregiver dashboard) "Ready when" test passed | @kamran33678 | ⬜ awaiting reply | pinged via issue #9 |
| 5 | Task 5 (clinic portal) "Ready when" test passed | @AliAzeem92 | ⬜ awaiting reply | pinged via issue #10 |
| 6 | Task 6 (ops) "Ready when": checklist + demo script written | @behzad-12-nawaz | ✅ PASS | checklist.md, demo-script.md exist |
| 7 | Contract tests pass against mock-api | Task 6 | ✅ PASS | 22 passed, 1.01 s — `BASE_URL=http://localhost:9000 pytest` |
| 8 | Deploy pipeline redeploys on merge (hello services green) | Task 6 | ✅ PASS | Live 2026-10-07: api `https://team-indol-iota.vercel.app/` (`{"hello":"dosecare-api"}`, `/health` ok), bot `https://bot-weld-ten.vercel.app/`, dashboard `https://team-hello-dashboard.vercel.app/`, portal `https://portal-virid-ten-32.vercel.app/` — all respond |

## Last automated run (Day 3)

- `python -m pytest -q` vs a fresh mock on :9000 → **22 passed in 1.01 s**
- Deliverables on disk: `ops/demo/checklist.md` ✅ · `ops/demo/demo-script.md` ✅
- Live URL probe (2026-10-07, via `vercel project ls`): api/bot/dashboard/portal all respond 200.
  Real URLs (the earlier guessed `dosecare-hello-*.vercel.app` names were wrong — use these):
  - hello-api: `https://team-indol-iota.vercel.app` (root `{"hello":"dosecare-api"}`, `/health` → `{"status":"ok"}`)
  - hello-bot: `https://bot-weld-ten.vercel.app` (root `{"hello":"dosecare-bot"}`)
  - caregiver dashboard: `https://team-hello-dashboard.vercel.app`
  - clinic portal: `https://portal-virid-ten-32.vercel.app`

## Day 4 consequence

Rows 1–5 and 8 must be ✅ before the merge order in `README_team_schedule.md`.
Anything FAIL → file a GitHub issue (owner tag `task1`–`task6`) the same evening.