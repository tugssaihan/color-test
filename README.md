# Color Showdown

A single-player, 12-level color-spotting run with an increasingly difficult tile grid and a Supabase-backed global leaderboard.

## Local development

Open two terminals from the repository root.

```powershell
cd server
npm install
npm run dev
```

```powershell
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. Without Supabase variables the local server automatically uses an in-memory leaderboard.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `server/.env.example` to `server/.env` and add the project URL and service-role key.

The service-role key is used only by the local API or Vercel serverless function. Never add it to a `VITE_` environment variable.

## Vercel deployment

Import the repository into Vercel and keep the repository root as the project root. `vercel.json` builds the Vite client and exposes `api/scores.js` as the leaderboard API.

Add these environment variables in Vercel project settings:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Deploy after saving them. The browser calls `/api/scores`, so no client-side URL or secret is required.

## Checks

```powershell
cd client
npm run lint
npm run build
```

With the local server running:

```powershell
cd server
npm run lint
npm test
```
