# Next.js Rewrite Plan

## Scope

This rewrite starts with Foundation + Backend Parity. The legacy app remains runnable while the Next.js app is built and verified. The goal is not a UI redesign first; the goal is to preserve the parlour operations behavior in a Vercel-friendly Next.js application.

## Deployment Target

- Vercel hosts the Next.js app.
- Supabase PostgreSQL hosts the database.
- Supabase Auth with Google provider is the production authentication path.
- Runtime database access uses the Supabase Transaction pooler through `DATABASE_URL`.
- Server secrets stay on the server side only.

## Phase 1: Foundation + Backend Parity

1. Scaffold Next.js App Router with TypeScript and Tailwind.
2. Add server-only Postgres connection using `DATABASE_URL`.
3. Add Supabase Auth with Google provider and invite-only approved email mapping, with any app session state compatible with Vercel serverless execution.
4. Port the current API behavior:
   - health;
   - auth;
   - dashboard;
   - customers;
   - appointments;
   - staff;
   - services;
   - invoices;
   - payments;
   - inventory.
5. Keep the UI minimal: login and operational dashboard.

## Phase 2: Verification

1. Run existing legacy tests.
2. Add Next-specific parity tests.
3. Build the Next app locally after dependencies are installed.
4. Deploy to Vercel preview with Supabase test database.
5. Compare critical workflows against the legacy app.

## Phase 3: Cutover

1. Freeze legacy feature additions.
2. Promote the Next app to the primary app only after parity is confirmed.
3. Archive or remove the legacy app after user approval.

## Cost and Risk Controls

- Avoid paid Supabase features in the first pilot.
- Keep `PGPOOL_MAX=1` for serverless free-tier safety.
- Do not put `DATABASE_URL`, `SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, or database passwords in client components.
- Use only the Supabase anon key in client components; keep invite/user-role lookup server-side.
- Keep the Institute app out of this repository.
- Keep `data/schema.sql` as the initial DB contract until proper migrations replace it.
- Do not use the reset-oriented schema file against live Supabase data.
