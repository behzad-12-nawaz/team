# DoseCare demo data list

Source of truth for the demo (Day 3 rehearsal, Day 5 presentation).
IDs, phones, and invite codes match `ops/contract/fixtures.json` and the mock API.
Medicine times are **Pakistan time**; dose `scheduled_at` in fixtures is **UTC**
(PKT = UTC+5, e.g. Metformin 08:00 PKT = `2026-10-05T03:00:00Z`).

## 1. People (6 logins)

| Name | Role | Phone | Email | Password | mock `user_id` |
|---|---|---|---|---|---|
| Ali Khan | patient | `923001234567` | `ali@demo.pk` | `demo` | 1 |
| Amina Bibi | patient | `923007654321` | `amina@demo.pk` | `demo` | 3 |
| Sara Ahmed | patient | `923009876543` | `sara@demo.pk` | `demo` | 5 |
| Fatima Khan | caregiver | `923001112223` | `caregiver@demo.pk` | `demo` | 2 |
| Bilal Ahmed | caregiver | `923004445556` | `bilal@demo.pk` | `demo` | 4 |
| Dr. Usman | doctor | `923007778889` | `doctor@demo.pk` | `demo` | 9 |

- Caregiver Fatima watches **Ali + Amina** (matches `caregiver_patients` fixture).
- Caregiver Bilal watches **Sara** (demo story only; mock returns the static list).
- Doctor Usman links to Ali via invite code **`ALI-4821`** (link id **7**).
- These are demo credentials, not secrets. Real phone numbers: replace the
  placeholders above and **test every number before the Day 5 rehearsal**.

## 2. Prescriptions (10 samples)

| # | id | Patient | Medicines (dose · times · days) | Status | Used in scenarios |
|---|---|---|---|---|---|
| P1 | 11 | Ali | Metformin 500 mg · 08:00, 20:00 · 30d; Amlodipine 5 mg · 09:00 · 30d | `active` (90 doses) | 1, 3, 4, 5, 6, 7 |
| P2 | 21 | Amina | Metformin 500 mg · 08:00 · 14d | `active` | 3 |
| P3 | 22 | Amina | Atorvastatin 20 mg · 21:00 · 30d | `active` | 3 |
| P4 | 23 | Sara | Amoxicillin 500 mg · 06:00, 14:00, 22:00 · 7d | `active` | 3 |
| P5 | 24 | Sara | Omeprazole 20 mg · 07:00 · 30d | `draft` | 1 (second clear-photo example) |
| P6 | 25 | Ali | Vitamin D3 1000 IU · 10:00 · 30d | `waiting_patient` | — (doctor-prescribed, Ali confirms) |
| P7 | 26 | Amina | Levothyroxine 50 mcg · 07:00 · 30d | `active` | — |
| P8 | 27 | Sara | Cetirizine 10 mg · 22:00 · 7d | `stopped` | — |
| P9 | 28 | Ali | Losartan 50 mg · 18:00 · 30d | `superseded` | — |
| P10 | 12 | Ali | Amlodipine 5 mg → **10 mg** · 09:00 · 30d (`supersedes_id`: 11) | `waiting_patient` (v2) | 9 |

- P1 is the flagship: it comes from the clear-photo extraction (Metformin +
  Amlodipine = exactly `fixtures["extraction"]`), confirming it creates 90 doses.
- P10 is the doctor's change from scenario 9; when Ali confirms, P10 becomes
  `active` and P1 is `superseded`.
- Together the 10 cover every contract status: `draft`, `waiting_patient`,
  `active`, `rejected`* , `stopped`, `superseded` (*rejected example: any photo
  the patient declines — created during the demo, not pre-listed).

## 3. Scenario → data index (the 10 scenarios)

| # | Scenario | Data used |
|---|---|---|
| 1 | Clear prescription photo | Extraction = P1's two medicines; Confirm → P1 `active`, 90 doses |
| 2 | Blurry photo | **No prescription created** — bot asks for a retry (fixtures warning: "Dose of Amlodipine is hard to read") |
| 3 | Confirm a plan | P1 (+ P2, P3, P4 for the dashboard); doses `101–104` appear for Ali |
| 4 | Dose time arrives | Dose `101` (03:00Z = 08:00 PKT) → reminder sent to Ali **and** Fatima together |
| 5 | Patient taps Taken | Reply `taken` on dose `103` → `CONFIRMED`; loop stops; Fatima notified; dashboard green |
| 6 | No reply | Dose `102` hits `reminder_count` 3 → `MISSED` → final alert to Fatima |
| 7 | Snooze twice | First snooze (15 min, once per dose) OK → second snooze → **422** "Snooze already used for this dose" |
| 8 | Doctor links patient | Dr. Usman + invite `ALI-4821` → link 7 `pending` → Ali consents → `active` |
| 9 | Doctor changes medicine | Dr. Usman changes Ali's Amlodipine → P10 (id 12, v2) `waiting_patient` → Ali confirms on WhatsApp → P10 `active`, P1 `superseded` |
| 10 | Patient revokes doctor | Ali revokes link 7 → doctor reads → **403**; P1 reminders keep running |

## 4. Fixed fixture references

| Thing | Value |
|---|---|
| Invite code | `ALI-4821` |
| Doctor link id | `7` (Ali) |
| Dose ids | `101` Metformin 03:00Z · `102` Amlodipine 04:00Z (MISSED) · `103` Metformin 15:00Z · `104` Metformin next day 03:00Z |
| Weekly report | Ali, `2026-09-28` → `2026-10-04`, adherence **86%** |
| Login fixture | `caregiver@demo.pk` / `demo` → `mock-token`, role `caregiver`, user 2 |
