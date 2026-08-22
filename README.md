# SMB Payroll & Bookkeeping Portal

A web portal that lets small businesses share payroll data with their employees
without doing it over email. Three roles, one app:

- **Employee** — salary insights (averages, fluctuations, deductions), leave
  balance, download pay slips and forms, submit time-off requests.
- **Manager** — read-only view of their direct team, approve or reject the team's
  time-off requests.
- **Bookkeeper** — upload pay slips, assign them to employees, maintain salary
  data and leave entitlements.

Final project for Internet Technologies, RUNI CS 2026.
Built by Liad Pilosof and Omer Yaacobi.

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Database | Supabase Postgres with Row Level Security |
| Auth | Supabase Auth |
| Files | Supabase Storage (private buckets) |
| Styling | Tailwind CSS 4 |
| Validation | Zod |
| Hosting | Vercel |

## Running locally

Requires Node.js 20 or later.

```bash
git clone https://github.com/LiadPilosof/Full-Stack-project-Liad-and-Omer.git
cd Full-Stack-project-Liad-and-Omer
npm install
cp .env.example .env.local   # then fill in the values, see below
npm run dev
```

The app runs at http://localhost:3000.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck without emitting files |

## Environment variables

Copy `.env.example` to `.env.local` and fill in both values. `.env.local` is
gitignored and must never be committed.

| Variable | Where to find it | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API | The project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page, "anon" / "publishable" key | Safe in the browser |

Two things to understand about these:

**The `NEXT_PUBLIC_` prefix is required.** Without it Next.js keeps the variable
server-only and the browser client receives `undefined`.

**The anon key is meant to be public.** It grants no permissions on its own —
every table has Row Level Security enabled, so Postgres decides what each
logged-in user can read. That is also why the `service_role` key must never be
added to this file: anything prefixed `NEXT_PUBLIC_` is compiled into the
JavaScript every visitor downloads, and `service_role` bypasses RLS entirely.

## Project structure

```
app/                    App Router pages and layouts
  page.tsx              /
lib/
  env.ts                Environment variable validation
  supabase/
    server.ts           Client for Server Components, Actions, Route Handlers
    client.ts           Client for browser code (auth only)
    session.ts          Session refresh used by proxy.ts
proxy.ts                Runs on every request to keep the session fresh
docs/
  technical-design/     Architecture, schema, RLS, API, UX
  for-liad-role-security.md
```

Reads happen in Server Components using `lib/supabase/server.ts`, so payroll
figures are rendered into HTML on the server and never fetched by browser
JavaScript. `lib/supabase/client.ts` is used only for sign-in and sign-out, where
the library has to write the session cookie itself.

## Documentation

| Document | Contents |
| --- | --- |
| [Overview](docs/technical-design/00-overview.md) | Scope, stack rationale, roles, permission matrix |
| [Database](docs/technical-design/01-database.md) | Schema, constraints, indexes, views |
| [Row Level Security](docs/technical-design/02-rls.md) | Policies for all three roles, Storage rules |
| [API](docs/technical-design/03-api.md) | Server Actions, Route Handlers, CRUD matrix |
| [Frontend](docs/technical-design/04-frontend.md) | Folder structure, components, state, errors |
| [Business logic](docs/technical-design/05-business-logic.md) | Salary maths, leave accounting, state machines |
| [UX](docs/technical-design/06-ux.md) | Screen-by-screen design per role |

## Status

Foundation in place: Next.js app, Supabase connection, session refresh.
Next up: authentication (login), then role-based routing, then the first
end-to-end feature.
