# DoseCare: Project Context (paste this at the start of a new chat)

## How to use this file
Paste this whole file as your first message, then add your request. Example: "Use the context above. Today is Day 2. Help me with Task 4."
Last updated: 5 October 2026.

## Instructions for the AI reading this
1. Treat this file as the current state of the project. Do not restart from scratch.
2. Keep every name in the contract section exactly as written. Never invent or rename endpoints, statuses, button IDs, or environment variables. If something is missing, ask.
3. Answer in simple English, concise and direct, and give copy-paste-ready output (code, commands, files) when asked.
4. Facts that change (competitor features, pricing, free tiers, API versions, library names) must be checked against current sources before being stated as true.
5. The system gives reminders and passes doctor decisions along. It never suggests medicines or dose changes.
6. Ask before making big structural changes to the plan.

---

## 1. Project snapshot
- **Name:** DoseCare (placeholder name, can change).
- **One line:** A WhatsApp-first assistant that turns a prescription photo into a medicine schedule, reminds the patient, alerts a caregiver at the same time, and lets a doctor update the plan with the patient's consent.
- **Goal area:** UN SDG 3, Good Health and Well-Being.
- **Context:** A class project assigned by the instructor. Group of **6 people**. Total time **5 days**. The user is a professional developer (Python, FastAPI, React, AI engineering, automation).
- **Origin:** The user asked for unsolved problems by SDG, picked "patients (especially elderly) don't take medicines correctly", and then expanded the idea because it felt too small for 6 people.

## 2. Problem, solution, audience
**Problem (simple words):** Many patients, especially old people and people with long-term illnesses, do not take medicines the right way. They forget, the schedule is hard, they cannot read the instructions well, the handwriting is unclear, and nobody checks on them. WHO has cited that about half of patients on long-term treatment in developed countries do not take medicines as prescribed (WHO, 2003). **Verify the latest figure before quoting it.**

**Solution (2 to 3 lines):** DoseCare is a WhatsApp helper that reads a photo of the prescription and makes a medicine schedule. It reminds the patient at every dose time and tells a family member at the same time. If the patient does not reply, it sends up to 3 reminders, then lets the family know the dose was missed.

**Target audience:** Elderly patients and patients with long-term illnesses (diabetes, blood pressure, heart disease); family caregivers (including those living far away); doctors and clinics; pharmacies; NGOs and health programs; patients who cannot read well (voice support). **Best starting group:** family caregivers of elderly patients.

## 3. Product: three surfaces
| Surface | Users | What it does |
|---|---|---|
| WhatsApp bot | Patient, caregiver | Photo to schedule, reminders with **Taken / Skip / Snooze** buttons, doctor consent and change confirmations |
| Caregiver web dashboard | Caregiver | Live dose status, adherence calendar, weekly chart, several patients, alert settings, weekly report |
| Clinic (doctor) portal | Doctor | Link patients with consent, review and change medicines (keep, change, stop), adherence view |

**Extras:** voice reminders and voice-note replies (Urdu and English), refill alerts, medicine Q&A (answers only from drug-label data, refuses dose advice), doctor notes, weekly PDF report. Extras are stretch goals.

## 4. Decided reminder rules
- Patient and caregiver are notified **at the same time** at every dose.
- Reminders repeat every **5 minutes**, **maximum 3** per dose. After the third reminder and 5 more minutes with no reply, the dose is marked **MISSED** and the caregiver gets a final status.
- Replies: **Taken** (stops the loop and tells the caregiver), **Skip**, **Snooze 15 min** (once per dose). A late "Taken" after MISSED becomes `CONFIRMED_LATE`.
- Assumption to confirm: the final missed-status message is a status update, not counted among the 3 reminders. If a strict cap of 3 messages is wanted, drop the third caregiver reminder and let the missed notice replace it.

## 5. Doctor and clinic rules
- A doctor sees a patient **only after the patient consents**. The patient can **revoke** the link at any time.
- Links are many-to-many (a patient can have several doctors). Changing doctor = revoke one link and create another, and **reminders never stop**.
- The new doctor reviews each active medicine: keep, change, or stop. A change creates a new prescription version (old one `superseded`).
- A doctor's change becomes active **only after the patient or caregiver confirms it on WhatsApp**.
- The system never suggests medicine changes. It shows data and passes the doctor's decision along.
- Data model idea: `care_links` (patient, doctor, status, consent, revoked time), `prescriptions` (version, supersedes_id, prescribed_by), `audit_log`. Every doctor query joins on an `active` link.
- **Gap identified:** For doctors to decide "based on the patient's current condition" they need an adherence view, patient notes sent through WhatsApp, and doctor notes sent back. These are suggested add-ons (adherence view is in the plans; notes are a stretch and need a contract endpoint before anyone builds them).

