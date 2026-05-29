@AGENTS.md

# SquadPicks

Multi-sport prediction game. Currently scaffolded for FIFA World Cup 2026.

## Stack
- **Next.js 16** (App Router, Turbopack) + TypeScript + Tailwind v4
- **Supabase** — Auth, PostgreSQL, PostgREST (RLS enforced)
- **Vercel** — deployment target

## Key Next.js 16 conventions
- Route protection lives in `proxy.ts` (NOT `middleware.ts`)
- All `params` / `searchParams` are Promises — always `await` them
- `cookies()` from `next/headers` is async — always `await`

## Supabase setup (first-time)
1. Create project at supabase.com
2. Run `supabase/schema.sql` in the SQL editor
3. Run `supabase/seed_wc2026.sql` in the SQL editor
4. Copy URL + anon key into `.env.local`
5. Dashboard → Authentication → Settings → disable email confirmations (dev only)
6. Add teams to `group_teams` and matches to `matches` after the draw

## Scoring (configurable via `scoring_rules` table)
- Exact score: **3 pts** | Correct result: **1 pt**
- Exact group position: **2 pts** | Correct top-2: **1 pt**
- Knockout winner points scale by round: R32=2, R16=3, QF=4, SF=5, Final=8

## Dev
```bash
cd squadpicks
npm run dev     # starts on http://localhost:3000
```

## Folder layout
```
src/
  app/
    (auth)/         # login, register — no nav wrapper
    (app)/          # protected pages — has Navbar
      dashboard/
      predict/[seasonId]/group-stage/
      predict/[seasonId]/knockout/
      groups/
    leaderboard/    # public SSR
    page.tsx        # landing (public)
  lib/
    supabase/       # client.ts (browser), server.ts (RSC/Route)
    scoring.ts      # client-side scoring preview logic
  types/
    database.ts     # all DB types
  components/
    ui/             # Button, Input
    nav/            # Navbar
supabase/
  schema.sql
  seed_wc2026.sql
proxy.ts            # auth route protection (Next.js 16)
```

## Design tokens (globals.css)
Brand colors are CSS custom properties — swap `--sp-brand` etc. to match your logo.
