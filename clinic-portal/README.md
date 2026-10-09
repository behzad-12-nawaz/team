# DoseCare Clinic Portal (Task 5)

Physician portal for reviewing linked patient adherence records, modifying medication schedules with explicit patient consent, and generating weekly PDF reports.

---

## 1. Features & Safety Architecture

- **Doctor Authentication (`POST /auth/login`):** Role-based login (`role: "doctor"`) securing clinical routes.
- **Patient Roster (`GET /doctor/patients`):** Displays active linked patients with 7-day adherence rates, condition summaries, and link IDs.
- **Two-Way WhatsApp Consent Linking (`POST /doctor-links`):**
  - Physician submits patient's invite code (e.g. `ALI-4821`).
  - Backend returns status `pending`.
  - Patient receives an interactive WhatsApp prompt with `[Allow]` / `[Deny]`.
  - Records only unlock once patient consents.
- **Prescription Editor (`POST /prescriptions`):**
  - Inspect active medicines (`GET /patients/{id}/prescriptions?status=active`).
  - Three distinct physician actions: **Keep**, **Change** (modify dose, times, days, instructions), or **Stop** (exclude from updated version).
  - Ability to prescribe additional medications.
  - Submitting updates sets `prescribed_by` and `supersedes_id` and creates a `waiting_patient` status prescription.
  - **DoseCare Safety Contract:** The system never suggests medicine changes. Changes only become active after the patient confirms on WhatsApp.
- **Adherence & Doses History (`GET /patients/{id}/doses` & `GET /reports/{id}/weekly`):**
  - Status badges following system standard colors:
    - `CONFIRMED` / `CONFIRMED_LATE`: Emerald Green
    - `SKIPPED`: Slate Gray
    - `NOTIFIED`: Amber Yellow
    - `MISSED`: Rose Red
    - `SCHEDULED`: Sky Blue
  - Interactive 7-Day Adherence bar chart (Recharts).
- **Weekly Adherence PDF Generator (`clinic-portal/reports/make_weekly_pdf.py`):**
  - Pure Python function: `make_weekly_pdf(report: dict) -> bytes`.
  - Formatted medical report with branding, adherence percentage, dose rows, and medical disclaimer.
  - Test runner: `python reports/generate_sample_pdf.py` produces `sample_report.pdf`.
- **Revocation & 403 Safety Handling:**
  - If a patient revokes clinic access on WhatsApp (`DELETE /doctor-links/{id}`), queries immediately return `403 Forbidden` (`{"detail": "Access to this patient has ended"}`).
  - Clinic Portal displays a dedicated access-ended safety screen. Reminders for the patient continue uninterrupted on WhatsApp.
- **Local Clinical Notes (Stretch Feature):**
  - Physician observations stored locally in device storage pending team backend contract extension.

---

## 2. Quickstart

### Prerequisites
- Node.js v18+ (tested on Node.js v24)
- Python 3.10+ with `reportlab`

### Install Dependencies
```bash
cd clinic-portal
npm install
pip install reportlab
```

### Run Locally (Mock Mode)
```bash
npm run dev
```
Opens at [http://127.0.0.1:5174](http://127.0.0.1:5174).

### Test Contract Endpoints
Run the automated mock contract test suite:
```bash
node test-contract.js
```

### Generate Sample PDF Report
```bash
python reports/generate_sample_pdf.py
```
Outputs `clinic-portal/reports/sample_report.pdf`.

---

## 3. Merge Switch (Day 4)

When connecting to the live backend:
1. Update `.env`:
   ```bash
   VITE_USE_MOCK=false
   VITE_API_URL=http://localhost:8000
   ```
2. Copy `reports/make_weekly_pdf.py` to `api/app/reports.py` (for Task 1 endpoint `GET /reports/{patient_id}/weekly.pdf`).

---

## 4. Contract API Mapping

| Action | HTTP Method & Path | Body | Response |
|---|---|---|---|
| Doctor Login | `POST /auth/login` | `{"email", "password"}` | `{"access_token", "role": "doctor", "user_id"}` |
| Get Linked Patients | `GET /doctor/patients` | - | `[{"id", "name", "phone", "link_id", "adherence_7d"}]` |
| Link Patient | `POST /doctor-links` | `{"invite_code": "ALI-4821"}` | `{"id", "status": "pending", "patient_id"}` |
| Unlink Patient | `DELETE /doctor-links/{id}` | - | `{"id", "status": "revoked"}` |
| Active Prescriptions | `GET /patients/{id}/prescriptions?status=active` | - | `[{"id", "status": "active", "version", "medicines": [...]}]` |
| Update Prescription | `POST /prescriptions` | `{"patient_id", "prescribed_by", "supersedes_id", "medicines": [...]}` | `{"id", "status": "waiting_patient", "version"}` |
| Patient Dose Log | `GET /patients/{id}/doses` | - | `[{"id", "medicine", "dose", "scheduled_at", "status", "reminder_count"}]` |
| Weekly Report JSON | `GET /reports/{id}/weekly` | - | `{"patient_name", "week_start", "week_end", "adherence", "rows": [...]}` |
| Weekly Report PDF | `GET /reports/{id}/weekly.pdf` | - | Application/pdf binary |