## 6. Competitors (researched October 2026; re-check before presenting)
| Competitor | What it is | Our edge |
|---|---|---|
| **Medisafe** | Popular reminder app with caregiver "Medfriend" alerts. Needs an app install. Since January 2026 the free tier covers only 2 medications (per a comparison article). | Runs in WhatsApp, no install, no medication cap |
| **MyTherapy** | Free reminder app with journal and doctor-ready reports, mainly self-management | Caregiver in the loop at every dose |
| **TextMyPill** | **Closest rival.** WhatsApp reminders from a prescription photo, Hindi and Marathi support, listed July 2026 | Adds caregiver alerts, dashboard, and clinic link (not described in its listing) |
| **Local apps** (AKUH Patient Care, MedicalStore.com.pk) | Reminders inside one hospital's or pharmacy's app, often manual entry. AKUH app rated 2.0/5 on the App Store (20 ratings) | One neutral service for any doctor or pharmacy |

**Honest position:** TextMyPill already does WhatsApp plus prescription photo, so DoseCare cannot claim to be first. The edge is the caregiver loop (simultaneous, capped), the caregiver dashboard, and the patient-controlled doctor portal. In the comparison matrix, a dash means "not found in public info", not "impossible". Sources were review articles and app listings, some written by rival apps.

## 7. Tech stack
| Layer | Tools |
|---|---|
| Backend | Python, FastAPI, Pydantic, `uv`, SQLModel or SQLAlchemy, Alembic |
| Database | PostgreSQL (Neon or Supabase free tier); SQLite locally |
| Scheduler | APScheduler (every minute) |
| Messaging | WhatsApp Cloud API (Meta test number for the build); Telegram bot as fallback |
| AI | Vision-capable LLM with structured output (Pydantic); OpenAI Agents SDK for medicine Q&A; speech-to-text for voice notes |
| Frontend | React, Vite, Tailwind CSS, Recharts |
| Auth | JWT with roles (`patient`, `caregiver`, `doctor`) |
| Reports | WeasyPrint or ReportLab |
| Deploy | Docker; backend on Render or Railway; frontends on Vercel; low-cost tiers |
| Tools | pytest, Postman, GitHub, ngrok |

Check free-tier limits and library or API versions on Day 1.

## 8. WhatsApp facts (verified from Meta developer docs and guides)
- Reply-button messages: **max 3 buttons, title max 20 characters**. Our buttons: Taken, Skip, Snooze 15 min.
- Interactive button messages work only **inside the 24-hour window** after the user last messaged. Outside it you must use an **approved template** with up to 3 quick-reply buttons. Reminders usually fall outside the window, so **submit the reminder template on Day 1** (approval takes time).
- Put the dose ID in the button ID (for example `taken:123`). The webhook reads `interactive.button_reply.id`.
- For the demo: use the Meta test number (limited recipients) or a patient messaging the bot first. Plan B is a Telegram bot (inline buttons, free, no approval).
- Call the Meta Cloud API directly; some intermediate providers do not support interactive buttons.

## 9. Architecture (data flow diagrams were drawn in chat)
**Level 1 (complete project):** outside users: Doctor, Patient, Caregiver. Processes: **1.0 Clinic portal, 2.0 Prescription AI, 3.0 WhatsApp bot, 4.0 Reminder engine, 5.0 Caregiver portal**. Data stores: **D1 Users and links, D2 Prescriptions, D3 Dose log**.
Main flows: Patient photo to 3.0 to 2.0 (draft plan back) to confirmed plan saved in D2; D2 feeds 4.0, which creates doses in D3 and sends reminders through 3.0 to patient and caregiver; patient replies update D3; D3 feeds the caregiver portal; the clinic portal reads and writes links (D1) and prescriptions (D2).

Feature diagrams drawn: WhatsApp setup (photo, confirm, save), WhatsApp reminder loop (create doses, send reminders, record reply, notify caregiver), caregiver portal (sign in, dashboard, weekly report, manage patients), clinic portal (link patient, review and update prescription, revoke access). The clinic diagram does **not yet** include patient notes, doctor notes, or the adherence view.

