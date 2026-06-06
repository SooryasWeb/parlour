# SooryasWeb

Internal parlour operations app for **Soorya's Skin Hair and Makeup**.

Current deployment target: **GoDaddy Node.js beta hosting with GoDaddy managed MySQL**.

The training institute remains a separate product and must not be added to this app.

## Features

- dashboard for daily parlour readiness;
- staff-managed bookings;
- Customer CRM with phone/email validation and WhatsApp consent;
- invoices and payment ledger;
- staff records and commission settings;
- inventory basics;
- manual WhatsApp links;
- bilingual UI toggle foundation.

## Stack

- Node.js built-in HTTP server;
- vanilla HTML, CSS, and JavaScript;
- MySQL via `mysql2` for GoDaddy deployment;
- PostgreSQL via `pg` for the existing local/test harness;
- Node.js built-in test runner;
- Playwright for browser UI smoke tests.

## GoDaddy Deployment

Use these GoDaddy Node.js app settings:

```text
Root directory: SooryasWeb
Build command: npm install && npm run build
Start command: npm start
Node version: 22 or later
```

Required environment variable:

```text
SESSION_SECRET=<long-random-secret>
```

GoDaddy should inject these managed MySQL variables:

```text
DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD
```

Set this only for the first deploy against an empty MySQL database:

```text
ALLOW_SCHEMA_INIT=true
```

After the first successful deployment and login, remove it or set it to `false`.

Default private-preview login:

```text
username: soorya
password: password
```

The app uses short-lived MySQL connections as recommended by Node.js Hosting. Do not upload `node_modules`, logs, test outputs, or build caches. They are excluded by `.gitignore`.

## Local Development

Requirements:

- Node.js 22 or later.
- Docker Desktop, or another local PostgreSQL server listening on port `5432`.

Start PostgreSQL:

```powershell
cd C:\Users\raghu\Prev_OneDrive\Documents\BeautyCareTutorials\SooryasWeb
docker compose up -d db
```

First local run against a fresh database:

```powershell
$env:ALLOW_SCHEMA_INIT='true'
npm.cmd start
```

After the schema exists:

```powershell
npm.cmd start
```

Open:

```text
http://localhost:3000
```

## Scripts

| Command | Purpose |
|---|---|
| `npm.cmd run build` | Hosting-compatible build step; no compile needed |
| `npm.cmd start` | Start production server |
| `npm.cmd run dev` | Start with Node watch mode |
| `npm.cmd run db:reset:dev` | Reset local PostgreSQL dev database |
| `npm.cmd test` | Run unit/API/static tests |
| `npm.cmd run coverage` | Run test coverage |
| `npm.cmd run test:ui:install` | Install Playwright Chromium |
| `npm.cmd run test:ui` | Run desktop/mobile UI smoke tests |

## Verification

Useful pre-deploy checks:

```powershell
npm.cmd run build
npm.cmd test -- tests/godaddy_deploy.test.js tests/db_reset_script.test.js tests/domain.test.js tests/test_runner_config.test.js
npm.cmd audit --audit-level=high
```

The full API/UI suite needs a running local PostgreSQL test database.

## Production Safety

Do not enter real customer data until:

- GoDaddy MySQL smoke test passes;
- backup/export and restore are verified;
- authentication and RBAC are hardened;
- GST/invoice wording is reviewed;
- customer consent wording is reviewed.

## Documentation

- [Final BRD](docs/BRD.md)
- [Beauty Parlour Portal User Stories](docs/user-stories.md)
- [Soorya Persona User Stories](docs/soorya-persona-user-stories.md)
- [Requirements Execution Map](docs/requirements-execution-map.md)
- [Coding Agents Needed](docs/coding-agents-needed.md)
- [Future Agent Manifest](docs/future-agent-manifest.yaml)
- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Testing](docs/testing.md)
- [Production Readiness](docs/production-readiness.md)
- [UI/UX Design Proposal](docs/ui-ux-design.md)
