# DoseCare

Medicine reminder system for patients, caregivers, and doctors.
Send a prescription photo → get a dose schedule → receive reminders with
Taken / Skip / Snooze buttons on WhatsApp, plus a caregiver dashboard
and a doctor portal.

## Project structure

| Folder | Owner | What it does |
|---|---|---|
| `contract/` | Everyone | `00_contract.md` (frozen after Day 1) + `fixtures.json` (shared sample data) |
| `api/` | Task 1 | FastAPI backend + reminder engine |
| `bot/` | Task 2 | WhatsApp bot |
| `ai/` | Task 3 | `dosecare_ai` Python package |
| `caregiver-dashboard/` | Task 4 | React caregiver app |
| `clinic-portal/` | Task 5 | React doctor app + weekly PDF |
| `ops/` | Task 6 | Deploy, contract tests, mock-api, demo, pitch |
| `docs/` | Task 6 | Team schedule and runbooks |
| `scripts/` | Task 6 | "Hello" smoke-test apps and deploy helpers |

## Rules

- The contract (`contract/00_contract.md`) is **frozen** after the Day 1 kickoff.
  Any change needs a team message `"Contract change: ..."` and a commit to the contract file.
- Everyone works on a **feature branch** and merges by **pull request** (one quick review, same day).
- `CODEOWNERS` enforces that a change in someone else's folder needs that owner's approval.
- **Never commit secrets.** Copy `.env.example` to `.env` and share real values only in a private team chat.

## Merge switches (Day 4)

The system is designed so every task runs alone using mocks.
Merging means "flipping a switch," not rewriting code.

| Variable | Task | Merge value |
|---|---|---|
| `NOTIFIER` | api | `http` + `BOT_URL=<bot>` |
| `AI_MODE` | bot | `real` |
| `VITE_USE_MOCK` | both frontends | `false` + `VITE_API_URL=<backend>` |

## Local development

See each task's `PLAN.md` for setup commands.

Task 6 contract tests (Day 2 onward) run against the mock API:

```bash
BASE_URL=http://localhost:9000 pytest
```

## Merge day (Day 4) order

See `docs/README_team_schedule.md` for the step-by-step merge order.
