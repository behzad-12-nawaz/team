# DoseCare: Independent Build Plan (5 days)

## The idea in one paragraph
Each of the 6 tasks is built **alone**, against a frozen contract (`00_contract.md`) and shared sample data (`fixtures.json`). Every task replaces its neighbors with a **mock**. On Day 4 we swap mocks for the real parts by changing environment variables. Day 5 is for debugging, testing, and the demo.

## Schedule
| Day | What happens |
|---|---|
| **Day 1 morning (90 min, everyone together)** | Read `00_contract.md` and `fixtures.json`. Fix anything unclear. **Freeze it.** Create the repo with the folders listed in the contract. |
| **Day 1 afternoon to Day 3** | Everyone builds their own task alone, using mocks only. Nobody waits for anyone. |
| **Day 3 evening: ready check** | Each owner confirms their "Ready when" test passes (listed in each plan). Task 6 runs the contract tests against the mock API. |
| **Day 4: merge day** | Swap mocks for real parts, in the order below. Fix mismatches. Run the 10 scenarios. |
| **Day 5: debug and polish** | Bug fixing, retesting, demo rehearsal, backup video. **No new features.** |

Stretch features (voice notes, medicine Q&A, doctor notes, refill alerts) are done **only if the merge finishes early on Day 4**, otherwise skipped.

## Why this works
- The contract defines every shared message, so merging means "flip the switch", not "rewrite".
- Every owner has a mock for each neighbor, so nobody is blocked.
- Task 6's contract tests run against both the mock (Day 3) and the real backend (Day 4). If both pass, the merge is safe.

## What each task uses instead of the others
| Task | Runs alone using | Merge switch (Day 4) |
|---|---|---|
| 1 Backend | `NOTIFIER=console` (messages go to `outbox.log`), seed data, Swagger and pytest | `NOTIFIER=http` and `BOT_URL=<bot>` |
| 2 Bot | `tests/fake_backend.py` built from `fixtures.json`, `AI_MODE=mock` | `API_URL=<backend>`, `AI_MODE=real` |
| 3 AI | Command-line script and its own sample images | Bot installs the `ai/` package |
| 4 Caregiver dashboard | `VITE_USE_MOCK=true` (fake data from `fixtures.json`) | `VITE_USE_MOCK=false`, `VITE_API_URL=<backend>` |
| 5 Clinic portal | `VITE_USE_MOCK=true`; PDF function tested from the fixture | Same switch; PDF file copied into `api/` |
| 6 DevOps and QA | Own `mock-api/` built from the contract; deploys "hello" services | Runs the contract tests against the real backend |

## Merge day order (Day 4)
Do these in order. Each step has a pair, and the owner who deviated from the contract fixes their side.

| Step | Pair | Action | Pass check |
|---|---|---|---|
| 1 | Task 1 and Task 6 | Deploy the backend. Run contract tests against it. | All contract tests pass |
| 2 | Task 2 and Task 3 | Install `ai/` into the bot, set `AI_MODE=real` | Real prescription photo returns medicines |
| 3 | Task 2 and Task 1 | Bot `API_URL` to the real backend. Backend `NOTIFIER=http` and `BOT_URL` to the bot. | Photo, confirm, reminder with buttons, Taken works |
| 4 | Task 4 and Task 1 | Dashboard `VITE_USE_MOCK=false` | Dashboard shows the live dose status |
| 5 | Task 5 and Task 1 | Clinic portal switch. Copy `make_weekly_pdf.py` into `api/` and wire `weekly.pdf`. | Link, change medicine, PDF all work |
| 6 | Everyone | Run the 10-scenario checklist (in Task 6 plan) | Failures go on the bug list |

If a step fails and the cause is unclear, check the contract first. If the contract was wrong, fix `00_contract.md` and tell everyone the same hour.

## Daily rules
- 15-minute standup each morning. Ask only: "What is done? What is blocked? Any contract change?"
- Merge small pull requests every day to your own folder.
- Never commit secrets. Use `.env` (see `.env.example`).

## Using an AI coding assistant
Every plan file starts with an "Instructions for AI coding assistants" block. Tell the assistant: "Read my plan file and `00_contract.md`, then do only Step 1 and wait." Review every diff to make sure it only touched your own folder.
