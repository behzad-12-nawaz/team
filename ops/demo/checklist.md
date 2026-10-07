# 10-scenario checklist

Run against the **real backend** on Day 4/5 (contract tests run against the
mock first). Scenario text is copied verbatim from `PLAN.md` Step 5 — never
invent or rename scenarios.

**How to record:** set Result to `PASS` / `FAIL`, name the tester, and for any
`FAIL` attach a screenshot in `ops/demo/screenshots/` (or a link). Data for
every run comes from [`demo-data.md`](demo-data.md).

**Run metadata:** Date: ______  ·  Backend URL: ______  ·  Tester(s): ______

| # | Scenario | Expected | Result | Tester | Screenshot (FAIL) | Notes |
|---|---|---|---|---|---|---|
| 1 | Clear prescription photo | Correct summary, Confirm works | | | | |
| 2 | Blurry photo | Bot asks for a clearer photo, no guessing | | | | |
| 3 | Confirm a plan | Doses appear in the dashboard | | | | |
| 4 | Dose time arrives | Patient and caregiver get a reminder together | | | | |
| 5 | Patient taps Taken | Loop stops, caregiver notified, dashboard green | | | | |
| 6 | No reply | 3 reminders, then MISSED, caregiver gets the final message | | | | |
| 7 | Snooze twice | Second snooze rejected | | | | |
| 8 | Doctor links a patient | No access until the patient consents | | | | |
| 9 | Doctor changes a medicine | Patient confirms on WhatsApp, then the schedule changes | | | | |
| 10 | Patient revokes doctor | Doctor loses access, reminders keep running | | | | |

**Summary:** ___ of 10 passed · Failures filed as GitHub issues (owner tag
`task1`–`task5`, per PLAN Step 6).
