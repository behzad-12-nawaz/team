# Task 4 (v2): Caregiver dashboard

**Folder:** `caregiver-dashboard/` | **Skills:** React, Tailwind CSS

## Instructions for AI coding assistants
You are building ONLY Task 4 (caregiver dashboard) of a 6-person project. Other tasks are built by other people at the same time and are NOT ready.
1. Read `00_contract.md` and `fixtures.json` first. Use only those endpoint names, fields, and statuses. Never invent or rename them. If something is missing, stop and ask me.
2. Only edit files inside `caregiver-dashboard/`. Do not write backend, bot, or clinic portal code.
3. Use the mock layer (`VITE_USE_MOCK=true`) for all data. Mark it `// MOCK: replace on merge day`.
4. Work one step at a time. After each step, run its check and show me the result before continuing.
5. Follow the current day in the schedule. Do not build later days early.
6. Do not add libraries or features that are not in this plan without asking.
7. Never write secrets into code. Use `.env`.
8. After each step, tell me what is done, what is mocked, and what is missing.

## Goal
A web dashboard where a caregiver logs in, sees linked patients, today's doses with status colors, an adherence calendar, and a weekly chart.

## Runs alone using
`VITE_USE_MOCK=true`: the API client returns data from `fixtures.json` (copy the needed parts into `src/mock/data.json`). No backend is needed.

## Status colors
| Status | Color |
|---|---|
| `CONFIRMED`, `CONFIRMED_LATE` | green |
| `SKIPPED` | gray |
| `NOTIFIED` | amber |
| `MISSED` | red |
| `SCHEDULED` | blue |

## Day plan
| Day | Tasks |
|---|---|
| **Day 1** | Vite, React, Tailwind setup; API client with mock switch; Login page; Patients list page |
| **Day 2** | Patient detail: today's doses with status badges, adherence number, 30-day calendar, weekly chart (Recharts) |
| **Day 3** | Settings page (add patient, alert mode), 30-second auto refresh, loading, empty and error states, mobile layout, real-API client code checked against the contract |
| **Day 4** | Merge: set `VITE_USE_MOCK=false` and `VITE_API_URL`, fix any mismatch, deploy with Task 6 |
| **Day 5** | Polish, bug fixes, screenshots for the pitch |

## Implementation steps

### Step 1: Setup
```bash
npm create vite@latest caregiver-dashboard -- --template react
cd caregiver-dashboard
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install react-router-dom recharts
```
Add the Tailwind plugin to `vite.config.js` and `@import "tailwindcss";` to `src/index.css` (check the Tailwind docs if the setup changed).
Folders: `src/api/client.js`, `src/mock/data.json`, `src/pages/`, `src/components/`.

### Step 2: API client with mock switch
```js
import mock from "../mock/data.json";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
const BASE = import.meta.env.VITE_API_URL;

export async function api(path, options = {}) {
  if (USE_MOCK) return mockResponse(path, options);          // MOCK
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json",
               Authorization: token ? `Bearer ${token}` : "", ...options.headers },
  });
  if (!res.ok) throw new Error((await res.json()).detail || res.status);
  return res.json();
}
```
`mockResponse` maps each contract path to the matching sample in `data.json`. Every path in the real branch must use exactly the contract paths.
**Check:** the app works with the backend turned off.

### Step 3: Screens
1. **Login:** email and password, save token, go to Patients.
2. **Patients:** card per patient with name, "taken of total today" and a red badge if `missed > 0`. Data: `GET /caregiver/patients`.
3. **Patient detail:** (`GET /patients/{id}/doses`)
   - Top: today's doses as rows with a status badge.
   - Big adherence percentage.
   - 30-day adherence calendar (green, red, gray days).
   - Weekly bar chart (taken vs missed per day).
4. **Settings:** add patient (`POST /caregiver/patients`) and alert mode (`PUT /caregiver/settings`).

### Step 4: Adherence number
```js
const adherence = Math.round(100 * taken / Math.max(1, taken + missed + skipped));
```

### Step 5: Auto refresh and states
```js
useEffect(() => { const id = setInterval(load, 30000); return () => clearInterval(id); }, []);
```
Show a loading spinner, an empty-state message, and a friendly error message ("Could not load. Try again").

### Step 6: Mobile layout
Test at 390 px wide. Use large text and clear colors, because relatives of elderly patients will use it.

## Ready when (Day 3 evening)
With mock data: login, patient list, patient detail with doses, calendar and chart, settings forms, and error states all work, on both desktop and phone width.

## Merge day (Day 4)
1. Set `VITE_USE_MOCK=false` and `VITE_API_URL=<backend>`.
2. Log in with a seeded caregiver.
3. Fix mismatches (usually field names). If the backend deviates from the contract, ask Task 1 to fix their side.
4. Deploy to Vercel with Task 6.
