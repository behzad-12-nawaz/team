# Task 5 (v2): Clinic portal and weekly report PDF

**Folder:** `clinic-portal/` | **Skills:** React, a little Python

## Instructions for AI coding assistants
You are building ONLY Task 5 (clinic portal and PDF function) of a 6-person project. Other tasks are built by other people at the same time and are NOT ready.
1. Read `00_contract.md` and `fixtures.json` first. Use only those endpoint names, fields, and statuses. Never invent or rename them. If something is missing, stop and ask me.
2. Only edit files inside `clinic-portal/`. Do not write backend, bot, or caregiver dashboard code.
3. Use the mock layer (`VITE_USE_MOCK=true`) for all data. Mark it `// MOCK: replace on merge day`.
4. Work one step at a time. After each step, run its check and show me the result before continuing.
5. Follow the current day in the schedule. Do not build later days early.
6. Do not add libraries or features that are not in this plan without asking.
7. Never write secrets into code. Use `.env`.
8. After each step, tell me what is done, what is mocked, and what is missing.

## Goal
A doctor portal (link patients with consent, change medicines, view adherence) plus a pure Python function that creates the weekly PDF report.

## Runs alone using
- `VITE_USE_MOCK=true`: the portal reads samples from `fixtures.json`. No backend needed.
- `reports/make_weekly_pdf.py`: a pure function. Test it with `fixtures["weekly_report"]`.

## Safety rules for this portal
- A doctor sees a patient **only after the patient consents** (link `active`).
- A doctor's change is **"waiting for patient"** until the patient confirms on WhatsApp.
- The portal **never suggests** medicine changes. It only shows data. The doctor decides.

## Day plan
| Day | Tasks |
|---|---|
| **Day 1** | Vite, React, Tailwind setup; API client with mock switch; Doctor login; Patient list (`GET /doctor/patients`); Link patient screen (`POST /doctor-links`, shows "waiting for patient consent") |
| **Day 2** | Patient page: current medicines (`GET /patients/{id}/prescriptions?status=active`), prescription editor with **Keep / Change / Stop**, save creates `waiting_patient` prescription (`POST /prescriptions` with `prescribed_by` and `supersedes_id`), adherence table with colors |
| **Day 3** | `make_weekly_pdf.py` with a sample PDF from the fixture, "Access ended" handling for 403, loading and error states, polish, notes box (stretch, saved locally only until a notes endpoint is added to the contract) |
| **Day 4** | Merge: switch to the real API, copy the PDF file into `api/` with Task 1, deploy with Task 6 |
| **Day 5** | Polish, bug fixes, screenshots and a sample PDF for the pitch |

## Implementation steps

### Step 1: Setup
```bash
npm create vite@latest clinic-portal -- --template react
cd clinic-portal
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install react-router-dom recharts
```
Use the same API client pattern as the caregiver dashboard (mock switch on `VITE_USE_MOCK`), with its own copy of the mock data.
Pages: `Login.jsx`, `Patients.jsx`, `LinkPatient.jsx`, `PatientPage.jsx`.

### Step 2: Link patient
1. Doctor enters the patient's invite code (for example `ALI-4821`).
2. `POST /doctor-links` returns `pending`.
3. Show: "Waiting for the patient to allow access on WhatsApp."
4. When the status becomes `active` (checked by refreshing `GET /doctor/patients`), the patient appears in the list.
5. A 403 on any patient page shows "Access to this patient has ended".

### Step 3: Prescription editor
For each active medicine show name, dose, times, and **Keep / Change / Stop**.
- Change: edit dose and times.
- Stop: remove the medicine from the new version.
- Save sends `POST /prescriptions` with `prescribed_by` (the doctor id), `supersedes_id` (current prescription id), and the medicine list.
- Show the badge **"Waiting for patient confirmation"** and the text "The patient will be asked to confirm this on WhatsApp."

### Step 4: Adherence view
Table of date, medicine, and status with the same colors as the caregiver dashboard. Show the 7-day adherence number from `doctor_patients`.

### Step 5: Weekly PDF function
`clinic-portal/reports/make_weekly_pdf.py`:
```python
from weasyprint import HTML

def make_weekly_pdf(report: dict) -> bytes:
    rows = "".join(
        f"<tr><td>{r['date']}</td><td>{r['medicine']}</td><td>{r['status']}</td></tr>"
        for r in report["rows"])
    html = f"""
    <h1>Weekly report: {report['patient_name']}</h1>
    <p>{report['week_start']} to {report['week_end']}</p>
    <p><b>Adherence: {report['adherence']}%</b></p>
    <table border="1" cellpadding="6">
      <tr><th>Date</th><th>Medicine</th><th>Status</th></tr>{rows}</table>
    <p><i>For information only. This is not medical advice.</i></p>"""
    return HTML(string=html).write_pdf()
```
If WeasyPrint is hard to install, use ReportLab. Write a small script that turns `fixtures["weekly_report"]` into `sample_report.pdf`.
**Check:** the sample PDF opens and shows the table.

### Step 6: Notes (stretch)
Add a notes box on the patient page. Keep it local until the team adds a notes endpoint to the contract. Do not invent one.

## Ready when (Day 3 evening)
With mock data: login, link patient flow with the "waiting for consent" state, the editor creating a "waiting for patient" version, the adherence table, and the 403 message all work. `sample_report.pdf` opens correctly.

## Merge day (Day 4)
1. Set `VITE_USE_MOCK=false` and `VITE_API_URL=<backend>`.
2. Log in with the seeded doctor and test the full flow with Task 2's bot: link, consent, change, confirm.
3. Give Task 1 the file `make_weekly_pdf.py` (they copy it into `api/app/reports.py`).
4. Deploy to Vercel with Task 6.
