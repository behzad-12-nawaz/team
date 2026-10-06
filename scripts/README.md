# "Hello" smoke-test apps

Minimal services used to prove the deploy pipeline on Day 1,
before any real code exists.

## Backend hello — Render or Railway

1. Create a new web service from the `scripts/hello-api/` folder.
2. Connect the GitHub repo (this branch or the folder).
3. Set env vars: `DATABASE_URL` (leave empty for hello), `JWT_SECRET` (any value), `NOTIFIER=console`.
4. Deploy. Note the public URL.
5. **Check:** `curl <url>/` returns `{"hello": "dosecare-api"}`.

## Bot hello — Render or Railway

Same as backend hello, but from `scripts/hello-bot/`.
Env vars: `BOT_SERVICE_TOKEN` (any value), `API_URL` (any value).

**Check:** `curl <url>/send` returns `{"sent": true}`.

## Frontend hello — Vercel

1. Import `scripts/hello-dashboard/` as a new Vercel project.
2. Set env vars in Vercel dashboard: `VITE_USE_MOCK=true`, `VITE_API_URL=<backend-hello-url>`.
3. Deploy. Note the public URL.

Repeat for `scripts/hello-portal/`.

**Check:** each Vercel URL loads and shows the "Hello" card.

## Free-tier notes

- Render/Railway free servers **sleep when idle** — open the URL before the demo to wake them.
- Vercel free tier has bandwidth limits; hello apps use negligible traffic.
- Do NOT store real secrets in these hello services. Use placeholder values.

## Redeploy-on-merge proof

Push a trivial change (e.g. bump the hello text) to `main` and confirm each service auto-redeploys.
