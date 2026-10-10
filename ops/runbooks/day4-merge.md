# Day 4 — Merge-day runbook (Task 6)

Gospel: `docs/README_team_schedule.md` merge order + each task PLAN "Merge day".
Merge = flip a switch, never rewrite. `contract/` is frozen; any change = `"Contract change: ..."` + sync all 6 copies.

## Verified status (2026-10-07)

| Part | State | Evidence |
|---|---|---|
| 4 hero projects (team/bot/portal/team-hello-dashboard) | ✅ green, prod live | probes → 200; `{"hello":"dosecare-api"}` etc. |
| PR #11 `feature/api-backend` checks | ✅ green after Task 6 synced main into the branch (`c69eec3`) | CodeRabbit + 4×Vercel success |
| Frontends on main | ✅ merged (PR #5 portal, PR #12 dashboard) | `origin/main` has real folders |
| Backend code on main | ❌ not yet — only PR #11 | must merge (owner Task 1) |
| Bot code anywhere | ❌ no PR yet | owner Task 2 must open one |

## Step order + exact actions

### Step 0 — owner hand-offs (blockers to clear first)
1. **Task 1:** review + merge PR #11 (CODEOWNERS: api/ = @muhammadabdullah181). Reply ✅ on issue #6.
2. **Task 2:** push `bot/` real code + open PR. Reply ✅ on issue #7.
3. **Task 3:** confirm `ai/` package installable (`uv add ../ai`). Reply ✅ on issue #8.
4. **Task 5:** hand Task 1 `make_weekly_pdf.py`. Reply ✅ on issue #10.

### Step 1 — Backend (Task 1 + Task 6)
1. Merge PR #11 → main.
2. Task 6: on Vercel, point the `team` project's **Root Directory → `api/`** (today: `scripts/hello-api`). Confirm Python build: `pyproject.toml` + `uv.lock`; add `vercel.json` if the Python preset needs a start/serverless entry. `api/Dockerfile` is NOT used by Vercel.
3. Set env vars on that project: `DATABASE_URL` (Neon/Supabase, created Day 1), `JWT_SECRET`, `NOTIFIER=console` (for now), `BOT_SERVICE_TOKEN`, `OPENAI_API_KEY`.
4. Redeploy. Task 1 runs `seed.py` against `DATABASE_URL` (players from `contract/fixtures.json`).
5. Task 6 runs the contract tests against the **real** backend:
   `$env:BASE_URL="https://team-<host>.vercel.app"; cd ops\contract-tests; pytest -q` → expect **22 passed**.
   **GATE:** all contract tests pass.

### Step 2 — AI into bot (Task 2 + Task 3)
1. In `bot/`: `uv add ../ai`; set `AI_MODE=real`.
2. Task 3 sits with Task 2. First **real prescription photo** must return medicines.
   **GATE:** real photo → medicines.

### Step 3 — Bot ↔ backend (Task 2 + Task 1)
1. Bot project Root Directory → `bot/`; env: `API_URL=<backend url>`, `BOT_SERVICE_TOKEN`, `AI_MODE=real`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `VERIFY_TOKEN`.
2. Backend env: `NOTIFIER=http`, `BOT_URL=<bot url>`.
3. Test the loop: photo → Confirm → reminder with **buttons** → Taken.
   **GATE:** photo, confirm, reminder buttons, Taken all work.

### Step 4 — Caregiver dashboard (Task 4 + Task 1)
1. `team-hello-dashboard` project Root Directory → `caregiver-dashboard/`; env `VITE_USE_MOCK=false`, `VITE_API_URL=<backend url>`; redeploy.
2. Log in with seeded caregiver (`caregiver@demo.pk`).
   **GATE:** dashboard shows live dose status.

### Step 5 — Clinic portal (Task 5 + Task 1)
1. Same switch on `portal` project → `clinic-portal/`.
2. Task 1 copies Task 5's `make_weekly_pdf.py` → `api/app/reports.py`, wires `weekly.pdf`.
3. Test: link `ALI-4821`, consent, change medicine.
   **GATE:** link, change medicine, PDF work.

### Step 6 — Scenario run (everyone)
Run the 10 scenarios (`ops/demo/checklist.md`) using `demo-data.md`. Failures → GitHub issues (owner tag `task1`–`task5`, repro/expected/actual).

## Production "Root Directory" changes (Vercel dashboard)

| Project (prod URL) | Root today | Root on merge | Purpose |
|---|---|---|---|
| `team` (team-indol-iota…) | `scripts/hello-api` | `api/` | real backend |
| `bot` (bot-weld-ten…) | `scripts/hello-bot` | `bot/` | real bot |
| `team-hello-dashboard` | `scripts/hello-dashboard` | `caregiver-dashboard/` | real dashboard |
| `portal` (portal-virid-ten-32…) | `scripts/hello-portal` | `clinic-portal/` | real portal |

Change Root Directory only when the target folder has landed on `main` (else production breaks — that's exactly what red on PR #11 showed).

## After everything
- Re-run `ready-check.md`: rows 1–8 all ✅.
- Update `demo-data.md` phone placeholders → real WhatsApp test numbers; test each before demo.
- Day 5: bug list, deck real numbers/screenshots, 3 rehearsals, backup video.