## 10. Team structure: 6 independent tasks
| Task | Folder | Skills | Deliverable |
|---|---|---|---|
| 1 Backend and reminder engine | `api/` | Python, SQL | FastAPI, DB, endpoints, 3-reminder engine |
| 2 WhatsApp bot | `bot/` | Python, webhooks | Webhook, photo flow, buttons, `POST /send` |
| 3 AI services | `ai/` | LLM APIs | `dosecare_ai` package: extraction, transcribe, medicine Q&A |
| 4 Caregiver dashboard | `caregiver-dashboard/` | React | Dashboard with mock switch |
| 5 Clinic portal and PDF | `clinic-portal/` | React, some Python | Doctor portal and `make_weekly_pdf()` |
| 6 DevOps, QA, pitch | `ops/` (contains `infra/`, `contract-tests/`, `demo/`, `pitch/`) | Git, testing, presenting | Repo rules, deployment, contract tests, demo, deck |

**Independence method:** each task builds against a frozen contract (`00_contract.md`) and shared sample data (`fixtures.json`), with a mock for every neighbor. On merge day the mocks are swapped for real parts by environment variables.

| Task | Runs alone using | Merge switch |
|---|---|---|
| 1 | `NOTIFIER=console` (writes `outbox.log`), seed data | `NOTIFIER=http`, `BOT_URL` |
| 2 | `tests/fake_backend.py`, `AI_MODE=mock` | `API_URL`, `AI_MODE=real` |
| 3 | Command-line script, own sample images | Bot installs the package |
| 4 | `VITE_USE_MOCK=true` | `VITE_USE_MOCK=false`, `VITE_API_URL` |
| 5 | `VITE_USE_MOCK=true`, PDF from a fixture | Same switch; PDF file copied into `api/` |
| 6 | Own `mock-api/`, "hello" deployments | Contract tests against the real backend |

## 11. Schedule (5 days)
| Day | What happens |
|---|---|
| Day 1 morning (90 min, together) | Read and freeze the contract; create repo folders |
| Day 1 afternoon to Day 3 | Everyone builds alone with mocks; core features only |
| Day 3 evening | Ready check: each owner's "Ready when" test; contract tests pass on the mock |
| Day 4 | Merge day, in order: (1) deploy backend and run contract tests, (2) AI into bot, (3) bot and backend, (4) dashboard to backend, (5) clinic portal and PDF, (6) run the 10 scenarios |
| Day 5 | Debugging, retesting, rehearsal, backup video. No new features |

Stretch features (voice notes, medicine Q&A, doctor notes, refill alerts) happen only if merge finishes early on Day 4.

## 12. Contract summary (full version in `00_contract.md`; frozen after Day 1 morning)
- **Times:** UTC ISO 8601. **Phones:** digits with country code, e.g. `923001234567`. **Errors:** `{"detail": "..."}` with 401, 403, 404, or 422. **Auth:** `Authorization: Bearer <token>`; the bot uses `BOT_SERVICE_TOKEN`.
- **Constants:** interval 5 minutes, max 3 reminders, snooze 15 minutes once per dose.
- **Dose status:** `SCHEDULED`, `NOTIFIED`, `CONFIRMED`, `SKIPPED`, `MISSED`, `CONFIRMED_LATE`.
- **Prescription status:** `draft`, `waiting_patient`, `active`, `rejected`, `stopped`, `superseded`.
- **Link status:** `pending`, `active`, `revoked`. **Roles:** `patient`, `caregiver`, `doctor`.
- **Endpoints:** `POST /auth/login`; `POST /prescriptions`; `POST /prescriptions/{id}/confirm`; `POST /prescriptions/{id}/reject`; `GET /patients/{id}/prescriptions?status=active`; `GET /patients/{id}/doses`; `POST /doses/{id}/reply` (`taken`/`skip`/`snooze`); `GET /patients/{id}/invite-code`; `POST /doctor-links`; `POST /doctor-links/{id}/consent`; `DELETE /doctor-links/{id}`; `GET /doctor/patients`; `GET /caregiver/patients`; `POST /caregiver/patients`; `PUT /caregiver/settings`; `GET /reports/{patient_id}/weekly`; `GET /reports/{patient_id}/weekly.pdf`.
- **Bot send API:** `POST {BOT_URL}/send` with `{phone, text, buttons:[{id,title}], template}`. Button IDs are `<action>:<id>`: `taken`, `skip`, `snooze` (dose id); `confirm`, `reject` (prescription id); `allow`, `deny` (link id).
- **AI package:** `extract_prescription(image_bytes) -> dict`, `transcribe(audio_bytes) -> str`, `answer_medicine_question(question, medicine) -> str`.
- **PDF:** `make_weekly_pdf(report: dict) -> bytes`.
- **Environment variables:** `NOTIFIER`, `BOT_URL`, `API_URL`, `AI_MODE`, `VITE_USE_MOCK`, `VITE_API_URL`, `DATABASE_URL`, `JWT_SECRET`, `BOT_SERVICE_TOKEN`, `OPENAI_API_KEY`, `VISION_MODEL`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `VERIFY_TOKEN`.
- **Ports:** api 8000, bot 8001, caregiver-dashboard 5173, clinic-portal 5174.

