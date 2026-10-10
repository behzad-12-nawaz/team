# Agent brief — align `api/seed.py` demo data with the frozen fixtures, then seed the live Neon DB

**Delegated by:** ops / backend owner hand-off
**Executor:** a small autonomous coding agent
**Repo:** DoseCare monorepo (Windows, PowerShell 5.1; Python via `uv`)
**Live backend:** https://api-seven-zeta-25.vercel.app  (Vercel project `dosecare`, `DATABASE_URL` set in project env)

## Why
The 22 ops contract tests (`ops/contract-tests/`) were built against the team's frozen demo data.
Every consumer — the mock (`ops/contract-tests/mock-api/main.py`), the contract tests,
`clinic-portal/src/pages/Login.jsx`, `ops/PLAN.md`, `ops/runbooks/day4-merge.md` — logs in with
`@demo.pk` / `demo`. **The real backend is seeded from a divergent, older user set**, so even a
correctly seeded DB makes login fail:

| Source | Ali (patient) | Caregiver | Doctor |
|---|---|---|---|
| `ops/demo/demo-data.md` (SOURCE OF TRUTH) | `ali@demo.pk` / `demo` (id 1) | `caregiver@demo.pk` / `demo` (id 2) | `doctor@demo.pk` / `demo` (**id 9**) |
| `api/seed.py` + `api/tests/conftest.py` (WRONG) | `ali@example.com` / `patient123` (id 1) | `saba@example.com` / `caregiver123` (id 2) | `dr.ahmed@example.com` / `doctor123` (**id 3**) |

## Definition of Done
1. `api/seed.py` seeds exactly the committed demo people (update the `USERS` list):

| id | role | name | phone | email | password |
|----|------|------|-------|-------|----------|
| 1 | patient | Ali Khan | `923001234567` | `ali@demo.pk` | `demo` |
| 2 | caregiver | Fatima Khan | `923001112223` | `caregiver@demo.pk` | `demo` |
| 3 | patient | Amina Bibi | `923007654321` | `amina@demo.pk` | `demo` |
| 4 | caregiver | Bilal Ahmed | `923004445556` | `bilal@demo.pk` | `demo` |
| 5 | patient | Sara Ahmed | `923009876543` | `sara@demo.pk` | `demo` |
| 9 | doctor | Dr. Usman | `923007778889` | `doctor@demo.pk` | `demo` |

   (ids 6–8 are intentionally unused — they match the mock's `user_id`s.)

2. Keep the relationships, but point the doctor link at **doctor 9** (`DOCTOR_LINK["doctor_id"] = 9`,
   was `3`): `CaregiverLink(patient_id=1, caregiver_id=2)`, `DoctorLink(id=7, patient_id=1,
   doctor_id=9, status=active, consent_at=2026-10-01T10:00:00)`, `Prescription(id=11, patient_id=1,
   status=active, version=1)`, Medicines (Metformin 500 mg `["08:00","20:00"]`, Amlodipine 5 mg
   `["09:00"]`) and Doses `101–104` unchanged (ids/statuses must stay exactly as they are).

3. The live Neon DB ends up containing that data.

## Steps
1. Edit `api/seed.py` only (do **not** touch `ops/contract` or `ops/contract-tests` — frozen).
   - Replace the `USERS` list with the table above (keep `id`, `invite_code="ALI-4821"` on Ali only).
   - Change `DOCTOR_LINK` `doctor_id` to `9`.
   - Leave everything else (password hashing, `get_or_create`, `_reset_sequences`, `--confirm-remote` guard) intact.
2. Seed the live DB. From `api/`, with the DSN from the repo-root `.env`:
   ```powershell
   $db=(Select-String -Path "..\.env" -Pattern "^DATABASE_URL=" | Select-Object -First 1).Line.Substring(13).Trim()
   $env:DATABASE_URL=$db
   uv run seed.py --confirm-remote
   ```
   Expect `seed done`. (DB currently has tables but no rows; if any row exists, wipe the seeded
   tables first so ids match exactly, then reseed.)
3. Verify live logins (expect 200 with `access_token`, `role`, `user_id`):
   ```powershell
   foreach($e in @("caregiver@demo.pk","doctor@demo.pk","ali@demo.pk")){
     (Invoke-RestMethod -Method Post -Uri "https://api-seven-zeta-25.vercel.app/auth/login" `
        -ContentType "application/json" -Body (@{email=$e;password="demo"}|ConvertTo-Json)) | ConvertTo-Json -Compress
   }
   ```
   Expect `user_id` 2, 9, 1 respectively.
4. Run the ops contract suite against the live backend:
   ```powershell
   # from ops/contract-tests
   $env:BASE_URL="https://api-seven-zeta-25.vercel.app"
   uv run --project E:\Code\SMIT\dosecare\api pytest -q
   ```
   **Target: 21 pass / 1 fail** — the single allowed failure is `test_bot_send` (that route belongs
   to the bot service, Task 2, and is out of scope here). Any *other* failure is a real backend
   contract bug: capture the exact request + response (status + body) and report it; **do not edit
   the tests or weaken assertions**.
5. Keep the backend's own suite green: from `api/`, `uv run pytest -q`.

## Constraints
- Do **not** commit or push. Leave the change in the working tree for review.
- Do **not** modify any frozen contract/fixture/test file.
- Do **not** change `JWT_SECRET` (the project intentionally uses the default).

## Report back
- Files changed (path + a one-line diff summary).
- `seed done` output.
- The three login results (`email → user_id`).
- The contract-suite summary line (e.g. `21 passed, 1 failed`), and for any unexpected failure the
  full request/response evidence.
- The `api` suite summary line.
