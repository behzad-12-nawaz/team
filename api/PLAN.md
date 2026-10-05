# Task 1 (v2): Backend and reminder engine

**Folder:** `api/` | **Skills:** Python, SQL, APIs

## Instructions for AI coding assistants
You are building ONLY Task 1 (backend) of a 6-person project. Other tasks are built by other people at the same time and are NOT ready.
1. Read `00_contract.md` and `fixtures.json` first. Use only those endpoint names, fields, and statuses. Never invent or rename them. If something is missing, stop and ask me.
2. Only edit files inside `api/`. Do not write bot, AI, or frontend code.
3. For anything owned by another task, use a stub marked `# MOCK: replace on merge day`.
4. Work one step at a time, in the order of "Implementation steps". After each step, run its check and show me the result before continuing.
5. Follow the current day in the schedule. Do not build later days early.
6. Do not add libraries or features that are not in this plan without asking.
7. Never write secrets into code. Use `.env`.
8. After each step, tell me what is done, what is mocked, and what is missing.

## Goal
Build the FastAPI backend: database, login, all endpoints in the contract, and the reminder engine (max 3 reminders, 5 minutes apart, then MISSED).

## Runs alone using
- `NOTIFIER=console`: reminders are printed to `outbox.log` instead of calling the bot.
- A `seed.py` script with demo users, a prescription, and doses.
- Swagger (`/docs`) and pytest. No bot, AI, or frontend is needed.

## Day plan
| Day | Tasks |
|---|---|
| **Day 1** | Project setup, tables and migrations, JWT login with roles, `seed.py`, prescription endpoints (create, confirm, reject, list) |
| **Day 2** | Doses endpoints and reply logic (taken, skip, snooze), doctor links (create, consent, revoke, `/doctor/patients`), caregiver endpoints, invite code |
| **Day 3** | Reminder engine and tests, weekly report JSON, `weekly.pdf` endpoint (returns 501 until the PDF module is added), `Notifier` with console and http versions, deploy-ready Docker file |
| **Day 4** | Merge: deploy, run contract tests, set `NOTIFIER=http` with the bot's URL, add Task 5's PDF file |
| **Day 5** | Fix bugs only |

## Implementation steps

### Step 1: Setup
```bash
uv init api && cd api
uv add fastapi "uvicorn[standard]" sqlmodel "psycopg[binary]" alembic pydantic-settings pyjwt "passlib[bcrypt]" apscheduler httpx pytest
```
Use SQLite locally if Postgres is not ready, then switch `DATABASE_URL` on merge day.
Folders: `app/main.py`, `config.py`, `db.py`, `models.py`, `auth.py`, `routers/`, `engine.py`, `notifier.py`, `tests/`, `seed.py`.
**Check:** `uv run uvicorn app.main:app --reload` opens `/docs`.

### Step 2: Tables
| Table | Columns |
|---|---|
| `users` | id, name, phone, email, role, password_hash |
| `caregiver_links` | patient_id, caregiver_id |
| `doctor_links` | id, patient_id, doctor_id, status, consent_at, revoked_at |
| `prescriptions` | id, patient_id, prescribed_by, status, version, supersedes_id, created_at |
| `medicines` | id, prescription_id, name, dose, times, days, instructions |
| `doses` | id, medicine_id, patient_id, scheduled_at, status, reminder_count, last_reminded_at, snoozed, replied_at |
| `audit_log` | id, actor_id, patient_id, action, at |
| `settings` | caregiver_id, alert_mode |

**Check:** `seed.py` creates 1 patient, 1 caregiver, 1 doctor, and the data from `fixtures.json`.

### Step 3: Auth and roles
`POST /auth/login` returns a JWT. Add `require_role(...)`. Doctors can read a patient only with an `active` link, otherwise return 403 and write an `audit_log` row.
**Check:** the three roles can log in; a doctor without a link gets 403.

### Step 4: Prescriptions
- `POST /prescriptions`: `draft` if `prescribed_by` is null, else `waiting_patient`.
- `confirm`: set `active`, create dose rows for the next 7 days (status `SCHEDULED`). If `supersedes_id` is set, mark the old one `superseded` and delete its future `SCHEDULED` doses.
- `reject`: set `rejected`.
**Check:** responses match `fixtures.json` shapes exactly.

### Step 5: Dose reply
| Action | Result |
|---|---|
| `taken` | `CONFIRMED`, or `CONFIRMED_LATE` if it was `MISSED` |
| `skip` | `SKIPPED` |
| `snooze` | Once per dose: `scheduled_at + 15 min`, reset `reminder_count`, `snoozed=true`, status `SCHEDULED`. A second snooze returns 422. |

After each reply, call `notifier.send(...)` to tell the caregiver.

### Step 6: Notifier (the independence trick)
```python
class ConsoleNotifier:
    def send(self, phone, text, buttons=None, template=None):
        with open("outbox.log", "a") as f:
            f.write(f"{phone} | {text} | {buttons}\n")

class HttpNotifier:
    def send(self, phone, text, buttons=None, template=None):
        httpx.post(f"{BOT_URL}/send", json={"phone": phone, "text": text,
                   "buttons": buttons, "template": template})

notifier = ConsoleNotifier() if NOTIFIER == "console" else HttpNotifier()
```

### Step 7: Reminder engine (runs every minute with APScheduler)
```python
def tick():
    now = utcnow()
    for d in doses(status="SCHEDULED", scheduled_at__lte=now):
        notify_both(d); d.status, d.reminder_count, d.last_reminded_at = "NOTIFIED", 1, now
    for d in doses(status="NOTIFIED", reminder_count__lt=3, last_reminded_at__lte=now - 5min):
        notify_both(d); d.reminder_count += 1; d.last_reminded_at = now
    for d in doses(status="NOTIFIED", reminder_count__gte=3, last_reminded_at__lte=now - 5min):
        d.status = "MISSED"; notify_caregiver_final(d)
```
Always update with a status check (`WHERE status='NOTIFIED'`) so a reminder can never go out after the patient replied. `notify_both` sends the buttons message with IDs `taken:<id>`, `skip:<id>`, `snooze:<id>`.

### Step 8: Tests (pytest, fake clock)
1. No reply: three reminders, then MISSED.
2. Taken after reminder 1 stops the loop.
3. Second snooze returns 422.
4. Revoked doctor gets 403.

### Step 9: Reports
`GET /reports/{id}/weekly` returns the JSON in `fixtures.json["weekly_report"]` shape, from the dose log. For `weekly.pdf`:
```python
try:
    from app.reports import make_weekly_pdf
except ImportError:
    make_weekly_pdf = None   # MOCK: Task 5 file is added on merge day
```
Return 501 if it is missing.

## Ready when (Day 3 evening)
- Every endpoint in the contract works in Swagger with the fixture shapes.
- A test dose produces exactly 3 messages in `outbox.log` for the patient and 3 for the caregiver, then ends as `MISSED`; a Taken reply stops it.
- All 4 pytest tests pass.

## Merge day (Day 4)
1. Deploy with Task 6. Run the contract tests.
2. Set `NOTIFIER=http` and `BOT_URL`, add `BOT_SERVICE_TOKEN`.
3. Copy `make_weekly_pdf.py` from Task 5 into `app/reports.py`.
