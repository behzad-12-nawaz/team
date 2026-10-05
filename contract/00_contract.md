# DoseCare Contract (FROZEN after Day 1 morning)

This file is the **only thing the 6 tasks share**. Every task builds against this file and `fixtures.json`, never against another person's code.

**Change rule:** After the Day 1 kickoff, any change needs a team message ("Contract change: ...") and a commit to this file. Everyone updates their mocks the same day.

## 1. Folders and owners
| Folder | Owner | Notes |
|---|---|---|
| `contract/` | Everyone | This file and `fixtures.json` |
| `api/` | Task 1 | FastAPI backend and reminder engine |
| `bot/` | Task 2 | WhatsApp bot |
| `ai/` | Task 3 | Python package `dosecare_ai` |
| `caregiver-dashboard/` | Task 4 | React app |
| `clinic-portal/` | Task 5 | React app and `reports/make_weekly_pdf.py` |
| `ops/` | Task 6 | Deployment, tests, mock-api, demo, deck |

Nobody edits another person's folder. Fix problems by asking the owner.

## 2. Modes and environment variables (the merge switches)
| Variable | Values | Used by |
|---|---|---|
| `NOTIFIER` | `console` (print to `outbox.log`) or `http` | api |
| `BOT_URL` | e.g. `http://localhost:8001` | api (when `NOTIFIER=http`) |
| `API_URL` | e.g. `http://localhost:8000` | bot |
| `AI_MODE` | `mock` or `real` | bot |
| `VITE_USE_MOCK` | `true` or `false` | both frontends |
| `VITE_API_URL` | backend URL | both frontends |
| `DATABASE_URL`, `JWT_SECRET` | secrets | api |
| `OPENAI_API_KEY`, `VISION_MODEL` | secrets | ai |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `VERIFY_TOKEN` | secrets | bot |

Default ports: api `8000`, bot `8001`, caregiver-dashboard `5173`, clinic-portal `5174`.

## 3. Rules and constants
- Times are **UTC ISO 8601** (`2026-10-05T08:00:00Z`). Frontends show Pakistan time.
- Phone numbers: digits only with country code, e.g. `923001234567`.
- Reminder interval: **5 minutes**. Max reminders per dose: **3**. Snooze: **15 minutes, once per dose**.
- Dose status: `SCHEDULED`, `NOTIFIED`, `CONFIRMED`, `SKIPPED`, `MISSED`, `CONFIRMED_LATE`.
- Prescription status: `draft`, `waiting_patient`, `active`, `rejected`, `stopped`, `superseded`.
- Link status: `pending`, `active`, `revoked`.
- Roles: `patient`, `caregiver`, `doctor`.
- Errors: JSON `{"detail": "message"}` with status 401, 403, 404, or 422.
- Auth: header `Authorization: Bearer <token>`. The bot uses a service token from `BOT_SERVICE_TOKEN`.

## 4. Backend REST API (owner: Task 1)
| Method and path | Body | Response |
|---|---|---|
| `POST /auth/login` | `{"email","password"}` | `{"access_token","role","user_id"}` |
| `POST /prescriptions` | `{"patient_id","prescribed_by":int\|null,"supersedes_id":int\|null,"medicines":[{"name","dose","times":["08:00"],"days":30,"instructions"}]}` | `{"id","status","version"}`. Status is `draft` if `prescribed_by` is null, else `waiting_patient`. |
| `POST /prescriptions/{id}/confirm` | none | `{"id","status":"active","doses_created":n}` |
| `POST /prescriptions/{id}/reject` | none | `{"id","status":"rejected"}` |
| `GET /patients/{id}/prescriptions?status=active` | none | list of prescriptions with medicines |
| `GET /patients/{id}/doses?from=&to=` | none | `[{"id","medicine","dose","scheduled_at","status","reminder_count"}]` |
| `POST /doses/{id}/reply` | `{"action":"taken"\|"skip"\|"snooze"}` | `{"id","status"}`. Second snooze returns 422. |
| `GET /patients/{id}/invite-code` | none | `{"invite_code"}` |
| `POST /doctor-links` | `{"invite_code"}` (doctor token) | `{"id","status":"pending","patient_id"}` |
| `POST /doctor-links/{id}/consent` | `{"allow":true\|false}` | `{"id","status":"active"\|"revoked"}` |
| `DELETE /doctor-links/{id}` | none | `{"id","status":"revoked"}` |
| `GET /doctor/patients` | none | patients with an `active` link only |
| `GET /caregiver/patients` | none | `[{"id","name","phone","today":{"taken","total","missed"},"adherence_7d"}]` |
| `POST /caregiver/patients` | `{"name","phone"}` | `{"id"}` |
| `PUT /caregiver/settings` | `{"alert_mode":"every"\|"summary"}` | `{"alert_mode"}` |
| `GET /reports/{patient_id}/weekly` | none | `{"patient_name","week_start","week_end","adherence","rows":[{"date","medicine","status"}]}` |
| `GET /reports/{patient_id}/weekly.pdf` | none | PDF bytes |

Access rules: a doctor can read a patient only with an `active` link. A revoked link returns 403.

## 5. Bot send API (owner: Task 2, called by Task 1)
`POST {BOT_URL}/send`
```json
{"phone":"923001234567","text":"Time for Metformin 500 mg (8:00 AM)",
 "buttons":[{"id":"taken:123","title":"Taken"},{"id":"skip:123","title":"Skip"},{"id":"snooze:123","title":"Snooze 15 min"}],
 "template":"dose_reminder"}
```
Response: `{"sent": true}`. `buttons` and `template` may be null.

Button IDs are `<action>:<id>`: `taken`, `skip`, `snooze` (dose id), `confirm`, `reject` (prescription id), `allow`, `deny` (link id). Titles are at most 20 characters, max 3 buttons.

## 6. AI package (owner: Task 3)
```python
from dosecare_ai import extract_prescription, transcribe, answer_medicine_question
extract_prescription(image_bytes: bytes) -> dict   # see fixtures["extraction"]
transcribe(audio_bytes: bytes) -> str
answer_medicine_question(question: str, medicine: str) -> str
```
The bot calls `extract_prescription` and maps the result into `POST /prescriptions` (`unclear` and `warnings` stay in the bot message only).

## 7. Weekly PDF (owner: Task 5)
`make_weekly_pdf(report: dict) -> bytes` in `clinic-portal/reports/make_weekly_pdf.py`. Input is the JSON from `GET /reports/{id}/weekly`.

## 8. Sample data
See `fixtures.json` in the same folder. Every mock uses these samples so all tasks agree.

## 9. Safety rules everyone must follow
- Nothing activates a doctor's change until the patient or caregiver confirms it.
- The system never suggests medicine changes or doses.
- A doctor sees a patient only after patient consent.
