# Sambhal Portal

Your back office for every Sambhal client: pipeline, jobs per account, WhatsApp connection, listings, settings, hours, usage and monthly review. It reads and writes the same Postgres database the n8n workflows use.

## Run it

1. Create a Postgres database (Supabase is fine). In its SQL editor run, in order:
   `db/01_schema.sql`, then `db/02_sync_and_alerts.sql`.
2. Copy `.env.example` to `.env.local` and fill in:
   - `DATABASE_URL` – the Postgres connection string
   - `ADMIN_PASSWORD` – the password you will sign in with
   - `SESSION_SECRET` – any long random string (`openssl rand -hex 32`)
   - `CAPACITY_HOURS` – your own monthly expert-hours capacity (default 80)
3. `npm install`, then `npm run dev` and open http://localhost:3000.

## Put it online (Vercel)

Import the folder as a project, add the four environment variables, deploy. Use a long `ADMIN_PASSWORD`; there is one login and no user accounts in this phase.

## Pages

- **Overview**: revenue, hours, usage and a "needs attention" list (hours or usage at 80%, failed runs, workflow errors).
- **Accounts**: pipeline from lead to live. Add an account here.
- **Account**: Overview and plan, Jobs (the database blocks going over the plan limit), WhatsApp connection, Listings (hand entry and Google Sheet link), Settings (buyer questions, budgets, areas, visit slots), Hours and usage cap, Activity.
- **Run log**, **Monthly review** (numbers plus a Hinglish message to copy), **Job catalogue**, **System**.

## Before real clients

- WhatsApp access tokens are stored as plain text. Move them to Supabase Vault or encrypt them.
- Usage costs are estimates from the rates in each account's Settings. Compare them with the Meta invoice monthly.
- Turn on database backups.