## 13. GitHub repo structure (decided)
One monorepo. Each task folder is self-contained so any LLM started inside it works:
```
dosecare/
  README.md, .gitignore
  .github/ (CODEOWNERS, pull_request_template.md, workflows/contract-sync.yml)
  contract/ (00_contract.md, fixtures.json)   # the only place to edit the contract
  docs/ (schedule, DFD images, deck)
  scripts/ (AGENTS.template.md, init-folders.sh, sync-contract.sh, check-contract-sync.sh)
  api/  bot/  ai/  caregiver-dashboard/  clinic-portal/  ops/
```
Each task folder contains `AGENTS.md` (rules for any LLM), `CLAUDE.md` (just `@AGENTS.md`), `PLAN.md`, a synced `contract/` copy, `.env.example`, and a README. CI fails if a copy drifts from the root contract. `CODEOWNERS` requires each folder owner's approval. Owners start with: "Read AGENTS.md, PLAN.md, contract/00_contract.md and contract/fixtures.json. Today is Day N. Do only the Day N tasks, one step at a time, and wait for my OK after each step."
**Pending edit:** Task 6 should own `ops/` (containing `infra/` and `contract-tests/`). Update the contract folder table and the Task 6 plan accordingly.

## 14. Rules given to AI coding assistants (every task folder)
Use only contract names; edit only your own folder; use mocks marked `MOCK: replace on merge day`; one step at a time with a check after each; only the current day's work; no new libraries or features without asking; no secrets in code; report what is done, mocked, and missing after each step.

## 15. Files created in this chat
- **Pitch deck** (PowerPoint): first version (10 slides) and v2 (12 slides): title, problem, solution, reminder logic, three surfaces, competitors, why we are ahead (matrix), safety, architecture, team and 5-day plan, impact metrics, next step. Placeholders to review: project name "DoseCare", presenter "Team DoseCare", WHO statistic, competitor facts, role names.
- **Plan files v1** (`plans/`, six tasks with daily plans and steps) and **v2** (`plans_v2/`): `README_team_schedule.md`, `00_contract.md`, `fixtures.json`, and six `plan_v2_task*.md` files. v2 is the current version.
- **Data flow diagrams** (drawn inline in chat, not saved as files): complete system level 1, WhatsApp setup, WhatsApp reminder loop, caregiver portal, clinic portal.

## 16. Open items and next steps
1. Generate a ready-to-push starter repo (scripts, templates, per-folder `AGENTS.md`, updated Task 6 plan with `ops/`).
2. Optionally write `contract/openapi.yaml` so frontends and the bot can use an automatic mock server.
3. Redraw the clinic portal diagram with the adherence view, patient notes, and doctor notes, and add a notes endpoint to the contract if the team wants it.
4. Add DFD slides, a demo-flow slide, and a business-model slide to the deck; add real screenshots and test numbers on Day 5.
5. Confirm the cap rule for the missed-status message (section 4).
6. Verify before presenting: WHO figure, competitor facts, free-tier limits, library and API versions (Meta Graph API version, Tailwind setup, OpenAI SDK method names).
7. Submit the WhatsApp reminder template on Day 1; assign real team member names to the six tasks.
8. Possible later additions: Urdu text, voice reminders, refill alerts, medicine Q&A, demo script rehearsal and a backup demo video.
