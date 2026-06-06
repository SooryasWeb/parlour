# SooryasWeb

Mobile-first prototype and planning workspace for the **SooryasWeb Parlour App**.

Current priority: evolve this repository into the **SooryasWeb Parlour App** for Soorya's Skin Hair and Makeup. The training institute is now a separate product: **Sooryas Institute App**, with its own repository and PostgreSQL database.

The current prototype is being refocused on the Kumarapuram parlour model:

- parlour appointments and customer notes;
- customer CRM;
- staff-managed bookings;
- invoice and payment discipline;
- staff commissions;
- inventory basics;
- manual WhatsApp links;
- dashboard for daily operations.

## Quick Start

Requirements:

- Node.js 22 or later.
- Docker Desktop, or another local PostgreSQL server listening on port `5432`.

Start PostgreSQL:

```powershell
cd C:\Users\raghu\Prev_OneDrive\Documents\BeautyCareTutorials\SooryasWeb
docker compose up -d db
```

If Docker says it cannot connect to `dockerDesktopLinuxEngine`, Docker Desktop is not running yet. Start Docker Desktop, wait until it says it is running, then retry:

```powershell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
docker version
docker compose up -d db
```

Run the app. On the first local run against a fresh database, allow the app to create the development schema and seed data:

```powershell
cd C:\Users\raghu\Prev_OneDrive\Documents\BeautyCareTutorials\SooryasWeb
$env:ALLOW_SCHEMA_INIT='true'
npm.cmd start
```

After the schema exists, future starts can use:

```powershell
npm.cmd start
```

Open:

```text
http://localhost:3000
```

Run tests:

```powershell
npm.cmd test
```

Tests run against `sooryas_parlour_test`. Destructive schema resets are blocked unless the configured database name ends with `_test`.

Install the Playwright browser once, then run automated UI tests across desktop and mobile viewports:

```powershell
npm.cmd run test:ui:install
npm.cmd run test:ui
```

Run coverage:

```powershell
npm.cmd run coverage
```

## Current Prototype Stack

This prototype originally used a zero-dependency JSON store, but the current direction now uses PostgreSQL:

- Node.js built-in HTTP server;
- Vercel Node function entrypoint for `/api`;
- Node.js built-in test runner;
- PostgreSQL via the `pg` package;
- vanilla HTML, CSS, and JavaScript.

This is still not final production architecture, but it is closer to the BRD direction than the first JSON prototype.

## Data Storage

The current app uses PostgreSQL. Local development expects a Postgres database matching `docker-compose.yml`.

For free-tier hosting, deploy the Next.js app to Vercel with the Vercel project root directory set to `next-app`, then connect it to Supabase PostgreSQL with `DATABASE_URL`. Use the Supabase **Transaction pooler** connection string for Vercel serverless functions.

The legacy JSON file under `data/sooryas-db.json` is historical prototype data and should not be treated as the active store.

## Scripts

| Command | Purpose |
|---|---|
| `npm.cmd start` | Start local prototype server |
| `npm.cmd run dev` | Start with Node watch mode |
| `npm.cmd run db:reset:dev` | Drop, recreate, and seed the local `sooryas_parlour_dev` database |
| `npm.cmd test` | Run unit and API tests |
| `npm.cmd run test:ui:install` | Install the Playwright Chromium browser used by UI tests |
| `npm.cmd run test:ui` | Run automated desktop and mobile UI tests |
| `npm.cmd run test:ui:headed` | Run Playwright UI tests in a visible browser |
| `npm.cmd run coverage` | Run test coverage using Node's built-in coverage |

## Troubleshooting Local Database Errors

On startup, both the legacy Node app and the Next.js DB layer run additive compatibility migrations for known non-destructive schema changes, such as newly added customer/staff contact fields. This is intended to fix errors like `column country_code of relation customers does not exist` without deleting local data.

If staff creation, customer save, invoice generation, or payment logging still fails with a database error after restarting the app, your local Docker PostgreSQL volume may have an older or damaged development schema. For local development only, reset and reseed the dev database:

```powershell
cd C:\Users\raghu\Prev_OneDrive\Documents\BeautyCareTutorials\SooryasWeb
docker compose up -d db
npm.cmd run db:reset:dev
npm.cmd start
```

This deletes local development data in `sooryas_parlour_dev`. The reset script refuses `DATABASE_URL` connections and refuses database names that do not end with `_dev`.

## Production Direction

Recommended deployment direction for `lifefil.ai` is documented in [Deployment](docs/deployment.md). Deploy from `next-app`, not the legacy repository root. Do not expose real customer data until Supabase Google authentication, RBAC, durable database storage, audit logs, and privacy controls are production-hardened.

Recommended internal URL:

```text
https://sooryas.lifefil.ai
```

## Security Checklist Before Public Launch

- Review and harden login/session/RBAC before storing real customer, staff, or business financial data.
- Enable HTTPS.
- Back up data daily.
- Do not expose customer phone numbers on any public-facing page.
- Confirm GST and invoice wording with a CA/legal advisor.

## Documentation Sync Rule

Whenever code, setup steps, architecture, tests, deployment, or product scope changes, update the matching documentation in the same work session.

Use this checklist before closing development work:

- update this README when local setup or run commands change;
- update [User Stories](docs/user-stories.md) when acceptance status changes;
- update [Requirements Execution Map](docs/requirements-execution-map.md) when implementation status or next tasks change;
- update [Testing](docs/testing.md) when tests, coverage, or verification commands change;
- update [Deployment](docs/deployment.md) when Vercel, Supabase, Docker, environment variables, or production setup changes;
- keep Institute features out of this repo's implementation docs except as separate-app handoff notes.

## Documentation

- [Final BRD](docs/BRD.md)
- [Beauty Parlour Portal User Stories](docs/user-stories.md)
- [Soorya Persona User Stories](docs/soorya-persona-user-stories.md)
- [Requirements Execution Map](docs/requirements-execution-map.md)
- [Coding Agents Needed Before Rewrite](docs/coding-agents-needed.md)
- [Future Agent Manifest](docs/future-agent-manifest.yaml)
- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Testing](docs/testing.md)
- [Production Readiness](docs/production-readiness.md)
- [UI/UX Design Proposal](docs/ui-ux-design.md)
