# Pitch deck — Day 5 additions (placeholders)

The deck already has: **problem, solution, reminder logic, competitors,
architecture, team**. This page lists only the additions to prepare now with
placeholders and finalize on Day 5 (PLAN Step 8).

**Rule: no fake data here.** Everything that must be real is bracketed
`[DAY 5: ...]`. Sources for the Day 5 artifacts:

| Source | File |
|---|---|
| Bot chat / dashboard / portal screenshots | `ops/demo/screenshots/` (captured during the Day 4 run) |
| Prescription-read + scenario numbers | `ops/demo/checklist.md` pass/fail |
| Demo walkthrough order | `ops/demo/demo-script.md` segments |
| People/values shown | `ops/demo/demo-data.md` (adherence 86% is Ali's fixture value, fixture-backed) |

## A. NEW slide — Demo flow

Title: **"DoseCare in 5 steps"** — one slide, five lines (skeleton final now;
only the visuals are `[DAY 5]`):

1. Send a prescription photo → AI reads it (WhatsApp)
2. Confirm the plan → doses are scheduled
3. Reminder arrives on **both** patient and caregiver phones
4. Taken closes the loop; silence → 3 reminders → Missed → caregiver alert
5. Caregiver dashboard + doctor portal (consent-gated)

`[DAY 5: add the screenshot strip under the 5 steps — see B]`

## B. NEW slide (or strip on slide A) — Screenshots

Three captioned boxes:

1. **Bot chat** — the photo → summary → Confirm conversation (demo-script segments 2–4)
2. **Caregiver dashboard** — Fatima's view: green/missed doses, adherence (segment 5)
3. **Doctor portal** — link + consent + change-medicine flow (segment 6)

`[DAY 5: replace each box with the screenshot from ops/demo/screenshots/]`

## C. UPDATE — Real test numbers (edits to existing slides)

PLAN Step 8 example: `[DAY 5: N of 10]` prescriptions read correctly — replace
`N` with the real count from the checklist run.

Proposed stat block (every metric stays bracketed until Day 5):

- `[DAY 5: N/10]` scenarios passed (from `checklist.md`)
- `[DAY 5: N/10]` prescriptions read correctly by the AI
- `[DAY 5: seconds]` for the caregiver to be notified of a Missed dose
- Adherence shown live in the demo is Ali's fixture value **86%** — label it as
  the demo patient, not a test claim

## Today vs Day 5

| Slide | Today (fill in now) | Day 5 (replace) |
|---|---|---|
| A · Demo flow | 5-step outline | screenshot strip |
| B · Screenshots | 3 captioned boxes | real screenshots from `ops/demo/screenshots/` |
| C · Numbers | `[DAY 5:]` placeholders | real numbers from `checklist.md` |

**Day 3 check:** file exists · all additions listed · zero fake numbers.