# DoseCare API

FastAPI backend for medication adherence with prescriptions, dose reminders, caregiver and doctor links, and weekly reports.

## Local Setup

```bash
uv sync
cp .env.example .env  # edit with your values
uv run python seed.py
uv run uvicorn app.main:app --reload
```

## Tests

```bash
uv run pytest tests/ -v
```

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Database connection string | `sqlite:///./dosecare.db` or `postgresql://user:pw@host/db` |
| `JWT_SECRET` | Secret for JWT token signing | `my-super-secret` |
| `NOTIFIER` | Notification backend | `console` or `http` |
| `BOT_URL` | WhatsApp bot endpoint (when `NOTIFIER=http`) | `http://localhost:8001` |
| `BOT_SERVICE_TOKEN` | Service token for bot API calls | `test-bot-token-123` |

## Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | Login with email/password |
| POST | `/prescriptions` | Create prescription (draft or waiting_patient) |
| POST | `/prescriptions/{id}/confirm` | Confirm prescription, creates doses |
| POST | `/prescriptions/{id}/reject` | Reject prescription |
| GET | `/patients/{id}/prescriptions` | List patient prescriptions |
| GET | `/patients/{id}/doses` | List patient doses |
| POST | `/doses/{id}/reply` | Reply to dose (taken/skip/snooze) |
| GET | `/patients/{id}/invite-code` | Get patient invite code |
| POST | `/doctor-links` | Doctor creates link via invite code |
| POST | `/doctor-links/{id}/consent` | Patient consents to doctor link |
| DELETE | `/doctor-links/{id}` | Revoke doctor link |
| GET | `/doctor/patients` | List doctor's active patients |
| GET | `/caregiver/patients` | List caregiver's patients |
| POST | `/caregiver/patients` | Caregiver creates new patient |
| PUT | `/caregiver/settings` | Update alert mode |
| GET | `/reports/{id}/weekly` | Weekly adherence report (JSON) |
| GET | `/reports/{id}/weekly.pdf` | Weekly report (PDF) |

## Docker

```bash
docker build -t dosecare-api .
docker run -p 8000:8000 --env-file .env dosecare-api
```

## Merge Day

1. Set `NOTIFIER=http`, `BOT_URL=http://bot:8001`, `BOT_SERVICE_TOKEN=<token>`
2. Copy `reports/make_weekly_pdf.py` from Task 5 (clinic-portal) to `app/reports.py`
3. Run contract tests from `ops/` against this API
