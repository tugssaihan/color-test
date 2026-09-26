# Color Showdown

A single-player, 12-level color-spotting run with a Supabase leaderboard and a Vercel serverless API.

## Run locally

Install the client dependencies once:

```powershell
cd client
npm install
cd ..
```

Then run the complete app from the repository root:

```powershell
npm run dev
```

Open the local URL it prints, normally `http://localhost:5173`.

Vite serves a local-only `/api/scores` adapter using the same Supabase helper as the Vercel function. There is no standalone Node server and no Vercel login is needed for local testing.

## Environment variables

Local Supabase credentials live in the ignored root `.env.local` file:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_your-secret-key
```

Never prefix the secret with `VITE_` or commit `.env.local`.

For production, add the same variables under **Vercel → Project → Settings → Environment Variables**, then redeploy.

## Supabase

Run `supabase/schema.sql` in the Supabase SQL Editor. It creates the `scores` table and ranking index with Row Level Security enabled.

## Checks

```powershell
npm run lint
npm run build
```
