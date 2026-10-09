# Database setup — Day 1

Task 6 provisions the shared database. Task 1 (backend) consumes `DATABASE_URL`
to run migrations and `seed.py`.

## Option A: Neon (recommended)

1. Sign up at https://neon.tech (GitHub auth works).
2. Create a new project, pick a region close to Pakistan (e.g. `ap-southeast-1`).
3. Copy the **connection string** from the dashboard (looks like):
   `postgres://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`
4. Paste it into your local `.env` as `DATABASE_URL`.
5. Note: **free-tier Neon sleeps after ~5 minutes of inactivity**.
   Open the Neon SQL editor or the app URL before the demo to wake it.

## Option B: Supabase

1. Sign up at https://supabase.com.
2. New project → pick a region.
3. Settings → Database → Connection string → **URI mode**.
4. Copy the `postgresql://` string into `.env` as `DATABASE_URL`.
5. Same idle-sleep caveat applies.

## After setup

Share `DATABASE_URL` in the private team chat (not in code or PRs).
Task 1 will run Alembic migrations and `seed.py` against this URL on Day 1/2.
