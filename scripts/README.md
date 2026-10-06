# "Hello" smoke-test apps (Vercel only, free tier)

Minimal services used to prove the deploy pipeline on Day 1,
before any real code exists. All four run on Vercel's free tier —
no credit card required.

## What's in this folder

| Folder | Becomes | Vercel project name |
|---|---|---|
| `hello-api/` | Backend hello | `dosecare-hello-api` |
| `hello-bot/` | Bot hello | `dosecare-hello-bot` |
| `hello-dashboard/` | Dashboard hello | `dosecare-hello-dashboard` |
| `hello-portal/` | Portal hello | `dosecare-hello-portal` |

Each folder is a standalone Vercel project with a `package.json`
and an `api/index.js` serverless function (for backend/bot)
or a plain `index.html` (for frontends).

## Deploy — backend hello (hello-api)

1. Go to https://vercel.com → **"Add New..."** → **"Project"**
2. Click **"Import"** next to your GitHub repo (`behzad-12-nawaz/team`)
3. **Root Directory:** click "Edit" → set to `scripts/hello-api`
4. **Framework Preset:** Other (Vercel auto-detects Node.js)
5. **Environment Variables** (click "Environment Variables"):
   - `DATABASE_URL` → leave empty for hello (or paste your real Neon/Supabase URL)
   - `JWT_SECRET` → any random string, e.g. `hello-secret-change-on-merge`
   - `NOTIFIER` → `console`
6. Click **"Deploy"**
7. After ~30 seconds, note the public URL (e.g. `https://dosecare-hello-api.vercel.app`)
8. **Verify:** `GET <url>/` → `{"hello": "dosecare-api"}`
9. **Verify:** `GET <url>/health` → `{"status": "ok"}`

## Deploy — bot hello (hello-bot)

Same as backend hello, but:

- **Root Directory:** `scripts/hello-bot`
- **Environment Variables:**
  - `BOT_SERVICE_TOKEN` → any value
  - `API_URL` → any value
- **Verify:** `GET <url>/send` → `{"sent": true}`

## Deploy — dashboard hello (hello-dashboard)

- **Root Directory:** `scripts/hello-dashboard`
- **Framework Preset:** Other / Static
- **Environment Variables:**
  - `VITE_USE_MOCK` → `true`
  - `VITE_API_URL` → paste your backend hello URL from above
- **Verify:** open URL → shows "Hello, DoseCare Dashboard" card

## Deploy — clinic portal hello (hello-portal)

- **Root Directory:** `scripts/hello-portal`
- Same env vars as dashboard
- **Verify:** open URL → shows "Hello, DoseCare Clinic Portal" card

## Free-tier notes

- Vercel free tier: **100 GB bandwidth/month**, unlimited static sites.
- Serverless functions cold-start in ~1-3 seconds after idle. No manual wake-up needed
  (unlike Render/Railway free servers that sleep).
- **Do NOT store real secrets** in these hello services. Use placeholder values.
- Each Vercel project can be linked to the same GitHub repo with a different
  Root Directory — no extra repos needed.

## Redeploy-on-merge proof

1. Edit `scripts/hello-api/api/index.js`, change the hello text:
   `{ hello: "dosecare-api — redeploy test" }`
2. Commit and push to `main`:
   ```bash
   git add scripts/hello-api/api/index.js
   git commit -m "task6: prove redeploy on merge"
   git push origin main
   ```
3. All four Vercel projects auto-redeploy within ~60 seconds.
4. Hit each URL to confirm the new text is live.
