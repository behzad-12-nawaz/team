# Day 4 — contract-test results vs live backend

- Date: 2026-10-09
- Base URL: `https://api-seven-zeta-25.vercel.app` (Vercel project `api`, folder `api/`)
- DB: Neon (from root `.env` `DATABASE_URL`), seeded with committed demo data via `api/seed.py`
- Suite: `ops/contract-tests` → `BASE_URL=… pytest`
- Current: **14 passed, 7 failed** (of 21 non-bot tests; `test_bot_send` is the bot service — allowed fail)

## What was fixed to get here
1. `api/vercel.json` pinned the function entrypoint to `app/main.py` (auto-detect served 500).
2. Live deploy's Vercel project had no `DATABASE_URL` (two projects existed: root link `dosecare` vs
   `api/.vercel` project `api`). Added `DATABASE_URL` to project `api` + redeployed.
3. `api/seed.py` aligned to `ops/demo/demo-data.md` logins (`@demo.pk` / `demo`; ali=1, caregiver=2,
   amina=3, bilal=4, sara=5, doctor=**9**; doctor link 7 → doctor 9). Neon reseeded.
   Logins verified live: caregiver→2, doctor→9, ali→1.

## Remaining failures (evidence + owner)

| # | Test | Got → Want | Evidence | Owner / dependency |
|---|---|---|---|---|
| 1 | `test_confirm_prescription` | 400 → 200 | `POST /prescriptions/11/confirm` rejected: P11 is seeded **active with doses already** | **Task 1**: contract (§4 confirm) expects 200 `active` + `doses_created`. Either keep confirm idempotent for active (mock-style) or state how seeding should orient P11 for the demo |
| 2 | `test_list_active_prescriptions` | `[]` → non-empty | Runs after confirm(FAIL) + reject(P11→`rejected`); no other active rx for Ali | **Task 1**: test-order artifact of a real, stateful DB. Recommend seeding a second active prescription for patient 1 that tests never mutate (decide the id) |
| 3 | `test_create_doctor_link_pending` | 409 → 200 | `POST /doctor-links` `ALI-4821` → 409 because link 7 is pre-seeded `active` | **Task 1**: either don't pre-seed link 7 (demo scenario 8 creates it) or return 200 reusing existing link — pick one |
| 4 | `test_delete_doctor_link_revoked` | 403 → 200 | `DELETE /doctor-links/7` after the consent test left it `revoked` | **Task 1**: contract expects delete → 200 `revoked`, even if already revoked (mock was idempotent) |
| 5 | `test_doctor_patients_active_links_only` | `[]` → non-empty | Follow-on: link 7 was revoked by the consent test, so no active links | **Task 1**: same idempotency/re-order root cause as #3/#4 |
| 6 | `test_error_404_unknown_patient` | 403 → **404** | `GET /patients/99999/prescriptions` (caregiver) returns 403; contract/mock precedence is patient-exists check first → 404 (`fixtures error_404`) | **Task 1**: real contract bug — unknown patient must be 404 regardless of role |
| 7 | `test_weekly_report_pdf` | 501 → 200 `%PDF` | `/reports/1/weekly.pdf` → 501 Not Implemented | **Task 5 → Task 1 hand-off**: `make_weekly_pdf.py` not landed yet (merge-day step 5) |
| (allowed) | `test_bot_send` | 404 → 200 | `POST /send` — route belongs to the **bot** service | **Task 2**; run against bot URL, not the API |

## Notes
- `api`'s own pytest suite: **33 passed** (unchanged, green).
- No frozen file (`ops/contract/*`, `ops/contract-tests/*`) was modified.
- #1–#5 are mostly the mock's stateless behavior vs a real persistent DB — Task 1 must decide the
  intended real semantics (idempotency) or seed orientation so the frozen suite passes on merge day.
- #6 is a clean, defensible contract violation to fix in `api/app/routers/`.