# Task 6 (v2): DevOps, QA, and pitch

**Folders:** `ops/` | **Skills:** organized, Git, testing, presenting

## Instructions for AI coding assistants
You are building ONLY Task 6 (infra, tests, demo, deck) of a 6-person project. Other tasks are built by other people at the same time and are NOT ready.
1. Read `00_contract.md` and `fixtures.json` first. Use only those endpoint names, fields, and statuses. Never invent or rename them. If something is missing, stop and ask me.
2. Only edit files inside `ops/`, and root files such as `README.md`, `.gitignore`, `.env.example`, and `CODEOWNERS`. Do not write backend, bot, AI, or frontend code.
3. Test against your own `ops/contract-tests/mock-api/` until the real backend exists. Mark it `# MOCK: replace on merge day`.
4. Work one step at a time. After each step, run its check and show me the result before continuing.
5. Follow the current day in the schedule. Do not build later days early.
6. Do not add libraries or features that are not in this plan without asking.
7. Never write secrets into code. Use `.env`.
8. After each step, tell me what is done, what is mocked, and what is missing.

## Goal
Keep the team working in parallel, prove that the pieces fit (contract tests), deploy everything, and prepare the demo and pitch.

## Runs alone using
- A small `ops/contract-tests/mock-api/` (FastAPI) that implements the contract from `fixtures.json`.
- "Hello world" services to test the deployment pipeline before real code exists.

## Day plan
| Day | Tasks |
|---|---|
| **Day 1** | Run the kickoff and freeze the contract; repo with folders from the contract; branch rules and `CODEOWNERS`; `.env.example`, `.gitignore`, root `README.md`; create the database (Neon or Supabase); deploy "hello" for backend and frontends to test the pipeline |
| **Day 2** | Contract tests (`pytest` and `httpx`, base URL from `BASE_URL`); `mock-api/` that passes them; demo data list (3 patients, 2 caregivers, 1 doctor, 10 sample prescriptions) |
| **Day 3** | Write the 10-scenario checklist and demo script; prepare the pitch deck update with placeholders; **ready check**: confirm each owner's "Ready when" test, run contract tests on the mock |
| **Day 4** | Merge day coordinator (see the schedule): deploy, run contract tests against the real backend, run the 10 scenarios |
| **Day 5** | Retest, bug list, deck with real screenshots and numbers, rehearse 3 times, backup video |

## Implementation steps

### Step 1: Repo and rules
- Folders as in the contract: `contract/`, `api/`, `bot/`, `ai/`, `caregiver-dashboard/`, `clinic-portal/`, `ops/`.
- Everyone works on feature branches and merges by pull request (one quick review, same day).
- `CODEOWNERS` file maps each folder to its owner, so a change in someone else's folder needs their approval.
- `.gitignore`: `.env`, `node_modules`, `__pycache__`, `.venv`, `outbox.log`.
**Check:** all 6 members can push to their own branch.

### Step 2: `.env.example`
```
DATABASE_URL=
JWT_SECRET=
BOT_SERVICE_TOKEN=
NOTIFIER=console
BOT_URL=
API_URL=
AI_MODE=mock
OPENAI_API_KEY=
VISION_MODEL=
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
VERIFY_TOKEN=
VITE_USE_MOCK=true
VITE_API_URL=
```
Share real secrets in a private team chat only.

### Step 3: Deploy pipeline test
| Part | Where |
|---|---|
| Backend and bot | Render or Railway, from GitHub, with env variables |
| Database | Neon or Supabase |
| Frontends | Vercel with `VITE_API_URL` |
Check each provider's free-tier limits on Day 1. Some free servers sleep when idle, so open the app before the demo to wake it.
**Check:** a "hello" endpoint answers on a public URL, and merging to `main` redeploys it.

### Step 4: Contract tests
Write one test per row of the contract API table:
```python
BASE = os.environ["BASE_URL"]

def test_login():
    r = httpx.post(f"{BASE}/auth/login", json={"email": "caregiver@demo.pk", "password": "demo"})
    assert r.status_code == 200
    assert set(r.json()) >= {"access_token", "role", "user_id"}
```
Test shapes only (required keys and status codes), not exact values. Run them against `mock-api/` first so you know the tests themselves are correct.
**Check:** `BASE_URL=http://localhost:9000 pytest` passes against the mock.

### Step 5: 10-scenario checklist
| # | Scenario | Expected |
|---|---|---|
| 1 | Clear prescription photo | Correct summary, Confirm works |
| 2 | Blurry photo | Bot asks for a clearer photo, no guessing |
| 3 | Confirm a plan | Doses appear in the dashboard |
| 4 | Dose time arrives | Patient and caregiver get a reminder together |
| 5 | Patient taps Taken | Loop stops, caregiver notified, dashboard green |
| 6 | No reply | 3 reminders, then MISSED, caregiver gets the final message |
| 7 | Snooze twice | Second snooze rejected |
| 8 | Doctor links a patient | No access until the patient consents |
| 9 | Doctor changes a medicine | Patient confirms on WhatsApp, then the schedule changes |
| 10 | Patient revokes doctor | Doctor loses access, reminders keep running |

Record pass or fail, who tested, and a screenshot of failures.

### Step 6: Bug handling (Days 4 and 5)
Create GitHub issues with steps to reproduce, expected result, actual result, and an owner tag (`task1` to `task5`). Priority: main flow crashes, then wrong data, then cosmetic issues. If a bug comes from a wrong contract, fix `00_contract.md` and announce it.

### Step 7: Demo script (about 5 minutes)
1. Problem (30 sec): missed medicines, nobody notices.
2. Photo (45 sec): send a prescription, confirm the plan.
3. Reminder (45 sec): reminder with buttons on patient and caregiver phones at the same time.
4. Taken and missed (60 sec): tap Taken on one dose, leave one unanswered, show the caregiver alert.
5. Caregiver dashboard (45 sec).
6. Doctor portal (60 sec): link, change medicine, patient confirms.
7. Close (30 sec): impact and next steps.
Use prepared demo data. Test every phone number beforehand.

### Step 8: Pitch deck
The deck already has problem, solution, reminder logic, competitors, architecture, and team slides. On Day 5 add screenshots of the bot chat, dashboard, and portal, a demo-flow slide, and real test numbers (for example "9 of 10 prescriptions read correctly").

## Ready when (Day 3 evening)
- Every owner has reported their "Ready when" test as passed.
- Contract tests pass against `mock-api/`.
- The deploy pipeline redeploys on merge, and the checklist and demo script are written.

## Merge day (Day 4)
Follow `README_team_schedule.md`: deploy, run contract tests against the real backend, then guide steps 2 to 6 and run the 10 scenarios.
