# Demo script (~5 minutes)

Run sheet for Day 4 (team run-through) and Day 5 (presentation).
Data: [`demo-data.md`](demo-data.md) · Results: [`checklist.md`](checklist.md) · Source: PLAN.md Step 7.

**Total budget: 315 s (5 min 15 sec)**

## Pre-demo (start ~10 min before, every time)

- [ ] Open backend, bot, dashboard, and portal once each — wake free-tier servers (PLAN Step 3)
- [ ] **Test every phone number** — send one WhatsApp message to Ali, Fatima, and Dr. Usman's numbers and confirm it arrives (PLAN Step 7)
- [ ] Phones ready: Ali (patient), Fatima (caregiver), Dr. Usman (doctor) — WhatsApp logged in, charged
- [ ] Prepared images on the sending phone: the **clear** prescription photo (P1) and a **blurry** one
- [ ] A dose ready for the reminder segment (see Segment 3 prep)
- [ ] `checklist.md` open to tick scenarios as they pass
- [ ] Presenter: ______ · Phone handler: ______

## Timing table

| # | Segment | Budget |
|---|---|---|
| 1 | Problem | 30 s |
| 2 | Photo | 45 s |
| 3 | Reminder | 45 s |
| 4 | Taken and missed | 60 s |
| 5 | Caregiver dashboard | 45 s |
| 6 | Doctor portal | 60 s |
| 7 | Close | 30 s |
| | **Total** | **315 s (5 min 15 s)** |

## Run sheet

### 1 · Problem — 30 s

**Do:** show the problem slide only.
**Say:** "Missed medicines are common, and nobody notices in time — not the family, not the doctor."

### 2 · Photo — 45 s

**Do (WhatsApp, as Ali):**
1. Send the **clear** prescription photo (P1: Metformin + Amlodipine) → bot replies with the medicine summary → Ali taps **Confirm** → plan becomes active (S1) (S3).
2. Send the **blurry** photo → bot asks for a clearer photo, does not guess (S2).

**Say:** "The AI reads the photo; when it isn't sure, it refuses to guess and asks again."
**Devices:** Ali's phone (phone handler may drive it)

### 3 · Reminder — 45 s

**Prep:** a dose must fire inside this segment — schedule one ~1 minute before it, or use a dose already at `NOTIFIED`.
**Do:** hold up **both** phones — Ali and Fatima get the reminder with Taken/Skip/Snooze buttons **at the same time** (S4).
**Say:** "Patient and caregiver are alerted together — the loop starts with both of them."
**Devices:** Ali's + Fatima's phone

### 4 · Taken and missed — 60 s

**Do:**
1. Ali taps **Taken** → bot stops the loop and Fatima gets the confirmation (S5).
2. Leave the other dose unanswered → 3 reminders, then MISSED, caregiver gets the final message (S6). **Prep:** use a dose whose `reminder_count` is already 2 (demo-data dose 102 is the finished `MISSED` example) so the final alert lands inside the window — the interval is 5 minutes with a max of 3.
3. On a third dose tap **Snooze** once (accepted, 15 min) → tap it again → rejected, once per dose (S7).

**Say:** "Taken closes the loop; silence gets exactly three reminders, then the caregiver is told; snooze is once per dose."
**Devices:** Ali's + Fatima's phone

### 5 · Caregiver dashboard — 45 s

**Do:** open the caregiver dashboard as Fatima → today's doses: **green** for Taken, missed marked, adherence **86%** — the plan confirmed in Segment 2 is there (S3), with the outcomes of S5 and S6 visible.
**Say:** "Fatima sees today's truth at a glance — no phone-call chase, no guessing."
**Devices:** laptop

### 6 · Doctor portal — 60 s

**Do (Dr. Usman on laptop + Ali's phone):**
1. Dr. Usman pastes invite `ALI-4821` → link is `pending`, Ali sees no doctor access yet (S8).
2. Ali taps **Allow** → only now can the doctor see Ali.
3. Dr. Usman changes Amlodipine → Ali gets a WhatsApp confirm request → Ali taps confirm → the schedule changes (S9).
4. Ali taps **Revoke** → the doctor loses access immediately (S10) — then point back to the Segment 3–4 phones: **reminders keep running**.

**Say:** "The doctor never sees a patient until the patient says yes — and can take it back anytime."
**Devices:** Dr. Usman's login (laptop) + Ali's phone

### 7 · Close — 30 s

**Do:** impact slide.
**Say:** "Fewer missed doses, caregivers informed in seconds, doctors involved only with consent. Next: real clinic pilots."

## If something breaks

Skip to the next segment, note what failed, and file it as a GitHub issue with a screenshot (PLAN Step 6). Never stop the demo to debug live.
